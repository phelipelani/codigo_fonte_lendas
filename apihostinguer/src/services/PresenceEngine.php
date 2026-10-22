<?php
/**
 * Motor de Gestão de Participantes, Sessões e Frequência Multi-Racha
 * Arquivo: apihostinguer/src/services/PresenceEngine.php
 *
 * Responsabilidades (Fase 4.0 — Etapa 3B.3):
 * 1. Validação estrita de escopo multi-racha: sessões, participantes e substituições devem pertencer ao mesmo racha.
 * 2. Validação de status ativo do participante no racha e autoria obrigatória validada contra a tabela `usuarios`.
 *    NOTA DE ARQUITETURA: A validação de identidade autenticada (JWT) e de autorização RBAC do organizador
 *    ('dono', 'financeiro', 'auxiliar') no racha é responsabilidade de AuthMiddleware e RachaScopeMiddleware
 *    nos futuros controllers REST. O serviço valida a integridade do usuario_id e registra a autoria.
 * 3. Prevenção de duplicidade de presenças e sessões com bloqueio pessimista (FOR UPDATE) e captura de UK (HTTP 409).
 * 4. Tratamento diferenciado entre mensalistas e avulsos sem exigência indevida de mensalidade.
 * 5. Ciclo de vida desacoplado e transacional:
 *    - Criação de sessão e evento 'criacao' na mesma transação, com horários DATETIME completos (YYYY-MM-DD HH:MM:SS).
 *    - Homologação da apuração de presença (apuracao_presenca = 'homologada') sem concluir prematuramente a sessão.
 *    - Cancelamento de sessão permitido mesmo com lista homologada (ex: chuva), exigindo motivo válido e preservando presenças.
 *    - Conclusão real da sessão (status = 'concluida') exigindo apuração homologada e rejeitando sessões canceladas.
 *    - Reabertura controlada da lista com motivo obrigatório (<= 255 chars) antes da conclusão da sessão.
 * 6. Trilha de auditoria append-only completa em `racha_sessao_eventos`:
 *    - Eventos de sessão: criacao, homologacao, reabertura, conclusao, cancelamento, alteracao_status_sessao.
 *    - Eventos de presença: confirmacao_presenca, alteracao_presenca, cancelamento_participacao, substituicao_participante.
 *    - Preservação histórica de jogador_id, substituiu_jogador_id, status_anterior, status_novo, usuario_id, motivo e detalhes JSON.
 * 7. Cálculo matemático seguro de indicadores de frequência sem divisão por zero.
 */

require_once __DIR__ . '/../middleware/RachaScopeMiddleware.php';
require_once __DIR__ . '/../utils/HttpError.php';

class PresenceEngine
{
    private PDO $pdo;

    private const MAX_MOTIVO_LENGTH = 255;

    private const ALLOWED_EVENT_TYPES = [
        'criacao',
        'homologacao',
        'reabertura',
        'conclusao',
        'cancelamento',
        'alteracao_status_sessao',
        'confirmacao_presenca',
        'alteracao_presenca',
        'cancelamento_participacao',
        'substituicao_participante',
        'preparacao_convocacao',
        'intencao_recebida',
        'entrada_fila_espera',
        'recusa_convocacao',
        'promocao_fila_espera'
    ];

    private const ALLOWED_PRESENCE_STATUSES = [
        'presente',
        'cancelado_no_prazo',
        'falta_justificada',
        'falta_injustificada',
        'pendente_apuracao',
        'historico_legado_intencao'
    ];

    private const ALLOWED_CONFIRMERS = [
        'whatsapp_bot',
        'organizador_manual',
        'jogador_app',
        'legado'
    ];

    public function __construct(?PDO $pdo = null)
    {
        $this->pdo = RachaScopeMiddleware::getPdo($pdo);
    }

    // =========================================================================
    // 0. VALIDAÇÕES DE AUTORIA, CAMPOS TEXTUAIS E AUDITORIA (racha_sessao_eventos)
    // =========================================================================

    /**
     * Valida que o identificador de usuário responsável foi fornecido e existe ativo na tabela `usuarios`.
     * Não substitui a autorização RBAC (que compete ao RachaScopeMiddleware nos controllers), mas impede
     * autoria nula, inventada ou associada a usuário inexistente/inativo.
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
     * Valida obrigatoriedade e limite de caracteres (VARCHAR(255)) de motivos e justificativas,
     * impedindo truncamento silencioso ou motivos vazios.
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
     * Normaliza e valida um horário ('HH:MM', 'HH:MM:SS' ou 'YYYY-MM-DD HH:MM[:SS]')
     * combinando-o explicitamente com a data do racha para formar um DATETIME válido ('YYYY-MM-DD HH:MM:SS').
     */
    private function normalizeSessionDateTime(string $dataRacha, ?string $horario, string $label): ?string
    {
        if ($horario === null) {
            return null;
        }

        $trimmed = trim($horario);
        if ($trimmed === '') {
            throw new HttpError("Horário de {$label} inválido (vazio). Formato esperado: HH:MM, HH:MM:SS ou YYYY-MM-DD HH:MM:SS.", 400);
        }

        // Caso 1: Apenas hora ('HH:MM' ou 'HH:MM:SS') -> combina com $dataRacha
        if (preg_match('/^((?:[01]\d|2[0-3]):[0-5]\d)(?::([0-5]\d))?$/', $trimmed, $m)) {
            $hhmm = $m[1];
            $ss = isset($m[2]) && $m[2] !== '' ? $m[2] : '00';
            return "{$dataRacha} {$hhmm}:{$ss}";
        }

        // Caso 2: Data e hora completas ('YYYY-MM-DD HH:MM' ou 'YYYY-MM-DD HH:MM:SS')
        if (preg_match('/^(\d{4}-\d{2}-\d{2})\s+((?:[01]\d|2[0-3]):[0-5]\d)(?::([0-5]\d))?$/', $trimmed, $m)) {
            $datePart = $m[1];
            [$ano, $mes, $dia] = explode('-', $datePart);
            if (!checkdate((int)$mes, (int)$dia, (int)$ano)) {
                throw new HttpError("Data inexistente no calendário no horário de {$label} ('{$trimmed}').", 400);
            }
            $hhmm = $m[2];
            $ss = isset($m[3]) && $m[3] !== '' ? $m[3] : '00';
            return "{$datePart} {$hhmm}:{$ss}";
        }

        throw new HttpError("Horário de {$label} inválido ('{$horario}'). Formato esperado: HH:MM, HH:MM:SS ou YYYY-MM-DD HH:MM:SS.", 400);
    }

    /**
     * Registra evento na trilha de auditoria append-only da sessão (método interno privado).
     */
    private function recordSessionEvent(
        int $rachaId,
        int $sessaoId,
        string $tipoEvento,
        int $usuarioId,
        ?string $motivo = null,
        ?array $detalhes = null,
        ?int $jogadorId = null,
        ?int $substituiuJogadorId = null,
        ?string $statusAnterior = null,
        ?string $statusNovo = null
    ): int {
        if (!in_array($tipoEvento, self::ALLOWED_EVENT_TYPES, true)) {
            throw new InvalidArgumentException("Tipo de evento inválido ('{$tipoEvento}').");
        }

        $motivoValidado = $this->validateMotivo($motivo, false, 'motivo do evento');

        $stmt = $this->pdo->prepare("
            INSERT INTO racha_sessao_eventos (
                sessao_id, racha_id, tipo_evento, tipo_ator, usuario_id,
                jogador_id, substituiu_jogador_id, mensagem_externa_id, status_anterior, status_novo,
                motivo, detalhes, criado_em
            ) VALUES (
                :sessao_id, :racha_id, :tipo, 'usuario', :usuario_id,
                :jogador_id, :substituiu_id, NULL, :status_ant, :status_novo,
                :motivo, :detalhes, NOW()
            )
        ");
        $stmt->execute([
            ':sessao_id'     => $sessaoId,
            ':racha_id'      => $rachaId,
            ':tipo'          => $tipoEvento,
            ':usuario_id'    => $usuarioId,
            ':jogador_id'    => $jogadorId,
            ':substituiu_id' => $substituiuJogadorId,
            ':status_ant'    => $statusAnterior,
            ':status_novo'   => $statusNovo,
            ':motivo'        => $motivoValidado,
            ':detalhes'      => $detalhes !== null ? json_encode($detalhes, JSON_UNESCAPED_UNICODE) : null
        ]);

        return (int)$this->pdo->lastInsertId();
    }

    /**
     * Consulta a trilha completa de auditoria de eventos de uma sessão, com filtros opcionais.
     */
    public function getSessionEvents(
        int $rachaId,
        int $sessaoId,
        ?string $tipoEvento = null,
        ?int $jogadorId = null
    ): array {
        $sql = "
            SELECT rse.id, rse.sessao_id, rse.racha_id, rse.tipo_evento, rse.tipo_ator, rse.usuario_id,
                   u.username, rse.jogador_id, rse.substituiu_jogador_id, rse.mensagem_externa_id,
                   rse.status_anterior, rse.status_novo,
                   rse.motivo, rse.detalhes, rse.criado_em
            FROM racha_sessao_eventos rse
            LEFT JOIN usuarios u ON u.id = rse.usuario_id
            WHERE rse.sessao_id = :sessao_id AND rse.racha_id = :racha_id
        ";
        $params = [
            ':sessao_id' => $sessaoId,
            ':racha_id'  => $rachaId
        ];

        if ($tipoEvento !== null) {
            $sql .= " AND rse.tipo_evento = :tipo_evento";
            $params[':tipo_evento'] = $tipoEvento;
        }
        if ($jogadorId !== null) {
            $sql .= " AND (rse.jogador_id = :jogador_id OR rse.substituiu_jogador_id = :substituiu_id)";
            $params[':jogador_id'] = $jogadorId;
            $params[':substituiu_id'] = $jogadorId;
        }

        $sql .= " ORDER BY rse.id ASC";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($rows as &$row) {
            $row['detalhes_decoded'] = ($row['detalhes'] !== null && $row['detalhes'] !== '')
                ? json_decode((string)$row['detalhes'], true)
                : null;
        }
        unset($row);

        return $rows;
    }

    // =========================================================================
    // 1. GESTÃO DE PARTICIPANTES NO RACHA
    // =========================================================================

    /**
     * Cadastra ou atualiza o vínculo de um jogador a um racha
     */
    public function registerParticipant(
        int $rachaId,
        int $jogadorId,
        string $tipoParticipacao = 'avulso_convidado',
        bool $ativo = true
    ): array {
        $allowedTipos = ['mensalista', 'avulso_recorrente', 'avulso_convidado'];
        if (!in_array($tipoParticipacao, $allowedTipos, true)) {
            throw new HttpError("Tipo de participação inválido ('{$tipoParticipacao}'). Permitidos: " . implode(', ', $allowedTipos), 400);
        }

        $stmtRacha = $this->pdo->prepare("SELECT id, ativo FROM rachas WHERE id = :id");
        $stmtRacha->execute([':id' => $rachaId]);
        $racha = $stmtRacha->fetch();
        if (!$racha) {
            throw new HttpError("Racha #{$rachaId} não encontrado.", 404);
        }

        $stmtJog = $this->pdo->prepare("SELECT id, nome FROM jogadores WHERE id = :id");
        $stmtJog->execute([':id' => $jogadorId]);
        $jogador = $stmtJog->fetch();
        if (!$jogador) {
            throw new HttpError("Jogador #{$jogadorId} não encontrado no cadastro geral.", 404);
        }

        $stmtCheck = $this->pdo->prepare("SELECT id, ativo, tipo_participacao FROM racha_participantes WHERE racha_id = :racha_id AND jogador_id = :jogador_id");
        $stmtCheck->execute([':racha_id' => $rachaId, ':jogador_id' => $jogadorId]);
        $existing = $stmtCheck->fetch();

        if ($existing) {
            $stmtUp = $this->pdo->prepare("
                UPDATE racha_participantes 
                SET tipo_participacao = :tipo, ativo = :ativo, updated_at = NOW()
                WHERE id = :id
            ");
            $stmtUp->execute([
                ':tipo'  => $tipoParticipacao,
                ':ativo' => $ativo ? 1 : 0,
                ':id'    => $existing['id']
            ]);
            $participantId = (int)$existing['id'];
        } else {
            $stmtIn = $this->pdo->prepare("
                INSERT INTO racha_participantes (racha_id, jogador_id, tipo_participacao, ativo, created_at, updated_at)
                VALUES (:racha_id, :jogador_id, :tipo, :ativo, NOW(), NOW())
            ");
            $stmtIn->execute([
                ':racha_id'   => $rachaId,
                ':jogador_id' => $jogadorId,
                ':tipo'       => $tipoParticipacao,
                ':ativo'      => $ativo ? 1 : 0
            ]);
            $participantId = (int)$this->pdo->lastInsertId();
        }

        return [
            'id'                => $participantId,
            'racha_id'          => $rachaId,
            'jogador_id'        => $jogadorId,
            'nome_jogador'      => (string)$jogador['nome'],
            'tipo_participacao' => $tipoParticipacao,
            'ativo'             => $ativo
        ];
    }

    /**
     * Altera o status ativo/inativo de um participante no racha
     */
    public function setParticipantActiveStatus(int $rachaId, int $jogadorId, bool $ativo): bool
    {
        $stmt = $this->pdo->prepare("
            UPDATE racha_participantes 
            SET ativo = :ativo, updated_at = NOW()
            WHERE racha_id = :racha_id AND jogador_id = :jogador_id
        ");
        $stmt->execute([
            ':ativo'      => $ativo ? 1 : 0,
            ':racha_id'   => $rachaId,
            ':jogador_id' => $jogadorId
        ]);

        if ($stmt->rowCount() === 0) {
            $check = $this->pdo->prepare("SELECT id FROM racha_participantes WHERE racha_id = :racha_id AND jogador_id = :jogador_id");
            $check->execute([':racha_id' => $rachaId, ':jogador_id' => $jogadorId]);
            if (!$check->fetch()) {
                throw new HttpError("Participante #{$jogadorId} não encontrado no racha #{$rachaId}.", 404);
            }
        }

        return true;
    }

    /**
     * Consulta o vínculo de um participante garantindo que pertence ao racha
     */
    public function getParticipant(int $rachaId, int $jogadorId): array
    {
        $stmt = $this->pdo->prepare("
            SELECT rp.id, rp.racha_id, rp.jogador_id, rp.tipo_participacao, rp.ativo, j.nome as nome_jogador
            FROM racha_participantes rp
            JOIN jogadores j ON j.id = rp.jogador_id
            WHERE rp.racha_id = :racha_id AND rp.jogador_id = :jogador_id
        ");
        $stmt->execute([':racha_id' => $rachaId, ':jogador_id' => $jogadorId]);
        $part = $stmt->fetch();

        if (!$part) {
            throw new HttpError("Jogador #{$jogadorId} não está cadastrado no racha #{$rachaId}.", 404);
        }

        return $part;
    }

    // =========================================================================
    // 2. GESTÃO DO CICLO DE VIDA DE SESSÕES
    // =========================================================================

    /**
     * Cria uma nova sessão de racha validando rigorosamente datas, horários DATETIME, autoria e transação atômica.
     */
    public function createSession(
        int $rachaId,
        string $dataRacha,
        ?string $horarioAbertura = null,
        ?string $horarioFechamento = null,
        ?int $usuarioId = null
    ): array {
        // 1. Validação de autoria obrigatória (sem fallback artificial para usuário #1)
        $this->validateAuthorUser($usuarioId, 'criação de sessão');

        // 2. Validação de formato da data (YYYY-MM-DD)
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $dataRacha)) {
            throw new HttpError("Data do racha inválida ('{$dataRacha}'). Formato esperado: YYYY-MM-DD.", 400);
        }

        // 3. Validação de existência real no calendário (rejeita datas impossíveis como 2026-02-30)
        [$ano, $mes, $dia] = explode('-', $dataRacha);
        if (!checkdate((int)$mes, (int)$dia, (int)$ano)) {
            throw new HttpError("Data inexistente no calendário ('{$dataRacha}').", 400);
        }

        // 4. Normalização explícita dos horários para DATETIME ('YYYY-MM-DD HH:MM:SS')
        $dtAbertura = $this->normalizeSessionDateTime($dataRacha, $horarioAbertura, 'abertura');
        $dtFechamento = $this->normalizeSessionDateTime($dataRacha, $horarioFechamento, 'fechamento');

        // 5. Coerência entre horários (horário de fechamento deve ser posterior à abertura)
        if ($dtAbertura !== null && $dtFechamento !== null) {
            $tsAbertura = strtotime($dtAbertura);
            $tsFechamento = strtotime($dtFechamento);
            if ($tsFechamento <= $tsAbertura) {
                throw new HttpError(
                    "Intervalo de horários incoerente: o horário de fechamento ('{$dtFechamento}') deve ser posterior ao horário de abertura ('{$dtAbertura}').",
                    400
                );
            }
        }

        // 6. Transação atômica para inserção da sessão + evento de criação
        $this->pdo->beginTransaction();
        try {
            $stmtR = $this->pdo->prepare("SELECT id, ativo FROM rachas WHERE id = :id FOR UPDATE");
            $stmtR->execute([':id' => $rachaId]);
            $racha = $stmtR->fetch();
            if (!$racha || (int)$racha['ativo'] !== 1) {
                throw new HttpError("Racha #{$rachaId} inexistente ou desativado.", 400);
            }

            $stmtCheck = $this->pdo->prepare("SELECT id FROM racha_sessoes WHERE racha_id = :racha_id AND data_racha = :data_racha FOR UPDATE");
            $stmtCheck->execute([':racha_id' => $rachaId, ':data_racha' => $dataRacha]);
            if ($stmtCheck->fetch()) {
                throw new HttpError("Já existe uma sessão cadastrada para o racha #{$rachaId} na data {$dataRacha}.", 409);
            }

            $stmtIn = $this->pdo->prepare("
                INSERT INTO racha_sessoes (
                    racha_id, data_racha, horario_abertura, horario_fechamento,
                    status, apuracao_presenca, created_at, updated_at
                ) VALUES (
                    :racha_id, :data_racha, :habertura, :hfechamento,
                    'agendada', 'nao_iniciada', NOW(), NOW()
                )
            ");
            $stmtIn->execute([
                ':racha_id'    => $rachaId,
                ':data_racha'  => $dataRacha,
                ':habertura'   => $dtAbertura,
                ':hfechamento' => $dtFechamento
            ]);

            $sessaoId = (int)$this->pdo->lastInsertId();

            $this->recordSessionEvent(
                $rachaId,
                $sessaoId,
                'criacao',
                (int)$usuarioId,
                'Sessão cadastrada com status agendada',
                [
                    'data_racha'         => $dataRacha,
                    'horario_abertura'   => $dtAbertura,
                    'horario_fechamento' => $dtFechamento,
                    'status'             => 'agendada',
                    'apuracao_presenca'  => 'nao_iniciada'
                ],
                null,
                null,
                null,
                'agendada'
            );

            $this->pdo->commit();

            return [
                'id'                 => $sessaoId,
                'racha_id'           => $rachaId,
                'data_racha'         => $dataRacha,
                'horario_abertura'   => $dtAbertura,
                'horario_fechamento' => $dtFechamento,
                'status'             => 'agendada',
                'apuracao_presenca'  => 'nao_iniciada'
            ];
        } catch (PDOException $e) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            if ($e->getCode() === '23000' || strpos($e->getMessage(), '1062') !== false) {
                throw new HttpError("Conflito de concorrência: Já existe uma sessão cadastrada para o racha #{$rachaId} na data {$dataRacha}.", 409);
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
     * Cancela uma sessão com proteção transacional e bloqueio pessimista (FOR UPDATE).
     * REGRAS (ETAPA 3B.3):
     * - Permite cancelar a sessão mesmo quando apuracao_presenca = 'homologada', sem exigir reabertura prévia.
     * - Exige motivo válido (não vazio e <= 255 chars) e usuarioId válido.
     * - Preserva os registros de presença na sessão (não os apaga).
     * - Rejeita cancelamento de sessão efetivamente concluída ('concluida').
     * - Idempotente se já estiver 'cancelada' (sem duplicar evento).
     */
    public function cancelSession(int $rachaId, int $sessaoId, string $motivo, int $usuarioId): bool
    {
        $motivoLimpo = (string)$this->validateMotivo($motivo, true, 'motivo de cancelamento');
        $this->validateAuthorUser($usuarioId, 'cancelamento de sessão');

        $this->pdo->beginTransaction();
        try {
            $stmt = $this->pdo->prepare("
                SELECT id, status, apuracao_presenca, motivo_cancelamento 
                FROM racha_sessoes 
                WHERE id = :id AND racha_id = :racha_id 
                FOR UPDATE
            ");
            $stmt->execute([':id' => $sessaoId, ':racha_id' => $rachaId]);
            $sessao = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$sessao) {
                throw new HttpError("Sessão #{$sessaoId} não encontrada para o racha #{$rachaId}.", 404);
            }

            if ($sessao['status'] === 'cancelada') {
                $this->pdo->commit();
                return true; // Idempotente: não duplica evento de cancelamento
            }

            if ($sessao['status'] === 'concluida') {
                throw new HttpError("Operação rejeitada: Não é permitido cancelar uma sessão que já foi efetivamente concluída.", 400);
            }

            $stmtUp = $this->pdo->prepare("
                UPDATE racha_sessoes 
                SET status = 'cancelada', motivo_cancelamento = :motivo, updated_at = NOW()
                WHERE id = :id AND racha_id = :racha_id
            ");
            $stmtUp->execute([
                ':motivo'   => $motivoLimpo,
                ':id'       => $sessaoId,
                ':racha_id' => $rachaId
            ]);

            $this->recordSessionEvent(
                $rachaId,
                $sessaoId,
                'cancelamento',
                $usuarioId,
                $motivoLimpo,
                [
                    'status_anterior'           => $sessao['status'],
                    'status_novo'               => 'cancelada',
                    'apuracao_presenca_momento' => $sessao['apuracao_presenca']
                ],
                null,
                null,
                (string)$sessao['status'],
                'cancelada'
            );

            $this->pdo->commit();
            return true;
        } catch (Throwable $e) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            throw $e;
        }
    }

    /**
     * Homologa a apuração de presenças da sessão.
     * REGRA DE NEGÓCIO: Homologar a lista fecha a apuração (apuracao_presenca = 'homologada')
     * mas NÃO marca automaticamente a sessão como 'concluida'.
     */
    public function homologateSession(int $rachaId, int $sessaoId, int $usuarioId, ?string $motivo = null): bool
    {
        $this->validateAuthorUser($usuarioId, 'homologação de sessão');
        $motivoValidado = $this->validateMotivo($motivo, false, 'motivo de homologação')
            ?? 'Homologação oficial da lista de presença';

        $this->pdo->beginTransaction();
        try {
            $stmt = $this->pdo->prepare("
                SELECT id, status, apuracao_presenca 
                FROM racha_sessoes 
                WHERE id = :id AND racha_id = :racha_id 
                FOR UPDATE
            ");
            $stmt->execute([':id' => $sessaoId, ':racha_id' => $rachaId]);
            $sessao = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$sessao) {
                throw new HttpError("Sessão #{$sessaoId} não encontrada para o racha #{$rachaId}.", 404);
            }

            if ($sessao['status'] === 'cancelada') {
                throw new HttpError("Operação rejeitada: Sessões canceladas não podem ser homologadas.", 400);
            }

            if ($sessao['status'] === 'concluida') {
                throw new HttpError("Operação rejeitada: Sessão já concluída não pode sofrer nova homologação comum.", 400);
            }

            if ($sessao['apuracao_presenca'] === 'homologada') {
                $this->pdo->commit();
                return true; // Idempotente: sem duplicar evento
            }

            $apuracaoAnterior = (string)$sessao['apuracao_presenca'];

            $stmtUp = $this->pdo->prepare("
                UPDATE racha_sessoes 
                SET apuracao_presenca = 'homologada',
                    homologado_por_usuario_id = :usuario_id,
                    homologado_em = NOW(),
                    updated_at = NOW()
                WHERE id = :id AND racha_id = :racha_id
            ");
            $stmtUp->execute([
                ':usuario_id' => $usuarioId,
                ':id'         => $sessaoId,
                ':racha_id'   => $rachaId
            ]);

            $this->recordSessionEvent(
                $rachaId,
                $sessaoId,
                'homologacao',
                $usuarioId,
                $motivoValidado,
                [
                    'apuracao_anterior' => $apuracaoAnterior,
                    'apuracao_nova'     => 'homologada',
                    'status_sessao'     => $sessao['status']
                ],
                null,
                null,
                $apuracaoAnterior,
                'homologada'
            );

            $this->pdo->commit();
            return true;
        } catch (Throwable $e) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            throw $e;
        }
    }

    /**
     * Reabre a lista de presença para ajustes pré-jogo autorizados.
     */
    public function reopenPresenceList(int $rachaId, int $sessaoId, int $usuarioId, string $motivo): bool
    {
        $motivoLimpo = (string)$this->validateMotivo($motivo, true, 'motivo da reabertura');
        $this->validateAuthorUser($usuarioId, 'reabertura da lista de presença');

        $this->pdo->beginTransaction();
        try {
            $stmt = $this->pdo->prepare("
                SELECT id, status, apuracao_presenca 
                FROM racha_sessoes 
                WHERE id = :id AND racha_id = :racha_id 
                FOR UPDATE
            ");
            $stmt->execute([':id' => $sessaoId, ':racha_id' => $rachaId]);
            $sessao = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$sessao) {
                throw new HttpError("Sessão #{$sessaoId} não encontrada para o racha #{$rachaId}.", 404);
            }

            if ($sessao['status'] === 'cancelada') {
                throw new HttpError("Operação rejeitada: Sessões canceladas não podem ser reabertas para operação normal.", 400);
            }

            if ($sessao['status'] === 'concluida') {
                throw new HttpError("Operação rejeitada: Uma sessão efetivamente concluída não pode ser reaberta pelo fluxo comum de ajustes.", 400);
            }

            if ($sessao['apuracao_presenca'] !== 'homologada') {
                throw new HttpError("Operação rejeitada: A lista de presença da sessão #{$sessaoId} não está homologada para necessitar de reabertura.", 400);
            }

            $stmtUp = $this->pdo->prepare("
                UPDATE racha_sessoes 
                SET apuracao_presenca = 'em_andamento', updated_at = NOW()
                WHERE id = :id AND racha_id = :racha_id
            ");
            $stmtUp->execute([':id' => $sessaoId, ':racha_id' => $rachaId]);

            $this->recordSessionEvent(
                $rachaId,
                $sessaoId,
                'reabertura',
                $usuarioId,
                $motivoLimpo,
                [
                    'apuracao_anterior' => 'homologada',
                    'apuracao_nova'     => 'em_andamento',
                    'status_sessao'     => $sessao['status']
                ],
                null,
                null,
                'homologada',
                'em_andamento'
            );

            $this->pdo->commit();
            return true;
        } catch (Throwable $e) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            throw $e;
        }
    }

    /**
     * Conclui a sessão de forma independente ao término real da partida.
     * REGRAS (ETAPA 3B.3):
     * - Rejeita sessões canceladas (400).
     * - Exige obrigatoriamente que apuracao_presenca seja 'homologada' (400).
     * - Registra o evento de conclusão na mesma transação.
     * - Idempotente se já estiver 'concluida'.
     */
    public function concludeSession(int $rachaId, int $sessaoId, int $usuarioId, ?string $motivo = null): bool
    {
        $this->validateAuthorUser($usuarioId, 'conclusão de sessão');
        $motivoValidado = $this->validateMotivo($motivo, false, 'motivo de conclusão')
            ?? 'Sessão concluída e partida finalizada';

        $this->pdo->beginTransaction();
        try {
            $stmt = $this->pdo->prepare("
                SELECT id, status, apuracao_presenca 
                FROM racha_sessoes 
                WHERE id = :id AND racha_id = :racha_id 
                FOR UPDATE
            ");
            $stmt->execute([':id' => $sessaoId, ':racha_id' => $rachaId]);
            $sessao = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$sessao) {
                throw new HttpError("Sessão #{$sessaoId} não encontrada para o racha #{$rachaId}.", 404);
            }

            if ($sessao['status'] === 'cancelada') {
                throw new HttpError("Operação rejeitada: Sessão cancelada não pode ser concluída.", 400);
            }

            if ($sessao['status'] === 'concluida') {
                $this->pdo->commit();
                return true; // Idempotente: sem duplicar evento
            }

            if ($sessao['apuracao_presenca'] !== 'homologada') {
                throw new HttpError(
                    "Operação rejeitada: A sessão #{$sessaoId} não pode ser concluída enquanto a lista de presença não estiver homologada (estado atual: '{$sessao['apuracao_presenca']}').",
                    400
                );
            }

            $statusAnterior = (string)$sessao['status'];

            $stmtUp = $this->pdo->prepare("
                UPDATE racha_sessoes 
                SET status = 'concluida', updated_at = NOW()
                WHERE id = :id AND racha_id = :racha_id
            ");
            $stmtUp->execute([':id' => $sessaoId, ':racha_id' => $rachaId]);

            $this->recordSessionEvent(
                $rachaId,
                $sessaoId,
                'conclusao',
                $usuarioId,
                $motivoValidado,
                [
                    'status_anterior'   => $statusAnterior,
                    'status_novo'       => 'concluida',
                    'apuracao_presenca' => $sessao['apuracao_presenca']
                ],
                null,
                null,
                $statusAnterior,
                'concluida'
            );

            $this->pdo->commit();
            return true;
        } catch (Throwable $e) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            throw $e;
        }
    }

    /**
     * Transições controladas de status de sessão (agendada -> aberta -> em_andamento)
     */
    public function updateSessionStatus(int $rachaId, int $sessaoId, string $novoStatus, int $usuarioId): array
    {
        $allowedStatuses = ['agendada', 'aberta', 'em_andamento', 'concluida', 'cancelada'];
        if (!in_array($novoStatus, $allowedStatuses, true)) {
            throw new HttpError("Status de sessão inválido ('{$novoStatus}').", 400);
        }

        $this->validateAuthorUser($usuarioId, 'atualização de status de sessão');

        if ($novoStatus === 'cancelada') {
            $this->cancelSession($rachaId, $sessaoId, 'Cancelamento solicitado via transição de status', $usuarioId);
            return $this->getSession($rachaId, $sessaoId);
        }

        if ($novoStatus === 'concluida') {
            $this->concludeSession($rachaId, $sessaoId, $usuarioId);
            return $this->getSession($rachaId, $sessaoId);
        }

        $this->pdo->beginTransaction();
        try {
            $stmt = $this->pdo->prepare("SELECT id, status, apuracao_presenca FROM racha_sessoes WHERE id = :id AND racha_id = :racha_id FOR UPDATE");
            $stmt->execute([':id' => $sessaoId, ':racha_id' => $rachaId]);
            $sessao = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$sessao) {
                throw new HttpError("Sessão #{$sessaoId} não encontrada para o racha #{$rachaId}.", 404);
            }

            $currentStatus = (string)$sessao['status'];

            if ($currentStatus === 'cancelada') {
                throw new HttpError("Operação rejeitada: A sessão #{$sessaoId} está cancelada e seu status não pode ser alterado.", 400);
            }

            if ($currentStatus === 'concluida') {
                throw new HttpError("Operação rejeitada: A sessão #{$sessaoId} já foi concluída e não pode retornar a estados anteriores.", 400);
            }

            if ($currentStatus !== $novoStatus) {
                $stmtUp = $this->pdo->prepare("UPDATE racha_sessoes SET status = :status, updated_at = NOW() WHERE id = :id AND racha_id = :racha_id");
                $stmtUp->execute([':status' => $novoStatus, ':id' => $sessaoId, ':racha_id' => $rachaId]);

                $this->recordSessionEvent(
                    $rachaId,
                    $sessaoId,
                    'alteracao_status_sessao',
                    $usuarioId,
                    "Transição de status operacional de '{$currentStatus}' para '{$novoStatus}'",
                    [
                        'status_anterior' => $currentStatus,
                        'status_novo'     => $novoStatus
                    ],
                    null,
                    null,
                    $currentStatus,
                    $novoStatus
                );
            }

            $this->pdo->commit();
            return $this->getSession($rachaId, $sessaoId);
        } catch (Throwable $e) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            throw $e;
        }
    }

    /**
     * Consulta sessão garantindo pertinência ao racha
     */
    public function getSession(int $rachaId, int $sessaoId): array
    {
        $stmt = $this->pdo->prepare("
            SELECT id, racha_id, data_racha, horario_abertura, horario_fechamento, status, motivo_cancelamento, apuracao_presenca, homologado_por_usuario_id, homologado_em
            FROM racha_sessoes
            WHERE id = :id AND racha_id = :racha_id
        ");
        $stmt->execute([':id' => $sessaoId, ':racha_id' => $rachaId]);
        $sessao = $stmt->fetch();

        if (!$sessao) {
            throw new HttpError("Sessão #{$sessaoId} não encontrada para o racha #{$rachaId}.", 404);
        }

        return $sessao;
    }

    // =========================================================================
    // 3. CONFIRMAÇÃO, ALTERAÇÃO E SUBSTITUIÇÃO DE PRESENÇAS COM AUDITORIA
    // =========================================================================

    /**
     * Valida dentro da transação ativa que o jogador substituído:
     * 1. Não é o próprio substituto.
     * 2. Pertence ao mesmo racha.
     * 3. Possui registro de presença na mesma sessão.
     * 4. Está em situação compatível com substituição (cancelado_no_prazo, falta_justificada ou falta_injustificada).
     * 5. Ainda não teve sua vaga preenchida por outro substituto ativo nesta sessão.
     */
    private function validateReplacedPlayerInTransaction(
        int $rachaId,
        int $sessaoId,
        int $jogadorSubstitutoId,
        int $substituiuJogadorId,
        string $statusSubstituto
    ): array {
        if ($substituiuJogadorId <= 0) {
            throw new HttpError("Identificador do jogador substituído inválido.", 400);
        }

        if ($substituiuJogadorId === $jogadorSubstitutoId) {
            throw new HttpError(
                "Operação rejeitada: O jogador #{$jogadorSubstitutoId} não pode ser registrado como substituto de si mesmo.",
                400
            );
        }

        if ($statusSubstituto !== 'presente') {
            throw new HttpError(
                "Operação rejeitada: Um participante convocado como substituto deve ingressar com status 'presente' (recebido: '{$statusSubstituto}').",
                400
            );
        }

        // Verifica que o substituído pertence ao mesmo racha
        $stmtPart = $this->pdo->prepare("
            SELECT rp.id, rp.jogador_id, rp.tipo_participacao, j.nome AS nome_jogador
            FROM racha_participantes rp
            JOIN jogadores j ON j.id = rp.jogador_id
            WHERE rp.racha_id = :racha_id AND rp.jogador_id = :jogador_id
        ");
        $stmtPart->execute([':racha_id' => $rachaId, ':jogador_id' => $substituiuJogadorId]);
        $partSubstituido = $stmtPart->fetch(PDO::FETCH_ASSOC);

        if (!$partSubstituido) {
            throw new HttpError(
                "Operação rejeitada: O jogador substituído #{$substituiuJogadorId} não pertence ao racha #{$rachaId}.",
                400
            );
        }

        // Verifica e bloqueia o registro de presença do substituído na mesma sessão
        $stmtPres = $this->pdo->prepare("
            SELECT id, status_presenca, categoria
            FROM racha_sessao_presencas
            WHERE sessao_id = :sessao_id AND racha_id = :racha_id AND jogador_id = :jogador_id
            FOR UPDATE
        ");
        $stmtPres->execute([
            ':sessao_id'  => $sessaoId,
            ':racha_id'   => $rachaId,
            ':jogador_id' => $substituiuJogadorId
        ]);
        $presencaSubstituido = $stmtPres->fetch(PDO::FETCH_ASSOC);

        if (!$presencaSubstituido) {
            throw new HttpError(
                "Operação rejeitada: O jogador substituído #{$substituiuJogadorId} não possui registro de participação na sessão #{$sessaoId}.",
                400
            );
        }

        $compatibleReplacedStatuses = ['cancelado_no_prazo', 'falta_justificada', 'falta_injustificada'];
        if (!in_array($presencaSubstituido['status_presenca'], $compatibleReplacedStatuses, true)) {
            throw new HttpError(
                "Operação rejeitada: O jogador substituído #{$substituiuJogadorId} encontra-se com status '{$presencaSubstituido['status_presenca']}' na sessão #{$sessaoId} (incompatível com substituição). Registre antes seu cancelamento/ausência ou utilize substituteParticipant().",
                400
            );
        }

        // Verifica se outro substituto ativo já ocupou a vaga deste jogador substituído na mesma sessão
        $stmtSub = $this->pdo->prepare("
            SELECT id, jogador_id
            FROM racha_sessao_presencas
            WHERE sessao_id = :sessao_id
              AND racha_id = :racha_id
              AND substituiu_jogador_id = :substituido_id
              AND status_presenca = 'presente'
            FOR UPDATE
        ");
        $stmtSub->execute([
            ':sessao_id'      => $sessaoId,
            ':racha_id'       => $rachaId,
            ':substituido_id' => $substituiuJogadorId
        ]);
        $existingSub = $stmtSub->fetch(PDO::FETCH_ASSOC);

        if ($existingSub) {
            throw new HttpError(
                "Conflito de substituição: A vaga do jogador #{$substituiuJogadorId} na sessão #{$sessaoId} já foi preenchida pelo substituto #{$existingSub['jogador_id']}.",
                409
            );
        }

        return [
            'participante' => $partSubstituido,
            'presenca'     => $presencaSubstituido
        ];
    }

    /**
     * Confirma a presença de um jogador em uma sessão com proteção contra concorrência, validação de substituição
     * e gravação de evento de auditoria na mesma transação.
     */
    public function confirmPresence(
        int $rachaId,
        int $sessaoId,
        int $jogadorId,
        string $statusPresenca = 'presente',
        string $confirmadoPor = 'organizador_manual',
        ?int $usuarioId = null,
        ?string $motivoJustificativa = null,
        ?int $substituiuJogadorId = null
    ): array {
        if (!in_array($statusPresenca, self::ALLOWED_PRESENCE_STATUSES, true)) {
            throw new HttpError("Status de presença inválido ('{$statusPresenca}').", 400);
        }

        if (!in_array($confirmadoPor, self::ALLOWED_CONFIRMERS, true)) {
            throw new HttpError("Canal de confirmação inválido ('{$confirmadoPor}').", 400);
        }

        $this->validateAuthorUser($usuarioId, 'confirmação de presença');
        $motivoLimpo = $this->validateMotivo($motivoJustificativa, false, 'motivo/justificativa de presença');

        $this->pdo->beginTransaction();
        try {
            // 1. Bloqueia pessimistamente a sessão
            $stmtSessao = $this->pdo->prepare("
                SELECT id, status, apuracao_presenca 
                FROM racha_sessoes 
                WHERE id = :id AND racha_id = :racha_id 
                FOR UPDATE
            ");
            $stmtSessao->execute([':id' => $sessaoId, ':racha_id' => $rachaId]);
            $sessao = $stmtSessao->fetch(PDO::FETCH_ASSOC);

            if (!$sessao) {
                throw new HttpError("Sessão #{$sessaoId} não encontrada para o racha #{$rachaId}.", 404);
            }

            if ($sessao['status'] === 'cancelada') {
                throw new HttpError("Operação rejeitada: A sessão #{$sessaoId} está cancelada e não aceita registros de presença.", 400);
            }

            if ($sessao['status'] === 'concluida') {
                throw new HttpError("Operação rejeitada: A sessão #{$sessaoId} já foi concluída e não aceita novos registros de presença.", 400);
            }

            if ($sessao['apuracao_presenca'] === 'homologada') {
                throw new HttpError("Operação rejeitada: A lista de presença da sessão #{$sessaoId} está homologada. Para efetuar ajustes, solicite a reabertura controlada da apuração.", 400);
            }

            // 2. Valida o participante no racha
            $part = $this->getParticipant($rachaId, $jogadorId);
            if ((int)$part['ativo'] !== 1) {
                throw new HttpError("Operação rejeitada: O participante #{$jogadorId} ('{$part['nome_jogador']}') está inativo neste racha.", 400);
            }

            // 3. Prevenção prévia de duplicidade na sessão
            $stmtDup = $this->pdo->prepare("
                SELECT id, status_presenca
                FROM racha_sessao_presencas
                WHERE sessao_id = :sessao_id AND jogador_id = :jogador_id
                FOR UPDATE
            ");
            $stmtDup->execute([':sessao_id' => $sessaoId, ':jogador_id' => $jogadorId]);
            if ($stmtDup->fetch()) {
                throw new HttpError("Presença já registrada para o participante #{$jogadorId} nesta sessão #{$sessaoId}. Utilize a atualização para modificar o status.", 409);
            }

            // 4. Se for substituição, valida integralmente o jogador substituído
            $replacedInfo = null;
            if ($substituiuJogadorId !== null) {
                $replacedInfo = $this->validateReplacedPlayerInTransaction(
                    $rachaId,
                    $sessaoId,
                    $jogadorId,
                    $substituiuJogadorId,
                    $statusPresenca
                );
            }

            // 5. Determina categoria (mensalista vs avulso)
            $categoria = ($part['tipo_participacao'] === 'mensalista') ? 'mensalista' : 'avulso';

            // 6. Inserção na tabela de presenças
            $stmtIn = $this->pdo->prepare("
                INSERT INTO racha_sessao_presencas (
                    sessao_id, racha_id, jogador_id, categoria, status_presenca,
                    motivo_falta_justificada, substituiu_jogador_id, hora_confirmacao,
                    confirmado_por, alterado_por_usuario_id, alterado_em, created_at
                ) VALUES (
                    :sessao_id, :racha_id, :jogador_id, :categoria, :status_presenca,
                    :motivo, :substituiu, NOW(),
                    :confirmado_por, :usuario_id, NOW(), NOW()
                )
            ");
            $stmtIn->execute([
                ':sessao_id'       => $sessaoId,
                ':racha_id'        => $rachaId,
                ':jogador_id'      => $jogadorId,
                ':categoria'       => $categoria,
                ':status_presenca' => $statusPresenca,
                ':motivo'          => $motivoLimpo,
                ':substituiu'      => $substituiuJogadorId,
                ':confirmado_por'  => $confirmadoPor,
                ':usuario_id'      => $usuarioId
            ]);

            $presencaId = (int)$this->pdo->lastInsertId();

            // 7. Grava evento de auditoria na mesma transação
            if ($substituiuJogadorId !== null) {
                $tipoEvento = 'substituicao_participante';
                $motivoEvento = $motivoLimpo ?? "Inclusão do substituto #{$jogadorId} na vaga do participante #{$substituiuJogadorId}";
            } elseif ($statusPresenca === 'cancelado_no_prazo') {
                $tipoEvento = 'cancelamento_participacao';
                $motivoEvento = $motivoLimpo ?? "Cancelamento individual de participação registrado para o jogador #{$jogadorId}";
            } else {
                $tipoEvento = 'confirmacao_presenca';
                $motivoEvento = $motivoLimpo ?? "Confirmação de presença ('{$statusPresenca}') para o jogador #{$jogadorId}";
            }

            $this->recordSessionEvent(
                $rachaId,
                $sessaoId,
                $tipoEvento,
                (int)$usuarioId,
                $motivoEvento,
                [
                    'presenca_id'                => $presencaId,
                    'jogador_id'                 => $jogadorId,
                    'nome_jogador'               => $part['nome_jogador'],
                    'categoria'                  => $categoria,
                    'status_anterior'            => null,
                    'status_novo'                => $statusPresenca,
                    'substituiu_jogador_id'      => $substituiuJogadorId,
                    'status_jogador_substituido' => $replacedInfo !== null ? $replacedInfo['presenca']['status_presenca'] : null,
                    'confirmado_por'             => $confirmadoPor,
                    'motivo'                     => $motivoLimpo
                ],
                $jogadorId,
                $substituiuJogadorId,
                null,
                $statusPresenca
            );

            $this->pdo->commit();

            return [
                'id'                       => $presencaId,
                'sessao_id'                => $sessaoId,
                'racha_id'                 => $rachaId,
                'jogador_id'               => $jogadorId,
                'nome_jogador'             => $part['nome_jogador'],
                'categoria'                => $categoria,
                'status_presenca'          => $statusPresenca,
                'motivo_falta_justificada' => $motivoLimpo,
                'substituiu_jogador_id'    => $substituiuJogadorId,
                'confirmado_por'           => $confirmadoPor,
                'alterado_por_usuario_id'  => $usuarioId
            ];
        } catch (PDOException $e) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            if ($e->getCode() === '23000' || strpos($e->getMessage(), '1062') !== false) {
                throw new HttpError("Conflito de concorrência: Presença já registrada para o participante #{$jogadorId} nesta sessão.", 409);
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
     * Atualiza o status de presença de um jogador preservando integralmente na trilha de auditoria
     * o status anterior, o novo status, o motivo e o usuário responsável na mesma transação.
     */
    public function updatePresenceStatus(
        int $rachaId,
        int $sessaoId,
        int $jogadorId,
        string $novoStatus,
        int $usuarioId,
        ?string $motivoJustificativa = null
    ): array {
        if (!in_array($novoStatus, self::ALLOWED_PRESENCE_STATUSES, true)) {
            throw new HttpError("Novo status de presença inválido ('{$novoStatus}').", 400);
        }

        $this->validateAuthorUser($usuarioId, 'alteração de status de presença');
        $motivoLimpo = $this->validateMotivo($motivoJustificativa, false, 'motivo/justificativa de alteração');

        $this->pdo->beginTransaction();
        try {
            $stmtSessao = $this->pdo->prepare("
                SELECT id, status, apuracao_presenca 
                FROM racha_sessoes 
                WHERE id = :id AND racha_id = :racha_id 
                FOR UPDATE
            ");
            $stmtSessao->execute([':id' => $sessaoId, ':racha_id' => $rachaId]);
            $sessao = $stmtSessao->fetch(PDO::FETCH_ASSOC);

            if (!$sessao) {
                throw new HttpError("Sessão #{$sessaoId} não encontrada para o racha #{$rachaId}.", 404);
            }

            if ($sessao['status'] === 'cancelada') {
                throw new HttpError("Operação rejeitada: Não é permitido atualizar presenças de uma sessão cancelada.", 400);
            }

            if ($sessao['status'] === 'concluida') {
                throw new HttpError("Operação rejeitada: A sessão #{$sessaoId} já foi concluída e não aceita alterações em presenças.", 400);
            }

            if ($sessao['apuracao_presenca'] === 'homologada') {
                throw new HttpError("Operação rejeitada: A súmula oficial da sessão #{$sessaoId} está homologada e não pode ser alterada diretamente. Solicite a reabertura controlada.", 400);
            }

            // Lê e bloqueia a linha atual da presença para capturar o estado anterior antes da atualização
            $stmtAtual = $this->pdo->prepare("
                SELECT id, jogador_id, categoria, status_presenca, motivo_falta_justificada, substituiu_jogador_id
                FROM racha_sessao_presencas
                WHERE sessao_id = :sessao_id AND racha_id = :racha_id AND jogador_id = :jogador_id
                FOR UPDATE
            ");
            $stmtAtual->execute([
                ':sessao_id'  => $sessaoId,
                ':racha_id'   => $rachaId,
                ':jogador_id' => $jogadorId
            ]);
            $presencaAtual = $stmtAtual->fetch(PDO::FETCH_ASSOC);

            if (!$presencaAtual) {
                throw new HttpError("Registro de presença não encontrado para jogador #{$jogadorId} na sessão #{$sessaoId}.", 404);
            }

            $statusAnterior = (string)$presencaAtual['status_presenca'];
            $motivoAnterior = $presencaAtual['motivo_falta_justificada'];
            $substituiuId = $presencaAtual['substituiu_jogador_id'] !== null ? (int)$presencaAtual['substituiu_jogador_id'] : null;

            $stmt = $this->pdo->prepare("
                UPDATE racha_sessao_presencas
                SET status_presenca = :status,
                    motivo_falta_justificada = :motivo,
                    alterado_por_usuario_id = :usuario_id,
                    alterado_em = NOW()
                WHERE sessao_id = :sessao_id AND racha_id = :racha_id AND jogador_id = :jogador_id
            ");
            $stmt->execute([
                ':status'     => $novoStatus,
                ':motivo'     => $motivoLimpo,
                ':usuario_id' => $usuarioId,
                ':sessao_id'  => $sessaoId,
                ':racha_id'   => $rachaId,
                ':jogador_id' => $jogadorId
            ]);

            $tipoEvento = ($novoStatus === 'cancelado_no_prazo') ? 'cancelamento_participacao' : 'alteracao_presenca';
            $motivoEvento = $motivoLimpo ?? "Alteração de status de presença de '{$statusAnterior}' para '{$novoStatus}'";

            $this->recordSessionEvent(
                $rachaId,
                $sessaoId,
                $tipoEvento,
                $usuarioId,
                $motivoEvento,
                [
                    'presenca_id'           => (int)$presencaAtual['id'],
                    'jogador_id'            => $jogadorId,
                    'categoria'             => $presencaAtual['categoria'],
                    'status_anterior'       => $statusAnterior,
                    'status_novo'           => $novoStatus,
                    'motivo_anterior'       => $motivoAnterior,
                    'motivo_novo'           => $motivoLimpo,
                    'substituiu_jogador_id' => $substituiuId
                ],
                $jogadorId,
                $substituiuId,
                $statusAnterior,
                $novoStatus
            );

            $this->pdo->commit();

            return [
                'id'                       => (int)$presencaAtual['id'],
                'sessao_id'                => $sessaoId,
                'racha_id'                 => $rachaId,
                'jogador_id'               => $jogadorId,
                'status_anterior'          => $statusAnterior,
                'status_presenca'          => $novoStatus,
                'motivo_falta_justificada' => $motivoLimpo,
                'alterado_por_usuario_id'  => $usuarioId
            ];
        } catch (Throwable $e) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            throw $e;
        }
    }

    /**
     * Executa de forma atômica na mesma transação:
     * 1. O cancelamento/baixa da participação do jogador titular substituído (ex: 'cancelado_no_prazo').
     * 2. A inclusão do jogador substituto com vínculo `substituiu_jogador_id`.
     * 3. O registro dos dois eventos de auditoria ('cancelamento_participacao' e 'substituicao_participante').
     * Caso qualquer validação falhe, toda a transação sofre rollback (impede substituição pela metade).
     */
    public function substituteParticipant(
        int $rachaId,
        int $sessaoId,
        int $jogadorSubstituidoId,
        int $jogadorSubstitutoId,
        int $usuarioId,
        string $motivo,
        string $statusSaidaSubstituido = 'cancelado_no_prazo',
        string $confirmadoPor = 'organizador_manual'
    ): array {
        $motivoLimpo = (string)$this->validateMotivo($motivo, true, 'motivo da substituição');
        $this->validateAuthorUser($usuarioId, 'substituição de participante');

        $allowedSaida = ['cancelado_no_prazo', 'falta_justificada', 'falta_injustificada'];
        if (!in_array($statusSaidaSubstituido, $allowedSaida, true)) {
            throw new HttpError("Status de saída inválido para o jogador substituído ('{$statusSaidaSubstituido}').", 400);
        }

        if (!in_array($confirmadoPor, self::ALLOWED_CONFIRMERS, true)) {
            throw new HttpError("Canal de confirmação inválido ('{$confirmadoPor}').", 400);
        }

        if ($jogadorSubstituidoId <= 0 || $jogadorSubstitutoId <= 0) {
            throw new HttpError("Identificadores dos jogadores substituído e substituto devem ser inteiros positivos.", 400);
        }

        if ($jogadorSubstituidoId === $jogadorSubstitutoId) {
            throw new HttpError("Operação rejeitada: O jogador #{$jogadorSubstitutoId} não pode substituir a si mesmo.", 400);
        }

        $this->pdo->beginTransaction();
        try {
            // 1. Bloqueia a sessão
            $stmtSessao = $this->pdo->prepare("
                SELECT id, status, apuracao_presenca
                FROM racha_sessoes
                WHERE id = :id AND racha_id = :racha_id
                FOR UPDATE
            ");
            $stmtSessao->execute([':id' => $sessaoId, ':racha_id' => $rachaId]);
            $sessao = $stmtSessao->fetch(PDO::FETCH_ASSOC);

            if (!$sessao) {
                throw new HttpError("Sessão #{$sessaoId} não encontrada para o racha #{$rachaId}.", 404);
            }
            if ($sessao['status'] === 'cancelada') {
                throw new HttpError("Operação rejeitada: A sessão #{$sessaoId} está cancelada.", 400);
            }
            if ($sessao['status'] === 'concluida') {
                throw new HttpError("Operação rejeitada: A sessão #{$sessaoId} já foi concluída.", 400);
            }
            if ($sessao['apuracao_presenca'] === 'homologada') {
                throw new HttpError("Operação rejeitada: A lista da sessão #{$sessaoId} está homologada. Reabra a lista antes de substituir participantes.", 400);
            }

            // 2. Valida participante substituído e seu registro na sessão
            $partSubstituido = $this->getParticipant($rachaId, $jogadorSubstituidoId);

            $stmtPresSub = $this->pdo->prepare("
                SELECT id, status_presenca, categoria, motivo_falta_justificada
                FROM racha_sessao_presencas
                WHERE sessao_id = :sessao_id AND racha_id = :racha_id AND jogador_id = :jogador_id
                FOR UPDATE
            ");
            $stmtPresSub->execute([
                ':sessao_id'  => $sessaoId,
                ':racha_id'   => $rachaId,
                ':jogador_id' => $jogadorSubstituidoId
            ]);
            $presencaSubstituido = $stmtPresSub->fetch(PDO::FETCH_ASSOC);

            if (!$presencaSubstituido) {
                // Se o jogador não possui linha em racha_sessao_presencas, verifica se está em racha_sessao_convocacoes
                $stmtConvSub = $this->pdo->prepare("
                    SELECT id, situacao_vaga, tipo_participacao_convocacao
                    FROM racha_sessao_convocacoes
                    WHERE sessao_id = :sessao_id AND racha_id = :racha_id AND jogador_id = :jogador_id
                    FOR UPDATE
                ");
                $stmtConvSub->execute([
                    ':sessao_id'  => $sessaoId,
                    ':racha_id'   => $rachaId,
                    ':jogador_id' => $jogadorSubstituidoId
                ]);
                $convSub = $stmtConvSub->fetch(PDO::FETCH_ASSOC);

                if (!$convSub) {
                    throw new HttpError(
                        "Operação rejeitada: O jogador substituído #{$jogadorSubstituidoId} não possui registro de participação nem convocação na sessão #{$sessaoId}.",
                        400
                    );
                }

                $allowedSituacoesConv = ['vaga_reservada', 'promovido_titular', 'aguardando_resposta', 'aguardando_confirmacao_tardia'];
                if (!in_array($convSub['situacao_vaga'], $allowedSituacoesConv, true)) {
                    throw new HttpError(
                        "Operação rejeitada: O jogador substituído #{$jogadorSubstituidoId} está na convocação com status '{$convSub['situacao_vaga']}' (sem vaga titular ativa para ceder).",
                        400
                    );
                }

                // Inicializa linha em racha_sessao_presencas como 'pendente_apuracao' para que a transição para saída ocorra de forma padronizada
                $catSub = ($convSub['tipo_participacao_convocacao'] === 'mensalista') ? 'mensalista' : 'avulso';
                $stmtInitSub = $this->pdo->prepare("
                    INSERT INTO racha_sessao_presencas (
                        sessao_id, racha_id, jogador_id, categoria, status_presenca,
                        motivo_falta_justificada, substituiu_jogador_id, hora_confirmacao,
                        confirmado_por, alterado_por_usuario_id, alterado_em, created_at
                    ) VALUES (
                        :sessao_id, :racha_id, :jogador_id, :categoria, 'pendente_apuracao',
                        NULL, NULL, NOW(),
                        :confirmado_por, :usuario_id, NOW(), NOW()
                    )
                ");
                $stmtInitSub->execute([
                    ':sessao_id'      => $sessaoId,
                    ':racha_id'       => $rachaId,
                    ':jogador_id'     => $jogadorSubstituidoId,
                    ':categoria'      => $catSub,
                    ':confirmado_por' => $confirmadoPor,
                    ':usuario_id'     => $usuarioId
                ]);
                $initPresId = (int)$this->pdo->lastInsertId();

                // Atualiza a convocação do substituído para 'vaga_liberada'
                $upConvSub = $this->pdo->prepare("
                    UPDATE racha_sessao_convocacoes
                    SET situacao_vaga = 'vaga_liberada',
                        updated_at = NOW()
                    WHERE id = :id
                ");
                $upConvSub->execute([':id' => $convSub['id']]);

                $presencaSubstituido = [
                    'id'                       => $initPresId,
                    'status_presenca'          => 'pendente_apuracao',
                    'categoria'                => $catSub,
                    'motivo_falta_justificada' => null
                ];
            }

            $statusAnteriorSubstituido = (string)$presencaSubstituido['status_presenca'];
            if (!in_array($statusAnteriorSubstituido, ['presente', 'pendente_apuracao'], true)) {
                throw new HttpError(
                    "Operação rejeitada: O jogador #{$jogadorSubstituidoId} está com status '{$statusAnteriorSubstituido}', não possuindo vaga ativa para ceder em substituição.",
                    400
                );
            }

            // Verifica se já existe outro substituto vinculado a este substituído
            $stmtExistingSub = $this->pdo->prepare("
                SELECT id, jogador_id
                FROM racha_sessao_presencas
                WHERE sessao_id = :sessao_id AND racha_id = :racha_id AND substituiu_jogador_id = :sub_id AND status_presenca = 'presente'
                FOR UPDATE
            ");
            $stmtExistingSub->execute([
                ':sessao_id' => $sessaoId,
                ':racha_id'  => $rachaId,
                ':sub_id'    => $jogadorSubstituidoId
            ]);
            if ($stmtExistingSub->fetch()) {
                throw new HttpError("Conflito: O jogador #{$jogadorSubstituidoId} já foi substituído nesta sessão.", 409);
            }

            // 3. Valida participante substituto no mesmo racha
            $partSubstituto = $this->getParticipant($rachaId, $jogadorSubstitutoId);
            if ((int)$partSubstituto['ativo'] !== 1) {
                throw new HttpError("Operação rejeitada: O substituto #{$jogadorSubstitutoId} está inativo no racha #{$rachaId}.", 400);
            }

            $stmtDupSubstituto = $this->pdo->prepare("
                SELECT id, status_presenca
                FROM racha_sessao_presencas
                WHERE sessao_id = :sessao_id AND jogador_id = :jogador_id
                FOR UPDATE
            ");
            $stmtDupSubstituto->execute([':sessao_id' => $sessaoId, ':jogador_id' => $jogadorSubstitutoId]);
            if ($stmtDupSubstituto->fetch()) {
                throw new HttpError("Conflito: O substituto #{$jogadorSubstitutoId} já possui registro de presença na sessão #{$sessaoId}.", 409);
            }

            // 4. Atualiza status do jogador substituído
            $stmtUpSubstituido = $this->pdo->prepare("
                UPDATE racha_sessao_presencas
                SET status_presenca = :status_saida,
                    motivo_falta_justificada = :motivo,
                    alterado_por_usuario_id = :usuario_id,
                    alterado_em = NOW()
                WHERE id = :id
            ");
            $stmtUpSubstituido->execute([
                ':status_saida' => $statusSaidaSubstituido,
                ':motivo'       => $motivoLimpo,
                ':usuario_id'   => $usuarioId,
                ':id'           => $presencaSubstituido['id']
            ]);

            $tipoEventoSaida = ($statusSaidaSubstituido === 'cancelado_no_prazo')
                ? 'cancelamento_participacao'
                : 'alteracao_presenca';

            $this->recordSessionEvent(
                $rachaId,
                $sessaoId,
                $tipoEventoSaida,
                $usuarioId,
                $motivoLimpo,
                [
                    'presenca_id'          => (int)$presencaSubstituido['id'],
                    'jogador_id'           => $jogadorSubstituidoId,
                    'nome_jogador'         => $partSubstituido['nome_jogador'],
                    'status_anterior'      => $statusAnteriorSubstituido,
                    'status_novo'          => $statusSaidaSubstituido,
                    'substituido_por_id'   => $jogadorSubstitutoId,
                    'motivo'               => $motivoLimpo
                ],
                $jogadorSubstituidoId,
                null,
                $statusAnteriorSubstituido,
                $statusSaidaSubstituido
            );

            // 5. Insere o substituto vinculado a substituiu_jogador_id
            $categoriaSubstituto = ($partSubstituto['tipo_participacao'] === 'mensalista') ? 'mensalista' : 'avulso';
            $stmtInSubstituto = $this->pdo->prepare("
                INSERT INTO racha_sessao_presencas (
                    sessao_id, racha_id, jogador_id, categoria, status_presenca,
                    motivo_falta_justificada, substituiu_jogador_id, hora_confirmacao,
                    confirmado_por, alterado_por_usuario_id, alterado_em, created_at
                ) VALUES (
                    :sessao_id, :racha_id, :jogador_id, :categoria, 'presente',
                    :motivo, :substituiu_id, NOW(),
                    :confirmado_por, :usuario_id, NOW(), NOW()
                )
            ");
            $stmtInSubstituto->execute([
                ':sessao_id'      => $sessaoId,
                ':racha_id'       => $rachaId,
                ':jogador_id'     => $jogadorSubstitutoId,
                ':categoria'      => $categoriaSubstituto,
                ':motivo'         => $motivoLimpo,
                ':substituiu_id'  => $jogadorSubstituidoId,
                ':confirmado_por' => $confirmadoPor,
                ':usuario_id'     => $usuarioId
            ]);

            $presencaSubstitutoId = (int)$this->pdo->lastInsertId();

            $this->recordSessionEvent(
                $rachaId,
                $sessaoId,
                'substituicao_participante',
                $usuarioId,
                $motivoLimpo,
                [
                    'presenca_id'                => $presencaSubstitutoId,
                    'jogador_id'                 => $jogadorSubstitutoId,
                    'nome_jogador'               => $partSubstituto['nome_jogador'],
                    'categoria'                  => $categoriaSubstituto,
                    'status_anterior'            => null,
                    'status_novo'                => 'presente',
                    'substituiu_jogador_id'      => $jogadorSubstituidoId,
                    'nome_jogador_substituido'   => $partSubstituido['nome_jogador'],
                    'status_anterior_substituido'=> $statusAnteriorSubstituido,
                    'status_saida_substituido'   => $statusSaidaSubstituido,
                    'confirmado_por'             => $confirmadoPor,
                    'motivo'                     => $motivoLimpo
                ],
                $jogadorSubstitutoId,
                $jogadorSubstituidoId,
                null,
                'presente'
            );

            $this->pdo->commit();

            return [
                'sessao_id'   => $sessaoId,
                'racha_id'    => $rachaId,
                'substituido' => [
                    'jogador_id'      => $jogadorSubstituidoId,
                    'nome_jogador'    => $partSubstituido['nome_jogador'],
                    'status_anterior' => $statusAnteriorSubstituido,
                    'status_presenca' => $statusSaidaSubstituido
                ],
                'substituto'  => [
                    'id'                    => $presencaSubstitutoId,
                    'jogador_id'            => $jogadorSubstitutoId,
                    'nome_jogador'          => $partSubstituto['nome_jogador'],
                    'categoria'             => $categoriaSubstituto,
                    'status_presenca'       => 'presente',
                    'substituiu_jogador_id' => $jogadorSubstituidoId
                ],
                'usuario_id'  => $usuarioId,
                'motivo'      => $motivoLimpo
            ];
        } catch (PDOException $e) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            if ($e->getCode() === '23000' || strpos($e->getMessage(), '1062') !== false) {
                throw new HttpError("Conflito de concorrência ao registrar substituto #{$jogadorSubstitutoId} na sessão #{$sessaoId}.", 409);
            }
            throw $e;
        } catch (Throwable $e) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            throw $e;
        }
    }

    // =========================================================================
    // 4. MOTOR DE CÁLCULO DE FREQUÊNCIA (REGRAS MATEMÁTICAS ESTABELECIDAS)
    // =========================================================================

    /**
     * Calcula os indicadores de frequência de um participante individual no racha.
     */
    public function calculatePlayerAttendance(
        int $rachaId,
        int $jogadorId,
        ?string $dataInicio = null,
        ?string $dataFim = null
    ): array {
        $part = $this->getParticipant($rachaId, $jogadorId);

        $sql = "
            SELECT 
                rsp.status_presenca,
                rs.status as sessao_status,
                rs.apuracao_presenca as sessao_apuracao
            FROM racha_sessao_presencas rsp
            JOIN racha_sessoes rs ON rs.id = rsp.sessao_id AND rs.racha_id = rsp.racha_id
            WHERE rsp.racha_id = :racha_id 
              AND rsp.jogador_id = :jogador_id
        ";
        $params = [
            ':racha_id'   => $rachaId,
            ':jogador_id' => $jogadorId
        ];

        if ($dataInicio !== null) {
            $sql .= " AND rs.data_racha >= :data_inicio";
            $params[':data_inicio'] = $dataInicio;
        }
        if ($dataFim !== null) {
            $sql .= " AND rs.data_racha <= :data_fim";
            $params[':data_fim'] = $dataFim;
        }

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        $records = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $presencasOficiais      = 0;
        $faltasInjustificadas   = 0;
        $faltasJustificadas     = 0;
        $canceladosNoPrazo      = 0;
        $pendentesApuracao      = 0;
        $historicoLegado        = 0;
        $sessoesCanceladasTotal = 0;

        foreach ($records as $rec) {
            if ($rec['sessao_status'] === 'cancelada') {
                $sessoesCanceladasTotal++;
                continue;
            }

            if ($rec['sessao_apuracao'] !== 'homologada') {
                $pendentesApuracao++;
                continue;
            }

            switch ($rec['status_presenca']) {
                case 'presente':
                    $presencasOficiais++;
                    break;
                case 'falta_injustificada':
                    $faltasInjustificadas++;
                    break;
                case 'falta_justificada':
                    $faltasJustificadas++;
                    break;
                case 'cancelado_no_prazo':
                    $canceladosNoPrazo++;
                    break;
                case 'pendente_apuracao':
                    $pendentesApuracao++;
                    break;
                case 'historico_legado_intencao':
                    $historicoLegado++;
                    break;
            }
        }

        $oportunidadesValidas = $presencasOficiais + $faltasInjustificadas;

        if ($oportunidadesValidas === 0) {
            return [
                'has_history'               => false,
                'jogador_id'                => $jogadorId,
                'nome_jogador'              => $part['nome_jogador'],
                'tipo_participacao'         => $part['tipo_participacao'],
                'ativo'                     => (int)$part['ativo'] === 1,
                'presencas_oficiais'        => $presencasOficiais,
                'faltas_injustificadas'     => $faltasInjustificadas,
                'faltas_justificadas'       => $faltasJustificadas,
                'cancelados_no_prazo'       => $canceladosNoPrazo,
                'pendentes_apuracao'        => $pendentesApuracao,
                'historico_legado_intencao' => $historicoLegado,
                'sessoes_canceladas'        => $sessoesCanceladasTotal,
                'oportunidades_validas'     => 0,
                'taxa_presenca'             => null,
                'taxa_falta_injustificada'  => null,
                'taxa_presenca_pct'         => null,
                'taxa_falta_pct'            => null,
                'mensagem'                  => 'Sem histórico de oportunidades válidas para apuração de frequência.'
            ];
        }

        $taxaPresenca = round($presencasOficiais / $oportunidadesValidas, 4);
        $taxaFalta = round($faltasInjustificadas / $oportunidadesValidas, 4);

        return [
            'has_history'               => true,
            'jogador_id'                => $jogadorId,
            'nome_jogador'              => $part['nome_jogador'],
            'tipo_participacao'         => $part['tipo_participacao'],
            'ativo'                     => (int)$part['ativo'] === 1,
            'presencas_oficiais'        => $presencasOficiais,
            'faltas_injustificadas'     => $faltasInjustificadas,
            'faltas_justificadas'       => $faltasJustificadas,
            'cancelados_no_prazo'       => $canceladosNoPrazo,
            'pendentes_apuracao'        => $pendentesApuracao,
            'historico_legado_intencao' => $historicoLegado,
            'sessoes_canceladas'        => $sessoesCanceladasTotal,
            'oportunidades_validas'     => $oportunidadesValidas,
            'taxa_presenca'             => $taxaPresenca,
            'taxa_falta_injustificada'  => $taxaFalta,
            'taxa_presenca_pct'         => round($taxaPresenca * 100, 2),
            'taxa_falta_pct'            => round($taxaFalta * 100, 2),
            'mensagem'                  => 'Frequência apurada com sucesso.'
        ];
    }

    /**
     * Calcula a frequência consolidada do racha e de todos os seus participantes
     */
    public function calculateRachaAttendance(
        int $rachaId,
        ?string $dataInicio = null,
        ?string $dataFim = null
    ): array {
        $stmtR = $this->pdo->prepare("SELECT id, nome FROM rachas WHERE id = :id");
        $stmtR->execute([':id' => $rachaId]);
        $racha = $stmtR->fetch();
        if (!$racha) {
            throw new HttpError("Racha #{$rachaId} não encontrado.", 404);
        }

        $stmtParts = $this->pdo->prepare("
            SELECT jogador_id 
            FROM racha_participantes 
            WHERE racha_id = :racha_id
            ORDER BY id ASC
        ");
        $stmtParts->execute([':racha_id' => $rachaId]);
        $participantes = $stmtParts->fetchAll(PDO::FETCH_COLUMN);

        $totalPresencas       = 0;
        $totalFaltasInjust    = 0;
        $totalFaltasJust      = 0;
        $totalCanceladosPrazo = 0;
        $totalPendentes       = 0;
        $totalHistoricoLegado = 0;
        $detalhes             = [];

        foreach ($participantes as $jogId) {
            $att = $this->calculatePlayerAttendance($rachaId, (int)$jogId, $dataInicio, $dataFim);
            $detalhes[] = $att;

            $totalPresencas       += $att['presencas_oficiais'];
            $totalFaltasInjust    += $att['faltas_injustificadas'];
            $totalFaltasJust      += $att['faltas_justificadas'];
            $totalCanceladosPrazo += $att['cancelados_no_prazo'];
            $totalPendentes       += $att['pendentes_apuracao'];
            $totalHistoricoLegado += $att['historico_legado_intencao'];
        }

        $totalOportunidades = $totalPresencas + $totalFaltasInjust;

        if ($totalOportunidades === 0) {
            return [
                'has_history'               => false,
                'racha_id'                  => $rachaId,
                'racha_nome'                => (string)$racha['nome'],
                'total_participantes'       => count($participantes),
                'presencas_oficiais'        => $totalPresencas,
                'faltas_injustificadas'     => $totalFaltasInjust,
                'faltas_justificadas'       => $totalFaltasJust,
                'cancelados_no_prazo'       => $totalCanceladosPrazo,
                'pendentes_apuracao'        => $totalPendentes,
                'historico_legado_intencao' => $totalHistoricoLegado,
                'oportunidades_validas'     => 0,
                'taxa_presenca'             => null,
                'taxa_falta_injustificada'  => null,
                'taxa_presenca_pct'         => null,
                'taxa_falta_pct'            => null,
                'mensagem'                  => 'Sem histórico consolidado de oportunidades válidas para apuração no racha.',
                'participantes'             => $detalhes
            ];
        }

        $taxaPresencaConsolidada = round($totalPresencas / $totalOportunidades, 4);
        $taxaFaltaConsolidada = round($totalFaltasInjust / $totalOportunidades, 4);

        return [
            'has_history'               => true,
            'racha_id'                  => $rachaId,
            'racha_nome'                => (string)$racha['nome'],
            'total_participantes'       => count($participantes),
            'presencas_oficiais'        => $totalPresencas,
            'faltas_injustificadas'     => $totalFaltasInjust,
            'faltas_justificadas'       => $totalFaltasJust,
            'cancelados_no_prazo'       => $totalCanceladosPrazo,
            'pendentes_apuracao'        => $totalPendentes,
            'historico_legado_intencao' => $totalHistoricoLegado,
            'oportunidades_validas'     => $totalOportunidades,
            'taxa_presenca'             => $taxaPresencaConsolidada,
            'taxa_falta_injustificada'  => $taxaFaltaConsolidada,
            'taxa_presenca_pct'         => round($taxaPresencaConsolidada * 100, 2),
            'taxa_falta_pct'            => round($taxaFaltaConsolidada * 100, 2),
            'mensagem'                  => 'Frequência consolidada do racha apurada com sucesso.',
            'participantes'             => $detalhes
        ];
    }
}
