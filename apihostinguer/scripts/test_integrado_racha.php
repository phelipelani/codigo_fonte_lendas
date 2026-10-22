<?php
/**
 * Suíte de Teste Integrado dos Fluxos de Racha e Critérios de Aceite — Etapa 3C.3.2
 * Arquivo: apihostinguer/scripts/test_integrado_racha.php
 *
 * Valida de ponta a ponta:
 *  1. Ciclo esportivo completo: criação de sessão, convocação, respostas via WhatsApp,
 *     fila FIFO, promoção automática por desistência, fechamento da convocação,
 *     bloqueio de respostas tardias, reabertura com motivo obrigatório,
 *     substituição direta de convocado sem linha prévia em presenças,
 *     fechamento final, apuração real pós-jogo, homologação e conclusão.
 *  2. Renovação mensal desacoplada de sessão semanal: competência (2026-11),
 *     priorização de valores/PIX do servidor contra manipulação de frontend,
 *     idempotência, simulação de falha e reenvio seguro, respostas RENOVAR SIM/NÃO
 *     sem rescisão contratual e histórico de auditoria.
 *  3. Matriz de Permissões (RBAC) e Isolamento Multi-inquilino:
 *     Dono (full), Auxiliar (esportivo permitido, financeiro e desconexão bloqueados),
 *     Financeiro (renovações permitidas, presença e desconexão bloqueadas),
 *     e bloqueio total cross-racha.
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

class MockTransportIntegrado
{
    public array $requests = [];
    public array $queuedResponses = [];
    public array $capturedWebhookTokensByInstance = [];
    /** @var callable|null */
    public $customResponseCallback = null;

    public function queueNextResponse(string $endpointPrefix, array $response): void
    {
        $this->queuedResponses[$endpointPrefix][] = $response;
    }

    public function setCustomCallback(?callable $cb): void
    {
        $this->customResponseCallback = $cb;
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

        if ($this->customResponseCallback !== null) {
            $custom = call_user_func($this->customResponseCallback, $method, $endpoint, $body, $headers, $timeout);
            if ($custom !== null) {
                return $custom;
            }
        }

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
                    'qrcode'   => ['base64' => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==', 'code' => 'mock_qr_integrado_123']
                ]
            ];
        }

        if (str_starts_with($endpoint, '/instance/connectionState/')) {
            return [
                'http_code' => 200,
                'data'      => [
                    'instance' => ['state' => 'open']
                ]
            ];
        }

        if (str_starts_with($endpoint, '/instance/connect/')) {
            return [
                'http_code' => 200,
                'data'      => [
                    'instance' => ['state' => 'connecting'],
                    'qrcode'   => ['base64' => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==', 'code' => 'mock_qr_integrado_connect_456']
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
                'data'      => ['status' => 'SUCCESS', 'message' => 'Desconectado com sucesso']
            ];
        }

        if (str_starts_with($endpoint, '/message/sendText/')) {
            return [
                'http_code' => 201,
                'data'      => [
                    'key'     => ['id' => 'WAMID_INT_' . uniqid('', true)],
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

class TestIntegradoRachaSuite
{
    private PDO $pdo;
    private PresenceEngine $presenceEngine;
    private RachaQueueService $queueService;
    private WhatsAppEvolutionService $whatsappService;
    private MockTransportIntegrado $mockTransport;
    private RachaGestaoController $controller;

    private int $passed = 0;
    private int $failed = 0;

    // Atores do Racha 1
    private int $racha1Id = 1;
    private int $racha2Id = 2;
    private int $donoUserId = 1;       // Dono do Racha 1
    private int $donoRacha2UserId = 2; // Dono do Racha 2
    private int $auxiliarUserId = 4;   // Auxiliar do Racha 1
    private int $financeiroUserId = 3; // Financeiro do Racha 1

    // Jogadores do Racha 1
    private int $jogMens1Id = 11;      // Mensalista 1
    private int $jogMens2Id = 12;      // Mensalista 2
    private int $jogAvulso1Id = 13;    // Avulso 1
    private int $jogAvulso2Id = 14;    // Avulso 2
    private int $jogAvulso3Id = 15;    // Avulso 3
    private int $jogSubstitutoId = 16; // Convidado/Substituto direto

    public function __construct()
    {
        SandboxDatabase::resetDisposableSandboxSchema(true);
        $this->pdo = SandboxDatabase::getConnection(true);
        $this->presenceEngine = new PresenceEngine($this->pdo);
        $this->queueService = new RachaQueueService($this->pdo);
        $this->mockTransport = new MockTransportIntegrado();
        $this->whatsappService = new WhatsAppEvolutionService(
            $this->pdo,
            $this->queueService,
            $this->mockTransport,
            [
                'base_url'         => 'https://evolution-mock.futlendas.local',
                'api_key'          => 'SECRET_KEY_INTEGRADO_3C32',
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
        // 1. Rachas
        $this->pdo->exec("
            INSERT INTO rachas (id, nome, dia_semana, horario_inicio, local_nome, valor_mensalidade_padrao, valor_avulso_padrao, limite_vagas, ativo, chave_pix, instrucoes_pagamento)
            VALUES (1, 'Racha Integração Terça', 'terca', '20:00:00', 'Arena Central', 60.00, 15.00, 2, 1, 'pix@racha-integrado.com', 'Comprovante via WhatsApp'),
                   (2, 'Racha Outro Tenant', 'quinta', '19:00:00', 'Arena Secundária', 70.00, 20.00, 10, 1, 'pix@racha-outro.com', 'Comprovante oficial')
        ");

        // 2. Usuários organizadores
        $this->pdo->exec("
            INSERT INTO racha_organizadores (racha_id, usuario_id, papel)
            VALUES (1, {$this->donoUserId}, 'dono'),
                   (1, {$this->auxiliarUserId}, 'auxiliar'),
                   (1, {$this->financeiroUserId}, 'financeiro'),
                   (2, {$this->donoRacha2UserId}, 'dono')
        ");

        // 3. Jogadores com WhatsApp cadastrado
        $this->pdo->exec("
            INSERT INTO jogadores (id, nome, apelido_bot, whatsapp)
            VALUES ({$this->jogMens1Id}, 'Carlos Mensalista 1', 'Carlinhos', '5512988000001'),
                   ({$this->jogMens2Id}, 'Bruno Mensalista 2', 'Bruninho', '5512988000002'),
                   ({$this->jogAvulso1Id}, 'Arnaldo Avulso 1', 'Naldinho', '5512988000003'),
                   ({$this->jogAvulso2Id}, 'Diego Avulso 2', 'Dieguito', '5512988000004'),
                   ({$this->jogAvulso3Id}, 'Eduardo Avulso 3', 'Edu', '5512988000005'),
                   ({$this->jogSubstitutoId}, 'Fernando Substituto', 'Fernandinho', '5512988000006')
        ");

        // 4. Vínculo como participantes do Racha 1
        $this->pdo->exec("
            INSERT INTO racha_participantes (racha_id, jogador_id, tipo_participacao, ativo)
            VALUES (1, {$this->jogMens1Id}, 'mensalista', 1),
                   (1, {$this->jogMens2Id}, 'mensalista', 1),
                   (1, {$this->jogAvulso1Id}, 'avulso_convidado', 1),
                   (1, {$this->jogAvulso2Id}, 'avulso_convidado', 1),
                   (1, {$this->jogAvulso3Id}, 'avulso_convidado', 1),
                   (1, {$this->jogSubstitutoId}, 'avulso_convidado', 1)
        ");

        // 5. Mensalistas vinculados na tabela racha_mensalistas
        $this->pdo->exec("
            INSERT INTO racha_mensalistas (racha_id, jogador_id, valor_individual, dia_vencimento, data_inicio, status)
            VALUES (1, {$this->jogMens1Id}, 60.00, 10, '2026-01-01', 'ativo'),
                   (1, {$this->jogMens2Id}, 60.00, 10, '2026-01-01', 'ativo')
        ");
    }

    private function mockAuthContext(int $userId, string $role = 'organizador'): void
    {
        $token = JWT::generate(['id' => $userId, 'userId' => $userId, 'role' => $role, 'username' => 'user_' . $userId]);
        $_SERVER['HTTP_AUTHORIZATION'] = 'Bearer ' . $token;
        unset($_REQUEST['authUser'], $_REQUEST['rachaScope']);
    }

    private function mockRachaHeader(int $rachaId): void
    {
        $_SERVER['HTTP_X_RACHA_ID'] = (string)$rachaId;
    }

    private function assert(string $title, callable $test): void
    {
        echo "TESTANDO: {$title}... ";
        try {
            $test();
            echo "APROVADO (PASS)\n";
            $this->passed++;
        } catch (Throwable $e) {
            echo "FALHOU (FAIL)\n";
            echo " -> Motivo: " . $e->getMessage() . "\n";
            echo " -> Arquivo: " . $e->getFile() . ":" . $e->getLine() . "\n";
            $this->failed++;
        }
    }

    public function runAll(): void
    {
        echo "\n====================================================================\n";
        echo " SUÍTE DE TESTE INTEGRADO DOS FLUXOS DE RACHA — ETAPA 3C.3.2\n";
        echo "====================================================================\n\n";

        // Inicializa instância WhatsApp para o Racha 1 via Controller
        $this->mockAuthContext($this->donoUserId, 'organizador');
        $this->mockRachaHeader($this->racha1Id);
        $this->controller->conectarWhatsApp();
        $tokenRacha1 = $this->mockTransport->capturedWebhookTokensByInstance['futlendas_racha_1'] ?? null;
        if (!$tokenRacha1) {
            throw new Exception("Falha ao inicializar e capturar token do webhook para futlendas_racha_1");
        }

        $sessaoId = 0;

        // =====================================================================
        // SEÇÃO 2: CICLO ESPORTIVO COMPLETO
        // =====================================================================

        $this->assert("2.1 Criação de sessão e abertura da convocação semanal", function () use (&$sessaoId) {
            $this->mockAuthContext($this->donoUserId, 'organizador');
            $this->mockRachaHeader($this->racha1Id);

            // Cria sessão semanal
            $this->controller->setJsonInput([
                'data_racha'     => '2026-11-03',
                'horario_inicio' => '20:00:00',
                'horario_fim'    => '22:00:00'
            ]);
            $resSess = $this->controller->criarSessao();
            $sessaoId = (int)$resSess['sessao']['id'];
            if ($sessaoId <= 0) {
                throw new Exception("Falha ao criar sessão: " . json_encode($resSess));
            }

            // Prepara convocação com mensalistas e avulsos
            $this->queueService->prepareSessionConvocation(
                $this->racha1Id,
                $sessaoId,
                [$this->jogMens1Id, $this->jogMens2Id, $this->jogAvulso1Id, $this->jogAvulso2Id, $this->jogAvulso3Id],
                $this->donoUserId
            );

            // Dispara convocação semanal
            $resConv = $this->controller->dispararConvocacao($sessaoId);
            if (!$resConv['ok'] || $resConv['resultado']['enviados'] < 2) {
                throw new Exception("Convocação semanal não notificou mensalistas esperados: " . json_encode($resConv));
            }

            // Confere estado inicial da convocação
            $stmt = $this->pdo->prepare("SELECT status_convocacao, apuracao_presenca, status FROM racha_sessoes WHERE id = :id");
            $stmt->execute([':id' => $sessaoId]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($row['status_convocacao'] !== 'aberta' || $row['apuracao_presenca'] !== 'nao_iniciada' || $row['status'] !== 'aberta') {
                throw new Exception("Estados iniciais da sessão incorretos: " . json_encode($row));
            }
        });

        $this->assert("2.2 Resposta SIM de mensalista e avulsos entrando na fila FIFO estrita", function () use (&$sessaoId, $tokenRacha1) {
            // Mensalista 2 responde 'RACHA SIM'
            $payloadM2 = [
                'event'    => 'messages.upsert',
                'instance' => 'futlendas_racha_1',
                'data'     => [
                    'key'     => ['remoteJid' => '5512988000002@s.whatsapp.net', 'fromMe' => false, 'id' => 'WAMID_M2_SIM_001'],
                    'message' => ['conversation' => 'RACHA SIM']
                ]
            ];
            $resM2 = processMultiRachaWebhookHttpRequest(json_encode($payloadM2), ['X-Webhook-Token' => $tokenRacha1], [], $this->whatsappService);
            if ($resM2['http_code'] !== 200 || $resM2['body']['situacao_vaga'] !== 'vaga_reservada') {
                throw new Exception("Mensalista 2 deveria estar com situacao_vaga = 'vaga_reservada': " . json_encode($resM2));
            }

            // Avulso 1 responde 'RACHA SIM' -> entra na fila de espera, posição 1
            $payloadA1 = [
                'event'    => 'messages.upsert',
                'instance' => 'futlendas_racha_1',
                'data'     => [
                    'key'     => ['remoteJid' => '5512988000003@s.whatsapp.net', 'fromMe' => false, 'id' => 'WAMID_A1_SIM_001'],
                    'message' => ['conversation' => 'RACHA SIM']
                ]
            ];
            $resA1 = processMultiRachaWebhookHttpRequest(json_encode($payloadA1), ['X-Webhook-Token' => $tokenRacha1], [], $this->whatsappService);
            if ($resA1['http_code'] !== 200 || $resA1['body']['situacao_vaga'] !== 'fila_espera' || $resA1['body']['ordem_fila'] !== 1) {
                throw new Exception("Avulso 1 deveria ser fila_espera ordem 1: " . json_encode($resA1));
            }

            // Avulso 2 responde 'RACHA SIM' -> entra na fila de espera, posição 2
            $payloadA2 = [
                'event'    => 'messages.upsert',
                'instance' => 'futlendas_racha_1',
                'data'     => [
                    'key'     => ['remoteJid' => '5512988000004@s.whatsapp.net', 'fromMe' => false, 'id' => 'WAMID_A2_SIM_001'],
                    'message' => ['conversation' => 'RACHA SIM']
                ]
            ];
            $resA2 = processMultiRachaWebhookHttpRequest(json_encode($payloadA2), ['X-Webhook-Token' => $tokenRacha1], [], $this->whatsappService);
            if ($resA2['http_code'] !== 200 || $resA2['body']['situacao_vaga'] !== 'fila_espera' || $resA2['body']['ordem_fila'] !== 2) {
                throw new Exception("Avulso 2 deveria ser fila_espera ordem 2: " . json_encode($resA2));
            }

            // Confere que NENHUMA linha de presença real foi criada ainda
            $stmtCount = $this->pdo->prepare("SELECT COUNT(*) FROM racha_sessao_presencas WHERE sessao_id = :id");
            $stmtCount->execute([':id' => $sessaoId]);
            if ((int)$stmtCount->fetchColumn() !== 0) {
                throw new Exception("Presença real indevidamente criada durante a fase de convocação!");
            }
        });

        $this->assert("2.3 Desistência de mensalista e promoção automática do 1º avulso respeitando limite de vagas", function () use (&$sessaoId, $tokenRacha1) {
            // Mensalista 1 responde 'RACHA NÃO'
            $payloadM1 = [
                'event'    => 'messages.upsert',
                'instance' => 'futlendas_racha_1',
                'data'     => [
                    'key'     => ['remoteJid' => '5512988000001@s.whatsapp.net', 'fromMe' => false, 'id' => 'WAMID_M1_NAO_001'],
                    'message' => ['conversation' => 'RACHA NÃO']
                ]
            ];
            $resM1 = processMultiRachaWebhookHttpRequest(json_encode($payloadM1), ['X-Webhook-Token' => $tokenRacha1], [], $this->whatsappService);
            if ($resM1['http_code'] !== 200 || $resM1['body']['situacao_vaga'] !== 'vaga_liberada' || $resM1['body']['intencao_atual'] !== 'nao') {
                throw new Exception("Mensalista 1 deveria estar com situacao_vaga = 'vaga_liberada': " . json_encode($resM1));
            }

            // Confere que o Avulso 1 foi promovido a titular
            $stmtA1 = $this->pdo->prepare("SELECT situacao_vaga, ordem_fila FROM racha_sessao_convocacoes WHERE sessao_id = :id AND jogador_id = :jog");
            $stmtA1->execute([':id' => $sessaoId, ':jog' => $this->jogAvulso1Id]);
            $rowA1 = $stmtA1->fetch(PDO::FETCH_ASSOC);
            if ($rowA1['situacao_vaga'] !== 'promovido_titular') {
                throw new Exception("Avulso 1 deveria ter sido promovido a titular: " . json_encode($rowA1));
            }

            // Confere que o Avulso 2 permanece na fila de espera e é o 1º da fila ativa
            $stmtA2 = $this->pdo->prepare("SELECT situacao_vaga, ordem_fila FROM racha_sessao_convocacoes WHERE sessao_id = :id AND jogador_id = :jog");
            $stmtA2->execute([':id' => $sessaoId, ':jog' => $this->jogAvulso2Id]);
            $rowA2 = $stmtA2->fetch(PDO::FETCH_ASSOC);
            if ($rowA2['situacao_vaga'] !== 'fila_espera') {
                throw new Exception("Avulso 2 deveria continuar na fila de espera: " . json_encode($rowA2));
            }

            $filaStatus = $this->queueService->getSessionQueueAndConvocationStatus($this->racha1Id, $sessaoId);
            if (empty($filaStatus['fila_espera']) || (int)$filaStatus['fila_espera'][0]['jogador_id'] !== $this->jogAvulso2Id) {
                throw new Exception("Avulso 2 deveria ser o 1º da fila de espera restante: " . json_encode($filaStatus['fila_espera']));
            }

            // Confere limite de vagas ocupadas: 1 mensalista reservado + 1 avulso promovido = 2 titulares
            $stmtTitulares = $this->pdo->prepare("
                SELECT COUNT(*) FROM racha_sessao_convocacoes
                WHERE sessao_id = :id AND situacao_vaga IN ('convocado_titular', 'vaga_reservada', 'promovido_titular')
            ");
            $stmtTitulares->execute([':id' => $sessaoId]);
            if ((int)$stmtTitulares->fetchColumn() !== 2) {
                throw new Exception("O número de vagas ocupadas deve ser exatamente igual ao limite de 2 vagas!");
            }
        });

        $this->assert("2.4 Fechamento pré-jogo da convocação sem homologação de presença", function () use (&$sessaoId) {
            $this->mockAuthContext($this->auxiliarUserId, 'organizador');
            $this->mockRachaHeader($this->racha1Id);

            $resFecha = $this->controller->fecharConvocacao($sessaoId);
            if (!$resFecha['ok'] || ($resFecha['resultado']['status_convocacao'] ?? '') !== 'fechada') {
                throw new Exception("Falha ao fechar convocação: " . json_encode($resFecha));
            }

            $stmt = $this->pdo->prepare("SELECT status_convocacao, apuracao_presenca, status FROM racha_sessoes WHERE id = :id");
            $stmt->execute([':id' => $sessaoId]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($row['status_convocacao'] !== 'fechada') {
                throw new Exception("status_convocacao deveria ser 'fechada'!");
            }
            if ($row['apuracao_presenca'] === 'homologada') {
                throw new Exception("VIOLAÇÃO: Fechamento de convocação NÃO PODE homologar presença!");
            }
            if ($row['status'] === 'concluida') {
                throw new Exception("VIOLAÇÃO: Fechamento de convocação NÃO PODE concluir a sessão!");
            }
        });

        $this->assert("2.5 Resposta tardia via webhook após fechamento gera auditoria mas não altera convocação nem promove avulso", function () use (&$sessaoId, $tokenRacha1) {
            // Avulso 3 envia 'RACHA SIM' após convocação fechada
            $payloadA3 = [
                'event'    => 'messages.upsert',
                'instance' => 'futlendas_racha_1',
                'data'     => [
                    'key'     => ['remoteJid' => '5512988000005@s.whatsapp.net', 'fromMe' => false, 'id' => 'WAMID_A3_LATE_SIM'],
                    'message' => ['conversation' => 'RACHA SIM']
                ]
            ];
            $resA3 = processMultiRachaWebhookHttpRequest(json_encode($payloadA3), ['X-Webhook-Token' => $tokenRacha1], [], $this->whatsappService);
            if ($resA3['http_code'] !== 200 || empty($resA3['body']['resposta_tardia'])) {
                throw new Exception("Resposta tardia deveria ter sido sinalizada como tal: " . json_encode($resA3));
            }

            // Confere que Avulso 3 NÃO foi promovido a titular nem colocado como titular ativo
            $stmtA3 = $this->pdo->prepare("SELECT situacao_vaga FROM racha_sessao_convocacoes WHERE sessao_id = :id AND jogador_id = :jog");
            $stmtA3->execute([':id' => $sessaoId, ':jog' => $this->jogAvulso3Id]);
            $sitA3 = $stmtA3->fetchColumn();
            if ($sitA3 === 'promovido_titular' || $sitA3 === 'convocado_titular' || $sitA3 === 'vaga_reservada') {
                throw new Exception("Resposta tardia alterou a lista fechada indevidamente: " . $sitA3);
            }

            // Confere que evento de auditoria 'resposta_tardia_convocacao' foi registrado
            $stmtEvt = $this->pdo->prepare("
                SELECT * FROM racha_sessao_eventos
                WHERE sessao_id = :id AND tipo_evento = 'resposta_tardia_convocacao' AND jogador_id = :jog
            ");
            $stmtEvt->execute([':id' => $sessaoId, ':jog' => $this->jogAvulso3Id]);
            $evt = $stmtEvt->fetch(PDO::FETCH_ASSOC);
            if (!$evt) {
                throw new Exception("Evento de auditoria 'resposta_tardia_convocacao' não foi gravado!");
            }
        });

        $this->assert("2.6 Reabertura com motivo obrigatório e substituição de convocado sem linha prévia em presenças", function () use (&$sessaoId) {
            $this->mockAuthContext($this->donoUserId, 'organizador');
            $this->mockRachaHeader($this->racha1Id);

            // Tentativa de reabrir sem motivo deve falhar com HTTP 400
            $this->controller->setJsonInput(['motivo' => '   ']);
            $falhouSemMotivo = false;
            try {
                $this->controller->reabrirConvocacao($sessaoId);
            } catch (HttpError $e) {
                if ($e->getStatusCode() === 400) {
                    $falhouSemMotivo = true;
                }
            }
            if (!$falhouSemMotivo) {
                throw new Exception("Reabertura de convocação sem motivo deveria falhar com HTTP 400!");
            }

            // Reabertura com motivo válido
            $this->controller->setJsonInput(['motivo' => 'Mensalista 2 sofreu lesão e avisou em cima da hora']);
            $resReab = $this->controller->reabrirConvocacao($sessaoId);
            if (!$resReab['ok'] || ($resReab['resultado']['status_convocacao'] ?? '') !== 'aberta') {
                throw new Exception("Falha ao reabrir convocação com motivo válido: " . json_encode($resReab));
            }

            // Mensalista 2 só existia em racha_sessao_convocacoes (não havia linha prévia em racha_sessao_presencas).
            // Realiza substituição direta pelo Convidado/Substituto:
            $this->controller->setJsonInput([
                'jogador_saiu_id'   => $this->jogMens2Id,
                'jogador_entrou_id' => $this->jogSubstitutoId,
                'motivo'            => 'Substituição pré-jogo: lesão de Mensalista 2'
            ]);
            $resSub = $this->controller->substituirParticipante($sessaoId);
            if (!$resSub['ok']) {
                throw new Exception("Substituição falhou: " . json_encode($resSub));
            }

            // Confere que a presença do substituído foi inicializada como 'substituido_saiu'
            // e do substituto como 'substituto_entrou'
            $stmtSubCheck = $this->pdo->prepare("
                SELECT jogador_id, status_presenca, substituiu_jogador_id
                FROM racha_sessao_presencas
                WHERE sessao_id = :id AND jogador_id IN (:saiu, :entrou)
            ");
            $stmtSubCheck->execute([
                ':id'     => $sessaoId,
                ':saiu'   => $this->jogMens2Id,
                ':entrou' => $this->jogSubstitutoId
            ]);
            $subRows = $stmtSubCheck->fetchAll(PDO::FETCH_ASSOC);
            $subMap = [];
            foreach ($subRows as $sr) {
                $subMap[(int)$sr['jogador_id']] = $sr;
            }

            if (!isset($subMap[$this->jogMens2Id]) || !in_array($subMap[$this->jogMens2Id]['status_presenca'], ['cancelado_no_prazo', 'substituido_saiu'], true)) {
                throw new Exception("Jogador que saiu não foi gravado com status de saída: " . json_encode($subMap));
            }
            if (!isset($subMap[$this->jogSubstitutoId]) || (int)$subMap[$this->jogSubstitutoId]['substituiu_jogador_id'] !== $this->jogMens2Id) {
                throw new Exception("Jogador substituto não foi gravado corretamente: " . json_encode($subMap));
            }

            // Fecha a convocação novamente
            $resFecha2 = $this->controller->fecharConvocacao($sessaoId);
            if (!$resFecha2['ok'] || ($resFecha2['resultado']['status_convocacao'] ?? '') !== 'fechada') {
                throw new Exception("Falha ao fechar convocação pela segunda vez: " . json_encode($resFecha2));
            }
        });

        $this->assert("2.7 Registro de presenças reais pós-jogo sem reabrir artificialmente a convocação", function () use (&$sessaoId) {
            $this->mockAuthContext($this->auxiliarUserId, 'organizador');
            $this->mockRachaHeader($this->racha1Id);

            // Jogo terminou. Registra presenças reais pós-jogo via Controller
            // Titulares em campo: Avulso 1 presente, Substituto presente
            $this->controller->setJsonInput([
                'presencas' => [
                    ['jogador_id' => $this->jogAvulso1Id, 'status_presenca' => 'presente'],
                    ['jogador_id' => $this->jogSubstitutoId, 'status_presenca' => 'presente']
                ]
            ]);
            $resPres = $this->controller->registrarPresencasReais($sessaoId);
            if (!$resPres['ok']) {
                throw new Exception("Falha ao salvar presenças reais pós-jogo: " . json_encode($resPres));
            }

            // Confere que a convocação PERMANECE 'fechada' (não foi reaberta artificialmente)
            $stmt = $this->pdo->prepare("SELECT status_convocacao, apuracao_presenca FROM racha_sessoes WHERE id = :id");
            $stmt->execute([':id' => $sessaoId]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($row['status_convocacao'] !== 'fechada') {
                throw new Exception("A convocação pré-jogo foi indevidamente reaberta após o jogo!");
            }
            if ($row['apuracao_presenca'] === 'homologada') {
                throw new Exception("A apuração de presença não pode estar homologada antes da chamada explícita de homologação!");
            }
        });

        $this->assert("2.8 Homologação, conclusão da sessão e bloqueio de novas alterações", function () use (&$sessaoId) {
            $this->mockAuthContext($this->donoUserId, 'organizador');
            $this->mockRachaHeader($this->racha1Id);

            // Homologa a presença oficial
            $resHomolog = $this->controller->homologarLista($sessaoId);
            if (!$resHomolog['ok'] || $resHomolog['apuracao_presenca'] !== 'homologada') {
                throw new Exception("Falha na homologação: " . json_encode($resHomolog));
            }

            // Conclui a sessão
            $resConc = $this->controller->concluirSessao($sessaoId);
            if (!$resConc['ok'] || $resConc['sessao']['status'] !== 'concluida') {
                throw new Exception("Falha ao concluir a sessão: " . json_encode($resConc));
            }

            // Tentar alterar presença em sessão concluída deve ser estritamente bloqueado (HTTP 400 ou 409)
            $falhouBloqueio = false;
            try {
                $this->controller->setJsonInput([
                    'presencas' => [
                        ['jogador_id' => $this->jogAvulso1Id, 'status_presenca' => 'falta_injustificada']
                    ]
                ]);
                $this->controller->registrarPresencasReais($sessaoId);
            } catch (HttpError $e) {
                if (in_array($e->getStatusCode(), [400, 409], true)) {
                    $falhouBloqueio = true;
                }
            }
            if (!$falhouBloqueio) {
                throw new Exception("Tentativa de alterar presença em sessão concluída deveria retornar HTTP 400 ou 409!");
            }

            // Confere integridade e autoria da auditoria
            $stmtEvts = $this->pdo->prepare("
                SELECT tipo_evento, tipo_ator, usuario_id, jogador_id
                FROM racha_sessao_eventos
                WHERE sessao_id = :id
                ORDER BY id ASC
            ");
            $stmtEvts->execute([':id' => $sessaoId]);
            $eventos = $stmtEvts->fetchAll(PDO::FETCH_ASSOC);
            if (empty($eventos)) {
                throw new Exception("Nenhum evento registrado no histórico da sessão!");
            }

            $tiposRegistrados = array_column($eventos, 'tipo_evento');
            $tiposEsperados = [
                'criacao', 'homologacao', 'conclusao',
                'fechamento_convocacao', 'resposta_tardia_convocacao', 'reabertura_convocacao',
                'substituicao_participante'
            ];
            foreach ($tiposEsperados as $te) {
                if (!in_array($te, $tiposRegistrados, true)) {
                    throw new Exception("Evento esperado '{$te}' não foi encontrado no histórico!");
                }
            }
        });

        // =====================================================================
        // SEÇÃO 3: RENOVAÇÃO MENSAL DESACOPLADA POR COMPETÊNCIA
        // =====================================================================

        $this->assert("3.1 Priorização estrita de valores e PIX cadastrados no servidor contra adulteração do frontend", function () {
            $this->mockAuthContext($this->financeiroUserId, 'organizador');
            $this->mockRachaHeader($this->racha1Id);

            // Frontend malicioso envia chave PIX adulterada e valor exorbitante
            $this->controller->setJsonInput([
                'competencia'       => '2026-11',
                'valor_mensalidade' => 999.99,
                'chave_pix'         => 'hacker@golpe.local',
                'instrucoes'        => 'Pague urgente na conta do invasor'
            ]);

            $resDisp = $this->controller->dispararRenovacaoMensal(null);
            if (!$resDisp['ok'] || $resDisp['competencia'] !== '2026-11' || $resDisp['enviados'] < 2) {
                throw new Exception("Disparo desacoplado falhou: " . json_encode($resDisp));
            }

            // Confere que o banco NÃO salvou 999.99, e sim os 60.00 cadastrados no servidor
            $stmt = $this->pdo->prepare("
                SELECT valor_cobrado, status_envio
                FROM racha_mensalistas_renovacoes
                WHERE racha_id = 1 AND competencia_ano = 2026 AND competencia_mes = 11
            ");
            $stmt->execute();
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            foreach ($rows as $r) {
                if ((float)$r['valor_cobrado'] !== 60.00) {
                    throw new Exception("VIOLAÇÃO DE SEGURANÇA: Valor arbitrário do frontend substituiu valor do servidor: " . $r['valor_cobrado']);
                }
            }

            // Confere nas mensagens enviadas capturadas pelo transporte simulado que a chave PIX enviada foi a oficial ('pix@racha-integrado.com')
            $foundPix = false;
            $foundHacker = false;
            foreach ($this->mockTransport->requests as $req) {
                $text = (string)($req['body']['text'] ?? '');
                if (str_contains($text, 'hacker@golpe.local')) {
                    $foundHacker = true;
                }
                if (str_contains($text, 'pix@racha-integrado.com')) {
                    $foundPix = true;
                }
            }
            if ($foundHacker) {
                throw new Exception("VIOLAÇÃO DE SEGURANÇA: Chave PIX adulterada pelo frontend vazou para a mensagem!");
            }
            if (!$foundPix) {
                throw new Exception("Chave PIX oficial do racha não foi utilizada na mensagem!");
            }
        });

        $this->assert("3.2 Idempotência: novo disparo para a mesma competência não duplica notificações", function () {
            $this->mockAuthContext($this->financeiroUserId, 'organizador');
            $this->mockRachaHeader($this->racha1Id);

            $this->controller->setJsonInput(['competencia' => '2026-11']);
            $resDisp2 = $this->controller->dispararRenovacaoMensal(null);

            if (!$resDisp2['ok']) {
                throw new Exception("Falha no segundo disparo: " . json_encode($resDisp2));
            }
            if ($resDisp2['pulados'] < 2 || $resDisp2['enviados'] !== 0) {
                throw new Exception("Disparo repetido não respeitou a idempotência (pulados: {$resDisp2['pulados']}, enviados: {$resDisp2['enviados']})!");
            }
        });

        $this->assert("3.3 Simulação de falha de envio e reenvio seguro sem duplicar os demais", function () {
            // Adiciona um 3º mensalista temporário para testar falha e reenvio
            $this->pdo->exec("
                INSERT INTO jogadores (id, nome, apelido_bot, whatsapp)
                VALUES (17, 'Gustavo Mensalista Falha', 'Gustavinho', '5512988000007')
            ");
            $this->pdo->exec("
                INSERT INTO racha_participantes (racha_id, jogador_id, tipo_participacao, ativo)
                VALUES (1, 17, 'mensalista', 1)
            ");
            $this->pdo->exec("
                INSERT INTO racha_mensalistas (racha_id, jogador_id, valor_individual, dia_vencimento, data_inicio, status)
                VALUES (1, 17, 60.00, 10, '2026-01-01', 'ativo')
            ");

            // Configura o transporte simulado para falhar apenas para o telefone do Gustavo
            $this->mockTransport->setCustomCallback(function ($method, $endpoint, $body) {
                if (str_starts_with($endpoint, '/message/sendText/') && isset($body['number']) && str_contains($body['number'], '5512988000007')) {
                    return [
                        'http_code'  => 500,
                        'error_code' => 'NETWORK_ERROR',
                        'error_msg'  => 'Simulated failure in Evolution API'
                    ];
                }
                return null;
            });

            $this->mockAuthContext($this->financeiroUserId, 'organizador');
            $this->mockRachaHeader($this->racha1Id);

            $this->controller->setJsonInput(['competencia' => '2026-11']);
            $resComFalha = $this->controller->dispararRenovacaoMensal(null);

            // Gustavo deve ter falhado, os 2 anteriores foram pulados
            if ($resComFalha['falhas'] !== 1 || $resComFalha['pulados'] !== 2) {
                throw new Exception("Falha esperada não foi detectada: " . json_encode($resComFalha));
            }

            // Confere que no banco Gustavo está com status_envio = 'falha'
            $stmtG = $this->pdo->query("SELECT status_envio FROM racha_mensalistas_renovacoes WHERE racha_id = 1 AND jogador_id = 17 AND competencia_mes = 11");
            if ($stmtG->fetchColumn() !== 'falha') {
                throw new Exception("Registro do jogador com falha não gravou status_envio = 'falha'!");
            }

            // Remove a falha simulada do mock (rede restabelecida)
            $this->mockTransport->setCustomCallback(null);

            // Reexecuta o disparo de renovação
            $this->controller->setJsonInput(['competencia' => '2026-11']);
            $resReenvio = $this->controller->dispararRenovacaoMensal(null);

            // Agora: os 2 primeiros devem ser pulados novamente, e Gustavo deve ser reenviado com sucesso!
            if ($resReenvio['pulados'] !== 2 || $resReenvio['enviados'] !== 1 || $resReenvio['falhas'] !== 0) {
                throw new Exception("Reenvio seguro falhou: " . json_encode($resReenvio));
            }

            // Confere que o banco agora atualizou status_envio = 'enviado' para Gustavo
            $stmtG2 = $this->pdo->query("SELECT status_envio FROM racha_mensalistas_renovacoes WHERE racha_id = 1 AND jogador_id = 17 AND competencia_mes = 11");
            if ($stmtG2->fetchColumn() !== 'enviado') {
                throw new Exception("Reenvio não atualizou status_envio para 'enviado'!");
            }
        });

        $this->assert("3.4 Respostas 'RENOVAR SIM' e 'RENOVAR NÃO' pelo webhook sem rescindir contrato nem inativar atleta", function () use ($tokenRacha1) {
            // Mensalista 1 responde 'RENOVAR SIM'
            $payloadSim = [
                'event'    => 'messages.upsert',
                'instance' => 'futlendas_racha_1',
                'data'     => [
                    'key'     => ['remoteJid' => '5512988000001@s.whatsapp.net', 'fromMe' => false, 'id' => 'WAMID_M1_RENOV_SIM'],
                    'message' => ['conversation' => 'RENOVAR SIM']
                ]
            ];
            $resSim = processMultiRachaWebhookHttpRequest(json_encode($payloadSim), ['X-Webhook-Token' => $tokenRacha1], [], $this->whatsappService);
            if (!$resSim['body']['ok'] || $resSim['body']['tipo_resposta'] !== 'renovacao_mensal') {
                throw new Exception("Webhook RENOVAR SIM falhou: " . json_encode($resSim));
            }

            // Confere gravação de 'sim'
            $stmtSim = $this->pdo->query("SELECT intencao_renovacao FROM racha_mensalistas_renovacoes WHERE racha_id = 1 AND jogador_id = {$this->jogMens1Id} AND competencia_mes = 11");
            if ($stmtSim->fetchColumn() !== 'sim') {
                throw new Exception("intencao_renovacao de Mensalista 1 deveria ser 'sim'!");
            }

            // Mensalista 2 responde 'RENOVAR NÃO'
            $payloadNao = [
                'event'    => 'messages.upsert',
                'instance' => 'futlendas_racha_1',
                'data'     => [
                    'key'     => ['remoteJid' => '5512988000002@s.whatsapp.net', 'fromMe' => false, 'id' => 'WAMID_M2_RENOV_NAO'],
                    'message' => ['conversation' => 'RENOVAR NÃO']
                ]
            ];
            $resNao = processMultiRachaWebhookHttpRequest(json_encode($payloadNao), ['X-Webhook-Token' => $tokenRacha1], [], $this->whatsappService);
            if (!$resNao['body']['ok'] || $resNao['body']['tipo_resposta'] !== 'renovacao_mensal') {
                throw new Exception("Webhook RENOVAR NÃO falhou: " . json_encode($resNao));
            }

            // Confere gravação de 'nao'
            $stmtNao = $this->pdo->query("SELECT intencao_renovacao FROM racha_mensalistas_renovacoes WHERE racha_id = 1 AND jogador_id = {$this->jogMens2Id} AND competencia_mes = 11");
            if ($stmtNao->fetchColumn() !== 'nao') {
                throw new Exception("intencao_renovacao de Mensalista 2 deveria ser 'nao'!");
            }

            // REGRA OBRIGATÓRIA: Não rescindir contrato nem excluir da lista oficial
            $statusMensalista2 = $this->pdo->query("SELECT status FROM racha_mensalistas WHERE racha_id = 1 AND jogador_id = {$this->jogMens2Id}")->fetchColumn();
            if ($statusMensalista2 !== 'ativo') {
                throw new Exception("VIOLAÇÃO: 'RENOVAR NÃO' cancelou o mensalista indevidamente ({$statusMensalista2})!");
            }

            $ativoPart2 = (int)$this->pdo->query("SELECT ativo FROM racha_participantes WHERE racha_id = 1 AND jogador_id = {$this->jogMens2Id}")->fetchColumn();
            if ($ativoPart2 !== 1) {
                throw new Exception("VIOLAÇÃO: 'RENOVAR NÃO' inativou o participante no racha indevidamente!");
            }
        });

        // =====================================================================
        // SEÇÃO 4: MATRIZ DE PERMISSÕES RBAC E ISOLAMENTO MULTI-INQUILINO
        // =====================================================================

        $this->assert("4.1 Papel Dono: acesso pleno esportivo, financeiro e controle de WhatsApp", function () use (&$sessaoId) {
            $this->mockAuthContext($this->donoUserId, 'organizador');
            $this->mockRachaHeader($this->racha1Id);

            // Esportivo: lista participantes
            $resPart = $this->controller->listarParticipantes();
            if (!is_array($resPart)) throw new Exception("Dono não conseguiu listar participantes!");

            // Financeiro: lista renovações
            $resRenov = $this->controller->listarRenovacoes();
            if (!is_array($resRenov)) throw new Exception("Dono não conseguiu listar renovações!");

            // WhatsApp: consulta status
            $resWhats = $this->controller->getWhatsAppStatus();
            if (!isset($resWhats['status']['instance_name'])) throw new Exception("Dono não conseguiu consultar WhatsApp!");
        });

        $this->assert("4.2 Papel Auxiliar: esportivo permitido; financeiro e desconexão WhatsApp bloqueados", function () use (&$sessaoId) {
            $this->mockAuthContext($this->auxiliarUserId, 'organizador');
            $this->mockRachaHeader($this->racha1Id);

            // Esportivo permitido: consultar sessão ativa
            $resSess = $this->controller->getSessaoAtiva();
            if (!isset($resSess['ok'])) throw new Exception("Auxiliar não conseguiu consultar sessão ativa!");

            // Financeiro bloqueado: disparar renovação mensal -> HTTP 403
            $bloqueadoFinanceiro = false;
            try {
                $this->controller->setJsonInput(['competencia' => '2026-11']);
                $this->controller->dispararRenovacaoMensal(null);
            } catch (HttpError $e) {
                if ($e->getStatusCode() === 403) $bloqueadoFinanceiro = true;
            }
            if (!$bloqueadoFinanceiro) {
                throw new Exception("Auxiliar deveria ser bloqueado com HTTP 403 ao disparar renovações financeiras!");
            }

            // WhatsApp desconexão bloqueada: desconectar WhatsApp -> HTTP 403
            $bloqueadoDesconexao = false;
            try {
                $this->controller->desconectarWhatsApp();
            } catch (HttpError $e) {
                if ($e->getStatusCode() === 403) $bloqueadoDesconexao = true;
            }
            if (!$bloqueadoDesconexao) {
                throw new Exception("Auxiliar deveria ser bloqueado com HTTP 403 ao desconectar WhatsApp!");
            }
        });

        $this->assert("4.3 Papel Financeiro: renovações permitidas; presença, homologação e desconexão bloqueadas", function () use (&$sessaoId) {
            $this->mockAuthContext($this->financeiroUserId, 'organizador');
            $this->mockRachaHeader($this->racha1Id);

            // Financeiro permitido: listar renovações
            $resRenov = $this->controller->listarRenovacoes();
            if (!is_array($resRenov)) throw new Exception("Financeiro não conseguiu listar renovações!");

            // Esportivo bloqueado: homologar lista -> HTTP 403
            $bloqueadoHomolog = false;
            try {
                $this->controller->homologarLista($sessaoId);
            } catch (HttpError $e) {
                if ($e->getStatusCode() === 403) $bloqueadoHomolog = true;
            }
            if (!$bloqueadoHomolog) {
                throw new Exception("Financeiro deveria ser bloqueado com HTTP 403 ao homologar presença!");
            }

            // Esportivo bloqueado: substituir participante -> HTTP 403
            $bloqueadoSub = false;
            try {
                $this->controller->setJsonInput(['jogador_saiu_id' => 1, 'jogador_entrou_id' => 2]);
                $this->controller->substituirParticipante($sessaoId);
            } catch (HttpError $e) {
                if ($e->getStatusCode() === 403) $bloqueadoSub = true;
            }
            if (!$bloqueadoSub) {
                throw new Exception("Financeiro deveria ser bloqueado com HTTP 403 ao substituir participante!");
            }

            // WhatsApp desconexão bloqueada: desconectar WhatsApp -> HTTP 403
            $bloqueadoDesconexao = false;
            try {
                $this->controller->desconectarWhatsApp();
            } catch (HttpError $e) {
                if ($e->getStatusCode() === 403) $bloqueadoDesconexao = true;
            }
            if (!$bloqueadoDesconexao) {
                throw new Exception("Financeiro deveria ser bloqueado com HTTP 403 ao desconectar WhatsApp!");
            }
        });

        $this->assert("4.4 Bloqueio cruzado multi-inquilino entre rachas distintos (HTTP 403)", function () use (&$sessaoId) {
            // Usuário Dono do Racha 1 tenta operar no Racha 2
            $this->mockAuthContext($this->donoUserId, 'organizador');
            $this->mockRachaHeader($this->racha2Id);

            $bloqueadoCross = false;
            try {
                $this->controller->getWhatsAppStatus(2);
            } catch (HttpError $e) {
                if ($e->getStatusCode() === 403) $bloqueadoCross = true;
            }
            if (!$bloqueadoCross) {
                throw new Exception("Dono do Racha 1 deveria ter sido bloqueado com HTTP 403 ao tentar acessar o Racha 2!");
            }

            // Dono do Racha 2 tenta acessar sessão do Racha 1
            $this->mockAuthContext($this->donoRacha2UserId, 'organizador');
            $this->mockRachaHeader($this->racha2Id);

            $bloqueadoSessaoCross = false;
            try {
                $this->controller->getHistoricoSessao($sessaoId, 2);
            } catch (HttpError $e) {
                if (in_array($e->getStatusCode(), [403, 404], true)) $bloqueadoSessaoCross = true;
            }
            if (!$bloqueadoSessaoCross) {
                throw new Exception("Acesso a sessão de outro racha deveria ter sido bloqueado!");
            }
        });

        // =====================================================================
        // 5. TESTES ESPECÍFICOS DA ETAPA 3C.3.2 (CONEXÃO, TEMPLATES, CANCELAR E PROMOÇÃO)
        // =====================================================================
        $this->assert("5.1 Diagnóstico claro de ausência de credenciais Evolution API (HTTP 503)", function () {
            // Cria um serviço sem credenciais configuradas
            $rawService = new WhatsAppEvolutionService($this->pdo, $this->queueService, null, ['base_url' => '', 'api_key' => '']);
            $rawController = new RachaGestaoController($this->pdo, $this->presenceEngine, $this->queueService, $rawService);

            $this->mockAuthContext($this->donoUserId, 'dono');
            $this->mockRachaHeader($this->racha1Id);

            $pegou503 = false;
            try {
                $rawController->conectarWhatsApp();
            } catch (HttpError $e) {
                if ($e->getStatusCode() === 503 && strpos($e->getMessage(), 'EVOLUTION_URL') !== false) {
                    $pegou503 = true;
                }
            }

            if (!$pegou503) {
                throw new Exception("Chamada sem credenciais Evolution API deveria retornar HTTP 503 com instrução clara de configuração!");
            }
        });

        $this->assert("5.2 Disparo com rotação de templates e substituição de variáveis ({nome}, {apelido}, {data}, {horario}, {local})", function () {
            $this->mockAuthContext($this->donoUserId, 'dono');
            $this->mockRachaHeader($this->racha1Id);

            // Cria sessão nova para testar disparo de convocação com templates
            $this->controller->setJsonInput([
                'data_racha'     => '2026-11-20',
                'horario_inicio' => '20:00:00',
                'horario_fim'    => '22:00:00'
            ]);
            $sessRes = $this->controller->criarSessao();
            $sessId = (int)$sessRes['sessao']['id'];

            try {
                $this->queueService->prepareSessionConvocation(
                    $this->racha1Id,
                    $sessId,
                    [$this->jogMens1Id, $this->jogMens2Id, $this->jogAvulso1Id, $this->jogAvulso2Id],
                    $this->donoUserId
                );

                $this->controller->setJsonInput([
                    'variacoes_mensagens' => [
                        "Var1: Fala {apelido}! Racha *{nome_racha}* em {data} às {horario} no {local}. Responda *SIM* ou *NÃO*.",
                        "Var2: Opa {nome}! Partida confirmada para {data}. Responda *SIM* ou *NÃO*."
                    ]
                ]);
                $res = $this->controller->dispararConvocacao($sessId);

                if (!$res['ok'] || empty($res['resultado']['resultados'])) {
                    throw new Exception("Falha no disparo com templates variados!");
                }

                // Verifica que os textos gerados substituíram as variáveis corretamente
                $textos = array_column($res['resultado']['resultados'], 'texto_preview');
                $encontrouVar1 = false;
                $encontrouVar2 = false;
                foreach ($textos as $txt) {
                    if (strpos($txt, 'Var1:') !== false) $encontrouVar1 = true;
                    if (strpos($txt, 'Var2:') !== false) $encontrouVar2 = true;
                    if (strpos($txt, '{nome}') !== false || strpos($txt, '{apelido}') !== false) {
                        throw new Exception("Variáveis não foram substituídas no texto da mensagem: {$txt}");
                    }
                }
                if (!$encontrouVar1 || !$encontrouVar2) {
                    throw new Exception("Rotação entre as variações de mensagem não ocorreu nos disparos: " . json_encode($textos));
                }
            } finally {
                // Encerra sessão do teste 5.2 para não gerar ambiguidade no teste 5.3
                try {
                    $this->presenceEngine->cancelSession($this->racha1Id, $sessId, 'Fim do teste 5.2 de templates', $this->donoUserId);
                } catch (Throwable $t) {}
            }
        });

        $this->assert("5.3 Comando CANCELAR via WhatsApp após fechamento: liberação de vaga e promoção FIFO com notificação completa", function () use ($tokenRacha1) {
            $this->mockAuthContext($this->donoUserId, 'dono');
            $this->mockRachaHeader($this->racha1Id);

            // Cria sessão dedicada para testar CANCELAR e promoção automática
            $this->controller->setJsonInput([
                'data_racha'     => '2026-11-27',
                'horario_inicio' => '20:00:00',
                'horario_fim'    => '22:00:00'
            ]);
            $sessRes = $this->controller->criarSessao();
            $sessId = (int)$sessRes['sessao']['id'];

            // Limite de 2 vagas
            $this->queueService->prepareSessionConvocation(
                $this->racha1Id,
                $sessId,
                [$this->jogMens1Id, $this->jogMens2Id, $this->jogAvulso1Id, $this->jogAvulso2Id],
                $this->donoUserId
            );

            // Mensalista 1 confirma
            $pSim1 = [
                'event'    => 'messages.upsert',
                'instance' => 'futlendas_racha_1',
                'data'     => [
                    'key'     => ['remoteJid' => '5512988000001@s.whatsapp.net', 'fromMe' => false, 'id' => 'WAMID_TEST_CANC_M1_SIM'],
                    'message' => ['conversation' => 'SIM']
                ]
            ];
            processMultiRachaWebhookHttpRequest(json_encode($pSim1), ['X-Webhook-Token' => $tokenRacha1], [], $this->whatsappService);

            // Mensalista 2 confirma
            $pSim2 = [
                'event'    => 'messages.upsert',
                'instance' => 'futlendas_racha_1',
                'data'     => [
                    'key'     => ['remoteJid' => '5512988000002@s.whatsapp.net', 'fromMe' => false, 'id' => 'WAMID_TEST_CANC_M2_SIM'],
                    'message' => ['conversation' => 'SIM']
                ]
            ];
            processMultiRachaWebhookHttpRequest(json_encode($pSim2), ['X-Webhook-Token' => $tokenRacha1], [], $this->whatsappService);

            // Avulso 1 confirma -> entra na fila (vagas lotadas)
            $pA1 = [
                'event'    => 'messages.upsert',
                'instance' => 'futlendas_racha_1',
                'data'     => [
                    'key'     => ['remoteJid' => '5512988000003@s.whatsapp.net', 'fromMe' => false, 'id' => 'WAMID_TEST_CANC_A1_SIM'],
                    'message' => ['conversation' => 'SIM']
                ]
            ];
            processMultiRachaWebhookHttpRequest(json_encode($pA1), ['X-Webhook-Token' => $tokenRacha1], [], $this->whatsappService);

            // Fecha a convocação pré-jogo
            $this->controller->fecharConvocacao($sessId);

            // Agora Mensalista 2 envia o comando 'CANCELAR' via WhatsApp
            $pCancM2 = [
                'event'    => 'messages.upsert',
                'instance' => 'futlendas_racha_1',
                'data'     => [
                    'key'     => ['remoteJid' => '5512988000002@s.whatsapp.net', 'fromMe' => false, 'id' => 'WAMID_TEST_CANC_M2_CMD'],
                    'message' => ['conversation' => 'CANCELAR']
                ]
            ];
            $resCanc = processMultiRachaWebhookHttpRequest(json_encode($pCancM2), ['X-Webhook-Token' => $tokenRacha1], [], $this->whatsappService);

            if ($resCanc['http_code'] !== 200 || empty($resCanc['body']['vaga_liberada'])) {
                throw new Exception("Comando CANCELAR após fechamento deveria liberar a vaga! " . json_encode($resCanc));
            }

            // Confere que o Avulso 1 foi promovido da fila FIFO
            $prom = $resCanc['body']['promocao_automatica'] ?? null;
            if (!$prom || (int)$prom['jogador_id'] !== $this->jogAvulso1Id || $prom['situacao_vaga'] !== 'promovido_titular') {
                throw new Exception("Avulso 1 deveria ter sido promovido automaticamente ao cancelar vaga! " . json_encode($prom));
            }

            // Confere que a notificação de promoção possui os detalhes e a instrução CANCELAR
            $notif = $resCanc['body']['notificacao_promocao'] ?? null;
            if (!$notif || empty($notif['enviado']) || strpos($notif['texto_preview'] ?? '', 'CANCELAR') === false) {
                throw new Exception("Notificação ao promovido deveria conter instruções sobre CANCELAR!");
            }

            // Confere resposta de confirmação de cancelamento enviada ao jogador
            $respPlayer = $resCanc['body']['resposta_cancelamento'] ?? null;
            if (!$respPlayer || empty($respPlayer['enviado']) || strpos($respPlayer['texto_preview'] ?? '', 'cancelada com sucesso') === false) {
                throw new Exception("Mensagem de confirmação de cancelamento não foi enviada ao jogador que cancelou!");
            }
        });

        $this->assert("5.4 Idempotência do comando CANCELAR: repetição informa que já cancelou sem alterar fila", function () use ($tokenRacha1) {
            // Reenvia exatamente a mesma mensagem de cancelamento do Mensalista 2
            $pCancDup = [
                'event'    => 'messages.upsert',
                'instance' => 'futlendas_racha_1',
                'data'     => [
                    'key'     => ['remoteJid' => '5512988000002@s.whatsapp.net', 'fromMe' => false, 'id' => 'WAMID_TEST_CANC_M2_CMD_DUP'],
                    'message' => ['conversation' => 'CANCELAR']
                ]
            ];
            $resDup = processMultiRachaWebhookHttpRequest(json_encode($pCancDup), ['X-Webhook-Token' => $tokenRacha1], [], $this->whatsappService);

            if ($resDup['http_code'] !== 200 || empty($resDup['body']['idempotente']) || empty($resDup['body']['ja_cancelado'])) {
                throw new Exception("Cancelamento repetido deveria retornar idempotente=true e ja_cancelado=true! " . json_encode($resDup));
            }

            if (!empty($resDup['body']['vaga_liberada'])) {
                throw new Exception("Cancelamento repetido não pode liberar vaga novamente!");
            }

            // Confere resposta informando que já havia cancelado
            $respPlayer = $resDup['body']['resposta_cancelamento'] ?? null;
            if (!$respPlayer || empty($respPlayer['enviado']) || strpos($respPlayer['texto_preview'] ?? '', 'já havia cancelado') === false) {
                throw new Exception("Resposta de cancelamento duplicado deveria informar que a participação já havia sido cancelada!");
            }
        });

        echo "\n====================================================================\n";
        echo " RESULTADO FINAL DA SUÍTE INTEGRADA ETAPA 3C.3.2:\n";
        echo " APROVADOS: {$this->passed} | FALHAS: {$this->failed}\n";
        echo "====================================================================\n";

        if ($this->failed > 0) {
            exit(1);
        }
    }
}

$suite = new TestIntegradoRachaSuite();
$suite->runAll();
