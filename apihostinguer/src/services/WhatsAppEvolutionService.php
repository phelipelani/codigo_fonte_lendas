<?php
/**
 * Serviço Multi-Racha de Integração com a Evolution API (WhatsApp) e Conexão por QR Code
 * Arquivo: apihostinguer/src/services/WhatsAppEvolutionService.php
 *
 * Responsabilidades (Fase 4.0 — Etapa 3C.2):
 * 1. Centralizar toda a comunicação HTTP com a Evolution API (v1/v2 Baileys) com suporte a
 *    transporte simulado (mock HTTP) para testes automatizados em sandbox.
 * 2. Garantir isolamento estrito entre rachas: cada racha possui sua própria instância
 *    determinística (`futlendas_racha_{racha_id}`) e seu próprio segredo de webhook (armazenado
 *    apenas como hash SHA-256 em `racha_whatsapp_instancias.webhook_secret_hash`).
 * 3. Gerenciar o ciclo de vida da conexão por QR Code dentro do FutLendas:
 *    - Primeira conexão: cria instância quando necessário, configura webhook autenticado e solicita QR Code.
 *    - Reconexão: consulta estado atual; se já conectado, não gera novo QR Code; se desconectado,
 *      tenta recuperar a sessão e só solicita novo QR Code quando necessário.
 *    - Desconexão: diferencia falha temporária de comunicação de logout efetivo, sem apagar configurações.
 * 4. Validar e processar webhooks recebidos da Evolution API com verificação em tempo constante (`hash_equals`),
 *    bloqueando `fromMe`, grupos (`@g.us`), remetentes desconhecidos ou ambíguos (sem confiar em `pushName`)
 *    e encaminhando intenções válidas (`SIM`, `NAO`, `DEPOIS`) ao `RachaQueueService`.
 * 5. Registrar tentativas de envio de mensagens em `racha_whatsapp_mensagens` diferenciando
 *    `pendente`, `enviado` (somente após confirmação da API), `falha` e `desconhecido_timeout`,
 *    com proteção de idempotência contra disparos duplicados e higienização total de credenciais/QR nos logs.
 */

require_once __DIR__ . '/../middleware/RachaScopeMiddleware.php';
require_once __DIR__ . '/../utils/HttpError.php';
require_once __DIR__ . '/RachaQueueService.php';

class WhatsAppEvolutionService
{
    private PDO $pdo;
    private RachaQueueService $queueService;

    /** @var callable|null Transporte HTTP injetável para testes/mock: fn(string $method, string $endpoint, ?array $body, array $headers, int $timeout): array */
    private $httpTransport;

    private string $baseUrl;
    private string $masterApiKey;
    private string $webhookBaseUrl;
    private int $timeoutSeconds;
    private ?array $configOverrides = null;

    public const STATUS_CONECTADO     = 'conectado';
    public const STATUS_AGUARDANDO_QR = 'aguardando_qr';
    public const STATUS_DESCONECTADO  = 'desconectado';
    public const STATUS_ERRO          = 'erro';

    private const ALLOWED_MESSAGE_TYPES = [
        'convocacao_semanal',
        'lembrete_semanal',
        'promocao_fila',
        'renovacao_mensal',
        'comunicado',
        'resposta_instrucao',
        'resposta_participante'
    ];

    private const WEBHOOK_EVENTS = [
        'MESSAGES_UPSERT',
        'CONNECTION_UPDATE',
        'QRCODE_UPDATED'
    ];

    public function __construct(
        ?PDO $pdo = null,
        ?RachaQueueService $queueService = null,
        ?callable $httpTransport = null,
        ?array $configOverrides = null
    ) {
        $this->pdo = RachaScopeMiddleware::getPdo($pdo);
        $this->queueService = $queueService ?? new RachaQueueService($this->pdo);
        $this->httpTransport = $httpTransport;

        $rawBaseUrl = $configOverrides['base_url']
            ?? (getenv('EVOLUTION_URL') !== false ? getenv('EVOLUTION_URL') : ($_ENV['EVOLUTION_URL'] ?? ''));
        $rawApiKey = $configOverrides['api_key']
            ?? (getenv('EVOLUTION_APIKEY') !== false ? getenv('EVOLUTION_APIKEY') : ($_ENV['EVOLUTION_APIKEY'] ?? ''));
        $rawWebhookBase = $configOverrides['webhook_base_url']
            ?? (getenv('APP_URL') !== false ? getenv('APP_URL') : ($_ENV['APP_URL'] ?? 'https://futlendas.com.br/api'));
        $rawTimeout = $configOverrides['timeout_seconds']
            ?? (getenv('EVOLUTION_TIMEOUT_SECONDS') !== false ? getenv('EVOLUTION_TIMEOUT_SECONDS') : ($_ENV['EVOLUTION_TIMEOUT_SECONDS'] ?? 15));

        $this->baseUrl = rtrim(trim((string)$rawBaseUrl), '/');
        $this->masterApiKey = trim((string)$rawApiKey);
        $this->webhookBaseUrl = rtrim(trim((string)$rawWebhookBase), '/');
        $this->timeoutSeconds = max(1, (int)$rawTimeout);
        $this->configOverrides = $configOverrides;
    }

    /**
     * Define ou substitui o transporte HTTP (utilizado para testes com mock HTTP em sandbox).
     */
    public function setHttpTransport(?callable $transport): void
    {
        $this->httpTransport = $transport;
    }

    // =========================================================================
    // 0. HIGIENIZAÇÃO DE CREDENCIAIS, VALIDAÇÕES INTERNAS E NOMENCLATURA
    // =========================================================================

    /**
     * Deriva de forma determinística e segura o nome único da instância a partir do ID do racha.
     * Impede que qualquer cliente escolha arbitrariamente uma instância de outro racha ou a instância legada.
     */
    public static function deriveInstanceName(int $rachaId): string
    {
        if ($rachaId <= 0) {
            throw new HttpError("Identificador do racha inválido para derivação de instância WhatsApp.", 400);
        }
        return 'futlendas_racha_' . $rachaId;
    }

    /**
     * Remove chaves de API, tokens, hashes, cabeçalhos de autorização e payloads de QR Code de qualquer string ou array
     * antes de gravar em banco ou log de diagnóstico.
     */
    public function sanitizeSensitiveText(?string $text, int $maxLength = 255): ?string
    {
        if ($text === null) {
            return null;
        }

        $clean = trim($text);
        if ($clean === '') {
            return null;
        }

        // Remove valores literais de credenciais conhecidas caso estejam presentes
        if ($this->masterApiKey !== '' && strlen($this->masterApiKey) >= 4) {
            $clean = str_ireplace($this->masterApiKey, '[REDACTED_APIKEY]', $clean);
        }

        // Mascara padrões de tokens em URLs, headers, JSON ou base64 de QR Code
        $patterns = [
            '/data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+\/=]+/i' => '[REDACTED_QR_BASE64]',
            '/Bearer\s+[A-Za-z0-9\-._~+\/]+=*/i' => 'Bearer [REDACTED]',
            '/(["\']?(?:apikey|api_key|token|webhook_token|secret|authorization|cookie|qrcode|base64|pairingCode)["\']?\s*[:=]\s*["\']?)([^"\'\s,&}]+)/i' => '$1[REDACTED]',
            '/([?&](?:token|apikey|key|secret)=)([^&\s]+)/i' => '$1[REDACTED]'
        ];

        foreach ($patterns as $regex => $replacement) {
            $clean = (string)preg_replace($regex, $replacement, $clean);
        }

        if (function_exists('mb_substr')) {
            return mb_substr($clean, 0, $maxLength, 'UTF-8');
        }

        return substr($clean, 0, $maxLength);
    }

    /**
     * Higieniza recursivamente um array de diagnóstico para nunca persistir QR Codes, tokens ou credenciais.
     */
    public function sanitizeDiagnosticArray(array $data): array
    {
        $forbiddenKeys = [
            'apikey', 'api_key', 'token', 'webhook_token', 'secret',
            'webhook_secret', 'webhook_secret_hash', 'authorization',
            'cookie', 'qrcode', 'qr_code', 'base64', 'pairingcode', 'pairing_code', 'code'
        ];

        $sanitized = [];
        foreach ($data as $k => $v) {
            $lowerKey = strtolower((string)$k);
            if (in_array($lowerKey, $forbiddenKeys, true)) {
                $sanitized[$k] = '[REDACTED]';
                continue;
            }
            if (is_array($v)) {
                $sanitized[$k] = $this->sanitizeDiagnosticArray($v);
            } elseif (is_string($v)) {
                $sanitized[$k] = $this->sanitizeSensitiveText($v, 200);
            } elseif (is_scalar($v) || $v === null) {
                $sanitized[$k] = $v;
            }
        }

        return $sanitized;
    }

    /**
     * Valida que o usuário responsável existe, está ativo e possui permissão de organizador no racha.
     */
    private function validateOrganizerUserForRacha(int $rachaId, ?int $usuarioId, string $operacao): array
    {
        if ($usuarioId === null || $usuarioId <= 0) {
            throw new HttpError("Identificador do usuário responsável (usuarioId) é obrigatório para '{$operacao}'.", 400);
        }

        $stmtRacha = $this->pdo->prepare("SELECT id, nome, ativo FROM rachas WHERE id = :id");
        $stmtRacha->execute([':id' => $rachaId]);
        $racha = $stmtRacha->fetch(PDO::FETCH_ASSOC);

        if (!$racha) {
            throw new HttpError("Racha #{$rachaId} não encontrado.", 404);
        }
        if ((int)$racha['ativo'] !== 1) {
            throw new HttpError("O racha #{$rachaId} está inativo.", 403);
        }

        $stmtUser = $this->pdo->prepare("SELECT id, username, role, ativo FROM usuarios WHERE id = :id");
        $stmtUser->execute([':id' => $usuarioId]);
        $user = $stmtUser->fetch(PDO::FETCH_ASSOC);

        if (!$user) {
            throw new HttpError("Usuário responsável #{$usuarioId} não encontrado para '{$operacao}'.", 400);
        }
        if (isset($user['ativo']) && (int)$user['ativo'] !== 1) {
            throw new HttpError("Usuário responsável #{$usuarioId} está inativo.", 400);
        }

        $stmtOrg = $this->pdo->prepare("
            SELECT papel
            FROM racha_organizadores
            WHERE racha_id = :racha_id AND usuario_id = :usuario_id
        ");
        $stmtOrg->execute([':racha_id' => $rachaId, ':usuario_id' => $usuarioId]);
        $org = $stmtOrg->fetch(PDO::FETCH_ASSOC);

        if (!$org) {
            throw new HttpError("Acesso negado: o usuário #{$usuarioId} não é organizador do racha #{$rachaId} para executar '{$operacao}'.", 403);
        }

        return [
            'racha' => $racha,
            'user'  => $user,
            'papel' => (string)$org['papel']
        ];
    }

    /**
     * Valida que o racha existe e está ativo.
     */
    private function assertActiveRacha(int $rachaId): array
    {
        $stmt = $this->pdo->prepare("SELECT id, nome, dia_semana, horario_inicio, local_nome, ativo FROM rachas WHERE id = :id");
        $stmt->execute([':id' => $rachaId]);
        $racha = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$racha) {
            throw new HttpError("Racha #{$rachaId} não encontrado.", 404);
        }
        if ((int)$racha['ativo'] !== 1) {
            throw new HttpError("Racha #{$rachaId} está inativo.", 403);
        }

        return $racha;
    }

    /**
     * Confirma no banco a associação exclusiva entre o racha e a instância antes de qualquer operação.
     */
    private function getRegisteredInstanceForRacha(int $rachaId, bool $forUpdate = false): ?array
    {
        $sql = "
            SELECT *
            FROM racha_whatsapp_instancias
            WHERE racha_id = :racha_id
        " . ($forUpdate ? " FOR UPDATE" : "");

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([':racha_id' => $rachaId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row) {
            return null;
        }

        $expectedName = self::deriveInstanceName($rachaId);
        if ($row['instance_name'] !== $expectedName) {
            throw new HttpError("Violação de isolamento: a instância registrada para o racha #{$rachaId} não corresponde ao identificador determinístico esperado.", 409);
        }

        return $row;
    }

    // =========================================================================
    // 1. COMUNICAÇÃO HTTP CENTRALIZADA COM A EVOLUTION API
    // =========================================================================

    /**
     * Executa uma chamada HTTP para a Evolution API (via transporte injetado em testes ou cURL em produção).
     *
     * Nunca expõe `EVOLUTION_APIKEY`, URL administrativa ou tokens em mensagens de erro.
     */
    private function callEvolutionApi(string $method, string $endpoint, ?array $body = null): array
    {
        $httpMethod = strtoupper(trim($method));
        $normalizedEndpoint = '/' . ltrim($endpoint, '/');

        if ($this->httpTransport !== null) {
            $headers = [
                'Content-Type' => 'application/json',
                'apikey'       => $this->masterApiKey !== '' ? $this->masterApiKey : 'SANDBOX_MOCK_KEY'
            ];

            try {
                $rawResult = ($this->httpTransport)(
                    $httpMethod,
                    $normalizedEndpoint,
                    $body,
                    $headers,
                    $this->timeoutSeconds
                );
            } catch (Throwable $e) {
                return [
                    'ok'          => false,
                    'http_code'   => 0,
                    'is_timeout'  => stripos($e->getMessage(), 'timeout') !== false || stripos($e->getMessage(), 'timed out') !== false,
                    'error_code'  => 'TRANSPORT_EXCEPTION',
                    'error_msg'   => $this->sanitizeSensitiveText($e->getMessage()) ?? 'Falha de comunicação com a Evolution API.',
                    'data'        => null
                ];
            }

            return $this->normalizeTransportResponse($rawResult);
        }

        // Em testes explícitos que injetam configOverrides com chave vazia, preserva CONFIG_MISSING
        if ($this->configOverrides !== null && isset($this->configOverrides['api_key']) && $this->configOverrides['api_key'] === '') {
            return [
                'ok'         => false,
                'http_code'  => 0,
                'is_timeout' => false,
                'error_code' => 'CONFIG_MISSING',
                'error_msg'  => 'Configuração da Evolution API ausente no ambiente do servidor.',
                'data'       => null
            ];
        }

        // Se o modo simulado estiver ativo no ambiente de sandbox local
        if (self::isSimulationModeEnabled()) {
            return $this->executeSimulatedEvolutionApi($httpMethod, $normalizedEndpoint, $body);
        }

        if ($this->baseUrl === '' || $this->masterApiKey === '') {
            return [
                'ok'         => false,
                'http_code'  => 0,
                'is_timeout' => false,
                'error_code' => 'CONFIG_MISSING',
                'error_msg'  => 'Configuração da Evolution API ausente no ambiente do servidor.',
                'data'       => null
            ];
        }

        // Trava de segurança para impedir chamadas HTTP reais acidentais durante testes em sandbox
        $env = strtolower(trim((string)(getenv('ENVIRONMENT') ?: ($_ENV['ENVIRONMENT'] ?? ''))));
        if ($env === 'sandbox' || $env === 'test') {
            throw new RuntimeException(
                "SEGURANÇA SANDBOX: Chamadas HTTP externas reais para a Evolution API estão bloqueadas no ambiente '{$env}'. Injete um transporte HTTP simulado (mock) no WhatsAppEvolutionService."
            );
        }

        $url = $this->baseUrl . $normalizedEndpoint;
        $ch = curl_init($url);

        $headers = [
            'Content-Type: application/json',
            'apikey: ' . $this->masterApiKey
        ];

        $curlOpts = [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CUSTOMREQUEST  => $httpMethod,
            CURLOPT_HTTPHEADER     => $headers,
            CURLOPT_TIMEOUT        => $this->timeoutSeconds,
            CURLOPT_CONNECTTIMEOUT => min(5, $this->timeoutSeconds),
            CURLOPT_SSL_VERIFYPEER => true
        ];

        if ($body !== null && in_array($httpMethod, ['POST', 'PUT', 'PATCH', 'DELETE'], true)) {
            $curlOpts[CURLOPT_POSTFIELDS] = json_encode($body, JSON_UNESCAPED_UNICODE);
        }

        curl_setopt_array($ch, $curlOpts);

        $rawBody = curl_exec($ch);
        $curlErrno = curl_errno($ch);
        $curlError = curl_error($ch);
        $httpCode = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($curlErrno !== 0) {
            $isTimeout = in_array($curlErrno, [CURLE_OPERATION_TIMEDOUT, 28], true)
                || stripos($curlError, 'timed out') !== false
                || stripos($curlError, 'timeout') !== false;

            return [
                'ok'         => false,
                'http_code'  => $httpCode,
                'is_timeout' => $isTimeout,
                'error_code' => $isTimeout ? 'CURL_TIMEOUT' : 'CURL_ERROR_' . $curlErrno,
                'error_msg'  => $this->sanitizeSensitiveText($curlError) ?? 'Erro de rede ao comunicar com a Evolution API.',
                'data'       => null
            ];
        }

        return $this->normalizeTransportResponse([
            'http_code' => $httpCode,
            'body'      => $rawBody
        ]);
    }

    /**
     * Normaliza a resposta bruta do transporte HTTP, tratando timeouts, JSON inválido e códigos HTTP de erro.
     */
    private function normalizeTransportResponse(array $raw): array
    {
        $isTimeout = !empty($raw['is_timeout']);
        $httpCode = (int)($raw['http_code'] ?? 0);

        if ($isTimeout) {
            return [
                'ok'         => false,
                'http_code'  => $httpCode,
                'is_timeout' => true,
                'error_code' => (string)($raw['error_code'] ?? 'TIMEOUT'),
                'error_msg'  => $this->sanitizeSensitiveText((string)($raw['error_msg'] ?? 'Tempo limite excedido na comunicação com a Evolution API.')) ?? 'Timeout na Evolution API.',
                'data'       => null
            ];
        }

        if (!empty($raw['error_code'])) {
            return [
                'ok'         => false,
                'http_code'  => $httpCode,
                'is_timeout' => false,
                'error_code' => (string)$raw['error_code'],
                'error_msg'  => $this->sanitizeSensitiveText((string)($raw['error_msg'] ?? 'Erro de transporte HTTP.')) ?? 'Erro de comunicação.',
                'data'       => null
            ];
        }

        $decoded = null;
        if (array_key_exists('data', $raw) && is_array($raw['data'])) {
            $decoded = $raw['data'];
        } elseif (array_key_exists('body', $raw)) {
            if (is_array($raw['body'])) {
                $decoded = $raw['body'];
            } elseif (is_string($raw['body'])) {
                $trimmed = trim($raw['body']);
                if ($trimmed !== '') {
                    $json = json_decode($trimmed, true);
                    if (json_last_error() !== JSON_ERROR_NONE || !is_array($json)) {
                        return [
                            'ok'         => false,
                            'http_code'  => $httpCode,
                            'is_timeout' => false,
                            'error_code' => 'INVALID_JSON_RESPONSE',
                            'error_msg'  => 'A Evolution API retornou uma resposta em formato JSON inválido.',
                            'data'       => null
                        ];
                    }
                    $decoded = $json;
                } else {
                    $decoded = [];
                }
            }
        }

        if ($httpCode < 200 || $httpCode >= 300) {
            $apiMsg = null;
            if (is_array($decoded)) {
                $msgCandidate = $decoded['response']['message']
                    ?? $decoded['message']
                    ?? $decoded['error']
                    ?? null;
                if (is_array($msgCandidate)) {
                    $apiMsg = implode('; ', array_map(fn($x) => is_scalar($x) ? (string)$x : json_encode($x), $msgCandidate));
                } elseif (is_scalar($msgCandidate)) {
                    $apiMsg = (string)$msgCandidate;
                }
            }

            return [
                'ok'         => false,
                'http_code'  => $httpCode,
                'is_timeout' => false,
                'error_code' => 'HTTP_' . $httpCode,
                'error_msg'  => $this->sanitizeSensitiveText($apiMsg ?? "Erro HTTP {$httpCode} retornado pela Evolution API."),
                'data'       => $decoded
            ];
        }

        if (!is_array($decoded)) {
            return [
                'ok'         => false,
                'http_code'  => $httpCode,
                'is_timeout' => false,
                'error_code' => 'EMPTY_OR_INVALID_RESPONSE',
                'error_msg'  => 'Resposta vazia ou inesperada da Evolution API.',
                'data'       => null
            ];
        }

        return [
            'ok'         => true,
            'http_code'  => $httpCode,
            'is_timeout' => false,
            'error_code' => null,
            'error_msg'  => null,
            'data'       => $decoded
        ];
    }

    /**
     * Mapeia o estado bruto da Evolution API ('open', 'connecting', 'close', 'refused', etc.)
     * para os estados previsíveis do FutLendas ('conectado', 'aguardando_qr', 'desconectado', 'erro').
     */
    public static function normalizeConnectionState(?string $rawState): string
    {
        if ($rawState === null || trim($rawState) === '') {
            return self::STATUS_DESCONECTADO;
        }

        $clean = strtolower(trim($rawState));
        return match ($clean) {
            'open', 'connected', 'online'                 => self::STATUS_CONECTADO,
            'connecting', 'qrcode', 'waiting_qr', 'pair'  => self::STATUS_AGUARDANDO_QR,
            'close', 'closed', 'disconnected', 'refused',
            'logged_out', 'logout'                        => self::STATUS_DESCONECTADO,
            default                                       => self::STATUS_ERRO
        };
    }

    /**
     * Extrai o estado bruto (`state` ou `status`) e número conectado (quando presente) do payload da Evolution API.
     */
    private function extractStateAndPhoneFromApiPayload(array $data): array
    {
        $rawState = $data['instance']['state']
            ?? $data['instance']['status']
            ?? $data['state']
            ?? $data['status']
            ?? null;

        $ownerJid = $data['instance']['owner']
            ?? $data['instance']['ownerJid']
            ?? $data['instance']['wuid']
            ?? $data['owner']
            ?? $data['ownerJid']
            ?? null;

        $connectedPhone = null;
        if (is_string($ownerJid) && trim($ownerJid) !== '') {
            $digits = preg_replace('/\D/', '', explode('@', $ownerJid)[0]);
            if ($digits !== null && strlen($digits) >= 10 && strlen($digits) <= 15) {
                $connectedPhone = $digits;
            }
        }

        return [
            'raw_state'       => is_string($rawState) ? strtolower(trim($rawState)) : null,
            'connected_phone' => $connectedPhone
        ];
    }

    /**
     * Extrai dados de QR Code / Pairing Code de respostas de `/instance/create` ou `/instance/connect/{instance}`.
     * Nunca grava esses dados em logs ou no banco de dados.
     */
    private function extractQrCodeFromApiPayload(array $data): array
    {
        $qrNode = isset($data['qrcode']) && is_array($data['qrcode']) ? $data['qrcode'] : $data;

        $base64 = $qrNode['base64'] ?? $data['base64'] ?? null;
        $code = $qrNode['code'] ?? $data['code'] ?? null;
        $pairingCode = $qrNode['pairingCode'] ?? $data['pairingCode'] ?? null;
        $count = isset($qrNode['count']) ? (int)$qrNode['count'] : (isset($data['count']) ? (int)$data['count'] : null);

        $hasQr = (is_string($base64) && trim($base64) !== '')
            || (is_string($code) && trim($code) !== '')
            || (is_string($pairingCode) && trim($pairingCode) !== '');

        return [
            'disponivel'     => $hasQr,
            'qr_code_base64' => is_string($base64) && trim($base64) !== '' ? trim($base64) : null,
            'qr_code_texto'  => is_string($code) && trim($code) !== '' ? trim($code) : null,
            'pairing_code'   => is_string($pairingCode) && trim($pairingCode) !== '' ? trim($pairingCode) : null,
            'tentativas_qr'  => $count
        ];
    }

    // =========================================================================
    // 2. GESTÃO DE INSTÂNCIA POR RACHA, WEBHOOK E CONEXÃO POR QR CODE
    // =========================================================================

    /**
     * Cria ou recupera a instância vinculada ao racha no banco de dados e na Evolution API.
     *
     * Regras:
     * - O nome da instância é estritamente `futlendas_racha_{rachaId}`.
     * - Se já existir no banco, reutiliza sem duplicar.
     * - Se já existir na Evolution API (ex.: HTTP 403/409 "already in use"), recupera sem falhar.
     * - Nunca retorna `webhook_secret_hash`, token do webhook ou `EVOLUTION_APIKEY`.
     */
    public function getOrCreateRachaInstance(int $rachaId, int $usuarioId): array
    {
        $this->validateOrganizerUserForRacha($rachaId, $usuarioId, 'criação/recuperação de instância WhatsApp');
        $instanceName = self::deriveInstanceName($rachaId);

        $existing = $this->getRegisteredInstanceForRacha($rachaId);
        $createdInDb = false;
        $rawWebhookSecret = null;

        if (!$existing) {
            $rawWebhookSecret = bin2hex(random_bytes(32));
            $secretHash = hash('sha256', $rawWebhookSecret);

            $ins = $this->pdo->prepare("
                INSERT INTO racha_whatsapp_instancias (
                    racha_id, instance_name, status_conexao, estado_bruto_api,
                    webhook_configurado, webhook_secret_hash, configurado_por_usuario_id,
                    ultima_atualizacao_estado_em, created_at, updated_at
                ) VALUES (
                    :racha_id, :instance_name, 'desconectado', 'uninitialized',
                    0, :secret_hash, :usuario_id,
                    NOW(), NOW(), NOW()
                )
            ");
            $ins->execute([
                ':racha_id'      => $rachaId,
                ':instance_name' => $instanceName,
                ':secret_hash'   => $secretHash,
                ':usuario_id'    => $usuarioId
            ]);

            $existing = $this->getRegisteredInstanceForRacha($rachaId);
            $createdInDb = true;
        }

        // Verifica o estado na Evolution API caso já existisse, ou cria na API se acabou de ser provisionada
        $createdInApi = false;
        $qrData = [
            'disponivel'     => false,
            'qr_code_base64' => null,
            'qr_code_texto'  => null,
            'pairing_code'   => null,
            'tentativas_qr'  => null
        ];

        $stateCheck = $this->callEvolutionApi('GET', '/instance/connectionState/' . rawurlencode($instanceName));

        if ($stateCheck['ok'] && is_array($stateCheck['data'])) {
            $extracted = $this->extractStateAndPhoneFromApiPayload($stateCheck['data']);
            $rawState = $extracted['raw_state'] ?? 'close';
            $normStatus = self::normalizeConnectionState($rawState);
            $phone = $extracted['connected_phone'] ?? $existing['numero_conectado'];

            $this->updateInstanceStateInDb(
                $rachaId,
                $normStatus,
                $rawState,
                $phone,
                null,
                null,
                ['acao' => 'instancia_recuperada_na_api']
            );
        } else {
            // Se não encontrada na API (404) ou ainda não inicializada, solicita criação em /instance/create
            if ($createdInDb || in_array((int)$stateCheck['http_code'], [400, 404], true)) {
                $createResp = $this->callEvolutionApi('POST', '/instance/create', [
                    'instanceName' => $instanceName,
                    'qrcode'       => true,
                    'integration'  => 'WHATSAPP-BAILEYS'
                ]);

                if ($createResp['ok'] && is_array($createResp['data'])) {
                    $createdInApi = true;
                    $extracted = $this->extractStateAndPhoneFromApiPayload($createResp['data']);
                    $qrData = $this->extractQrCodeFromApiPayload($createResp['data']);
                    $rawState = $extracted['raw_state'] ?? ($qrData['disponivel'] ? 'connecting' : 'close');
                    $normStatus = $qrData['disponivel'] ? self::STATUS_AGUARDANDO_QR : self::normalizeConnectionState($rawState);

                    $this->updateInstanceStateInDb(
                        $rachaId,
                        $normStatus,
                        $rawState,
                        $extracted['connected_phone'],
                        null,
                        null,
                        ['acao' => 'instancia_criada_na_api', 'http_code' => $createResp['http_code']]
                    );
                } elseif (in_array((int)$createResp['http_code'], [403, 409], true)) {
                    // A instância já existe na Evolution API (idempotente)
                    $this->updateInstanceStateInDb(
                        $rachaId,
                        self::STATUS_DESCONECTADO,
                        'existing',
                        $existing['numero_conectado'] ?? null,
                        null,
                        null,
                        ['acao' => 'instancia_ja_existente_na_api']
                    );
                } else {
                    $this->updateInstanceStateInDb(
                        $rachaId,
                        self::STATUS_ERRO,
                        'create_failed',
                        $existing['numero_conectado'] ?? null,
                        $createResp['error_code'] ?? 'CREATE_ERROR',
                        $createResp['error_msg'] ?? 'Falha ao criar instância na Evolution API.',
                        [
                            'acao'       => 'falha_criacao_instancia',
                            'http_code'  => $createResp['http_code'],
                            'is_timeout' => $createResp['is_timeout']
                        ]
                    );
                }
            } else {
                // Erro de comunicação / timeout ao consultar instância existente: preserva a instância sem destruí-la
                $this->updateInstanceStateInDb(
                    $rachaId,
                    self::STATUS_ERRO,
                    $existing['estado_bruto_api'],
                    $existing['numero_conectado'],
                    $stateCheck['error_code'] ?? 'STATE_CHECK_ERROR',
                    $stateCheck['error_msg'] ?? 'Falha ao consultar estado da instância na Evolution API.',
                    [
                        'acao'       => 'falha_consulta_estado',
                        'http_code'  => $stateCheck['http_code'],
                        'is_timeout' => $stateCheck['is_timeout']
                    ]
                );
            }
        }

        $updatedRow = $this->getRegisteredInstanceForRacha($rachaId);

        // Se o webhook ainda não estava configurado e a instância não está em erro de comunicação, configura automaticamente
        if ($updatedRow && (int)$updatedRow['webhook_configurado'] === 0 && $updatedRow['status_conexao'] !== self::STATUS_ERRO) {
            $this->configureInstanceWebhook($rachaId, $usuarioId, false, $rawWebhookSecret);
            $updatedRow = $this->getRegisteredInstanceForRacha($rachaId);
        }

        return $this->formatPublicInstanceResponse($updatedRow ?? [], [
            'criada_no_banco' => $createdInDb,
            'criada_na_api'   => $createdInApi,
            'qr_code'         => $qrData['disponivel'] ? $qrData : null
        ]);
    }

    /**
     * Configura ou atualiza o webhook autenticado da instância do racha na Evolution API (`POST /webhook/set/{instance}`).
     *
     * Segurança:
     * - Gera um token aleatório criptográfico de 256 bits exclusivo para a instância.
     * - Persiste apenas `hash('sha256', $token)` em `racha_whatsapp_instancias.webhook_secret_hash`.
     * - Registra na Evolution API a URL do endpoint multi-racha contendo o token e o nome da instância,
     *   além de enviar o header `X-Webhook-Token` para instalações v2.
     */
    public function configureInstanceWebhook(
        int $rachaId,
        int $usuarioId,
        bool $rotateSecret = false,
        ?string $preGeneratedRawSecret = null
    ): array {
        $this->validateOrganizerUserForRacha($rachaId, $usuarioId, 'configuração de webhook WhatsApp');

        $inst = $this->getRegisteredInstanceForRacha($rachaId);
        if (!$inst) {
            throw new HttpError("Nenhuma instância WhatsApp registrada para o racha #{$rachaId}. Crie ou recupere a instância primeiro.", 404);
        }

        $instanceName = (string)$inst['instance_name'];
        $rawSecret = $preGeneratedRawSecret;

        if ($rawSecret === null || $rotateSecret) {
            $rawSecret = bin2hex(random_bytes(32));
        }
        $secretHash = hash('sha256', $rawSecret);

        $webhookEndpointUrl = $this->webhookBaseUrl
            . '/presenca/multiracha/webhook?instance=' . rawurlencode($instanceName)
            . '&token=' . rawurlencode($rawSecret);

        // Formato compatível com Evolution API (envia propriedades na raiz e também suporta wrapper 'webhook')
        $webhookPayload = [
            'enabled'         => true,
            'url'             => $webhookEndpointUrl,
            'webhookByEvents' => false,
            'webhookBase64'   => false,
            'events'          => self::WEBHOOK_EVENTS,
            'headers'         => [
                'X-Webhook-Token' => $rawSecret
            ],
            'webhook'         => [
                'enabled'         => true,
                'url'             => $webhookEndpointUrl,
                'byEvents'        => false,
                'base64'          => false,
                'events'          => self::WEBHOOK_EVENTS,
                'headers'         => [
                    'X-Webhook-Token' => $rawSecret
                ]
            ]
        ];

        $resp = $this->callEvolutionApi('POST', '/webhook/set/' . rawurlencode($instanceName), $webhookPayload);

        if (!$resp['ok']) {
            $errCode = $resp['error_code'] ?? 'WEBHOOK_SET_ERROR';
            $errMsg = $this->sanitizeSensitiveText($resp['error_msg'] ?? 'Falha ao configurar webhook na Evolution API.');

            $upFail = $this->pdo->prepare("
                UPDATE racha_whatsapp_instancias
                SET webhook_configurado = 0,
                    ultimo_erro_codigo = :err_code,
                    ultimo_erro_resumo = :err_msg,
                    updated_at = NOW()
                WHERE racha_id = :racha_id
            ");
            $upFail->execute([
                ':err_code' => $errCode,
                ':err_msg'  => $errMsg,
                ':racha_id' => $rachaId
            ]);

            return [
                'racha_id'            => $rachaId,
                'instance_name'       => $instanceName,
                'webhook_configurado' => false,
                'erro_codigo'         => $errCode,
                'erro_resumo'         => $errMsg
            ];
        }

        // Atualiza o hash do segredo apenas quando a Evolution API confirmou o registro do webhook
        $upOk = $this->pdo->prepare("
            UPDATE racha_whatsapp_instancias
            SET webhook_configurado = 1,
                webhook_secret_hash = :secret_hash,
                webhook_configurado_em = NOW(),
                ultimo_erro_codigo = NULL,
                ultimo_erro_resumo = NULL,
                updated_at = NOW()
            WHERE racha_id = :racha_id
        ");
        $upOk->execute([
            ':secret_hash' => $secretHash,
            ':racha_id'    => $rachaId
        ]);

        return [
            'racha_id'               => $rachaId,
            'instance_name'          => $instanceName,
            'webhook_configurado'    => true,
            'eventos_habilitados'    => self::WEBHOOK_EVENTS,
            'endpoint_base'          => $this->webhookBaseUrl . '/presenca/multiracha/webhook'
        ];
    }

    /**
     * Fluxo completo para o botão "Conectar WhatsApp" na aba Racha:
     * 1. Cria ou recupera a instância do racha e garante o webhook configurado.
     * 2. Consulta o estado atual da conexão na Evolution API:
     *    - Se já estiver `open` (`conectado`), retorna imediatamente `status_conexao = 'conectado'` sem gerar novo QR Code.
     *    - Se estiver desconectada ou aguardando leitura, solicita `/instance/connect/{instance}` para tentar recuperar
     *      a sessão ou obter o QR Code / código de pareamento para exibição dentro do FutLendas.
     */
    public function connectOrGetQrCode(int $rachaId, int $usuarioId): array
    {
        $this->validateOrganizerUserForRacha($rachaId, $usuarioId, 'conexão do WhatsApp por QR Code');

        // 1. Garante instância registrada e criada
        $provisioned = $this->getOrCreateRachaInstance($rachaId, $usuarioId);
        $instanceName = (string)$provisioned['instance_name'];

        // Se a criação inicial já devolveu um QR Code válido, retorna diretamente
        if (!empty($provisioned['qr_code']['disponivel'])) {
            return array_merge($provisioned, [
                'status_conexao'    => self::STATUS_AGUARDANDO_QR,
                'requer_leitura_qr' => true,
                'mensagem_status'   => 'Escaneie o QR Code com o WhatsApp do organizador para conectar.'
            ]);
        }

        // 2. Consulta o estado atual antes de solicitar outro QR Code
        $statusAtual = $this->getConnectionStatus($rachaId, true);

        if ($statusAtual['status_conexao'] === self::STATUS_CONECTADO) {
            return array_merge($statusAtual, [
                'qr_code'           => null,
                'requer_leitura_qr' => false,
                'mensagem_status'   => 'WhatsApp já está conectado para este racha.'
            ]);
        }

        if ($statusAtual['status_conexao'] === self::STATUS_ERRO && !empty($statusAtual['falha_temporaria_comunicacao'])) {
            return array_merge($statusAtual, [
                'qr_code'           => null,
                'requer_leitura_qr' => false,
                'mensagem_status'   => 'Falha temporária de comunicação com o serviço de WhatsApp. A instância foi preservada; tente novamente em instantes.'
            ]);
        }

        // 3. Solicita recuperação de sessão ou geração de QR Code em GET /instance/connect/{instance}
        $connectResp = $this->callEvolutionApi('GET', '/instance/connect/' . rawurlencode($instanceName));

        if (!$connectResp['ok'] || !is_array($connectResp['data'])) {
            $errCode = $connectResp['error_code'] ?? 'CONNECT_ERROR';
            $errMsg = ($errCode === 'CONFIG_MISSING')
                ? 'A integração com WhatsApp requer a configuração da Evolution API (EVOLUTION_URL e EVOLUTION_APIKEY) no servidor.'
                : ($connectResp['error_msg'] ?? 'Não foi possível solicitar o QR Code na Evolution API.');

            $this->updateInstanceStateInDb(
                $rachaId,
                self::STATUS_ERRO,
                'connect_failed',
                $statusAtual['numero_conectado'] ?? null,
                $errCode,
                $errMsg,
                [
                    'acao'       => 'falha_solicitar_qr',
                    'http_code'  => $connectResp['http_code'],
                    'is_timeout' => $connectResp['is_timeout']
                ]
            );

            $updated = $this->getRegisteredInstanceForRacha($rachaId);
            return $this->formatPublicInstanceResponse($updated ?? [], [
                'qr_code'                      => null,
                'requer_leitura_qr'            => false,
                'falha_temporaria_comunicacao' => true,
                'mensagem_status'              => $errMsg
            ]);
        }

        $extracted = $this->extractStateAndPhoneFromApiPayload($connectResp['data']);
        $qrData = $this->extractQrCodeFromApiPayload($connectResp['data']);

        // Se ao chamar /instance/connect a sessão antiga restaurou automaticamente ('open')
        if (($extracted['raw_state'] ?? '') === 'open' && !$qrData['disponivel']) {
            $this->updateInstanceStateInDb(
                $rachaId,
                self::STATUS_CONECTADO,
                'open',
                $extracted['connected_phone'],
                null,
                null,
                ['acao' => 'sessao_restaurada_sem_qr']
            );

            $updated = $this->getRegisteredInstanceForRacha($rachaId);
            return $this->formatPublicInstanceResponse($updated ?? [], [
                'qr_code'           => null,
                'requer_leitura_qr' => false,
                'sessao_restaurada' => true,
                'mensagem_status'   => 'Sessão do WhatsApp restaurada com sucesso sem necessidade de novo QR Code.'
            ]);
        }

        if ($qrData['disponivel']) {
            $this->updateInstanceStateInDb(
                $rachaId,
                self::STATUS_AGUARDANDO_QR,
                $extracted['raw_state'] ?? 'connecting',
                null,
                null,
                null,
                ['acao' => 'qr_code_gerado', 'tentativas_qr' => $qrData['tentativas_qr']]
            );

            $updated = $this->getRegisteredInstanceForRacha($rachaId);
            return $this->formatPublicInstanceResponse($updated ?? [], [
                'qr_code'           => $qrData,
                'requer_leitura_qr' => true,
                'mensagem_status'   => 'Escaneie o QR Code no aplicativo do WhatsApp para autenticar a instância do racha.'
            ]);
        }

        // Caso não tenha retornado QR nem estado 'open'
        $rawState = $extracted['raw_state'] ?? 'close';
        $normStatus = self::normalizeConnectionState($rawState);
        $this->updateInstanceStateInDb(
            $rachaId,
            $normStatus,
            $rawState,
            $extracted['connected_phone'],
            null,
            null,
            ['acao' => 'connect_sem_qr']
        );

        $updated = $this->getRegisteredInstanceForRacha($rachaId);
        return $this->formatPublicInstanceResponse($updated ?? [], [
            'qr_code'           => null,
            'requer_leitura_qr' => $normStatus !== self::STATUS_CONECTADO,
            'mensagem_status'   => 'Aguardando geração do QR Code pela Evolution API.'
        ]);
    }

    /**
     * Consulta o estado de conexão da instância do racha.
     * Distingue desconexão temporária / falha de rede de desconexão efetiva que exige nova leitura de QR Code.
     */
    public function getConnectionStatus(int $rachaId, bool $syncWithApi = true): array
    {
        $this->assertActiveRacha($rachaId);
        $inst = $this->getRegisteredInstanceForRacha($rachaId);

        if (!$inst) {
            return [
                'racha_id'                     => $rachaId,
                'instancia_registrada'         => false,
                'instance_name'                => self::deriveInstanceName($rachaId),
                'status_conexao'               => self::STATUS_DESCONECTADO,
                'estado_bruto_api'             => null,
                'numero_conectado'             => null,
                'webhook_configurado'          => false,
                'requer_leitura_qr'            => true,
                'falha_temporaria_comunicacao' => false,
                'mensagem_status'              => 'WhatsApp ainda não foi configurado para este racha.'
            ];
        }

        if (!$syncWithApi) {
            return $this->formatPublicInstanceResponse($inst, [
                'instancia_registrada'         => true,
                'requer_leitura_qr'            => in_array($inst['status_conexao'], [self::STATUS_DESCONECTADO, self::STATUS_AGUARDANDO_QR], true),
                'falha_temporaria_comunicacao' => $inst['status_conexao'] === self::STATUS_ERRO
            ]);
        }

        $instanceName = (string)$inst['instance_name'];
        $resp = $this->callEvolutionApi('GET', '/instance/connectionState/' . rawurlencode($instanceName));

        if (!$resp['ok'] || !is_array($resp['data'])) {
            // Não apaga a instância nem destrói as configurações por falha temporária de comunicação
            $this->updateInstanceStateInDb(
                $rachaId,
                self::STATUS_ERRO,
                $inst['estado_bruto_api'],
                $inst['numero_conectado'],
                $resp['error_code'] ?? 'CONNECTION_STATE_ERROR',
                $resp['error_msg'] ?? 'Erro ao consultar estado da conexão na Evolution API.',
                [
                    'acao'                => 'erro_temporario_consulta_estado',
                    'status_anterior'     => $inst['status_conexao'],
                    'http_code'           => $resp['http_code'],
                    'is_timeout'          => $resp['is_timeout']
                ]
            );

            $updated = $this->getRegisteredInstanceForRacha($rachaId);
            return $this->formatPublicInstanceResponse($updated ?? $inst, [
                'instancia_registrada'         => true,
                'requer_leitura_qr'            => false,
                'falha_temporaria_comunicacao' => true,
                'mensagem_status'              => 'Não foi possível verificar o estado na Evolution API no momento (falha temporária). Configurações preservadas.'
            ]);
        }

        $extracted = $this->extractStateAndPhoneFromApiPayload($resp['data']);
        $rawState = $extracted['raw_state'] ?? 'close';
        $normStatus = self::normalizeConnectionState($rawState);
        $phone = $extracted['connected_phone'] ?? ($normStatus === self::STATUS_CONECTADO ? $inst['numero_conectado'] : null);

        $this->updateInstanceStateInDb(
            $rachaId,
            $normStatus,
            $rawState,
            $phone,
            null,
            null,
            ['acao' => 'consulta_estado_ok']
        );

        $updated = $this->getRegisteredInstanceForRacha($rachaId);
        $requerQr = in_array($normStatus, [self::STATUS_DESCONECTADO, self::STATUS_AGUARDANDO_QR], true);

        return $this->formatPublicInstanceResponse($updated ?? $inst, [
            'instancia_registrada'         => true,
            'requer_leitura_qr'            => $requerQr,
            'falha_temporaria_comunicacao' => false,
            'mensagem_status'              => match ($normStatus) {
                self::STATUS_CONECTADO     => 'WhatsApp conectado e pronto para enviar e receber mensagens.',
                self::STATUS_AGUARDANDO_QR => 'Aguardando leitura do QR Code pelo WhatsApp do organizador.',
                self::STATUS_DESCONECTADO  => 'Sessão desconectada. É necessária uma nova leitura do QR Code para reconectar.',
                default                    => 'Estado de conexão requer verificação.'
            }
        ]);
    }

    /**
     * Desconecta (logout) de forma controlada a sessão do WhatsApp na Evolution API,
     * preservando o registro da instância no banco e indicando que nova conexão exigirá leitura de QR Code.
     */
    public function disconnectInstance(int $rachaId, int $usuarioId): array
    {
        $this->validateOrganizerUserForRacha($rachaId, $usuarioId, 'desconexão da instância WhatsApp');

        $inst = $this->getRegisteredInstanceForRacha($rachaId);
        if (!$inst) {
            throw new HttpError("Nenhuma instância WhatsApp registrada para o racha #{$rachaId}.", 404);
        }

        $instanceName = (string)$inst['instance_name'];
        $resp = $this->callEvolutionApi('DELETE', '/instance/logout/' . rawurlencode($instanceName));

        if (!$resp['ok'] && (int)$resp['http_code'] !== 404 && (int)$resp['http_code'] !== 400) {
            $this->updateInstanceStateInDb(
                $rachaId,
                self::STATUS_ERRO,
                $inst['estado_bruto_api'],
                $inst['numero_conectado'],
                $resp['error_code'] ?? 'LOGOUT_ERROR',
                $resp['error_msg'] ?? 'Falha ao desconectar sessão na Evolution API.',
                ['acao' => 'falha_logout', 'http_code' => $resp['http_code']]
            );

            throw new HttpError(
                $this->sanitizeSensitiveText($resp['error_msg'] ?? 'Não foi possível desconectar a sessão na Evolution API no momento.') ?? 'Erro ao desconectar.',
                502
            );
        }

        $this->updateInstanceStateInDb(
            $rachaId,
            self::STATUS_DESCONECTADO,
            'logged_out',
            null,
            null,
            null,
            ['acao' => 'logout_controlado_pelo_organizador', 'usuario_id' => $usuarioId]
        );

        $updated = $this->getRegisteredInstanceForRacha($rachaId);
        return $this->formatPublicInstanceResponse($updated ?? $inst, [
            'desconectado'      => true,
            'requer_leitura_qr' => true,
            'mensagem_status'   => 'Sessão do WhatsApp desconectada com sucesso. Para reconectar, solicite um novo QR Code.'
        ]);
    }

    /**
     * Atualiza de forma segura os campos de estado da instância em `racha_whatsapp_instancias`.
     */
    private function updateInstanceStateInDb(
        int $rachaId,
        string $statusConexao,
        ?string $estadoBrutoApi,
        ?string $numeroConectado,
        ?string $erroCodigo,
        ?string $erroResumo,
        ?array $diagnostico = null
    ): void {
        $diagSanitizado = $diagnostico !== null
            ? json_encode($this->sanitizeDiagnosticArray($diagnostico), JSON_UNESCAPED_UNICODE)
            : null;

        $sql = "
            UPDATE racha_whatsapp_instancias
            SET status_conexao = :status,
                estado_bruto_api = :estado_bruto,
                numero_conectado = :numero,
                ultima_conexao_em = CASE WHEN :status_check = 'conectado' THEN NOW() ELSE ultima_conexao_em END,
                ultima_atualizacao_estado_em = NOW(),
                ultimo_erro_codigo = :erro_cod,
                ultimo_erro_resumo = :erro_resumo,
                diagnostico_metadados = COALESCE(:diag, diagnostico_metadados),
                updated_at = NOW()
            WHERE racha_id = :racha_id
        ";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            ':status'       => $statusConexao,
            ':estado_bruto' => $estadoBrutoApi !== null ? substr(trim($estadoBrutoApi), 0, 40) : null,
            ':numero'       => $numeroConectado !== null ? substr(trim($numeroConectado), 0, 20) : null,
            ':status_check' => $statusConexao,
            ':erro_cod'     => $erroCodigo !== null ? substr(trim($erroCodigo), 0, 60) : null,
            ':erro_resumo'  => $this->sanitizeSensitiveText($erroResumo, 255),
            ':diag'         => $diagSanitizado,
            ':racha_id'     => $rachaId
        ]);
    }

    /**
     * Formata os dados da instância para consumo seguro pelos futuros controllers (nunca inclui hashes de segredo ou chaves).
     */
    /**
     * Verifica se o modo simulado (Mock Local) está habilitado.
     * SEGURANÇA ESTRITA:
     * - O modo simulado NUNCA pode ser ativado em ambiente de produção (ENVIRONMENT === 'production').
     * - Só é permitido em ambientes de testes e desenvolvimento explicitamente autorizados ('sandbox', 'test', 'local', 'development').
     * - Se ENVIRONMENT for ausente, vazio ou inválido, retorna false por padrão seguro (deny-by-default).
     * - Exige declaração explícita de EVOLUTION_SIMULADA com valor verdadeiro ('1', 'true', 'sim', 'on', 'yes').
     */
    public static function isSimulationModeEnabled(): bool
    {
        $env = strtolower(trim((string)(getenv('ENVIRONMENT') ?: ($_ENV['ENVIRONMENT'] ?? ''))));
        $allowedEnvs = ['sandbox', 'test', 'local', 'development'];

        if (!in_array($env, $allowedEnvs, true) || $env === 'production') {
            return false;
        }

        $val = strtolower(trim((string)(getenv('EVOLUTION_SIMULADA') ?: ($_ENV['EVOLUTION_SIMULADA'] ?? ''))));
        return in_array($val, ['1', 'true', 'sim', 'on', 'yes'], true);
    }

    /**
     * Executa a simulação interna das chamadas à Evolution API para testes locais sem afetar a produção.
     */
    private function executeSimulatedEvolutionApi(string $method, string $endpoint, ?array $body = null): array
    {
        if (preg_match('#^/instance/connectionState/([^/]+)$#', $endpoint, $m)) {
            $instName = $m[1];
            $stmt = $this->pdo->prepare("SELECT status_conexao FROM racha_whatsapp_instancias WHERE instance_name = :inst");
            $stmt->execute([':inst' => $instName]);
            $st = $stmt->fetchColumn();

            $state = ($st === 'conectado') ? 'open' : (($st === 'aguardando_qr') ? 'connecting' : 'close');
            return [
                'ok' => true,
                'http_code' => 200,
                'is_timeout' => false,
                'error_code' => null,
                'error_msg' => null,
                'data' => [
                    'instance' => [
                        'instanceName' => $instName,
                        'state' => $state
                    ]
                ]
            ];
        }

        if ($endpoint === '/instance/create') {
            $instName = $body['instanceName'] ?? 'futlendas_simulada';
            return [
                'ok' => true,
                'http_code' => 201,
                'is_timeout' => false,
                'error_code' => null,
                'error_msg' => null,
                'data' => [
                    'instance' => [
                        'instanceName' => $instName,
                        'status' => 'created'
                    ],
                    'hash' => ['apikey' => 'SIMULATED_API_KEY_LOCAL']
                ]
            ];
        }

        if (preg_match('#^/instance/connect/([^/]+)$#', $endpoint, $m)) {
            $svg = '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240"><rect width="240" height="240" fill="#0f172a" rx="12"/><rect x="10" y="10" width="220" height="220" fill="none" stroke="#f59e0b" stroke-width="2" stroke-dasharray="6,6" rx="8"/><text x="120" y="55" font-family="sans-serif" font-size="22" font-weight="bold" fill="#f59e0b" text-anchor="middle">MODO TESTE</text><text x="120" y="85" font-family="sans-serif" font-size="12" fill="#94a3b8" text-anchor="middle">Conexão WhatsApp Simulada</text><circle cx="120" cy="130" r="28" fill="#f59e0b" opacity="0.15"/><path d="M120 115v20M120 145v2" stroke="#f59e0b" stroke-width="3" stroke-linecap="round"/><text x="120" y="185" font-family="sans-serif" font-size="12" font-weight="bold" fill="#fbbf24" text-anchor="middle">QR Code Ilustrativo</text><text x="120" y="205" font-family="sans-serif" font-size="10" fill="#64748b" text-anchor="middle">Clique em "Simular Pareamento"</text></svg>';
            $base64 = 'data:image/svg+xml;base64,' . base64_encode($svg);

            return [
                'ok' => true,
                'http_code' => 200,
                'is_timeout' => false,
                'error_code' => null,
                'error_msg' => null,
                'data' => [
                    'pairingCode' => 'SIMULADO-1234',
                    'code'        => 'MODO_SIMULADO_LOCAL',
                    'base64'      => $base64,
                    'count'       => 1
                ]
            ];
        }

        if (preg_match('#^/instance/(?:logout|delete)/([^/]+)$#', $endpoint, $m)) {
            return [
                'ok' => true,
                'http_code' => 200,
                'is_timeout' => false,
                'error_code' => null,
                'error_msg' => null,
                'data' => [
                    'status' => 'SUCCESS',
                    'message' => 'Instância desconectada no modo simulado.'
                ]
            ];
        }

        if (preg_match('#^/webhook/set/([^/]+)$#', $endpoint, $m)) {
            return [
                'ok' => true,
                'http_code' => 200,
                'is_timeout' => false,
                'error_code' => null,
                'error_msg' => null,
                'data' => [
                    'webhook' => [
                        'enabled' => true,
                        'url' => $body['url'] ?? 'http://localhost:8000/presenca/multiracha/webhook'
                    ]
                ]
            ];
        }

        if (preg_match('#^/message/sendText/([^/]+)$#', $endpoint, $m)) {
            return [
                'ok' => true,
                'http_code' => 200,
                'is_timeout' => false,
                'error_code' => null,
                'error_msg' => null,
                'data' => [
                    'key' => [
                        'id' => 'SIMULATED_MSG_' . strtoupper(bin2hex(random_bytes(6))),
                        'fromMe' => true
                    ],
                    'message' => [
                        'conversation' => $body['text'] ?? ''
                    ],
                    'messageTimestamp' => time(),
                    'status' => 'PENDING'
                ]
            ];
        }

        return [
            'ok' => true,
            'http_code' => 200,
            'is_timeout' => false,
            'error_code' => null,
            'error_msg' => null,
            'data' => ['simulado' => true]
        ];
    }

    /**
     * Força a transição da instância para estado 'conectado' em modo simulado.
     */
    public function simulateInstanceConnected(int $rachaId, int $usuarioId): array
    {
        if (!self::isSimulationModeEnabled()) {
            throw new HttpError("O modo simulado está desabilitado neste ambiente.", 403);
        }
        $this->validateOrganizerUserForRacha($rachaId, $usuarioId, 'simulação de pareamento');

        $this->getOrCreateRachaInstance($rachaId, $usuarioId);
        $this->updateInstanceStateInDb(
            $rachaId,
            self::STATUS_CONECTADO,
            'open',
            '5511999998888',
            null,
            null,
            ['acao' => 'pareamento_simulado_local']
        );

        return $this->getConnectionStatus($rachaId, false);
    }

    private function formatPublicInstanceResponse(array $row, array $extra = []): array
    {
        $qrBase64 = $extra['qr_code']['qr_code_base64'] ?? ($row['qrcode_base64'] ?? null);
        $base = [
            'racha_id'                     => isset($row['racha_id']) ? (int)$row['racha_id'] : null,
            'instance_name'                => $row['instance_name'] ?? null,
            'instancia_nome'               => $row['instance_name'] ?? null,
            'status_conexao'               => $row['status_conexao'] ?? self::STATUS_DESCONECTADO,
            'estado_bruto_api'             => $row['estado_bruto_api'] ?? null,
            'numero_conectado'             => $row['numero_conectado'] ?? null,
            'webhook_configurado'          => !empty($row['webhook_configurado']),
            'webhook_configurado_em'       => $row['webhook_configurado_em'] ?? null,
            'configurado_por_usuario_id'   => isset($row['configurado_por_usuario_id']) && $row['configurado_por_usuario_id'] !== null
                ? (int)$row['configurado_por_usuario_id']
                : null,
            'ultima_conexao_em'            => $row['ultima_conexao_em'] ?? null,
            'ultima_atualizacao_estado_em' => $row['ultima_atualizacao_estado_em'] ?? null,
            'ultimo_erro_codigo'           => $row['ultimo_erro_codigo'] ?? null,
            'ultimo_erro_resumo'           => $row['ultimo_erro_resumo'] ?? null,
            'qrcode_base64'                => $qrBase64,
            'modo_simulado'                => self::isSimulationModeEnabled()
        ];

        return array_merge($base, $extra);
    }

    // =========================================================================
    // 3. ENVIO DE MENSAGENS COM IDEMPOTÊNCIA E REGISTRO REAL DE ESTADO
    // =========================================================================

    /**
     * Envia uma mensagem de texto pela instância exclusiva do racha na Evolution API (`POST /message/sendText/{instance}`).
     *
     * Regras obrigatórias (Seção 10):
     * - Verifica no banco a associação da instância com o `rachaId` antes de chamar a API.
     * - Protege contra disparos duplicados acidentais via `chaveIdempotencia` em `racha_whatsapp_mensagens`.
     * - Registra a tentativa inicialmente como `'pendente'` (`tentativa_em = NOW(6)`).
     * - NUNCA marca como `'enviado'` apenas porque a requisição foi iniciada:
     *   - Sucesso confirmado pela API -> `status_envio = 'enviado'`, `enviado_em = NOW(6)`, `mensagem_externa_id` preenchido.
     *   - Timeout de comunicação -> `status_envio = 'desconhecido_timeout'`, `enviado_em = NULL`.
     *   - Falha HTTP / erro -> `status_envio = 'falha'`, `enviado_em = NULL`.
     */
    public function sendTextMessage(
        int $rachaId,
        string $telefoneDestino,
        string $texto,
        string $tipoMensagem,
        string $chaveIdempotencia,
        ?int $sessaoId = null,
        ?int $jogadorId = null,
        ?int $usuarioId = null,
        ?int $competenciaAno = null,
        ?int $competenciaMes = null
    ): array {
        $this->assertActiveRacha($rachaId);

        if ($usuarioId !== null) {
            $this->validateOrganizerUserForRacha($rachaId, $usuarioId, "envio de mensagem '{$tipoMensagem}'");
        }

        if (!in_array($tipoMensagem, self::ALLOWED_MESSAGE_TYPES, true)) {
            throw new HttpError("Tipo de mensagem inválido ('{$tipoMensagem}').", 400);
        }

        $textoLimpo = trim($texto);
        if ($textoLimpo === '') {
            throw new HttpError("O texto da mensagem WhatsApp não pode ser vazio.", 400);
        }

        $chaveLimpa = substr(trim($chaveIdempotencia), 0, 140);
        if ($chaveLimpa === '') {
            throw new HttpError("A chave de idempotência do envio (chaveIdempotencia) é obrigatória.", 400);
        }

        $numeroNorm = $this->queueService->normalizePhoneNumber($telefoneDestino);

        $inst = $this->getRegisteredInstanceForRacha($rachaId);
        if (!$inst) {
            throw new HttpError("O racha #{$rachaId} não possui instância do WhatsApp configurada.", 409);
        }
        $instanceName = (string)$inst['instance_name'];

        // Se sessaoId foi informado, valida que a sessão pertence estritamente a este racha
        if ($sessaoId !== null) {
            $stmtSess = $this->pdo->prepare("SELECT id FROM racha_sessoes WHERE id = :sessao_id AND racha_id = :racha_id");
            $stmtSess->execute([':sessao_id' => $sessaoId, ':racha_id' => $rachaId]);
            if (!$stmtSess->fetch()) {
                throw new HttpError("Sessão #{$sessaoId} não pertence ao racha #{$rachaId}.", 404);
            }
        }

        // Se jogadorId foi informado, valida vínculo com o racha
        if ($jogadorId !== null) {
            $this->queueService->validateParticipantLink($rachaId, $jogadorId);
        }

        // 1. Verifica idempotência em `racha_whatsapp_mensagens`
        $stmtCheck = $this->pdo->prepare("
            SELECT *
            FROM racha_whatsapp_mensagens
            WHERE racha_id = :racha_id AND chave_idempotencia = :chave
        ");
        $stmtCheck->execute([':racha_id' => $rachaId, ':chave' => $chaveLimpa]);
        $existingMsg = $stmtCheck->fetch(PDO::FETCH_ASSOC);

        if ($existingMsg) {
            // Se já foi enviado com sucesso ou está em estado desconhecido por timeout (evita duplicar disparo sem confirmação)
            if (in_array($existingMsg['status_envio'], ['enviado', 'desconhecido_timeout'], true)) {
                return [
                    'idempotente'         => true,
                    'enviado'             => $existingMsg['status_envio'] === 'enviado',
                    'mensagem_log_id'     => (int)$existingMsg['id'],
                    'racha_id'            => $rachaId,
                    'sessao_id'           => $existingMsg['sessao_id'] !== null ? (int)$existingMsg['sessao_id'] : null,
                    'jogador_id'          => $existingMsg['jogador_id'] !== null ? (int)$existingMsg['jogador_id'] : null,
                    'telefone_destino'    => (string)$existingMsg['telefone_destino'],
                    'tipo_mensagem'       => (string)$existingMsg['tipo_mensagem'],
                    'status_envio'        => (string)$existingMsg['status_envio'],
                    'mensagem_externa_id' => $existingMsg['mensagem_externa_id'],
                    'chave_idempotencia'  => $chaveLimpa,
                    'texto_preview'       => $textoLimpo
                ];
            }

            // Se a tentativa anterior havia terminado em 'falha' explícita, permite reintentar atualizando para 'pendente'
            $mensagemLogId = (int)$existingMsg['id'];
            $upPend = $this->pdo->prepare("
                UPDATE racha_whatsapp_mensagens
                SET status_envio = 'pendente',
                    tentativa_em = NOW(6),
                    enviado_em = NULL,
                    erro_codigo = NULL,
                    erro_resumo = NULL,
                    updated_at = NOW()
                WHERE id = :id
            ");
            $upPend->execute([':id' => $mensagemLogId]);
        } else {
            $resumoConteudo = $this->sanitizeSensitiveText($textoLimpo, 160);
            $insPend = $this->pdo->prepare("
                INSERT INTO racha_whatsapp_mensagens (
                    racha_id, sessao_id, jogador_id, usuario_id,
                    telefone_destino, direcao, tipo_mensagem,
                    competencia_ano, competencia_mes, chave_idempotencia,
                    status_envio, resumo_conteudo, tentativa_em
                ) VALUES (
                    :racha_id, :sessao_id, :jogador_id, :usuario_id,
                    :telefone, 'saida', :tipo,
                    :comp_ano, :comp_mes, :chave,
                    'pendente', :resumo, NOW(6)
                )
            ");
            $insPend->execute([
                ':racha_id'   => $rachaId,
                ':sessao_id'  => $sessaoId,
                ':jogador_id' => $jogadorId,
                ':usuario_id' => $usuarioId,
                ':telefone'   => $numeroNorm,
                ':tipo'       => $tipoMensagem,
                ':comp_ano'   => $competenciaAno,
                ':comp_mes'   => $competenciaMes,
                ':chave'      => $chaveLimpa,
                ':resumo'     => $resumoConteudo
            ]);
            $mensagemLogId = (int)$this->pdo->lastInsertId();
        }

        // 2. Executa o envio real na Evolution API (compatível com `whatsapp.php`: POST /message/sendText/{instance})
        $resp = $this->callEvolutionApi('POST', '/message/sendText/' . rawurlencode($instanceName), [
            'number' => $numeroNorm,
            'text'   => $textoLimpo,
            'delay'  => 1200
        ]);

        // 3. Avalia o resultado real (sucesso confirmado, timeout desconhecido ou falha)
        if ($resp['is_timeout']) {
            $errCode = $resp['error_code'] ?? 'TIMEOUT';
            $errMsg = $this->sanitizeSensitiveText($resp['error_msg'] ?? 'Timeout ao aguardar confirmação de envio da Evolution API.');

            $upTimeout = $this->pdo->prepare("
                UPDATE racha_whatsapp_mensagens
                SET status_envio = 'desconhecido_timeout',
                    enviado_em = NULL,
                    erro_codigo = :err_code,
                    erro_resumo = :err_msg,
                    updated_at = NOW()
                WHERE id = :id
            ");
            $upTimeout->execute([
                ':err_code' => $errCode,
                ':err_msg'  => $errMsg,
                ':id'       => $mensagemLogId
            ]);

            return [
                'idempotente'         => false,
                'enviado'             => false,
                'mensagem_log_id'     => $mensagemLogId,
                'racha_id'            => $rachaId,
                'sessao_id'           => $sessaoId,
                'jogador_id'          => $jogadorId,
                'telefone_destino'    => $numeroNorm,
                'tipo_mensagem'       => $tipoMensagem,
                'status_envio'        => 'desconhecido_timeout',
                'mensagem_externa_id' => null,
                'erro_codigo'         => $errCode,
                'erro_resumo'         => $errMsg,
                'chave_idempotencia'  => $chaveLimpa,
                'texto_preview'       => $textoLimpo
            ];
        }

        $externalMsgId = null;
        if ($resp['ok'] && is_array($resp['data'])) {
            $externalMsgId = $resp['data']['key']['id']
                ?? $resp['data']['message']['key']['id']
                ?? $resp['data']['id']
                ?? null;
        }

        $isConfirmedSuccess = $resp['ok'] && is_string($externalMsgId) && trim($externalMsgId) !== '';

        if (!$isConfirmedSuccess) {
            $errCode = $resp['error_code'] ?? 'SEND_FAILED';
            $errMsg = $this->sanitizeSensitiveText($resp['error_msg'] ?? 'A Evolution API não confirmou o identificador da mensagem enviada.');

            $upFail = $this->pdo->prepare("
                UPDATE racha_whatsapp_mensagens
                SET status_envio = 'falha',
                    enviado_em = NULL,
                    erro_codigo = :err_code,
                    erro_resumo = :err_msg,
                    updated_at = NOW()
                WHERE id = :id
            ");
            $upFail->execute([
                ':err_code' => $errCode,
                ':err_msg'  => $errMsg,
                ':id'       => $mensagemLogId
            ]);

            if ($tipoMensagem === 'convocacao_semanal' && $sessaoId !== null && $jogadorId !== null) {
                $upConv = $this->pdo->prepare("
                    UPDATE racha_sessao_convocacoes
                    SET status_envio = 'falha_envio', updated_at = NOW()
                    WHERE racha_id = :racha_id AND sessao_id = :sessao_id AND jogador_id = :jogador_id
                ");
                $upConv->execute([
                    ':racha_id'   => $rachaId,
                    ':sessao_id'  => $sessaoId,
                    ':jogador_id' => $jogadorId
                ]);
            }

            return [
                'idempotente'         => false,
                'enviado'             => false,
                'mensagem_log_id'     => $mensagemLogId,
                'racha_id'            => $rachaId,
                'sessao_id'           => $sessaoId,
                'jogador_id'          => $jogadorId,
                'telefone_destino'    => $numeroNorm,
                'tipo_mensagem'       => $tipoMensagem,
                'status_envio'        => 'falha',
                'mensagem_externa_id' => null,
                'erro_codigo'         => $errCode,
                'erro_resumo'         => $errMsg,
                'chave_idempotencia'  => $chaveLimpa,
                'texto_preview'       => $textoLimpo
            ];
        }

        $externalMsgIdClean = substr(trim((string)$externalMsgId), 0, 120);

        $upSent = $this->pdo->prepare("
            UPDATE racha_whatsapp_mensagens
            SET status_envio = 'enviado',
                mensagem_externa_id = :msg_ext_id,
                enviado_em = NOW(6),
                erro_codigo = NULL,
                erro_resumo = NULL,
                updated_at = NOW()
            WHERE id = :id
        ");
        $upSent->execute([
            ':msg_ext_id' => $externalMsgIdClean,
            ':id'         => $mensagemLogId
        ]);

        if ($tipoMensagem === 'convocacao_semanal' && $sessaoId !== null && $jogadorId !== null) {
            $upConv = $this->pdo->prepare("
                UPDATE racha_sessao_convocacoes
                SET status_envio = 'enviado', enviado_em = NOW(), updated_at = NOW()
                WHERE racha_id = :racha_id AND sessao_id = :sessao_id AND jogador_id = :jogador_id
            ");
            $upConv->execute([
                ':racha_id'   => $rachaId,
                ':sessao_id'  => $sessaoId,
                ':jogador_id' => $jogadorId
            ]);
        }

        if ($tipoMensagem === 'promocao_fila' && $sessaoId !== null && $jogadorId !== null) {
            $upPromNotif = $this->pdo->prepare("
                UPDATE racha_sessao_convocacoes
                SET notificacao_promocao_pendente = 0, updated_at = NOW()
                WHERE racha_id = :racha_id AND sessao_id = :sessao_id AND jogador_id = :jogador_id
            ");
            $upPromNotif->execute([
                ':racha_id'   => $rachaId,
                ':sessao_id'  => $sessaoId,
                ':jogador_id' => $jogadorId
            ]);
        }

        return [
            'idempotente'         => false,
            'enviado'             => true,
            'mensagem_log_id'     => $mensagemLogId,
            'racha_id'            => $rachaId,
            'sessao_id'           => $sessaoId,
            'jogador_id'          => $jogadorId,
            'telefone_destino'    => $numeroNorm,
            'tipo_mensagem'       => $tipoMensagem,
            'status_envio'        => 'enviado',
            'mensagem_externa_id' => $externalMsgIdClean,
            'erro_codigo'         => null,
            'erro_resumo'         => null,
            'chave_idempotencia'  => $chaveLimpa,
            'texto_preview'       => $textoLimpo
        ];
    }

    /**
     * Dispara as mensagens de convocação semanal para todos os participantes pendentes de envio na sessão.
     */
    public function dispatchSessionConvocationMessages(int $rachaId, int $sessaoId, int $usuarioId, array $opcoes = []): array
    {
        $ctx = $this->validateOrganizerUserForRacha($rachaId, $usuarioId, 'disparo de convocação semanal via WhatsApp');
        $racha = $ctx['racha'];

        $stmtSess = $this->pdo->prepare("
            SELECT id, racha_id, data_racha, horario_abertura, status, apuracao_presenca
            FROM racha_sessoes
            WHERE id = :sessao_id AND racha_id = :racha_id
        ");
        $stmtSess->execute([':sessao_id' => $sessaoId, ':racha_id' => $rachaId]);
        $sessao = $stmtSess->fetch(PDO::FETCH_ASSOC);

        if (!$sessao) {
            throw new HttpError("Sessão #{$sessaoId} não encontrada para o racha #{$rachaId}.", 404);
        }

        $stmtConv = $this->pdo->prepare("
            SELECT rsc.*, j.nome, j.apelido_bot
            FROM racha_sessao_convocacoes rsc
            JOIN jogadores j ON j.id = rsc.jogador_id
            WHERE rsc.racha_id = :racha_id
              AND rsc.sessao_id = :sessao_id
              AND rsc.status_envio IN ('pendente_envio', 'falha_envio')
            ORDER BY rsc.id ASC
        ");
        $stmtConv->execute([':racha_id' => $rachaId, ':sessao_id' => $sessaoId]);
        $convocados = $stmtConv->fetchAll(PDO::FETCH_ASSOC);

        // Variações e saudações padrão humanizadas para rotação contra bloqueio/spam
        $defaultTemplates = [
            "Fala {apelido}, beleza?\n\nVocê foi convocado para o racha *{nome_racha}* do dia *{data}*!\n\nResponda com uma dessas opções:\n*SIM* - Tô dentro!\n*NÃO* - Dessa vez não consigo\n*DEPOIS* - Confirmo mais tarde",
            "Opa {apelido}! Convocação oficial para a rodada do racha *{nome_racha}*!\n\n📅 Data: *{data}*\n⏰ Horário: *{horario}*\n📍 Local: *{local}*\n\nPodemos contar com você na partida?\n*SIM* - Presença confirmada\n*NÃO* - Não posso ir\n*DEPOIS* - Aviso em breve",
            "E aí {apelido}, tudo certo? Bora pra mais um jogo do racha *{nome_racha}*!\n\nDia *{data}* às *{horario}* no *{local}*.\n\nResponda diretamente:\n*SIM* - Tô dentro!\n*NÃO* - Não consigo ir\n*DEPOIS* - Decido mais tarde"
        ];

        $templates = [];
        if (!empty($opcoes['variacoes_mensagens']) && is_array($opcoes['variacoes_mensagens'])) {
            $filtered = array_values(array_filter(array_map('trim', $opcoes['variacoes_mensagens'])));
            if (!empty($filtered)) {
                $templates = $filtered;
            }
        } elseif (!empty($opcoes['texto_personalizado']) && is_string($opcoes['texto_personalizado']) && trim($opcoes['texto_personalizado']) !== '') {
            $templates = [trim($opcoes['texto_personalizado'])];
        }

        if (empty($templates)) {
            $templates = $defaultTemplates;
        }

        $dataFormatted = !empty($sessao['data_racha'])
            ? date('d/m/Y', strtotime($sessao['data_racha']))
            : 'Data a definir';
        $horarioFormatted = !empty($racha['horario_inicio'])
            ? substr((string)$racha['horario_inicio'], 0, 5)
            : (!empty($sessao['horario_abertura']) ? substr((string)$sessao['horario_abertura'], 11, 5) : 'Horário a definir');
        $localFormatted = !empty($racha['local_nome'])
            ? (string)$racha['local_nome']
            : 'Local a definir';
        $rachaNome = (string)$racha['nome'];

        $enviados = 0;
        $falhas = 0;
        $resultados = [];

        foreach ($convocados as $idx => $c) {
            $jid = (int)$c['jogador_id'];
            $telefone = (string)($c['telefone_destino'] ?? '');
            if ($telefone === '') {
                $falhas++;
                continue;
            }

            $tpl = $templates[$idx % count($templates)];
            $nome = (string)$c['nome'];
            $apelido = !empty($c['apelido_bot']) ? (string)$c['apelido_bot'] : $nome;

            $vars = [
                '{nome}'       => $nome,
                '{apelido}'    => $apelido,
                '{data}'       => $dataFormatted,
                '{horario}'    => $horarioFormatted,
                '{local}'      => $localFormatted,
                '{racha}'      => $rachaNome,
                '{nome_racha}' => $rachaNome,
            ];

            $texto = strtr($tpl, $vars);

            // Garante que as palavras-chave de confirmação estejam presentes para viabilizar as respostas
            if (stripos($texto, 'SIM') === false || (stripos($texto, 'NÃO') === false && stripos($texto, 'NAO') === false)) {
                $texto .= "\n\nResponda com *SIM* para confirmar ou *NÃO* para recusar.";
            }

            $chaveIdemp = "convocacao:racha:{$rachaId}:sessao:{$sessaoId}:jogador:{$jid}";

            $res = $this->sendTextMessage(
                $rachaId,
                $telefone,
                $texto,
                'convocacao_semanal',
                $chaveIdemp,
                $sessaoId,
                $jid,
                $usuarioId
            );

            if ($res['enviado']) {
                $enviados++;
            } else {
                $falhas++;
            }
            $resultados[] = $res;
        }

        return [
            'racha_id'   => $rachaId,
            'sessao_id'  => $sessaoId,
            'enviados'   => $enviados,
            'falhas'     => $falhas,
            'resultados' => $resultados
        ];
    }

    // =========================================================================
    // 4. INTERPRETAÇÃO DE LINGUAGEM NATURAL E PROCESSAMENTO SEGURO DO WEBHOOK
    // =========================================================================

    /**
     * Interpreta o texto recebido do participante no WhatsApp reutilizando as expressões aprovadas do bot legado:
     * Retorna `'SIM'`, `'NAO'`, `'DEPOIS'` ou `'INVALIDO'`.
     */
    public static function interpretIncomingTextIntent(string $texto): string
    {
        if (trim($texto) === '') {
            return 'INVALIDO';
        }

        $t = function_exists('mb_strtolower')
            ? mb_strtolower(trim($texto), 'UTF-8')
            : strtolower(trim($texto));

        if (function_exists('iconv')) {
            $trans = @iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $t);
            if ($trans !== false) {
                $t = $trans;
            }
        }
        $t = strtr($t, [
            'ã' => 'a', 'á' => 'a', 'à' => 'a', 'â' => 'a',
            'é' => 'e', 'ê' => 'e', 'í' => 'i', 'ó' => 'o',
            'ô' => 'o', 'õ' => 'o', 'ú' => 'u', 'ç' => 'c'
        ]);
        $t = (string)preg_replace('/[^a-z0-9 ]/', '', $t);
        $t = trim($t);

        if ($t === '') {
            return 'INVALIDO';
        }

        // CANCELAR / DESISTIR -> comando explícito de cancelamento
        if (preg_match('/\b(cancela|cancelar|desistir|desisto)\b/', $t)) {
            return 'CANCELAR';
        }

        // SIM (inclui prefixos explícitos de racha ou renovação)
        if (preg_match('/^(?:racha|jogo|partida|semana|semanal|renovar|renovacao|mensal|mensalidade)?\s*(sim|s|1)$/', $t)) {
            return 'SIM';
        }
        if (preg_match('/\b(racha sim|racha s|racha 1|jogo sim|semanal sim|renovar sim|renovar s|renovacao sim|mensal sim|mensalidade sim)\b/', $t)) {
            return 'SIM';
        }
        if (preg_match('/\b(to dentro|vou sim|vou estar|estarei|pode botar|pode me botar|pode confirmar|confirma ai|confirma|confirmado|topo|topei|bora|eu vou|vou la|vou la sim|vou ir|vou comparecer|conta comigo|pode contar|to la|estarei la|presente|com certeza|claro que sim|obvio|com certeza sim|vai ter eu|dentro)\b/', $t)) {
            return 'SIM';
        }

        // NAO (inclui prefixos explícitos de racha ou renovação)
        if (preg_match('/^(?:racha|jogo|partida|semana|semanal|renovar|renovacao|mensal|mensalidade)?\s*(nao|n|no|2)$/', $t)) {
            return 'NAO';
        }
        if (preg_match('/\b(racha nao|racha n|racha 2|jogo nao|semanal nao|renovar nao|renovar n|renovacao nao|mensal nao|mensalidade nao)\b/', $t)) {
            return 'NAO';
        }
        if (preg_match('/\b(nao vou|nao consigo|nao posso|nao da|nao vai dar|nao vou conseguir|nao vou poder|dessa nao|dessa vez nao|infelizmente nao|nao dessa vez|fora dessa|fico fora|to fora|sem condicao|sem condicoes|impossivel|nao vai rolar|nao rola|ausente|faltarei|vou faltar|nao vou estar)\b/', $t)) {
            return 'NAO';
        }

        // DEPOIS (inclui prefixos explícitos de racha)
        if (preg_match('/^(?:racha|jogo|partida|semana|semanal)?\s*(depois|dep|3)$/', $t)) {
            return 'DEPOIS';
        }
        if (preg_match('/\b(racha depois|racha dep|racha 3|jogo depois)\b/', $t)) {
            return 'DEPOIS';
        }
        if (preg_match('/\b(depois eu|confirmo depois|confirmo mais tarde|vou ver|vou verificar|talvez|talvez sim|nao sei ainda|ainda nao sei|to vendo|depende|vou tentar|tentarei|so sei depois|aviso depois|te aviso|ainda nao|em aberto|deixa em aberto|nao confirmei ainda)\b/', $t)) {
            return 'DEPOIS';
        }

        return 'INVALIDO';
    }

    /**
     * Interpreta o texto identificando tanto a intenção ('SIM', 'NAO', 'DEPOIS', 'INVALIDO')
     * quanto o escopo pretendido ('semanal', 'mensal', 'generico').
     */
    public static function interpretIncomingMessageIntent(string $texto): array
    {
        $raw = trim($texto);
        if ($raw === '') {
            return ['intencao' => 'INVALIDO', 'escopo' => 'generico', 'texto_normalizado' => ''];
        }

        $t = function_exists('mb_strtolower') ? mb_strtolower($raw, 'UTF-8') : strtolower($raw);
        if (function_exists('iconv')) {
            $trans = @iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $t);
            if ($trans !== false) {
                $t = $trans;
            }
        }
        $t = strtr($t, [
            'ã' => 'a', 'á' => 'a', 'à' => 'a', 'â' => 'a',
            'é' => 'e', 'ê' => 'e', 'í' => 'i', 'ó' => 'o',
            'ô' => 'o', 'õ' => 'o', 'ú' => 'u', 'ç' => 'c'
        ]);
        $t = (string)preg_replace('/[^a-z0-9 ]/', '', $t);
        $t = trim($t);

        $escopo = 'generico';
        if (preg_match('/^(?:racha|jogo|partida|semana|semanal)\b/i', $t) || preg_match('/\b(?:racha|partida)\s+(?:sim|nao|depois|cancelar)\b/i', $t)) {
            $escopo = 'semanal';
        } elseif (preg_match('/^(?:renovar|renovacao|mensal|mensalidade)\b/i', $t) || preg_match('/\b(?:renovar|mensalidade)\s+(?:sim|nao)\b/i', $t)) {
            $escopo = 'mensal';
        }

        $intencao = self::interpretIncomingTextIntent($t);
        if ($intencao === 'CANCELAR' && $escopo === 'generico') {
            $escopo = 'semanal';
        }

        return [
            'intencao'          => $intencao,
            'escopo'            => $escopo,
            'texto_normalizado' => $t
        ];
    }

    /**
     * Valida a autenticidade e o isolamento multi-racha de uma requisição de webhook da Evolution API.
     *
     * Verifica:
     * 1. O nome da instância (`instance` no payload ou query).
     * 2. A existência da instância em `racha_whatsapp_instancias` e se o racha está ativo.
     * 3. Se `racha_id` foi informado na rota/query/header, exige que coincida estritamente com o `racha_id` da instância.
     * 4. O segredo individual da instância (`X-Webhook-Token`, `Authorization: Bearer ...` ou `?token=...`)
     *    comparado via `hash_equals()` contra `webhook_secret_hash` (SHA-256).
     */
    public function authenticateWebhookRequest(
        array $payload,
        array $headers = [],
        array $queryParams = []
    ): array {
        $instanceName = trim((string)(
            $payload['instance']
            ?? $payload['instanceName']
            ?? $queryParams['instance']
            ?? ''
        ));

        if ($instanceName === '') {
            throw new HttpError("Identificador da instância ausente no payload do webhook.", 400);
        }

        $stmt = $this->pdo->prepare("
            SELECT rwi.*, r.nome AS racha_nome, r.ativo AS racha_ativo
            FROM racha_whatsapp_instancias rwi
            JOIN rachas r ON r.id = rwi.racha_id
            WHERE rwi.instance_name = :instance_name
        ");
        $stmt->execute([':instance_name' => $instanceName]);
        $inst = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$inst) {
            throw new HttpError("Instância WhatsApp não reconhecida ou não vinculada a nenhum racha cadastrado.", 403);
        }

        $rachaId = (int)$inst['racha_id'];

        // Se o chamador/rota informou explicitamente um racha_id, valida que a instância pertence exatamente a esse racha
        $explicitRachaId = $queryParams['racha_id'] ?? $this->extractHeaderValue($headers, 'X-Racha-Id');
        if ($explicitRachaId !== null && trim((string)$explicitRachaId) !== '') {
            if ((int)$explicitRachaId !== $rachaId) {
                throw new HttpError("Conflito de escopo no webhook: a instância informada pertence a outro racha.", 403);
            }
        }

        if ((int)$inst['racha_ativo'] !== 1) {
            throw new HttpError("O racha associado a esta instância está inativo.", 403);
        }

        // Extrai o token de autenticação do webhook (header X-Webhook-Token, Authorization Bearer ou query token)
        $incomingToken = $this->extractHeaderValue($headers, 'X-Webhook-Token');

        if ($incomingToken === null || trim($incomingToken) === '') {
            $authHeader = $this->extractHeaderValue($headers, 'Authorization');
            if ($authHeader !== null && preg_match('/^Bearer\s+(.+)$/i', trim($authHeader), $m)) {
                $incomingToken = trim($m[1]);
            }
        }

        if (($incomingToken === null || trim($incomingToken) === '') && isset($queryParams['token'])) {
            $incomingToken = trim((string)$queryParams['token']);
        }

        if ($incomingToken === null || $incomingToken === '') {
            throw new HttpError("Credencial de autenticação do webhook ausente.", 401);
        }

        $incomingHash = hash('sha256', $incomingToken);
        $expectedHash = (string)$inst['webhook_secret_hash'];

        if (!hash_equals($expectedHash, $incomingHash)) {
            throw new HttpError("Credencial de autenticação do webhook inválida.", 401);
        }

        return $inst;
    }

    /**
     * Processa um evento de webhook recebido da Evolution API para o módulo multi-racha.
     */
    public function handleIncomingWebhook(
        array $payload,
        array $headers = [],
        array $queryParams = [],
        bool $replyOnInvalidIntent = true,
        bool $notifyPromotedAvulso = true
    ): array {
        // 1. Valida autenticação do webhook e associação estrita entre instância e racha
        $inst = $this->authenticateWebhookRequest($payload, $headers, $queryParams);
        $rachaId = (int)$inst['racha_id'];
        $instanceName = (string)$inst['instance_name'];

        $rawEvent = strtoupper(str_replace('.', '_', trim((string)($payload['event'] ?? ''))));

        // 2. Trata eventos de atualização de estado de conexão
        if ($rawEvent === 'CONNECTION_UPDATE') {
            $data = is_array($payload['data'] ?? null) ? $payload['data'] : [];
            $extracted = $this->extractStateAndPhoneFromApiPayload($data);
            $rawState = $extracted['raw_state'] ?? 'close';
            $normStatus = self::normalizeConnectionState($rawState);

            $this->updateInstanceStateInDb(
                $rachaId,
                $normStatus,
                $rawState,
                $extracted['connected_phone'] ?? $inst['numero_conectado'],
                null,
                null,
                ['acao' => 'webhook_connection_update', 'estado_bruto' => $rawState]
            );

            return [
                'ok'             => true,
                'racha_id'       => $rachaId,
                'instance_name'  => $instanceName,
                'evento'         => 'CONNECTION_UPDATE',
                'status_conexao' => $normStatus
            ];
        }

        // Ignora eventos que não sejam recebimento de mensagens
        if ($rawEvent !== 'MESSAGES_UPSERT') {
            return [
                'ok'            => true,
                'ignorado'      => true,
                'racha_id'      => $rachaId,
                'instance_name' => $instanceName,
                'motivo'        => 'evento_nao_mensagem'
            ];
        }

        // 3. Extrai a mensagem compatível com Evolution API v1 (data[0]) e v2 (data)
        $data = $payload['data'] ?? [];
        $msg = (is_array($data) && isset($data[0]) && is_array($data[0])) ? $data[0] : (is_array($data) ? $data : []);

        if (empty($msg) || !isset($msg['key']) || !is_array($msg['key'])) {
            throw new HttpError("Formato de mensagem inválido no payload do webhook.", 400);
        }

        // Ignora mensagens enviadas pela própria conta (fromMe)
        if (!empty($msg['key']['fromMe'])) {
            return [
                'ok'            => true,
                'ignorado'      => true,
                'racha_id'      => $rachaId,
                'instance_name' => $instanceName,
                'motivo'        => 'fromMe_ignorado'
            ];
        }

        $remoteJid = trim((string)($msg['key']['remoteJid'] ?? ''));
        if ($remoteJid === '') {
            throw new HttpError("Campo remoteJid ausente na mensagem do webhook.", 400);
        }

        // Ignora mensagens de grupo (@g.us) e listas de transmissão (@broadcast)
        if (str_contains($remoteJid, '@g.us') || str_contains($remoteJid, '@broadcast')) {
            return [
                'ok'            => true,
                'ignorado'      => true,
                'racha_id'      => $rachaId,
                'instance_name' => $instanceName,
                'motivo'        => 'grupo_ou_broadcast_ignorado'
            ];
        }

        // 4. Extrai o identificador externo único da mensagem, o número do remetente e o texto
        $mensagemExternaId = trim((string)($msg['key']['id'] ?? ''));
        if ($mensagemExternaId === '') {
            throw new HttpError("Identificador externo da mensagem (key.id) ausente no webhook.", 400);
        }

        $numeroRemetente = preg_replace('/\D/', '', explode('@', $remoteJid)[0]) ?? '';
        if ($numeroRemetente === '') {
            throw new HttpError("Número do remetente inválido no webhook.", 400);
        }

        $texto = $this->extractTextFromEvolutionMessage($msg);
        if ($texto === '') {
            return [
                'ok'            => true,
                'ignorado'      => true,
                'racha_id'      => $rachaId,
                'instance_name' => $instanceName,
                'motivo'        => 'mensagem_sem_texto'
            ];
        }

        $pushName = isset($msg['pushName']) && is_string($msg['pushName']) ? trim($msg['pushName']) : null;

        // 5. Interpreta a intenção ('SIM', 'NAO', 'DEPOIS', 'INVALIDO') e o escopo ('semanal', 'mensal', 'generico')
        $parsedIntent = self::interpretIncomingMessageIntent($texto);
        $intencaoInterpretada = $parsedIntent['intencao'];
        $escopo = $parsedIntent['escopo'];

        if ($escopo === 'mensal') {
            // Fluxo desacoplado de Renovação Mensal: resolve o participante ativo do racha pelo telefone sem exigir sessão semanal aberta
            $vars = $this->queueService->getPhoneVariations($numeroRemetente);
            $placeholders = implode(',', array_fill(0, count($vars), '?'));
            $stmtPart = $this->pdo->prepare("
                SELECT rp.jogador_id, j.nome, j.whatsapp
                FROM racha_participantes rp
                JOIN jogadores j ON j.id = rp.jogador_id
                WHERE rp.racha_id = ? AND rp.ativo = 1 AND j.whatsapp IN ({$placeholders})
            ");
            $stmtPart->execute(array_merge([$rachaId], $vars));
            $partRows = $stmtPart->fetchAll(PDO::FETCH_ASSOC);

            if (empty($partRows)) {
                throw new HttpError("Nenhum participante ativo encontrado no racha #{$rachaId} para o telefone informado.", 404);
            }
            if (count($partRows) > 1) {
                throw new HttpError("Ambiguidade de identidade: múltiplos participantes ativos do racha #{$rachaId} utilizam o mesmo telefone.", 409);
            }

            $jogadorId = (int)$partRows[0]['jogador_id'];
            $convocado = [
                'jogador_id'       => $jogadorId,
                'nome'             => $partRows[0]['nome'],
                'telefone_destino' => $partRows[0]['whatsapp'],
                'situacao_vaga'    => null,
                'intencao_atual'   => null
            ];
            $sessaoId = null;
        } else {
            // Localiza a sessão ativa de convocação deste racha e o participante convocado pelo telefone
            $sessaoId = $this->resolveActiveConvocationSessionForRacha($rachaId, $payload['sessao_id'] ?? $queryParams['sessao_id'] ?? null);

            try {
                $convocado = $this->queueService->resolveConvokedParticipantByPhone(
                    $rachaId,
                    $sessaoId,
                    $numeroRemetente,
                    $pushName
                );
            } catch (HttpError $e) {
                // Remetente desconhecido (404) ou identificação ambígua (409): rejeita sem alterar a fila e registra diagnóstico seguro
                $this->updateInstanceStateInDb(
                    $rachaId,
                    (string)$inst['status_conexao'],
                    $inst['estado_bruto_api'],
                    $inst['numero_conectado'],
                    'WEBHOOK_SENDER_' . $e->getStatusCode(),
                    $e->getMessage(),
                    [
                        'acao'                => 'remetente_rejeitado_webhook',
                        'sessao_id'           => $sessaoId,
                        'http_code'           => $e->getStatusCode(),
                        'mensagem_externa_id' => $mensagemExternaId
                    ]
                );
                throw $e;
            }

            $jogadorId = (int)$convocado['jogador_id'];
        }

        // Verifica se há pedido de renovação mensal em aberto para este participante
        $stmtPendRenov = $this->pdo->prepare("
            SELECT id, sessao_id, jogador_id, competencia_ano, competencia_mes
            FROM racha_whatsapp_mensagens
            WHERE racha_id = :racha_id
              AND (telefone_destino = :tel OR jogador_id = :jog_id)
              AND tipo_mensagem = 'renovacao_mensal'
              AND respondido_em IS NULL
            ORDER BY id DESC LIMIT 1
        ");
        $stmtPendRenov->execute([
            ':racha_id' => $rachaId,
            ':tel'      => (string)$convocado['telefone_destino'],
            ':jog_id'   => $jogadorId
        ]);
        $pendRenov = $stmtPendRenov->fetch(PDO::FETCH_ASSOC);
        if (!$pendRenov) {
            $stmtRmr = $this->pdo->prepare("
                SELECT id, racha_id, jogador_id, competencia_ano, competencia_mes
                FROM racha_mensalistas_renovacoes
                WHERE racha_id = :racha_id AND jogador_id = :jog_id AND intencao_renovacao = 'sem_resposta'
                ORDER BY id DESC LIMIT 1
            ");
            $stmtRmr->execute([':racha_id' => $rachaId, ':jog_id' => $jogadorId]);
            $pendRenov = $stmtRmr->fetch(PDO::FETCH_ASSOC);
        }
        $hasPendingMonthly = !empty($pendRenov);

        $hasWeeklyActiveOrPending = in_array((string)($convocado['situacao_vaga'] ?? ''), [
            'aguardando_resposta',
            'aguardando_confirmacao_tardia',
            'fila_espera',
            'vaga_reservada',
            'promovido_titular'
        ], true);

        $hasPendingWeekly = in_array((string)($convocado['situacao_vaga'] ?? ''), ['aguardando_resposta', 'aguardando_confirmacao_tardia', 'fila_espera'], true)
            && in_array((string)($convocado['intencao_atual'] ?? ''), ['sem_resposta', 'depois'], true);

        // 6a. Mensagem inválida: envia instrução e não altera a fila
        if ($intencaoInterpretada === 'INVALIDO') {
            $chaveEntradaInvalida = "webhook_invalido:sessao:{$sessaoId}:msg:{$mensagemExternaId}";

            $stmtDupInv = $this->pdo->prepare("
                SELECT id FROM racha_whatsapp_mensagens
                WHERE racha_id = :racha_id AND chave_idempotencia = :chave
            ");
            $stmtDupInv->execute([':racha_id' => $rachaId, ':chave' => $chaveEntradaInvalida]);
            if ($stmtDupInv->fetch()) {
                return [
                    'ok'                  => true,
                    'idempotente'         => true,
                    'racha_id'            => $rachaId,
                    'sessao_id'           => $sessaoId,
                    'jogador_id'          => $jogadorId,
                    'intencao_processada' => 'INVALIDO',
                    'fila_alterada'       => false
                ];
            }

            $insInv = $this->pdo->prepare("
                INSERT INTO racha_whatsapp_mensagens (
                    racha_id, sessao_id, jogador_id, usuario_id,
                    telefone_destino, direcao, tipo_mensagem,
                    chave_idempotencia, status_envio, mensagem_externa_id,
                    resumo_conteudo, tentativa_em, respondido_em,
                    erro_codigo, erro_resumo
                ) VALUES (
                    :racha_id, :sessao_id, :jogador_id, NULL,
                    :telefone, 'entrada', 'resposta_participante',
                    :chave, 'rejeitada', :msg_ext_id,
                    :resumo, NOW(6), NOW(6),
                    'INTENCAO_INVALIDA', 'Mensagem não reconhecida como SIM, NÃO ou DEPOIS.'
                )
            ");
            $insInv->execute([
                ':racha_id'   => $rachaId,
                ':sessao_id'  => $sessaoId,
                ':jogador_id' => $jogadorId,
                ':telefone'   => (string)$convocado['telefone_destino'],
                ':chave'      => $chaveEntradaInvalida,
                ':msg_ext_id' => $mensagemExternaId,
                ':resumo'     => $this->sanitizeSensitiveText($texto, 160)
            ]);

            $instrucaoEnviada = null;
            if ($replyOnInvalidIntent && !empty($convocado['telefone_destino'])) {
                $textoInstrucao = "Oi {$convocado['nome']}! Não entendi sua resposta.\n\n"
                    . "Por favor, responda apenas com uma das opções:\n"
                    . "*SIM* - Vou comparecer\n"
                    . "*NÃO* - Não vou conseguir ir\n"
                    . "*DEPOIS* - Confirmo mais tarde";

                $instrucaoEnviada = $this->sendTextMessage(
                    $rachaId,
                    (string)$convocado['telefone_destino'],
                    $textoInstrucao,
                    'resposta_instrucao',
                    "instrucao:sessao:{$sessaoId}:msg:{$mensagemExternaId}",
                    $sessaoId,
                    $jogadorId,
                    null
                );
            }

            return [
                'ok'                  => true,
                'idempotente'         => false,
                'racha_id'            => $rachaId,
                'sessao_id'           => $sessaoId,
                'jogador_id'          => $jogadorId,
                'intencao_processada' => 'INVALIDO',
                'fila_alterada'       => false,
                'instrucao_enviada'   => $instrucaoEnviada
            ];
        }

        // 6b. Ambiguidade: mensagem genérica ('SIM'/'NÃO') quando há convocação semanal E renovação mensal pendentes
        if ($escopo === 'generico' && $hasPendingWeekly && $hasPendingMonthly) {
            $chaveAmb = "webhook_ambiguo:sessao:{$sessaoId}:msg:{$mensagemExternaId}";
            $stmtDupAmb = $this->pdo->prepare("SELECT id FROM racha_whatsapp_mensagens WHERE racha_id = :racha_id AND chave_idempotencia = :chave");
            $stmtDupAmb->execute([':racha_id' => $rachaId, ':chave' => $chaveAmb]);
            if ($stmtDupAmb->fetch()) {
                return [
                    'ok'                  => true,
                    'idempotente'         => true,
                    'racha_id'            => $rachaId,
                    'sessao_id'           => $sessaoId,
                    'jogador_id'          => $jogadorId,
                    'intencao_processada' => 'AMBIGUO',
                    'fila_alterada'       => false,
                    'vaga_liberada'       => false
                ];
            }

            $insAmb = $this->pdo->prepare("
                INSERT INTO racha_whatsapp_mensagens (
                    racha_id, sessao_id, jogador_id, usuario_id,
                    telefone_destino, direcao, tipo_mensagem,
                    chave_idempotencia, status_envio, mensagem_externa_id,
                    resumo_conteudo, tentativa_em, respondido_em,
                    erro_codigo, erro_resumo
                ) VALUES (
                    :racha_id, :sessao_id, :jogador_id, NULL,
                    :telefone, 'entrada', 'resposta_participante',
                    :chave, 'rejeitada', :msg_ext_id,
                    :resumo, NOW(6), NOW(6),
                    'RESPOSTA_AMBIGUA', 'Resposta genérica recebida com convocação semanal e renovação mensal pendentes simultaneamente.'
                )
            ");
            $insAmb->execute([
                ':racha_id'   => $rachaId,
                ':sessao_id'  => $sessaoId,
                ':jogador_id' => $jogadorId,
                ':telefone'   => (string)$convocado['telefone_destino'],
                ':chave'      => $chaveAmb,
                ':msg_ext_id' => $mensagemExternaId,
                ':resumo'     => $this->sanitizeSensitiveText($texto, 160)
            ]);

            $instrucaoAmb = null;
            if ($replyOnInvalidIntent && !empty($convocado['telefone_destino'])) {
                $textoClarificacao = "Oi {$convocado['nome']}! Identificamos que você tem duas confirmações em aberto:\n"
                    . "1. Presença no racha da semana\n"
                    . "2. Renovação da sua mensalidade\n\n"
                    . "Por favor, responda com:\n"
                    . "*RACHA SIM* ou *RACHA NÃO* para a partida semanal\n"
                    . "*RENOVAR SIM* ou *RENOVAR NÃO* para a mensalidade";

                $instrucaoAmb = $this->sendTextMessage(
                    $rachaId,
                    (string)$convocado['telefone_destino'],
                    $textoClarificacao,
                    'resposta_instrucao',
                    "instrucao_amb:sessao:{$sessaoId}:msg:{$mensagemExternaId}",
                    $sessaoId,
                    $jogadorId,
                    null
                );
            }

            return [
                'ok'                  => true,
                'idempotente'         => false,
                'racha_id'            => $rachaId,
                'sessao_id'           => $sessaoId,
                'jogador_id'          => $jogadorId,
                'intencao_processada' => 'AMBIGUO',
                'fila_alterada'       => false,
                'vaga_liberada'       => false,
                'instrucao_enviada'   => $instrucaoAmb
            ];
        }

        // 6c. Fluxo exclusivo de Renovação Mensal (RENOVAR SIM / RENOVAR NÃO ou pendente único de renovação sem vaga ou pendência no racha semanal)
        if ($escopo === 'mensal' || ($escopo === 'generico' && $hasPendingMonthly && !$hasWeeklyActiveOrPending)) {
            $chaveEntradaRenov = "webhook_renovacao:msg:{$mensagemExternaId}";
            $stmtDupRenov = $this->pdo->prepare("SELECT id FROM racha_whatsapp_mensagens WHERE racha_id = :racha_id AND chave_idempotencia = :chave");
            $stmtDupRenov->execute([':racha_id' => $rachaId, ':chave' => $chaveEntradaRenov]);
            if ($stmtDupRenov->fetch()) {
                return [
                    'ok'                  => true,
                    'idempotente'         => true,
                    'racha_id'            => $rachaId,
                    'jogador_id'          => $jogadorId,
                    'tipo_resposta'       => 'renovacao_mensal',
                    'intencao_processada' => $intencaoInterpretada,
                    'fila_alterada'       => false,
                    'vaga_liberada'       => false
                ];
            }

            if ($pendRenov) {
                $upRenov = $this->pdo->prepare("UPDATE racha_whatsapp_mensagens SET respondido_em = NOW(6) WHERE id = :id");
                $upRenov->execute([':id' => $pendRenov['id']]);
            }

            $anoComp = !empty($pendRenov['competencia_ano']) ? (int)$pendRenov['competencia_ano'] : (int)date('Y');
            $mesComp = !empty($pendRenov['competencia_mes']) ? (int)$pendRenov['competencia_mes'] : (int)date('n');

            $insRenov = $this->pdo->prepare("
                INSERT INTO racha_whatsapp_mensagens (
                    racha_id, sessao_id, jogador_id, usuario_id,
                    telefone_destino, direcao, tipo_mensagem,
                    competencia_ano, competencia_mes, chave_idempotencia,
                    status_envio, mensagem_externa_id, resumo_conteudo,
                    tentativa_em, respondido_em
                ) VALUES (
                    :racha_id, :sessao_id, :jogador_id, NULL,
                    :telefone, 'entrada', 'resposta_participante',
                    :ano, :mes, :chave,
                    'recebida', :msg_ext_id, :resumo,
                    NOW(6), NOW(6)
                )
            ");
            $insRenov->execute([
                ':racha_id'   => $rachaId,
                ':sessao_id'  => $sessaoId,
                ':jogador_id' => $jogadorId,
                ':telefone'   => (string)$convocado['telefone_destino'],
                ':ano'        => $anoComp,
                ':mes'        => $mesComp,
                ':chave'      => $chaveEntradaRenov,
                ':msg_ext_id' => $mensagemExternaId,
                ':resumo'     => $this->sanitizeSensitiveText("Renovação Mensal: {$intencaoInterpretada} ({$texto})", 160)
            ]);

            // Atualiza intenção de renovação na tabela racha_mensalistas_renovacoes sem cancelar o mensalista
            $intencaoRenovNorm = (strtolower($intencaoInterpretada) === 'sim') ? 'sim' : ((strtolower($intencaoInterpretada) === 'nao') ? 'nao' : 'sem_resposta');
            $stmtUpRmr = $this->pdo->prepare("
                UPDATE racha_mensalistas_renovacoes
                SET intencao_renovacao = :intencao,
                    resposta_em = NOW(6)
                WHERE racha_id = :racha_id AND jogador_id = :jogador_id
                  AND competencia_ano = :ano AND competencia_mes = :mes
            ");
            $stmtUpRmr->execute([
                ':intencao'   => $intencaoRenovNorm,
                ':racha_id'   => $rachaId,
                ':jogador_id' => $jogadorId,
                ':ano'        => $anoComp,
                ':mes'        => $mesComp
            ]);

            return [
                'ok'                  => true,
                'idempotente'         => false,
                'racha_id'            => $rachaId,
                'sessao_id'           => $sessaoId,
                'jogador_id'          => $jogadorId,
                'tipo_resposta'       => 'renovacao_mensal',
                'intencao_processada' => $intencaoInterpretada,
                'fila_alterada'       => false,
                'vaga_liberada'       => false
            ];
        }

        // 7. Encaminha a intenção válida semanal ao RachaQueueService (que garante transação atômica,
        //    idempotência por mensagem_externa_id, autoria 'jogador_whatsapp' e promoção automática com autoria 'sistema')
        $resultadoFila = $this->queueService->recordWhatsAppParticipantIntentByPhone(
            $rachaId,
            $sessaoId,
            $numeroRemetente,
            $intencaoInterpretada,
            $mensagemExternaId,
            $pushName
        );

        // Registra a mensagem de entrada processada no log de mensagens (idempotente)
        $chaveEntrada = "webhook_entrada:sessao:{$sessaoId}:msg:{$mensagemExternaId}";
        $stmtChkIn = $this->pdo->prepare("
            SELECT id FROM racha_whatsapp_mensagens
            WHERE racha_id = :racha_id AND chave_idempotencia = :chave
        ");
        $stmtChkIn->execute([':racha_id' => $rachaId, ':chave' => $chaveEntrada]);
        if (!$stmtChkIn->fetch()) {
            $insIn = $this->pdo->prepare("
                INSERT INTO racha_whatsapp_mensagens (
                    racha_id, sessao_id, jogador_id, usuario_id,
                    telefone_destino, direcao, tipo_mensagem,
                    chave_idempotencia, status_envio, mensagem_externa_id,
                    resumo_conteudo, tentativa_em, respondido_em
                ) VALUES (
                    :racha_id, :sessao_id, :jogador_id, NULL,
                    :telefone, 'entrada', 'resposta_participante',
                    :chave, 'recebida', :msg_ext_id,
                    :resumo, NOW(6), NOW(6)
                )
            ");
            $insIn->execute([
                ':racha_id'   => $rachaId,
                ':sessao_id'  => $sessaoId,
                ':jogador_id' => $jogadorId,
                ':telefone'   => (string)$convocado['telefone_destino'],
                ':chave'      => $chaveEntrada,
                ':msg_ext_id' => $mensagemExternaId,
                ':resumo'     => $this->sanitizeSensitiveText($texto, 160)
            ]);
        }

        // Se houve promoção automática de avulso da fila de espera, envia notificação ao promovido com detalhes e instrução de cancelamento
        $notificacaoPromocao = null;
        if (
            !$resultadoFila['idempotente']
            && !empty($resultadoFila['promocao_automatica']['promovido'])
            && $notifyPromotedAvulso
        ) {
            $prom = $resultadoFila['promocao_automatica'];
            $promJogadorId = (int)$prom['jogador_id'];

            $stmtTelProm = $this->pdo->prepare("
                SELECT telefone_destino, nome
                FROM racha_sessao_convocacoes rsc
                JOIN jogadores j ON j.id = rsc.jogador_id
                WHERE rsc.racha_id = :racha_id AND rsc.sessao_id = :sessao_id AND rsc.jogador_id = :jogador_id
            ");
            $stmtTelProm->execute([
                ':racha_id'   => $rachaId,
                ':sessao_id'  => $sessaoId,
                ':jogador_id' => $promJogadorId
            ]);
            $promInfo = $stmtTelProm->fetch(PDO::FETCH_ASSOC);

            if ($promInfo && !empty($promInfo['telefone_destino'])) {
                $stmtSessInfo = $this->pdo->prepare("
                    SELECT rs.data_racha, rs.horario_abertura, r.horario_inicio, r.local_nome
                    FROM racha_sessoes rs
                    JOIN rachas r ON r.id = rs.racha_id
                    WHERE rs.id = :sessao_id
                ");
                $stmtSessInfo->execute([':sessao_id' => $sessaoId]);
                $sessInfo = $stmtSessInfo->fetch(PDO::FETCH_ASSOC);

                $dataFmt = !empty($sessInfo['data_racha']) ? date('d/m/Y', strtotime($sessInfo['data_racha'])) : '';
                $horaFmt = !empty($sessInfo['horario_inicio']) ? substr((string)$sessInfo['horario_inicio'], 0, 5) : '';
                $localFmt = (string)($sessInfo['local_nome'] ?? '');

                $textoProm = "Boa notícia, {$promInfo['nome']}! Uma vaga abriu no racha *{$inst['racha_nome']}*";
                if ($dataFmt !== '') {
                    $textoProm .= " para o jogo de *{$dataFmt}*";
                    if ($horaFmt !== '') $textoProm .= " às *{$horaFmt}*";
                    if ($localFmt !== '') $textoProm .= " em *{$localFmt}*";
                }
                $textoProm .= " e você foi promovido da fila de espera para a lista principal!\n\n"
                    . "Caso não possa comparecer, responda *CANCELAR* (ou *NÃO*) para liberarmos a vaga ao próximo da fila.";

                $notificacaoPromocao = $this->sendTextMessage(
                    $rachaId,
                    (string)$promInfo['telefone_destino'],
                    $textoProm,
                    'promocao_fila',
                    "promocao:sessao:{$sessaoId}:jogador:{$promJogadorId}:vaga_de:" . (int)($prom['promovido_por_vaga_de_jogador_id'] ?? 0),
                    $sessaoId,
                    $promJogadorId,
                    null
                );
            }
        }

        // Resposta de confirmação de cancelamento ao participante que solicitou desistência
        $respostaCancelamento = null;
        if (
            ($intencaoInterpretada === 'CANCELAR' || !empty($resultadoFila['vaga_liberada']) || (!empty($resultadoFila['ja_cancelado']) && $intencaoInterpretada === 'CANCELAR'))
            && !empty($convocado['telefone_destino'])
        ) {
            $chaveRespCanc = "resposta_canc:sessao:{$sessaoId}:msg:{$mensagemExternaId}";
            if (!empty($resultadoFila['idempotente']) && !empty($resultadoFila['ja_cancelado'])) {
                $textoCancel = "Olá {$convocado['nome']}, você já havia cancelado sua participação no racha *{$inst['racha_nome']}*. Sua vaga permanece liberada!";
            } else {
                $textoCancel = "Olá {$convocado['nome']}, sua participação no racha *{$inst['racha_nome']}* foi cancelada com sucesso. A vaga foi liberada. Obrigado por avisar!";
            }
            $respostaCancelamento = $this->sendTextMessage(
                $rachaId,
                (string)$convocado['telefone_destino'],
                $textoCancel,
                'resposta_instrucao',
                $chaveRespCanc,
                $sessaoId,
                $jogadorId,
                null
            );
        }

        return array_merge($resultadoFila, [
            'ok'                    => true,
            'instance_name'         => $instanceName,
            'intencao_interpretada' => $intencaoInterpretada,
            'notificacao_promocao'  => $notificacaoPromocao,
            'resposta_cancelamento' => $respostaCancelamento
        ]);
    }

    /**
     * Localiza a sessão ativa (com convocação aberta) do racha para recebimento de respostas via WhatsApp.
     */
    private function resolveActiveConvocationSessionForRacha(int $rachaId, mixed $explicitSessaoId = null): int
    {
        if ($explicitSessaoId !== null && trim((string)$explicitSessaoId) !== '') {
            $sid = (int)$explicitSessaoId;
            $stmt = $this->pdo->prepare("
                SELECT id, status, apuracao_presenca
                FROM racha_sessoes
                WHERE id = :sessao_id AND racha_id = :racha_id
            ");
            $stmt->execute([':sessao_id' => $sid, ':racha_id' => $rachaId]);
            $sess = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$sess) {
                throw new HttpError("Sessão #{$sid} não encontrada para o racha #{$rachaId}.", 404);
            }
            if (in_array($sess['status'], ['cancelada', 'concluida'], true) || $sess['apuracao_presenca'] === 'homologada') {
                throw new HttpError("A sessão #{$sid} do racha #{$rachaId} não está aberta para respostas de convocação.", 409);
            }
            return $sid;
        }

        // Busca a sessão aberta (e ainda não homologada) do racha que possui convocação preparada
        $stmt = $this->pdo->prepare("
            SELECT DISTINCT rs.id, rs.data_racha
            FROM racha_sessoes rs
            JOIN racha_sessao_convocacoes rsc ON rsc.sessao_id = rs.id AND rsc.racha_id = rs.racha_id
            WHERE rs.racha_id = :racha_id
              AND rs.status IN ('agendada', 'aberta', 'em_andamento')
              AND rs.apuracao_presenca != 'homologada'
            ORDER BY rs.data_racha ASC, rs.id DESC
        ");
        $stmt->execute([':racha_id' => $rachaId]);
        $sessions = $stmt->fetchAll(PDO::FETCH_ASSOC);

        if (empty($sessions)) {
            throw new HttpError("Nenhuma sessão com convocação aberta encontrada para o racha #{$rachaId}.", 404);
        }

        if (count($sessions) > 1) {
            throw new HttpError(
                "Ambiguidade de sessão: existem múltiplas sessões com convocação aberta simultaneamente no racha #{$rachaId}.",
                409
            );
        }

        return (int)$sessions[0]['id'];
    }

    /**
     * Extrai o texto de diferentes formatos de mensagem da Evolution API (conversation, extendedTextMessage, buttons, list).
     */
    private function extractTextFromEvolutionMessage(array $msg): string
    {
        $m = $msg['message'] ?? [];
        if (!is_array($m)) {
            return '';
        }

        $texto = $m['conversation']
            ?? $m['extendedTextMessage']['text']
            ?? $m['imageMessage']['caption']
            ?? $m['buttonsResponseMessage']['selectedDisplayText']
            ?? $m['listResponseMessage']['title']
            ?? '';

        if ((!is_string($texto) || trim($texto) === '') && !empty($m)) {
            foreach ($m as $content) {
                if (is_string($content) && trim($content) !== '') {
                    $texto = $content;
                    break;
                }
                if (is_array($content) && isset($content['text']) && is_string($content['text'])) {
                    $texto = $content['text'];
                    break;
                }
            }
        }

        return is_string($texto) ? trim($texto) : '';
    }

    /**
     * Reenvia notificações de promoção na fila de espera para participantes com pendência confirmada.
     * Não reenvia mensagens em estado 'desconhecido_timeout' sem antes sinalizar ao organizador.
     */
    public function resendPendingPromotionNotifications(int $rachaId, int $sessaoId, ?int $usuarioId = null): array
    {
        $this->assertActiveRacha($rachaId);
        if ($usuarioId !== null) {
            $this->validateOrganizerUserForRacha($rachaId, $usuarioId, 'reenvio de notificações de promoção');
        }

        $stmt = $this->pdo->prepare("
            SELECT rsc.jogador_id, rsc.telefone_destino, j.nome, rsc.notificacao_promocao_pendente
            FROM racha_sessao_convocacoes rsc
            JOIN jogadores j ON j.id = rsc.jogador_id
            WHERE rsc.racha_id = :racha_id
              AND rsc.sessao_id = :sessao_id
              AND rsc.situacao_vaga = 'promovido_titular'
              AND rsc.notificacao_promocao_pendente = 1
        ");
        $stmt->execute([':racha_id' => $rachaId, ':sessao_id' => $sessaoId]);
        $pendentes = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $enviados = 0;
        $falhas = 0;
        $desconhecidos = 0;
        $detalhes = [];

        foreach ($pendentes as $p) {
            $jogId = (int)$p['jogador_id'];
            $tel = (string)$p['telefone_destino'];

            // Se o último envio terminou em 'desconhecido_timeout', não reenvia cegamente
            $stmtMsg = $this->pdo->prepare("
                SELECT status_envio
                FROM racha_whatsapp_mensagens
                WHERE racha_id = :racha_id AND sessao_id = :sessao_id AND jogador_id = :jog_id AND tipo_mensagem = 'promocao_fila'
                ORDER BY id DESC LIMIT 1
            ");
            $stmtMsg->execute([':racha_id' => $rachaId, ':sessao_id' => $sessaoId, ':jog_id' => $jogId]);
            $lastMsg = $stmtMsg->fetch(PDO::FETCH_ASSOC);

            if ($lastMsg && $lastMsg['status_envio'] === 'desconhecido_timeout') {
                $desconhecidos++;
                $detalhes[] = [
                    'jogador_id'   => $jogId,
                    'nome'         => $p['nome'],
                    'status_envio' => 'desconhecido_timeout',
                    'mensagem'     => 'Envio anterior com timeout na Evolution API. Verifique a entrega antes de reenviar.'
                ];
                continue;
            }

            $texto = "Boa notícia, {$p['nome']}! Uma vaga abriu no racha e você foi promovido da fila de espera para a lista principal!\n\n"
                . "Caso não possa comparecer, responda *CANCELAR* (ou *RACHA NÃO*) para liberarmos a vaga ao próximo da fila.";

            $chave = "promocao:sessao:{$sessaoId}:jogador:{$jogId}:reenvio:" . time();
            $res = $this->sendTextMessage(
                $rachaId,
                $tel,
                $texto,
                'promocao_fila',
                $chave,
                $sessaoId,
                $jogId,
                $usuarioId
            );

            if ($res['enviado']) {
                $enviados++;
                $up = $this->pdo->prepare("UPDATE racha_sessao_convocacoes SET notificacao_promocao_pendente = 0 WHERE racha_id = ? AND sessao_id = ? AND jogador_id = ?");
                $up->execute([$rachaId, $sessaoId, $jogId]);
            } else {
                $falhas++;
            }
            $detalhes[] = $res;
        }

        return [
            'racha_id'      => $rachaId,
            'sessao_id'     => $sessaoId,
            'total'         => count($pendentes),
            'enviados'      => $enviados,
            'falhas'        => $falhas,
            'desconhecidos' => $desconhecidos,
            'detalhes'      => $detalhes
        ];
    }

    /**
     * Extrai valor de header HTTP de forma insensível a maiúsculas/minúsculas.
     */
    private function extractHeaderValue(array $headers, string $targetName): ?string
    {
        foreach ($headers as $k => $v) {
            if (strcasecmp((string)$k, $targetName) === 0) {
                return is_array($v) ? (string)reset($v) : (string)$v;
            }
        }

        $serverKey = 'HTTP_' . strtoupper(str_replace('-', '_', $targetName));
        if (isset($headers[$serverKey])) {
            return (string)$headers[$serverKey];
        }

        return RachaScopeMiddleware::getHeader($targetName);
    }
}
