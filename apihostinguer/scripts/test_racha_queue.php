<?php
/**
 * SUÍTE DE TESTES AUTOMATIZADOS — ETAPA 3C.1: PARTICIPANTES MULTI-RACHA E FILA DE ESPERA FIFO
 * Arquivo: apihostinguer/scripts/test_racha_queue.php
 *
 * Cobre todos os 17 cenários funcionais, transacionais, append-only e de concorrência real
 * (via proc_open e conexões PDO independentes) exigidos na Etapa 3C.1, operando exclusivamente
 * no banco local db_futlendas_sandbox (127.0.0.1:3307).
 */

putenv('ENVIRONMENT=sandbox');
$_ENV['ENVIRONMENT'] = 'sandbox';

require_once __DIR__ . '/../config/database_sandbox.php';
require_once __DIR__ . '/../src/utils/HttpError.php';
require_once __DIR__ . '/../src/middleware/RachaScopeMiddleware.php';
require_once __DIR__ . '/../src/services/PresenceEngine.php';
require_once __DIR__ . '/../src/services/RachaQueueService.php';

/**
 * Wrapper PDO de teste que injeta falha controlada exatamente ao preparar/executar
 * a gravação de um tipo específico de evento em `racha_sessao_eventos`, permitindo
 * comprovar o rollback integral das tabelas `racha_sessao_convocacoes` e `racha_sessao_fila_contadores`.
 */
class FaultInjectingQueuePdo extends PDO
{
    public int $failOnEventInsertNumber = 0;
    public int $eventInsertAttempts = 0;

    public function __construct()
    {
        SandboxDatabase::getConnection();

        $host = (string)(getenv('DB_HOST') ?: ($_ENV['DB_HOST'] ?? '127.0.0.1'));
        $port = (int)(getenv('DB_PORT') ?: ($_ENV['DB_PORT'] ?? 3307));
        $db   = (string)(getenv('DB_NAME') ?: ($_ENV['DB_NAME'] ?? 'db_futlendas_sandbox'));
        $user = (string)(getenv('DB_APP_USER') ?: ($_ENV['DB_APP_USER'] ?? 'futlendas_app_sandbox'));
        $pass = (string)(getenv('DB_APP_PASSWORD') !== false ? getenv('DB_APP_PASSWORD') : ($_ENV['DB_APP_PASSWORD'] ?? 'sandbox_app_local_only_3307'));

        $dsn = "mysql:host={$host};port={$port};dbname={$db};charset=utf8mb4";
        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
            PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4, SESSION sql_mode = 'STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION,NO_ZERO_DATE,NO_ZERO_IN_DATE'"
        ];

        parent::__construct($dsn, $user, $pass, $options);
    }

    #[\ReturnTypeWillChange]
    public function prepare($query, $options = [])
    {
        $sql = (string)$query;
        if (stripos($sql, 'INSERT INTO racha_sessao_eventos') !== false) {
            $this->eventInsertAttempts++;
            if ($this->failOnEventInsertNumber > 0 && $this->eventInsertAttempts === $this->failOnEventInsertNumber) {
                throw new RuntimeException("FALHA SIMULADA DE AUDITORIA: Erro forçado ao gravar evento #{$this->eventInsertAttempts} em racha_sessao_eventos.");
            }
        }
        return parent::prepare($sql, $options);
    }
}

class RachaQueueTestSuite
{
    private PDO $pdo;
    private PDO $adminPdo;
    private PresenceEngine $presenceEngine;
    private RachaQueueService $queueService;
    private int $passed = 0;
    private int $failed = 0;

    private int $racha1Id = 1;
    private int $racha2Id = 2;
    private int $organizadorId = 2; // dev_organizador (ativo=1)

    public function __construct()
    {
        SandboxDatabase::resetDisposableSandboxSchema(true);
        $this->pdo = SandboxDatabase::getConnection(true);
        $this->adminPdo = SandboxDatabase::getAdminConnection(true);
        $this->presenceEngine = new PresenceEngine($this->pdo);
        $this->queueService = new RachaQueueService($this->pdo);
    }

    private function assert(string $name, callable $fn): void
    {
        echo "TESTANDO: {$name}... ";
        try {
            $fn();
            echo "APROVADO (PASS)\n";
            $this->passed++;
        } catch (Throwable $e) {
            echo "FALHOU (FAIL): " . $e->getMessage() . "\n";
            $this->failed++;
        }
    }

    /**
     * Dispara dois processos PHP independentes (`proc_open`) com conexões PDO distintas,
     * enquanto a conexão coordenadora retém o lock InnoDB (`FOR UPDATE`) na sessão por 180ms
     * para garantir contenção simultânea real no MariaDB.
     */
    private function runConcurrentWorkersWithSessionBarrier(int $rachaId, int $sessaoId, array $payloadA, array $payloadB): array
    {
        $workerScript = __DIR__ . '/concurrency_worker.php';
        $phpBin = PHP_BINARY ?: 'php';

        $payloadA['await_stdin_signal'] = true;
        $payloadB['await_stdin_signal'] = true;

        $b64A = base64_encode((string)json_encode($payloadA, JSON_UNESCAPED_UNICODE));
        $b64B = base64_encode((string)json_encode($payloadB, JSON_UNESCAPED_UNICODE));

        $desc = [
            0 => ['pipe', 'r'],
            1 => ['pipe', 'w'],
            2 => ['pipe', 'w']
        ];

        // Coordenador segura o lock FOR UPDATE na sessão para que ambos os processos disputem o lock real no InnoDB
        $coordPdo = SandboxDatabase::getConnection(true);
        $coordPdo->beginTransaction();
        $stmtLock = $coordPdo->prepare("SELECT id FROM racha_sessoes WHERE id = :id AND racha_id = :racha_id FOR UPDATE");
        $stmtLock->execute([':id' => $sessaoId, ':racha_id' => $rachaId]);
        $stmtLock->fetch();

        $procA = proc_open([$phpBin, $workerScript, $b64A], $desc, $pipesA);
        $procB = proc_open([$phpBin, $workerScript, $b64B], $desc, $pipesB);

        if (!is_resource($procA) || !is_resource($procB)) {
            $coordPdo->rollBack();
            throw new RuntimeException("Falha ao iniciar processos concorrentes via proc_open.");
        }

        $readyA = fgets($pipesA[1]);
        $readyB = fgets($pipesB[1]);
        if (strpos((string)$readyA, 'READY:') !== 0 || strpos((string)$readyB, 'READY:') !== 0) {
            $coordPdo->rollBack();
            throw new RuntimeException("Workers não sinalizaram prontidão READY: A={$readyA}, B={$readyB}");
        }

        // Libera ambos os processos no mesmo instante
        fwrite($pipesA[0], "GO\n");
        fwrite($pipesB[0], "GO\n");
        fflush($pipesA[0]);
        fflush($pipesB[0]);
        fclose($pipesA[0]);
        fclose($pipesB[0]);

        // Mantém o lock da sessão por 180ms para que ambos entrem em LOCK WAIT real no InnoDB
        usleep(180000);
        $coordPdo->commit();

        $outA = stream_get_contents($pipesA[1]);
        $errA = stream_get_contents($pipesA[2]);
        fclose($pipesA[1]);
        fclose($pipesA[2]);
        proc_close($procA);

        $outB = stream_get_contents($pipesB[1]);
        $errB = stream_get_contents($pipesB[2]);
        fclose($pipesB[1]);
        fclose($pipesB[2]);
        proc_close($procB);

        $resA = json_decode(trim((string)$outA), true);
        $resB = json_decode(trim((string)$outB), true);

        if (!is_array($resA) || !is_array($resB)) {
            throw new RuntimeException("Saída inválida dos workers concorrentes: outA={$outA} (errA={$errA}) | outB={$outB} (errB={$errB})");
        }

        return [$resA, $resB];
    }

    public function runAll(): void
    {
        echo "====================================================================\n";
        echo " SUÍTE DE TESTES ETAPA 3C.1 — PARTICIPANTES E FILA DE ESPERA FIFO\n";
        echo "====================================================================\n\n";

        // Setup base: cria 2 rachas de teste (Racha 1 e Racha 2)
        $this->pdo->exec("
            INSERT INTO rachas (id, nome, dia_semana, horario_inicio, local_nome, valor_mensalidade_padrao, valor_avulso_padrao, limite_vagas, ativo)
            VALUES
                (1, 'Racha Terça Teste Fila', 'terca', '20:00:00', 'Arena Sandbox 1', 60.00, 20.00, 20, 1),
                (2, 'Racha Quinta Teste Isolado', 'quinta', '21:00:00', 'Arena Sandbox 2', 70.00, 25.00, 16, 1)
        ");

        $jogadorSemContaId = 0;
        $mensalista1Id = 1; // Atleta Teste 1 (usuario_id = 1, whatsapp = 5512900000001)
        $mensalista2Id = 2; // Atleta Teste 2 (usuario_id = 2, whatsapp = 5512900000002)
        $mensalista3Id = 3; // Atleta Teste 3 (usuario_id = 3, whatsapp = 5512900000003)
        $avulso1Id = 0;
        $avulso2Id = 0;
        $avulso3Id = 0;
        $sessaoPrincipalId = 0;

        // =====================================================================
        // TESTE 1: Cadastro de jogador sem conta de login
        // =====================================================================
        $this->assert("1. Cadastro de jogador avulso sem conta de login (usuario_id IS NULL)", function () use (&$jogadorSemContaId, &$avulso1Id) {
            $res = $this->queueService->registerOrReuseParticipant(
                $this->racha1Id,
                'Lucas Avulso Sem Login',
                '(12) 99111-2233',
                'avulso_convidado',
                $this->organizadorId,
                null,
                'linha',
                'Lucão'
            );

            if ($res['reutilizou_jogador'] !== false) {
                throw new Exception("Esperado novo cadastro global para Lucas Avulso Sem Login.");
            }
            if ($res['whatsapp'] !== '5512991112233') {
                throw new Exception("Telefone não foi normalizado para 13 dígitos: {$res['whatsapp']}");
            }

            $jogadorSemContaId = (int)$res['jogador_id'];
            $avulso1Id = $jogadorSemContaId;

            $stmt = $this->pdo->prepare("SELECT id, nome, usuario_id, whatsapp, apelido_bot FROM jogadores WHERE id = ?");
            $stmt->execute([$jogadorSemContaId]);
            $jog = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$jog || $jog['usuario_id'] !== null) {
                throw new Exception("O jogador sem conta de login deveria ter usuario_id NULL.");
            }
            if ($jog['whatsapp'] !== '5512991112233' || $jog['apelido_bot'] !== 'Lucão') {
                throw new Exception("Dados de WhatsApp/apelido não salvos corretamente em jogadores.");
            }
        });

        // =====================================================================
        // TESTE 2: Reutilização de jogador já cadastrado, preservando seu histórico
        // =====================================================================
        $this->assert("2. Reutilização de jogador já cadastrado (preserva identidade global e histórico)", function () use ($jogadorSemContaId) {
            // Registra uma sessão histórica concluída para comprovar preservação de histórico do mesmo jogador_id
            $sessHist = $this->presenceEngine->createSession($this->racha1Id, '2026-10-06', '20:00', '22:00', $this->organizadorId);
            $this->presenceEngine->confirmPresence($this->racha1Id, $sessHist['id'], $jogadorSemContaId, 'presente', 'organizador_manual', $this->organizadorId);
            $this->presenceEngine->homologateSession($this->racha1Id, $sessHist['id'], $this->organizadorId);
            $this->presenceEngine->concludeSession($this->racha1Id, $sessHist['id'], $this->organizadorId);

            // Cadastra novamente o mesmo jogador (por nome + variação de telefone de 10 dígitos sem o 9) no Racha 2 e atualiza no Racha 1
            $reusoRacha1 = $this->queueService->registerOrReuseParticipant(
                $this->racha1Id,
                'Lucas Avulso Sem Login',
                '1291112233', // 10 dígitos sem DDI e sem 9 -> normaliza para 5512991112233
                'avulso_recorrente',
                $this->organizadorId
            );

            if ($reusoRacha1['reutilizou_jogador'] !== true || (int)$reusoRacha1['jogador_id'] !== $jogadorSemContaId) {
                throw new Exception("Criou novo jogador em vez de reutilizar jogador_id #{$jogadorSemContaId}!");
            }

            // Verifica que o histórico de presença continua intacto para o mesmo jogador_id
            $freq = $this->presenceEngine->calculatePlayerAttendance($this->racha1Id, $jogadorSemContaId);
            if ((int)$freq['presencas_oficiais'] !== 1 || (int)$freq['oportunidades_validas'] !== 1) {
                throw new Exception("Histórico de frequência não foi preservado para o jogador reutilizado!");
            }

            // Verifica reaproveitamento automático de usuarios.whatsapp para jogador com conta (Atleta Teste 1)
            $reusoComConta = $this->queueService->registerOrReuseParticipant(
                $this->racha1Id,
                'Atleta Teste 1',
                null,
                'mensalista',
                $this->organizadorId,
                1
            );
            if ($reusoComConta['whatsapp'] !== '5512900000001') {
                throw new Exception("Não reaproveitou usuarios.whatsapp do Atleta Teste 1: obtido " . var_export($reusoComConta['whatsapp'], true));
            }
        });

        // =====================================================================
        // TESTE 3: Normalização de telefone e tratamento controlado de colisão
        // =====================================================================
        $this->assert("3. Normalização de variações BR e bloqueio controlado de colisão de telefone (HTTP 409)", function () use ($jogadorSemContaId) {
            // 3a. Normalização de 10, 11, 12 e 13 dígitos
            $n10 = $this->queueService->normalizePhoneNumber('1288776655');
            $n11 = $this->queueService->normalizePhoneNumber('(12) 98877-6655');
            $n12 = $this->queueService->normalizePhoneNumber('+55 12 8877-6655');
            $n13 = $this->queueService->normalizePhoneNumber('5512988776655');

            if ($n10 !== '5512988776655' || $n11 !== '5512988776655' || $n12 !== '5512988776655' || $n13 !== '5512988776655') {
                throw new Exception("Falha na normalização canônica de 13 dígitos: {$n10}, {$n11}, {$n12}, {$n13}");
            }

            $vars = $this->queueService->getPhoneVariations('5512988776655');
            foreach (['5512988776655', '551288776655', '12988776655', '1288776655'] as $expectedVar) {
                if (!in_array($expectedVar, $vars, true)) {
                    throw new Exception("Variação esperada '{$expectedVar}' ausente em getPhoneVariations().");
                }
            }

            // 3b. Tentativa de cadastrar OUTRA pessoa com o telefone de Lucas Avulso Sem Login -> DEVE REJEITAR COM 409 SEM FUNDIR!
            $collisionCaught = false;
            try {
                $this->queueService->registerOrReuseParticipant(
                    $this->racha1Id,
                    'Pedro Irmão Com Mesmo Celular',
                    '5512991112233',
                    'avulso_convidado',
                    $this->organizadorId
                );
            } catch (HttpError $e) {
                if ($e->getStatusCode() === 409) {
                    $collisionCaught = true;
                }
            }

            if (!$collisionCaught) {
                throw new Exception("Não lançou conflito controlado (HTTP 409) ao tentar usar telefone já pertencente a outro jogador!");
            }

            // Confirma que o nome de Lucas Avulso Sem Login NÃO foi sobrescrito nem fundido
            $stmt = $this->pdo->prepare("SELECT nome FROM jogadores WHERE id = ?");
            $stmt->execute([$jogadorSemContaId]);
            if ($stmt->fetchColumn() !== 'Lucas Avulso Sem Login') {
                throw new Exception("Cadastro original foi corrompido/fundido indevidamente após colisão de telefone!");
            }
        });

        // =====================================================================
        // TESTE 4: Vínculo correto dos tipos mensalista, avulso_recorrente e avulso_convidado
        // =====================================================================
        $this->assert("4. Vínculo correto de mensalista, avulso_recorrente e avulso_convidado", function () use (&$avulso2Id, &$avulso3Id) {
            // Mensalistas 2 e 3 no Racha 1
            $this->queueService->registerOrReuseParticipant($this->racha1Id, 'Atleta Teste 2', null, 'mensalista', $this->organizadorId, 2);
            $this->queueService->registerOrReuseParticipant($this->racha1Id, 'Atleta Teste 3', null, 'mensalista', $this->organizadorId, 3);

            // Avulso recorrente (sem conta)
            $av2 = $this->queueService->registerOrReuseParticipant(
                $this->racha1Id,
                'Rafael Avulso Recorrente',
                '12992223344',
                'avulso_recorrente',
                $this->organizadorId,
                null,
                'linha'
            );
            $avulso2Id = (int)$av2['jogador_id'];

            // Avulso convidado (sem conta)
            $av3 = $this->queueService->registerOrReuseParticipant(
                $this->racha1Id,
                'Bruno Avulso Convidado',
                '12993334455',
                'avulso_convidado',
                $this->organizadorId,
                null,
                'goleiro'
            );
            $avulso3Id = (int)$av3['jogador_id'];

            $vMens = $this->queueService->validateParticipantLink($this->racha1Id, 2);
            $vRec  = $this->queueService->validateParticipantLink($this->racha1Id, $avulso2Id);
            $vConv = $this->queueService->validateParticipantLink($this->racha1Id, $avulso3Id);

            if ($vMens['tipo_participacao'] !== 'mensalista' || $vMens['status_mensalidade'] !== 'ativo') {
                throw new Exception("Mensalista #2 não ficou com vínculo ativo em racha_mensalistas.");
            }
            if ($vRec['tipo_participacao'] !== 'avulso_recorrente' || $vRec['mensalista_id'] !== null) {
                throw new Exception("Avulso recorrente não deveria exigir contrato em racha_mensalistas.");
            }
            if ($vConv['tipo_participacao'] !== 'avulso_convidado' || $vConv['mensalista_id'] !== null) {
                throw new Exception("Avulso convidado não deveria exigir contrato em racha_mensalistas.");
            }
        });

        // =====================================================================
        // TESTE 5: Preparação de convocação de mensalistas e avulsos para a mesma sessão
        // =====================================================================
        $this->assert("5. Preparação de convocação semanal unificada (mensalistas e avulsos na mesma sessão)", function () use (
            &$sessaoPrincipalId, $mensalista1Id, $mensalista2Id, $mensalista3Id, $avulso1Id, $avulso2Id, $avulso3Id
        ) {
            $sess = $this->presenceEngine->createSession($this->racha1Id, '2026-10-27', '20:00', '22:00', $this->organizadorId);
            $sessaoPrincipalId = (int)$sess['id'];

            $conv = $this->queueService->prepareSessionConvocation(
                $this->racha1Id,
                $sessaoPrincipalId,
                [$mensalista1Id, $mensalista2Id, $mensalista3Id, $avulso1Id, $avulso2Id, $avulso3Id],
                $this->organizadorId
            );

            if ($conv['total_convocados'] !== 6 || $conv['total_mensalistas'] !== 3 || $conv['total_avulsos'] !== 3) {
                throw new Exception("Contagem incorreta na convocação: " . json_encode($conv));
            }

            // Verifica que nenhuma presença real foi criada em racha_sessao_presencas
            $cntPres = (int)$this->pdo->query("SELECT COUNT(*) FROM racha_sessao_presencas WHERE sessao_id = {$sessaoPrincipalId}")->fetchColumn();
            if ($cntPres !== 0) {
                throw new Exception("A preparação da convocação não pode inserir registros em racha_sessao_presencas!");
            }
        });

        // =====================================================================
        // TESTE 6: Registro de SIM, NÃO e DEPOIS sem gravar presença real automaticamente
        // =====================================================================
        $this->assert("6. Registro de SIM, DEPOIS e manutenção de sem_resposta sem gravar presença real", function () use (
            $sessaoPrincipalId, $mensalista1Id, $mensalista2Id, $mensalista3Id
        ) {
            // Mensalista 1 responde SIM -> vaga_reservada
            $r1 = $this->queueService->recordParticipantIntent(
                $this->racha1Id,
                $sessaoPrincipalId,
                $mensalista1Id,
                'SIM',
                $this->organizadorId,
                'MSG_M1_SIM'
            );
            if ($r1['intencao_atual'] !== 'sim' || $r1['situacao_vaga'] !== 'vaga_reservada') {
                throw new Exception("Mensalista 1 com SIM deveria ter situacao_vaga = 'vaga_reservada'.");
            }

            // Mensalista 2 responde DEPOIS -> aguardando_confirmacao_tardia
            $r2 = $this->queueService->recordParticipantIntent(
                $this->racha1Id,
                $sessaoPrincipalId,
                $mensalista2Id,
                'DEPOIS',
                $this->organizadorId,
                'MSG_M2_DEPOIS'
            );
            if ($r2['intencao_atual'] !== 'depois' || $r2['situacao_vaga'] !== 'aguardando_confirmacao_tardia') {
                throw new Exception("Mensalista 2 com DEPOIS deveria ficar em 'aguardando_confirmacao_tardia'.");
            }

            // Mensalista 3 permanece sem resposta ('sem_resposta' / 'aguardando_resposta')
            $status = $this->queueService->getSessionQueueAndConvocationStatus($this->racha1Id, $sessaoPrincipalId);
            if ($status['resumo']['mensalistas_ativos_reserva'] !== 3) {
                throw new Exception("Mensalistas sem resposta ou com DEPOIS não podem perder sua reserva sem regra de prazo!");
            }

            // Confirma que racha_sessao_presencas permanece 100% vazia (SIM no WhatsApp != presença em quadra)
            $cntPres = (int)$this->pdo->query("SELECT COUNT(*) FROM racha_sessao_presencas WHERE sessao_id = {$sessaoPrincipalId}")->fetchColumn();
            if ($cntPres !== 0) {
                throw new Exception("Responder SIM/DEPOIS na convocação gravou indevidamente em racha_sessao_presencas!");
            }
        });

        // =====================================================================
        // TESTE 7: Entrada de avulsos na fila pela ordem de recebimento (FIFO)
        // =====================================================================
        $this->assert("7. Entrada de avulsos na fila de espera pela ordem estrita de recebimento", function () use (
            $sessaoPrincipalId, $avulso1Id, $avulso2Id, $avulso3Id
        ) {
            // Avulso 2 responde SIM primeiro -> ordem_fila = 1
            $a2 = $this->queueService->recordParticipantIntent($this->racha1Id, $sessaoPrincipalId, $avulso2Id, 'SIM', $this->organizadorId, 'MSG_A2_SIM');
            // Avulso 1 responde SIM em segundo -> ordem_fila = 2
            $a1 = $this->queueService->recordParticipantIntent($this->racha1Id, $sessaoPrincipalId, $avulso1Id, 'SIM', $this->organizadorId, 'MSG_A1_SIM');
            // Avulso 3 responde SIM em terceiro -> ordem_fila = 3
            $a3 = $this->queueService->recordParticipantIntent($this->racha1Id, $sessaoPrincipalId, $avulso3Id, 'SIM', $this->organizadorId, 'MSG_A3_SIM');

            if ($a2['situacao_vaga'] !== 'fila_espera' || $a2['ordem_fila'] !== 1) {
                throw new Exception("Avulso 2 deveria estar na fila_espera com ordem_fila = 1: " . json_encode($a2));
            }
            if ($a1['situacao_vaga'] !== 'fila_espera' || $a1['ordem_fila'] !== 2) {
                throw new Exception("Avulso 1 deveria estar na fila_espera com ordem_fila = 2: " . json_encode($a1));
            }
            if ($a3['situacao_vaga'] !== 'fila_espera' || $a3['ordem_fila'] !== 3) {
                throw new Exception("Avulso 3 deveria estar na fila_espera com ordem_fila = 3: " . json_encode($a3));
            }
        });

        // =====================================================================
        // TESTE 8: Desistência de mensalista abrindo uma vaga
        // =====================================================================
        $desistenciaM2Result = null;
        $this->assert("8. Desistência de mensalista (NÃO) abrindo uma vaga na sessão", function () use (
            $sessaoPrincipalId, $mensalista2Id, &$desistenciaM2Result
        ) {
            $desistenciaM2Result = $this->queueService->recordParticipantIntent(
                $this->racha1Id,
                $sessaoPrincipalId,
                $mensalista2Id,
                'NÃO',
                $this->organizadorId,
                'MSG_M2_NAO'
            );

            if ($desistenciaM2Result['situacao_vaga'] !== 'vaga_liberada' || $desistenciaM2Result['vaga_liberada'] !== true) {
                throw new Exception("Mensalista 2 deveria ter liberado sua vaga ('vaga_liberada').");
            }
        });

        // =====================================================================
        // TESTE 9: Promoção automática do primeiro avulso da fila
        // =====================================================================
        $this->assert("9. Promoção automática do 1º avulso elegível da fila ao liberar vaga", function () use (
            $mensalista2Id, $avulso2Id, &$desistenciaM2Result
        ) {
            $prom = $desistenciaM2Result['promocao_automatica'] ?? null;
            if (!is_array($prom) || $prom['promovido'] !== true || (int)$prom['jogador_id'] !== $avulso2Id) {
                throw new Exception("O 1º avulso da fila (Avulso 2, ordem_fila=1) deveria ter sido promovido automaticamente: " . json_encode($desistenciaM2Result));
            }

            if ((int)$prom['promovido_por_vaga_de_jogador_id'] !== $mensalista2Id || $prom['notificacao_promocao_pendente'] !== true) {
                throw new Exception("Metadados de promoção (vínculo com mensalista desistente e flag de notificação) incorretos.");
            }
        });

        // =====================================================================
        // TESTE 10: Permanência dos demais participantes na fila na ordem correta e sequência monotônica
        // =====================================================================
        $this->assert("10. Permanência dos demais avulsos na fila na ordem correta e sequência monotônica após desistência na fila", function () use (
            $sessaoPrincipalId, $mensalista3Id, $avulso1Id, $avulso3Id
        ) {
            $status = $this->queueService->getSessionQueueAndConvocationStatus($this->racha1Id, $sessaoPrincipalId);
            $fila = $status['fila_espera'];

            if (count($fila) !== 2) {
                throw new Exception("Deveriam restar exatamente 2 avulsos aguardando na fila de espera.");
            }
            if ((int)$fila[0]['jogador_id'] !== $avulso1Id || (int)$fila[0]['ordem_fila'] !== 2) {
                throw new Exception("O próximo da fila deveria ser Avulso 1 com ordem_fila = 2 preservada.");
            }
            if ((int)$fila[1]['jogador_id'] !== $avulso3Id || (int)$fila[1]['ordem_fila'] !== 3) {
                throw new Exception("O seguinte da fila deveria ser Avulso 3 com ordem_fila = 3 preservada.");
            }

            // Se Avulso 1 (que está na fila em ordem_fila = 2) desistir (NÃO), não abre vaga titular e sua ordem_fila 2 não é reutilizada!
            $desistAvulso1 = $this->queueService->recordParticipantIntent(
                $this->racha1Id,
                $sessaoPrincipalId,
                $avulso1Id,
                'NAO',
                $this->organizadorId,
                'MSG_A1_NAO'
            );
            if ($desistAvulso1['situacao_vaga'] !== 'recusou_sem_vaga' || $desistAvulso1['vaga_liberada'] !== false) {
                throw new Exception("Desistência de avulso na fila de espera não pode abrir vaga titular!");
            }

            // Cadastra e convoca um 4º avulso -> ao responder SIM, deve receber ordem_fila = 4 (nunca voltar para 2!)
            $av4 = $this->queueService->registerOrReuseParticipant($this->racha1Id, 'Diego Avulso 4', '12994445566', 'avulso_convidado', $this->organizadorId);
            $avulso4Id = (int)$av4['jogador_id'];
            $this->queueService->prepareSessionConvocation($this->racha1Id, $sessaoPrincipalId, [$avulso4Id], $this->organizadorId);
            $rAv4 = $this->queueService->recordParticipantIntent($this->racha1Id, $sessaoPrincipalId, $avulso4Id, 'SIM', $this->organizadorId, 'MSG_A4_SIM');

            if ((int)$rAv4['ordem_fila'] !== 4) {
                throw new Exception("Sequência monotônica violada: esperado ordem_fila = 4, obtido {$rAv4['ordem_fila']}");
            }

            // Agora Mensalista 3 informa NÃO -> deve pular Avulso 1 (recusou_sem_vaga) e promover Avulso 3 (ordem_fila = 3)!
            $desistM3 = $this->queueService->recordParticipantIntent($this->racha1Id, $sessaoPrincipalId, $mensalista3Id, 'NAO', $this->organizadorId, 'MSG_M3_NAO');
            if ((int)($desistM3['promocao_automatica']['jogador_id'] ?? 0) !== $avulso3Id) {
                throw new Exception("Deveria ter promovido Avulso 3 (ordem_fila = 3), mas promoveu: " . json_encode($desistM3['promocao_automatica']));
            }
        });

        // =====================================================================
        // TESTE 11: Rejeição de participante pertencente a outro racha
        // =====================================================================
        $this->assert("11. Rejeição estrita de participante ou sessão pertencente a outro racha", function () use ($sessaoPrincipalId) {
            $partRacha2 = $this->queueService->registerOrReuseParticipant(
                $this->racha2Id,
                'Jogador Exclusivo Racha 2',
                '12995556677',
                'mensalista',
                $this->organizadorId
            );
            $jogR2Id = (int)$partRacha2['jogador_id'];

            $blockedConv = false;
            try {
                $this->queueService->prepareSessionConvocation($this->racha1Id, $sessaoPrincipalId, [$jogR2Id], $this->organizadorId);
            } catch (HttpError $e) {
                if ($e->getStatusCode() === 404) {
                    $blockedConv = true;
                }
            }
            if (!$blockedConv) {
                throw new Exception("Permitiu convocar jogador do Racha 2 em sessão do Racha 1!");
            }

            $blockedCrossSession = false;
            try {
                $this->queueService->recordParticipantIntent($this->racha2Id, $sessaoPrincipalId, $jogR2Id, 'SIM', $this->organizadorId);
            } catch (HttpError $e) {
                if ($e->getStatusCode() === 404) {
                    $blockedCrossSession = true;
                }
            }
            if (!$blockedCrossSession) {
                throw new Exception("Permitiu acessar sessão do Racha 1 informando rachaId = 2!");
            }
        });

        // =====================================================================
        // TESTE 12: Impedimento de duplicidade de convocação na mesma sessão
        // =====================================================================
        $this->assert("12. Impedimento de duplicidade de convocação na mesma sessão", function () use ($sessaoPrincipalId, $mensalista1Id) {
            // 12a. Jogador já convocado anteriormente na sessão
            $dupCaught1 = false;
            try {
                $this->queueService->prepareSessionConvocation($this->racha1Id, $sessaoPrincipalId, [$mensalista1Id], $this->organizadorId);
            } catch (HttpError $e) {
                if ($e->getStatusCode() === 409) {
                    $dupCaught1 = true;
                }
            }
            if (!$dupCaught1) {
                throw new Exception("Permitiu convocar duas vezes o mesmo jogador na mesma sessão!");
            }

            // 12b. Jogador repetido no mesmo array de entrada
            $dupCaught2 = false;
            try {
                $this->queueService->prepareSessionConvocation($this->racha1Id, $sessaoPrincipalId, [4, 4], $this->organizadorId);
            } catch (HttpError $e) {
                if ($e->getStatusCode() === 409) {
                    $dupCaught2 = true;
                }
            }
            if (!$dupCaught2) {
                throw new Exception("Permitiu array com IDs duplicados na preparação da convocação!");
            }
        });

        // =====================================================================
        // TESTE 13: Idempotência de respostas e promoções repetidas
        // =====================================================================
        $this->assert("13. Idempotência de respostas (por chave_idempotencia e por estado) e de promoções repetidas", function () use (
            $sessaoPrincipalId, $mensalista2Id
        ) {
            $eventosAntes = count($this->presenceEngine->getSessionEvents($this->racha1Id, $sessaoPrincipalId));

            // 13a. Reenvio da mesma chave de mensagem 'MSG_M2_NAO'
            $repChave = $this->queueService->recordParticipantIntent(
                $this->racha1Id,
                $sessaoPrincipalId,
                $mensalista2Id,
                'NAO',
                $this->organizadorId,
                'MSG_M2_NAO'
            );
            if ($repChave['idempotente'] !== true) {
                throw new Exception("Repetição da mesma chave_idempotencia deveria retornar idempotente = true.");
            }

            // 13b. Reenvio da mesma intenção 'NAO' sem chave (idempotência por estado)
            $repEstado = $this->queueService->recordParticipantIntent(
                $this->racha1Id,
                $sessaoPrincipalId,
                $mensalista2Id,
                'NAO',
                $this->organizadorId,
                'MSG_M2_NAO_SEGUNDA_VEZ'
            );
            if ($repEstado['idempotente'] !== true || $repEstado['promocao_automatica'] !== null) {
                throw new Exception("Repetição da mesma intenção NÃO não pode abrir segunda vaga nem promover segundo avulso!");
            }

            // 13c. Chamada explícita repetida a promoteNextEligibleAvulso sem vaga aberta
            $repProm = $this->queueService->promoteNextEligibleAvulso($this->racha1Id, $sessaoPrincipalId, $this->organizadorId);
            if ($repProm['promovido'] !== false || $repProm['idempotente'] !== true) {
                throw new Exception("promoteNextEligibleAvulso sem vaga aberta deveria ser no-op idempotente.");
            }

            $eventosDepois = count($this->presenceEngine->getSessionEvents($this->racha1Id, $sessaoPrincipalId));
            if ($eventosDepois !== $eventosAntes) {
                throw new Exception("Operações idempotentes duplicaram eventos em racha_sessao_eventos ({$eventosAntes} -> {$eventosDepois})!");
            }
        });

        // =====================================================================
        // TESTE 14: Integridade dos eventos de auditoria e respeito às triggers append-only
        // =====================================================================
        $this->assert("14. Integridade da trilha de auditoria e bloqueio append-only (sem método público de escrita)", function () use ($sessaoPrincipalId) {
            // Verifica que RachaQueueService NÃO expõe método público para gravar eventos arbitrários
            $ref = new ReflectionClass(RachaQueueService::class);
            foreach ($ref->getMethods(ReflectionMethod::IS_PUBLIC) as $m) {
                if (stripos($m->getName(), 'record') !== false && stripos($m->getName(), 'Event') !== false) {
                    throw new Exception("RachaQueueService expôs método público de evento indevido: {$m->getName()}");
                }
            }

            $events = $this->presenceEngine->getSessionEvents($this->racha1Id, $sessaoPrincipalId);
            $tiposPresentes = array_unique(array_column($events, 'tipo_evento'));
            foreach (['preparacao_convocacao', 'intencao_recebida', 'entrada_fila_espera', 'recusa_convocacao', 'promocao_fila_espera'] as $expectedType) {
                if (!in_array($expectedType, $tiposPresentes, true)) {
                    throw new Exception("Tipo de evento '{$expectedType}' não foi registrado na trilha de auditoria!");
                }
            }

            // Verifica bloqueio de UPDATE e DELETE na trilha de auditoria pela conexão de runtime
            $blockedUp = false;
            try {
                $this->pdo->exec("UPDATE racha_sessao_eventos SET motivo = 'Fraude' WHERE sessao_id = {$sessaoPrincipalId}");
            } catch (PDOException $e) {
                $blockedUp = true;
            }
            $blockedDel = false;
            try {
                $this->pdo->exec("DELETE FROM racha_sessao_eventos WHERE sessao_id = {$sessaoPrincipalId}");
            } catch (PDOException $e) {
                $blockedDel = true;
            }

            if (!$blockedUp || !$blockedDel) {
                throw new Exception("Falha na proteção append-only de racha_sessao_eventos!");
            }
        });

        // =====================================================================
        // TESTE 15: Rollback integral quando a gravação de um evento falhar
        // =====================================================================
        $this->assert("15. Rollback atômico integral quando a gravação de evento de auditoria falha no meio da transação", function () use (
            $sessaoPrincipalId
        ) {
            $av5 = $this->queueService->registerOrReuseParticipant($this->racha1Id, 'Thiago Avulso Rollback', '12996667788', 'avulso_convidado', $this->organizadorId);
            $av5Id = (int)$av5['jogador_id'];
            $this->queueService->prepareSessionConvocation($this->racha1Id, $sessaoPrincipalId, [$av5Id], $this->organizadorId);

            $seqAntes = (int)$this->pdo->query("SELECT ultimo_sequencial_fila FROM racha_sessao_fila_contadores WHERE sessao_id = {$sessaoPrincipalId}")->fetchColumn();

            $faultPdo = new FaultInjectingQueuePdo();
            $faultPdo->failOnEventInsertNumber = 2; // Falha exatamente no 2º evento ('entrada_fila_espera') após 'intencao_recebida' e UPDATE da fila
            $faultService = new RachaQueueService($faultPdo);

            $failedAsExpected = false;
            try {
                $faultService->recordParticipantIntent($this->racha1Id, $sessaoPrincipalId, $av5Id, 'SIM', $this->organizadorId, 'MSG_AV5_FAIL');
            } catch (RuntimeException $e) {
                if (strpos($e->getMessage(), 'FALHA SIMULADA DE AUDITORIA') !== false) {
                    $failedAsExpected = true;
                }
            }

            if (!$failedAsExpected) {
                throw new Exception("A falha simulada de auditoria não foi disparada!");
            }

            // Verifica que o contador monotônico e a linha de convocação sofreram rollback completo!
            $seqDepois = (int)$this->pdo->query("SELECT ultimo_sequencial_fila FROM racha_sessao_fila_contadores WHERE sessao_id = {$sessaoPrincipalId}")->fetchColumn();
            if ($seqDepois !== $seqAntes) {
                throw new Exception("O contador da fila não sofreu rollback ({$seqAntes} -> {$seqDepois})!");
            }

            $stmtConv = $this->pdo->prepare("SELECT intencao_atual, situacao_vaga, ordem_fila FROM racha_sessao_convocacoes WHERE sessao_id = ? AND jogador_id = ?");
            $stmtConv->execute([$sessaoPrincipalId, $av5Id]);
            $rowConv = $stmtConv->fetch(PDO::FETCH_ASSOC);

            if ($rowConv['intencao_atual'] !== 'sem_resposta' || $rowConv['situacao_vaga'] !== 'aguardando_resposta' || $rowConv['ordem_fila'] !== null) {
                throw new Exception("O estado da convocação não sofreu rollback após falha na gravação do evento: " . json_encode($rowConv));
            }
        });

        // =====================================================================
        // TESTE 16: Concorrência real — Duas confirmações SIM simultâneas disputando posições na fila
        // =====================================================================
        $this->assert("16. Concorrência real (proc_open): Duas confirmações SIM simultâneas disputando posições na fila", function () {
            $sessConc = $this->presenceEngine->createSession($this->racha1Id, '2026-11-03', '20:00', '22:00', $this->organizadorId);
            $sessConcId = (int)$sessConc['id'];

            $avA = $this->queueService->registerOrReuseParticipant($this->racha1Id, 'Avulso Concorrente Fila A', '12997000001', 'avulso_recorrente', $this->organizadorId);
            $avB = $this->queueService->registerOrReuseParticipant($this->racha1Id, 'Avulso Concorrente Fila B', '12997000002', 'avulso_recorrente', $this->organizadorId);
            $idA = (int)$avA['jogador_id'];
            $idB = (int)$avB['jogador_id'];

            // Convoca 1 mensalista (que mantém sua reserva) + os 2 avulsos
            $this->queueService->prepareSessionConvocation($this->racha1Id, $sessConcId, [1, $idA, $idB], $this->organizadorId);

            [$resA, $resB] = $this->runConcurrentWorkersWithSessionBarrier(
                $this->racha1Id,
                $sessConcId,
                [
                    'action' => 'recordParticipantIntent',
                    'args'   => [
                        'racha_id'          => $this->racha1Id,
                        'sessao_id'         => $sessConcId,
                        'jogador_id'        => $idA,
                        'intencao'          => 'SIM',
                        'usuario_id'        => $this->organizadorId,
                        'chave_idempotencia'=> 'CONC_FILA_A'
                    ]
                ],
                [
                    'action' => 'recordParticipantIntent',
                    'args'   => [
                        'racha_id'          => $this->racha1Id,
                        'sessao_id'         => $sessConcId,
                        'jogador_id'        => $idB,
                        'intencao'          => 'SIM',
                        'usuario_id'        => $this->organizadorId,
                        'chave_idempotencia'=> 'CONC_FILA_B'
                    ]
                ]
            );

            if ((int)$resA['pid'] === (int)$resB['pid'] || (int)$resA['connection_id'] === (int)$resB['connection_id']) {
                throw new Exception("Workers não executaram em processos/conexões independentes!");
            }
            if (!$resA['success'] || !$resB['success']) {
                throw new Exception("Ambos os avulsos deveriam entrar na fila com sucesso: A=" . json_encode($resA) . " | B=" . json_encode($resB));
            }

            $ordens = [(int)$resA['result']['ordem_fila'], (int)$resB['result']['ordem_fila']];
            sort($ordens);
            if ($ordens !== [1, 2]) {
                throw new Exception("As posições atribuídas na fila sob concorrência deveriam ser estritamente [1, 2], obtido: " . json_encode($ordens));
            }

            echo sprintf(
                "\n      [EVIDÊNCIA CONCORRÊNCIA FILA] WorkerA(PID=%d, Conn=%d, Start=%.1f, End=%.1f -> ordem_fila=%d, sit=%s) | WorkerB(PID=%d, Conn=%d, Start=%.1f, End=%.1f -> ordem_fila=%d, sit=%s)\n   ",
                $resA['pid'], $resA['connection_id'], $resA['started_at_ms'], $resA['finished_at_ms'], $resA['result']['ordem_fila'], $resA['result']['situacao_vaga'],
                $resB['pid'], $resB['connection_id'], $resB['started_at_ms'], $resB['finished_at_ms'], $resB['result']['ordem_fila'], $resB['result']['situacao_vaga']
            );
        });

        // =====================================================================
        // TESTE 17: Concorrência real — Duas tentativas simultâneas de ocupar a mesma vaga única
        // =====================================================================
        $this->assert("17. Concorrência real (proc_open): Duas confirmações SIM simultâneas disputando 1 única vaga aberta", function () {
            $sessVaga = $this->presenceEngine->createSession($this->racha1Id, '2026-11-10', '20:00', '22:00', $this->organizadorId);
            $sessVagaId = (int)$sessVaga['id'];

            $avC = $this->queueService->registerOrReuseParticipant($this->racha1Id, 'Avulso Disputa Vaga C', '12997000003', 'avulso_recorrente', $this->organizadorId);
            $avD = $this->queueService->registerOrReuseParticipant($this->racha1Id, 'Avulso Disputa Vaga D', '12997000004', 'avulso_recorrente', $this->organizadorId);
            $idC = (int)$avC['jogador_id'];
            $idD = (int)$avD['jogador_id'];

            // Convoca Mensalista 1 (que vai desistir e abrir 1 única vaga), Mensalista 2 (que mantém reserva) e os 2 Avulsos C e D
            $this->queueService->prepareSessionConvocation($this->racha1Id, $sessVagaId, [1, 2, $idC, $idD], $this->organizadorId);

            // Mensalista 1 informa NÃO antes dos avulsos -> deixa exatamente 1 vaga aberta na sessão!
            $this->queueService->recordParticipantIntent($this->racha1Id, $sessVagaId, 1, 'NAO', $this->organizadorId, 'MSG_ABRE_1_VAGA');

            // Agora Avulso C e Avulso D enviam SIM simultaneamente em processos e conexões PDO independentes disputando a única vaga aberta!
            [$resC, $resD] = $this->runConcurrentWorkersWithSessionBarrier(
                $this->racha1Id,
                $sessVagaId,
                [
                    'action' => 'recordParticipantIntent',
                    'args'   => [
                        'racha_id'          => $this->racha1Id,
                        'sessao_id'         => $sessVagaId,
                        'jogador_id'        => $idC,
                        'intencao'          => 'SIM',
                        'usuario_id'        => $this->organizadorId,
                        'chave_idempotencia'=> 'CONC_VAGA_C'
                    ]
                ],
                [
                    'action' => 'recordParticipantIntent',
                    'args'   => [
                        'racha_id'          => $this->racha1Id,
                        'sessao_id'         => $sessVagaId,
                        'jogador_id'        => $idD,
                        'intencao'          => 'SIM',
                        'usuario_id'        => $this->organizadorId,
                        'chave_idempotencia'=> 'CONC_VAGA_D'
                    ]
                ]
            );

            if ((int)$resC['pid'] === (int)$resD['pid'] || (int)$resC['connection_id'] === (int)$resD['connection_id']) {
                throw new Exception("Workers não executaram em processos/conexões independentes!");
            }
            if (!$resC['success'] || !$resD['success']) {
                throw new Exception("Falha inesperada na disputa concorrente pela vaga: C=" . json_encode($resC) . " | D=" . json_encode($resD));
            }

            // Verifica no banco que EXATAMENTE 1 avulso ficou como 'promovido_titular' (ordem_fila=1) e o outro ficou em 'fila_espera' (ordem_fila=2)!
            $statusVaga = $this->queueService->getSessionQueueAndConvocationStatus($this->racha1Id, $sessVagaId);
            if ($statusVaga['resumo']['avulsos_promovidos'] !== 1) {
                throw new Exception("VIOLAÇÃO DE VAGA: Esperado exatamente 1 avulso promovido para a única vaga aberta, obtido {$statusVaga['resumo']['avulsos_promovidos']}!");
            }
            if ($statusVaga['resumo']['avulsos_em_fila_espera'] !== 1) {
                throw new Exception("O segundo avulso deveria permanecer aguardando na fila de espera!");
            }
            if ($statusVaga['resumo']['vagas_abertas_para_fila'] !== 0) {
                throw new Exception("Não deveria restar nenhuma vaga aberta após a ocupação!");
            }

            echo sprintf(
                "\n      [EVIDÊNCIA DISPUTA VAGA SIM] WorkerC(PID=%d, Conn=%d, Start=%.1f, End=%.1f -> ordem=%d, sit=%s) | WorkerD(PID=%d, Conn=%d, Start=%.1f, End=%.1f -> ordem=%d, sit=%s)\n   ",
                $resC['pid'], $resC['connection_id'], $resC['started_at_ms'], $resC['finished_at_ms'], $resC['result']['ordem_fila'], $resC['result']['situacao_vaga'],
                $resD['pid'], $resD['connection_id'], $resD['started_at_ms'], $resD['finished_at_ms'], $resD['result']['ordem_fila'], $resD['result']['situacao_vaga']
            );
        });

        // =====================================================================
        // TESTE 18: Concorrência real — Desistência de mensalista vs Promoção explícita concorrente
        // =====================================================================
        $this->assert("18. Concorrência real (proc_open): Desistência de mensalista simultânea a promoteNextEligibleAvulso (consome apenas 1 vaga)", function () {
            $sessProm = $this->presenceEngine->createSession($this->racha1Id, '2026-11-17', '20:00', '22:00', $this->organizadorId);
            $sessPromId = (int)$sessProm['id'];

            $avE = $this->queueService->registerOrReuseParticipant($this->racha1Id, 'Avulso Disputa Prom E', '12997000005', 'avulso_recorrente', $this->organizadorId);
            $avF = $this->queueService->registerOrReuseParticipant($this->racha1Id, 'Avulso Disputa Prom F', '12997000006', 'avulso_recorrente', $this->organizadorId);
            $idE = (int)$avE['jogador_id'];
            $idF = (int)$avF['jogador_id'];

            // Convoca Mensalistas 1 e 2 + Avulsos E e F
            $this->queueService->prepareSessionConvocation($this->racha1Id, $sessPromId, [1, 2, $idE, $idF], $this->organizadorId);

            // Avulsos E e F confirmam SIM e ficam na fila de espera (ordens 1 e 2)
            $this->queueService->recordParticipantIntent($this->racha1Id, $sessPromId, $idE, 'SIM', $this->organizadorId, 'MSG_E_SIM');
            $this->queueService->recordParticipantIntent($this->racha1Id, $sessPromId, $idF, 'SIM', $this->organizadorId, 'MSG_F_SIM');

            // Dispara simultaneamente: Worker 1 registra NÃO do Mensalista 1 (que abre 1 vaga e auto-promove)
            // e Worker 2 chama promoteNextEligibleAvulso na mesma sessão!
            // Apenas 1 vaga foi aberta, portanto APENAS Avulso E (ordem 1) pode ser promovido; Avulso F (ordem 2) deve continuar em fila_espera!
            [$resW1, $resW2] = $this->runConcurrentWorkersWithSessionBarrier(
                $this->racha1Id,
                $sessPromId,
                [
                    'action' => 'recordParticipantIntent',
                    'args'   => [
                        'racha_id'          => $this->racha1Id,
                        'sessao_id'         => $sessPromId,
                        'jogador_id'        => 1,
                        'intencao'          => 'NAO',
                        'usuario_id'        => $this->organizadorId,
                        'chave_idempotencia'=> 'CONC_M1_NAO_PROM'
                    ]
                ],
                [
                    'action' => 'promoteNextEligibleAvulso',
                    'args'   => [
                        'racha_id'   => $this->racha1Id,
                        'sessao_id'  => $sessPromId,
                        'usuario_id' => $this->organizadorId
                    ]
                ]
            );

            if ((int)$resW1['pid'] === (int)$resW2['pid'] || (int)$resW1['connection_id'] === (int)$resW2['connection_id']) {
                throw new Exception("Workers não executaram em processos/conexões independentes!");
            }

            $statusFinal = $this->queueService->getSessionQueueAndConvocationStatus($this->racha1Id, $sessPromId);
            if ($statusFinal['resumo']['avulsos_promovidos'] !== 1) {
                throw new Exception("VIOLAÇÃO DE VAGA: Esperado exatamente 1 avulso promovido, obtido {$statusFinal['resumo']['avulsos_promovidos']}!");
            }
            if ((int)$statusFinal['fila_espera'][0]['jogador_id'] !== $idF || (int)$statusFinal['fila_espera'][0]['ordem_fila'] !== 2) {
                throw new Exception("Avulso F (ordem 2) deveria permanecer aguardando na fila de espera!");
            }

            echo sprintf(
                "\n      [EVIDÊNCIA PROMOÇÃO IDEMPOTENTE CONCORRENTE] W1_NAO(PID=%d, Conn=%d, Promoveu=#%d) | W2_Promote(PID=%d, Conn=%d, promovido=%s, idempotente=%s)\n   ",
                $resW1['pid'], $resW1['connection_id'], (int)($resW1['result']['promocao_automatica']['jogador_id'] ?? 0),
                $resW2['pid'], $resW2['connection_id'],
                !empty($resW2['result']['promovido']) ? 'true' : 'false',
                !empty($resW2['result']['idempotente']) ? 'true' : 'false'
            );
        });

        // =====================================================================
        // TESTES DA ETAPA 3C.1.1: AUTORIA DOS EVENTOS AUTOMÁTICOS DO WHATSAPP
        // =====================================================================

        // =====================================================================
        // TESTE 19: Evento automático de intenção por WhatsApp sem usuário humano
        // =====================================================================
        $sessaoAutoId = 0;
        $mensalistaSemLoginId = 0;
        $avulsoSemLogin1Id = 0;
        $avulsoSemLogin2Id = 0;

        $this->assert("19. [Etapa 3C.1.1] Evento automático de intenção por WhatsApp (SIM/DEPOIS) sem usuário humano (tipo_ator='jogador_whatsapp', usuario_id=NULL)", function () use (
            &$sessaoAutoId, &$mensalistaSemLoginId, &$avulsoSemLogin1Id, &$avulsoSemLogin2Id
        ) {
            $sess = $this->presenceEngine->createSession($this->racha1Id, '2026-11-24', '20:00', '22:00', $this->organizadorId);
            $sessaoAutoId = (int)$sess['id'];

            // Cadastra mensalista e avulsos que NÃO possuem conta de login em `usuarios` (jogadores.usuario_id = NULL)
            $mSemLogin = $this->queueService->registerOrReuseParticipant(
                $this->racha1Id,
                'Roberto Mensalista Sem Login',
                '(12) 98811-0001',
                'mensalista',
                $this->organizadorId
            );
            $avSemLogin1 = $this->queueService->registerOrReuseParticipant(
                $this->racha1Id,
                'Henrique Avulso Sem Login 1',
                '(12) 98811-0002',
                'avulso_recorrente',
                $this->organizadorId
            );
            $avSemLogin2 = $this->queueService->registerOrReuseParticipant(
                $this->racha1Id,
                'Leandro Avulso Sem Login 2',
                '(12) 98811-0003',
                'avulso_convidado',
                $this->organizadorId
            );

            $mensalistaSemLoginId = (int)$mSemLogin['jogador_id'];
            $avulsoSemLogin1Id = (int)$avSemLogin1['jogador_id'];
            $avulsoSemLogin2Id = (int)$avSemLogin2['jogador_id'];

            // Confirma que nenhum dos três possui conta em `usuarios`
            $stmtUsr = $this->pdo->prepare("SELECT usuario_id FROM jogadores WHERE id IN (?, ?, ?)");
            $stmtUsr->execute([$mensalistaSemLoginId, $avulsoSemLogin1Id, $avulsoSemLogin2Id]);
            foreach ($stmtUsr->fetchAll(PDO::FETCH_COLUMN) as $uid) {
                if ($uid !== null) {
                    throw new Exception("Jogador de teste deveria ter usuario_id NULL em jogadores!");
                }
            }

            // Organizador prepara a convocação (ação humana com usuario_id válido)
            $this->queueService->prepareSessionConvocation(
                $this->racha1Id,
                $sessaoAutoId,
                [$mensalistaSemLoginId, 2, $avulsoSemLogin1Id, $avulsoSemLogin2Id],
                $this->organizadorId
            );

            // Jogador avulso sem conta responde "SIM" pelo WhatsApp quando nenhum organizador está logado (usuario_id = NULL)
            $resAv1 = $this->queueService->recordWhatsAppParticipantIntentByPhone(
                $this->racha1Id,
                $sessaoAutoId,
                '12988110002', // variação sem DDI 55
                'SIM',
                'WAMID_AUTO_AV1_SIM_001'
            );

            if ($resAv1['tipo_ator'] !== 'jogador_whatsapp' || $resAv1['usuario_id'] !== null) {
                throw new Exception("Resposta automática do WhatsApp deveria ter tipo_ator='jogador_whatsapp' e usuario_id=NULL!");
            }
            if ($resAv1['situacao_vaga'] !== 'fila_espera' || $resAv1['ordem_fila'] !== 1) {
                throw new Exception("Avulso 1 deveria entrar em fila_espera na ordem 1!");
            }

            // Avulso 2 também responde "SIM" via WhatsApp sem usuario_id
            $resAv2 = $this->queueService->recordWhatsAppParticipantIntentByPhone(
                $this->racha1Id,
                $sessaoAutoId,
                '551288110003', // variação antiga de 12 dígitos sem o 9
                'SIM',
                'WAMID_AUTO_AV2_SIM_002'
            );
            if ($resAv2['ordem_fila'] !== 2 || $resAv2['usuario_id'] !== null) {
                throw new Exception("Avulso 2 deveria entrar em fila_espera na ordem 2 com usuario_id=NULL!");
            }

            // Verifica os eventos gravados em `racha_sessao_eventos` para o Avulso 1
            $evtsAv1 = $this->presenceEngine->getSessionEvents($this->racha1Id, $sessaoAutoId, null, $avulsoSemLogin1Id);
            if (count($evtsAv1) < 2) {
                throw new Exception("Esperados eventos 'intencao_recebida' e 'entrada_fila_espera' para o Avulso 1!");
            }
            foreach ($evtsAv1 as $ev) {
                if ($ev['tipo_ator'] !== 'jogador_whatsapp') {
                    throw new Exception("Evento do Avulso 1 deveria ter tipo_ator='jogador_whatsapp', obtido: {$ev['tipo_ator']}");
                }
                if ($ev['usuario_id'] !== null) {
                    throw new Exception("Evento do Avulso 1 NÃO pode ter usuario_id humano (#{$ev['usuario_id']})!");
                }
                if ((int)$ev['jogador_id'] !== $avulsoSemLogin1Id) {
                    throw new Exception("Evento deveria preservar jogador_id={$avulsoSemLogin1Id}!");
                }
                if ($ev['mensagem_externa_id'] !== 'WAMID_AUTO_AV1_SIM_001') {
                    throw new Exception("Evento deveria preservar mensagem_externa_id='WAMID_AUTO_AV1_SIM_001'!");
                }
            }
        });

        // =====================================================================
        // TESTE 20: Evento automático do sistema sem usuário humano (NAO + promoção automática)
        // =====================================================================
        $this->assert("20. [Etapa 3C.1.1] Evento automático do sistema sem usuário humano (Mensalista responde NAO no WhatsApp -> promoção gravada com tipo_ator='sistema' e usuario_id=NULL)", function () use (
            &$sessaoAutoId, &$mensalistaSemLoginId, &$avulsoSemLogin1Id
        ) {
            // Mensalista sem conta responde "NAO" via WhatsApp (sem organizador conectado)
            $resNao = $this->queueService->recordWhatsAppParticipantIntentByPhone(
                $this->racha1Id,
                $sessaoAutoId,
                '5512988110001',
                'NAO',
                'WAMID_AUTO_M1_NAO_003'
            );

            if (!$resNao['vaga_liberada'] || $resNao['promocao_automatica'] === null) {
                throw new Exception("Desistência do mensalista deveria liberar vaga e promover automaticamente o 1º avulso da fila!");
            }

            $prom = $resNao['promocao_automatica'];
            if ((int)$prom['jogador_id'] !== $avulsoSemLogin1Id) {
                throw new Exception("O promovido deveria ser o 1º elegível da fila (#{$avulsoSemLogin1Id})!");
            }
            if ($prom['tipo_ator_evento'] !== 'sistema' || $prom['usuario_id_evento'] !== null) {
                throw new Exception("A promoção automática deveria retornar tipo_ator_evento='sistema' e usuario_id_evento=NULL!");
            }

            // Inspeciona na tabela `racha_sessao_eventos` os eventos gerados na mesma transação
            $evtsRecusa = $this->presenceEngine->getSessionEvents($this->racha1Id, $sessaoAutoId, 'recusa_convocacao', $mensalistaSemLoginId);
            if (count($evtsRecusa) !== 1) {
                throw new Exception("Esperado 1 evento 'recusa_convocacao' para o mensalista!");
            }
            $evRec = $evtsRecusa[0];
            if ($evRec['tipo_ator'] !== 'jogador_whatsapp' || $evRec['usuario_id'] !== null || $evRec['mensagem_externa_id'] !== 'WAMID_AUTO_M1_NAO_003') {
                throw new Exception("Evento de recusa com autoria incorreta: " . json_encode($evRec));
            }

            $evtsProm = $this->presenceEngine->getSessionEvents($this->racha1Id, $sessaoAutoId, 'promocao_fila_espera');
            if (count($evtsProm) !== 1) {
                throw new Exception("Esperado exatamente 1 evento 'promocao_fila_espera'!");
            }
            $evProm = $evtsProm[0];
            if ($evProm['tipo_ator'] !== 'sistema') {
                throw new Exception("Evento de promoção automática deveria ter tipo_ator='sistema', obtido: {$evProm['tipo_ator']}");
            }
            if ($evProm['usuario_id'] !== null) {
                throw new Exception("Evento de promoção automática NÃO pode ter usuario_id humano (#{$evProm['usuario_id']})!");
            }
            if ((int)$evProm['jogador_id'] !== $avulsoSemLogin1Id || (int)$evProm['substituiu_jogador_id'] !== $mensalistaSemLoginId) {
                throw new Exception("Evento de promoção automática deveria referenciar o promovido (#{$avulsoSemLogin1Id}) e a vaga liberada (#{$mensalistaSemLoginId})!");
            }
            if ((int)($evProm['detalhes_decoded']['evento_origem_id'] ?? 0) !== (int)$evRec['id']) {
                throw new Exception("Evento de promoção automática deveria referenciar o evento_origem_id da desistência (#{$evRec['id']})!");
            }
        });

        // =====================================================================
        // TESTE 21: Ações humanas continuam exigindo usuario_id válido (e eventos automáticos rejeitam usuario_id humano)
        // =====================================================================
        $this->assert("21. [Etapa 3C.1.1] Ações humanas exigem usuario_id válido; ações automáticas rejeitam usuario_id humano fictício (app + CHECK constraint no banco)", function () use (
            &$sessaoAutoId, &$avulsoSemLogin2Id
        ) {
            // 21a. Ação humana no RachaQueueService sem usuario_id (null) -> deve falhar com HTTP 400
            $blockedNullHuman = false;
            try {
                $this->queueService->recordParticipantIntent(
                    $this->racha1Id,
                    $sessaoAutoId,
                    $avulsoSemLogin2Id,
                    'NAO',
                    null, // proibido para tipo_ator = 'usuario'
                    'MSG_HUMANA_SEM_USER',
                    null,
                    'usuario'
                );
            } catch (HttpError $e) {
                if ($e->getStatusCode() === 400) {
                    $blockedNullHuman = true;
                }
            }
            if (!$blockedNullHuman) {
                throw new Exception("Ação humana ('usuario') sem usuario_id deveria ser bloqueada!");
            }

            // 21b. Ação humana no PresenceEngine com usuario_id inválido (999999) -> deve falhar com HTTP 400
            $blockedInvalidHuman = false;
            try {
                $this->presenceEngine->homologateSession($this->racha1Id, $sessaoAutoId, 999999, 'Tentativa sem usuário válido');
            } catch (HttpError $e) {
                if ($e->getStatusCode() === 400) {
                    $blockedInvalidHuman = true;
                }
            }
            if (!$blockedInvalidHuman) {
                throw new Exception("Homologação humana com usuario_id inexistente deveria ser bloqueada!");
            }

            // 21c. Evento automático 'jogador_whatsapp' tentando passar usuario_id = 1 (fallback artificial) -> bloqueado!
            $blockedFakeUserOnWhatsapp = false;
            try {
                $this->queueService->recordParticipantIntent(
                    $this->racha1Id,
                    $sessaoAutoId,
                    $avulsoSemLogin2Id,
                    'NAO',
                    1, // proibido atribuir resposta automática ao usuário #1!
                    'MSG_FAKE_USER_1',
                    null,
                    'jogador_whatsapp'
                );
            } catch (HttpError $e) {
                if ($e->getStatusCode() === 400) {
                    $blockedFakeUserOnWhatsapp = true;
                }
            }
            if (!$blockedFakeUserOnWhatsapp) {
                throw new Exception("Evento 'jogador_whatsapp' deveria rejeitar atribuição a usuario_id humano (#1)!");
            }

            // 21d. Evento automático 'sistema' tentando passar usuario_id = 1 -> bloqueado!
            $blockedFakeUserOnSistema = false;
            try {
                $this->queueService->promoteNextEligibleAvulso(
                    $this->racha1Id,
                    $sessaoAutoId,
                    1, // proibido para tipo_ator = 'sistema'
                    null,
                    'sistema'
                );
            } catch (HttpError $e) {
                if ($e->getStatusCode() === 400) {
                    $blockedFakeUserOnSistema = true;
                }
            }
            if (!$blockedFakeUserOnSistema) {
                throw new Exception("Promoção 'sistema' deveria rejeitar atribuição a usuario_id humano (#1)!");
            }

            // 21e. Verifica a CHECK constraint `chk_rse_autoria_coerente` diretamente no banco de dados!
            $blockedDbCheck = false;
            try {
                $this->pdo->exec("
                    INSERT INTO racha_sessao_eventos (sessao_id, racha_id, tipo_evento, tipo_ator, usuario_id, jogador_id, motivo)
                    VALUES ({$sessaoAutoId}, {$this->racha1Id}, 'intencao_recebida', 'usuario', NULL, {$avulsoSemLogin2Id}, 'Violacao CHECK')
                ");
            } catch (PDOException $e) {
                $blockedDbCheck = true;
            }
            if (!$blockedDbCheck) {
                throw new Exception("O banco de dados permitiu inserir tipo_ator='usuario' com usuario_id=NULL!");
            }
        });

        // =====================================================================
        // TESTE 22: Identificação ambígua de jogador por telefone ou nome de exibição do WhatsApp
        // =====================================================================
        $this->assert("22. [Etapa 3C.1.1] Identificação ambígua de jogador por telefone ou nome de exibição do WhatsApp bloqueada (HTTP 409)", function () use (
            &$sessaoAutoId
        ) {
            // Insere no banco dois jogadores distintos que compartilham o mesmo telefone legado (simulando dado pré-existente ambíguo)
            $this->pdo->exec("
                INSERT INTO jogadores (nome, role, posicao, whatsapp, usuario_id)
                VALUES ('Marcos Ambiguo Pai', 'player', 'linha', '5512977776666', NULL),
                       ('Marcos Ambiguo Filho', 'player', 'linha', '5512977776666', NULL)
            ");
            $idPai = (int)$this->pdo->query("SELECT id FROM jogadores WHERE nome = 'Marcos Ambiguo Pai'")->fetchColumn();

            // Mesmo que um deles esteja convocado e o webhook informe o pushName idêntico ('Marcos Ambiguo Pai'),
            // o sistema NÃO pode confiar no telefone ambíguo nem no nome de exibição do WhatsApp!
            $this->pdo->exec("
                INSERT INTO racha_participantes (racha_id, jogador_id, tipo_participacao, ativo)
                VALUES ({$this->racha1Id}, {$idPai}, 'avulso_convidado', 1)
            ");
            $this->pdo->exec("
                INSERT INTO racha_sessao_convocacoes (
                    racha_id, sessao_id, jogador_id, tipo_participacao_convocacao,
                    telefone_destino, status_envio, intencao_atual, situacao_vaga
                ) VALUES (
                    {$this->racha1Id}, {$sessaoAutoId}, {$idPai}, 'avulso_convidado',
                    '5512977776666', 'enviado', 'sem_resposta', 'aguardando_resposta'
                )
            ");

            $evCountBefore = count($this->presenceEngine->getSessionEvents($this->racha1Id, $sessaoAutoId));

            $blockedAmbiguous = false;
            try {
                $this->queueService->recordWhatsAppParticipantIntentByPhone(
                    $this->racha1Id,
                    $sessaoAutoId,
                    '5512977776666',
                    'SIM',
                    'WAMID_AMBIGUO_001',
                    'Marcos Ambiguo Pai' // pushName do WhatsApp NÃO desambigua identidade!
                );
            } catch (HttpError $e) {
                if ($e->getStatusCode() === 409) {
                    $blockedAmbiguous = true;
                }
            }

            if (!$blockedAmbiguous) {
                throw new Exception("Identificação ambígua deveria ser rejeitada com HTTP 409!");
            }

            $evCountAfter = count($this->presenceEngine->getSessionEvents($this->racha1Id, $sessaoAutoId));
            if ($evCountAfter !== $evCountBefore) {
                throw new Exception("Nenhum evento deveria ter sido gravado após rejeição de ambiguidade!");
            }
        });

        // =====================================================================
        // TESTE 23: Duplicidade de mensagem externa no fluxo automático do WhatsApp
        // =====================================================================
        $this->assert("23. [Etapa 3C.1.1] Duplicidade de mensagem externa do WhatsApp tratada de forma idempotente (sem duplicar eventos ou promoções)", function () use (
            &$sessaoAutoId
        ) {
            $evCountBefore = count($this->presenceEngine->getSessionEvents($this->racha1Id, $sessaoAutoId));
            $seqBefore = (int)$this->pdo->query("SELECT ultimo_sequencial_fila FROM racha_sessao_fila_contadores WHERE sessao_id = {$sessaoAutoId}")->fetchColumn();

            // Reenvia exatamente a mesma mensagem externa WAMID_AUTO_M1_NAO_003 já processada no Teste 20
            $dupRes = $this->queueService->recordWhatsAppParticipantIntentByPhone(
                $this->racha1Id,
                $sessaoAutoId,
                '5512988110001',
                'NAO',
                'WAMID_AUTO_M1_NAO_003'
            );

            if (!$dupRes['idempotente']) {
                throw new Exception("Mensagem externa repetida deveria retornar idempotente=true!");
            }

            $evCountAfter = count($this->presenceEngine->getSessionEvents($this->racha1Id, $sessaoAutoId));
            $seqAfter = (int)$this->pdo->query("SELECT ultimo_sequencial_fila FROM racha_sessao_fila_contadores WHERE sessao_id = {$sessaoAutoId}")->fetchColumn();

            if ($evCountAfter !== $evCountBefore || $seqAfter !== $seqBefore) {
                throw new Exception("Mensagem duplicada alterou eventos ({$evCountBefore} -> {$evCountAfter}) ou contador ({$seqBefore} -> {$seqAfter})!");
            }
        });

        // =====================================================================
        // TESTE 24: Falha no meio da transação entre desistência automática e promoção automática
        // =====================================================================
        $this->assert("24. [Etapa 3C.1.1] Rollback atômico quando ocorre falha na promoção automática após desistência via WhatsApp", function () use (
            &$sessaoAutoId, &$avulsoSemLogin2Id
        ) {
            // Na sessão $sessaoAutoId, o Mensalista #2 ainda está como 'aguardando_resposta' e o Avulso 2 (#$avulsoSemLogin2Id) está em 'fila_espera' (ordem 2).
            // Vamos simular uma falha exatamente no 3º INSERT em `racha_sessao_eventos` (que é o evento 'promocao_fila_espera' do sistema,
            // após 'intencao_recebida' e 'recusa_convocacao' do Mensalista #2).
            $faultPdo = new FaultInjectingQueuePdo();
            $faultPdo->failOnEventInsertNumber = 3;
            $faultService = new RachaQueueService($faultPdo);

            $evCountBefore = count($this->presenceEngine->getSessionEvents($this->racha1Id, $sessaoAutoId));

            $failedAsExpected = false;
            try {
                $faultService->recordParticipantIntent(
                    $this->racha1Id,
                    $sessaoAutoId,
                    2, // Mensalista 2
                    'NAO',
                    null,
                    'WAMID_M2_FAIL_MID_TX',
                    null,
                    'jogador_whatsapp'
                );
            } catch (RuntimeException $e) {
                if (strpos($e->getMessage(), 'FALHA SIMULADA DE AUDITORIA') !== false) {
                    $failedAsExpected = true;
                }
            }

            if (!$failedAsExpected) {
                throw new Exception("A falha simulada no evento de promoção automática não foi disparada!");
            }

            // Verifica que nem a desistência do Mensalista 2, nem a promoção do Avulso 2, nem os 2 primeiros eventos persistiram!
            $stmtM2 = $this->pdo->prepare("SELECT intencao_atual, situacao_vaga FROM racha_sessao_convocacoes WHERE sessao_id = ? AND jogador_id = 2");
            $stmtM2->execute([$sessaoAutoId]);
            $rowM2 = $stmtM2->fetch(PDO::FETCH_ASSOC);
            if ($rowM2['intencao_atual'] !== 'sem_resposta' || $rowM2['situacao_vaga'] !== 'aguardando_resposta') {
                throw new Exception("Desistência parcial do Mensalista 2 persistiu após falha na promoção: " . json_encode($rowM2));
            }

            $stmtAv2 = $this->pdo->prepare("SELECT situacao_vaga FROM racha_sessao_convocacoes WHERE sessao_id = ? AND jogador_id = ?");
            $stmtAv2->execute([$sessaoAutoId, $avulsoSemLogin2Id]);
            $rowAv2 = $stmtAv2->fetch(PDO::FETCH_ASSOC);
            if ($rowAv2['situacao_vaga'] !== 'fila_espera') {
                throw new Exception("Avulso 2 foi promovido indevidamente apesar da falha transacional: " . json_encode($rowAv2));
            }

            $evCountAfter = count($this->presenceEngine->getSessionEvents($this->racha1Id, $sessaoAutoId));
            if ($evCountAfter !== $evCountBefore) {
                throw new Exception("Eventos parciais persistiram após rollback ({$evCountBefore} -> {$evCountAfter})!");
            }
        });

        // =====================================================================
        // TESTE 25: Append-only e privilégios mínimos sobre eventos automáticos pós-Migration 009
        // =====================================================================
        $this->assert("25. [Etapa 3C.1.1] Triggers append-only e privilégios mínimos bloqueiam UPDATE e DELETE em eventos automáticos", function () use (
            &$sessaoAutoId
        ) {
            $blockedUpdate = false;
            try {
                $this->pdo->exec("UPDATE racha_sessao_eventos SET tipo_ator = 'usuario', usuario_id = 1 WHERE sessao_id = {$sessaoAutoId} AND tipo_ator != 'usuario'");
            } catch (PDOException $e) {
                if (
                    strpos($e->getMessage(), 'append-only') !== false
                    || strpos($e->getMessage(), 'command denied') !== false
                    || in_array((string)$e->getCode(), ['45000', '42000'], true)
                ) {
                    $blockedUpdate = true;
                }
            }

            $blockedDeleteRuntime = false;
            try {
                $this->pdo->exec("DELETE FROM racha_sessao_eventos WHERE sessao_id = {$sessaoAutoId} AND tipo_ator = 'sistema'");
            } catch (PDOException $e) {
                if (
                    strpos($e->getMessage(), 'append-only') !== false
                    || strpos($e->getMessage(), 'command denied') !== false
                    || in_array((string)$e->getCode(), ['45000', '42000'], true)
                ) {
                    $blockedDeleteRuntime = true;
                }
            }

            // Verifica também a trigger BEFORE DELETE diretamente quando há privilégio DELETE (adminPdo)
            $blockedDeleteTrigger = false;
            try {
                $this->adminPdo->exec("DELETE FROM racha_sessao_eventos WHERE sessao_id = {$sessaoAutoId} AND tipo_ator = 'sistema'");
            } catch (PDOException $e) {
                if (strpos($e->getMessage(), 'append-only') !== false || (string)$e->getCode() === '45000') {
                    $blockedDeleteTrigger = true;
                }
            }

            if (!$blockedUpdate || !$blockedDeleteRuntime || !$blockedDeleteTrigger) {
                throw new Exception("Falha no bloqueio append-only (update={$blockedUpdate}, delRuntime={$blockedDeleteRuntime}, delTrigger={$blockedDeleteTrigger})!");
            }
        });

        echo "\n====================================================================\n";
        echo " RESULTADO FINAL DA SUÍTE ETAPA 3C.1 / 3C.1.1 (test_racha_queue.php):\n";
        echo " APROVADOS: {$this->passed} | FALHAS: {$this->failed}\n";
        echo "====================================================================\n";

        if ($this->failed > 0) {
            exit(1);
        }
    }
}

$suite = new RachaQueueTestSuite();
$suite->runAll();
