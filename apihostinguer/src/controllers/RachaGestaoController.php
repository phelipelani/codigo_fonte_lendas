<?php
/**
 * Controller REST de Gestão Multi-Racha, Presença, Fila de Espera e WhatsApp
 * Arquivo: apihostinguer/src/controllers/RachaGestaoController.php
 *
 * Responsabilidades (Fase 4.0 — Etapa 3C.3):
 * 1. Expor as operações de presença, fila, participantes e WhatsApp para a interface do organizador.
 * 2. Autenticação e autorização estritas via RachaScopeMiddleware (nunca confia em racha_id ou usuario_id do body).
 * 3. Orquestração limpa delegando a PresenceEngine, RachaQueueService e WhatsAppEvolutionService sem duplicar regras de negócio.
 * 4. Respostas previsíveis em JSON com códigos de status HTTP sem vazamento de chaves ou segredos.
 */

require_once __DIR__ . '/../middleware/RachaScopeMiddleware.php';
require_once __DIR__ . '/../utils/HttpError.php';
require_once __DIR__ . '/../services/PresenceEngine.php';
require_once __DIR__ . '/../services/RachaQueueService.php';
require_once __DIR__ . '/../services/WhatsAppEvolutionService.php';

class RachaGestaoController
{
    private PDO $pdo;
    private PresenceEngine $presenceEngine;
    private RachaQueueService $queueService;
    private WhatsAppEvolutionService $whatsappService;

    public function __construct(
        ?PDO $pdo = null,
        ?PresenceEngine $presenceEngine = null,
        ?RachaQueueService $queueService = null,
        ?WhatsAppEvolutionService $whatsappService = null
    ) {
        $this->pdo = RachaScopeMiddleware::getPdo($pdo);
        $this->presenceEngine = $presenceEngine ?? new PresenceEngine($this->pdo);
        $this->queueService = $queueService ?? new RachaQueueService($this->pdo);
        $this->whatsappService = $whatsappService ?? new WhatsAppEvolutionService($this->pdo, $this->queueService);
    }

    /**
     * Extrai e decodifica o body JSON da requisição.
     */
    private ?array $mockJsonInput = null;

    public function setJsonInput(?array $input): void
    {
        $this->mockJsonInput = $input;
    }

    private function getJsonInput(): array
    {
        if ($this->mockJsonInput !== null) {
            return $this->mockJsonInput;
        }
        $raw = file_get_contents('php://input');
        if (!$raw || trim($raw) === '') {
            return [];
        }
        $data = json_decode($raw, true);
        if (json_last_error() !== JSON_ERROR_NONE || !is_array($data)) {
            throw new HttpError('Corpo da requisição deve ser um JSON válido.', 400);
        }
        return $data;
    }

    // =========================================================================
    // 0. MEUS RACHAS (Lista de rachas em que o usuário autenticado é organizador)
    // =========================================================================

    public function meusRachas(): array
    {
        $authUser = AuthMiddleware::isAuthenticated();
        $userId = (int)($authUser['id'] ?? $authUser['userId'] ?? 0);

        if ($userId <= 0) {
            throw new HttpError('Usuário autenticado inválido.', 401);
        }

        $stmt = $this->pdo->prepare("
            SELECT r.id, r.nome, r.dia_semana, r.horario_inicio, r.local_nome,
                   r.limite_vagas, r.valor_mensalidade_padrao, r.valor_avulso_padrao,
                   r.ativo, ro.papel
            FROM rachas r
            JOIN racha_organizadores ro ON ro.racha_id = r.id
            WHERE ro.usuario_id = :user_id AND r.ativo = 1
            ORDER BY r.nome ASC
        ");
        $stmt->execute([':user_id' => $userId]);
        $rachas = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return [
            'ok'     => true,
            'rachas' => $rachas
        ];
    }

    // =========================================================================
    // 1. WHATSAPP (Conexão, QR Code, Status, Desconexão)
    // =========================================================================

    public function getWhatsAppStatus(?int $explicitRachaId = null): array
    {
        $scope = RachaScopeMiddleware::requireOrganizador(['dono', 'financeiro', 'auxiliar'], $explicitRachaId, $this->pdo);
        $rachaId = $scope['rachaId'];

        $status = $this->whatsappService->getConnectionStatus($rachaId, true);

        return [
            'ok'     => true,
            'status' => $status
        ];
    }

    public function conectarWhatsApp(?int $explicitRachaId = null): array
    {
        $scope = RachaScopeMiddleware::requireOrganizador(['dono'], $explicitRachaId, $this->pdo);
        $rachaId = $scope['rachaId'];
        $usuarioId = $scope['userId'];

        $res = $this->whatsappService->connectOrGetQrCode($rachaId, $usuarioId);

        if (!empty($res['status_conexao']) && $res['status_conexao'] === 'erro') {
            $codigo = $res['ultimo_erro_codigo'] ?? 'ERRO_CONEXAO';
            $msg = $res['ultimo_erro_resumo'] ?? $res['mensagem_status'] ?? 'Não foi possível conectar ao WhatsApp.';
            if ($codigo === 'CONFIG_MISSING') {
                $msg = 'A integração com WhatsApp requer a configuração da Evolution API (EVOLUTION_URL e EVOLUTION_APIKEY) no servidor.';
                throw new HttpError($msg, 503);
            }
            throw new HttpError($msg, 400);
        }

        return [
            'ok'        => true,
            'conexao'   => $res
        ];
    }

        public function simularConexaoWhatsApp(?int $explicitRachaId = null): array
    {
        $scope = RachaScopeMiddleware::requireOrganizador(['dono'], $explicitRachaId, $this->pdo);
        $res = $this->whatsappService->simulateInstanceConnected($scope['rachaId'], $scope['userId']);

        return [
            'ok'      => true,
            'conexao' => $res
        ];
    }

    public function desconectarWhatsApp(?int $explicitRachaId = null): array
    {
        $scope = RachaScopeMiddleware::requireOrganizador(['dono'], $explicitRachaId, $this->pdo);
        $rachaId = $scope['rachaId'];
        $usuarioId = $scope['userId'];

        $res = $this->whatsappService->disconnectInstance($rachaId, $usuarioId);

        return [
            'ok'                => true,
            'resultado'         => $res,
            'apuracao_presenca' => 'em_andamento'
        ];
    }

    // =========================================================================
    // 2. PARTICIPANTES (Listagem, Filtros, Elegibilidade e Cadastro de Avulso)
    // =========================================================================

    public function listarParticipantes(?int $explicitRachaId = null): array
    {
        $scope = RachaScopeMiddleware::requireOrganizador(['dono', 'financeiro', 'auxiliar'], $explicitRachaId, $this->pdo);
        $rachaId = $scope['rachaId'];

        $tipo = $_GET['tipo'] ?? 'todos';
        $busca = trim((string)($_GET['busca'] ?? ''));

        $sql = "
            SELECT rp.racha_id, rp.jogador_id, rp.tipo_participacao, rp.ativo,
                   j.nome, j.apelido_bot, j.whatsapp, j.posicao, j.usuario_id,
                   rm.status AS status_mensalidade
            FROM racha_participantes rp
            JOIN jogadores j ON j.id = rp.jogador_id
            LEFT JOIN racha_mensalistas rm ON rm.racha_id = rp.racha_id AND rm.jogador_id = rp.jogador_id AND rm.data_fim IS NULL
            WHERE rp.racha_id = :racha_id
        ";
        $params = [':racha_id' => $rachaId];

        if ($tipo !== 'todos' && in_array($tipo, ['mensalista', 'avulso_recorrente', 'avulso_convidado'], true)) {
            $sql .= " AND rp.tipo_participacao = :tipo";
            $params[':tipo'] = $tipo;
        }

        if ($busca !== '') {
            $sql .= " AND (j.nome LIKE :busca OR j.apelido_bot LIKE :busca OR j.whatsapp LIKE :busca)";
            $params[':busca'] = '%' . $busca . '%';
        }

        $sql .= " ORDER BY (CASE WHEN rp.tipo_participacao = 'mensalista' THEN 1 WHEN rp.tipo_participacao = 'avulso_recorrente' THEN 2 ELSE 3 END), j.nome ASC";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $participantes = array_map(function ($row) {
            return [
                'jogador_id'            => (int)$row['jogador_id'],
                'nome'                  => (string)$row['nome'],
                'apelido'               => $row['apelido_bot'],
                'whatsapp'              => (string)$row['whatsapp'],
                'posicao'               => (string)($row['posicao'] ?? 'linha'),
                'tipo_participacao'     => (string)$row['tipo_participacao'],
                'ativo'                 => (int)$row['ativo'] === 1,
                'elegivel_convocacao'   => (int)$row['ativo'] === 1 && !empty($row['whatsapp']),
                'possui_login'          => $row['usuario_id'] !== null,
                'status_mensalidade'    => $row['status_mensalidade'] ?? null
            ];
        }, $rows);

        return [
            'ok'            => true,
            'racha_id'      => $rachaId,
            'total'         => count($participantes),
            'participantes' => $participantes
        ];
    }

    public function cadastrarParticipante(?int $explicitRachaId = null): array
    {
        $scope = RachaScopeMiddleware::requireOrganizador(['dono', 'auxiliar'], $explicitRachaId, $this->pdo);
        $rachaId = $scope['rachaId'];
        $usuarioId = $scope['userId'];

        $input = $this->getJsonInput();

        $nome = trim((string)($input['nome'] ?? ''));
        $whatsapp = trim((string)($input['whatsapp'] ?? ''));
        $tipoParticipacao = trim((string)($input['tipo_participacao'] ?? 'avulso_convidado'));
        $posicao = trim((string)($input['posicao'] ?? 'linha'));
        $apelido = isset($input['apelido']) ? trim((string)$input['apelido']) : null;
        $usuarioIdVinculo = isset($input['usuario_id']) && $input['usuario_id'] !== null ? (int)$input['usuario_id'] : null;

        if ($nome === '') {
            throw new HttpError('Nome do participante é obrigatório.', 400);
        }
        if ($whatsapp === '') {
            throw new HttpError('Número de WhatsApp é obrigatório.', 400);
        }

        $res = $this->queueService->registerOrReuseParticipant(
            $rachaId,
            $nome,
            $whatsapp,
            $tipoParticipacao,
            $usuarioId,
            $usuarioIdVinculo,
            $posicao,
            $apelido
        );

        return [
            'ok'                => true,
            'resultado'         => $res,
            'apuracao_presenca' => 'em_andamento'
        ];
    }

    // =========================================================================
    // 3. SESSÕES, CONVOCAÇÕES, FILA DE ESPERA E MENSAGENS
    // =========================================================================

    public function getSessaoAtiva(?int $explicitRachaId = null): array
    {
        $scope = RachaScopeMiddleware::requireOrganizador(['dono', 'financeiro', 'auxiliar'], $explicitRachaId, $this->pdo);
        $rachaId = $scope['rachaId'];

        // Busca sessão com convocação aberta ou mais recente em andamento
        $stmt = $this->pdo->prepare("
            SELECT rs.*, r.limite_vagas, r.nome AS racha_nome
            FROM racha_sessoes rs
            JOIN rachas r ON r.id = rs.racha_id
            WHERE rs.racha_id = :racha_id
              AND rs.status NOT IN ('cancelada')
            ORDER BY (CASE WHEN rs.status IN ('agendada', 'aberta', 'em_andamento') AND rs.apuracao_presenca != 'homologada' THEN 0 ELSE 1 END),
                     rs.data_racha DESC, rs.id DESC
            LIMIT 1
        ");
        $stmt->execute([':racha_id' => $rachaId]);
        $sessao = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$sessao) {
            return [
                'ok'            => true,
                'possui_sessao' => false,
                'sessao'        => null
            ];
        }

        $sessaoId = (int)$sessao['id'];
        $filaStatus = $this->queueService->getSessionQueueAndConvocationStatus($rachaId, $sessaoId);
        $sessaoResumo = $this->presenceEngine->getSession($rachaId, $sessaoId);

        // Agrupamento específico para visualização intuitiva do organizador
        $stmtConv = $this->pdo->prepare("
            SELECT rsc.*, j.nome, j.apelido_bot, j.whatsapp, j.posicao,
                   rwm.status_envio AS msg_status, rwm.enviado_em AS msg_enviado_em
            FROM racha_sessao_convocacoes rsc
            JOIN jogadores j ON j.id = rsc.jogador_id
            LEFT JOIN (
                SELECT racha_id, sessao_id, jogador_id, status_envio, enviado_em
                FROM racha_whatsapp_mensagens
                WHERE racha_id = :racha_id1 AND sessao_id = :sessao_id1 AND tipo_mensagem = 'convocacao_semanal'
                ORDER BY id DESC
            ) rwm ON rwm.jogador_id = rsc.jogador_id
            WHERE rsc.racha_id = :racha_id2 AND rsc.sessao_id = :sessao_id2
            ORDER BY rsc.ordem_fila ASC, j.nome ASC
        ");
        $stmtConv->execute([
            ':racha_id1'  => $rachaId,
            ':sessao_id1' => $sessaoId,
            ':racha_id2'  => $rachaId,
            ':sessao_id2' => $sessaoId
        ]);
        $convocados = $stmtConv->fetchAll(PDO::FETCH_ASSOC);

        $mensalistasReservados = [];
        $mensalistasRecusaram = [];
        $mensalistasAguardando = [];
        $filaEspera = [];
        $avulsosPromovidos = [];
        $pendentesNotificacao = [];

        foreach ($convocados as $c) {
            $item = [
                'jogador_id'                    => (int)$c['jogador_id'],
                'nome'                          => (string)$c['nome'],
                'apelido'                       => $c['apelido_bot'],
                'whatsapp'                      => (string)$c['telefone_destino'],
                'posicao'                       => (string)$c['posicao'],
                'tipo_participacao'             => (string)$c['tipo_participacao_convocacao'],
                'intencao_atual'                => (string)$c['intencao_atual'],
                'situacao_vaga'                 => (string)$c['situacao_vaga'],
                'ordem_fila'                    => $c['ordem_fila'] !== null ? (int)$c['ordem_fila'] : null,
                'status_envio'                  => (string)($c['status_envio'] ?? 'pendente_envio'),
                'notificacao_promocao_pendente' => (int)($c['notificacao_promocao_pendente'] ?? 0) === 1,
                'respondido_em'                 => $c['ultima_resposta_em'] ?? null
            ];

            if ($item['tipo_participacao'] === 'mensalista') {
                if ($item['situacao_vaga'] === 'vaga_reservada') {
                    $mensalistasReservados[] = $item;
                } elseif ($item['situacao_vaga'] === 'vaga_liberada') {
                    $mensalistasRecusaram[] = $item;
                } else {
                    $mensalistasAguardando[] = $item;
                }
            } else {
                if ($item['situacao_vaga'] === 'promovido_titular') {
                    $avulsosPromovidos[] = $item;
                } elseif ($item['situacao_vaga'] === 'fila_espera') {
                    $filaEspera[] = $item;
                } elseif ($item['situacao_vaga'] === 'aguardando_resposta' || $item['situacao_vaga'] === 'aguardando_confirmacao_tardia') {
                    $mensalistasAguardando[] = $item;
                }
            }

            if ($item['notificacao_promocao_pendente']) {
                $pendentesNotificacao[] = $item;
            }
        }

        return [
            'ok'                          => true,
            'possui_sessao'               => true,
            'sessao'                      => [
                'id'                      => $sessaoId,
                'racha_id'                => $rachaId,
                'racha_nome'              => (string)$sessao['racha_nome'],
                'data_racha'              => (string)$sessao['data_racha'],
                'horario_abertura'        => $sessao['horario_abertura'],
                'status'                  => (string)$sessao['status'],
                'apuracao_presenca'       => (string)$sessao['apuracao_presenca'],
                'homologado_em'           => $sessao['homologado_em'],
                'limite_vagas'            => (int)$sessao['limite_vagas'],
                'vagas_ocupadas'          => count($mensalistasReservados) + count($avulsosPromovidos),
                'vagas_disponiveis'       => max(0, (int)$sessao['limite_vagas'] - (count($mensalistasReservados) + count($avulsosPromovidos)))
            ],
            'fila_status'                 => $filaStatus,
            'resumo_presenca'             => $sessaoResumo,
            'mensalistas_reservados'      => $mensalistasReservados,
            'mensalistas_recusaram'       => $mensalistasRecusaram,
            'aguardando_resposta'         => $mensalistasAguardando,
            'fila_espera'                 => $filaEspera,
            'avulsos_promovidos'          => $avulsosPromovidos,
            'notificacoes_pendentes'      => $pendentesNotificacao
        ];
    }

    public function criarSessao(?int $explicitRachaId = null): array
    {
        $scope = RachaScopeMiddleware::requireOrganizador(['dono', 'auxiliar'], $explicitRachaId, $this->pdo);
        $rachaId = $scope['rachaId'];
        $usuarioId = $scope['userId'];

        $input = $this->getJsonInput();
        $dataRacha = trim((string)($input['data_racha'] ?? ''));
        $horarioInicio = trim((string)($input['horario_inicio'] ?? ''));
        $horarioFim = isset($input['horario_fim']) ? trim((string)$input['horario_fim']) : null;

        if ($dataRacha === '') {
            throw new HttpError('Data do racha é obrigatória (formato YYYY-MM-DD).', 400);
        }

        $sessao = $this->presenceEngine->createSession($rachaId, $dataRacha, $horarioInicio, $horarioFim, $usuarioId);

        return [
            'ok'     => true,
            'sessao' => $sessao
        ];
    }

    public function convocarParticipantes(int $sessaoId, ?int $explicitRachaId = null): array
    {
        $scope = RachaScopeMiddleware::requireOrganizador(['dono', 'auxiliar'], $explicitRachaId, $this->pdo);
        $rachaId = $scope['rachaId'];
        $usuarioId = $scope['userId'];

        $input = $this->getJsonInput();
        $jogadorIds = $input['jogador_ids'] ?? [];

        if (!is_array($jogadorIds) || empty($jogadorIds)) {
            throw new HttpError('Selecione pelo menos um participante para a convocação semanal.', 400);
        }

        $convocados = $this->queueService->prepareSessionConvocation($rachaId, $sessaoId, $jogadorIds, $usuarioId);

        return [
            'ok'        => true,
            'resultado' => $convocados
        ];
    }

    public function dispararConvocacao(int $sessaoId, ?int $explicitRachaId = null): array
    {
        $scope = RachaScopeMiddleware::requireOrganizador(['dono', 'auxiliar'], $explicitRachaId, $this->pdo);
        $rachaId = $scope['rachaId'];
        $usuarioId = $scope['userId'];

        $input = $this->getJsonInput();
        $res = $this->whatsappService->dispatchSessionConvocationMessages($rachaId, $sessaoId, $usuarioId, $input);

        return [
            'ok'                => true,
            'resultado'         => $res,
            'apuracao_presenca' => 'em_andamento'
        ];
    }

    public function fecharConvocacao(int $sessaoId, ?int $explicitRachaId = null): array
    {
        $scope = RachaScopeMiddleware::requireOrganizador(['dono', 'auxiliar'], $explicitRachaId, $this->pdo);
        $rachaId = $scope['rachaId'];
        $usuarioId = $scope['userId'];

        $input = $this->getJsonInput();
        $motivo = isset($input['motivo']) ? trim((string)$input['motivo']) : null;

        $res = $this->queueService->closeConvocation($rachaId, $sessaoId, $usuarioId, $motivo);

        return [
            'ok'        => true,
            'resultado' => $res
        ];
    }

    public function reabrirConvocacao(int $sessaoId, ?int $explicitRachaId = null): array
    {
        $scope = RachaScopeMiddleware::requireOrganizador(['dono', 'auxiliar'], $explicitRachaId, $this->pdo);
        $rachaId = $scope['rachaId'];
        $usuarioId = $scope['userId'];

        $input = $this->getJsonInput();
        $motivo = trim((string)($input['motivo'] ?? ''));

        if ($motivo === '') {
            throw new HttpError('Motivo para reabertura da convocação é obrigatório.', 400);
        }

        $res = $this->queueService->reopenConvocation($rachaId, $sessaoId, $usuarioId, $motivo);

        return [
            'ok'        => true,
            'resultado' => $res
        ];
    }

    public function dispararRenovacaoMensal(?int $sessaoId = null, ?int $explicitRachaId = null): array
    {
        $scope = RachaScopeMiddleware::requireOrganizador(['dono', 'financeiro'], $explicitRachaId, $this->pdo);
        $rachaId = $scope['rachaId'];
        $usuarioId = $scope['userId'];

        $input = $this->getJsonInput();

        // Determina competência (ano e mês)
        if (!empty($input['competencia']) && preg_match('/^(\d{4})-(\d{1,2})$/', trim((string)$input['competencia']), $mComp)) {
            $ano = (int)$mComp[1];
            $mes = (int)$mComp[2];
        } else {
            $ano = isset($input['ano']) ? (int)$input['ano'] : (int)date('Y');
            $mes = isset($input['mes']) ? (int)$input['mes'] : (int)date('n');
        }

        if ($ano < 2020 || $ano > 2100 || $mes < 1 || $mes > 12) {
            throw new HttpError("Competência inválida ('{$ano}-{$mes}'). Informe ano e mês válidos.", 400);
        }

        // Dados do racha para valores padrão e chave PIX
        $stmtRacha = $this->pdo->prepare("SELECT nome, valor_mensalidade_padrao, chave_pix, instrucoes_pagamento FROM rachas WHERE id = :id");
        $stmtRacha->execute([':id' => $rachaId]);
        $rachaData = $stmtRacha->fetch(PDO::FETCH_ASSOC) ?: [];
        $rachaNome = $rachaData['nome'] ?? 'Racha';

        $valorOverride = isset($input['valor_mensalidade']) && is_numeric($input['valor_mensalidade']) ? (float)$input['valor_mensalidade'] : null;
        $chavePixOverride = isset($input['chave_pix']) && trim((string)$input['chave_pix']) !== '' ? trim((string)$input['chave_pix']) : null;
        $instrucoesOverride = isset($input['instrucoes']) && trim((string)$input['instrucoes']) !== '' ? trim((string)$input['instrucoes']) : null;

        // Busca mensalistas ativos do racha
        $stmt = $this->pdo->prepare("
            SELECT rp.jogador_id, j.nome, j.apelido_bot, j.whatsapp, rm.valor_individual
            FROM racha_participantes rp
            JOIN jogadores j ON j.id = rp.jogador_id
            LEFT JOIN racha_mensalistas rm ON rm.racha_id = rp.racha_id AND rm.jogador_id = rp.jogador_id AND rm.status = 'ativo'
            WHERE rp.racha_id = :racha_id
              AND rp.tipo_participacao = 'mensalista'
              AND rp.ativo = 1
              AND j.whatsapp IS NOT NULL
        ");
        $stmt->execute([':racha_id' => $rachaId]);
        $mensalistas = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $enviados = 0;
        $pulados = 0;
        $falhas = 0;
        $resultados = [];

        foreach ($mensalistas as $m) {
            $jogId = (int)$m['jogador_id'];
            $tel = (string)$m['whatsapp'];
            $apelido = !empty($m['apelido_bot']) ? (string)$m['apelido_bot'] : (string)$m['nome'];

            // Verifica se já foi notificado/cobrado nesta competência para evitar cobranças duplicadas
            $stmtCheck = $this->pdo->prepare("
                SELECT id, status_envio, intencao_renovacao
                FROM racha_mensalistas_renovacoes
                WHERE racha_id = :racha_id AND jogador_id = :jogador_id
                  AND competencia_ano = :ano AND competencia_mes = :mes
            ");
            $stmtCheck->execute([
                ':racha_id'   => $rachaId,
                ':jogador_id' => $jogId,
                ':ano'        => $ano,
                ':mes'        => $mes
            ]);
            $existingRenov = $stmtCheck->fetch(PDO::FETCH_ASSOC);

            if ($existingRenov && $existingRenov['status_envio'] === 'enviado') {
                $pulados++;
                $resultados[] = [
                    'jogador_id'   => $jogId,
                    'nome'         => $apelido,
                    'status'       => 'pulado_ja_notificado',
                    'intencao'     => $existingRenov['intencao_renovacao']
                ];
                continue;
            }

            $serverValor = $m['valor_individual'] !== null ? (float)$m['valor_individual'] : ((float)($rachaData['valor_mensalidade_padrao'] ?? 0) > 0 ? (float)$rachaData['valor_mensalidade_padrao'] : null);
            $valorFinal = $serverValor ?? ($valorOverride ?? 0.00);

            $serverPix = !empty($rachaData['chave_pix']) ? (string)$rachaData['chave_pix'] : null;
            $chavePixFinal = $serverPix ?? ($chavePixOverride ?? '');

            $serverInstrucoes = !empty($rachaData['instrucoes_pagamento']) ? (string)$rachaData['instrucoes_pagamento'] : null;
            $instrucoesFinal = $serverInstrucoes ?? ($instrucoesOverride ?? '');

            // Registra ou atualiza registro em racha_mensalistas_renovacoes como pendente
            $stmtInsRenov = $this->pdo->prepare("
                INSERT INTO racha_mensalistas_renovacoes (
                    racha_id, jogador_id, competencia_ano, competencia_mes,
                    valor_cobrado, status_envio, intencao_renovacao,
                    enviado_em, disparado_por_usuario_id
                ) VALUES (
                    :racha_id, :jogador_id, :ano, :mes,
                    :valor, 'pendente', 'sem_resposta',
                    NOW(), :usuario_id
                )
                ON DUPLICATE KEY UPDATE
                    valor_cobrado = VALUES(valor_cobrado),
                    enviado_em = NOW(),
                    disparado_por_usuario_id = VALUES(disparado_por_usuario_id)
            ");
            $stmtInsRenov->execute([
                ':racha_id'   => $rachaId,
                ':jogador_id' => $jogId,
                ':ano'        => $ano,
                ':mes'        => $mes,
                ':valor'      => $valorFinal,
                ':usuario_id' => $usuarioId
            ]);

            $mesFormatado = sprintf('%02d', $mes);
            $texto = "Olá, {$apelido}! Esta é a mensagem de renovação da sua mensalidade no {$rachaNome} referente a {$mesFormatado}/{$ano}.\n\n"
                   . "Valor da mensalidade: R$ " . number_format($valorFinal, 2, ',', '.') . "\n";
            if ($chavePixFinal !== '') {
                $texto .= "Chave PIX: {$chavePixFinal}\n";
            }
            if ($instrucoesFinal !== '') {
                $texto .= "{$instrucoesFinal}\n";
            }
            $texto .= "\nPor favor, confirme se você continuará como mensalista respondendo:\n\n"
                   . "*RENOVAR SIM* - Continuo como mensalista\n"
                   . "*RENOVAR NÃO* - Não vou renovar a mensalidade\n\n"
                   . "(Aviso: esta resposta diz respeito exclusivamente à sua mensalidade e não cancela sua ficha imediatamente).";

            $chaveMsg = "renovacao:racha:{$rachaId}:jog:{$jogId}:comp:{$ano}-{$mes}";

            $res = $this->whatsappService->sendTextMessage(
                $rachaId,
                $tel,
                $texto,
                'renovacao_mensal',
                $chaveMsg,
                $sessaoId,
                $jogId,
                $usuarioId,
                $ano,
                $mes
            );

            $statusEnvio = $res['enviado'] ? 'enviado' : 'falha';
            $stmtUpRenov = $this->pdo->prepare("
                UPDATE racha_mensalistas_renovacoes
                SET status_envio = :status_envio,
                    enviado_em = NOW()
                WHERE racha_id = :racha_id AND jogador_id = :jogador_id
                  AND competencia_ano = :ano AND competencia_mes = :mes
            ");
            $stmtUpRenov->execute([
                ':status_envio' => $statusEnvio,
                ':racha_id'     => $rachaId,
                ':jogador_id'   => $jogId,
                ':ano'          => $ano,
                ':mes'          => $mes
            ]);

            if ($res['enviado']) {
                $enviados++;
            } else {
                $falhas++;
            }
            $resultados[] = array_merge($res, ['jogador_id' => $jogId, 'nome' => $apelido]);
        }

        return [
            'ok'          => true,
            'competencia' => sprintf('%04d-%02d', $ano, $mes),
            'total'       => count($mensalistas),
            'enviados'    => $enviados,
            'pulados'     => $pulados,
            'falhas'      => $falhas,
            'resultados'  => $resultados
        ];
    }

    public function listarRenovacoes(?int $explicitRachaId = null): array
    {
        $scope = RachaScopeMiddleware::requireOrganizador(['dono', 'financeiro'], $explicitRachaId, $this->pdo);
        $rachaId = $scope['rachaId'];

        $input = $this->getJsonInput();
        $compQuery = $_GET['competencia'] ?? ($input['competencia'] ?? '');
        if ($compQuery !== '' && preg_match('/^(\d{4})-(\d{1,2})$/', trim($compQuery), $mComp)) {
            $ano = (int)$mComp[1];
            $mes = (int)$mComp[2];
        } else {
            $ano = isset($_GET['ano']) ? (int)$_GET['ano'] : (isset($input['ano']) ? (int)$input['ano'] : (int)date('Y'));
            $mes = isset($_GET['mes']) ? (int)$_GET['mes'] : (isset($input['mes']) ? (int)$input['mes'] : (int)date('n'));
        }

        $stmt = $this->pdo->prepare("
            SELECT rmr.*, j.nome, j.posicao, j.whatsapp, j.apelido_bot
            FROM racha_mensalistas_renovacoes rmr
            JOIN jogadores j ON j.id = rmr.jogador_id
            WHERE rmr.racha_id = :racha_id
              AND rmr.competencia_ano = :ano
              AND rmr.competencia_mes = :mes
            ORDER BY j.nome ASC
        ");
        $stmt->execute([
            ':racha_id' => $rachaId,
            ':ano'      => $ano,
            ':mes'      => $mes
        ]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return [
            'ok'          => true,
            'competencia' => sprintf('%04d-%02d', $ano, $mes),
            'total'       => count($rows),
            'renovacoes'  => $rows
        ];
    }

    public function dispararComunicado(int $sessaoId, ?int $explicitRachaId = null): array
    {
        $scope = RachaScopeMiddleware::requireOrganizador(['dono', 'auxiliar'], $explicitRachaId, $this->pdo);
        $rachaId = $scope['rachaId'];
        $usuarioId = $scope['userId'];

        $input = $this->getJsonInput();
        $texto = trim((string)($input['texto'] ?? ''));
        $jogadorIds = $input['jogador_ids'] ?? [];

        if ($texto === '') {
            throw new HttpError('Texto do comunicado é obrigatório.', 400);
        }

        if (empty($jogadorIds)) {
            throw new HttpError('Selecione pelo menos um destinatário para o comunicado.', 400);
        }

        // Resolve lista de telefones dos jogadores selecionados
        $placeholders = implode(',', array_fill(0, count($jogadorIds), '?'));
        $stmt = $this->pdo->prepare("
            SELECT j.id, j.nome, j.whatsapp
            FROM racha_participantes rp
            JOIN jogadores j ON j.id = rp.jogador_id
            WHERE rp.racha_id = ? AND rp.jogador_id IN ({$placeholders})
        ");
        $stmt->execute(array_merge([$rachaId], $jogadorIds));
        $destinatarios = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $enviados = 0;
        $falhas = 0;
        $resultados = [];

        foreach ($destinatarios as $d) {
            $jogId = (int)$d['id'];
            $tel = (string)$d['whatsapp'];
            if ($tel === '') {
                $falhas++;
                continue;
            }

            $chave = "comunicado:racha:{$rachaId}:sessao:{$sessaoId}:jog:{$jogId}:ts:" . time();

            $res = $this->whatsappService->sendTextMessage(
                $rachaId,
                $tel,
                $texto,
                'comunicado',
                $chave,
                $sessaoId,
                $jogId,
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
            'ok'         => true,
            'total'      => count($destinatarios),
            'enviados'   => $enviados,
            'falhas'     => $falhas,
            'resultados' => $resultados
        ];
    }

    public function reenviarNotificacoesPromocao(int $sessaoId, ?int $explicitRachaId = null): array
    {
        $scope = RachaScopeMiddleware::requireOrganizador(['dono', 'auxiliar'], $explicitRachaId, $this->pdo);
        $rachaId = $scope['rachaId'];
        $usuarioId = $scope['userId'];

        $res = $this->whatsappService->resendPendingPromotionNotifications($rachaId, $sessaoId, $usuarioId);

        return [
            'ok'                => true,
            'resultado'         => $res,
            'apuracao_presenca' => 'em_andamento'
        ];
    }

    // =========================================================================
    // 4. PRESENÇA REAL, HOMOLOGAÇÃO, REABERTURA, SUBSTITUIÇÃO E CONCLUSÃO
    // =========================================================================

    public function homologarLista(int $sessaoId, ?int $explicitRachaId = null): array
    {
        $scope = RachaScopeMiddleware::requireOrganizador(['dono', 'auxiliar'], $explicitRachaId, $this->pdo);
        $rachaId = $scope['rachaId'];
        $usuarioId = $scope['userId'];

        $res = $this->presenceEngine->homologateSession($rachaId, $sessaoId, $usuarioId);

        return [
            'ok'                => true,
            'resultado'         => $res,
            'apuracao_presenca' => 'homologada'
        ];
    }

    public function reabrirLista(int $sessaoId, ?int $explicitRachaId = null): array
    {
        $scope = RachaScopeMiddleware::requireOrganizador(['dono', 'auxiliar'], $explicitRachaId, $this->pdo);
        $rachaId = $scope['rachaId'];
        $usuarioId = $scope['userId'];

        $input = $this->getJsonInput();
        $motivo = trim((string)($input['motivo'] ?? ''));

        if ($motivo === '') {
            throw new HttpError('Motivo para a reabertura da lista é obrigatório.', 400);
        }

        $res = $this->presenceEngine->reopenPresenceList($rachaId, $sessaoId, $usuarioId, $motivo);

        return [
            'ok'                => true,
            'resultado'         => $res,
            'apuracao_presenca' => 'em_andamento'
        ];
    }

    public function substituirParticipante(int $sessaoId, ?int $explicitRachaId = null): array
    {
        $scope = RachaScopeMiddleware::requireOrganizador(['dono', 'auxiliar'], $explicitRachaId, $this->pdo);
        $rachaId = $scope['rachaId'];
        $usuarioId = $scope['userId'];

        $input = $this->getJsonInput();
        $jogadorSaiuId = (int)($input['jogador_saiu_id'] ?? 0);
        $jogadorEntrouId = (int)($input['jogador_entrou_id'] ?? 0);
        $motivo = trim((string)($input['motivo'] ?? 'Substituição manual'));

        if ($jogadorSaiuId <= 0 || $jogadorEntrouId <= 0) {
            throw new HttpError('Identificadores do jogador que saiu e do jogador que entrou são obrigatórios.', 400);
        }

        $res = $this->presenceEngine->substituteParticipant(
            $rachaId,
            $sessaoId,
            $jogadorSaiuId,
            $jogadorEntrouId,
            $usuarioId,
            $motivo
        );

        return [
            'ok'                => true,
            'resultado'         => $res,
            'apuracao_presenca' => 'em_andamento'
        ];
    }

    public function registrarPresencasReais(int $sessaoId, ?int $explicitRachaId = null): array
    {
        $scope = RachaScopeMiddleware::requireOrganizador(['dono', 'auxiliar'], $explicitRachaId, $this->pdo);
        $rachaId = $scope['rachaId'];
        $usuarioId = $scope['userId'];

        $input = $this->getJsonInput();
        $presencas = $input['presencas'] ?? [];

        if (!is_array($presencas) || empty($presencas)) {
            throw new HttpError('Lista de presenças vazia.', 400);
        }

        $atualizados = 0;
        foreach ($presencas as $p) {
            $jogId = (int)($p['jogador_id'] ?? 0);
            $status = (string)($p['status_presenca'] ?? 'presente');
            $motivo = isset($p['motivo']) ? (string)$p['motivo'] : null;

            if ($jogId <= 0) continue;

            // Verifica se o participante já possui registro nesta sessão
            $stmtCheck = $this->pdo->prepare("
                SELECT id, status_presenca FROM racha_sessao_presencas
                WHERE sessao_id = :sessao_id AND jogador_id = :jogador_id
            ");
            $stmtCheck->execute([':sessao_id' => $sessaoId, ':jogador_id' => $jogId]);
            $existing = $stmtCheck->fetch(PDO::FETCH_ASSOC);

            if ($existing) {
                // Se já existir e o status for diferente, atualiza
                if ($existing['status_presenca'] !== $status) {
                    $this->presenceEngine->updatePresenceStatus($rachaId, $sessaoId, $jogId, $status, $usuarioId, $motivo);
                }
            } else {
                $this->presenceEngine->confirmPresence($rachaId, $sessaoId, $jogId, $status, 'organizador_manual', $usuarioId, $motivo);
            }
            $atualizados++;
        }

        return [
            'ok'          => true,
            'atualizados' => $atualizados
        ];
    }

    public function concluirSessao(int $sessaoId, ?int $explicitRachaId = null): array
    {
        $scope = RachaScopeMiddleware::requireOrganizador(['dono', 'auxiliar'], $explicitRachaId, $this->pdo);
        $rachaId = $scope['rachaId'];
        $usuarioId = $scope['userId'];

        $res = $this->presenceEngine->concludeSession($rachaId, $sessaoId, $usuarioId);
        $sessao = $this->presenceEngine->getSession($rachaId, $sessaoId);

        return [
            'ok'        => true,
            'resultado' => $res,
            'sessao'    => $sessao
        ];
    }

    public function getHistoricoSessao(int $sessaoId, ?int $explicitRachaId = null): array
    {
        $scope = RachaScopeMiddleware::requireOrganizador(['dono', 'financeiro', 'auxiliar'], $explicitRachaId, $this->pdo);
        $rachaId = $scope['rachaId'];

        // Garante que a sessão pertence estritamente ao racha do escopo
        $this->presenceEngine->getSession($rachaId, $sessaoId);

        $eventos = $this->presenceEngine->getSessionEvents($rachaId, $sessaoId);

        return [
            'ok'      => true,
            'total'   => count($eventos),
            'eventos' => $eventos
        ];
    }
}
