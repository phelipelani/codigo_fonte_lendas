<?php
/**
 * SUÍTE DE TESTES AUTOMATIZADOS — ETAPA 3C.2
 * Integração Multi-Racha com Evolution API, Conexão por QR Code e Webhook Autenticado
 * Arquivo: apihostinguer/scripts/test_whatsapp_evolution.php
 *
 * Executa exclusivamente no banco local `db_futlendas_sandbox` (127.0.0.1:3307) utilizando
 * transporte HTTP simulado (mock HTTP) — NUNCA realiza chamadas reais para a Evolution API
 * nem envia mensagens reais para jogadores.
 */

putenv('ENVIRONMENT=sandbox');
$_ENV['ENVIRONMENT'] = 'sandbox';

require_once __DIR__ . '/../config/database_sandbox.php';
require_once __DIR__ . '/../src/services/PresenceEngine.php';
require_once __DIR__ . '/../src/services/RachaQueueService.php';
require_once __DIR__ . '/../src/services/WhatsAppEvolutionService.php';
require_once __DIR__ . '/../presenca/api/webhook_multiracha.php';

/**
 * Transporte HTTP simulado (Mock da Evolution API v1/v2) para inspeção das requisições
 * e simulação controlada de estados de instância, QR Code, webhooks, envios, erros e timeouts.
 */
class MockEvolutionHttpTransport
{
    public array $requests = [];
    public array $instances = [];
    public array $webhooks = [];
    public array $queuedOverrides = [];
    public array $capturedWebhookTokensByInstance = [];
    private int $msgCounter = 1000;

    public function queueNextResponse(string $endpointSubstring, array $response): void
    {
        $this->queuedOverrides[] = [
            'match'    => $endpointSubstring,
            'response' => $response
        ];
    }

    public function __invoke(string $method, string $endpoint, ?array $body, array $headers, int $timeout): array
    {
        $this->requests[] = [
            'method'   => $method,
            'endpoint' => $endpoint,
            'body'     => $body,
            'headers'  => $headers,
            'timeout'  => $timeout
        ];

        // Verifica se há uma resposta forçada na fila (ex: simular timeout, HTTP 500, JSON inválido)
        foreach ($this->queuedOverrides as $idx => $override) {
            if (strpos($endpoint, $override['match']) !== false) {
                unset($this->queuedOverrides[$idx]);
                $this->queuedOverrides = array_values($this->queuedOverrides);
                return $override['response'];
            }
        }

        // 1. POST /instance/create
        if ($method === 'POST' && $endpoint === '/instance/create') {
            $instName = (string)($body['instanceName'] ?? '');
            if (isset($this->instances[$instName])) {
                return [
                    'http_code' => 403,
                    'data'      => [
                        'status'   => 403,
                        'error'    => 'Forbidden',
                        'response' => ['message' => ["This name \"{$instName}\" is already in use."]]
                    ]
                ];
            }

            $this->instances[$instName] = [
                'state' => 'connecting',
                'owner' => null
            ];

            return [
                'http_code' => 201,
                'data'      => [
                    'instance' => [
                        'instanceName' => $instName,
                        'status'       => 'created',
                        'state'        => 'connecting'
                    ],
                    'qrcode' => [
                        'code'        => '2@MOCK_QR_INITIAL_' . $instName,
                        'base64'      => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
                        'pairingCode' => 'FUTL-1234',
                        'count'       => 1
                    ]
                ]
            ];
        }

        // 2. GET /instance/connectionState/{instance}
        if ($method === 'GET' && preg_match('#^/instance/connectionState/([^/]+)$#', $endpoint, $m)) {
            $instName = rawurldecode($m[1]);
            if (!isset($this->instances[$instName])) {
                return [
                    'http_code' => 404,
                    'data'      => ['status' => 404, 'message' => "Instance {$instName} not found"]
                ];
            }

            return [
                'http_code' => 200,
                'data'      => [
                    'instance' => [
                        'instanceName' => $instName,
                        'state'        => $this->instances[$instName]['state'],
                        'owner'        => $this->instances[$instName]['owner']
                    ]
                ]
            ];
        }

        // 3. GET /instance/connect/{instance}
        if ($method === 'GET' && preg_match('#^/instance/connect/([^/]+)$#', $endpoint, $m)) {
            $instName = rawurldecode($m[1]);
            if (!isset($this->instances[$instName])) {
                return [
                    'http_code' => 404,
                    'data'      => ['status' => 404, 'message' => "Instance {$instName} not found"]
                ];
            }

            if ($this->instances[$instName]['state'] === 'open') {
                return [
                    'http_code' => 200,
                    'data'      => [
                        'instance' => [
                            'instanceName' => $instName,
                            'state'        => 'open',
                            'owner'        => $this->instances[$instName]['owner']
                        ]
                    ]
                ];
            }

            $this->instances[$instName]['state'] = 'connecting';
            return [
                'http_code' => 200,
                'data'      => [
                    'pairingCode' => 'PAIR-' . strtoupper(substr(md5($instName), 0, 4)),
                    'code'        => '2@MOCK_QR_RECONNECT_' . $instName,
                    'base64'      => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
                    'count'       => 2
                ]
            ];
        }

        // 4. POST /webhook/set/{instance}
        if ($method === 'POST' && preg_match('#^/webhook/set/([^/]+)$#', $endpoint, $m)) {
            $instName = rawurldecode($m[1]);
            $url = (string)($body['url'] ?? $body['webhook']['url'] ?? '');
            $this->webhooks[$instName] = $body;

            // Captura o token configurado pelo serviço na URL ou no header para usarmos nos testes de webhook
            $token = $body['headers']['X-Webhook-Token'] ?? null;
            if (!$token && preg_match('/[?&]token=([^&]+)/', $url, $tm)) {
                $token = rawurldecode($tm[1]);
            }
            if (is_string($token) && $token !== '') {
                $this->capturedWebhookTokensByInstance[$instName] = $token;
            }

            return [
                'http_code' => 200,
                'data'      => [
                    'webhook' => [
                        'instanceName' => $instName,
                        'webhook'      => [
                            'url'     => $url,
                            'events'  => $body['events'] ?? [],
                            'enabled' => true
                        ]
                    ]
                ]
            ];
        }

        // 5. DELETE /instance/logout/{instance}
        if ($method === 'DELETE' && preg_match('#^/instance/logout/([^/]+)$#', $endpoint, $m)) {
            $instName = rawurldecode($m[1]);
            if (isset($this->instances[$instName])) {
                $this->instances[$instName]['state'] = 'close';
                $this->instances[$instName]['owner'] = null;
            }
            return [
                'http_code' => 200,
                'data'      => ['status' => 'SUCCESS', 'error' => false, 'response' => ['message' => 'Instance logged out']]
            ];
        }

        // 6. POST /message/sendText/{instance}
        if ($method === 'POST' && preg_match('#^/message/sendText/([^/]+)$#', $endpoint, $m)) {
            $instName = rawurldecode($m[1]);
            $this->msgCounter++;
            $msgId = 'BAE5_MOCK_' . $instName . '_' . $this->msgCounter;

            return [
                'http_code' => 201,
                'data'      => [
                    'key' => [
                        'remoteJid' => ($body['number'] ?? '') . '@s.whatsapp.net',
                        'fromMe'    => true,
                        'id'        => $msgId
                    ],
                    'message' => [
                        'extendedTextMessage' => ['text' => $body['text'] ?? '']
                    ],
                    'status' => 'PENDING'
                ]
            ];
        }

        return [
            'http_code' => 404,
            'data'      => ['message' => "Mock route not found: {$method} {$endpoint}"]
        ];
    }
}

class WhatsAppEvolutionTestSuite
{
    private PDO $pdo;
    private PDO $adminPdo;
    private PresenceEngine $presenceEngine;
    private RachaQueueService $queueService;
    private MockEvolutionHttpTransport $mockTransport;
    private WhatsAppEvolutionService $whatsappService;

    private int $passed = 0;
    private int $failed = 0;

    private int $racha1Id = 1;
    private int $racha2Id = 2;
    private int $orgRacha1Id = 1;
    private int $orgRacha2Id = 2;

    public function __construct()
    {
        SandboxDatabase::resetDisposableSandboxSchema(true);
        $this->pdo = SandboxDatabase::getConnection(true);
        $this->adminPdo = SandboxDatabase::getAdminConnection(true);
        $this->presenceEngine = new PresenceEngine($this->pdo);
        $this->queueService = new RachaQueueService($this->pdo);
        $this->mockTransport = new MockEvolutionHttpTransport();
        $this->whatsappService = new WhatsAppEvolutionService(
            $this->pdo,
            $this->queueService,
            $this->mockTransport,
            [
                'base_url'         => 'https://evolution-mock.futlendas.local',
                'api_key'          => 'SUPER_SECRET_MASTER_EVOLUTION_KEY_999',
                'webhook_base_url' => 'https://api.futlendas.local',
                'timeout_seconds'  => 10
            ]
        );
        $this->seedBaseFixtures();
    }

    private function seedBaseFixtures(): void
    {
        // Racha 1 (capacidade 2 vagas titulares para testar fila de espera e promoção automática via WhatsApp)
        $this->pdo->exec("
            INSERT INTO rachas (id, nome, dia_semana, horario_inicio, local_nome, valor_mensalidade_padrao, valor_avulso_padrao, limite_vagas, ativo)
            VALUES (1, 'Racha Terça Teste WhatsApp', 'terca', '20:00:00', 'Arena Caiçara', 60.00, 15.00, 2, 1),
                   (2, 'Racha Quinta Teste Isolado', 'quinta', '19:30:00', 'Arena Litoral', 70.00, 20.00, 14, 1)
        ");

        $this->pdo->exec("
            INSERT INTO racha_organizadores (racha_id, usuario_id, papel)
            VALUES (1, 1, 'dono'),
                   (2, 2, 'dono')
        ");
    }

    private function assert(string $title, callable $fn): void
    {
        echo "TESTANDO: {$title}... ";
        try {
            $fn();
            echo "APROVADO (PASS)\n";
            $this->passed++;
        } catch (Throwable $e) {
            echo "FALHOU (FAIL): " . $e->getMessage() . "\n";
            $this->failed++;
        }
    }

    public function runAll(): void
    {
        echo "====================================================================\n";
        echo " SUÍTE DE TESTES ETAPA 3C.2 — EVOLUTION API, QR CODE E WEBHOOK\n";
        echo "====================================================================\n\n";

        // =====================================================================
        // TESTE 1: Criação de instância associada ao racha correto (HTTP simulado)
        // =====================================================================
        $this->assert("1. Criação de instância associada ao racha correto utilizando HTTP simulado", function () {
            $res = $this->whatsappService->connectOrGetQrCode($this->racha1Id, $this->orgRacha1Id);

            if ($res['instance_name'] !== 'futlendas_racha_1') {
                throw new Exception("Nome de instância incorreto: " . ($res['instance_name'] ?? 'null'));
            }
            if ($res['status_conexao'] !== WhatsAppEvolutionService::STATUS_AGUARDANDO_QR || !$res['requer_leitura_qr']) {
                throw new Exception("A primeira conexão deveria retornar status 'aguardando_qr' e requer_leitura_qr=true!");
            }
            if (empty($res['qr_code']['qr_code_base64']) || empty($res['qr_code']['qr_code_texto'])) {
                throw new Exception("O QR Code deveria ser retornado na primeira conexão para exibição no site!");
            }
            if (!$res['webhook_configurado']) {
                throw new Exception("O webhook da instância deveria ter sido configurado automaticamente!");
            }

            // Verifica registro em `racha_whatsapp_instancias`
            $stmt = $this->pdo->prepare("SELECT * FROM racha_whatsapp_instancias WHERE racha_id = ?");
            $stmt->execute([$this->racha1Id]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$row || $row['instance_name'] !== 'futlendas_racha_1' || (int)$row['configurado_por_usuario_id'] !== $this->orgRacha1Id) {
                throw new Exception("Registro em racha_whatsapp_instancias inválido!");
            }
        });

        // =====================================================================
        // TESTE 2: Recuperação de instância existente sem duplicação
        // =====================================================================
        $this->assert("2. Recuperação de instância existente sem duplicação no banco ou na API", function () {
            $res = $this->whatsappService->getOrCreateRachaInstance($this->racha1Id, $this->orgRacha1Id);

            if ($res['criada_no_banco'] !== false || $res['criada_na_api'] !== false) {
                throw new Exception("Instância já existente não deveria ser recriada no banco nem na API!");
            }

            $count = (int)$this->pdo->query("SELECT COUNT(*) FROM racha_whatsapp_instancias WHERE racha_id = {$this->racha1Id}")->fetchColumn();
            if ($count !== 1) {
                throw new Exception("Esperado exatamente 1 registro de instância para o Racha 1, encontrado: {$count}");
            }
        });

        // =====================================================================
        // TESTE 3: Pedido e tratamento do QR Code (e não geração de QR quando já conectado)
        // =====================================================================
        $this->assert("3. Pedido de QR Code quando desconectado e bloqueio de novo QR quando já conectado", function () {
            // Enquanto ainda está 'connecting', pedir connectOrGetQrCode retorna o QR Code via /instance/connect
            $resQr = $this->whatsappService->connectOrGetQrCode($this->racha1Id, $this->orgRacha1Id);
            if ($resQr['status_conexao'] !== 'aguardando_qr' || empty($resQr['qr_code']['qr_code_base64'])) {
                throw new Exception("Esperado QR Code disponível enquanto a sessão aguarda leitura!");
            }

            // Simula leitura do QR Code no celular do organizador -> Evolution API passa para state='open'
            $this->mockTransport->instances['futlendas_racha_1'] = [
                'state' => 'open',
                'owner' => '5512991112222@s.whatsapp.net'
            ];

            // Agora, ao clicar novamente em "Conectar WhatsApp", o serviço verifica que já está conectado e NÃO gera novo QR Code!
            $resConnected = $this->whatsappService->connectOrGetQrCode($this->racha1Id, $this->orgRacha1Id);
            if ($resConnected['status_conexao'] !== 'conectado' || $resConnected['requer_leitura_qr'] !== false || $resConnected['qr_code'] !== null) {
                throw new Exception("Quando já conectado, connectOrGetQrCode deve retornar 'conectado' e qr_code=null!");
            }
            if ($resConnected['numero_conectado'] !== '5512991112222') {
                throw new Exception("Número conectado deveria ser '5512991112222', obtido: " . ($resConnected['numero_conectado'] ?? 'null'));
            }
        });

        // =====================================================================
        // TESTE 4: Consulta de estado conectado, desconectado e logout controlado
        // =====================================================================
        $this->assert("4. Consulta de estado conectado, desconectado e reconexão após logout controlado", function () {
            $statusConn = $this->whatsappService->getConnectionStatus($this->racha1Id, true);
            if ($statusConn['status_conexao'] !== 'conectado' || $statusConn['requer_leitura_qr'] !== false) {
                throw new Exception("Estado esperado: conectado!");
            }

            // Organizador solicita desconexão (logout) controlada
            $logoutRes = $this->whatsappService->disconnectInstance($this->racha1Id, $this->orgRacha1Id);
            if ($logoutRes['status_conexao'] !== 'desconectado' || $logoutRes['requer_leitura_qr'] !== true) {
                throw new Exception("Após logout, status deve ser 'desconectado' com requer_leitura_qr=true!");
            }

            // Verifica que o registro da instância e a configuração do webhook foram preservados no banco
            $stmt = $this->pdo->prepare("SELECT status_conexao, webhook_configurado, numero_conectado FROM racha_whatsapp_instancias WHERE racha_id = ?");
            $stmt->execute([$this->racha1Id]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$row || (int)$row['webhook_configurado'] !== 1 || $row['numero_conectado'] !== null) {
                throw new Exception("A configuração da instância deveria ser preservada após logout, limpando apenas numero_conectado!");
            }

            // Reconecta a instância para os próximos testes
            $this->mockTransport->instances['futlendas_racha_1'] = [
                'state' => 'open',
                'owner' => '5512991112222@s.whatsapp.net'
            ];
            $this->whatsappService->getConnectionStatus($this->racha1Id, true);
        });

        // =====================================================================
        // TESTE 5: Falha, timeout e resposta JSON inválida da Evolution API
        // =====================================================================
        $this->assert("5. Tratamento de falha HTTP 500, timeout e JSON inválido da Evolution API sem destruir configuração", function () {
            // 5a. Timeout na consulta de estado
            $this->mockTransport->queueNextResponse('/instance/connectionState/futlendas_racha_1', [
                'is_timeout' => true,
                'http_code'  => 0,
                'error_code' => 'CURL_TIMEOUT',
                'error_msg'  => 'Operation timed out after 10000 milliseconds'
            ]);

            $statusTimeout = $this->whatsappService->getConnectionStatus($this->racha1Id, true);
            if ($statusTimeout['status_conexao'] !== 'erro' || !$statusTimeout['falha_temporaria_comunicacao'] || $statusTimeout['requer_leitura_qr'] !== false) {
                throw new Exception("Falha temporária por timeout deve marcar status 'erro', falha_temporaria_comunicacao=true e requer_leitura_qr=false!");
            }

            // 5b. Resposta JSON inválida (ex: HTML de Bad Gateway do proxy)
            $this->mockTransport->queueNextResponse('/instance/connectionState/futlendas_racha_1', [
                'http_code' => 200,
                'body'      => '<html><body>502 Bad Gateway</body></html>'
            ]);

            $statusBadJson = $this->whatsappService->getConnectionStatus($this->racha1Id, true);
            if ($statusBadJson['status_conexao'] !== 'erro' || $statusBadJson['ultimo_erro_codigo'] !== 'INVALID_JSON_RESPONSE') {
                throw new Exception("JSON inválido deveria registrar erro 'INVALID_JSON_RESPONSE', obtido: " . json_encode($statusBadJson));
            }

            // 5c. Restaura comunicação normal e confirma que a instância volta para 'conectado' intacta
            $statusRecovered = $this->whatsappService->getConnectionStatus($this->racha1Id, true);
            if ($statusRecovered['status_conexao'] !== 'conectado' || $statusRecovered['numero_conectado'] !== '5512991112222') {
                throw new Exception("A instância deveria recuperar o estado 'conectado' assim que a API voltou a responder!");
            }
        });

        // =====================================================================
        // TESTE 6: Configuração do webhook para cada instância (Racha 1 e Racha 2)
        // =====================================================================
        $this->assert("6. Configuração independente do webhook para cada instância (segredo armazenado apenas como hash SHA-256)", function () {
            // Provisiona também a instância do Racha 2 pelo seu organizador (#2)
            $resR2 = $this->whatsappService->connectOrGetQrCode($this->racha2Id, $this->orgRacha2Id);
            if ($resR2['instance_name'] !== 'futlendas_racha_2' || !$resR2['webhook_configurado']) {
                throw new Exception("Instância e webhook do Racha 2 deveriam ter sido configurados!");
            }

            $tokenR1 = $this->mockTransport->capturedWebhookTokensByInstance['futlendas_racha_1'] ?? '';
            $tokenR2 = $this->mockTransport->capturedWebhookTokensByInstance['futlendas_racha_2'] ?? '';

            if ($tokenR1 === '' || $tokenR2 === '' || $tokenR1 === $tokenR2) {
                throw new Exception("Cada instância deve possuir um token criptográfico de webhook único e distinto!");
            }

            // Verifica no banco que NENHUM token em texto aberto foi salvo (apenas o hash SHA-256 de 64 hex chars)
            $rows = $this->pdo->query("SELECT racha_id, webhook_secret_hash FROM racha_whatsapp_instancias ORDER BY racha_id ASC")->fetchAll(PDO::FETCH_ASSOC);
            if (count($rows) !== 2) {
                throw new Exception("Esperadas 2 instâncias registradas no banco!");
            }
            if ($rows[0]['webhook_secret_hash'] === $tokenR1 || $rows[0]['webhook_secret_hash'] !== hash('sha256', $tokenR1)) {
                throw new Exception("O banco deveria armazenar exatamente o hash SHA-256 do token do Racha 1, nunca o token em texto aberto!");
            }
            if ($rows[1]['webhook_secret_hash'] === $tokenR2 || $rows[1]['webhook_secret_hash'] !== hash('sha256', $tokenR2)) {
                throw new Exception("O banco deveria armazenar exatamente o hash SHA-256 do token do Racha 2!");
            }
        });

        // =====================================================================
        // TESTE 7: Rejeição de webhook sem credencial válida
        // =====================================================================
        $this->assert("7. Rejeição de webhook sem credencial, com token inválido ou usando token de outro racha (HTTP 401)", function () {
            $payload = [
                'event'    => 'messages.upsert',
                'instance' => 'futlendas_racha_1',
                'data'     => [
                    'key'     => ['remoteJid' => '5512988001111@s.whatsapp.net', 'fromMe' => false, 'id' => 'MSG_UNAUTH_1'],
                    'message' => ['conversation' => 'SIM']
                ]
            ];

            // 7a. Sem token
            $respNoToken = processMultiRachaWebhookHttpRequest(json_encode($payload), [], [], $this->whatsappService);
            if ($respNoToken['http_code'] !== 401) {
                throw new Exception("Webhook sem token deveria retornar HTTP 401, obtido: {$respNoToken['http_code']}");
            }

            // 7b. Com token falso
            $respWrongToken = processMultiRachaWebhookHttpRequest(
                json_encode($payload),
                ['X-Webhook-Token' => 'token_falso_invalido_123'],
                [],
                $this->whatsappService
            );
            if ($respWrongToken['http_code'] !== 401) {
                throw new Exception("Webhook com token inválido deveria retornar HTTP 401!");
            }

            // 7c. Usando o token válido do Racha 2 para tentar enviar evento na instância do Racha 1
            $tokenR2 = $this->mockTransport->capturedWebhookTokensByInstance['futlendas_racha_2'];
            $respCrossToken = processMultiRachaWebhookHttpRequest(
                json_encode($payload),
                ['X-Webhook-Token' => $tokenR2],
                [],
                $this->whatsappService
            );
            if ($respCrossToken['http_code'] !== 401) {
                throw new Exception("Webhook com token de outro racha deveria ser rejeitado com HTTP 401!");
            }
        });

        // =====================================================================
        // TESTE 8: Rejeição de instância inexistente ou vinculada a outro racha
        // =====================================================================
        $this->assert("8. Rejeição de instância inexistente ou divergente do racha_id informado (HTTP 403)", function () {
            $tokenR1 = $this->mockTransport->capturedWebhookTokensByInstance['futlendas_racha_1'];

            // 8a. Instância inexistente (ex: instância legada global ou inventada)
            $payloadUnknownInst = [
                'event'    => 'messages.upsert',
                'instance' => 'instancia_inexistente_999',
                'data'     => [
                    'key'     => ['remoteJid' => '5512988001111@s.whatsapp.net', 'fromMe' => false, 'id' => 'MSG_INST_1'],
                    'message' => ['conversation' => 'SIM']
                ]
            ];
            $resp1 = processMultiRachaWebhookHttpRequest(
                json_encode($payloadUnknownInst),
                ['X-Webhook-Token' => $tokenR1],
                [],
                $this->whatsappService
            );
            if ($resp1['http_code'] !== 403) {
                throw new Exception("Instância não cadastrada deveria retornar HTTP 403, obtido: {$resp1['http_code']}");
            }

            // 8b. Instância do Racha 1 passando racha_id=2 na query/header
            $payloadR1 = [
                'event'    => 'messages.upsert',
                'instance' => 'futlendas_racha_1',
                'data'     => [
                    'key'     => ['remoteJid' => '5512988001111@s.whatsapp.net', 'fromMe' => false, 'id' => 'MSG_INST_2'],
                    'message' => ['conversation' => 'SIM']
                ]
            ];
            $resp2 = processMultiRachaWebhookHttpRequest(
                json_encode($payloadR1),
                ['X-Webhook-Token' => $tokenR1],
                ['racha_id' => 2],
                $this->whatsappService
            );
            if ($resp2['http_code'] !== 403) {
                throw new Exception("Divergência entre instance e racha_id deveria retornar HTTP 403, obtido: {$resp2['http_code']}");
            }
        });

        // =====================================================================
        // TESTE 9: Rejeição/ignorar mensagem de grupo (@g.us) e mensagem enviada pela própria conta (fromMe)
        // =====================================================================
        $this->assert("9. Ignorar mensagens de grupo (@g.us) e mensagens enviadas pela própria conta (fromMe)", function () {
            $tokenR1 = $this->mockTransport->capturedWebhookTokensByInstance['futlendas_racha_1'];

            // 9a. Mensagem fromMe = true
            $payloadFromMe = [
                'event'    => 'messages.upsert',
                'instance' => 'futlendas_racha_1',
                'data'     => [
                    'key'     => ['remoteJid' => '5512988001111@s.whatsapp.net', 'fromMe' => true, 'id' => 'MSG_FROM_ME_1'],
                    'message' => ['conversation' => 'SIM']
                ]
            ];
            $respMe = processMultiRachaWebhookHttpRequest(
                json_encode($payloadFromMe),
                ['X-Webhook-Token' => $tokenR1],
                [],
                $this->whatsappService
            );
            if ($respMe['http_code'] !== 200 || empty($respMe['body']['ignorado']) || $respMe['body']['motivo'] !== 'fromMe_ignorado') {
                throw new Exception("Mensagem fromMe deveria ser ignorada com segurança!");
            }

            // 9b. Mensagem de grupo (@g.us)
            $payloadGroup = [
                'event'    => 'messages.upsert',
                'instance' => 'futlendas_racha_1',
                'data'     => [
                    'key'     => ['remoteJid' => '1203630444555666@g.us', 'fromMe' => false, 'id' => 'MSG_GROUP_1'],
                    'message' => ['conversation' => 'SIM']
                ]
            ];
            $respGrp = processMultiRachaWebhookHttpRequest(
                json_encode($payloadGroup),
                ['X-Webhook-Token' => $tokenR1],
                [],
                $this->whatsappService
            );
            if ($respGrp['http_code'] !== 200 || empty($respGrp['body']['ignorado']) || $respGrp['body']['motivo'] !== 'grupo_ou_broadcast_ignorado') {
                throw new Exception("Mensagem de grupo (@g.us) deveria ser ignorada com segurança!");
            }
        });

        // =====================================================================
        // PREPARAÇÃO DO CENÁRIO DE SESSÃO E PARTICIPANTES PARA OS TESTES 10 A 15
        // =====================================================================
        $sessaoR1Id = 0;
        $mens1Id = 0;
        $mens2Id = 0;
        $avulso1Id = 0;
        $avulso2Id = 0;

        // =====================================================================
        // TESTE 10: Identificação de participante e sessão correta (e rejeição de remetente desconhecido/ambíguo)
        // =====================================================================
        $this->assert("10. Identificação de participante e sessão correta pelo telefone (e rejeição de remetente não convocado)", function () use (
            &$sessaoR1Id, &$mens1Id, &$mens2Id, &$avulso1Id, &$avulso2Id
        ) {
            $sess = $this->presenceEngine->createSession($this->racha1Id, '2026-12-01', '20:00', '22:00', $this->orgRacha1Id);
            $sessaoR1Id = (int)$sess['id'];

            $m1 = $this->queueService->registerOrReuseParticipant($this->racha1Id, 'Carlos Mensalista WA 1', '(12) 98822-0001', 'mensalista', $this->orgRacha1Id);
            $m2 = $this->queueService->registerOrReuseParticipant($this->racha1Id, 'Daniel Mensalista WA 2', '(12) 98822-0002', 'mensalista', $this->orgRacha1Id);
            $a1 = $this->queueService->registerOrReuseParticipant($this->racha1Id, 'Eduardo Avulso WA 1', '(12) 98822-0003', 'avulso_recorrente', $this->orgRacha1Id);
            $a2 = $this->queueService->registerOrReuseParticipant($this->racha1Id, 'Fabio Avulso WA 2', '(12) 98822-0004', 'avulso_convidado', $this->orgRacha1Id);

            $mens1Id = (int)$m1['jogador_id'];
            $mens2Id = (int)$m2['jogador_id'];
            $avulso1Id = (int)$a1['jogador_id'];
            $avulso2Id = (int)$a2['jogador_id'];

            $this->queueService->prepareSessionConvocation(
                $this->racha1Id,
                $sessaoR1Id,
                [$mens1Id, $mens2Id, $avulso1Id, $avulso2Id],
                $this->orgRacha1Id
            );

            // Dispara as mensagens de convocação da sessão pelo WhatsAppEvolutionService
            $disp = $this->whatsappService->dispatchSessionConvocationMessages($this->racha1Id, $sessaoR1Id, $this->orgRacha1Id);
            if ($disp['enviados'] !== 4 || $disp['falhas'] !== 0) {
                throw new Exception("Esperado envio das 4 convocações com sucesso, obtido: " . json_encode($disp));
            }

            // Remetente desconhecido (não convocado) tenta responder no webhook -> rejeitado com HTTP 404
            $tokenR1 = $this->mockTransport->capturedWebhookTokensByInstance['futlendas_racha_1'];
            $payloadUnknownSender = [
                'event'    => 'messages.upsert',
                'instance' => 'futlendas_racha_1',
                'data'     => [
                    'key'      => ['remoteJid' => '5512999990000@s.whatsapp.net', 'fromMe' => false, 'id' => 'WAMID_UNKNOWN_SENDER'],
                    'pushName' => 'Carlos Mensalista WA 1', // Mesmo fingindo o pushName de um mensalista real, deve ser rejeitado!
                    'message'  => ['conversation' => 'SIM']
                ]
            ];
            $respUnk = processMultiRachaWebhookHttpRequest(
                json_encode($payloadUnknownSender),
                ['X-Webhook-Token' => $tokenR1],
                [],
                $this->whatsappService
            );
            if ($respUnk['http_code'] !== 404) {
                throw new Exception("Remetente desconhecido deveria ser rejeitado com HTTP 404 mesmo com pushName igual ao de um convocado!");
            }
        });

        // =====================================================================
        // TESTE 11: Recebimento de SIM, NÃO, DEPOIS e mensagens inválidas via Webhook
        // =====================================================================
        $this->assert("11. Recebimento de SIM, DEPOIS e mensagens inválidas (com envio de instrução sem alterar fila)", function () use (
            &$sessaoR1Id, &$mens1Id, &$mens2Id, &$avulso1Id, &$avulso2Id
        ) {
            $tokenR1 = $this->mockTransport->capturedWebhookTokensByInstance['futlendas_racha_1'];

            // 11a. Mensalista 2 envia texto inválido ("Que horas vai ser mesmo?") -> não altera fila e envia instrução
            $payloadInvalid = [
                'event'    => 'messages.upsert',
                'instance' => 'futlendas_racha_1',
                'data'     => [
                    'key'     => ['remoteJid' => '5512988220002@s.whatsapp.net', 'fromMe' => false, 'id' => 'WAMID_M2_INVALIDO_1'],
                    'message' => ['conversation' => 'Que horas vai ser mesmo?']
                ]
            ];
            $respInv = processMultiRachaWebhookHttpRequest(
                json_encode($payloadInvalid),
                ['X-Webhook-Token' => $tokenR1],
                [],
                $this->whatsappService
            );
            if ($respInv['http_code'] !== 200 || ($respInv['body']['intencao_processada'] ?? '') !== 'INVALIDO' || ($respInv['body']['fila_alterada'] ?? null) !== false) {
                throw new Exception("Mensagem inválida deveria retornar intencao_processada='INVALIDO' e fila_alterada=false! Obtido: " . json_encode($respInv));
            }
            if (empty($respInv['body']['instrucao_enviada']['enviado'])) {
                throw new Exception("Mensagem inválida deveria disparar instrução clara ao participante!");
            }

            // 11b. Mensalista 2 responde "Vou ver, confirmo mais tarde" (DEPOIS)
            $payloadDepois = [
                'event'    => 'messages.upsert',
                'instance' => 'futlendas_racha_1',
                'data'     => [
                    'key'     => ['remoteJid' => '551288220002@s.whatsapp.net', 'fromMe' => false, 'id' => 'WAMID_M2_DEPOIS_1'], // JID de 12 dígitos (sem 9º dígito)
                    'message' => ['conversation' => 'Vou ver, confirmo mais tarde']
                ]
            ];
            $respDep = processMultiRachaWebhookHttpRequest(
                json_encode($payloadDepois),
                ['X-Webhook-Token' => $tokenR1],
                [],
                $this->whatsappService
            );
            if ($respDep['http_code'] !== 200 || $respDep['body']['intencao_atual'] !== 'depois' || $respDep['body']['situacao_vaga'] !== 'aguardando_confirmacao_tardia') {
                throw new Exception("Resposta DEPOIS deveria manter participante em 'aguardando_confirmacao_tardia'!");
            }

            // 11c. Mensalista 1 responde "Tô dentro!" (SIM) -> reserva sua vaga prioritária
            $payloadM1Sim = [
                'event'    => 'messages.upsert',
                'instance' => 'futlendas_racha_1',
                'data'     => [
                    'key'     => ['remoteJid' => '5512988220001@s.whatsapp.net', 'fromMe' => false, 'id' => 'WAMID_M1_SIM_1'],
                    'message' => ['conversation' => 'Tô dentro!']
                ]
            ];
            $respM1 = processMultiRachaWebhookHttpRequest(
                json_encode($payloadM1Sim),
                ['X-Webhook-Token' => $tokenR1],
                [],
                $this->whatsappService
            );
            if ($respM1['http_code'] !== 200 || $respM1['body']['situacao_vaga'] !== 'vaga_reservada') {
                throw new Exception("Mensalista 1 com SIM deveria ficar com 'vaga_reservada'!");
            }

            // 11d. Avulso 1 e Avulso 2 respondem SIM -> entram na fila de espera nas posições 1 e 2
            $payloadA1Sim = [
                'event'    => 'messages.upsert',
                'instance' => 'futlendas_racha_1',
                'data'     => [
                    'key'     => ['remoteJid' => '5512988220003@s.whatsapp.net', 'fromMe' => false, 'id' => 'WAMID_A1_SIM_1'],
                    'message' => ['extendedTextMessage' => ['text' => 'SIM']]
                ]
            ];
            $respA1 = processMultiRachaWebhookHttpRequest(
                json_encode($payloadA1Sim),
                ['X-Webhook-Token' => $tokenR1],
                [],
                $this->whatsappService
            );
            if ($respA1['http_code'] !== 200 || $respA1['body']['situacao_vaga'] !== 'fila_espera' || $respA1['body']['ordem_fila'] !== 1) {
                throw new Exception("Avulso 1 deveria entrar em 'fila_espera' na posição 1!");
            }

            $payloadA2Sim = [
                'event'    => 'messages.upsert',
                'instance' => 'futlendas_racha_1',
                'data'     => [
                    'key'     => ['remoteJid' => '5512988220004@s.whatsapp.net', 'fromMe' => false, 'id' => 'WAMID_A2_SIM_1'],
                    'message' => ['conversation' => 'Bora, conta comigo']
                ]
            ];
            $respA2 = processMultiRachaWebhookHttpRequest(
                json_encode($payloadA2Sim),
                ['X-Webhook-Token' => $tokenR1],
                [],
                $this->whatsappService
            );
            if ($respA2['http_code'] !== 200 || $respA2['body']['situacao_vaga'] !== 'fila_espera' || $respA2['body']['ordem_fila'] !== 2) {
                throw new Exception("Avulso 2 deveria entrar em 'fila_espera' na posição 2!");
            }
        });

        // =====================================================================
        // TESTE 12: Idempotência de mensagem recebida duas vezes no webhook
        // =====================================================================
        $this->assert("12. Idempotência de mensagem recebida duas vezes no webhook (mesmo key.id não duplica eventos nem altera fila)", function () use (
            &$sessaoR1Id
        ) {
            $tokenR1 = $this->mockTransport->capturedWebhookTokensByInstance['futlendas_racha_1'];
            $evCountBefore = count($this->presenceEngine->getSessionEvents($this->racha1Id, $sessaoR1Id));

            // Reenvia exatamente o mesmo payload WAMID_A1_SIM_1
            $payloadDup = [
                'event'    => 'messages.upsert',
                'instance' => 'futlendas_racha_1',
                'data'     => [
                    'key'     => ['remoteJid' => '5512988220003@s.whatsapp.net', 'fromMe' => false, 'id' => 'WAMID_A1_SIM_1'],
                    'message' => ['extendedTextMessage' => ['text' => 'SIM']]
                ]
            ];
            $respDup = processMultiRachaWebhookHttpRequest(
                json_encode($payloadDup),
                ['X-Webhook-Token' => $tokenR1],
                [],
                $this->whatsappService
            );

            if ($respDup['http_code'] !== 200 || empty($respDup['body']['idempotente'])) {
                throw new Exception("Mensagem repetida no webhook deveria retornar idempotente=true!");
            }

            $evCountAfter = count($this->presenceEngine->getSessionEvents($this->racha1Id, $sessaoR1Id));
            if ($evCountAfter !== $evCountBefore) {
                throw new Exception("Mensagem repetida no webhook duplicou eventos em racha_sessao_eventos ({$evCountBefore} -> {$evCountAfter})!");
            }
        });

        // =====================================================================
        // TESTE 13: Preservação das regras da fila e promoção automática de avulso via Webhook
        // =====================================================================
        $this->assert("13. Desistência de mensalista via Webhook libera vaga, promove o 1º avulso elegível da fila e envia notificação de promoção", function () use (
            &$sessaoR1Id, &$mens1Id, &$avulso1Id, &$avulso2Id
        ) {
            $tokenR1 = $this->mockTransport->capturedWebhookTokensByInstance['futlendas_racha_1'];

            // Mensalista 1 envia "Infelizmente não vou conseguir ir" (NAO) via WhatsApp
            $payloadM1Nao = [
                'event'    => 'messages.upsert',
                'instance' => 'futlendas_racha_1',
                'data'     => [
                    'key'     => ['remoteJid' => '5512988220001@s.whatsapp.net', 'fromMe' => false, 'id' => 'WAMID_M1_NAO_PROM_1'],
                    'message' => ['conversation' => 'Infelizmente não vou conseguir ir']
                ]
            ];
            $respNao = processMultiRachaWebhookHttpRequest(
                json_encode($payloadM1Nao),
                ['X-Webhook-Token' => $tokenR1],
                [],
                $this->whatsappService
            );

            if ($respNao['http_code'] !== 200 || !$respNao['body']['vaga_liberada']) {
                throw new Exception("Resposta NÃO do Mensalista 1 deveria liberar a vaga!");
            }

            $prom = $respNao['body']['promocao_automatica'] ?? null;
            if (!$prom || (int)$prom['jogador_id'] !== $avulso1Id || $prom['situacao_vaga'] !== 'promovido_titular') {
                throw new Exception("O Avulso 1 (#{$avulso1Id}, ordem 1) deveria ter sido promovido automaticamente!");
            }
            if ($prom['tipo_ator_evento'] !== 'sistema' || $prom['usuario_id_evento'] !== null) {
                throw new Exception("O evento de promoção automática deveria ter tipo_ator='sistema' e usuario_id=NULL!");
            }
            if (empty($respNao['body']['notificacao_promocao']['enviado'])) {
                throw new Exception("A notificação de promoção na fila deveria ter sido enviada ao Avulso 1!");
            }

            // Verifica que o Avulso 2 permanece aguardando na fila de espera (ordem 2)
            $filaStatus = $this->queueService->getSessionQueueAndConvocationStatus($this->racha1Id, $sessaoR1Id);
            if (count($filaStatus['fila_espera']) !== 1 || (int)$filaStatus['fila_espera'][0]['jogador_id'] !== $avulso2Id) {
                throw new Exception("O Avulso 2 deveria permanecer aguardando na fila de espera!");
            }
        });

        // =====================================================================
        // TESTE 14: Nenhuma confirmação de WhatsApp gerando presença real automaticamente
        // =====================================================================
        $this->assert("14. Nenhuma confirmação ou promoção via WhatsApp gera presença real em racha_sessao_presencas", function () use (
            &$sessaoR1Id
        ) {
            $stmtPres = $this->pdo->prepare("SELECT COUNT(*) FROM racha_sessao_presencas WHERE racha_id = ? AND sessao_id = ?");
            $stmtPres->execute([$this->racha1Id, $sessaoR1Id]);
            $countPresencas = (int)$stmtPres->fetchColumn();

            if ($countPresencas !== 0) {
                throw new Exception("VIOLAÇÃO DE REGRA DE NEGÓCIO: Foram gravados {$countPresencas} registros em racha_sessao_presencas a partir de respostas do WhatsApp!");
            }
        });

        // =====================================================================
        // TESTE 15: Isolamento completo entre dois rachas
        // =====================================================================
        $this->assert("15. Isolamento completo entre dois rachas (instâncias, webhooks, sessões e participantes)", function () use (
            &$sessaoR1Id, &$avulso2Id
        ) {
            // Cria sessão e participante no Racha 2
            $sessR2 = $this->presenceEngine->createSession($this->racha2Id, '2026-12-03', '19:30', '21:30', $this->orgRacha2Id);
            $sessaoR2Id = (int)$sessR2['id'];

            $pR2 = $this->queueService->registerOrReuseParticipant($this->racha2Id, 'Gustavo Mensalista R2', '(12) 98833-0001', 'mensalista', $this->orgRacha2Id);
            $jogR2Id = (int)$pR2['jogador_id'];
            $this->queueService->prepareSessionConvocation($this->racha2Id, $sessaoR2Id, [$jogR2Id], $this->orgRacha2Id);

            // 15a. Organizador do Racha 1 tenta desconectar ou enviar mensagem pelo Racha 2 -> bloqueado (HTTP 403)
            $blockedCrossOrg = false;
            try {
                $this->whatsappService->disconnectInstance($this->racha2Id, $this->orgRacha1Id);
            } catch (HttpError $e) {
                if ($e->getStatusCode() === 403) {
                    $blockedCrossOrg = true;
                }
            }
            if (!$blockedCrossOrg) {
                throw new Exception("Organizador do Racha 1 não pode operar a instância WhatsApp do Racha 2!");
            }

            // 15b. Mensagem enviada para o jogador do Racha 2 chegando no webhook do Racha 1 -> rejeitada (404 no Racha 1), não altera o Racha 2!
            $tokenR1 = $this->mockTransport->capturedWebhookTokensByInstance['futlendas_racha_1'];
            $payloadCrossWebhook = [
                'event'    => 'messages.upsert',
                'instance' => 'futlendas_racha_1',
                'data'     => [
                    'key'     => ['remoteJid' => '5512988330001@s.whatsapp.net', 'fromMe' => false, 'id' => 'WAMID_CROSS_R2_ON_R1'],
                    'message' => ['conversation' => 'SIM']
                ]
            ];
            $respCross = processMultiRachaWebhookHttpRequest(
                json_encode($payloadCrossWebhook),
                ['X-Webhook-Token' => $tokenR1],
                [],
                $this->whatsappService
            );
            if ($respCross['http_code'] !== 404) {
                throw new Exception("Jogador exclusivo do Racha 2 não deve ser reconhecido no webhook da instância do Racha 1!");
            }

            // Verifica que no Racha 2 o jogador continua 'sem_resposta'
            $statusR2 = $this->queueService->getSessionQueueAndConvocationStatus($this->racha2Id, $sessaoR2Id);
            if ($statusR2['pendentes_resposta'][0]['intencao_atual'] !== 'sem_resposta') {
                throw new Exception("O estado da sessão do Racha 2 não poderia ser afetado pela instância do Racha 1!");
            }
        });

        // =====================================================================
        // TESTE 16: Falhas de envio e timeout sem marcação falsa de sucesso + idempotência de envio
        // =====================================================================
        $this->assert("16. Falha de envio e timeout registrados com precisão (sem marcação falsa de 'enviado') e idempotência de envio", function () use (
            &$sessaoR1Id, &$avulso2Id
        ) {
            // 16a. Simula falha HTTP 500 ao enviar um comunicado para o Avulso 2
            $this->mockTransport->queueNextResponse('/message/sendText/futlendas_racha_1', [
                'http_code' => 500,
                'data'      => ['error' => 'Internal Server Error on Evolution API']
            ]);

            $resFail = $this->whatsappService->sendTextMessage(
                $this->racha1Id,
                '5512988220004',
                'Comunicado de teste falha',
                'comunicado',
                'comunicado:r1:teste_falha_1',
                $sessaoR1Id,
                $avulso2Id,
                $this->orgRacha1Id
            );

            if ($resFail['enviado'] !== false || $resFail['status_envio'] !== 'falha') {
                throw new Exception("Falha da API não pode ser marcada como 'enviado'!");
            }

            $stmtRow = $this->pdo->prepare("SELECT status_envio, enviado_em, erro_codigo FROM racha_whatsapp_mensagens WHERE id = ?");
            $stmtRow->execute([$resFail['mensagem_log_id']]);
            $rowFail = $stmtRow->fetch(PDO::FETCH_ASSOC);
            if ($rowFail['status_envio'] !== 'falha' || $rowFail['enviado_em'] !== null) {
                throw new Exception("No banco, mensagem com falha deve ter status_envio='falha' e enviado_em=NULL!");
            }

            // 16b. Simula timeout na requisição de envio -> deve gravar 'desconhecido_timeout' e enviado_em=NULL
            $this->mockTransport->queueNextResponse('/message/sendText/futlendas_racha_1', [
                'is_timeout' => true,
                'http_code'  => 0,
                'error_code' => 'CURL_TIMEOUT',
                'error_msg'  => 'Operation timed out after 10000ms'
            ]);

            $resTimeout = $this->whatsappService->sendTextMessage(
                $this->racha1Id,
                '5512988220004',
                'Lembrete com timeout',
                'lembrete_semanal',
                'lembrete:r1:teste_timeout_1',
                $sessaoR1Id,
                $avulso2Id,
                $this->orgRacha1Id
            );

            if ($resTimeout['enviado'] !== false || $resTimeout['status_envio'] !== 'desconhecido_timeout') {
                throw new Exception("Timeout de envio deve ser registrado como 'desconhecido_timeout' e enviado=false!");
            }

            // 16c. Envio com sucesso e proteção de idempotência contra disparo duplicado acidental (ex: renovação mensal)
            $resRenov1 = $this->whatsappService->sendTextMessage(
                $this->racha1Id,
                '5512988220004',
                'Renovação mensal competência 12/2026',
                'renovacao_mensal',
                'renovacao:r1:jog:' . $avulso2Id . ':2026-12',
                null,
                $avulso2Id,
                $this->orgRacha1Id,
                2026,
                12
            );
            if (!$resRenov1['enviado'] || $resRenov1['status_envio'] !== 'enviado' || empty($resRenov1['mensagem_externa_id'])) {
                throw new Exception("Envio normal deveria registrar status_envio='enviado' e mensagem_externa_id!");
            }

            $reqCountBefore = count($this->mockTransport->requests);
            $resRenovDup = $this->whatsappService->sendTextMessage(
                $this->racha1Id,
                '5512988220004',
                'Renovação mensal competência 12/2026',
                'renovacao_mensal',
                'renovacao:r1:jog:' . $avulso2Id . ':2026-12',
                null,
                $avulso2Id,
                $this->orgRacha1Id,
                2026,
                12
            );
            $reqCountAfter = count($this->mockTransport->requests);

            if (!$resRenovDup['idempotente'] || $reqCountAfter !== $reqCountBefore) {
                throw new Exception("Disparo duplicado com mesma chave_idempotencia não deve fazer nova chamada HTTP à Evolution API!");
            }
        });

        // =====================================================================
        // TESTE 17: Proteção de credenciais nos logs, banco e respostas
        // =====================================================================
        $this->assert("17. Proteção de credenciais, tokens, chaves de API e QR Codes nos logs, diagnósticos do banco e respostas", function () {
            // Simula um erro da API cuja mensagem bruta contenha a EVOLUTION_APIKEY, um token Bearer e um QR base64
            $dirtyError = "Error calling url?token=SECRET_TOKEN_XYZ&apikey=SUPER_SECRET_MASTER_EVOLUTION_KEY_999 Authorization: Bearer eyJhbGciOiJIUzI1NiJ9 data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==";
            $this->mockTransport->queueNextResponse('/instance/connectionState/futlendas_racha_1', [
                'http_code'  => 500,
                'error_code' => 'UPSTREAM_ERR',
                'error_msg'  => $dirtyError
            ]);

            $statusResp = $this->whatsappService->getConnectionStatus($this->racha1Id, true);
            $serializedResp = json_encode($statusResp);

            if (
                strpos($serializedResp, 'SUPER_SECRET_MASTER_EVOLUTION_KEY_999') !== false
                || strpos($serializedResp, 'SECRET_TOKEN_XYZ') !== false
                || strpos($serializedResp, 'eyJhbGciOiJIUzI1NiJ9') !== false
                || strpos($serializedResp, 'iVBORw0KGgoAAAANSUhEUg==') !== false
            ) {
                throw new Exception("VAZAMENTO DE CREDENCIAL DETECTADO na resposta do serviço: {$serializedResp}");
            }

            // Verifica também diretamente no banco (`racha_whatsapp_instancias` e `racha_whatsapp_mensagens`)
            $instRows = $this->pdo->query("SELECT ultimo_erro_resumo, diagnostico_metadados FROM racha_whatsapp_instancias")->fetchAll(PDO::FETCH_ASSOC);
            $serializedDb = json_encode($instRows);
            if (
                strpos($serializedDb, 'SUPER_SECRET_MASTER_EVOLUTION_KEY_999') !== false
                || strpos($serializedDb, 'SECRET_TOKEN_XYZ') !== false
                || strpos($serializedDb, 'iVBORw0KGgoAAAANSUhEUg') !== false
            ) {
                throw new Exception("VAZAMENTO DE CREDENCIAL OU QR CODE DETECTADO nas colunas de diagnóstico do banco!");
            }
        });

        echo "\n====================================================================\n";
        echo " RESULTADO FINAL DA SUÍTE ETAPA 3C.2 (test_whatsapp_evolution.php):\n";
        echo " APROVADOS: {$this->passed} | FALHAS: {$this->failed}\n";
        echo "====================================================================\n";

        if ($this->failed > 0) {
            exit(1);
        }
    }
}

$suite = new WhatsAppEvolutionTestSuite();
$suite->runAll();
