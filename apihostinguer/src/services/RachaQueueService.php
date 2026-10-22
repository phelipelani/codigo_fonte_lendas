<?php
/**
 * Serviço Multi-Racha de Gestão de Participantes (WhatsApp), Convocação Semanal e Fila de Espera FIFO
 * Arquivo: apihostinguer/src/services/RachaQueueService.php
 *
 * Responsabilidades (Fase 4.0 — Etapa 3C.1):
 * 1. Normalização consistente de telefones WhatsApp brasileiros (13 dígitos: 55 + DDD + 9 + 8 dígitos)
 *    e geração de variações válidas (10, 11, 12 e 13 dígitos) para reconhecimento de respostas.
 * 2. Cadastro e reutilização da identidade global em `jogadores` (mesmo sem conta em `usuarios`),
 *    reaproveitando `usuarios.whatsapp` quando vinculado e prevenindo fusão automática em colisões de telefone.
 * 3. Separação estrita entre `mensalista`, `avulso_recorrente` e `avulso_convidado` por racha,
 *    validando vínculos com `racha_participantes` e `racha_mensalistas`.
 * 4. Preparação da convocação semanal unificada (mensalistas e avulsos selecionados na mesma convocação)
 *    em `racha_sessao_convocacoes`, sem gravar presença real em `racha_sessao_presencas`.
 * 5. Registro transacional de intenções (`sim`, `nao`, `depois`) com chave de idempotência (`racha_sessao_respostas_idempotencia`),
 *    bloqueio pessimista (`FOR UPDATE`) e contador monotônico por sessão (`racha_sessao_fila_contadores`).
 * 6. Liberação de vaga quando um mensalista (ou titular promovido) informa `nao` e promoção automática
 *    e idempotente do 1º avulso elegível da fila de espera (`situacao_vaga = 'fila_espera'`).
 * 7. Gravação interna de eventos na trilha append-only `racha_sessao_eventos` sem expor método público genérico.
 */

require_once __DIR__ . '/../middleware/RachaScopeMiddleware.php';
require_once __DIR__ . '/../utils/HttpError.php';

class RachaQueueService
{
    private PDO $pdo;

    private const MAX_MOTIVO_LENGTH = 255;

    private const ALLOWED_PARTICIPATION_TYPES = [
        'mensalista',
        'avulso_recorrente',
        'avulso_convidado'
    ];

    private const ALLOWED_POSITIONS = [
        'linha',
        'goleiro'
    ];

    private const ALLOWED_QUEUE_EVENT_TYPES = [
        'preparacao_convocacao',
        'intencao_recebida',
        'entrada_fila_espera',
        'recusa_convocacao',
        'promocao_fila_espera',
        'fechamento_convocacao',
        'reabertura_convocacao',
        'resposta_tardia_convocacao'
    ];

    private const ALLOWED_ACTOR_TYPES = [
        'usuario',
        'jogador_whatsapp',
        'sistema'
    ];

    public function __construct(?PDO $pdo = null)
    {
        $this->pdo = RachaScopeMiddleware::getPdo($pdo);
    }

    // =========================================================================
    // 0. MÉTODOS PRIVADOS DE VALIDAÇÃO E AUDITORIA APPEND-ONLY
    // =========================================================================

    /**
     * Valida que o identificador de usuário responsável foi fornecido e existe ativo na tabela `usuarios`.
     */
    private function validateAuthorUser(?int $usuarioId, string $operacao): array
    {
        if ($usuarioId === null || $usuarioId <= 0) {
            throw new HttpError("Identificador do usuário responsável (usuarioId) é obrigatório e deve ser um inteiro positivo para '{$operacao}'.", 400);
        }

        $stmt = $this->pdo->prepare("SELECT id, username, ativo FROM usuarios WHERE id = :id");
        $stmt->execute([':id' => $usuarioId]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$user) {
            throw new HttpError("Usuário responsável #{$usuarioId} não encontrado no cadastro para '{$operacao}'.", 400);
        }

        if (isset($user['ativo']) && (int)$user['ativo'] !== 1) {
            throw new HttpError("Usuário responsável #{$usuarioId} está inativo e não pode registrar '{$operacao}'.", 400);
        }

        return $user;
    }

    /**
     * Valida a coerência estrita de autoria de um evento ou operação:
     * - 'usuario': exige `usuarioId` válido e ativo em `usuarios`.
     * - 'jogador_whatsapp': proíbe `usuarioId` humano (deve ser NULL) e exige `jogadorId` válido.
     * - 'sistema': proíbe `usuarioId` humano (deve ser NULL).
     */
    private function validateEventAuthorship(
        string $tipoAtor,
        ?int $usuarioId,
        ?int $jogadorId,
        string $operacao
    ): void {
        if (!in_array($tipoAtor, self::ALLOWED_ACTOR_TYPES, true)) {
            throw new HttpError(
                "Tipo de ator inválido ('{$tipoAtor}') para '{$operacao}'. Permitidos: " . implode(', ', self::ALLOWED_ACTOR_TYPES),
                400
            );
        }

        if ($tipoAtor === 'usuario') {
            $this->validateAuthorUser($usuarioId, $operacao);
            return;
        }

        if ($tipoAtor === 'jogador_whatsapp') {
            if ($usuarioId !== null) {
                throw new HttpError(
                    "Autoria inválida para '{$operacao}': eventos automáticos de resposta do WhatsApp ('jogador_whatsapp') não podem ser atribuídos a um usuarioId humano (#{$usuarioId}).",
                    400
                );
            }
            if ($jogadorId === null || $jogadorId <= 0) {
                throw new HttpError(
                    "Autoria inválida para '{$operacao}': eventos do tipo 'jogador_whatsapp' exigem a identificação do jogador convocado (jogadorId).",
                    400
                );
            }
            return;
        }

        if ($tipoAtor === 'sistema') {
            if ($usuarioId !== null) {
                throw new HttpError(
                    "Autoria inválida para '{$operacao}': eventos automáticos do sistema ('sistema') não podem ser atribuídos a um usuarioId humano (#{$usuarioId}).",
                    400
                );
            }
        }
    }

    /**
     * Valida tamanho máximo de motivo/observação (<= 255 caracteres).
     */
    private function validateMotivo(?string $motivo, bool $obrigatorio, string $nomeCampo = 'motivo'): ?string
    {
        if ($motivo === null) {
            if ($obrigatorio) {
                throw new HttpError("O campo '{$nomeCampo}' é obrigatório e não pode ser nulo.", 400);
            }
            return null;
        }

        $limpo = trim($motivo);
        if ($limpo === '') {
            if ($obrigatorio) {
                throw new HttpError("O campo '{$nomeCampo}' é obrigatório e não pode ser vazio.", 400);
            }
            return null;
        }

        $len = function_exists('mb_strlen') ? mb_strlen($limpo, 'UTF-8') : strlen($limpo);
        if ($len > self::MAX_MOTIVO_LENGTH) {
            throw new HttpError(
                "O campo '{$nomeCampo}' possui {$len} caracteres e excede o limite máximo permitido de " . self::MAX_MOTIVO_LENGTH . " caracteres.",
                400
            );
        }

        return $limpo;
    }

    /**
     * Registra evento na trilha de auditoria append-only `racha_sessao_eventos` (estritamente privado).
     */
    private function recordQueueEvent(
        int $rachaId,
        int $sessaoId,
        string $tipoEvento,
        ?int $usuarioId,
        ?string $motivo = null,
        ?array $detalhes = null,
        ?int $jogadorId = null,
        ?int $substituiuJogadorId = null,
        ?string $statusAnterior = null,
        ?string $statusNovo = null,
        string $tipoAtor = 'usuario',
        ?string $mensagemExternaId = null
    ): int {
        if (!in_array($tipoEvento, self::ALLOWED_QUEUE_EVENT_TYPES, true)) {
            throw new InvalidArgumentException("Tipo de evento de fila inválido ('{$tipoEvento}').");
        }

        $this->validateEventAuthorship($tipoAtor, $usuarioId, $jogadorId, "registro do evento '{$tipoEvento}'");

        $motivoValidado = $this->validateMotivo($motivo, false, 'motivo do evento');
        $msgExtLimpa = ($mensagemExternaId !== null && trim($mensagemExternaId) !== '')
            ? substr(trim($mensagemExternaId), 0, 120)
            : null;

        $stmt = $this->pdo->prepare("
            INSERT INTO racha_sessao_eventos (
                sessao_id, racha_id, tipo_evento, tipo_ator, usuario_id,
                jogador_id, substituiu_jogador_id, mensagem_externa_id, status_anterior, status_novo,
                motivo, detalhes, criado_em
            ) VALUES (
                :sessao_id, :racha_id, :tipo, :tipo_ator, :usuario_id,
                :jogador_id, :substituiu_id, :msg_ext_id, :status_ant, :status_novo,
                :motivo, :detalhes, NOW()
            )
        ");
        $stmt->execute([
            ':sessao_id'     => $sessaoId,
            ':racha_id'      => $rachaId,
            ':tipo'          => $tipoEvento,
            ':tipo_ator'     => $tipoAtor,
            ':usuario_id'    => $usuarioId,
            ':jogador_id'    => $jogadorId,
            ':substituiu_id' => $substituiuJogadorId,
            ':msg_ext_id'    => $msgExtLimpa,
            ':status_ant'    => $statusAnterior,
            ':status_novo'   => $statusNovo,
            ':motivo'        => $motivoValidado,
            ':detalhes'      => $detalhes !== null ? json_encode($detalhes, JSON_UNESCAPED_UNICODE) : null
        ]);

        return (int)$this->pdo->lastInsertId();
    }

    // =========================================================================
    // 1. NORMALIZAÇÃO E VARIAÇÕES DE TELEFONE WHATSAPP BRASILEIRO
    // =========================================================================

    /**
     * Normaliza um número de telefone celular brasileiro para o padrão canônico de 13 dígitos:
     * 55 + DDD (2 dígitos, 11..99) + 9 + 8 dígitos (ex: 5512988887777).
     * Compatível com `normalizarTelefone()` do módulo legado de WhatsApp.
     */
    public function normalizePhoneNumber(string $rawPhone): string
    {
        $digits = preg_replace('/\D/', '', $rawPhone);
        if ($digits === null || $digits === '') {
            throw new HttpError("Número de telefone WhatsApp inválido (vazio).", 400);
        }

        // Remove prefixo 00 ou 0 inicial acidental em discagem nacional (ex: 012988887777 -> 12988887777)
        if (strlen($digits) === 12 && $digits[0] === '0' && !str_starts_with($digits, '55')) {
            $digits = substr($digits, 1);
        } elseif (strlen($digits) === 11 && $digits[0] === '0') {
            $digits = substr($digits, 1);
        }

        if (str_starts_with($digits, '55') && strlen($digits) >= 12) {
            if (strlen($digits) === 12) {
                // 55 + DDD (2) + 8 dígitos -> insere o 9º dígito após o DDD
                $digits = substr($digits, 0, 4) . '9' . substr($digits, 4);
            }
        } else {
            if (strlen($digits) === 10) {
                // DDD (2) + 8 dígitos -> adiciona 55 e o 9º dígito
                $digits = '55' . substr($digits, 0, 2) . '9' . substr($digits, 2);
            } elseif (strlen($digits) === 11) {
                // DDD (2) + 9 + 8 dígitos -> adiciona 55
                $digits = '55' . $digits;
            }
        }

        if (strlen($digits) !== 13 || !str_starts_with($digits, '55')) {
            throw new HttpError("Número de WhatsApp inválido ('{$rawPhone}'). Informe DDD + número válido (10 a 13 dígitos).", 400);
        }

        $ddd = (int)substr($digits, 2, 2);
        $nonoDigito = $digits[4];
        if ($ddd < 11 || $ddd > 99 || $nonoDigito !== '9') {
            throw new HttpError("Número de WhatsApp inválido ('{$rawPhone}'): DDD ({$ddd}) ou formato móvel inválido.", 400);
        }

        return $digits;
    }

    /**
     * Gera todas as variações brasileiras válidas de um telefone (com/sem DDI 55 e com/sem 9º dígito)
     * para localizar o participante mesmo quando o WhatsApp entrega JIDs antigos de 12 dígitos.
     * Compatível com `variacoesNumero()` de `apihostinguer/presenca/api/webhook.php`.
     */
    public function getPhoneVariations(string $rawPhone): array
    {
        $n = preg_replace('/\D/', '', $rawPhone) ?? '';
        if ($n === '') {
            return [];
        }

        $vars = [$n];

        if (str_starts_with($n, '55') && strlen($n) >= 12) {
            $semPais = substr($n, 2);
            $vars[] = $semPais;

            if (strlen($n) === 13 && $n[4] === '9') {
                $sem9 = substr($n, 0, 4) . substr($n, 5);
                $vars[] = $sem9;
                $vars[] = substr($sem9, 2);
            }
            if (strlen($n) === 12) {
                $com9 = substr($n, 0, 4) . '9' . substr($n, 4);
                $vars[] = $com9;
                $vars[] = substr($com9, 2);
            }
        } else {
            $comPais = '55' . $n;
            $vars[] = $comPais;

            if (strlen($n) === 11 && $n[2] === '9') {
                $sem9 = substr($n, 0, 2) . substr($n, 3);
                $vars[] = $sem9;
                $vars[] = '55' . $sem9;
            }
            if (strlen($n) === 10) {
                $com9 = substr($n, 0, 2) . '9' . substr($n, 2);
                $vars[] = $com9;
                $vars[] = '55' . $com9;
            }
        }

        return array_values(array_unique($vars));
    }

    // =========================================================================
    // 2. CADASTRO E REUTILIZAÇÃO DE PARTICIPANTES COM TRATAMENTO DE COLISÃO
    // =========================================================================

    /**
     * Cadastra ou reutiliza um jogador global (`jogadores`) e vincula/atualiza sua participação no racha (`racha_participantes`).
     *
     * Regras:
     * - Não exige conta de login (`usuarios.id` pode ser NULL).
     * - Reaproveita `usuarios.whatsapp` quando o jogador já possui conta vinculada e não tem telefone específico em `jogadores.whatsapp`.
     * - Reutiliza a identidade global (`jogadores.id`) quando o jogador já está cadastrado (mesmo nome + mesmo telefone, ou ID explícito).
     * - Não funde cadastros automaticamente apenas por compartilharem o mesmo telefone: se o telefone informado já estiver
     *   vinculado a outro jogador com nome distinto (ou se dois participantes do mesmo racha tentarem usar o mesmo telefone),
     *   lança um conflito controlado (HTTP 409) exigindo identificação explícita.
     */
    public function registerOrReuseParticipant(
        int $rachaId,
        string $nome,
        ?string $whatsapp,
        string $tipoParticipacao,
        int $usuarioId,
        ?int $jogadorId = null,
        string $posicao = 'linha',
        ?string $apelidoBot = null,
        ?array $dadosMensalidade = null
    ): array {
        $this->validateAuthorUser($usuarioId, 'cadastro/vinculação de participante');

        $nomeLimpo = trim($nome);
        if ($nomeLimpo === '') {
            throw new HttpError("O nome do participante é obrigatório.", 400);
        }

        if (!in_array($tipoParticipacao, self::ALLOWED_PARTICIPATION_TYPES, true)) {
            throw new HttpError(
                "Tipo de participação inválido ('{$tipoParticipacao}'). Permitidos: " . implode(', ', self::ALLOWED_PARTICIPATION_TYPES),
                400
            );
        }

        $posicaoLimpa = strtolower(trim($posicao));
        if (!in_array($posicaoLimpa, self::ALLOWED_POSITIONS, true)) {
            throw new HttpError("Posição inválida ('{$posicao}'). Permitidas: linha, goleiro.", 400);
        }

        $whatsappNorm = ($whatsapp !== null && trim($whatsapp) !== '')
            ? $this->normalizePhoneNumber($whatsapp)
            : null;

        $apelidoLimpo = ($apelidoBot !== null && trim($apelidoBot) !== '') ? trim($apelidoBot) : null;

        $ownTx = !$this->pdo->inTransaction();
        if ($ownTx) {
            $this->pdo->beginTransaction();
        }

        try {
            $stmtRacha = $this->pdo->prepare("SELECT id, nome, ativo FROM rachas WHERE id = :id FOR UPDATE");
            $stmtRacha->execute([':id' => $rachaId]);
            $racha = $stmtRacha->fetch(PDO::FETCH_ASSOC);
            if (!$racha || (int)$racha['ativo'] !== 1) {
                throw new HttpError("Racha #{$rachaId} não encontrado ou inativo.", 404);
            }

            $reutilizouJogador = false;
            $resolvedJogadorId = null;

            // 1. Verifica se algum outro jogador já utiliza este telefone (em jogadores.whatsapp ou usuarios.whatsapp)
            $playersWithPhone = [];
            if ($whatsappNorm !== null) {
                $vars = $this->getPhoneVariations($whatsappNorm);
                $placeholders = implode(',', array_fill(0, count($vars), '?'));
                $sqlPhone = "
                    SELECT j.id, j.nome, j.posicao, j.whatsapp, j.apelido_bot, j.usuario_id, u.whatsapp AS usuario_whatsapp
                    FROM jogadores j
                    LEFT JOIN usuarios u ON u.id = j.usuario_id
                    WHERE j.whatsapp IN ({$placeholders}) OR u.whatsapp IN ({$placeholders})
                    FOR UPDATE
                ";
                $stmtPhone = $this->pdo->prepare($sqlPhone);
                $stmtPhone->execute(array_merge($vars, $vars));
                $playersWithPhone = $stmtPhone->fetchAll(PDO::FETCH_ASSOC);
            }

            if ($jogadorId !== null) {
                // Caso A: Identificador global do jogador fornecido explicitamente
                $stmtJog = $this->pdo->prepare("
                    SELECT j.id, j.nome, j.posicao, j.whatsapp, j.apelido_bot, j.usuario_id, u.whatsapp AS usuario_whatsapp
                    FROM jogadores j
                    LEFT JOIN usuarios u ON u.id = j.usuario_id
                    WHERE j.id = :id
                    FOR UPDATE
                ");
                $stmtJog->execute([':id' => $jogadorId]);
                $jog = $stmtJog->fetch(PDO::FETCH_ASSOC);

                if (!$jog) {
                    throw new HttpError("Jogador #{$jogadorId} não encontrado no cadastro global.", 404);
                }

                // Se este telefone já pertence a OUTRO jogador, verifica colisão
                foreach ($playersWithPhone as $other) {
                    if ((int)$other['id'] !== (int)$jog['id']) {
                        throw new HttpError(
                            "Conflito de telefone WhatsApp: o número {$whatsappNorm} já está vinculado ao jogador #{$other['id']} ('{$other['nome']}'). Não é permitido fundir ou compartilhar o mesmo número sem desambiguação.",
                            409
                        );
                    }
                }

                // Reaproveita usuarios.whatsapp quando o jogador tem conta vinculada e não foi passado telefone novo
                if ($whatsappNorm === null) {
                    $candidatePhone = $jog['whatsapp'] ?: ($jog['usuario_whatsapp'] ?? null);
                    if ($candidatePhone !== null && trim((string)$candidatePhone) !== '') {
                        $whatsappNorm = $this->normalizePhoneNumber((string)$candidatePhone);
                    }
                }

                // Atualiza telefone/apelido em jogadores se aplicável
                if ($whatsappNorm !== null || $apelidoLimpo !== null) {
                    $upJog = $this->pdo->prepare("
                        UPDATE jogadores
                        SET whatsapp = COALESCE(:whatsapp, whatsapp),
                            apelido_bot = COALESCE(:apelido, apelido_bot)
                        WHERE id = :id
                    ");
                    $upJog->execute([
                        ':whatsapp' => $whatsappNorm,
                        ':apelido'  => $apelidoLimpo,
                        ':id'       => $jog['id']
                    ]);
                }

                $resolvedJogadorId = (int)$jog['id'];
                $nomeLimpo = (string)$jog['nome'];
                $posicaoLimpa = (string)$jog['posicao'];
                $reutilizouJogador = true;
            } else {
                // Caso B: Sem jogadorId explícito -> verifica correspondência exata ou colisão/ambiguidade
                if (!empty($playersWithPhone)) {
                    if (count($playersWithPhone) > 1) {
                        throw new HttpError(
                            "Ambiguidade detectada: o telefone {$whatsappNorm} está associado a múltiplos cadastros. Informe explicitamente o jogadorId.",
                            409
                        );
                    }

                    $matchedByPhone = $playersWithPhone[0];
                    $sameName = mb_strtolower(trim((string)$matchedByPhone['nome']), 'UTF-8') === mb_strtolower($nomeLimpo, 'UTF-8');

                    if (!$sameName) {
                        // PROIBIDO fundir automaticamente duas pessoas diferentes pelo mesmo telefone!
                        throw new HttpError(
                            "Conflito de telefone WhatsApp: o número {$whatsappNorm} já pertence ao jogador #{$matchedByPhone['id']} ('{$matchedByPhone['nome']}'), que difere de '{$nomeLimpo}'. Confirme a identidade correta informando o jogadorId ou utilize outro número.",
                            409
                        );
                    }

                    // Mesmo nome e mesmo telefone -> reutiliza a identidade global existente!
                    $resolvedJogadorId = (int)$matchedByPhone['id'];
                    $nomeLimpo = (string)$matchedByPhone['nome'];
                    $posicaoLimpa = (string)$matchedByPhone['posicao'];
                    $reutilizouJogador = true;

                    if ($matchedByPhone['whatsapp'] !== $whatsappNorm || $apelidoLimpo !== null) {
                        $upJog = $this->pdo->prepare("
                            UPDATE jogadores
                            SET whatsapp = :whatsapp,
                                apelido_bot = COALESCE(:apelido, apelido_bot)
                            WHERE id = :id
                        ");
                        $upJog->execute([
                            ':whatsapp' => $whatsappNorm,
                            ':apelido'  => $apelidoLimpo,
                            ':id'       => $resolvedJogadorId
                        ]);
                    }
                } else {
                    // Verifica se já existe jogador com o mesmo nome na tabela jogadores
                    $stmtByName = $this->pdo->prepare("
                        SELECT j.id, j.nome, j.posicao, j.whatsapp, j.apelido_bot, j.usuario_id, u.whatsapp AS usuario_whatsapp
                        FROM jogadores j
                        LEFT JOIN usuarios u ON u.id = j.usuario_id
                        WHERE j.nome = :nome
                        FOR UPDATE
                    ");
                    $stmtByName->execute([':nome' => $nomeLimpo]);
                    $existingByName = $stmtByName->fetch(PDO::FETCH_ASSOC);

                    if ($existingByName) {
                        $existingRawPhone = $existingByName['whatsapp'] ?: ($existingByName['usuario_whatsapp'] ?? null);
                        $existingPhoneNorm = ($existingRawPhone !== null && trim((string)$existingRawPhone) !== '')
                            ? $this->normalizePhoneNumber((string)$existingRawPhone)
                            : null;

                        if ($existingPhoneNorm !== null && $whatsappNorm !== null && $existingPhoneNorm !== $whatsappNorm) {
                            // Homônimo com telefone diferente: exige desambiguação explícita
                            throw new HttpError(
                                "Conflito de homônimo: já existe o jogador #{$existingByName['id']} ('{$existingByName['nome']}') com outro telefone cadastrado. Informe o jogadorId explícito ou diferencie o nome.",
                                409
                            );
                        }

                        // Reutiliza o jogador existente (e preenche o whatsapp se ainda estava vazio)
                        $resolvedJogadorId = (int)$existingByName['id'];
                        $whatsappNorm = $whatsappNorm ?? $existingPhoneNorm;
                        $reutilizouJogador = true;

                        if ($whatsappNorm !== null || $apelidoLimpo !== null) {
                            $upJog = $this->pdo->prepare("
                                UPDATE jogadores
                                SET whatsapp = COALESCE(:whatsapp, whatsapp),
                                    apelido_bot = COALESCE(:apelido, apelido_bot)
                                WHERE id = :id
                            ");
                            $upJog->execute([
                                ':whatsapp' => $whatsappNorm,
                                ':apelido'  => $apelidoLimpo,
                                ':id'       => $resolvedJogadorId
                            ]);
                        }
                    } else {
                        // Cria novo jogador global sem exigir conta em `usuarios` (usuario_id = NULL)
                        $insJog = $this->pdo->prepare("
                            INSERT INTO jogadores (nome, role, posicao, whatsapp, apelido_bot, usuario_id)
                            VALUES (:nome, 'player', :posicao, :whatsapp, :apelido, NULL)
                        ");
                        $insJog->execute([
                            ':nome'     => $nomeLimpo,
                            ':posicao'  => $posicaoLimpa,
                            ':whatsapp' => $whatsappNorm,
                            ':apelido'  => $apelidoLimpo
                        ]);
                        $resolvedJogadorId = (int)$this->pdo->lastInsertId();
                        $reutilizouJogador = false;
                    }
                }
            }

            // 2. Vincula ou atualiza em `racha_participantes`
            $stmtPart = $this->pdo->prepare("
                SELECT id, tipo_participacao, ativo
                FROM racha_participantes
                WHERE racha_id = :racha_id AND jogador_id = :jogador_id
                FOR UPDATE
            ");
            $stmtPart->execute([':racha_id' => $rachaId, ':jogador_id' => $resolvedJogadorId]);
            $existingPart = $stmtPart->fetch(PDO::FETCH_ASSOC);

            if ($existingPart) {
                $upPart = $this->pdo->prepare("
                    UPDATE racha_participantes
                    SET tipo_participacao = :tipo, ativo = 1, updated_at = NOW()
                    WHERE id = :id
                ");
                $upPart->execute([
                    ':tipo' => $tipoParticipacao,
                    ':id'   => $existingPart['id']
                ]);
                $participanteId = (int)$existingPart['id'];
            } else {
                $insPart = $this->pdo->prepare("
                    INSERT INTO racha_participantes (racha_id, jogador_id, tipo_participacao, ativo, created_at, updated_at)
                    VALUES (:racha_id, :jogador_id, :tipo, 1, NOW(), NOW())
                ");
                $insPart->execute([
                    ':racha_id'   => $rachaId,
                    ':jogador_id' => $resolvedJogadorId,
                    ':tipo'       => $tipoParticipacao
                ]);
                $participanteId = (int)$this->pdo->lastInsertId();
            }

            // 3. Sincroniza vínculo em `racha_mensalistas` conforme tipo_participacao
            $stmtMens = $this->pdo->prepare("
                SELECT id, status, data_inicio, data_fim
                FROM racha_mensalistas
                WHERE racha_id = :racha_id AND jogador_id = :jogador_id AND status IN ('ativo', 'suspenso')
                FOR UPDATE
            ");
            $stmtMens->execute([':racha_id' => $rachaId, ':jogador_id' => $resolvedJogadorId]);
            $openMens = $stmtMens->fetch(PDO::FETCH_ASSOC);

            if ($tipoParticipacao === 'mensalista') {
                if (!$openMens) {
                    $dataInicio = $dadosMensalidade['data_inicio'] ?? date('Y-m-d');
                    $valorInd = $dadosMensalidade['valor_individual'] ?? null;
                    $isento = !empty($dadosMensalidade['isento']) ? 1 : 0;
                    $motivoIsencao = $dadosMensalidade['motivo_isencao'] ?? null;
                    $diaVenc = $dadosMensalidade['dia_vencimento'] ?? null;

                    $insMens = $this->pdo->prepare("
                        INSERT INTO racha_mensalistas (
                            racha_id, jogador_id, valor_individual, isento, motivo_isencao,
                            dia_vencimento, data_inicio, status, created_at, updated_at
                        ) VALUES (
                            :racha_id, :jogador_id, :valor, :isento, :motivo,
                            :dia_venc, :data_inicio, 'ativo', NOW(), NOW()
                        )
                    ");
                    $insMens->execute([
                        ':racha_id'    => $rachaId,
                        ':jogador_id'  => $resolvedJogadorId,
                        ':valor'       => $valorInd,
                        ':isento'      => $isento,
                        ':motivo'      => $motivoIsencao,
                        ':dia_venc'    => $diaVenc,
                        ':data_inicio' => $dataInicio
                    ]);
                }
            } else {
                // Se era mensalista com contrato aberto e passou a avulso, encerra o contrato aberto de forma limpa
                if ($openMens) {
                    $fimData = max((string)$openMens['data_inicio'], date('Y-m-d'));
                    $upMens = $this->pdo->prepare("
                        UPDATE racha_mensalistas
                        SET status = 'inativo', data_fim = :data_fim, updated_at = NOW()
                        WHERE id = :id
                    ");
                    $upMens->execute([
                        ':data_fim' => $fimData,
                        ':id'       => $openMens['id']
                    ]);
                }
            }

            if ($ownTx) {
                $this->pdo->commit();
            }

            return [
                'participante_id'    => $participanteId,
                'racha_id'           => $rachaId,
                'jogador_id'         => $resolvedJogadorId,
                'nome'               => $nomeLimpo,
                'posicao'            => $posicaoLimpa,
                'whatsapp'           => $whatsappNorm,
                'apelido_bot'        => $apelidoLimpo,
                'tipo_participacao'  => $tipoParticipacao,
                'reutilizou_jogador' => $reutilizouJogador,
                'ativo'              => true
            ];
        } catch (Throwable $e) {
            if ($ownTx && $this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            throw $e;
        }
    }

    /**
     * Valida os vínculos entre racha, participante, telefone WhatsApp e mensalidade.
     */
    public function validateParticipantLink(int $rachaId, int $jogadorId): array
    {
        $stmt = $this->pdo->prepare("
            SELECT rp.id AS participante_id, rp.racha_id, rp.jogador_id, rp.tipo_participacao, rp.ativo,
                   j.nome, j.posicao, j.whatsapp AS jogador_whatsapp, j.apelido_bot, j.usuario_id,
                   u.whatsapp AS usuario_whatsapp,
                   rm.id AS mensalista_id, rm.status AS status_mensalidade, rm.data_inicio, rm.data_fim, rm.isento
            FROM racha_participantes rp
            JOIN jogadores j ON j.id = rp.jogador_id
            LEFT JOIN usuarios u ON u.id = j.usuario_id
            LEFT JOIN racha_mensalistas rm
                   ON rm.racha_id = rp.racha_id
                  AND rm.jogador_id = rp.jogador_id
                  AND rm.status IN ('ativo', 'suspenso')
            WHERE rp.racha_id = :racha_id AND rp.jogador_id = :jogador_id
        ");
        $stmt->execute([':racha_id' => $rachaId, ':jogador_id' => $jogadorId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row) {
            throw new HttpError("Participante (jogador #{$jogadorId}) não pertence ao racha #{$rachaId}.", 404);
        }

        if ((int)$row['ativo'] !== 1) {
            throw new HttpError("Participante #{$jogadorId} ('{$row['nome']}') está inativo no racha #{$rachaId}.", 400);
        }

        if ($row['tipo_participacao'] === 'mensalista' && $row['status_mensalidade'] === 'suspenso') {
            throw new HttpError("Mensalista #{$jogadorId} ('{$row['nome']}') possui vínculo de mensalidade suspenso no racha #{$rachaId}.", 400);
        }

        $rawPhone = $row['jogador_whatsapp'] ?: ($row['usuario_whatsapp'] ?? null);
        $whatsappNorm = ($rawPhone !== null && trim((string)$rawPhone) !== '')
            ? $this->normalizePhoneNumber((string)$rawPhone)
            : null;

        return [
            'participante_id'    => (int)$row['participante_id'],
            'racha_id'           => (int)$row['racha_id'],
            'jogador_id'         => (int)$row['jogador_id'],
            'nome'               => (string)$row['nome'],
            'posicao'            => (string)$row['posicao'],
            'tipo_participacao'  => (string)$row['tipo_participacao'],
            'ativo'              => (int)$row['ativo'] === 1,
            'usuario_id'         => $row['usuario_id'] !== null ? (int)$row['usuario_id'] : null,
            'whatsapp'           => $whatsappNorm,
            'mensalista_id'      => $row['mensalista_id'] !== null ? (int)$row['mensalista_id'] : null,
            'status_mensalidade' => $row['status_mensalidade']
        ];
    }

    // =========================================================================
    // 3. PREPARAÇÃO DA CONVOCAÇÃO SEMANAL DA SESSÃO
    // =========================================================================

    /**
     * Prepara a convocação semanal de uma sessão para os participantes selecionados (mensalistas e avulsos).
     *
     * Regras:
     * - Mensalistas e avulsos selecionados entram na mesma convocação semanal.
     * - Não grava presença real em `racha_sessao_presencas`.
     * - Rejeita jogadores de outro racha, jogadores inativos ou duplicidade de convocação na mesma sessão.
     * - Inicializa o contador monotônico da fila em `racha_sessao_fila_contadores`.
     */
    public function prepareSessionConvocation(
        int $rachaId,
        int $sessaoId,
        array $jogadorIds,
        int $usuarioId
    ): array {
        $this->validateAuthorUser($usuarioId, 'preparação de convocação semanal');

        if (empty($jogadorIds)) {
            throw new HttpError("Selecione ao menos um participante para preparar a convocação da sessão.", 400);
        }

        $normalizedIds = array_map('intval', $jogadorIds);
        if (count($normalizedIds) !== count(array_unique($normalizedIds))) {
            throw new HttpError("Duplicidade bloqueada: a lista de convocação contém o mesmo jogador mais de uma vez.", 409);
        }

        $this->pdo->beginTransaction();
        try {
            // 1. Bloqueia a sessão e valida escopo e estado
            $stmtSess = $this->pdo->prepare("
                SELECT rs.id, rs.racha_id, rs.data_racha, rs.status, rs.apuracao_presenca, r.limite_vagas
                FROM racha_sessoes rs
                JOIN rachas r ON r.id = rs.racha_id
                WHERE rs.id = :sessao_id AND rs.racha_id = :racha_id
                FOR UPDATE
            ");
            $stmtSess->execute([':sessao_id' => $sessaoId, ':racha_id' => $rachaId]);
            $sessao = $stmtSess->fetch(PDO::FETCH_ASSOC);

            if (!$sessao) {
                throw new HttpError("Sessão #{$sessaoId} não encontrada para o racha #{$rachaId}.", 404);
            }

            if ($sessao['status'] === 'cancelada') {
                throw new HttpError("Operação rejeitada: não é permitido convocar participantes em uma sessão cancelada.", 400);
            }

            if ($sessao['status'] === 'concluida') {
                throw new HttpError("Operação rejeitada: não é permitido convocar participantes em uma sessão já concluída.", 400);
            }

            if ($sessao['apuracao_presenca'] === 'homologada') {
                throw new HttpError("Operação rejeitada: a lista da sessão #{$sessaoId} já está homologada.", 409);
            }

            // 2. Garante a linha do contador monotônico da fila para esta sessão
            $stmtCnt = $this->pdo->prepare("
                INSERT INTO racha_sessao_fila_contadores (sessao_id, racha_id, ultimo_sequencial_fila)
                VALUES (:sessao_id, :racha_id, 0)
                ON DUPLICATE KEY UPDATE sessao_id = VALUES(sessao_id)
            ");
            $stmtCnt->execute([':sessao_id' => $sessaoId, ':racha_id' => $rachaId]);

            // 3. Verifica se algum dos jogadores já está convocado nesta sessão
            $stmtChkDup = $this->pdo->prepare("
                SELECT id FROM racha_sessao_convocacoes
                WHERE sessao_id = :sessao_id AND jogador_id = :jogador_id
                FOR UPDATE
            ");

            $stmtInsConv = $this->pdo->prepare("
                INSERT INTO racha_sessao_convocacoes (
                    racha_id, sessao_id, jogador_id, tipo_participacao_convocacao,
                    telefone_destino, status_envio, intencao_atual, situacao_vaga,
                    created_at, updated_at
                ) VALUES (
                    :racha_id, :sessao_id, :jogador_id, :tipo,
                    :telefone, 'pendente_envio', 'sem_resposta', 'aguardando_resposta',
                    NOW(), NOW()
                )
            ");

            $convocados = [];
            $totalMensalistas = 0;
            $totalAvulsos = 0;

            foreach ($normalizedIds as $jid) {
                $part = $this->validateParticipantLink($rachaId, $jid);

                $stmtChkDup->execute([':sessao_id' => $sessaoId, ':jogador_id' => $jid]);
                if ($stmtChkDup->fetch()) {
                    throw new HttpError(
                        "Duplicidade bloqueada: o participante #{$jid} ('{$part['nome']}') já foi convocado para a sessão #{$sessaoId}.",
                        409
                    );
                }

                $stmtInsConv->execute([
                    ':racha_id'   => $rachaId,
                    ':sessao_id'  => $sessaoId,
                    ':jogador_id' => $jid,
                    ':tipo'       => $part['tipo_participacao'],
                    ':telefone'   => $part['whatsapp']
                ]);

                if ($part['tipo_participacao'] === 'mensalista') {
                    $totalMensalistas++;
                } else {
                    $totalAvulsos++;
                }

                $convocados[] = [
                    'convocacao_id'               => (int)$this->pdo->lastInsertId(),
                    'jogador_id'                  => $jid,
                    'nome'                        => $part['nome'],
                    'posicao'                     => $part['posicao'],
                    'tipo_participacao_convocacao'=> $part['tipo_participacao'],
                    'telefone_destino'            => $part['whatsapp'],
                    'status_envio'                => 'pendente_envio',
                    'intencao_atual'              => 'sem_resposta',
                    'situacao_vaga'               => 'aguardando_resposta'
                ];
            }

            // Se a sessão ainda estava 'agendada', promove operacionalmente para 'aberta'
            if ($sessao['status'] === 'agendada') {
                $upSess = $this->pdo->prepare("
                    UPDATE racha_sessoes
                    SET status = 'aberta', updated_at = NOW()
                    WHERE id = :sessao_id AND racha_id = :racha_id
                ");
                $upSess->execute([':sessao_id' => $sessaoId, ':racha_id' => $rachaId]);
            }

            // 4. Registra evento de preparação de convocação na trilha de auditoria
            $this->recordQueueEvent(
                $rachaId,
                $sessaoId,
                'preparacao_convocacao',
                $usuarioId,
                'Convocação semanal preparada para a sessão',
                [
                    'total_convocados'  => count($convocados),
                    'total_mensalistas' => $totalMensalistas,
                    'total_avulsos'     => $totalAvulsos,
                    'jogador_ids'       => $normalizedIds
                ],
                null,
                null,
                null,
                'aguardando_resposta'
            );

            $this->pdo->commit();

            return [
                'racha_id'          => $rachaId,
                'sessao_id'         => $sessaoId,
                'total_convocados'  => count($convocados),
                'total_mensalistas' => $totalMensalistas,
                'total_avulsos'     => $totalAvulsos,
                'convocados'        => $convocados
            ];
        } catch (PDOException $e) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            if ($e->getCode() === '23000' || strpos($e->getMessage(), '1062') !== false) {
                throw new HttpError("Duplicidade de convocação detectada na sessão #{$sessaoId}.", 409);
            }
            throw $e;
        } catch (Throwable $e) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            throw $e;
        }
    }

    /**
     * Fechamento pré-jogo da convocação (Etapa 3C.3.1)
     * Encerra a coleta normal de intenções via WhatsApp sem homologar a apuração oficial
     * e sem concluir a sessão de jogo.
     */
    public function closeConvocation(int $rachaId, int $sessaoId, int $usuarioId, ?string $motivo = null): array
    {
        $this->validateAuthorUser($usuarioId, 'fechamento de convocação');
        $motivoLimpo = $this->validateMotivo($motivo, false, 'motivo de fechamento da convocação')
            ?? 'Fechamento pré-jogo da convocação';

        $this->pdo->beginTransaction();
        try {
            $stmtSess = $this->pdo->prepare("
                SELECT id, racha_id, status, apuracao_presenca, status_convocacao
                FROM racha_sessoes
                WHERE id = :sessao_id AND racha_id = :racha_id
                FOR UPDATE
            ");
            $stmtSess->execute([':sessao_id' => $sessaoId, ':racha_id' => $rachaId]);
            $sessao = $stmtSess->fetch(PDO::FETCH_ASSOC);

            if (!$sessao) {
                throw new HttpError("Sessão #{$sessaoId} não encontrada para o racha #{$rachaId}.", 404);
            }
            if ($sessao['status'] === 'cancelada') {
                throw new HttpError("Operação rejeitada: a sessão #{$sessaoId} está cancelada.", 400);
            }
            if ($sessao['status'] === 'concluida') {
                throw new HttpError("Operação rejeitada: a sessão #{$sessaoId} já foi concluída.", 400);
            }

            if (($sessao['status_convocacao'] ?? 'aberta') === 'fechada') {
                $this->pdo->commit();
                return [
                    'ok'                => true,
                    'sessao_id'         => $sessaoId,
                    'racha_id'          => $rachaId,
                    'status_convocacao' => 'fechada',
                    'idempotente'       => true
                ];
            }

            $stmtUp = $this->pdo->prepare("
                UPDATE racha_sessoes
                SET status_convocacao = 'fechada',
                    fechamento_convocacao_em = NOW(),
                    fechamento_convocacao_por_usuario_id = :usuario_id,
                    updated_at = NOW()
                WHERE id = :sessao_id AND racha_id = :racha_id
            ");
            $stmtUp->execute([
                ':usuario_id' => $usuarioId,
                ':sessao_id'  => $sessaoId,
                ':racha_id'   => $rachaId
            ]);

            $this->recordQueueEvent(
                $rachaId,
                $sessaoId,
                'fechamento_convocacao',
                $usuarioId,
                $motivoLimpo,
                [
                    'status_convocacao_anterior' => 'aberta',
                    'status_convocacao_novo'     => 'fechada',
                    'fechamento_em'              => date('Y-m-d H:i:s')
                ],
                null,
                null,
                'aberta',
                'fechada',
                'usuario'
            );

            $this->pdo->commit();

            return [
                'ok'                => true,
                'sessao_id'         => $sessaoId,
                'racha_id'          => $rachaId,
                'status_convocacao' => 'fechada'
            ];
        } catch (Throwable $e) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            throw $e;
        }
    }

    /**
     * Reabertura pré-jogo da convocação (Etapa 3C.3.1)
     * Reabre a coleta de intenções mediante justificativa obrigatória registrada em auditoria.
     */
    public function reopenConvocation(int $rachaId, int $sessaoId, int $usuarioId, string $motivo): array
    {
        $this->validateAuthorUser($usuarioId, 'reabertura de convocação');
        $motivoLimpo = (string)$this->validateMotivo($motivo, true, 'motivo de reabertura da convocação');

        $this->pdo->beginTransaction();
        try {
            $stmtSess = $this->pdo->prepare("
                SELECT id, racha_id, status, apuracao_presenca, status_convocacao
                FROM racha_sessoes
                WHERE id = :sessao_id AND racha_id = :racha_id
                FOR UPDATE
            ");
            $stmtSess->execute([':sessao_id' => $sessaoId, ':racha_id' => $rachaId]);
            $sessao = $stmtSess->fetch(PDO::FETCH_ASSOC);

            if (!$sessao) {
                throw new HttpError("Sessão #{$sessaoId} não encontrada para o racha #{$rachaId}.", 404);
            }
            if ($sessao['status'] === 'cancelada') {
                throw new HttpError("Operação rejeitada: a sessão #{$sessaoId} está cancelada.", 400);
            }
            if ($sessao['status'] === 'concluida') {
                throw new HttpError("Operação rejeitada: a sessão #{$sessaoId} já foi concluída.", 400);
            }

            if (($sessao['status_convocacao'] ?? 'aberta') === 'aberta') {
                $this->pdo->commit();
                return [
                    'ok'                => true,
                    'sessao_id'         => $sessaoId,
                    'racha_id'          => $rachaId,
                    'status_convocacao' => 'aberta',
                    'idempotente'       => true
                ];
            }

            $stmtUp = $this->pdo->prepare("
                UPDATE racha_sessoes
                SET status_convocacao = 'aberta',
                    fechamento_convocacao_em = NULL,
                    fechamento_convocacao_por_usuario_id = NULL,
                    updated_at = NOW()
                WHERE id = :sessao_id AND racha_id = :racha_id
            ");
            $stmtUp->execute([
                ':sessao_id' => $sessaoId,
                ':racha_id'  => $rachaId
            ]);

            $this->recordQueueEvent(
                $rachaId,
                $sessaoId,
                'reabertura_convocacao',
                $usuarioId,
                $motivoLimpo,
                [
                    'status_convocacao_anterior' => 'fechada',
                    'status_convocacao_novo'     => 'aberta',
                    'motivo_reabertura'          => $motivoLimpo
                ],
                null,
                null,
                'fechada',
                'aberta',
                'usuario'
            );

            $this->pdo->commit();

            return [
                'ok'                => true,
                'sessao_id'         => $sessaoId,
                'racha_id'          => $rachaId,
                'status_convocacao' => 'aberta'
            ];
        } catch (Throwable $e) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            throw $e;
        }
    }

    // =========================================================================
    // 4. REGISTRO DE INTENÇÃO, FILA DE ESPERA FIFO E PROMOÇÃO AUTOMÁTICA
    // =========================================================================

    /**
     * Localiza de forma inequívoca um participante convocado na sessão a partir de qualquer variação válida do número de WhatsApp.
     *
     * Regras de segurança de identidade (Etapa 3C.1.1):
     * - O nome de exibição do WhatsApp (`pushName`) NUNCA é usado para autenticar, localizar ou desambiguar um participante.
     * - Se o telefone informado estiver associado a mais de um convocado na sessão, a mais de um participante ativo no racha
     *   ou a mais de um jogador no cadastro global, lança conflito de ambiguidade (HTTP 409) mesmo que o nome de exibição coincida.
     */
    public function resolveConvokedParticipantByPhone(
        int $rachaId,
        int $sessaoId,
        string $incomingPhone,
        ?string $nomeExibicaoWhatsApp = null
    ): array {
        $vars = $this->getPhoneVariations($incomingPhone);
        if (empty($vars)) {
            throw new HttpError("Número de telefone inválido para busca na convocação.", 400);
        }

        $placeholders = implode(',', array_fill(0, count($vars), '?'));

        // 1. Verifica se há colisão/ambiguidade desse telefone no cadastro global de jogadores ou nos participantes do racha
        $sqlGlobal = "
            SELECT DISTINCT j.id, j.nome
            FROM jogadores j
            LEFT JOIN usuarios u ON u.id = j.usuario_id
            WHERE j.whatsapp IN ({$placeholders}) OR u.whatsapp IN ({$placeholders})
        ";
        $stmtGlobal = $this->pdo->prepare($sqlGlobal);
        $stmtGlobal->execute(array_merge($vars, $vars));
        $globalMatches = $stmtGlobal->fetchAll(PDO::FETCH_ASSOC);

        if (count($globalMatches) > 1) {
            throw new HttpError(
                "Ambiguidade de identidade: o telefone informado está vinculado a múltiplos jogadores no cadastro. Telefone compartilhado e nome de exibição do WhatsApp não são prova suficiente de identidade.",
                409
            );
        }

        $sqlRachaPart = "
            SELECT DISTINCT rp.jogador_id, j.nome
            FROM racha_participantes rp
            JOIN jogadores j ON j.id = rp.jogador_id
            LEFT JOIN usuarios u ON u.id = j.usuario_id
            WHERE rp.racha_id = ?
              AND rp.ativo = 1
              AND (j.whatsapp IN ({$placeholders}) OR u.whatsapp IN ({$placeholders}))
        ";
        $stmtRachaPart = $this->pdo->prepare($sqlRachaPart);
        $stmtRachaPart->execute(array_merge([$rachaId], $vars, $vars));
        $rachaMatches = $stmtRachaPart->fetchAll(PDO::FETCH_ASSOC);

        if (count($rachaMatches) > 1) {
            throw new HttpError(
                "Ambiguidade de identidade: múltiplos participantes ativos do racha #{$rachaId} utilizam o mesmo telefone.",
                409
            );
        }

        // 2. Busca o participante convocado na sessão
        $sql = "
            SELECT rsc.*, j.nome, j.posicao
            FROM racha_sessao_convocacoes rsc
            JOIN jogadores j ON j.id = rsc.jogador_id
            WHERE rsc.racha_id = ?
              AND rsc.sessao_id = ?
              AND rsc.telefone_destino IN ({$placeholders})
        ";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute(array_merge([$rachaId, $sessaoId], $vars));
        $matches = $stmt->fetchAll(PDO::FETCH_ASSOC);

        if (empty($matches)) {
            throw new HttpError("Nenhum participante convocado encontrado na sessão #{$sessaoId} para o telefone informado.", 404);
        }

        if (count($matches) > 1) {
            throw new HttpError(
                "Conflito de ambiguidade: múltiplos participantes convocados na sessão #{$sessaoId} com o mesmo telefone. Nome de exibição do WhatsApp não desambigua identidade.",
                409
            );
        }

        $convocado = $matches[0];

        // Se existe um jogador no cadastro global com este telefone, mas é um jogador diferente do convocado, bloqueia ambiguidade
        if (count($globalMatches) === 1 && (int)$globalMatches[0]['id'] !== (int)$convocado['jogador_id']) {
            throw new HttpError(
                "Conflito de identidade: o telefone da resposta pertence ao cadastro do jogador #{$globalMatches[0]['id']}, divergindo do convocado #{$convocado['jogador_id']}.",
                409
            );
        }

        return $convocado;
    }

    /**
     * Normaliza a intenção recebida ('SIM', 'NAO', 'NÃO', 'CANCELAR', 'DEPOIS') para o enum canônico ('sim', 'nao', 'depois').
     */
    private function normalizeIntentValue(string $rawIntent): string
    {
        $clean = strtoupper(trim($rawIntent));
        $clean = strtr($clean, ['Ã' => 'A', 'Á' => 'A', 'Â' => 'A']);

        return match ($clean) {
            'SIM', 'CONFIRMO', 'VOU'              => 'sim',
            'NAO', 'CANCELAR', 'DESISTIR', 'FORA' => 'nao',
            'DEPOIS', 'TALVEZ', 'A_CONFIRMAR'     => 'depois',
            default => throw new HttpError("Intenção inválida ('{$rawIntent}'). Valores aceitos: SIM, NAO, DEPOIS.", 400)
        };
    }

    /**
     * Calcula quantas vagas estão abertas para promoção da fila de espera nesta sessão (deve ser chamado sob lock FOR UPDATE da sessão).
     */
    private function calculateOpenVacanciesForQueueLocked(int $rachaId, int $sessaoId, int $limiteVagas): array
    {
        $stmt = $this->pdo->prepare("
            SELECT
                SUM(CASE WHEN tipo_participacao_convocacao = 'mensalista'
                          AND situacao_vaga IN ('aguardando_resposta', 'aguardando_confirmacao_tardia', 'vaga_reservada')
                         THEN 1 ELSE 0 END) AS mensalistas_ativos,
                SUM(CASE WHEN tipo_participacao_convocacao = 'mensalista'
                          AND situacao_vaga = 'vaga_liberada'
                         THEN 1 ELSE 0 END) AS mensalistas_liberaram_vaga,
                SUM(CASE WHEN tipo_participacao_convocacao != 'mensalista'
                          AND situacao_vaga = 'promovido_titular'
                         THEN 1 ELSE 0 END) AS avulsos_promovidos
            FROM racha_sessao_convocacoes
            WHERE racha_id = :racha_id AND sessao_id = :sessao_id
            FOR UPDATE
        ");
        $stmt->execute([':racha_id' => $rachaId, ':sessao_id' => $sessaoId]);
        $counts = $stmt->fetch(PDO::FETCH_ASSOC);

        $mensalistasAtivos = (int)($counts['mensalistas_ativos'] ?? 0);
        $mensalistasLiberaram = (int)($counts['mensalistas_liberaram_vaga'] ?? 0);
        $avulsosPromovidos = (int)($counts['avulsos_promovidos'] ?? 0);

        $capacidadeRestanteTotal = max(0, $limiteVagas - $mensalistasAtivos);
        $maxPromovidosPermitidos = min($mensalistasLiberaram, $capacidadeRestanteTotal);
        $vagasAbertasFila = max(0, $maxPromovidosPermitidos - $avulsosPromovidos);

        return [
            'limite_vagas'               => $limiteVagas,
            'mensalistas_ativos'         => $mensalistasAtivos,
            'mensalistas_liberaram_vaga' => $mensalistasLiberaram,
            'avulsos_promovidos'         => $avulsosPromovidos,
            'ocupacao_atual'             => $mensalistasAtivos + $avulsosPromovidos,
            'vagas_abertas_para_fila'    => $vagasAbertasFila
        ];
    }

    /**
     * Executa internamente (dentro da transação já aberta e com a sessão bloqueada) a promoção do 1º avulso elegível da fila.
     *
     * Por padrão (`$tipoAtorPromocao = 'sistema'`, `$usuarioIdPromocao = null`), a promoção automática derivada é gravada
     * como evento de autoria `'sistema'` sem atribuir a nenhum `usuario_id` humano fictício, referenciando a vaga liberada
     * e o evento/mensagem que originou a promoção.
     */
    private function promoteFirstEligibleFromQueueInternal(
        int $rachaId,
        int $sessaoId,
        ?int $usuarioIdPromocao,
        ?int $vagaAbertaPorJogadorId,
        int $limiteVagas,
        string $tipoAtorPromocao = 'sistema',
        ?string $mensagemExternaId = null,
        ?int $eventoOrigemId = null,
        string $origemAcionamento = 'promocao_automatica_fila'
    ): ?array {
        $cap = $this->calculateOpenVacanciesForQueueLocked($rachaId, $sessaoId, $limiteVagas);
        if ($cap['vagas_abertas_para_fila'] <= 0) {
            return null;
        }

        // Seleciona o 1º avulso elegível em `fila_espera` pela ordem monotônica de chegada (FIFO)
        $stmtFirst = $this->pdo->prepare("
            SELECT rsc.*, j.nome, j.posicao
            FROM racha_sessao_convocacoes rsc
            JOIN jogadores j ON j.id = rsc.jogador_id
            WHERE rsc.racha_id = :racha_id
              AND rsc.sessao_id = :sessao_id
              AND rsc.situacao_vaga = 'fila_espera'
            ORDER BY rsc.ordem_fila ASC
            LIMIT 1
            FOR UPDATE
        ");
        $stmtFirst->execute([':racha_id' => $rachaId, ':sessao_id' => $sessaoId]);
        $candidato = $stmtFirst->fetch(PDO::FETCH_ASSOC);

        if (!$candidato) {
            return null;
        }

        // Caso vagaAbertaPorJogadorId não tenha sido informado, identifica o mensalista que liberou vaga ainda não vinculada
        if ($vagaAbertaPorJogadorId === null) {
            $stmtLiberador = $this->pdo->prepare("
                SELECT rsc.jogador_id
                FROM racha_sessao_convocacoes rsc
                WHERE rsc.racha_id = :racha_id
                  AND rsc.sessao_id = :sessao_id
                  AND rsc.tipo_participacao_convocacao = 'mensalista'
                  AND rsc.situacao_vaga = 'vaga_liberada'
                  AND rsc.jogador_id NOT IN (
                      SELECT COALESCE(p.promovido_por_vaga_de_jogador_id, 0)
                      FROM racha_sessao_convocacoes p
                      WHERE p.racha_id = :racha_id2
                        AND p.sessao_id = :sessao_id2
                        AND p.situacao_vaga = 'promovido_titular'
                  )
                ORDER BY rsc.ultima_resposta_em ASC, rsc.id ASC
                LIMIT 1
            ");
            $stmtLiberador->execute([
                ':racha_id'   => $rachaId,
                ':sessao_id'  => $sessaoId,
                ':racha_id2'  => $rachaId,
                ':sessao_id2' => $sessaoId
            ]);
            $libRow = $stmtLiberador->fetch(PDO::FETCH_ASSOC);
            if ($libRow) {
                $vagaAbertaPorJogadorId = (int)$libRow['jogador_id'];
            }
        }

        $upProm = $this->pdo->prepare("
            UPDATE racha_sessao_convocacoes
            SET situacao_vaga = 'promovido_titular',
                promovido_em = NOW(6),
                promovido_por_vaga_de_jogador_id = :vaga_de,
                notificacao_promocao_pendente = 1,
                updated_at = NOW()
            WHERE id = :id AND racha_id = :racha_id AND sessao_id = :sessao_id
        ");
        $upProm->execute([
            ':vaga_de'   => $vagaAbertaPorJogadorId,
            ':id'        => $candidato['id'],
            ':racha_id'  => $rachaId,
            ':sessao_id' => $sessaoId
        ]);

        $eventoId = $this->recordQueueEvent(
            $rachaId,
            $sessaoId,
            'promocao_fila_espera',
            $usuarioIdPromocao,
            'Promoção automática do primeiro avulso elegível da fila de espera',
            [
                'convocacao_id'                    => (int)$candidato['id'],
                'jogador_promovido_id'             => (int)$candidato['jogador_id'],
                'nome_promovido'                   => (string)$candidato['nome'],
                'ordem_fila'                       => (int)$candidato['ordem_fila'],
                'promovido_por_vaga_de_jogador_id' => $vagaAbertaPorJogadorId,
                'evento_origem_id'                 => $eventoOrigemId,
                'origem_acionamento'               => $origemAcionamento,
                'mensagem_externa_id'              => $mensagemExternaId,
                'notificacao_promocao_pendente'    => true
            ],
            (int)$candidato['jogador_id'],
            $vagaAbertaPorJogadorId,
            'fila_espera',
            'promovido_titular',
            $tipoAtorPromocao,
            $mensagemExternaId
        );

        return [
            'promovido'                        => true,
            'convocacao_id'                    => (int)$candidato['id'],
            'jogador_id'                       => (int)$candidato['jogador_id'],
            'nome'                             => (string)$candidato['nome'],
            'posicao'                          => (string)$candidato['posicao'],
            'ordem_fila'                       => (int)$candidato['ordem_fila'],
            'situacao_vaga'                    => 'promovido_titular',
            'promovido_por_vaga_de_jogador_id' => $vagaAbertaPorJogadorId,
            'notificacao_promocao_pendente'    => true,
            'tipo_ator_evento'                 => $tipoAtorPromocao,
            'usuario_id_evento'                => $usuarioIdPromocao,
            'evento_origem_id'                 => $eventoOrigemId,
            'evento_id'                        => $eventoId
        ];
    }

    /**
     * Registra uma resposta automática recebida via WhatsApp a partir do telefone do remetente e do ID externo da mensagem.
     *
     * Regras (Etapa 3C.1.1):
     * - Não recebe nem inventa `usuario_id` humano (grava eventos de intenção/fila/recusa com `tipo_ator = 'jogador_whatsapp'` e `usuario_id = NULL`).
     * - Exige `mensagemExternaId` único para idempotência e rastreabilidade.
     * - Resolve o participante convocado de forma inequívoca pelo telefone normalizado; rejeita qualquer ambiguidade (HTTP 409)
     *   mesmo que o nome de exibição do WhatsApp (`pushName`) seja informado.
     * - Caso a resposta dispare promoção automática da fila, o evento de promoção é gravado na mesma transação com `tipo_ator = 'sistema'` e `usuario_id = NULL`.
     */
    public function recordWhatsAppParticipantIntentByPhone(
        int $rachaId,
        int $sessaoId,
        string $telefoneRemetente,
        string $intencao,
        string $mensagemExternaId,
        ?string $nomeExibicaoWhatsApp = null,
        ?string $observacao = null
    ): array {
        $msgIdLimpo = trim($mensagemExternaId);
        if ($msgIdLimpo === '') {
            throw new HttpError("O identificador externo da mensagem do WhatsApp (mensagemExternaId) é obrigatório para eventos automáticos.", 400);
        }

        $convocado = $this->resolveConvokedParticipantByPhone(
            $rachaId,
            $sessaoId,
            $telefoneRemetente,
            $nomeExibicaoWhatsApp
        );

        return $this->recordParticipantIntent(
            $rachaId,
            $sessaoId,
            (int)$convocado['jogador_id'],
            $intencao,
            null,
            $msgIdLimpo,
            $observacao,
            'jogador_whatsapp'
        );
    }

    /**
     * Registra a intenção de participação ('SIM', 'NAO', 'DEPOIS') de um participante convocado na sessão.
     *
     * Regras:
     * - Suporta tanto ação manual de organizador (`$tipoAtor = 'usuario'`, exigindo `$usuarioId` válido e ativo)
     *   quanto resposta automática identificada via WhatsApp (`$tipoAtor = 'jogador_whatsapp'`, exigindo `$usuarioId === null`).
     * - Opera sob transação atômica com bloqueio pessimista (`FOR UPDATE`) na sessão e no contador da fila.
     * - Trata idempotência por `chaveIdempotencia` (message ID) e por estado atual (repetição da mesma intenção).
     * - NUNCA grava `racha_sessao_presencas.status_presenca = 'presente'` ao receber 'SIM'.
     * - Quando uma resposta dispara promoção automática do 1º avulso elegível da fila, a promoção ocorre na mesma transação
     *   e seu evento `promocao_fila_espera` é gravado com `tipo_ator = 'sistema'` e `usuario_id = NULL`.
     */
    public function recordParticipantIntent(
        int $rachaId,
        int $sessaoId,
        int $jogadorId,
        string $intencao,
        ?int $usuarioId = null,
        ?string $chaveIdempotencia = null,
        ?string $observacao = null,
        string $tipoAtor = 'usuario'
    ): array {
        if (!in_array($tipoAtor, ['usuario', 'jogador_whatsapp'], true)) {
            throw new HttpError(
                "Tipo de ator inválido ('{$tipoAtor}') para registro de intenção. Permitidos: 'usuario' ou 'jogador_whatsapp'.",
                400
            );
        }

        $this->validateEventAuthorship($tipoAtor, $usuarioId, $jogadorId, 'registro de intenção de participação');

        $intencaoNorm = $this->normalizeIntentValue($intencao);
        $chaveLimpa = ($chaveIdempotencia !== null && trim($chaveIdempotencia) !== '')
            ? trim($chaveIdempotencia)
            : null;
        $obsValidada = $this->validateMotivo($observacao, false, 'observação da intenção');

        $this->pdo->beginTransaction();
        try {
            // 1. Bloqueia a sessão e verifica escopo e estado operacional
            $stmtSess = $this->pdo->prepare("
                SELECT rs.id, rs.racha_id, rs.status, rs.apuracao_presenca, rs.status_convocacao, r.limite_vagas
                FROM racha_sessoes rs
                JOIN rachas r ON r.id = rs.racha_id
                WHERE rs.id = :sessao_id AND rs.racha_id = :racha_id
                FOR UPDATE
            ");
            $stmtSess->execute([':sessao_id' => $sessaoId, ':racha_id' => $rachaId]);
            $sessao = $stmtSess->fetch(PDO::FETCH_ASSOC);

            if (!$sessao) {
                throw new HttpError("Sessão #{$sessaoId} não encontrada para o racha #{$rachaId}.", 404);
            }

            if ($sessao['status'] === 'cancelada') {
                throw new HttpError("Operação rejeitada: a sessão #{$sessaoId} está cancelada.", 400);
            }

            if ($sessao['status'] === 'concluida') {
                throw new HttpError("Operação rejeitada: a sessão #{$sessaoId} já foi concluída.", 400);
            }

            if ($sessao['apuracao_presenca'] === 'homologada') {
                throw new HttpError("Operação rejeitada: a lista da sessão #{$sessaoId} já foi homologada. Reabra a lista para registrar alterações.", 409);
            }

            $limiteVagas = (int)$sessao['limite_vagas'];

            // 2. Garante e bloqueia o contador monotônico da fila desta sessão
            $stmtEnsureCnt = $this->pdo->prepare("
                INSERT INTO racha_sessao_fila_contadores (sessao_id, racha_id, ultimo_sequencial_fila)
                VALUES (:sessao_id, :racha_id, 0)
                ON DUPLICATE KEY UPDATE sessao_id = VALUES(sessao_id)
            ");
            $stmtEnsureCnt->execute([':sessao_id' => $sessaoId, ':racha_id' => $rachaId]);

            $stmtLockCnt = $this->pdo->prepare("
                SELECT ultimo_sequencial_fila
                FROM racha_sessao_fila_contadores
                WHERE sessao_id = :sessao_id AND racha_id = :racha_id
                FOR UPDATE
            ");
            $stmtLockCnt->execute([':sessao_id' => $sessaoId, ':racha_id' => $rachaId]);
            $stmtLockCnt->fetch(PDO::FETCH_ASSOC);

            // 3. Verifica idempotência por chave de mensagem (quando fornecida)
            if ($chaveLimpa !== null) {
                $stmtIdemp = $this->pdo->prepare("
                    SELECT id, jogador_id, intencao_processada, resultado_resumo
                    FROM racha_sessao_respostas_idempotencia
                    WHERE racha_id = :racha_id AND sessao_id = :sessao_id AND chave_idempotencia = :chave
                    FOR UPDATE
                ");
                $stmtIdemp->execute([
                    ':racha_id'  => $rachaId,
                    ':sessao_id' => $sessaoId,
                    ':chave'     => $chaveLimpa
                ]);
                $existingIdemp = $stmtIdemp->fetch(PDO::FETCH_ASSOC);

                if ($existingIdemp) {
                    $cached = ($existingIdemp['resultado_resumo'] !== null && $existingIdemp['resultado_resumo'] !== '')
                        ? json_decode((string)$existingIdemp['resultado_resumo'], true)
                        : [];
                    $this->pdo->commit();
                    return array_merge(is_array($cached) ? $cached : [], [
                        'idempotente'        => true,
                        'chave_idempotencia' => $chaveLimpa
                    ]);
                }
            }

            // 4. Bloqueia o registro de convocação do participante na sessão
            $stmtConv = $this->pdo->prepare("
                SELECT rsc.*, j.nome, j.posicao
                FROM racha_sessao_convocacoes rsc
                JOIN jogadores j ON j.id = rsc.jogador_id
                WHERE rsc.racha_id = :racha_id AND rsc.sessao_id = :sessao_id AND rsc.jogador_id = :jogador_id
                FOR UPDATE
            ");
            $stmtConv->execute([
                ':racha_id'   => $rachaId,
                ':sessao_id'  => $sessaoId,
                ':jogador_id' => $jogadorId
            ]);
            $conv = $stmtConv->fetch(PDO::FETCH_ASSOC);

            if (!$conv) {
                throw new HttpError("Participante #{$jogadorId} não está convocado na sessão #{$sessaoId} do racha #{$rachaId}.", 404);
            }

            $intencaoAnterior = (string)$conv['intencao_atual'];
            $situacaoAnterior = (string)$conv['situacao_vaga'];
            $tipoPart = (string)$conv['tipo_participacao_convocacao'];
            $ordemFilaAtual = $conv['ordem_fila'] !== null ? (int)$conv['ordem_fila'] : null;

            // 5. Idempotência por estado: se a intenção atual já é idêntica à recebida, ou se já cancelou, não altera fila nem duplica eventos
            $jaCancelado = ($intencaoNorm === 'nao' && ($intencaoAnterior === 'nao' || in_array($situacaoAnterior, ['vaga_liberada', 'recusou_sem_vaga'], true)));
            if ($intencaoAnterior === $intencaoNorm || $jaCancelado) {
                $noopResult = [
                    'idempotente'          => true,
                    'ja_cancelado'         => $jaCancelado,
                    'racha_id'             => $rachaId,
                    'sessao_id'            => $sessaoId,
                    'jogador_id'           => $jogadorId,
                    'nome'                 => (string)$conv['nome'],
                    'tipo_participacao'    => $tipoPart,
                    'tipo_ator'            => $tipoAtor,
                    'usuario_id'           => $usuarioId,
                    'mensagem_externa_id'  => $chaveLimpa,
                    'intencao_anterior'    => $intencaoAnterior,
                    'intencao_atual'       => $intencaoNorm,
                    'situacao_vaga'        => $situacaoAnterior,
                    'ordem_fila'           => $ordemFilaAtual,
                    'vaga_liberada'        => false,
                    'promocao_automatica'  => null
                ];

                if ($chaveLimpa !== null) {
                    $insIdemp = $this->pdo->prepare("
                        INSERT INTO racha_sessao_respostas_idempotencia (
                            racha_id, sessao_id, jogador_id, chave_idempotencia, intencao_processada, resultado_resumo
                        ) VALUES (
                            :racha_id, :sessao_id, :jogador_id, :chave, :intencao, :resumo
                        )
                    ");
                    $insIdemp->execute([
                        ':racha_id'   => $rachaId,
                        ':sessao_id'  => $sessaoId,
                        ':jogador_id' => $jogadorId,
                        ':chave'      => $chaveLimpa,
                        ':intencao'   => $intencaoNorm,
                        ':resumo'     => json_encode($noopResult, JSON_UNESCAPED_UNICODE)
                    ]);
                }

                $this->pdo->commit();
                return $noopResult;
            }

            // 5.1. Convocação fechada: confirmações ('sim') ou dúvidas ('depois') recebidas após o fechamento
            // são tratadas como tardias, não alteram a lista titular fechada e não acionam fila de espera.
            // Já o CANCELAMENTO / DESISTÊNCIA ('nao') é sempre processado mesmo após o fechamento da convocação,
            // liberando a vaga ocupada e promovendo o primeiro avulso da fila FIFO (Seção 4).
            if (($sessao['status_convocacao'] ?? 'aberta') === 'fechada' && $intencaoNorm !== 'nao') {
                $novaSituacao = 'aguardando_confirmacao_tardia';
                $up = $this->pdo->prepare("
                    UPDATE racha_sessao_convocacoes
                    SET intencao_atual = :intencao,
                        situacao_vaga = :situacao,
                        primeira_resposta_em = COALESCE(primeira_resposta_em, NOW(6)),
                        ultima_resposta_em = NOW(6),
                        ultima_mensagem_id = COALESCE(:msg_id, ultima_mensagem_id),
                        updated_at = NOW()
                    WHERE id = :id
                ");
                $up->execute([
                    ':intencao'  => $intencaoNorm,
                    ':situacao' => $novaSituacao,
                    ':msg_id'   => $chaveLimpa,
                    ':id'       => $conv['id']
                ]);

                $this->recordQueueEvent(
                    $rachaId,
                    $sessaoId,
                    'resposta_tardia_convocacao',
                    $usuarioId,
                    $obsValidada ?? "Resposta recebida após o fechamento da convocação ({$intencaoNorm})",
                    [
                        'intencao_anterior' => $intencaoAnterior,
                        'intencao_nova'     => $intencaoNorm,
                        'tipo_participacao' => $tipoPart,
                        'tipo_ator'         => $tipoAtor,
                        'chave_idempotencia'=> $chaveLimpa,
                        'aviso'             => 'Convocação fechada: não houve alteração nos titulares nem promoção de fila'
                    ],
                    $jogadorId,
                    null,
                    $situacaoAnterior,
                    $novaSituacao,
                    $tipoAtor,
                    $chaveLimpa
                );

                $lateResult = [
                    'idempotente'          => false,
                    'resposta_tardia'      => true,
                    'racha_id'             => $rachaId,
                    'sessao_id'            => $sessaoId,
                    'jogador_id'           => $jogadorId,
                    'nome'                 => (string)$conv['nome'],
                    'tipo_participacao'    => $tipoPart,
                    'tipo_ator'            => $tipoAtor,
                    'usuario_id'           => $usuarioId,
                    'mensagem_externa_id'  => $chaveLimpa,
                    'intencao_anterior'    => $intencaoAnterior,
                    'intencao_atual'       => $intencaoNorm,
                    'situacao_anterior'    => $situacaoAnterior,
                    'situacao_vaga'        => $novaSituacao,
                    'ordem_fila'           => $ordemFilaAtual,
                    'vaga_liberada'        => false,
                    'promocao_automatica'  => null
                ];

                if ($chaveLimpa !== null) {
                    $insIdemp = $this->pdo->prepare("
                        INSERT INTO racha_sessao_respostas_idempotencia (
                            racha_id, sessao_id, jogador_id, chave_idempotencia, intencao_processada, resultado_resumo
                        ) VALUES (
                            :racha_id, :sessao_id, :jogador_id, :chave, :intencao, :resumo
                        )
                    ");
                    $insIdemp->execute([
                        ':racha_id'   => $rachaId,
                        ':sessao_id'  => $sessaoId,
                        ':jogador_id' => $jogadorId,
                        ':chave'      => $chaveLimpa,
                        ':intencao'   => $intencaoNorm,
                        ':resumo'     => json_encode($lateResult, JSON_UNESCAPED_UNICODE)
                    ]);
                }

                $this->pdo->commit();
                return $lateResult;
            }

            $novaSituacao = $situacaoAnterior;
            $novaOrdemFila = $ordemFilaAtual;
            $liberouVaga = false;
            $promocaoAutomatica = null;

            // 6. Processa a transição conforme a intenção ('depois', 'sim', 'nao')
            if ($intencaoNorm === 'depois') {
                if (in_array($situacaoAnterior, ['vaga_reservada', 'fila_espera', 'promovido_titular'], true)) {
                    throw new HttpError(
                        "Transição inválida: o participante #{$jogadorId} já confirmou participação ('{$situacaoAnterior}'). Para desistir, registre NÃO.",
                        409
                    );
                }

                $novaSituacao = 'aguardando_confirmacao_tardia';

                $up = $this->pdo->prepare("
                    UPDATE racha_sessao_convocacoes
                    SET intencao_atual = 'depois',
                        situacao_vaga = :situacao,
                        primeira_resposta_em = COALESCE(primeira_resposta_em, NOW(6)),
                        ultima_resposta_em = NOW(6),
                        ultima_mensagem_id = COALESCE(:msg_id, ultima_mensagem_id),
                        updated_at = NOW()
                    WHERE id = :id
                ");
                $up->execute([
                    ':situacao' => $novaSituacao,
                    ':msg_id'   => $chaveLimpa,
                    ':id'       => $conv['id']
                ]);

                $this->recordQueueEvent(
                    $rachaId,
                    $sessaoId,
                    'intencao_recebida',
                    $usuarioId,
                    $obsValidada ?? 'Participante respondeu DEPOIS à convocação',
                    [
                        'intencao_anterior' => $intencaoAnterior,
                        'intencao_nova'     => 'depois',
                        'tipo_participacao' => $tipoPart,
                        'tipo_ator'         => $tipoAtor,
                        'chave_idempotencia'=> $chaveLimpa
                    ],
                    $jogadorId,
                    null,
                    $situacaoAnterior,
                    $novaSituacao,
                    $tipoAtor,
                    $chaveLimpa
                );
            } elseif ($intencaoNorm === 'sim') {
                if ($tipoPart === 'mensalista') {
                    // Verifica ocupação de vagas caso o mensalista tenha desistido antes ou se a capacidade foi atingida
                    $cap = $this->calculateOpenVacanciesForQueueLocked($rachaId, $sessaoId, $limiteVagas);

                    if ($situacaoAnterior === 'vaga_liberada') {
                        // Se já havia desistido e a vaga dele foi ocupada por um avulso promovido (ou capacidade lotada), bloqueia
                        if ($cap['ocupacao_atual'] >= $limiteVagas || $cap['vagas_abertas_para_fila'] <= 0) {
                            throw new HttpError(
                                "Conflito de vaga: o mensalista #{$jogadorId} havia liberado sua vaga anteriormente e ela já foi ocupada.",
                                409
                            );
                        }
                    } else {
                        // O mensalista já estava contado em mensalistas_ativos; verifica apenas se a capacidade total permite
                        $ocupadosPorOutros = ($cap['mensalistas_ativos'] - 1) + $cap['avulsos_promovidos'];
                        if ($ocupadosPorOutros >= $limiteVagas) {
                            throw new HttpError("Capacidade máxima de vagas ({$limiteVagas}) da sessão #{$sessaoId} já foi atingida.", 409);
                        }
                    }

                    $novaSituacao = 'vaga_reservada';

                    $up = $this->pdo->prepare("
                        UPDATE racha_sessao_convocacoes
                        SET intencao_atual = 'sim',
                            situacao_vaga = 'vaga_reservada',
                            primeira_resposta_em = COALESCE(primeira_resposta_em, NOW(6)),
                            ultima_resposta_em = NOW(6),
                            ultima_mensagem_id = COALESCE(:msg_id, ultima_mensagem_id),
                            updated_at = NOW()
                        WHERE id = :id
                    ");
                    $up->execute([
                        ':msg_id' => $chaveLimpa,
                        ':id'     => $conv['id']
                    ]);

                    $this->recordQueueEvent(
                        $rachaId,
                        $sessaoId,
                        'intencao_recebida',
                        $usuarioId,
                        $obsValidada ?? 'Mensalista confirmou intenção (SIM) e reservou sua vaga prioritária',
                        [
                            'intencao_anterior' => $intencaoAnterior,
                            'intencao_nova'     => 'sim',
                            'tipo_participacao' => 'mensalista',
                            'tipo_ator'         => $tipoAtor,
                            'chave_idempotencia'=> $chaveLimpa
                        ],
                        $jogadorId,
                        null,
                        $situacaoAnterior,
                        'vaga_reservada',
                        $tipoAtor,
                        $chaveLimpa
                    );
                } else {
                    // Avulso ('avulso_recorrente' ou 'avulso_convidado'): entra na fila de espera com ordem monotônica FIFO
                    $upCnt = $this->pdo->prepare("
                        UPDATE racha_sessao_fila_contadores
                        SET ultimo_sequencial_fila = ultimo_sequencial_fila + 1
                        WHERE sessao_id = :sessao_id AND racha_id = :racha_id
                    ");
                    $upCnt->execute([':sessao_id' => $sessaoId, ':racha_id' => $rachaId]);

                    $stmtGetSeq = $this->pdo->prepare("
                        SELECT ultimo_sequencial_fila
                        FROM racha_sessao_fila_contadores
                        WHERE sessao_id = :sessao_id AND racha_id = :racha_id
                    ");
                    $stmtGetSeq->execute([':sessao_id' => $sessaoId, ':racha_id' => $rachaId]);
                    $novaOrdemFila = (int)$stmtGetSeq->fetchColumn();

                    $novaSituacao = 'fila_espera';

                    $up = $this->pdo->prepare("
                        UPDATE racha_sessao_convocacoes
                        SET intencao_atual = 'sim',
                            situacao_vaga = 'fila_espera',
                            ordem_fila = :ordem_fila,
                            entrada_fila_em = NOW(6),
                            primeira_resposta_em = COALESCE(primeira_resposta_em, NOW(6)),
                            ultima_resposta_em = NOW(6),
                            ultima_mensagem_id = COALESCE(:msg_id, ultima_mensagem_id),
                            updated_at = NOW()
                        WHERE id = :id
                    ");
                    $up->execute([
                        ':ordem_fila' => $novaOrdemFila,
                        ':msg_id'     => $chaveLimpa,
                        ':id'         => $conv['id']
                    ]);

                    $this->recordQueueEvent(
                        $rachaId,
                        $sessaoId,
                        'intencao_recebida',
                        $usuarioId,
                        $obsValidada ?? 'Avulso confirmou intenção (SIM)',
                        [
                            'intencao_anterior' => $intencaoAnterior,
                            'intencao_nova'     => 'sim',
                            'tipo_participacao' => $tipoPart,
                            'tipo_ator'         => $tipoAtor,
                            'ordem_fila'        => $novaOrdemFila,
                            'chave_idempotencia'=> $chaveLimpa
                        ],
                        $jogadorId,
                        null,
                        $situacaoAnterior,
                        'fila_espera',
                        $tipoAtor,
                        $chaveLimpa
                    );

                    $eventoEntradaFilaId = $this->recordQueueEvent(
                        $rachaId,
                        $sessaoId,
                        'entrada_fila_espera',
                        $usuarioId,
                        "Avulso entrou na fila de espera na posição #{$novaOrdemFila}",
                        [
                            'jogador_id'        => $jogadorId,
                            'nome'              => (string)$conv['nome'],
                            'tipo_participacao' => $tipoPart,
                            'tipo_ator'         => $tipoAtor,
                            'ordem_fila'        => $novaOrdemFila
                        ],
                        $jogadorId,
                        null,
                        $situacaoAnterior,
                        'fila_espera',
                        $tipoAtor,
                        $chaveLimpa
                    );

                    // Se já havia uma vaga liberada por desistência prévia de mensalista ainda não preenchida, promove automaticamente (tipo_ator = 'sistema', usuario_id = NULL)
                    $promocaoAutomatica = $this->promoteFirstEligibleFromQueueInternal(
                        $rachaId,
                        $sessaoId,
                        null,
                        null,
                        $limiteVagas,
                        'sistema',
                        $chaveLimpa,
                        $eventoEntradaFilaId,
                        'entrada_fila_com_vaga_aberta'
                    );

                    if ($promocaoAutomatica !== null && (int)$promocaoAutomatica['jogador_id'] === $jogadorId) {
                        $novaSituacao = 'promovido_titular';
                    }
                }
            } elseif ($intencaoNorm === 'nao') {
                // Verifica se o participante detinha reserva/vaga titular
                $detinhaVagaTitular = (
                    ($tipoPart === 'mensalista' && in_array($situacaoAnterior, ['aguardando_resposta', 'aguardando_confirmacao_tardia', 'vaga_reservada'], true))
                    || ($tipoPart !== 'mensalista' && $situacaoAnterior === 'promovido_titular')
                );

                if ($detinhaVagaTitular) {
                    $liberouVaga = true;
                    $novaSituacao = 'vaga_liberada';
                    $vagaDeOrigemId = ($tipoPart === 'mensalista')
                        ? $jogadorId
                        : ($conv['promovido_por_vaga_de_jogador_id'] !== null ? (int)$conv['promovido_por_vaga_de_jogador_id'] : $jogadorId);

                    $up = $this->pdo->prepare("
                        UPDATE racha_sessao_convocacoes
                        SET intencao_atual = 'nao',
                            situacao_vaga = 'vaga_liberada',
                            notificacao_promocao_pendente = 0,
                            primeira_resposta_em = COALESCE(primeira_resposta_em, NOW(6)),
                            ultima_resposta_em = NOW(6),
                            ultima_mensagem_id = COALESCE(:msg_id, ultima_mensagem_id),
                            updated_at = NOW()
                        WHERE id = :id
                    ");
                    $up->execute([
                        ':msg_id' => $chaveLimpa,
                        ':id'     => $conv['id']
                    ]);

                    $this->recordQueueEvent(
                        $rachaId,
                        $sessaoId,
                        'intencao_recebida',
                        $usuarioId,
                        $obsValidada ?? 'Participante informou que não participará (NÃO)',
                        [
                            'intencao_anterior' => $intencaoAnterior,
                            'intencao_nova'     => 'nao',
                            'tipo_participacao' => $tipoPart,
                            'tipo_ator'         => $tipoAtor,
                            'liberou_vaga'      => true,
                            'chave_idempotencia'=> $chaveLimpa
                        ],
                        $jogadorId,
                        null,
                        $situacaoAnterior,
                        'vaga_liberada',
                        $tipoAtor,
                        $chaveLimpa
                    );

                    $eventoRecusaId = $this->recordQueueEvent(
                        $rachaId,
                        $sessaoId,
                        'recusa_convocacao',
                        $usuarioId,
                        'Desistência registrada com liberação de vaga na sessão',
                        [
                            'jogador_id'        => $jogadorId,
                            'nome'              => (string)$conv['nome'],
                            'tipo_participacao' => $tipoPart,
                            'tipo_ator'         => $tipoAtor,
                            'liberou_vaga'      => true
                        ],
                        $jogadorId,
                        null,
                        $situacaoAnterior,
                        'vaga_liberada',
                        $tipoAtor,
                        $chaveLimpa
                    );

                    // Promove automaticamente o primeiro avulso elegível da fila de espera com autoria 'sistema' (usuario_id = NULL)
                    $promocaoAutomatica = $this->promoteFirstEligibleFromQueueInternal(
                        $rachaId,
                        $sessaoId,
                        null,
                        $vagaDeOrigemId,
                        $limiteVagas,
                        'sistema',
                        $chaveLimpa,
                        $eventoRecusaId,
                        'desistencia_titular'
                    );
                } else {
                    // Avulso que estava aguardando resposta ou na fila de espera (sem ocupar vaga titular)
                    // Preserva `ordem_fila` intacta para que a sequência nunca retroceda nem seja reutilizada!
                    $liberouVaga = false;
                    $novaSituacao = 'recusou_sem_vaga';

                    $up = $this->pdo->prepare("
                        UPDATE racha_sessao_convocacoes
                        SET intencao_atual = 'nao',
                            situacao_vaga = 'recusou_sem_vaga',
                            primeira_resposta_em = COALESCE(primeira_resposta_em, NOW(6)),
                            ultima_resposta_em = NOW(6),
                            ultima_mensagem_id = COALESCE(:msg_id, ultima_mensagem_id),
                            updated_at = NOW()
                        WHERE id = :id
                    ");
                    $up->execute([
                        ':msg_id' => $chaveLimpa,
                        ':id'     => $conv['id']
                    ]);

                    $this->recordQueueEvent(
                        $rachaId,
                        $sessaoId,
                        'intencao_recebida',
                        $usuarioId,
                        $obsValidada ?? 'Avulso informou que não participará (NÃO)',
                        [
                            'intencao_anterior'     => $intencaoAnterior,
                            'intencao_nova'         => 'nao',
                            'tipo_participacao'     => $tipoPart,
                            'tipo_ator'             => $tipoAtor,
                            'liberou_vaga'          => false,
                            'ordem_fila_preservada' => $ordemFilaAtual,
                            'chave_idempotencia'    => $chaveLimpa
                        ],
                        $jogadorId,
                        null,
                        $situacaoAnterior,
                        'recusou_sem_vaga',
                        $tipoAtor,
                        $chaveLimpa
                    );

                    $this->recordQueueEvent(
                        $rachaId,
                        $sessaoId,
                        'recusa_convocacao',
                        $usuarioId,
                        'Recusa/desistência de avulso sem liberação de vaga titular',
                        [
                            'jogador_id'            => $jogadorId,
                            'nome'                  => (string)$conv['nome'],
                            'tipo_participacao'     => $tipoPart,
                            'tipo_ator'             => $tipoAtor,
                            'liberou_vaga'          => false,
                            'ordem_fila_preservada' => $ordemFilaAtual
                        ],
                        $jogadorId,
                        null,
                        $situacaoAnterior,
                        'recusou_sem_vaga',
                        $tipoAtor,
                        $chaveLimpa
                    );
                }
            }

            $result = [
                'idempotente'         => false,
                'racha_id'            => $rachaId,
                'sessao_id'           => $sessaoId,
                'jogador_id'          => $jogadorId,
                'nome'                => (string)$conv['nome'],
                'tipo_participacao'   => $tipoPart,
                'tipo_ator'           => $tipoAtor,
                'usuario_id'          => $usuarioId,
                'mensagem_externa_id' => $chaveLimpa,
                'intencao_anterior'   => $intencaoAnterior,
                'intencao_atual'      => $intencaoNorm,
                'situacao_anterior'   => $situacaoAnterior,
                'situacao_vaga'       => $novaSituacao,
                'ordem_fila'          => $novaOrdemFila,
                'vaga_liberada'       => $liberouVaga,
                'promocao_automatica' => $promocaoAutomatica
            ];

            if ($chaveLimpa !== null) {
                $insIdemp = $this->pdo->prepare("
                    INSERT INTO racha_sessao_respostas_idempotencia (
                        racha_id, sessao_id, jogador_id, chave_idempotencia, intencao_processada, resultado_resumo
                    ) VALUES (
                        :racha_id, :sessao_id, :jogador_id, :chave, :intencao, :resumo
                    )
                ");
                $insIdemp->execute([
                    ':racha_id'   => $rachaId,
                    ':sessao_id'  => $sessaoId,
                    ':jogador_id' => $jogadorId,
                    ':chave'      => $chaveLimpa,
                    ':intencao'   => $intencaoNorm,
                    ':resumo'     => json_encode($result, JSON_UNESCAPED_UNICODE)
                ]);
            }

            $this->pdo->commit();
            return $result;
        } catch (PDOException $e) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            if ($e->getCode() === '23000' || strpos($e->getMessage(), '1062') !== false) {
                throw new HttpError("Conflito de concorrência/idempotência ao processar intenção na sessão #{$sessaoId}.", 409);
            }
            throw $e;
        } catch (Throwable $e) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            throw $e;
        }
    }

    /**
     * Promove transacionalmente e de forma idempotente o primeiro avulso elegível da fila quando houver vaga aberta.
     *
     * Suporta tanto acionamento manual de organizador (`$tipoAtor = 'usuario'`, exigindo `$usuarioId` válido e ativo)
     * quanto acionamento automático do sistema (`$tipoAtor = 'sistema'`, exigindo `$usuarioId === null`).
     */
    public function promoteNextEligibleAvulso(
        int $rachaId,
        int $sessaoId,
        ?int $usuarioId = null,
        ?int $vagaAbertaPorJogadorId = null,
        string $tipoAtor = 'usuario',
        ?string $mensagemExternaId = null
    ): array {
        if (!in_array($tipoAtor, ['usuario', 'sistema'], true)) {
            throw new HttpError(
                "Tipo de ator inválido ('{$tipoAtor}') para promoção da fila. Permitidos: 'usuario' ou 'sistema'.",
                400
            );
        }

        $this->validateEventAuthorship($tipoAtor, $usuarioId, null, 'promoção de avulso da fila de espera');

        $this->pdo->beginTransaction();
        try {
            $stmtSess = $this->pdo->prepare("
                SELECT rs.id, rs.racha_id, rs.status, rs.apuracao_presenca, r.limite_vagas
                FROM racha_sessoes rs
                JOIN rachas r ON r.id = rs.racha_id
                WHERE rs.id = :sessao_id AND rs.racha_id = :racha_id
                FOR UPDATE
            ");
            $stmtSess->execute([':sessao_id' => $sessaoId, ':racha_id' => $rachaId]);
            $sessao = $stmtSess->fetch(PDO::FETCH_ASSOC);

            if (!$sessao) {
                throw new HttpError("Sessão #{$sessaoId} não encontrada para o racha #{$rachaId}.", 404);
            }

            if (in_array($sessao['status'], ['cancelada', 'concluida'], true)) {
                throw new HttpError("Não é permitido promover da fila em sessão {$sessao['status']}.", 400);
            }

            if ($sessao['apuracao_presenca'] === 'homologada') {
                throw new HttpError("A lista da sessão #{$sessaoId} está homologada. Reabra antes de promover.", 409);
            }

            $promovido = $this->promoteFirstEligibleFromQueueInternal(
                $rachaId,
                $sessaoId,
                $usuarioId,
                $vagaAbertaPorJogadorId,
                (int)$sessao['limite_vagas'],
                $tipoAtor,
                $mensagemExternaId,
                null,
                $tipoAtor === 'sistema' ? 'acionamento_automatico_sistema' : 'acionamento_manual_organizador'
            );

            $this->pdo->commit();

            if ($promovido === null) {
                return [
                    'promovido'   => false,
                    'idempotente' => true,
                    'racha_id'    => $rachaId,
                    'sessao_id'   => $sessaoId,
                    'motivo'      => 'Nenhuma vaga disponível ou nenhum avulso aguardando na fila de espera.'
                ];
            }

            return array_merge($promovido, [
                'idempotente' => false,
                'racha_id'    => $rachaId,
                'sessao_id'   => $sessaoId
            ]);
        } catch (Throwable $e) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            throw $e;
        }
    }

    // =========================================================================
    // 5. CONSULTA DE SITUAÇÃO DA CONVOCAÇÃO, FILA DE ESPERA E PENDENTES
    // =========================================================================

    /**
     * Consulta o panorama completo da convocação da sessão:
     * - Titulares planejados (mensalistas com vaga reservada e avulsos promovidos)
     * - Fila de espera ordenada por `ordem_fila ASC`
     * - Pendentes que ainda não responderam (ou responderam DEPOIS) — mantidos pendentes sem conversão automática em falta
     * - Recusas / desistências
     * - Resumo de capacidade e vagas
     */
    public function getSessionQueueAndConvocationStatus(int $rachaId, int $sessaoId): array
    {
        $stmtSess = $this->pdo->prepare("
            SELECT rs.id, rs.racha_id, rs.data_racha, rs.status, rs.apuracao_presenca, rs.status_convocacao, rs.fechamento_convocacao_em, r.limite_vagas
            FROM racha_sessoes rs
            JOIN rachas r ON r.id = rs.racha_id
            WHERE rs.id = :sessao_id AND rs.racha_id = :racha_id
        ");
        $stmtSess->execute([':sessao_id' => $sessaoId, ':racha_id' => $rachaId]);
        $sessao = $stmtSess->fetch(PDO::FETCH_ASSOC);

        if (!$sessao) {
            throw new HttpError("Sessão #{$sessaoId} não encontrada para o racha #{$rachaId}.", 404);
        }

        $stmtRows = $this->pdo->prepare("
            SELECT rsc.*, j.nome, j.posicao, j.apelido_bot
            FROM racha_sessao_convocacoes rsc
            JOIN jogadores j ON j.id = rsc.jogador_id
            WHERE rsc.racha_id = :racha_id AND rsc.sessao_id = :sessao_id
            ORDER BY
                CASE WHEN rsc.ordem_fila IS NULL THEN 1 ELSE 0 END ASC,
                rsc.ordem_fila ASC,
                j.nome ASC
        ");
        $stmtRows->execute([':racha_id' => $rachaId, ':sessao_id' => $sessaoId]);
        $rows = $stmtRows->fetchAll(PDO::FETCH_ASSOC);

        $stmtCnt = $this->pdo->prepare("
            SELECT ultimo_sequencial_fila
            FROM racha_sessao_fila_contadores
            WHERE sessao_id = :sessao_id AND racha_id = :racha_id
        ");
        $stmtCnt->execute([':sessao_id' => $sessaoId, ':racha_id' => $rachaId]);
        $ultimoSeq = (int)($stmtCnt->fetchColumn() ?: 0);

        $titularesConfirmados = [];
        $filaEspera = [];
        $pendentesResposta = [];
        $recusasDesistencias = [];
        $notificacoesPromocaoPendentes = [];

        $mensalistasAtivos = 0;
        $mensalistasLiberaram = 0;
        $avulsosPromovidos = 0;

        foreach ($rows as $r) {
            $item = [
                'convocacao_id'                    => (int)$r['id'],
                'jogador_id'                       => (int)$r['jogador_id'],
                'nome'                             => (string)$r['nome'],
                'posicao'                          => (string)$r['posicao'],
                'tipo_participacao_convocacao'     => (string)$r['tipo_participacao_convocacao'],
                'telefone_destino'                 => $r['telefone_destino'],
                'status_envio'                     => (string)$r['status_envio'],
                'intencao_atual'                   => (string)$r['intencao_atual'],
                'situacao_vaga'                    => (string)$r['situacao_vaga'],
                'ordem_fila'                       => $r['ordem_fila'] !== null ? (int)$r['ordem_fila'] : null,
                'primeira_resposta_em'             => $r['primeira_resposta_em'],
                'ultima_resposta_em'               => $r['ultima_resposta_em'],
                'entrada_fila_em'                  => $r['entrada_fila_em'],
                'promovido_em'                     => $r['promovido_em'],
                'promovido_por_vaga_de_jogador_id' => $r['promovido_por_vaga_de_jogador_id'] !== null ? (int)$r['promovido_por_vaga_de_jogador_id'] : null,
                'notificacao_promocao_pendente'    => (int)$r['notificacao_promocao_pendente'] === 1
            ];

            if ($r['tipo_participacao_convocacao'] === 'mensalista') {
                if (in_array($r['situacao_vaga'], ['aguardando_resposta', 'aguardando_confirmacao_tardia', 'vaga_reservada'], true)) {
                    $mensalistasAtivos++;
                } elseif ($r['situacao_vaga'] === 'vaga_liberada') {
                    $mensalistasLiberaram++;
                }
            } elseif ($r['situacao_vaga'] === 'promovido_titular') {
                $avulsosPromovidos++;
            }

            switch ($r['situacao_vaga']) {
                case 'vaga_reservada':
                case 'promovido_titular':
                    $titularesConfirmados[] = $item;
                    if ($item['notificacao_promocao_pendente']) {
                        $notificacoesPromocaoPendentes[] = $item;
                    }
                    break;

                case 'fila_espera':
                    $filaEspera[] = $item;
                    break;

                case 'aguardando_resposta':
                case 'aguardando_confirmacao_tardia':
                    $pendentesResposta[] = $item;
                    break;

                case 'vaga_liberada':
                case 'recusou_sem_vaga':
                    $recusasDesistencias[] = $item;
                    break;
            }
        }

        // Garante ordenação estrita da fila de espera por ordem_fila ASC
        usort($filaEspera, fn(array $a, array $b) => ($a['ordem_fila'] ?? PHP_INT_MAX) <=> ($b['ordem_fila'] ?? PHP_INT_MAX));

        $limiteVagas = (int)$sessao['limite_vagas'];
        $capRestante = max(0, $limiteVagas - $mensalistasAtivos);
        $maxPromovidos = min($mensalistasLiberaram, $capRestante);
        $vagasAbertasFila = max(0, $maxPromovidos - $avulsosPromovidos);

        return [
            'racha_id'  => $rachaId,
            'sessao_id' => $sessaoId,
            'sessao'    => [
                'data_racha'               => $sessao['data_racha'],
                'status'                   => $sessao['status'],
                'apuracao_presenca'        => $sessao['apuracao_presenca'],
                'status_convocacao'        => $sessao['status_convocacao'] ?? 'aberta',
                'fechamento_convocacao_em' => $sessao['fechamento_convocacao_em'] ?? null,
                'limite_vagas'             => $limiteVagas
            ],
            'resumo' => [
                'total_convocados'             => count($rows),
                'mensalistas_ativos_reserva'   => $mensalistasAtivos,
                'mensalistas_liberaram_vaga'   => $mensalistasLiberaram,
                'avulsos_promovidos'           => $avulsosPromovidos,
                'avulsos_em_fila_espera'       => count($filaEspera),
                'pendentes_sem_decisao_final'  => count($pendentesResposta),
                'recusas_e_desistencias'       => count($recusasDesistencias),
                'vagas_abertas_para_fila'      => $vagasAbertasFila,
                'ultimo_sequencial_fila_usado' => $ultimoSeq
            ],
            'titulares_confirmados'           => $titularesConfirmados,
            'fila_espera'                     => $filaEspera,
            'pendentes_resposta'              => $pendentesResposta,
            'recusas_e_desistencias'          => $recusasDesistencias,
            'notificacoes_promocao_pendentes' => $notificacoesPromocaoPendentes
        ];
    }
}
