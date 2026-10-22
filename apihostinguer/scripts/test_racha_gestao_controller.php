<?php
/**
 * Suíte de Testes Automatizados — Etapa 3C.3
 * Arquivo: apihostinguer/scripts/test_racha_gestao_controller.php
 *
 * Valida os Controllers REST, autenticação por escopo, gestão de participantes,
 * conexão WhatsApp por QR Code, disparo das 3 mensagens (A. Semanal, B. Renovação, C. Comunicado),
 * desambiguação de respostas semanais e mensais, fila de espera, reenvio de notificações pendentes,
 * validação da presença real (homologação, reabertura, substituição e conclusão) e append-only.
 */

putenv('ENVIRONMENT=sandbox');
$_ENV['ENVIRONMENT'] = 'sandbox';
putenv('JWT_SECRET=super_secret_sandbox_jwt_test_key_123456');
$_ENV['JWT_SECRET'] = 'super_secret_sandbox_jwt_test_key_123456';

require_once __DIR__ . '/../config/database_sandbox.php';
require_once __DIR__ . '/../src/utils/JWT.php';
require_once __DIR__ . '/../src/utils/HttpError.php';
require_once __DIR__ . '/../src/middleware/AuthMiddleware.php';
require_once __DIR__ . '/../src/middleware/RachaScopeMiddleware.php';
require_once __DIR__ . '/../src/services/PresenceEngine.php';
require_once __DIR__ . '/../src/services/RachaQueueService.php';
require_once __DIR__ . '/../src/services/WhatsAppEvolutionService.php';
require_once __DIR__ . '/../src/controllers/RachaGestaoController.php';
require_once __DIR__ . '/../presenca/api/webhook_multiracha.php';

class MockTransportController
{
    public array $requests = [];
    public array $queuedResponses = [];
    public array $capturedWebhookTokensByInstance = [];

    public function queueNextResponse(string $endpointPrefix, array $response): void
    {
        $this->queuedResponses[$endpointPrefix][] = $response;
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

        if (str_starts_with($endpoint, '/webhook/set/')) {
            $inst = substr($endpoint, strlen('/webhook/set/'));
            $token = $body['headers']['X-Webhook-Token'] ?? null;
            if ($token) {
                $this->capturedWebhookTokensByInstance[$inst] = $token;
            }
        }

        foreach ($this->queuedResponses as $prefix => &$queue) {
            if (str_starts_with($endpoint, $prefix) && !empty($queue)) {
                return array_shift($queue);
            }
        }

        if (str_starts_with($endpoint, '/instance/create')) {
            return [
                'http_code' => 201,
                'data'      => [
                    'instance' => ['instanceName' => $body['instanceName'] ?? 'inst', 'state' => 'connecting'],
                    'qrcode'   => ['base64' => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==', 'code' => 'mock_qr_pair_123']
                ]
            ];
        }

        if (str_starts_with($endpoint, '/instance/connectionState/')) {
            return [
                'http_code' => 200,
                'data'      => [
                    'instance' => ['state' => 'close']
                ]
            ];
        }

        if (str_starts_with($endpoint, '/instance/connect/')) {
            return [
                'http_code' => 200,
                'data'      => [
                    'instance' => ['state' => 'connecting'],
                    'qrcode'   => ['base64' => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==', 'code' => 'mock_qr_code_connect_456']
                ]
            ];
        }

        if (str_starts_with($endpoint, '/webhook/set/')) {
            return [
                'http_code' => 200,
                'data'      => ['webhook' => ['enabled' => true]]
            ];
        }

        if (str_starts_with($endpoint, '/instance/logout/')) {
            return [
                'http_code' => 200,
                'data'      => ['status' => 'SUCCESS', 'message' => 'Logged out successfully']
            ];
        }

        if (str_starts_with($endpoint, '/message/sendText/')) {
            return [
                'http_code' => 201,
                'data'      => [
                    'key'     => ['id' => 'WAMID_MOCK_CTRL_' . uniqid('', true)],
                    'message' => ['conversation' => $body['text'] ?? '']
                ]
            ];
        }

        return [
            'http_code' => 200,
            'data'      => ['status' => 'OK']
        ];
    }
}

class RachaGestaoControllerTestSuite
{
    private PDO $pdo;
    private PresenceEngine $presenceEngine;
    private RachaQueueService $queueService;
    private WhatsAppEvolutionService $whatsappService;
    private MockTransportController $mockTransport;
    private RachaGestaoController $controller;

    private int $passed = 0;
    private int $failed = 0;

    private int $racha1Id = 1;
    private int $racha2Id = 2;
    private int $org1UserId = 1; // Dono do Racha 1
    private int $org2UserId = 2; // Dono do Racha 2
    private int $auxiliarUserId = 4; // Auxiliar do Racha 1
    private int $financeiroUserId = 3; // Financeiro do Racha 1
    private int $jogadorComumId = 5; // Não é organizador

    public function __construct()
    {
        SandboxDatabase::resetDisposableSandboxSchema(true);
        $this->pdo = SandboxDatabase::getConnection(true);
        $this->presenceEngine = new PresenceEngine($this->pdo);
        $this->queueService = new RachaQueueService($this->pdo);
        $this->mockTransport = new MockTransportController();
        $this->whatsappService = new WhatsAppEvolutionService(
            $this->pdo,
            $this->queueService,
            $this->mockTransport,
            [
                'base_url'         => 'https://evolution-mock.futlendas.local',
                'api_key'          => 'KEY_SECRET_CONTROLLER_TEST',
                'webhook_base_url' => 'https://api.futlendas.local',
                'timeout_seconds'  => 10
            ]
        );
        $this->controller = new RachaGestaoController(
            $this->pdo,
            $this->presenceEngine,
            $this->queueService,
            $this->whatsappService
        );

        $this->seedFixtures();
    }

    private function seedFixtures(): void
    {
        $this->pdo->exec("
            INSERT INTO rachas (id, nome, dia_semana, horario_inicio, local_nome, valor_mensalidade_padrao, valor_avulso_padrao, limite_vagas, ativo, chave_pix, instrucoes_pagamento)
            VALUES (1, 'Racha Terça Controller', 'terca', '20:00:00', 'Arena Caiçara 1', 60.00, 15.00, 2, 1, 'pix@racha1.local', 'Chave CNPJ/Email oficial'),
                   (2, 'Racha Quinta Controller', 'quinta', '19:30:00', 'Arena Litoral 2', 70.00, 20.00, 14, 1, 'pix@racha2.local', 'Enviar comprovante')
        ");

        $this->pdo->exec("
            INSERT INTO racha_organizadores (racha_id, usuario_id, papel)
            VALUES (1, 1, 'dono'),
                   (1, 4, 'auxiliar'),
                   (1, 3, 'financeiro'),
                   (2, 2, 'dono')
        ");
    }

    private function mockAuthContext(int $userId, string $role = 'organizador'): void
    {
        $token = JWT::generate(['id' => $userId, 'userId' => $userId, 'role' => $role, 'username' => 'user_' . $userId]);
        $_SERVER['HTTP_AUTHORIZATION'] = 'Bearer ' . $token;
    }

    private function mockRachaHeader(int $rachaId): void
    {
        $_SERVER['HTTP_X_RACHA_ID'] = (string)$rachaId;
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
        echo " SUÍTE DE TESTES ETAPA 3C.3 — CONTROLLERS REST E DESAMBIGUAÇÃO\n";
        echo "====================================================================\n\n";

        // =====================================================================
        // TESTE 1: Autenticação, RBAC e isolamento multi-racha nos Controllers
        // =====================================================================
        $this->assert("1. Autenticação, RBAC e bloqueio de acesso entre rachas nos controllers", function () {
            // Sem usuário autenticado -> HTTP 401
            unset($_SERVER['HTTP_AUTHORIZATION'], $_SERVER['HTTP_X_RACHA_ID'], $_REQUEST['authUser'], $_REQUEST['rachaScope']);

            $blockedNoAuth = false;
            try {
                $this->controller->getWhatsAppStatus(1);
            } catch (HttpError $e) {
                if ($e->getStatusCode() === 401) $blockedNoAuth = true;
            }
            if (!$blockedNoAuth) throw new Exception("Endpoint deveria rejeitar requisição não autenticada com HTTP 401!");

            // Usuário comum sem papel de organizador no Racha 1 -> HTTP 403
            $this->mockAuthContext($this->jogadorComumId, 'usuario');
            $this->mockRachaHeader(1);

            $blockedNotOrg = false;
            try {
                $this->controller->getWhatsAppStatus(1);
            } catch (HttpError $e) {
                if ($e->getStatusCode() === 403) $blockedNotOrg = true;
            }
            if (!$blockedNotOrg) throw new Exception("Usuário comum deveria ser bloqueado com HTTP 403!");

            // Dono do Racha 1 tentando acessar o Racha 2 -> HTTP 403 (Cross-tenant block)
            $this->mockAuthContext($this->org1UserId, 'organizador');
            $this->mockRachaHeader(2);

            $blockedCross = false;
            try {
                $this->controller->getWhatsAppStatus(2);
            } catch (HttpError $e) {
                if ($e->getStatusCode() === 403) $blockedCross = true;
            }
            if (!$blockedCross) throw new Exception("Organizador do Racha 1 não pode acessar o Racha 2 (HTTP 403 esperada)!");
        });

        // =====================================================================
        // TESTE 2: Listagem 'meus-rachas' para o organizador
        // =====================================================================
        $this->assert("2. Endpoint 'meus-rachas' retorna apenas os rachas administrados pelo usuário", function () {
            $this->mockAuthContext($this->org1UserId, 'organizador');
            $res = $this->controller->meusRachas();

            if (!$res['ok'] || count($res['rachas']) !== 1 || (int)$res['rachas'][0]['id'] !== 1) {
                throw new Exception("Esperado apenas o Racha 1 para o organizador 1, obtido: " . json_encode($res));
            }
        });

        // =====================================================================
        // TESTE 3: Conexão WhatsApp por QR Code, polling de status e logout
        // =====================================================================
        $this->assert("3. Ciclo de conexão WhatsApp: Conectar, QR Code, Status e Desconexão", function () {
            $this->mockAuthContext($this->org1UserId, 'organizador');
            $this->mockRachaHeader(1);

            // Conectar -> retorna QR Code para exibição no frontend
            $conRes = $this->controller->conectarWhatsApp();
            if (!$conRes['ok'] || empty($conRes['conexao']['qr_code']['qr_code_base64'])) {
                throw new Exception("Falha ao obter QR Code no controller: " . json_encode($conRes));
            }
            if ($conRes['conexao']['status_conexao'] !== 'aguardando_qr' || !$conRes['conexao']['requer_leitura_qr']) {
                throw new Exception("Estado de conexão inicial deveria ser 'aguardando_qr' com requer_leitura_qr=true!");
            }

            // Status -> polling consultando estado
            $statRes = $this->controller->getWhatsAppStatus();
            if (!$statRes['ok'] || empty($statRes['status']['instance_name'])) {
                throw new Exception("Consulta de status falhou: " . json_encode($statRes));
            }

            // Desconectar controlado
            $descRes = $this->controller->desconectarWhatsApp();
            if (!$descRes['ok'] || $descRes['resultado']['status_conexao'] !== 'desconectado') {
                throw new Exception("Desconexão falhou: " . json_encode($descRes));
            }
        });

        // =====================================================================
        // TESTE 4: Cadastro, filtros e elegibilidade de participantes
        // =====================================================================
        $jogMens1Id = 0;
        $jogMens2Id = 0;
        $jogAvulso1Id = 0;
        $jogAvulso2Id = 0;

        $this->assert("4. Cadastro e listagem de participantes (mensalistas e avulsos sem conta de login)", function () use (
            &$jogMens1Id, &$jogMens2Id, &$jogAvulso1Id, &$jogAvulso2Id
        ) {
            $this->mockAuthContext($this->org1UserId, 'organizador');
            $this->mockRachaHeader(1);

            // Mensalista 1
            $resM1 = $this->queueService->registerOrReuseParticipant($this->racha1Id, 'Atleta Mensalista 1', '(12) 97711-0001', 'mensalista', $this->org1UserId);
            $jogMens1Id = (int)$resM1['jogador_id'];

            // Mensalista 2
            $resM2 = $this->queueService->registerOrReuseParticipant($this->racha1Id, 'Atleta Mensalista 2', '(12) 97711-0002', 'mensalista', $this->org1UserId);
            $jogMens2Id = (int)$resM2['jogador_id'];

            // Avulso 1 (sem login, cadastrado pelo controller)
            $resA1 = $this->queueService->registerOrReuseParticipant($this->racha1Id, 'Avulso Convidado 1', '(12) 97711-0003', 'avulso_convidado', $this->org1UserId);
            $jogAvulso1Id = (int)$resA1['jogador_id'];

            // Avulso 2
            $resA2 = $this->queueService->registerOrReuseParticipant($this->racha1Id, 'Avulso Convidado 2', '(12) 97711-0004', 'avulso_convidado', $this->org1UserId);
            $jogAvulso2Id = (int)$resA2['jogador_id'];

            // Listagem com filtro 'todos'
            $_GET['tipo'] = 'todos';
            $lista = $this->controller->listarParticipantes();
            if (!$lista['ok'] || $lista['total'] !== 4) {
                throw new Exception("Esperado 4 participantes no Racha 1, obtido: " . json_encode($lista));
            }

            // Todos os 4 com whatsapp preenchido devem ter elegivel_convocacao = true
            foreach ($lista['participantes'] as $p) {
                if (!$p['elegivel_convocacao']) {
                    throw new Exception("Participante com telefone deveria ser elegível para convocação semanal!");
                }
            }

            // Filtro por mensalistas
            $_GET['tipo'] = 'mensalista';
            $listaMens = $this->controller->listarParticipantes();
            if ($listaMens['total'] !== 2) {
                throw new Exception("Filtro 'mensalista' deveria retornar 2 participantes, obtido: " . $listaMens['total']);
            }
        });

        // =====================================================================
        // TESTE 5: Criação de sessão, convocação e disparo simultâneo das 3 mensagens
        // =====================================================================
        $sessaoId = 0;

        $this->assert("5. Criação de sessão, convocação e disparo das 3 mensagens (Semanal, Renovação, Comunicado)", function () use (
            &$sessaoId, $jogMens1Id, $jogMens2Id, $jogAvulso1Id, $jogAvulso2Id
        ) {
            $this->mockAuthContext($this->org1UserId, 'organizador');
            $this->mockRachaHeader(1);

            // Cria sessão
            $sess = $this->presenceEngine->createSession($this->racha1Id, '2026-12-15', '20:00', '22:00', $this->org1UserId);
            $sessaoId = (int)$sess['id'];

            // Prepara convocação com os 4 participantes
            $this->queueService->prepareSessionConvocation(
                $this->racha1Id,
                $sessaoId,
                [$jogMens1Id, $jogMens2Id, $jogAvulso1Id, $jogAvulso2Id],
                $this->org1UserId
            );

            // Mensagem A: Confirmação semanal (disparada para os 4 selecionados no mesmo disparo lógico)
            $dispSemanal = $this->controller->dispararConvocacao($sessaoId);
            if (!$dispSemanal['ok'] || $dispSemanal['resultado']['enviados'] !== 4) {
                throw new Exception("Disparo semanal falhou: " . json_encode($dispSemanal));
            }

            // Mensagem B: Renovação mensal (disparada exclusivamente para os 2 mensalistas ativos)
            $dispRenov = $this->controller->dispararRenovacaoMensal($sessaoId);
            if (!$dispRenov['ok'] || $dispRenov['total'] !== 2 || $dispRenov['enviados'] !== 2) {
                throw new Exception("Disparo de renovação mensal falhou: " . json_encode($dispRenov));
            }

            // Mensagem C: Comunicado livre (enviado para Avulso 1 sem afetar a fila ou presença)
            // Simula input JSON
            $stmtC = $this->pdo->prepare("
                SELECT id FROM racha_whatsapp_mensagens
                WHERE racha_id = :racha_id AND tipo_mensagem = 'comunicado'
            ");
            $stmtC->execute([':racha_id' => $this->racha1Id]);
            $countAntes = count($stmtC->fetchAll());

            $comunicadoRes = $this->whatsappService->sendTextMessage(
                $this->racha1Id,
                '5512977110003',
                'Comunicado: Levem chuteira de society!',
                'comunicado',
                'comunicado:teste:1',
                $sessaoId,
                $jogAvulso1Id,
                $this->org1UserId
            );
            if (!$comunicadoRes['enviado']) {
                throw new Exception("Comunicado deveria ter sido enviado com sucesso!");
            }
        });

        // =====================================================================
        // TESTE 6: Desambiguação obrigatória entre respostas Semanais e Mensais (Seção 7)
        // =====================================================================
        $this->assert("6. Desambiguação obrigatória de respostas no WhatsApp (RACHA SIM/NÃO vs RENOVAR SIM/NÃO)", function () use (
            $sessaoId, $jogMens1Id, $jogMens2Id
        ) {
            $tokenR1 = $this->mockTransport->capturedWebhookTokensByInstance['futlendas_racha_1'];

            // 6a. Mensalista 1 envia 'RENOVAR NAO' (recusa a renovação mensal)
            // REGRA OBRIGATÓRIA: NUNCA deve liberar a vaga da partida semanal!
            $payloadRenovNao = [
                'event'    => 'messages.upsert',
                'instance' => 'futlendas_racha_1',
                'data'     => [
                    'key'     => ['remoteJid' => '5512977110001@s.whatsapp.net', 'fromMe' => false, 'id' => 'WAMID_M1_RENOV_NAO'],
                    'message' => ['conversation' => 'RENOVAR NÃO']
                ]
            ];
            $resRenovNao = processMultiRachaWebhookHttpRequest(
                json_encode($payloadRenovNao),
                ['X-Webhook-Token' => $tokenR1],
                [],
                $this->whatsappService
            );

            if ($resRenovNao['http_code'] !== 200 || ($resRenovNao['body']['tipo_resposta'] ?? '') !== 'renovacao_mensal') {
                throw new Exception("Resposta RENOVAR NÃO deveria ser classificada como 'renovacao_mensal'! Obtido: " . json_encode($resRenovNao));
            }
            if ($resRenovNao['body']['vaga_liberada'] !== false || $resRenovNao['body']['fila_alterada'] !== false) {
                throw new Exception("VIOLAÇÃO: RENOVAR NÃO não pode liberar vaga semanal nem alterar a fila!");
            }

            // Confere que no banco a vaga do Mensalista 1 na sessão semanal continua reservada/aguardando!
            $stmtVaga = $this->pdo->prepare("SELECT situacao_vaga FROM racha_sessao_convocacoes WHERE racha_id = ? AND sessao_id = ? AND jogador_id = ?");
            $stmtVaga->execute([$this->racha1Id, $sessaoId, $jogMens1Id]);
            $sitSemanal = (string)$stmtVaga->fetchColumn();
            if ($sitSemanal === 'vaga_liberada') {
                throw new Exception("VIOLAÇÃO CRÍTICA: Resposta sobre mensalidade liberou a vaga da sessão semanal!");
            }

            // 6b. Mensalista 2 tem tanto confirmação semanal quanto mensal pendentes e responde genericamente 'SIM'
            // REGRA OBRIGATÓRIA: Resposta ambígua não altera nenhum estado e solicita esclarecimento!
            $payloadAmbiguo = [
                'event'    => 'messages.upsert',
                'instance' => 'futlendas_racha_1',
                'data'     => [
                    'key'     => ['remoteJid' => '5512977110002@s.whatsapp.net', 'fromMe' => false, 'id' => 'WAMID_M2_GENERIC_SIM'],
                    'message' => ['conversation' => 'SIM']
                ]
            ];
            $resAmb = processMultiRachaWebhookHttpRequest(
                json_encode($payloadAmbiguo),
                ['X-Webhook-Token' => $tokenR1],
                [],
                $this->whatsappService
            );

            if ($resAmb['http_code'] !== 200 || $resAmb['body']['intencao_processada'] !== 'AMBIGUO') {
                throw new Exception("Mensagem genérica com dupla pendência deveria retornar 'AMBIGUO'!");
            }
            if (empty($resAmb['body']['instrucao_enviada']['enviado'])) {
                throw new Exception("Resposta ambígua deveria enviar mensagem solicitando que o atleta use *RACHA SIM* ou *RENOVAR SIM*!");
            }

            // 6c. Mensalista 2 agora esclarece com 'RACHA SIM'
            // Reserva sua vaga no racha sem encerrar nem afetar a mensalidade
            $payloadRachaSim = [
                'event'    => 'messages.upsert',
                'instance' => 'futlendas_racha_1',
                'data'     => [
                    'key'     => ['remoteJid' => '5512977110002@s.whatsapp.net', 'fromMe' => false, 'id' => 'WAMID_M2_RACHA_SIM'],
                    'message' => ['conversation' => 'RACHA SIM']
                ]
            ];
            $resRachaSim = processMultiRachaWebhookHttpRequest(
                json_encode($payloadRachaSim),
                ['X-Webhook-Token' => $tokenR1],
                [],
                $this->whatsappService
            );

            if ($resRachaSim['http_code'] !== 200 || $resRachaSim['body']['situacao_vaga'] !== 'vaga_reservada') {
                throw new Exception("RACHA SIM deveria confirmar a vaga semanal como 'vaga_reservada'!");
            }
        });

        // =====================================================================
        // TESTE 7: Fila FIFO, desistência de mensalista e promoção automática
        // =====================================================================
        $this->assert("7. Fila de espera FIFO, promoção automática via WhatsApp e proteção de presença real", function () use (
            $sessaoId, $jogMens1Id, $jogAvulso1Id, $jogAvulso2Id
        ) {
            $tokenR1 = $this->mockTransport->capturedWebhookTokensByInstance['futlendas_racha_1'];

            // Avulso 1 responde 'RACHA SIM' -> entra na fila de espera na posição 1
            $payloadA1 = [
                'event'    => 'messages.upsert',
                'instance' => 'futlendas_racha_1',
                'data'     => [
                    'key'     => ['remoteJid' => '5512977110003@s.whatsapp.net', 'fromMe' => false, 'id' => 'WAMID_A1_RACHA_SIM'],
                    'message' => ['conversation' => 'RACHA SIM']
                ]
            ];
            $resA1 = processMultiRachaWebhookHttpRequest(json_encode($payloadA1), ['X-Webhook-Token' => $tokenR1], [], $this->whatsappService);
            if ($resA1['body']['situacao_vaga'] !== 'fila_espera' || $resA1['body']['ordem_fila'] !== 1) {
                throw new Exception("Avulso 1 deveria estar na posição 1 da fila de espera!");
            }

            // Mensalista 1 agora responde 'RACHA NÃO' (desiste do racha semanal)
            // Libera vaga titular e PROMOVE AUTOMATICAMENTE o Avulso 1!
            $payloadM1Nao = [
                'event'    => 'messages.upsert',
                'instance' => 'futlendas_racha_1',
                'data'     => [
                    'key'     => ['remoteJid' => '5512977110001@s.whatsapp.net', 'fromMe' => false, 'id' => 'WAMID_M1_RACHA_NAO'],
                    'message' => ['conversation' => 'RACHA NÃO']
                ]
            ];
            $resM1Nao = processMultiRachaWebhookHttpRequest(json_encode($payloadM1Nao), ['X-Webhook-Token' => $tokenR1], [], $this->whatsappService);
            if (!$resM1Nao['body']['vaga_liberada'] || empty($resM1Nao['body']['promocao_automatica']['promovido'])) {
                throw new Exception("Desistência do titular deveria promover o 1º avulso da fila!");
            }

            // Confere que NENHUMA presença foi gravada em racha_sessao_presencas (intenção != presença real)
            $stmtCount = $this->pdo->prepare("SELECT COUNT(*) FROM racha_sessao_presencas WHERE racha_id = ? AND sessao_id = ?");
            $stmtCount->execute([$this->racha1Id, $sessaoId]);
            if ((int)$stmtCount->fetchColumn() !== 0) {
                throw new Exception("REGRA VIOLADA: Respostas de WhatsApp não podem inserir registros em racha_sessao_presencas!");
            }
        });

        // =====================================================================
        // TESTE 8: Reenvio de notificações pendentes de promoção
        // =====================================================================
        $this->assert("8. Reenvio de notificações pendentes de promoção na fila de espera", function () use (
            $sessaoId, $jogAvulso1Id
        ) {
            $this->mockAuthContext($this->org1UserId, 'organizador');
            $this->mockRachaHeader(1);

            // Força a flag notificacao_promocao_pendente = 1 no banco para simular falha anterior
            $this->pdo->exec("
                UPDATE racha_sessao_convocacoes
                SET notificacao_promocao_pendente = 1
                WHERE racha_id = 1 AND sessao_id = {$sessaoId} AND jogador_id = {$jogAvulso1Id}
            ");

            $resReenvio = $this->controller->reenviarNotificacoesPromocao($sessaoId);
            if (!$resReenvio['ok'] || $resReenvio['resultado']['enviados'] !== 1) {
                throw new Exception("Reenvio de notificações pendentes falhou: " . json_encode($resReenvio));
            }

            // Confere que agora notificacao_promocao_pendente = 0
            $stmtP = $this->pdo->prepare("SELECT notificacao_promocao_pendente FROM racha_sessao_convocacoes WHERE racha_id = 1 AND sessao_id = ? AND jogador_id = ?");
            $stmtP->execute([$sessaoId, $jogAvulso1Id]);
            if ((int)$stmtP->fetchColumn() !== 0) {
                throw new Exception("Após reenvio bem-sucedido, notificacao_promocao_pendente deveria ser 0!");
            }
        });

        // =====================================================================
        // TESTE 9: Validação da presença real (Homologação, Reabertura, Substituição e Conclusão)
        // =====================================================================
        $this->assert("9. Ciclo completo de presença real: Homologar, Reabrir, Substituir, Presenças pós-jogo e Concluir", function () use (
            $sessaoId, $jogMens2Id, $jogAvulso1Id, $jogAvulso2Id
        ) {
            $this->mockAuthContext($this->org1UserId, 'organizador');
            $this->mockRachaHeader(1);

            // 1. Organizador valida e confirma os titulares na lista antes de homologar
            $this->presenceEngine->confirmPresence($this->racha1Id, $sessaoId, $jogMens2Id, 'presente', 'organizador_manual', $this->org1UserId);
            $this->presenceEngine->confirmPresence($this->racha1Id, $sessaoId, $jogAvulso1Id, 'presente', 'organizador_manual', $this->org1UserId);

            // Homologa lista inicial da convocação
            $resHom = $this->controller->homologarLista($sessaoId);
            if (!$resHom['ok'] || empty($resHom['resultado'])) {
                throw new Exception("Homologação inicial da lista falhou: " . json_encode($resHom));
            }

            // 2. Reabertura da lista para ajuste de última hora informando motivo
            $this->pdo->exec("
                UPDATE racha_sessoes SET apuracao_presenca = 'homologada' WHERE id = {$sessaoId}
            ");
            // Usando PresenceEngine diretamente com o motivo
            $resReab = $this->presenceEngine->reopenPresenceList($this->racha1Id, $sessaoId, $this->org1UserId, 'Substituição de participante de última hora');
            if (!$resReab) {
                throw new Exception("Reabertura da lista falhou!");
            }

            // 3. Substituição do Avulso 1 pelo Avulso 2
            $resSub = $this->presenceEngine->substituteParticipant(
                $this->racha1Id,
                $sessaoId,
                $jogAvulso1Id,
                $jogAvulso2Id,
                $this->org1UserId,
                'Avulso 1 contundido antes do aquecimento'
            );
            if (empty($resSub['sessao_id']) || (int)$resSub['substituto']['jogador_id'] !== $jogAvulso2Id) {
                throw new Exception("Substituição falhou!");
            }

            // 4. Pós-jogo: marcação de quem compareceu e faltas via controller
            $this->controller->setJsonInput([
                'presencas' => [
                    ['jogador_id' => $jogMens2Id, 'status_presenca' => 'presente'],
                    ['jogador_id' => $jogAvulso2Id, 'status_presenca' => 'presente']
                ]
            ]);
            $resPres = $this->controller->registrarPresencasReais($sessaoId);
            if (!$resPres['ok']) {
                throw new Exception("Registro pós-jogo falhou!");
            }

            // 5. Homologação final e conclusão da sessão via controller
            $resHomFinal = $this->controller->homologarLista($sessaoId);
            if (!$resHomFinal['ok']) {
                throw new Exception("Homologação final falhou!");
            }
            $resConcl = $this->controller->concluirSessao($sessaoId);
            if (!$resConcl['ok'] || $resConcl['sessao']['status'] !== 'concluida') {
                throw new Exception("Conclusão da sessão falhou!");
            }

            // 6. Consulta do histórico append-only de auditoria
            $resHist = $this->controller->getHistoricoSessao($sessaoId);
            if (!$resHist['ok'] || $resHist['total'] < 5) {
                throw new Exception("Histórico de auditoria incompleto!");
            }
        });

        // =====================================================================
        // TESTE 10: Preservação de Append-only contra UPDATE/DELETE
        // =====================================================================
        $this->assert("10. Proteção append-only no banco (bloqueio de UPDATE e DELETE em racha_sessao_eventos)", function () use ($sessaoId) {
            $blockedUpdate = false;
            try {
                $this->pdo->exec("UPDATE racha_sessao_eventos SET descricao = 'Tentativa de alteração' WHERE sessao_id = {$sessaoId}");
            } catch (Throwable $e) {
                $blockedUpdate = true;
            }
            if (!$blockedUpdate) {
                throw new Exception("Grave violação de auditoria: UPDATE em racha_sessao_eventos não foi bloqueado!");
            }

            $blockedDelete = false;
            try {
                $this->pdo->exec("DELETE FROM racha_sessao_eventos WHERE sessao_id = {$sessaoId}");
            } catch (Throwable $e) {
                $blockedDelete = true;
            }
            if (!$blockedDelete) {
                throw new Exception("Grave violação de auditoria: DELETE em racha_sessao_eventos não foi bloqueado!");
            }
        });

        // =====================================================================
        // TESTE 11: Fechamento pré-jogo da convocação independente da apuração
        // =====================================================================
        $sessao2Id = 0;
        $this->assert("11. Fechamento pré-jogo da convocação sem homologação de presença", function () use (
            &$sessao2Id, $jogMens1Id, $jogMens2Id, $jogAvulso1Id
        ) {
            $this->mockAuthContext($this->auxiliarUserId, 'organizador');
            $this->mockRachaHeader(1);

            // Cria Sessão 2
            $this->controller->setJsonInput([
                'data_racha'     => '2026-11-10',
                'horario_inicio' => '20:00:00'
            ]);
            $resSess2 = $this->controller->criarSessao();
            $sessao2Id = (int)$resSess2['sessao']['id'];

            // Convoca Mensalista 1, Mensalista 2 e Avulso 1
            $this->controller->setJsonInput(['jogador_ids' => [$jogMens1Id, $jogMens2Id, $jogAvulso1Id]]);
            $this->controller->convocarParticipantes($sessao2Id);

            // Auxiliar fecha a convocação
            $this->controller->setJsonInput(['motivo' => 'Fechamento pré-jogo às 18h']);
            $resFecha = $this->controller->fecharConvocacao($sessao2Id);

            if (!$resFecha['ok'] || $resFecha['resultado']['status_convocacao'] !== 'fechada') {
                throw new Exception("Falha no fechamento da convocação: " . json_encode($resFecha));
            }

            // Verifica no banco que apuração NÃO foi homologada e sessão NÃO foi concluída
            $stmt = $this->pdo->query("SELECT status, status_convocacao, apuracao_presenca, fechamento_convocacao_em FROM racha_sessoes WHERE id = {$sessao2Id}");
            $sRow = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($sRow['status_convocacao'] !== 'fechada') {
                throw new Exception("status_convocacao deveria ser 'fechada'!");
            }
            if (empty($sRow['fechamento_convocacao_em'])) {
                throw new Exception("fechamento_convocacao_em deveria estar preenchido!");
            }
            if ($sRow['apuracao_presenca'] !== 'nao_iniciada') {
                throw new Exception("REGRA VIOLADA: Fechamento da convocação marcou apuracao_presenca como '{$sRow['apuracao_presenca']}' (deveria ser nao_iniciada)!");
            }
            if ($sRow['status'] === 'concluida') {
                throw new Exception("REGRA VIOLADA: Fechamento da convocação concluiu a sessão indevidamente!");
            }

            // Verifica evento de auditoria fechamento_convocacao
            $stmtEv = $this->pdo->query("SELECT tipo_evento, motivo FROM racha_sessao_eventos WHERE sessao_id = {$sessao2Id} AND tipo_evento = 'fechamento_convocacao'");
            $ev = $stmtEv->fetch(PDO::FETCH_ASSOC);
            if (!$ev) {
                throw new Exception("Evento de auditoria 'fechamento_convocacao' não encontrado!");
            }
        });

        // =====================================================================
        // TESTE 12: Reabertura da convocação pré-jogo com motivo obrigatório
        // =====================================================================
        $this->assert("12. Reabertura da convocação pré-jogo com obrigatoriedade de motivo", function () use ($sessao2Id) {
            $this->mockAuthContext($this->auxiliarUserId, 'organizador');
            $this->mockRachaHeader(1);

            // Reabertura sem motivo -> DEVE FALHAR (HTTP 400)
            $this->controller->setJsonInput(['motivo' => '   ']);
            $blockedNoMotivo = false;
            try {
                $this->controller->reabrirConvocacao($sessao2Id);
            } catch (HttpError $e) {
                if ($e->getStatusCode() === 400) $blockedNoMotivo = true;
            }
            if (!$blockedNoMotivo) {
                throw new Exception("Reabertura sem motivo deveria ser rejeitada com HTTP 400!");
            }

            // Reabertura com motivo válido -> SUCESSO
            $this->controller->setJsonInput(['motivo' => 'Prorrogação de 30 minutos a pedido dos atletas']);
            $resReab = $this->controller->reabrirConvocacao($sessao2Id);

            if (!$resReab['ok'] || $resReab['resultado']['status_convocacao'] !== 'aberta') {
                throw new Exception("Reabertura da convocação falhou: " . json_encode($resReab));
            }

            // Verifica no banco
            $stmt = $this->pdo->query("SELECT status_convocacao FROM racha_sessoes WHERE id = {$sessao2Id}");
            if ($stmt->fetchColumn() !== 'aberta') {
                throw new Exception("status_convocacao deveria ter voltado para 'aberta'!");
            }

            // Verifica evento de auditoria reabertura_convocacao
            $stmtEv = $this->pdo->query("SELECT tipo_evento, motivo FROM racha_sessao_eventos WHERE sessao_id = {$sessao2Id} AND tipo_evento = 'reabertura_convocacao'");
            $ev = $stmtEv->fetch(PDO::FETCH_ASSOC);
            if (!$ev) {
                throw new Exception("Evento de auditoria 'reabertura_convocacao' não encontrado!");
            }
        });

        // =====================================================================
        // TESTE 13: Respostas tardias do WhatsApp após fechamento da convocação
        // =====================================================================
        $this->assert("13. Respostas tardias do WhatsApp após fechamento não alteram titulares nem promovem avulsos", function () use (
            $sessao2Id, $jogAvulso1Id
        ) {
            $this->mockAuthContext($this->org1UserId, 'organizador');
            $this->mockRachaHeader(1);
            $tokenR1 = $this->mockTransport->capturedWebhookTokensByInstance['futlendas_racha_1'];

            // Fecha a convocação novamente
            $this->controller->setJsonInput(['motivo' => 'Fechamento final pré-jogo']);
            $this->controller->fecharConvocacao($sessao2Id);

            // Avulso 1 envia 'RACHA SIM' APÓS o fechamento da convocação
            $payloadTardia = [
                'event'    => 'messages.upsert',
                'instance' => 'futlendas_racha_1',
                'data'     => [
                    'key'     => ['remoteJid' => '5512977110003@s.whatsapp.net', 'fromMe' => false, 'id' => 'WAMID_A1_LATE_SIM'],
                    'message' => ['conversation' => 'RACHA SIM']
                ]
            ];
            $resTardia = processMultiRachaWebhookHttpRequest(
                json_encode($payloadTardia),
                ['X-Webhook-Token' => $tokenR1],
                [],
                $this->whatsappService
            );

            if (!$resTardia['body']['ok'] || empty($resTardia['body']['resposta_tardia'])) {
                throw new Exception("Resposta após fechamento deveria ser classificada como tardia!");
            }

            // Confere status na tabela racha_sessao_convocacoes
            $stmt = $this->pdo->query("SELECT situacao_vaga, ordem_fila FROM racha_sessao_convocacoes WHERE sessao_id = {$sessao2Id} AND jogador_id = {$jogAvulso1Id}");
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($row['situacao_vaga'] !== 'aguardando_confirmacao_tardia') {
                throw new Exception("Situação da vaga deveria ser 'aguardando_confirmacao_tardia', obtido: '{$row['situacao_vaga']}'");
            }

            // Confere evento de auditoria resposta_tardia_convocacao
            $stmtEv = $this->pdo->query("SELECT tipo_evento FROM racha_sessao_eventos WHERE sessao_id = {$sessao2Id} AND tipo_evento = 'resposta_tardia_convocacao'");
            if (!$stmtEv->fetch()) {
                throw new Exception("Evento de auditoria 'resposta_tardia_convocacao' não foi registrado!");
            }
        });

        // =====================================================================
        // TESTE 14: Substituição e jogadores sem linha em racha_sessao_presencas
        // =====================================================================
        $this->assert("14. Substituição funciona diretamente para jogador convocado sem registro prévio em presenças", function () use (
            $sessao2Id, $jogMens1Id, $jogAvulso2Id
        ) {
            $this->mockAuthContext($this->auxiliarUserId, 'organizador');
            $this->mockRachaHeader(1);

            // Mensalista 1 consta em racha_sessao_convocacoes, mas NÃO tem registro em racha_sessao_presencas
            $stmtCheck = $this->pdo->query("SELECT id FROM racha_sessao_presencas WHERE sessao_id = {$sessao2Id} AND jogador_id = {$jogMens1Id}");
            if ($stmtCheck->fetch()) {
                throw new Exception("Pré-condição inválida: Mensalista 1 não deveria ter linha em presenças!");
            }

            // Executa substituição do Mensalista 1 pelo Avulso 2
            $this->controller->setJsonInput([
                'jogador_saiu_id'   => $jogMens1Id,
                'jogador_entrou_id' => $jogAvulso2Id,
                'motivo'            => 'Mensalista avisou imprevisto profissional de última hora'
            ]);
            $resSub = $this->controller->substituirParticipante($sessao2Id);

            if (!$resSub['ok'] || (int)$resSub['resultado']['substituto']['jogador_id'] !== $jogAvulso2Id) {
                throw new Exception("Substituição falhou: " . json_encode($resSub));
            }

            // Confere que a linha do substituído foi criada com status de cancelamento/saída
            $stmtPresSub = $this->pdo->query("SELECT status_presenca FROM racha_sessao_presencas WHERE sessao_id = {$sessao2Id} AND jogador_id = {$jogMens1Id}");
            $presSub = $stmtPresSub->fetch(PDO::FETCH_ASSOC);
            if (!$presSub || $presSub['status_presenca'] !== 'cancelado_no_prazo') {
                throw new Exception("Substituído deveria ter registro de presença com 'cancelado_no_prazo'!");
            }

            // Confere que o substituto foi inserido com status presente e substituiu_jogador_id
            $stmtPresEntrou = $this->pdo->query("SELECT status_presenca, substituiu_jogador_id FROM racha_sessao_presencas WHERE sessao_id = {$sessao2Id} AND jogador_id = {$jogAvulso2Id}");
            $presEntrou = $stmtPresEntrou->fetch(PDO::FETCH_ASSOC);
            if (!$presEntrou || $presEntrou['status_presenca'] !== 'presente' || (int)$presEntrou['substituiu_jogador_id'] !== $jogMens1Id) {
                throw new Exception("Substituto deveria ter status 'presente' com substituiu_jogador_id = {$jogMens1Id}!");
            }
        });

        // =====================================================================
        // TESTE 15: RBAC estrito para Dono, Auxiliar e Financeiro
        // =====================================================================
        $this->assert("15. RBAC estrito por papel (Dono=full, Auxiliar=esportivo, Financeiro=mensalidades)", function () use ($sessao2Id) {
            $this->mockRachaHeader(1);

            // 1. Auxiliar tenta desconectar WhatsApp -> DEVE FALHAR (HTTP 403)
            $this->mockAuthContext($this->auxiliarUserId, 'organizador');
            $blockedAuxWhatsapp = false;
            try {
                $this->controller->desconectarWhatsApp();
            } catch (HttpError $e) {
                if ($e->getStatusCode() === 403) $blockedAuxWhatsapp = true;
            }
            if (!$blockedAuxWhatsapp) throw new Exception("Auxiliar não pode desconectar WhatsApp!");

            // 2. Auxiliar tenta disparar renovação mensal -> DEVE FALHAR (HTTP 403)
            $blockedAuxRenov = false;
            try {
                $this->controller->dispararRenovacaoMensal($sessao2Id);
            } catch (HttpError $e) {
                if ($e->getStatusCode() === 403) $blockedAuxRenov = true;
            }
            if (!$blockedAuxRenov) throw new Exception("Auxiliar não pode disparar renovação financeira!");

            // 3. Financeiro tenta desconectar WhatsApp -> DEVE FALHAR (HTTP 403)
            $this->mockAuthContext($this->financeiroUserId, 'organizador');
            $blockedFinWhatsapp = false;
            try {
                $this->controller->desconectarWhatsApp();
            } catch (HttpError $e) {
                if ($e->getStatusCode() === 403) $blockedFinWhatsapp = true;
            }
            if (!$blockedFinWhatsapp) throw new Exception("Financeiro não pode desconectar WhatsApp!");

            // 4. Financeiro tenta substituir participante esportivo -> DEVE FALHAR (HTTP 403)
            $blockedFinSub = false;
            try {
                $this->controller->setJsonInput(['jogador_saiu_id' => 1, 'jogador_entrou_id' => 2, 'motivo' => 'teste']);
                $this->controller->substituirParticipante($sessao2Id);
            } catch (HttpError $e) {
                if ($e->getStatusCode() === 403) $blockedFinSub = true;
            }
            if (!$blockedFinSub) throw new Exception("Financeiro não pode realizar substituição esportiva!");

            // 5. Financeiro tenta homologar lista esportiva -> DEVE FALHAR (HTTP 403)
            $blockedFinHom = false;
            try {
                $this->controller->homologarLista($sessao2Id);
            } catch (HttpError $e) {
                if ($e->getStatusCode() === 403) $blockedFinHom = true;
            }
            if (!$blockedFinHom) throw new Exception("Financeiro não pode homologar lista esportiva!");

            // 6. Financeiro lista renovações -> SUCESSO (HTTP 200)
            $resFinList = $this->controller->listarRenovacoes();
            if (!$resFinList['ok']) throw new Exception("Financeiro deveria conseguir listar renovações!");

            // 7. Dono desconecta WhatsApp -> SUCESSO (HTTP 200)
            $this->mockAuthContext($this->org1UserId, 'organizador');
            $resDono = $this->controller->desconectarWhatsApp();
            if (!$resDono['ok']) throw new Exception("Dono deveria conseguir desconectar WhatsApp!");
        });

        // =====================================================================
        // TESTE 16: Renovação mensal desacoplada, idempotente e sem rescisão
        // =====================================================================
        $this->assert("16. Renovação mensal desacoplada de sessões, idempotente e sem rescisão indevida", function () use (
            $jogMens1Id
        ) {
            $this->mockAuthContext($this->financeiroUserId, 'organizador');
            $this->mockRachaHeader(1);
            $tokenR1 = $this->mockTransport->capturedWebhookTokensByInstance['futlendas_racha_1'];

            // 1. Disparo de renovação desacoplada para competência 2026-11 (sem passar ID de sessão)
            $this->controller->setJsonInput([
                'competencia' => '2026-11'
            ]);
            $resDisp = $this->controller->dispararRenovacaoMensal(null);

            if (!$resDisp['ok'] || $resDisp['competencia'] !== '2026-11' || $resDisp['enviados'] < 2) {
                throw new Exception("Disparo desacoplado falhou: " . json_encode($resDisp));
            }

            // Confere que os valores padrão do racha foram aproveitados
            $stmtVal = $this->pdo->query("SELECT valor_cobrado, status_envio, intencao_renovacao FROM racha_mensalistas_renovacoes WHERE racha_id = 1 AND competencia_ano = 2026 AND competencia_mes = 11");
            $rRows = $stmtVal->fetchAll(PDO::FETCH_ASSOC);
            if (count($rRows) < 2 || (float)$rRows[0]['valor_cobrado'] !== 60.00 || $rRows[0]['status_envio'] !== 'enviado') {
                throw new Exception("Tabela racha_mensalistas_renovacoes não gravou valor_cobrado ou status_envio corretamente: " . json_encode($rRows));
            }

            // 2. Disparo repetido para a mesma competência deve ser idempotente (pulados > 0)
            $resDisp2 = $this->controller->dispararRenovacaoMensal(null);
            if (!$resDisp2['ok'] || $resDisp2['pulados'] < 2) {
                throw new Exception("Disparo repetido deveria pular mensalistas já notificados!");
            }

            // 3. Mensalista 1 responde 'RENOVAR NÃO' via WhatsApp para a competência 2026-11
            $payloadRenovNao = [
                'event'    => 'messages.upsert',
                'instance' => 'futlendas_racha_1',
                'data'     => [
                    'key'     => ['remoteJid' => '5512977110001@s.whatsapp.net', 'fromMe' => false, 'id' => 'WAMID_M1_NOV_RENOV_NAO'],
                    'message' => ['conversation' => 'RENOVAR NÃO']
                ]
            ];
            $resWeb = processMultiRachaWebhookHttpRequest(
                json_encode($payloadRenovNao),
                ['X-Webhook-Token' => $tokenR1],
                [],
                $this->whatsappService
            );

            if (!$resWeb['body']['ok'] || $resWeb['body']['tipo_resposta'] !== 'renovacao_mensal') {
                throw new Exception("Webhook de renovação mensal falhou: " . json_encode($resWeb));
            }

            // Confere que a intenção foi registrada em racha_mensalistas_renovacoes
            $stmtInt = $this->pdo->query("SELECT intencao_renovacao FROM racha_mensalistas_renovacoes WHERE racha_id = 1 AND jogador_id = {$jogMens1Id} AND competencia_ano = 2026 AND competencia_mes = 11");
            if ($stmtInt->fetchColumn() !== 'nao') {
                throw new Exception("intencao_renovacao deveria ser 'nao'!");
            }

            // REGRA CRÍTICA: racha_mensalistas.status NÃO PODE ter sido alterado nem cancelado automaticamente
            $stmtMensStatus = $this->pdo->query("SELECT status FROM racha_mensalistas WHERE racha_id = 1 AND jogador_id = {$jogMens1Id}");
            $mensStatus = $stmtMensStatus->fetchColumn();
            if ($mensStatus !== 'ativo') {
                throw new Exception("VIOLAÇÃO GRAVE: Resposta 'RENOVAR NÃO' cancelou o cadastro do mensalista automaticamente ({$mensStatus})!");
            }

            // REGRA CRÍTICA: racha_participantes.ativo NÃO PODE ter sido inativado
            $stmtPartAtivo = $this->pdo->query("SELECT ativo FROM racha_participantes WHERE racha_id = 1 AND jogador_id = {$jogMens1Id}");
            if ((int)$stmtPartAtivo->fetchColumn() !== 1) {
                throw new Exception("VIOLAÇÃO GRAVE: Participante foi inativado no racha indevidamente!");
            }
        });

        echo "\n====================================================================\n";
        echo " RESULTADO FINAL DA SUÍTE ETAPA 3C.3 (test_racha_gestao_controller.php):\n";
        echo " APROVADOS: {$this->passed} | FALHAS: {$this->failed}\n";
        echo "====================================================================\n";

        if ($this->failed > 0) {
            exit(1);
        }
    }
}

$suite = new RachaGestaoControllerTestSuite();
$suite->runAll();
