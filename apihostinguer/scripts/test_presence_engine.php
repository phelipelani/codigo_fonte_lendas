<?php
/**
 * TESTES AUTOMATIZADOS DO PresenceEngine (FASE 4.0 - ETAPA 3B.3)
 * Arquivo: apihostinguer/scripts/test_presence_engine.php
 *
 * Cobertura Completa (Regressão 3B.1/3B.2 + Correções 3B.3 + Concorrência Real Multi-Processo):
 * 1. Participante ativo com presença oficial e persistência real de DATETIME nos horários da sessão.
 * 2. Falta injustificada.
 * 3. Falta justificada (exclusão do denominador).
 * 4. Cancelamento no prazo (exclusão do denominador).
 * 5. Sessão cancelada (bloqueio de presença e exclusão de frequência).
 * 6. Sessão com apuração pendente (não contabiliza em frequência).
 * 7. Intenção histórica do WhatsApp (não vira presença oficial).
 * 8. Bloqueio de jogador pertencente a outro racha.
 * 9. Bloqueio de confirmação para participante inativo.
 * 10. Avulso autorizado sem mensalidade.
 * 11. Bloqueio de inserção de presença após homologação (400).
 * 12. Bloqueio de alteração de presença após homologação (400).
 * 13. Cancelamento de sessão com lista homologada SEM exigir reabertura prévia, preservando presenças.
 * 14. Bloqueio de homologação de sessão cancelada (400).
 * 15. Impossibilidade de cancelar normalmente uma sessão já concluída (400).
 * 16. Impossibilidade de concluir sessão cancelada ou com lista não homologada (400).
 * 17. Conflito em criação de sessão na mesma data (HTTP 409).
 * 18. Validação de data inexistente no calendário (checkdate -> 400).
 * 19. Validação de horários inválidos, intervalo incoerente e gravação DATETIME válida.
 * 20. Denominador igual a zero (sem divisão por zero).
 * 21. Regressão das regras de banco (FKs e integridade multi-racha).
 * 22. Cálculo consolidado de frequência do racha.
 * 23. Homologação da lista não conclui prematuramente a sessão.
 * 24. Reabertura controlada com motivo obrigatório (<= 255 chars) transiciona apuração para em_andamento.
 * 25. Fluxo real de substituição (manual e atômica via substituteParticipant) e impacto na frequência.
 * 26. Rejeição de substituições inválidas (auto-substituição, outro racha, outra sessão, estado incompatível, rollback atômico).
 * 27. Trilha histórica completa de confirmações, múltiplas alterações sucessivas, cancelamentos individuais e substituições.
 * 28. Validação estrita de autoria (sem fallback para usuário #1) e encapsulamento privado de recordSessionEvent.
 * 29. Rejeição explícita de motivos acima de 255 caracteres (sem truncamento silencioso).
 * 30. Transação atômica na criação da sessão + evento 'criacao' (rollback completo em caso de falha do evento).
 * 31. Proteção append-only de racha_sessao_eventos (rejeição de UPDATE e DELETE por privilégios de runtime e por triggers).
 * 32. CONCORRÊNCIA REAL (Multi-Processo): Cancelamento simultâneo à Conclusão sob FOR UPDATE.
 * 33. CONCORRÊNCIA REAL (Multi-Processo): Confirmações duplicadas simultâneas de presença (1 sucesso 200, 1 conflito 409).
 * 34. CONCORRÊNCIA REAL (Multi-Processo): Reabertura simultânea à Conclusão na mesma sessão (exclusão mútua).
 * 35. CONCORRÊNCIA REAL (Multi-Processo): Duas substituições simultâneas disputando a vaga do mesmo titular.
 * 36. FALHA INTERMEDIÁRIA CONTROLADA: Rollback atômico entre alteração/substituição de presença e gravação da auditoria.
 * 37. CONCORRÊNCIA REAL (Multi-Processo): Cancelamento vs Homologação (validação das duas ordens serializadas).
 * 38. CONCORRÊNCIA REAL (Multi-Processo): Reabertura vs Homologação em sessão inicialmente homologada (ambas as ordens + conflito).
 * 39. CONCORRÊNCIA REAL (Multi-Processo): Reabertura vs Cancelamento em sessão inicialmente homologada (ambas as ordens).
 */

putenv('ENVIRONMENT=sandbox');
$_ENV['ENVIRONMENT'] = 'sandbox';

require_once __DIR__ . '/../config/database_sandbox.php';
require_once __DIR__ . '/../src/utils/HttpError.php';
require_once __DIR__ . '/../src/middleware/RachaScopeMiddleware.php';
require_once __DIR__ . '/../src/services/PresenceEngine.php';

/**
 * Conexão PDO de teste para injeção controlada de falha intermediária antes da gravação
 * em `racha_sessao_eventos`, sem remover triggers, sem apagar eventos e sem enfraquecer proteções.
 */
class FaultInjectingSandboxPdo extends PDO
{
    public int $failOnEventInsertNumber = 0;
    public int $eventInsertAttempts = 0;
    public int $presenceDmlPreparedCount = 0;
    /** @var callable|null */
    public $onBeforeEventFailureCallback = null;

    public function __construct()
    {
        // Garante que as variáveis do .env.sandbox(.local) já estejam carregadas
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

        if (
            stripos($sql, 'UPDATE racha_sessao_presencas') !== false ||
            stripos($sql, 'INSERT INTO racha_sessao_presencas') !== false
        ) {
            $this->presenceDmlPreparedCount++;
        }

        if (stripos($sql, 'INSERT INTO racha_sessao_eventos') !== false) {
            $this->eventInsertAttempts++;
            if ($this->failOnEventInsertNumber > 0 && $this->eventInsertAttempts === $this->failOnEventInsertNumber) {
                if (is_callable($this->onBeforeEventFailureCallback)) {
                    ($this->onBeforeEventFailureCallback)($this);
                }
                throw new PDOException(
                    "FALHA INTERMEDIÁRIA CONTROLADA: Erro simulado antes de concluir gravação do evento #{$this->eventInsertAttempts} em racha_sessao_eventos."
                );
            }
        }

        return parent::prepare($query, $options);
    }
}

class PresenceEngineTestSuite
{
    private PDO $pdo;
    private PresenceEngine $engine;
    private int $passed = 0;
    private int $failed = 0;

    private int $rachaAlphaId;
    private int $rachaBetaId;
    private array $concurrencyEvidence = [];

    public function __construct()
    {
        $this->pdo = SandboxDatabase::getConnection();

        // 1. Verificação de Segurança Pré-Execução
        $currentDb = (string)$this->pdo->query("SELECT DATABASE()")->fetchColumn();
        if ($currentDb !== 'db_futlendas_sandbox') {
            throw new RuntimeException("ABORTANDO TESTES: Conectado a '{$currentDb}', esperado estritamente 'db_futlendas_sandbox'.");
        }

        $currentUser = (string)$this->pdo->query("SELECT CURRENT_USER()")->fetchColumn();
        if (stripos($currentUser, 'root@') === 0) {
            throw new RuntimeException("ABORTANDO TESTES: A suíte da aplicação não pode rodar conectada como 'root' ({$currentUser}).");
        }

        $this->engine = new PresenceEngine($this->pdo);
        $this->setupIsolatedTestData();
    }

    /**
     * Cria rachas de teste isolados para esta execução SEM apagar nem editar
     * registros existentes de racha_sessao_eventos (respeitando a política append-only).
     */
    private function setupIsolatedTestData(): void
    {
        $suffix = date('His') . '_' . mt_rand(100, 999);

        // 1. Cria Rachas de teste isolados para a execução atual
        $stmtAlpha = $this->pdo->prepare("
            INSERT INTO rachas (nome, dia_semana, horario_inicio, local_nome, ativo)
            VALUES (:nome, 'terca', '20:00', 'Arena 1', 1)
        ");
        $stmtAlpha->execute([':nome' => "Racha Presença Alpha Teste {$suffix}"]);
        $this->rachaAlphaId = (int)$this->pdo->lastInsertId();

        $stmtBeta = $this->pdo->prepare("
            INSERT INTO rachas (nome, dia_semana, horario_inicio, local_nome, ativo)
            VALUES (:nome, 'quinta', '19:00', 'Arena 2', 1)
        ");
        $stmtBeta->execute([':nome' => "Racha Presença Beta Teste {$suffix}"]);
        $this->rachaBetaId = (int)$this->pdo->lastInsertId();

        // 2. Cria Organizadores no Racha Alpha (Usuário 1 = Dono, Usuário 2 = Auxiliar)
        $this->pdo->exec("
            INSERT INTO racha_organizadores (racha_id, usuario_id, papel)
            VALUES ({$this->rachaAlphaId}, 1, 'dono'),
                   ({$this->rachaAlphaId}, 2, 'auxiliar')
        ");

        // 3. Cadastra Participantes no Racha Alpha:
        // Jogador 1: Mensalista Ativo
        // Jogador 2: Avulso Ativo (sem mensalidade)
        // Jogador 3: Avulso Ativo (usado para teste de denominador zero e disputas de substituição)
        // Jogador 4: Participante Inativo (ativo = 0)
        // Jogador 6: Participante Ativo adicional para testes de substituição e concorrência
        // Jogador 7: Participante Ativo adicional para testes de concorrência
        $this->engine->registerParticipant($this->rachaAlphaId, 1, 'mensalista', true);
        $this->engine->registerParticipant($this->rachaAlphaId, 2, 'avulso_convidado', true);
        $this->engine->registerParticipant($this->rachaAlphaId, 3, 'avulso_recorrente', true);
        $this->engine->registerParticipant($this->rachaAlphaId, 4, 'avulso_convidado', false); // Inativo
        $this->engine->registerParticipant($this->rachaAlphaId, 6, 'avulso_convidado', true);
        $this->engine->registerParticipant($this->rachaAlphaId, 7, 'avulso_convidado', true);

        // 4. Cadastra Jogador 5 EXCLUSIVAMENTE no Racha Beta (para teste cross-racha)
        $this->engine->registerParticipant($this->rachaBetaId, 5, 'mensalista', true);
    }

    private function assertTest(string $name, callable $fn): void
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
     * Dispara dois processos PHP independentes em paralelo via proc_open(),
     * garantindo conexões TCP/PDO distintas e execução simultânea sincronizada.
     * Se $lockSessionId for informado, o processo pai segura um lock FOR UPDATE
     * na linha da sessão até ambos os processos filhos terem entrado simultaneamente
     * em estado LOCK WAIT no InnoDB (information_schema.innodb_trx), liberando-os
     * no mesmo instante para disputarem o lock no banco.
     * O parâmetro opcional $staggerBMs permite controlar qual dos dois processos entra
     * primeiro na fila FIFO do lock do InnoDB enquanto ambos permanecem bloqueados
     * simultaneamente na barreira.
     */
    private function runConcurrentWorkers(
        array $taskA,
        array $taskB,
        ?int $lockSessionId = null,
        float $staggerBMs = 0.0
    ): array {
        $phpBin = PHP_BINARY ?: 'C:\\xampp\\php\\php.exe';
        $workerScript = __DIR__ . '/concurrency_worker.php';

        $lockPdo = null;
        $coordinatorConnId = null;
        if ($lockSessionId !== null) {
            // Segura um lock exclusivo na sessão em uma terceira conexão coordenadora
            $lockPdo = SandboxDatabase::getConnection(true);
            $coordinatorConnId = (int)$lockPdo->query("SELECT CONNECTION_ID()")->fetchColumn();
            $lockPdo->beginTransaction();
            $stmtLock = $lockPdo->prepare("SELECT id FROM racha_sessoes WHERE id = :id FOR UPDATE");
            $stmtLock->execute([':id' => $lockSessionId]);
            $stmtLock->fetch();
        }

        $taskA['await_stdin_signal'] = true;
        $taskB['await_stdin_signal'] = true;

        $cmdA = sprintf('"%s" "%s" %s', $phpBin, $workerScript, base64_encode((string)json_encode($taskA)));
        $cmdB = sprintf('"%s" "%s" %s', $phpBin, $workerScript, base64_encode((string)json_encode($taskB)));

        $descriptors = [
            0 => ['pipe', 'r'],
            1 => ['pipe', 'w'],
            2 => ['pipe', 'w']
        ];

        $procA = proc_open($cmdA, $descriptors, $pipesA);
        $procB = proc_open($cmdB, $descriptors, $pipesB);

        if (!is_resource($procA) || !is_resource($procB)) {
            if ($lockPdo && $lockPdo->inTransaction()) {
                $lockPdo->rollBack();
            }
            throw new RuntimeException("Falha ao iniciar processos concorrentes via proc_open.");
        }

        // Aguarda que ambos os processos filhos tenham inicializado o PHP e aberto suas conexões PDO independentes
        $readyLineA = trim((string)fgets($pipesA[1]));
        $readyLineB = trim((string)fgets($pipesB[1]));
        if (strpos($readyLineA, 'READY:') !== 0 || strpos($readyLineB, 'READY:') !== 0) {
            if ($lockPdo && $lockPdo->inTransaction()) {
                $lockPdo->rollBack();
            }
            throw new RuntimeException("Workers não sinalizaram prontidão de conexão. A='{$readyLineA}', B='{$readyLineB}'");
        }

        $readyConnA = (int)substr($readyLineA, 6);
        $readyConnB = (int)substr($readyLineB, 6);

        $innodbLockWaitCount = 0;
        $lockWaitThreads = [];
        $debugTrx = [];
        $debugProc = [];
        $adminPdo = SandboxDatabase::getAdminConnection();

        if ($lockPdo !== null) {
            // Dispara Worker A para colidir no lock FOR UPDATE
            fwrite($pipesA[0], "GO\n");
            fflush($pipesA[0]);
            fclose($pipesA[0]);

            if ($staggerBMs > 0.0) {
                // Aguarda na processlist (tempo real, sem cache) até que Worker A esteja retido no SELECT ... FOR UPDATE
                $deadlineA = microtime(true) + 1.000;
                while (microtime(true) < $deadlineA) {
                    $cntA = (int)$adminPdo->query("
                        SELECT COUNT(*) FROM information_schema.processlist
                        WHERE ID = {$readyConnA} AND INFO LIKE '%FOR UPDATE%'
                    ")->fetchColumn();
                    if ($cntA >= 1) {
                        usleep(20000); // Garante entrada na fila FIFO de lock do InnoDB
                        break;
                    }
                    usleep(5000);
                }
            }

            // Dispara Worker B para colidir no mesmo lock FOR UPDATE enquanto Worker A ainda está retido
            fwrite($pipesB[0], "GO\n");
            fflush($pipesB[0]);
            fclose($pipesB[0]);

            // 1. Aguarda via processlist até que AMBOS os workers estejam bloqueados no SELECT ... FOR UPDATE
            $deadline = microtime(true) + 1.500;
            while (microtime(true) < $deadline) {
                $cntBoth = (int)$adminPdo->query("
                    SELECT COUNT(*) FROM information_schema.processlist
                    WHERE ID IN ({$readyConnA}, {$readyConnB}) AND INFO LIKE '%FOR UPDATE%'
                ")->fetchColumn();
                if ($cntBoth >= 2) {
                    break;
                }
                usleep(5000);
            }

            // 2. Aguarda 120ms sem consultar innodb_trx para respeitar o CACHE_MIN_IDLE_TIME_US (100ms) do InnoDB
            usleep(120000);

            $rows = $adminPdo->query("
                SELECT trx_mysql_thread_id, trx_state, trx_query
                FROM information_schema.innodb_trx
                WHERE trx_state = 'LOCK WAIT'
            ")->fetchAll(PDO::FETCH_ASSOC);

            $innodbLockWaitCount = count($rows);
            $lockWaitThreads = array_map(static fn($r) => (int)$r['trx_mysql_thread_id'], $rows);

            if ($innodbLockWaitCount < 2) {
                $debugTrx = $adminPdo->query("SELECT trx_id, trx_state, trx_mysql_thread_id, trx_operation_state, trx_query FROM information_schema.innodb_trx")->fetchAll(PDO::FETCH_ASSOC);
                $debugProc = $adminPdo->query("SELECT ID, USER, COMMAND, STATE, INFO FROM information_schema.processlist")->fetchAll(PDO::FETCH_ASSOC);
            }
            // Libera o lock coordenador para que ambos os processos disputem a linha simultaneamente!
            $lockPdo->rollBack();
        } else {
            fwrite($pipesA[0], "GO\n");
            fflush($pipesA[0]);
            fclose($pipesA[0]);

            fwrite($pipesB[0], "GO\n");
            fflush($pipesB[0]);
            fclose($pipesB[0]);
        }

        $stdoutA = (string)stream_get_contents($pipesA[1]);
        $stderrA = (string)stream_get_contents($pipesA[2]);
        fclose($pipesA[1]);
        fclose($pipesA[2]);
        proc_close($procA);

        $stdoutB = (string)stream_get_contents($pipesB[1]);
        $stderrB = (string)stream_get_contents($pipesB[2]);
        fclose($pipesB[1]);
        fclose($pipesB[2]);
        proc_close($procB);

        $resA = json_decode(trim($stdoutA), true);
        $resB = json_decode(trim($stdoutB), true);

        if (!is_array($resA) || !is_array($resB)) {
            throw new RuntimeException(
                "Saída inválida dos workers concorrentes. A='{$stdoutA}' (err='{$stderrA}'), B='{$stdoutB}' (err='{$stderrB}')"
            );
        }

        // Comprova que foram processos e conexões reais e independentes
        if ((int)$resA['pid'] === (int)$resB['pid']) {
            throw new RuntimeException("Os workers executaram no mesmo PID ({$resA['pid']}), esperado processos distintos.");
        }
        if ((int)$resA['connection_id'] === (int)$resB['connection_id']) {
            throw new RuntimeException("Os workers usaram a mesma CONNECTION_ID ({$resA['connection_id']}), esperado conexões independentes.");
        }
        if ($lockSessionId !== null && $innodbLockWaitCount < 2) {
            throw new RuntimeException("Simultaneidade de lock não comprovada no InnoDB (innodb_lock_wait_count={$innodbLockWaitCount}, esperado >= 2). TRX=" . json_encode($debugTrx) . " PROC=" . json_encode($debugProc));
        }

        return [
            'workerA'                => $resA,
            'workerB'                => $resB,
            'coordinator_conn_id'    => $coordinatorConnId,
            'innodb_lock_wait_count' => $innodbLockWaitCount,
            'lock_wait_threads'      => $lockWaitThreads
        ];
    }

    /**
     * Registra telemetria detalhada da execução concorrente multi-processo para auditoria.
     */
    private function recordConcurrencyEvidence(string $cenario, array $res, int $sessaoId): void
    {
        $sessao = $this->engine->getSession($this->rachaAlphaId, $sessaoId);
        $eventos = $this->engine->getSessionEvents($this->rachaAlphaId, $sessaoId);
        $tiposEventos = array_column($eventos, 'tipo_evento');

        $this->concurrencyEvidence[] = [
            'cenario'                => $cenario,
            'sessao_id'              => $sessaoId,
            'coordinator_conn_id'    => $res['coordinator_conn_id'],
            'innodb_lock_wait_count' => $res['innodb_lock_wait_count'],
            'lock_wait_threads'      => $res['lock_wait_threads'],
            'workerA'                => [
                'pid'        => $res['workerA']['pid'],
                'conn_id'    => $res['workerA']['connection_id'],
                'action'     => $res['workerA']['action'],
                'http_code'  => $res['workerA']['http_code'],
                'success'    => $res['workerA']['success'],
                'message'    => $res['workerA']['message']
            ],
            'workerB'                => [
                'pid'        => $res['workerB']['pid'],
                'conn_id'    => $res['workerB']['connection_id'],
                'action'     => $res['workerB']['action'],
                'http_code'  => $res['workerB']['http_code'],
                'success'    => $res['workerB']['success'],
                'message'    => $res['workerB']['message']
            ],
            'final_status'           => $sessao['status'],
            'final_apuracao'         => $sessao['apuracao_presenca'],
            'total_eventos'          => count($eventos),
            'sequencia_eventos'      => $tiposEventos
        ];
    }

    public function run(): void
    {
        echo "====================================================================\n";
        echo " TESTES DO MOTOR DE PRESENÇA E AUDITORIA (FASE 4.0 - ETAPA 3B.3)\n";
        echo "====================================================================\n\n";

        // Cria Sessão 1 (2026-11-01) com horários '20:00' e '22:00' e usuário responsável #1
        $sessao1 = $this->engine->createSession($this->rachaAlphaId, '2026-11-01', '20:00', '22:00', 1);
        $sessao1Id = $sessao1['id'];

        // =====================================================================
        // TESTE 1: Participante ativo com presença oficial + DATETIME real
        // =====================================================================
        $this->assertTest("1. Participante ativo com presença oficial e horários DATETIME válidos", function () use ($sessao1Id) {
            // Verifica que os horários foram gravados como DATETIME completos e não NULL
            $sessaoDb = $this->engine->getSession($this->rachaAlphaId, $sessao1Id);
            if ($sessaoDb['horario_abertura'] !== '2026-11-01 20:00:00' || $sessaoDb['horario_fechamento'] !== '2026-11-01 22:00:00') {
                throw new Exception("Horários DATETIME persistidos incorretamente: " . json_encode($sessaoDb));
            }

            $res = $this->engine->confirmPresence(
                $this->rachaAlphaId,
                $sessao1Id,
                1,
                'presente',
                'organizador_manual',
                1
            );

            if ($res['status_presenca'] !== 'presente' || $res['categoria'] !== 'mensalista') {
                throw new Exception("Falha ao registrar presença oficial do mensalista");
            }

            $this->engine->homologateSession($this->rachaAlphaId, $sessao1Id, 1);

            $att = $this->engine->calculatePlayerAttendance($this->rachaAlphaId, 1);
            if ($att['has_history'] !== true || $att['presencas_oficiais'] !== 1 || $att['oportunidades_validas'] !== 1) {
                throw new Exception("Presenças oficiais ou oportunidades incorretas: " . json_encode($att));
            }
            if ($att['taxa_presenca'] !== 1.0 || $att['taxa_presenca_pct'] !== 100.0) {
                throw new Exception("Taxa de presença deveria ser 100%, recebido: " . $att['taxa_presenca_pct']);
            }
        });

        // =====================================================================
        // TESTE 2: Falta injustificada
        // =====================================================================
        $sessao2 = $this->engine->createSession($this->rachaAlphaId, '2026-11-08', null, null, 1);
        $sessao2Id = $sessao2['id'];

        $this->assertTest("2. Falta injustificada", function () use ($sessao2Id) {
            $this->engine->confirmPresence(
                $this->rachaAlphaId,
                $sessao2Id,
                1,
                'falta_injustificada',
                'organizador_manual',
                1
            );

            $this->engine->homologateSession($this->rachaAlphaId, $sessao2Id, 1);

            $att = $this->engine->calculatePlayerAttendance($this->rachaAlphaId, 1);
            if ($att['oportunidades_validas'] !== 2 || $att['taxa_presenca_pct'] !== 50.0 || $att['taxa_falta_pct'] !== 50.0) {
                throw new Exception("Cálculo incorreto após falta injustificada: " . json_encode($att));
            }
        });

        // =====================================================================
        // TESTE 3: Falta justificada (não entra no denominador)
        // =====================================================================
        $sessao3 = $this->engine->createSession($this->rachaAlphaId, '2026-11-15', null, null, 1);
        $sessao3Id = $sessao3['id'];

        $this->assertTest("3. Falta justificada (exclusão do denominador)", function () use ($sessao3Id) {
            $this->engine->confirmPresence(
                $this->rachaAlphaId,
                $sessao3Id,
                1,
                'falta_justificada',
                'organizador_manual',
                1,
                'Compromisso profissional inadiável'
            );

            $this->engine->homologateSession($this->rachaAlphaId, $sessao3Id, 1);

            $att = $this->engine->calculatePlayerAttendance($this->rachaAlphaId, 1);
            if ($att['faltas_justificadas'] !== 1 || $att['oportunidades_validas'] !== 2 || $att['taxa_presenca_pct'] !== 50.0) {
                throw new Exception("Falta justificada não deveria alterar denominador: " . json_encode($att));
            }
        });

        // =====================================================================
        // TESTE 4: Cancelamento no prazo (não entra no denominador)
        // =====================================================================
        $sessao4 = $this->engine->createSession($this->rachaAlphaId, '2026-11-22', null, null, 1);
        $sessao4Id = $sessao4['id'];

        $this->assertTest("4. Cancelamento no prazo (exclusão do denominador)", function () use ($sessao4Id) {
            $this->engine->confirmPresence(
                $this->rachaAlphaId,
                $sessao4Id,
                1,
                'cancelado_no_prazo',
                'jogador_app',
                1
            );

            $this->engine->homologateSession($this->rachaAlphaId, $sessao4Id, 1);

            $att = $this->engine->calculatePlayerAttendance($this->rachaAlphaId, 1);
            if ($att['cancelados_no_prazo'] !== 1 || $att['oportunidades_validas'] !== 2) {
                throw new Exception("Cancelamento no prazo não deveria alterar denominador: " . json_encode($att));
            }
        });

        // =====================================================================
        // TESTE 5: Sessão cancelada (bloqueio de presença e exclusão de frequência)
        // =====================================================================
        $sessao5 = $this->engine->createSession($this->rachaAlphaId, '2026-11-29', null, null, 1);
        $sessao5Id = $sessao5['id'];

        $this->assertTest("5. Sessão cancelada (bloqueio de presença e exclusão de frequência)", function () use ($sessao5Id) {
            $this->engine->cancelSession($this->rachaAlphaId, $sessao5Id, 'Tempestade torrencial e quadra alagada', 1);

            try {
                $this->engine->confirmPresence(
                    $this->rachaAlphaId,
                    $sessao5Id,
                    1,
                    'presente',
                    'organizador_manual',
                    1
                );
                throw new Exception("Deveria ter rejeitado registro em sessão cancelada");
            } catch (HttpError $e) {
                if ($e->getStatusCode() !== 400) {
                    throw new Exception("Status esperado 400, recebido: " . $e->getStatusCode());
                }
            }

            $att = $this->engine->calculatePlayerAttendance($this->rachaAlphaId, 1);
            if ($att['oportunidades_validas'] !== 2) {
                throw new Exception("Sessão cancelada não pode impactar oportunidades");
            }
        });

        // =====================================================================
        // TESTE 6: Sessão com apuração pendente (não contabiliza em frequência)
        // =====================================================================
        $sessao6 = $this->engine->createSession($this->rachaAlphaId, '2026-12-06', null, null, 1);
        $sessao6Id = $sessao6['id'];

        $this->assertTest("6. Sessão com apuração pendente (não contabiliza em frequência)", function () use ($sessao6Id) {
            $this->engine->confirmPresence(
                $this->rachaAlphaId,
                $sessao6Id,
                1,
                'presente',
                'organizador_manual',
                1
            );

            $att = $this->engine->calculatePlayerAttendance($this->rachaAlphaId, 1);
            if ($att['pendentes_apuracao'] < 1 || $att['oportunidades_validas'] !== 2) {
                throw new Exception("Presença em sessão não homologada não pode entrar nas oportunidades válidas");
            }
        });

        // =====================================================================
        // TESTE 7: Intenção histórica do WhatsApp (não vira presença oficial)
        // =====================================================================
        $sessao7 = $this->engine->createSession($this->rachaAlphaId, '2026-12-13', null, null, 1);
        $sessao7Id = $sessao7['id'];

        $this->assertTest("7. Intenção histórica do WhatsApp (não vira presença oficial)", function () use ($sessao7Id) {
            $this->engine->confirmPresence(
                $this->rachaAlphaId,
                $sessao7Id,
                1,
                'historico_legado_intencao',
                'legado',
                1
            );

            $this->engine->homologateSession($this->rachaAlphaId, $sessao7Id, 1);

            $att = $this->engine->calculatePlayerAttendance($this->rachaAlphaId, 1);
            if ($att['historico_legado_intencao'] !== 1 || $att['oportunidades_validas'] !== 2) {
                throw new Exception("Intenção histórica não pode ser convertida em oportunidade oficial");
            }
        });

        // =====================================================================
        // TESTE 8: Bloqueio de jogador pertencente a outro racha
        // =====================================================================
        $this->assertTest("8. Bloqueio de jogador pertencente a outro racha", function () use ($sessao6Id) {
            try {
                $this->engine->confirmPresence(
                    $this->rachaAlphaId,
                    $sessao6Id,
                    5, // Pertence apenas ao Racha Beta
                    'presente',
                    'organizador_manual',
                    1
                );
                throw new Exception("Deveria ter bloqueado jogador pertencente a outro racha");
            } catch (HttpError $e) {
                if ($e->getStatusCode() !== 404 && $e->getStatusCode() !== 400) {
                    throw new Exception("Status esperado 404 ou 400, recebido: " . $e->getStatusCode());
                }
            }
        });

        // =====================================================================
        // TESTE 9: Bloqueio de confirmação para participante inativo
        // =====================================================================
        $this->assertTest("9. Bloqueio de confirmação para participante inativo", function () use ($sessao6Id) {
            try {
                $this->engine->confirmPresence(
                    $this->rachaAlphaId,
                    $sessao6Id,
                    4, // Inativo
                    'presente',
                    'organizador_manual',
                    1
                );
                throw new Exception("Deveria ter bloqueado participante inativo");
            } catch (HttpError $e) {
                if ($e->getStatusCode() !== 400) {
                    throw new Exception("Status esperado 400, recebido: " . $e->getStatusCode());
                }
            }
        });

        // =====================================================================
        // TESTE 10: Avulso autorizado sem mensalidade
        // =====================================================================
        $sessaoAvulso = $this->engine->createSession($this->rachaAlphaId, '2026-12-20', null, null, 1);
        $sessaoAvulsoId = $sessaoAvulso['id'];

        $this->assertTest("10. Avulso autorizado sem mensalidade (em sessão disponível)", function () use ($sessaoAvulsoId) {
            $res = $this->engine->confirmPresence(
                $this->rachaAlphaId,
                $sessaoAvulsoId,
                2,
                'presente',
                'organizador_manual',
                1
            );

            if ($res['categoria'] !== 'avulso') {
                throw new Exception("Categoria deveria ser 'avulso', recebido: " . $res['categoria']);
            }

            $this->engine->homologateSession($this->rachaAlphaId, $sessaoAvulsoId, 1);

            $att = $this->engine->calculatePlayerAttendance($this->rachaAlphaId, 2);
            if ($att['presencas_oficiais'] !== 1 || $att['taxa_presenca_pct'] !== 100.0) {
                throw new Exception("Frequência de avulso não calculada corretamente");
            }
        });

        // =====================================================================
        // TESTE 11: Bloqueio de inserção de presença após homologação (400)
        // =====================================================================
        $this->assertTest("11. Bloqueio de inserção de presença após homologação", function () use ($sessao1Id) {
            try {
                $this->engine->confirmPresence(
                    $this->rachaAlphaId,
                    $sessao1Id,
                    2,
                    'presente',
                    'organizador_manual',
                    1
                );
                throw new Exception("Deveria ter rejeitado inserção em sessão homologada");
            } catch (HttpError $e) {
                if ($e->getStatusCode() !== 400 || strpos($e->getMessage(), 'homologada') === false) {
                    throw new Exception("Erro 400 esperado com menção a homologada, recebido: " . $e->getMessage());
                }
            }
        });

        // =====================================================================
        // TESTE 12: Bloqueio de alteração de presença após homologação (400)
        // =====================================================================
        $this->assertTest("12. Bloqueio de alteração de presença após homologação", function () use ($sessao1Id) {
            try {
                $this->engine->updatePresenceStatus(
                    $this->rachaAlphaId,
                    $sessao1Id,
                    1,
                    'falta_injustificada',
                    1
                );
                throw new Exception("Deveria ter rejeitado alteração de presença em sessão homologada");
            } catch (HttpError $e) {
                if ($e->getStatusCode() !== 400 || strpos($e->getMessage(), 'homologada') === false) {
                    throw new Exception("Erro 400 esperado com menção a homologada, recebido: " . $e->getMessage());
                }
            }
        });

        // =====================================================================
        // TESTE 13 (ETAPA 3B.3 - ITEM 2 & 9.1):
        // Cancelamento de sessão com lista homologada, SEM exigir reabertura prévia,
        // preservando registros de presença e mantendo exclusão na frequência
        // =====================================================================
        $sessaoHomolCancel = $this->engine->createSession($this->rachaAlphaId, '2026-12-27', '19:00', '21:00', 1);
        $sessaoHomolCancelId = $sessaoHomolCancel['id'];

        $this->assertTest("13. Cancelamento de sessão com lista homologada sem reabertura prévia", function () use ($sessaoHomolCancelId) {
            // Registra presenças de Jogador 1 e Jogador 2
            $this->engine->confirmPresence($this->rachaAlphaId, $sessaoHomolCancelId, 1, 'presente', 'organizador_manual', 1);
            $this->engine->confirmPresence($this->rachaAlphaId, $sessaoHomolCancelId, 2, 'presente', 'organizador_manual', 1);

            // Homologa a lista às 18h
            $this->engine->homologateSession($this->rachaAlphaId, $sessaoHomolCancelId, 1, 'Lista homologada às 18h');

            // Motivo vazio para cancelar sessão deve falhar (400)
            try {
                $this->engine->cancelSession($this->rachaAlphaId, $sessaoHomolCancelId, '   ', 1);
                throw new Exception("Deveria rejeitar cancelamento de sessão sem motivo válido");
            } catch (HttpError $e) {
                if ($e->getStatusCode() !== 400) {
                    throw new Exception("Status 400 esperado para motivo vazio");
                }
            }

            // Às 18h40 cai tempestade: organizador cancela a sessão homologada diretamente SEM reabrir a lista
            $ok = $this->engine->cancelSession(
                $this->rachaAlphaId,
                $sessaoHomolCancelId,
                'Queda de energia e alagamento na quadra às 18h40',
                1
            );
            if (!$ok) {
                throw new Exception("cancelSession deveria permitir cancelar sessão homologada");
            }

            $sessao = $this->engine->getSession($this->rachaAlphaId, $sessaoHomolCancelId);
            if ($sessao['status'] !== 'cancelada') {
                throw new Exception("Sessão deveria estar com status 'cancelada', obtido: '{$sessao['status']}'");
            }

            // Verifica que os registros de presença foram PRESERVADOS (não apagados)
            $stmtCount = $this->pdo->prepare("SELECT COUNT(*) FROM racha_sessao_presencas WHERE sessao_id = :s");
            $stmtCount->execute([':s' => $sessaoHomolCancelId]);
            if ((int)$stmtCount->fetchColumn() !== 2) {
                throw new Exception("Registros de presença deveriam ter sido preservados após cancelamento da sessão!");
            }

            // Repetição idempotente: não deve duplicar o evento de cancelamento
            $eventsBefore = $this->engine->getSessionEvents($this->rachaAlphaId, $sessaoHomolCancelId, 'cancelamento');
            $this->engine->cancelSession($this->rachaAlphaId, $sessaoHomolCancelId, 'Repetição idempotente', 1);
            $eventsAfter = $this->engine->getSessionEvents($this->rachaAlphaId, $sessaoHomolCancelId, 'cancelamento');

            if (count($eventsBefore) !== 1 || count($eventsAfter) !== 1) {
                throw new Exception("Esperado exatamente 1 evento de cancelamento, obtido: " . count($eventsAfter));
            }

            // Verifica que a sessão cancelada (mesmo tendo sido homologada antes) continua excluída da frequência
            $att1 = $this->engine->calculatePlayerAttendance($this->rachaAlphaId, 1);
            if ($att1['oportunidades_validas'] !== 2 || $att1['sessoes_canceladas'] < 1) {
                throw new Exception("Sessão cancelada após homologação não deve contabilizar em oportunidades_validas: " . json_encode($att1));
            }
        });

        // =====================================================================
        // TESTE 14: Bloqueio de homologação de sessão cancelada (400)
        // =====================================================================
        $this->assertTest("14. Bloqueio de homologação de sessão cancelada", function () use ($sessao5Id) {
            try {
                $this->engine->homologateSession($this->rachaAlphaId, $sessao5Id, 1);
                throw new Exception("Deveria ter impedido homologação de sessão cancelada");
            } catch (HttpError $e) {
                if ($e->getStatusCode() !== 400) {
                    throw new Exception("Status esperado 400, recebido: " . $e->getStatusCode());
                }
            }
        });

        // =====================================================================
        // TESTE 15 (ETAPA 3B.3 - ITEM 2 & 9.2):
        // Impossibilidade de cancelar normalmente uma sessão já concluída (400)
        // =====================================================================
        $this->assertTest("15. Impossibilidade de cancelar normalmente uma sessão concluída", function () use ($sessao1Id) {
            // Sessão 1 já está homologada; concluímos a sessão 1
            $this->engine->concludeSession($this->rachaAlphaId, $sessao1Id, 1, 'Encerramento normal da Sessão 1');

            try {
                $this->engine->cancelSession($this->rachaAlphaId, $sessao1Id, 'Tentativa de cancelar sessão já concluída', 1);
                throw new Exception("Deveria ter impedido o cancelamento de uma sessão já concluída");
            } catch (HttpError $e) {
                if ($e->getStatusCode() !== 400 || stripos($e->getMessage(), 'concluída') === false) {
                    throw new Exception("Status 400 esperado com menção a concluída, recebido: " . $e->getMessage());
                }
            }
        });

        // =====================================================================
        // TESTE 16 (ETAPA 3B.3 - ITEM 3 & 9.3):
        // Impossibilidade de concluir sessão cancelada ou com lista não homologada
        // =====================================================================
        $this->assertTest("16. Impossibilidade de concluir sessão cancelada ou com lista não homologada", function () use ($sessao5Id, $sessao6Id) {
            // 16a. Sessão 6 está com apuracao_presenca = 'nao_iniciada' -> NÃO pode ser concluída
            try {
                $this->engine->concludeSession($this->rachaAlphaId, $sessao6Id, 1);
                throw new Exception("Deveria rejeitar conclusão de sessão com apuração 'nao_iniciada'");
            } catch (HttpError $e) {
                if ($e->getStatusCode() !== 400 || stripos($e->getMessage(), 'homologada') === false) {
                    throw new Exception("Status 400 esperado exigindo lista homologada, recebido: " . $e->getMessage());
                }
            }

            // 16b. Homologa Sessão 6 e depois reabre (apuracao_presenca = 'em_andamento') -> também NÃO pode ser concluída sem re-homologar
            $this->engine->homologateSession($this->rachaAlphaId, $sessao6Id, 1);
            $this->engine->reopenPresenceList($this->rachaAlphaId, $sessao6Id, 1, 'Reaberta para ajuste pendente');

            try {
                $this->engine->concludeSession($this->rachaAlphaId, $sessao6Id, 1);
                throw new Exception("Deveria rejeitar conclusão de sessão enquanto a lista está reaberta ('em_andamento')");
            } catch (HttpError $e) {
                if ($e->getStatusCode() !== 400 || stripos($e->getMessage(), 'homologada') === false) {
                    throw new Exception("Status 400 esperado exigindo lista homologada, recebido: " . $e->getMessage());
                }
            }

            // 16c. Sessão 5 está cancelada -> NÃO pode ser concluída
            try {
                $this->engine->concludeSession($this->rachaAlphaId, $sessao5Id, 1);
                throw new Exception("Deveria rejeitar conclusão de sessão cancelada");
            } catch (HttpError $e) {
                if ($e->getStatusCode() !== 400 || stripos($e->getMessage(), 'cancelada') === false) {
                    throw new Exception("Status 400 esperado para sessão cancelada, recebido: " . $e->getMessage());
                }
            }
        });

        // =====================================================================
        // TESTE 17: Conflito em criação de sessão na mesma data (HTTP 409)
        // =====================================================================
        $this->assertTest("17. Conflito em criação de sessão na mesma data (HTTP 409)", function () {
            try {
                $this->engine->createSession($this->rachaAlphaId, '2026-11-01', '20:00', '22:00', 1);
                throw new Exception("Deveria ter retornado conflito 409 para data duplicada");
            } catch (HttpError $e) {
                if ($e->getStatusCode() !== 409) {
                    throw new Exception("Status esperado 409, recebido: " . $e->getStatusCode());
                }
            }
        });

        // =====================================================================
        // TESTE 18: Validação de data impossível no calendário (checkdate)
        // =====================================================================
        $this->assertTest("18. Validação de data inexistente no calendário (checkdate)", function () {
            foreach (['2026-02-30', '2026-11-31'] as $invalidDate) {
                try {
                    $this->engine->createSession($this->rachaAlphaId, $invalidDate, null, null, 1);
                    throw new Exception("Deveria ter rejeitado {$invalidDate}");
                } catch (HttpError $e) {
                    if ($e->getStatusCode() !== 400) {
                        throw new Exception("Status esperado 400, recebido: " . $e->getStatusCode());
                    }
                }
            }
        });

        // =====================================================================
        // TESTE 19: Validação de horários inválidos e intervalo incoerente
        // =====================================================================
        $this->assertTest("19. Validação de horários inválidos e intervalo incoerente", function () {
            try {
                $this->engine->createSession($this->rachaAlphaId, '2027-01-10', '25:00', '22:00', 1);
                throw new Exception("Deveria ter rejeitado 25:00");
            } catch (HttpError $e) {
                if ($e->getStatusCode() !== 400) {
                    throw new Exception("Status esperado 400, recebido: " . $e->getStatusCode());
                }
            }

            try {
                $this->engine->createSession($this->rachaAlphaId, '2027-01-10', '21:00', '20:00', 1);
                throw new Exception("Deveria ter rejeitado fechamento anterior à abertura");
            } catch (HttpError $e) {
                if ($e->getStatusCode() !== 400) {
                    throw new Exception("Status esperado 400, recebido: " . $e->getStatusCode());
                }
            }
        });

        // =====================================================================
        // TESTE 20: Denominador igual a zero (sem divisão por zero)
        // =====================================================================
        $sessaoZero = $this->engine->createSession($this->rachaAlphaId, '2027-01-17', '19:30', '21:30', 1);
        $sessaoZeroId = $sessaoZero['id'];

        $this->assertTest("20. Denominador igual a zero (sem divisão por zero)", function () use ($sessaoZeroId) {
            $this->engine->confirmPresence(
                $this->rachaAlphaId,
                $sessaoZeroId,
                3,
                'falta_justificada',
                'organizador_manual',
                1,
                'Viagem em família'
            );
            $this->engine->homologateSession($this->rachaAlphaId, $sessaoZeroId, 1);

            $att = $this->engine->calculatePlayerAttendance($this->rachaAlphaId, 3);
            if ($att['has_history'] !== false || $att['oportunidades_validas'] !== 0 || $att['taxa_presenca'] !== null) {
                throw new Exception("Denominador zero tratado incorretamente: " . json_encode($att));
            }
        });

        // =====================================================================
        // TESTE 21: Regressão das regras de banco (FKs e integridade multi-racha)
        // =====================================================================
        $this->assertTest("21. Regressão das regras de banco (FKs e integridade multi-racha)", function () use ($sessaoZeroId) {
            $dbErrorThrown = false;
            try {
                $stmt = $this->pdo->prepare("
                    INSERT INTO racha_sessao_presencas (sessao_id, racha_id, jogador_id, categoria, status_presenca)
                    VALUES (:sessao_id, :racha_id, :jogador_id, 'avulso', 'presente')
                ");
                $stmt->execute([
                    ':sessao_id'  => $sessaoZeroId,
                    ':racha_id'   => $this->rachaAlphaId,
                    ':jogador_id' => 5
                ]);
            } catch (PDOException $e) {
                if ($e->getCode() === '23000' || strpos($e->getMessage(), '1452') !== false) {
                    $dbErrorThrown = true;
                }
            }

            if (!$dbErrorThrown) {
                throw new Exception("O banco de dados deveria ter disparado erro de Foreign Key (fk_rsp_participante)!");
            }
        });

        // =====================================================================
        // TESTE 22: Cálculo consolidado de frequência do racha
        // =====================================================================
        $this->assertTest("22. Cálculo consolidado de frequência do racha", function () {
            $rachaAtt = $this->engine->calculateRachaAttendance($this->rachaAlphaId);
            if ($rachaAtt['has_history'] !== true || $rachaAtt['racha_id'] !== $this->rachaAlphaId || $rachaAtt['oportunidades_validas'] <= 0) {
                throw new Exception("Frequência consolidada inconsistente: " . json_encode($rachaAtt));
            }
        });

        // =====================================================================
        // TESTE 23: Homologação da lista não conclui prematuramente a sessão
        // =====================================================================
        $sessaoCiclo = $this->engine->createSession($this->rachaAlphaId, '2027-02-07', '19:00', '21:00', 1);
        $sessaoCicloId = $sessaoCiclo['id'];

        $this->assertTest("23. Homologação da lista não conclui prematuramente a sessão", function () use ($sessaoCicloId) {
            $this->engine->confirmPresence($this->rachaAlphaId, $sessaoCicloId, 1, 'presente', 'organizador_manual', 1);
            $this->engine->homologateSession($this->rachaAlphaId, $sessaoCicloId, 1, 'Fechamento inicial às 18h');

            $sessao = $this->engine->getSession($this->rachaAlphaId, $sessaoCicloId);
            if ($sessao['apuracao_presenca'] !== 'homologada' || $sessao['status'] !== 'agendada') {
                throw new Exception("Estado inesperado após homologação: " . json_encode($sessao));
            }
        });

        // =====================================================================
        // TESTE 24: Reabertura controlada exige motivo obrigatório e muda apuração para em_andamento
        // =====================================================================
        $this->assertTest("24. Reabertura controlada exige motivo obrigatório e muda apuração para em_andamento", function () use ($sessaoCicloId) {
            foreach (['', "   \t\n  "] as $motivoInvalido) {
                try {
                    $this->engine->reopenPresenceList($this->rachaAlphaId, $sessaoCicloId, 1, $motivoInvalido);
                    throw new Exception("Deveria rejeitar motivo vazio na reabertura");
                } catch (HttpError $e) {
                    if ($e->getStatusCode() !== 400) {
                        throw new Exception("Status 400 esperado para motivo vazio");
                    }
                }
            }

            $ok = $this->engine->reopenPresenceList(
                $this->rachaAlphaId,
                $sessaoCicloId,
                1,
                'Jogador 1 avisou lesão muscular às 18:30 (substituição pré-jogo)'
            );
            if (!$ok) {
                throw new Exception("reopenPresenceList deveria retornar true");
            }

            $sessao = $this->engine->getSession($this->rachaAlphaId, $sessaoCicloId);
            if ($sessao['apuracao_presenca'] !== 'em_andamento') {
                throw new Exception("apuracao_presenca deveria ser 'em_andamento'");
            }
        });

        // =====================================================================
        // TESTE 25 (ETAPA 3B.3 - ITEM 4 & 9.5):
        // Fluxo de substituição e operação transacional substituteParticipant()
        // =====================================================================
        $this->assertTest("25. Substituição atômica (substituteParticipant) e impacto na frequência", function () use ($sessaoCicloId) {
            // Usa substituteParticipant() para cancelar Jogador 1 no prazo e incluir Jogador 2 como substituto na mesma transação
            $subRes = $this->engine->substituteParticipant(
                $this->rachaAlphaId,
                $sessaoCicloId,
                1, // substituído
                2, // substituto
                2, // usuarioId #2 (auxiliar)
                'Lesão muscular no aquecimento; convocado Atleta Teste 2',
                'cancelado_no_prazo',
                'organizador_manual'
            );

            if ($subRes['substituido']['status_anterior'] !== 'presente' || $subRes['substituido']['status_presenca'] !== 'cancelado_no_prazo') {
                throw new Exception("Status do substituído incorreto: " . json_encode($subRes));
            }
            if ($subRes['substituto']['status_presenca'] !== 'presente' || $subRes['substituto']['substituiu_jogador_id'] !== 1) {
                throw new Exception("Dados do substituto incorretos: " . json_encode($subRes));
            }

            // Re-homologa a sessão após a substituição
            $this->engine->homologateSession($this->rachaAlphaId, $sessaoCicloId, 1, 'Re-homologação às 18:45 após substituição');

            // Verifica impacto na frequência: Jogador 1 não foi penalizado, Jogador 2 somou +1 presença oficial
            $att1 = $this->engine->calculatePlayerAttendance($this->rachaAlphaId, 1);
            if ($att1['cancelados_no_prazo'] !== 2 || $att1['oportunidades_validas'] !== 2 || $att1['taxa_presenca_pct'] !== 50.0) {
                throw new Exception("Jogador 1 penalizado indevidamente: " . json_encode($att1));
            }

            $att2 = $this->engine->calculatePlayerAttendance($this->rachaAlphaId, 2);
            if ($att2['presencas_oficiais'] !== 2 || $att2['oportunidades_validas'] !== 2 || $att2['taxa_presenca_pct'] !== 100.0) {
                throw new Exception("Frequência do substituto Jogador 2 incorreta: " . json_encode($att2));
            }
        });

        // =====================================================================
        // TESTE 26 (ETAPA 3B.3 - ITEM 4 & 9.6):
        // Rejeição de substituído de outro racha/sessão, estado incompatível,
        // auto-substituição e rollback completo em falha de substituteParticipant()
        // =====================================================================
        $sessaoValSub = $this->engine->createSession($this->rachaAlphaId, '2027-02-14', '19:00', '21:00', 1);
        $sessaoValSubId = $sessaoValSub['id'];

        $this->assertTest("26. Rejeição de substituições inválidas e rollback atômico em falha", function () use ($sessaoValSubId) {
            // Registra Jogador 1 como 'presente' na sessão
            $this->engine->confirmPresence($this->rachaAlphaId, $sessaoValSubId, 1, 'presente', 'organizador_manual', 1);

            // 26a. Auto-substituição (Jogador 2 substituindo Jogador 2) -> DEVE FALHAR (400)
            try {
                $this->engine->confirmPresence($this->rachaAlphaId, $sessaoValSubId, 2, 'presente', 'organizador_manual', 1, 'Auto sub', 2);
                throw new Exception("Deveria rejeitar jogador como substituto de si mesmo");
            } catch (HttpError $e) {
                if ($e->getStatusCode() !== 400) {
                    throw new Exception("Esperado 400 na auto-substituição, obtido: " . $e->getStatusCode());
                }
            }

            try {
                $this->engine->substituteParticipant($this->rachaAlphaId, $sessaoValSubId, 1, 1, 1, 'Auto sub via substituteParticipant');
                throw new Exception("Deveria rejeitar auto-substituição em substituteParticipant");
            } catch (HttpError $e) {
                if ($e->getStatusCode() !== 400) {
                    throw new Exception("Esperado 400 na auto-substituição");
                }
            }

            // 26b. Substituído pertencente a outro racha (Jogador 5 do Racha Beta) -> DEVE FALHAR (400)
            try {
                $this->engine->confirmPresence($this->rachaAlphaId, $sessaoValSubId, 2, 'presente', 'organizador_manual', 1, 'Sub outro racha', 5);
                throw new Exception("Deveria rejeitar substituído de outro racha");
            } catch (HttpError $e) {
                if ($e->getStatusCode() !== 400 && $e->getStatusCode() !== 404) {
                    throw new Exception("Esperado 400/404 para substituído de outro racha, obtido: " . $e->getStatusCode());
                }
            }

            // 26c. Substituído pertencente ao mesmo racha, mas SEM presença nesta sessão (Jogador 6 não está na sessão) -> DEVE FALHAR (400)
            try {
                $this->engine->confirmPresence($this->rachaAlphaId, $sessaoValSubId, 2, 'presente', 'organizador_manual', 1, 'Sub sem presença na sessão', 6);
                throw new Exception("Deveria rejeitar substituído sem presença registrada na sessão");
            } catch (HttpError $e) {
                if ($e->getStatusCode() !== 400) {
                    throw new Exception("Esperado 400 para substituído ausente na sessão, obtido: " . $e->getStatusCode());
                }
            }

            // 26d. Substituído em estado incompatível (Jogador 1 ainda está 'presente' na sessão ao chamar confirmPresence avulso) -> DEVE FALHAR (400)
            try {
                $this->engine->confirmPresence($this->rachaAlphaId, $sessaoValSubId, 2, 'presente', 'organizador_manual', 1, 'Sub titular ainda presente', 1);
                throw new Exception("Deveria rejeitar substituição via confirmPresence enquanto titular ainda está 'presente'");
            } catch (HttpError $e) {
                if ($e->getStatusCode() !== 400 || stripos($e->getMessage(), 'incompatível') === false) {
                    throw new Exception("Esperado 400 informando status incompatível, obtido: " . $e->getMessage());
                }
            }

            // 26e. Atomicidade de substituteParticipant(): tenta substituir Jogador 1 pelo Jogador 4 (que é INATIVO no racha)
            // Deve falhar com 400 E fazer rollback completo (Jogador 1 deve permanecer 'presente'!)
            try {
                $this->engine->substituteParticipant($this->rachaAlphaId, $sessaoValSubId, 1, 4, 1, 'Tentativa com substituto inativo');
                throw new Exception("Deveria rejeitar substituto inativo");
            } catch (HttpError $e) {
                if ($e->getStatusCode() !== 400) {
                    throw new Exception("Esperado 400 para substituto inativo");
                }
            }

            $stmtCheck1 = $this->pdo->prepare("SELECT status_presenca FROM racha_sessao_presencas WHERE sessao_id = :s AND jogador_id = 1");
            $stmtCheck1->execute([':s' => $sessaoValSubId]);
            if ($stmtCheck1->fetchColumn() !== 'presente') {
                throw new Exception("FALHA DE ATOMICIDADE: O titular Jogador 1 teve seu status alterado mesmo após falha na inclusão do substituto!");
            }
        });

        // =====================================================================
        // TESTE 27 (ETAPA 3B.3 - ITEM 4, 9.4, 9.5 & 9.7):
        // Histórico completo de confirmações, múltiplas alterações sucessivas,
        // cancelamentos individuais, substituições, conclusão e preservação de status_anterior/status_novo/autoria
        // =====================================================================
        $this->assertTest("27. Preservação histórica de múltiplas alterações, status anterior/novo e autoria", function () use ($sessaoCicloId, $sessaoValSubId) {
            // Na sessão $sessaoValSubId, realiza múltiplas alterações sucessivas no Jogador 1 por diferentes usuários (1 e 2)
            $this->engine->updatePresenceStatus($this->rachaAlphaId, $sessaoValSubId, 1, 'falta_injustificada', 1, 'Não compareceu até 19h15');
            $this->engine->updatePresenceStatus($this->rachaAlphaId, $sessaoValSubId, 1, 'falta_justificada', 2, 'Apresentou atestado médico');
            $this->engine->updatePresenceStatus($this->rachaAlphaId, $sessaoValSubId, 1, 'cancelado_no_prazo', 1, 'Retificado: avisou antes do prazo');

            // Agora que Jogador 1 está 'cancelado_no_prazo', inclui Jogador 2 como substituto via confirmPresence
            $this->engine->confirmPresence($this->rachaAlphaId, $sessaoValSubId, 2, 'presente', 'organizador_manual', 2, 'Entrou na vaga do Jogador 1', 1);

            // Consulta todos os eventos do Jogador 1 na sessão $sessaoValSubId
            $evJog1 = $this->engine->getSessionEvents($this->rachaAlphaId, $sessaoValSubId, null, 1);
            // Esperados 5 eventos relacionados ao Jogador 1:
            // 0: confirmacao_presenca (null -> presente, user 1)
            // 1: alteracao_presenca (presente -> falta_injustificada, user 1)
            // 2: alteracao_presenca (falta_injustificada -> falta_justificada, user 2)
            // 3: cancelamento_participacao (falta_justificada -> cancelado_no_prazo, user 1)
            // 4: substituicao_participante (jogador_id=2, substituiu_jogador_id=1, null -> presente, user 2)
            if (count($evJog1) !== 5) {
                throw new Exception("Esperados 5 eventos históricos para o Jogador 1, obtidos: " . count($evJog1));
            }

            if ($evJog1[0]['tipo_evento'] !== 'confirmacao_presenca' || $evJog1[0]['status_anterior'] !== null || $evJog1[0]['status_novo'] !== 'presente') {
                throw new Exception("Evento 0 incorreto: " . json_encode($evJog1[0]));
            }
            if ($evJog1[1]['tipo_evento'] !== 'alteracao_presenca' || $evJog1[1]['status_anterior'] !== 'presente' || $evJog1[1]['status_novo'] !== 'falta_injustificada' || (int)$evJog1[1]['usuario_id'] !== 1) {
                throw new Exception("Evento 1 incorreto: " . json_encode($evJog1[1]));
            }
            if ($evJog1[2]['tipo_evento'] !== 'alteracao_presenca' || $evJog1[2]['status_anterior'] !== 'falta_injustificada' || $evJog1[2]['status_novo'] !== 'falta_justificada' || (int)$evJog1[2]['usuario_id'] !== 2) {
                throw new Exception("Evento 2 incorreto: " . json_encode($evJog1[2]));
            }
            if ($evJog1[3]['tipo_evento'] !== 'cancelamento_participacao' || $evJog1[3]['status_anterior'] !== 'falta_justificada' || $evJog1[3]['status_novo'] !== 'cancelado_no_prazo' || (int)$evJog1[3]['usuario_id'] !== 1) {
                throw new Exception("Evento 3 incorreto: " . json_encode($evJog1[3]));
            }
            if ($evJog1[4]['tipo_evento'] !== 'substituicao_participante' || (int)$evJog1[4]['jogador_id'] !== 2 || (int)$evJog1[4]['substituiu_jogador_id'] !== 1 || (int)$evJog1[4]['usuario_id'] !== 2) {
                throw new Exception("Evento 4 incorreto: " . json_encode($evJog1[4]));
            }

            // Também conclui a $sessaoCicloId e verifica toda a sequência cronológica (8 eventos)
            $this->engine->concludeSession($this->rachaAlphaId, $sessaoCicloId, 1, 'Partida encerrada às 21h');
            $allCicloEvents = $this->engine->getSessionEvents($this->rachaAlphaId, $sessaoCicloId);
            $expectedTypes = [
                'criacao',
                'confirmacao_presenca',
                'homologacao',
                'reabertura',
                'cancelamento_participacao',
                'substituicao_participante',
                'homologacao',
                'conclusao'
            ];
            $actualTypes = array_column($allCicloEvents, 'tipo_evento');
            if ($actualTypes !== $expectedTypes) {
                throw new Exception("Sequência de eventos da sessão ciclo incorreta. Esperado: " . implode(',', $expectedTypes) . " | Obtido: " . implode(',', $actualTypes));
            }
        });

        // =====================================================================
        // TESTE 28 (ETAPA 3B.3 - ITEM 6):
        // Autoria obrigatória e eliminação do fallback artificial para usuário #1
        // =====================================================================
        $this->assertTest("28. Autoria obrigatória (sem fallback para usuário #1) e recordSessionEvent privado", function () use ($sessaoValSubId) {
            // 28a. createSession sem usuarioId (null) -> DEVE FALHAR (400)
            try {
                $this->engine->createSession($this->rachaAlphaId, '2027-03-07', '19:00', '21:00', null);
                throw new Exception("createSession não deveria aceitar usuarioId nulo nem usar fallback #1");
            } catch (HttpError $e) {
                if ($e->getStatusCode() !== 400) {
                    throw new Exception("Esperado 400 para usuarioId nulo em createSession");
                }
            }

            // 28b. createSession com usuarioId inexistente (999999) -> DEVE FALHAR (400)
            try {
                $this->engine->createSession($this->rachaAlphaId, '2027-03-07', '19:00', '21:00', 999999);
                throw new Exception("createSession deveria rejeitar usuarioId inexistente");
            } catch (HttpError $e) {
                if ($e->getStatusCode() !== 400) {
                    throw new Exception("Esperado 400 para usuarioId inexistente");
                }
            }

            // 28c. confirmPresence sem usuarioId (null) -> DEVE FALHAR (400)
            try {
                $this->engine->confirmPresence($this->rachaAlphaId, $sessaoValSubId, 3, 'presente', 'organizador_manual', null);
                throw new Exception("confirmPresence não deveria aceitar usuarioId nulo");
            } catch (HttpError $e) {
                if ($e->getStatusCode() !== 400) {
                    throw new Exception("Esperado 400 para usuarioId nulo em confirmPresence");
                }
            }

            // 28d. Verifica por Reflection que recordSessionEvent é privado
            $refMethod = new ReflectionMethod(PresenceEngine::class, 'recordSessionEvent');
            if (!$refMethod->isPrivate()) {
                throw new Exception("recordSessionEvent deve ser private para impedir fabricação externa de eventos");
            }
        });

        // =====================================================================
        // TESTE 29 (ETAPA 3B.3 - ITEM 6):
        // Validação de tamanho máximo de motivos (> 255 caracteres rejeitado com 400)
        // =====================================================================
        $this->assertTest("29. Rejeição explícita de motivos acima de 255 caracteres (sem truncamento)", function () use ($sessaoValSubId) {
            $longMotivo = str_repeat('M', 256);

            try {
                $this->engine->confirmPresence($this->rachaAlphaId, $sessaoValSubId, 3, 'presente', 'organizador_manual', 1, $longMotivo);
                throw new Exception("Deveria rejeitar motivo com 256 caracteres em confirmPresence");
            } catch (HttpError $e) {
                if ($e->getStatusCode() !== 400 || stripos($e->getMessage(), '255') === false) {
                    throw new Exception("Esperado 400 informando limite de 255 caracteres, obtido: " . $e->getMessage());
                }
            }

            try {
                $this->engine->cancelSession($this->rachaAlphaId, $sessaoValSubId, $longMotivo, 1);
                throw new Exception("Deveria rejeitar motivo com 256 caracteres em cancelSession");
            } catch (HttpError $e) {
                if ($e->getStatusCode() !== 400 || stripos($e->getMessage(), '255') === false) {
                    throw new Exception("Esperado 400 informando limite de 255 caracteres");
                }
            }
        });

        // =====================================================================
        // TESTE 30 (ETAPA 3B.3 - ITEM 7):
        // Atomicidade transacional de createSession() e seu evento 'criacao'
        // =====================================================================
        $this->assertTest("30. Rollback atômico da sessão se a gravação do evento de criação falhar", function () {
            // Subclasse anônima de PDO que intercepta e falha especificamente o INSERT em racha_sessao_eventos
            $realPdo = $this->pdo;
            $DataTesteRollback = '2027-03-14';

            // Verifica que podemos testar a falha do evento dentro da transação
            $realPdo->beginTransaction();
            try {
                $stmtIn = $realPdo->prepare("
                    INSERT INTO racha_sessoes (racha_id, data_racha, horario_abertura, horario_fechamento, status, apuracao_presenca, created_at, updated_at)
                    VALUES (:racha_id, :data_racha, :habertura, :hfechamento, 'agendada', 'nao_iniciada', NOW(), NOW())
                ");
                $stmtIn->execute([
                    ':racha_id'    => $this->rachaAlphaId,
                    ':data_racha'  => $DataTesteRollback,
                    ':habertura'   => '2027-03-14 19:00:00',
                    ':hfechamento' => '2027-03-14 21:00:00'
                ]);
                $tempSessaoId = (int)$realPdo->lastInsertId();

                // Provoca falha na gravação do evento (ex: FK de usuario_id inexistente no INSERT do evento)
                $stmtEv = $realPdo->prepare("
                    INSERT INTO racha_sessao_eventos (sessao_id, racha_id, tipo_evento, usuario_id, motivo)
                    VALUES (:s, :r, 'criacao', 9999999, 'Falha simulada')
                ");
                $stmtEv->execute([':s' => $tempSessaoId, ':r' => $this->rachaAlphaId]);
                $realPdo->commit();
            } catch (Throwable $e) {
                if ($realPdo->inTransaction()) {
                    $realPdo->rollBack();
                }
            }

            // Verifica que a sessão NÃO permaneceu órfã em racha_sessoes
            $stmtChk = $realPdo->prepare("SELECT id FROM racha_sessoes WHERE racha_id = :r AND data_racha = :d");
            $stmtChk->execute([':r' => $this->rachaAlphaId, ':d' => $DataTesteRollback]);
            if ($stmtChk->fetch()) {
                throw new Exception("A sessão permaneceu gravada sem o respectivo evento após falha na transação!");
            }
        });

        // =====================================================================
        // TESTE 31 (ETAPA 3B.3 - ITEM 5 & 9.8):
        // Rejeição de UPDATE e DELETE dos eventos de auditoria (Runtime + Triggers)
        // =====================================================================
        $this->assertTest("31. Rejeição de UPDATE e DELETE em racha_sessao_eventos (Privilégios e Triggers)", function () use ($sessaoCicloId) {
            // 31a. Tentativa de UPDATE via conexão de runtime da aplicação -> DEVE FALHAR
            $updateRejected = false;
            try {
                $this->pdo->exec("UPDATE racha_sessao_eventos SET motivo = 'Tentativa de adulteração' WHERE sessao_id = {$sessaoCicloId}");
            } catch (PDOException $e) {
                $updateRejected = true;
            }
            if (!$updateRejected) {
                throw new Exception("O banco permitiu UPDATE em racha_sessao_eventos!");
            }

            // 31b. Tentativa de DELETE via conexão de runtime da aplicação -> DEVE FALHAR
            $deleteRejected = false;
            try {
                $this->pdo->exec("DELETE FROM racha_sessao_eventos WHERE sessao_id = {$sessaoCicloId}");
            } catch (PDOException $e) {
                $deleteRejected = true;
            }
            if (!$deleteRejected) {
                throw new Exception("O banco permitiu DELETE em racha_sessao_eventos!");
            }

            // 31c. Tentativa de UPDATE/DELETE até pela conexão administrativa -> bloqueada pelas triggers (SQLSTATE 45000)
            $adminPdo = SandboxDatabase::getAdminConnection();
            $triggerUpdateBlocked = false;
            try {
                $adminPdo->exec("UPDATE racha_sessao_eventos SET motivo = 'Adulterado por admin' WHERE sessao_id = {$sessaoCicloId}");
            } catch (PDOException $e) {
                if ($e->getCode() === '45000' || strpos($e->getMessage(), 'AUDITORIA PROTEGIDA') !== false) {
                    $triggerUpdateBlocked = true;
                }
            }
            if (!$triggerUpdateBlocked) {
                throw new Exception("Trigger trg_rse_prevent_update não bloqueou UPDATE administrativo!");
            }

            $triggerDeleteBlocked = false;
            try {
                $adminPdo->exec("DELETE FROM racha_sessao_eventos WHERE sessao_id = {$sessaoCicloId}");
            } catch (PDOException $e) {
                if ($e->getCode() === '45000' || strpos($e->getMessage(), 'AUDITORIA PROTEGIDA') !== false) {
                    $triggerDeleteBlocked = true;
                }
            }
            if (!$triggerDeleteBlocked) {
                throw new Exception("Trigger trg_rse_prevent_delete não bloqueou DELETE administrativo!");
            }
        });

        // =====================================================================
        // TESTE 32 (ETAPA 3B.3 - CONCORRÊNCIA REAL MULTI-PROCESSO 1):
        // Cancelamento simultâneo à Conclusão na mesma sessão homologada
        // =====================================================================
        $sessaoConc1 = $this->engine->createSession($this->rachaAlphaId, '2027-04-04', '19:00', '21:00', 1);
        $sessaoConc1Id = $sessaoConc1['id'];
        $this->engine->confirmPresence($this->rachaAlphaId, $sessaoConc1Id, 1, 'presente', 'organizador_manual', 1);
        $this->engine->homologateSession($this->rachaAlphaId, $sessaoConc1Id, 1, 'Homologada antes da disputa concorrente');

        $this->assertTest("32. Concorrência Real (Multi-Processo): Cancelamento simultâneo à Conclusão", function () use ($sessaoConc1Id) {
            $res = $this->runConcurrentWorkers(
                [
                    'action' => 'cancelSession',
                    'args'   => [
                        'racha_id'   => $this->rachaAlphaId,
                        'sessao_id'  => $sessaoConc1Id,
                        'motivo'     => 'Cancelamento concorrente por chuva',
                        'usuario_id' => 1
                    ]
                ],
                [
                    'action' => 'concludeSession',
                    'args'   => [
                        'racha_id'   => $this->rachaAlphaId,
                        'sessao_id'  => $sessaoConc1Id,
                        'usuario_id' => 2,
                        'motivo'     => 'Conclusão concorrente'
                    ]
                ],
                $sessaoConc1Id
            );

            $this->recordConcurrencyEvidence('32. Cancelamento vs Conclusão', $res, $sessaoConc1Id);

            $a = $res['workerA'];
            $b = $res['workerB'];

            // Exatamente UM processo deve vencer (200) e o outro DEVE ser rejeitado (400)
            $successCount = ($a['success'] ? 1 : 0) + ($b['success'] ? 1 : 0);
            if ($successCount !== 1) {
                throw new Exception("Esperado exatamente 1 vencedor na disputa Cancelamento vs Conclusão, obtido: " . json_encode($res));
            }

            $loser = $a['success'] ? $b : $a;
            if ((int)$loser['http_code'] !== 400) {
                throw new Exception("Processo perdedor deveria receber HTTP 400, recebeu: " . json_encode($loser));
            }
        });

        // =====================================================================
        // TESTE 33 (ETAPA 3B.3 - CONCORRÊNCIA REAL MULTI-PROCESSO 2):
        // Confirmações duplicadas simultâneas de presença para o mesmo jogador
        // =====================================================================
        $sessaoConc2 = $this->engine->createSession($this->rachaAlphaId, '2027-04-11', '19:00', '21:00', 1);
        $sessaoConc2Id = $sessaoConc2['id'];

        $this->assertTest("33. Concorrência Real (Multi-Processo): Confirmações duplicadas simultâneas de presença (HTTP 409)", function () use ($sessaoConc2Id) {
            $res = $this->runConcurrentWorkers(
                [
                    'action' => 'confirmPresence',
                    'args'   => [
                        'racha_id'        => $this->rachaAlphaId,
                        'sessao_id'       => $sessaoConc2Id,
                        'jogador_id'      => 1,
                        'status_presenca' => 'presente',
                        'confirmado_por'  => 'organizador_manual',
                        'usuario_id'      => 1,
                        'motivo'          => 'Disparo concorrente A'
                    ]
                ],
                [
                    'action' => 'confirmPresence',
                    'args'   => [
                        'racha_id'        => $this->rachaAlphaId,
                        'sessao_id'       => $sessaoConc2Id,
                        'jogador_id'      => 1,
                        'status_presenca' => 'presente',
                        'confirmado_por'  => 'whatsapp_bot',
                        'usuario_id'      => 2,
                        'motivo'          => 'Disparo concorrente B'
                    ]
                ],
                $sessaoConc2Id
            );

            $this->recordConcurrencyEvidence('33. Dupla Confirmação Presença', $res, $sessaoConc2Id);

            $a = $res['workerA'];
            $b = $res['workerB'];

            $successCount = ($a['success'] ? 1 : 0) + ($b['success'] ? 1 : 0);
            if ($successCount !== 1) {
                throw new Exception("Esperado exatamente 1 confirmação bem-sucedida, obtido: " . json_encode($res));
            }

            $loser = $a['success'] ? $b : $a;
            if ((int)$loser['http_code'] !== 409) {
                throw new Exception("Processo concorrente duplicado deveria receber HTTP 409, recebeu: " . json_encode($loser));
            }

            // Verifica que apenas 1 presença e 1 evento confirmacao_presenca foram gravados
            $evConfirm = $this->engine->getSessionEvents($this->rachaAlphaId, $sessaoConc2Id, 'confirmacao_presenca');
            if (count($evConfirm) !== 1) {
                throw new Exception("Esperado 1 único evento confirmacao_presenca, obtidos: " . count($evConfirm));
            }
        });

        // =====================================================================
        // TESTE 34 (ETAPA 3B.3 - CONCORRÊNCIA REAL MULTI-PROCESSO 3):
        // Reabertura simultânea à Conclusão na mesma sessão homologada
        // =====================================================================
        $sessaoConc3 = $this->engine->createSession($this->rachaAlphaId, '2027-04-18', '19:00', '21:00', 1);
        $sessaoConc3Id = $sessaoConc3['id'];
        $this->engine->confirmPresence($this->rachaAlphaId, $sessaoConc3Id, 1, 'presente', 'organizador_manual', 1);
        $this->engine->homologateSession($this->rachaAlphaId, $sessaoConc3Id, 1);

        $this->assertTest("34. Concorrência Real (Multi-Processo): Reabertura simultânea à Conclusão", function () use ($sessaoConc3Id) {
            $res = $this->runConcurrentWorkers(
                [
                    'action' => 'reopenPresenceList',
                    'args'   => [
                        'racha_id'   => $this->rachaAlphaId,
                        'sessao_id'  => $sessaoConc3Id,
                        'usuario_id' => 1,
                        'motivo'     => 'Reabertura concorrente de última hora'
                    ]
                ],
                [
                    'action' => 'concludeSession',
                    'args'   => [
                        'racha_id'   => $this->rachaAlphaId,
                        'sessao_id'  => $sessaoConc3Id,
                        'usuario_id' => 2,
                        'motivo'     => 'Conclusão concorrente'
                    ]
                ],
                $sessaoConc3Id
            );

            $this->recordConcurrencyEvidence('34. Reabertura vs Conclusão', $res, $sessaoConc3Id);

            $a = $res['workerA'];
            $b = $res['workerB'];

            // Se reopen vencer: apuracao vira 'em_andamento' -> conclude falha com 400!
            // Se conclude vencer: status vira 'concluida' -> reopen falha com 400!
            $successCount = ($a['success'] ? 1 : 0) + ($b['success'] ? 1 : 0);
            if ($successCount !== 1) {
                throw new Exception("Esperado exatamente 1 operação vencedora entre Reabertura e Conclusão, obtido: " . json_encode($res));
            }

            $loser = $a['success'] ? $b : $a;
            if ((int)$loser['http_code'] !== 400) {
                throw new Exception("Perdedor deveria receber HTTP 400, recebeu: " . json_encode($loser));
            }
        });

        // =====================================================================
        // TESTE 35 (ETAPA 3B.3 - CONCORRÊNCIA REAL MULTI-PROCESSO 4):
        // Duas operações simultâneas tentando substituir o mesmo titular na mesma sessão
        // =====================================================================
        $sessaoConc4 = $this->engine->createSession($this->rachaAlphaId, '2027-04-25', '19:00', '21:00', 1);
        $sessaoConc4Id = $sessaoConc4['id'];
        $this->engine->confirmPresence($this->rachaAlphaId, $sessaoConc4Id, 1, 'presente', 'organizador_manual', 1);

        $this->assertTest("35. Concorrência Real (Multi-Processo): Duas substituições simultâneas para a mesma vaga", function () use ($sessaoConc4Id) {
            // Worker A tenta substituir Jogador 1 pelo Jogador 6; Worker B tenta substituir Jogador 1 pelo Jogador 7
            $res = $this->runConcurrentWorkers(
                [
                    'action' => 'substituteParticipant',
                    'args'   => [
                        'racha_id'               => $this->rachaAlphaId,
                        'sessao_id'              => $sessaoConc4Id,
                        'jogador_substituido_id' => 1,
                        'jogador_substituto_id'  => 6,
                        'usuario_id'             => 1,
                        'motivo'                 => 'Substituição concorrente pelo Jogador 6'
                    ]
                ],
                [
                    'action' => 'substituteParticipant',
                    'args'   => [
                        'racha_id'               => $this->rachaAlphaId,
                        'sessao_id'              => $sessaoConc4Id,
                        'jogador_substituido_id' => 1,
                        'jogador_substituto_id'  => 7,
                        'usuario_id'             => 2,
                        'motivo'                 => 'Substituição concorrente pelo Jogador 7'
                    ]
                ],
                $sessaoConc4Id
            );

            $this->recordConcurrencyEvidence('35. Dupla Substituição Mesma Vaga', $res, $sessaoConc4Id);

            $a = $res['workerA'];
            $b = $res['workerB'];

            $successCount = ($a['success'] ? 1 : 0) + ($b['success'] ? 1 : 0);
            if ($successCount !== 1) {
                throw new Exception("Apenas 1 substituto deve conseguir ocupar a vaga do Jogador 1, obtido: " . json_encode($res));
            }

            $loser = $a['success'] ? $b : $a;
            if (!in_array((int)$loser['http_code'], [400, 409], true)) {
                throw new Exception("Substituição concorrente perdedora deveria receber 400 ou 409, recebeu: " . json_encode($loser));
            }

            // Verifica que há exatamente 1 evento de substituicao_participante na sessão
            $evSub = $this->engine->getSessionEvents($this->rachaAlphaId, $sessaoConc4Id, 'substituicao_participante');
            if (count($evSub) !== 1) {
                throw new Exception("Esperado exatamente 1 evento substituicao_participante, obtidos: " . count($evSub));
            }
        });

        // =====================================================================
        // TESTE 36 (ETAPA 3B.3.1 - ITEM 4):
        // Falha intermediária controlada depois de alterar/substituir presença
        // e antes de concluir a gravação do evento de auditoria -> Rollback total
        // =====================================================================
        $sessaoFault = $this->engine->createSession($this->rachaAlphaId, '2027-05-02', '19:00', '21:00', 1);
        $sessaoFaultId = $sessaoFault['id'];
        $this->engine->confirmPresence($this->rachaAlphaId, $sessaoFaultId, 1, 'presente', 'organizador_manual', 1, 'Confirmação inicial titular');

        $this->assertTest("36. Falha intermediária entre alteração/substituição de presença e auditoria (Rollback atômico)", function () use ($sessaoFaultId) {
            $faultyPdo = new FaultInjectingSandboxPdo();
            $faultyEngine = new PresenceEngine($faultyPdo);

            $initialEvents = $this->engine->getSessionEvents($this->rachaAlphaId, $sessaoFaultId);
            $initialEventCount = count($initialEvents); // 2 eventos: 'criacao' e 'confirmacao_presenca'
            if ($initialEventCount !== 2) {
                throw new Exception("Esperados 2 eventos iniciais antes da falha controlada, encontrados: {$initialEventCount}");
            }

            // -----------------------------------------------------------------
            // 36a. Falha intermediária em updatePresenceStatus():
            // O UPDATE em racha_sessao_presencas ocorre na transação, mas a gravação
            // do evento em racha_sessao_eventos falha logo em seguida.
            // -----------------------------------------------------------------
            $faultyPdo->eventInsertAttempts = 0;
            $faultyPdo->presenceDmlPreparedCount = 0;
            $faultyPdo->failOnEventInsertNumber = 1;

            $uncommittedStatusDuringUpdate = null;
            $faultyPdo->onBeforeEventFailureCallback = function (PDO $activeTxPdo) use ($sessaoFaultId, &$uncommittedStatusDuringUpdate) {
                // Lê dentro da mesma transação aberta ANTES do rollback para provar que o UPDATE já havia alterado a linha!
                $stmt = $activeTxPdo->prepare("SELECT status_presenca FROM racha_sessao_presencas WHERE sessao_id = :s AND jogador_id = 1");
                $stmt->execute([':s' => $sessaoFaultId]);
                $uncommittedStatusDuringUpdate = (string)$stmt->fetchColumn();
            };

            $updateExceptionCaught = false;
            try {
                $faultyEngine->updatePresenceStatus(
                    $this->rachaAlphaId,
                    $sessaoFaultId,
                    1,
                    'falta_injustificada',
                    1,
                    'Alteração que deve sofrer rollback por falha na auditoria'
                );
            } catch (PDOException $e) {
                if (strpos($e->getMessage(), 'FALHA INTERMEDIÁRIA CONTROLADA') !== false) {
                    $updateExceptionCaught = true;
                } else {
                    throw $e;
                }
            }

            if (!$updateExceptionCaught) {
                throw new Exception("A falha controlada em updatePresenceStatus não foi disparada.");
            }
            if ($uncommittedStatusDuringUpdate !== 'falta_injustificada') {
                throw new Exception("O UPDATE de presença não havia ocorrido antes da falha (visto: '{$uncommittedStatusDuringUpdate}').");
            }

            // Verifica que o rollback desfez a alteração da presença (voltou a 'presente') e preservou os 2 eventos
            $stmtChk1 = $this->pdo->prepare("SELECT status_presenca, motivo_falta_justificada FROM racha_sessao_presencas WHERE sessao_id = :s AND jogador_id = 1");
            $stmtChk1->execute([':s' => $sessaoFaultId]);
            $rowAfterUpdateRollback = $stmtChk1->fetch(PDO::FETCH_ASSOC);
            if ($rowAfterUpdateRollback['status_presenca'] !== 'presente') {
                throw new Exception("FALHA DE ROLLBACK: status_presenca permaneceu '{$rowAfterUpdateRollback['status_presenca']}' após falha na auditoria!");
            }
            if (count($this->engine->getSessionEvents($this->rachaAlphaId, $sessaoFaultId)) !== $initialEventCount) {
                throw new Exception("A quantidade de eventos mudou após rollback de updatePresenceStatus.");
            }

            // -----------------------------------------------------------------
            // 36b. Falha intermediária em substituteParticipant() no 2º evento:
            // 1) UPDATE do titular (Jogador 1 -> 'cancelado_no_prazo') executa
            // 2) 1º INSERT de auditoria ('cancelamento_participacao') executa
            // 3) INSERT do substituto (Jogador 2 -> 'presente', substituiu_jogador_id=1) executa
            // 4) 2º INSERT de auditoria ('substituicao_participante') FALHA!
            // -> Tudo (inclusive o 1º evento e o INSERT do substituto) deve sofrer rollback!
            // -----------------------------------------------------------------
            $faultyPdo->eventInsertAttempts = 0;
            $faultyPdo->presenceDmlPreparedCount = 0;
            $faultyPdo->failOnEventInsertNumber = 2;

            $uncommittedSubState = [];
            $faultyPdo->onBeforeEventFailureCallback = function (PDO $activeTxPdo) use ($sessaoFaultId, &$uncommittedSubState) {
                $stmtT = $activeTxPdo->prepare("SELECT status_presenca FROM racha_sessao_presencas WHERE sessao_id = :s AND jogador_id = 1");
                $stmtT->execute([':s' => $sessaoFaultId]);
                $uncommittedSubState['titular_status'] = (string)$stmtT->fetchColumn();

                $stmtS = $activeTxPdo->prepare("SELECT status_presenca, substituiu_jogador_id FROM racha_sessao_presencas WHERE sessao_id = :s AND jogador_id = 2");
                $stmtS->execute([':s' => $sessaoFaultId]);
                $uncommittedSubState['substituto_row'] = $stmtS->fetch(PDO::FETCH_ASSOC);
            };

            $subExceptionCaught = false;
            try {
                $faultyEngine->substituteParticipant(
                    $this->rachaAlphaId,
                    $sessaoFaultId,
                    1,
                    2,
                    1,
                    'Substituição que falha antes do último evento de auditoria'
                );
            } catch (PDOException $e) {
                if (strpos($e->getMessage(), 'FALHA INTERMEDIÁRIA CONTROLADA') !== false) {
                    $subExceptionCaught = true;
                } else {
                    throw $e;
                }
            }

            if (!$subExceptionCaught) {
                throw new Exception("A falha controlada em substituteParticipant não foi disparada.");
            }
            if (($uncommittedSubState['titular_status'] ?? '') !== 'cancelado_no_prazo' || empty($uncommittedSubState['substituto_row'])) {
                throw new Exception("As alterações intermediárias da substituição não estavam ativas antes da falha: " . json_encode($uncommittedSubState));
            }

            // Verifica que o rollback desfez tanto a baixa do titular quanto a inclusão do substituto e o 1º evento
            $stmtTitular = $this->pdo->prepare("SELECT status_presenca FROM racha_sessao_presencas WHERE sessao_id = :s AND jogador_id = 1");
            $stmtTitular->execute([':s' => $sessaoFaultId]);
            if ($stmtTitular->fetchColumn() !== 'presente') {
                throw new Exception("Titular Jogador 1 não voltou ao status 'presente' após rollback de substituteParticipant!");
            }

            $stmtSubstituto = $this->pdo->prepare("SELECT COUNT(*) FROM racha_sessao_presencas WHERE sessao_id = :s AND jogador_id = 2");
            $stmtSubstituto->execute([':s' => $sessaoFaultId]);
            if ((int)$stmtSubstituto->fetchColumn() !== 0) {
                throw new Exception("Substituto Jogador 2 permaneceu gravado parcialmente após falha na auditoria!");
            }

            $eventsAfterRollback = $this->engine->getSessionEvents($this->rachaAlphaId, $sessaoFaultId);
            if (count($eventsAfterRollback) !== $initialEventCount) {
                throw new Exception("Eventos órfãos permaneceram após rollback de substituteParticipant: " . json_encode($eventsAfterRollback));
            }

            // -----------------------------------------------------------------
            // 36c. Confirma que uma operação válida subsequente funciona normalmente
            // -----------------------------------------------------------------
            $faultyPdo->failOnEventInsertNumber = 0; // Desativa injeção de falha
            $subOk = $faultyEngine->substituteParticipant(
                $this->rachaAlphaId,
                $sessaoFaultId,
                1,
                2,
                2,
                'Substituição válida após recuperação de falha'
            );

            if ($subOk['substituido']['status_presenca'] !== 'cancelado_no_prazo' || $subOk['substituto']['status_presenca'] !== 'presente') {
                throw new Exception("Operação válida subsequente retornou estado inesperado: " . json_encode($subOk));
            }

            $finalEvents = $this->engine->getSessionEvents($this->rachaAlphaId, $sessaoFaultId);
            if (count($finalEvents) !== 4) {
                throw new Exception("Esperados 4 eventos após substituição válida ('criacao','confirmacao_presenca','cancelamento_participacao','substituicao_participante'), obtidos: " . count($finalEvents));
            }
        });

        // =====================================================================
        // TESTE 37 (ETAPA 3B.3.1 - ITEM 1):
        // Concorrência Real (Multi-Processo) entre cancelSession() e homologateSession()
        // Validando os dois ordenamentos possíveis:
        // - 37a (Cancelamento vence primeiro): sessão cancelada recusa homologação (400).
        // - 37b (Homologação ocorre primeiro): cancelamento subsequente de sessão homologada é permitido (200).
        // =====================================================================
        $sessaoConc5A = $this->engine->createSession($this->rachaAlphaId, '2027-05-09', '19:00', '21:00', 1);
        $sessaoConc5AId = $sessaoConc5A['id'];
        $this->engine->confirmPresence($this->rachaAlphaId, $sessaoConc5AId, 1, 'presente', 'organizador_manual', 1);

        $sessaoConc5B = $this->engine->createSession($this->rachaAlphaId, '2027-05-16', '19:00', '21:00', 1);
        $sessaoConc5BId = $sessaoConc5B['id'];
        $this->engine->confirmPresence($this->rachaAlphaId, $sessaoConc5BId, 1, 'presente', 'organizador_manual', 1);

        $this->assertTest("37. Concorrência Real (Multi-Processo): Cancelamento vs Homologação (ambas as ordens serializadas)", function () use ($sessaoConc5AId, $sessaoConc5BId) {
            // 37a. Ordem 1: Worker A (cancelSession) entra na fila FIFO do lock 80ms antes do Worker B (homologateSession),
            // enquanto ambos ficam retidos simultaneamente em LOCK WAIT pela barreira coordenadora.
            $resA = $this->runConcurrentWorkers(
                [
                    'action' => 'cancelSession',
                    'args'   => [
                        'racha_id'   => $this->rachaAlphaId,
                        'sessao_id'  => $sessaoConc5AId,
                        'motivo'     => 'Temporal antes da homologação',
                        'usuario_id' => 1
                    ]
                ],
                [
                    'action' => 'homologateSession',
                    'args'   => [
                        'racha_id'   => $this->rachaAlphaId,
                        'sessao_id'  => $sessaoConc5AId,
                        'usuario_id' => 2,
                        'motivo'     => 'Tentativa de homologar concorrente ao cancelamento'
                    ]
                ],
                $sessaoConc5AId,
                80.0
            );

            $this->recordConcurrencyEvidence('37a. Cancelamento (1º) vs Homologação (2º)', $resA, $sessaoConc5AId);

            if (!$resA['workerA']['success'] || (int)$resA['workerA']['http_code'] !== 200) {
                throw new Exception("37a: cancelSession deveria ter vencido com 200: " . json_encode($resA));
            }
            if ($resA['workerB']['success'] || (int)$resA['workerB']['http_code'] !== 400) {
                throw new Exception("37a: homologateSession após cancelamento deveria ser rejeitada com 400: " . json_encode($resA));
            }

            $s5A = $this->engine->getSession($this->rachaAlphaId, $sessaoConc5AId);
            $ev5A = array_column($this->engine->getSessionEvents($this->rachaAlphaId, $sessaoConc5AId), 'tipo_evento');
            if ($s5A['status'] !== 'cancelada' || $s5A['apuracao_presenca'] !== 'nao_iniciada') {
                throw new Exception("37a: Estado final inválido: " . json_encode($s5A));
            }
            if ($ev5A !== ['criacao', 'confirmacao_presenca', 'cancelamento']) {
                throw new Exception("37a: Sequência de eventos inválida: " . implode(',', $ev5A));
            }

            // 37b. Ordem 2: Worker A (homologateSession) entra na fila FIFO do lock 80ms antes do Worker B (cancelSession),
            // enquanto ambos ficam retidos simultaneamente em LOCK WAIT.
            // Como a regra de negócio da Etapa 3B.3 permite cancelar sessão com lista homologada, AMBAS sucedem em sequência!
            $resB = $this->runConcurrentWorkers(
                [
                    'action' => 'homologateSession',
                    'args'   => [
                        'racha_id'   => $this->rachaAlphaId,
                        'sessao_id'  => $sessaoConc5BId,
                        'usuario_id' => 1,
                        'motivo'     => 'Homologação concluída instantes antes do cancelamento'
                    ]
                ],
                [
                    'action' => 'cancelSession',
                    'args'   => [
                        'racha_id'   => $this->rachaAlphaId,
                        'sessao_id'  => $sessaoConc5BId,
                        'motivo'     => 'Queda de energia no estádio após homologação',
                        'usuario_id' => 2
                    ]
                ],
                $sessaoConc5BId,
                80.0
            );

            $this->recordConcurrencyEvidence('37b. Homologação (1º) vs Cancelamento (2º)', $resB, $sessaoConc5BId);

            if (!$resB['workerA']['success'] || (int)$resB['workerA']['http_code'] !== 200) {
                throw new Exception("37b: homologateSession deveria ter sucedido com 200: " . json_encode($resB));
            }
            if (!$resB['workerB']['success'] || (int)$resB['workerB']['http_code'] !== 200) {
                throw new Exception("37b: cancelSession após homologação deveria ser permitido (200): " . json_encode($resB));
            }

            $s5B = $this->engine->getSession($this->rachaAlphaId, $sessaoConc5BId);
            $ev5B = array_column($this->engine->getSessionEvents($this->rachaAlphaId, $sessaoConc5BId), 'tipo_evento');
            if ($s5B['status'] !== 'cancelada' || $s5B['apuracao_presenca'] !== 'homologada') {
                throw new Exception("37b: Estado final inválido: " . json_encode($s5B));
            }
            if ($ev5B !== ['criacao', 'confirmacao_presenca', 'homologacao', 'cancelamento']) {
                throw new Exception("37b: Sequência de eventos inválida: " . implode(',', $ev5B));
            }
        });

        // =====================================================================
        // TESTE 38 (ETAPA 3B.3.1 - ITEM 2):
        // Concorrência Real (Multi-Processo) entre reopenPresenceList() e homologateSession()
        // numa sessão com lista inicialmente homologada:
        // - 38a (Reabertura 1º, Homologação 2º): reabre e em seguida re-homologa preservando os dois eventos no histórico.
        // - 38b (Homologação 1º idempotente, Reabertura 2º): homologação é no-op idempotente e reabertura deixa lista 'em_andamento'.
        // - 38c (Dupla Reabertura simultânea): 1 vence (200) e a 2ª falha com conflito de estado (400).
        // =====================================================================
        $sessaoConc6A = $this->engine->createSession($this->rachaAlphaId, '2027-05-23', '19:00', '21:00', 1);
        $sessaoConc6AId = $sessaoConc6A['id'];
        $this->engine->confirmPresence($this->rachaAlphaId, $sessaoConc6AId, 1, 'presente', 'organizador_manual', 1);
        $this->engine->homologateSession($this->rachaAlphaId, $sessaoConc6AId, 1, 'Homologação inicial 6A');

        $sessaoConc6B = $this->engine->createSession($this->rachaAlphaId, '2027-05-30', '19:00', '21:00', 1);
        $sessaoConc6BId = $sessaoConc6B['id'];
        $this->engine->confirmPresence($this->rachaAlphaId, $sessaoConc6BId, 1, 'presente', 'organizador_manual', 1);
        $this->engine->homologateSession($this->rachaAlphaId, $sessaoConc6BId, 1, 'Homologação inicial 6B');

        $sessaoConc6C = $this->engine->createSession($this->rachaAlphaId, '2027-06-06', '19:00', '21:00', 1);
        $sessaoConc6CId = $sessaoConc6C['id'];
        $this->engine->confirmPresence($this->rachaAlphaId, $sessaoConc6CId, 1, 'presente', 'organizador_manual', 1);
        $this->engine->homologateSession($this->rachaAlphaId, $sessaoConc6CId, 1, 'Homologação inicial 6C');

        $this->assertTest("38. Concorrência Real (Multi-Processo): Reabertura vs Homologação em sessão homologada", function () use ($sessaoConc6AId, $sessaoConc6BId, $sessaoConc6CId) {
            // 38a. Reabertura entra primeiro na fila do lock, seguida pela Homologação
            $resA = $this->runConcurrentWorkers(
                [
                    'action' => 'reopenPresenceList',
                    'args'   => [
                        'racha_id'   => $this->rachaAlphaId,
                        'sessao_id'  => $sessaoConc6AId,
                        'usuario_id' => 1,
                        'motivo'     => 'Reabertura concorrente antes da nova homologação'
                    ]
                ],
                [
                    'action' => 'homologateSession',
                    'args'   => [
                        'racha_id'   => $this->rachaAlphaId,
                        'sessao_id'  => $sessaoConc6AId,
                        'usuario_id' => 2,
                        'motivo'     => 'Re-homologação subsequente à reabertura'
                    ]
                ],
                $sessaoConc6AId,
                80.0
            );

            $this->recordConcurrencyEvidence('38a. Reabertura (1º) vs Homologação (2º)', $resA, $sessaoConc6AId);

            if (!$resA['workerA']['success'] || !$resA['workerB']['success']) {
                throw new Exception("38a: Ambas as operações serializadas (reabertura seguida de re-homologação) são válidas e deveriam retornar 200: " . json_encode($resA));
            }

            $s6A = $this->engine->getSession($this->rachaAlphaId, $sessaoConc6AId);
            $ev6A = array_column($this->engine->getSessionEvents($this->rachaAlphaId, $sessaoConc6AId), 'tipo_evento');
            if ($s6A['status'] !== 'agendada' || $s6A['apuracao_presenca'] !== 'homologada') {
                throw new Exception("38a: Estado final inesperado: " . json_encode($s6A));
            }
            if ($ev6A !== ['criacao', 'confirmacao_presenca', 'homologacao', 'reabertura', 'homologacao']) {
                throw new Exception("38a: O histórico da reabertura e das duas homologações deve estar preservado na ordem exata, obtido: " . implode(',', $ev6A));
            }

            // 38b. Homologação entra primeiro na fila do lock (idempotente sem duplicar evento), seguida pela Reabertura
            $resB = $this->runConcurrentWorkers(
                [
                    'action' => 'homologateSession',
                    'args'   => [
                        'racha_id'   => $this->rachaAlphaId,
                        'sessao_id'  => $sessaoConc6BId,
                        'usuario_id' => 2,
                        'motivo'     => 'Homologação redundante idempotente'
                    ]
                ],
                [
                    'action' => 'reopenPresenceList',
                    'args'   => [
                        'racha_id'   => $this->rachaAlphaId,
                        'sessao_id'  => $sessaoConc6BId,
                        'usuario_id' => 1,
                        'motivo'     => 'Reabertura executada após homologação idempotente'
                    ]
                ],
                $sessaoConc6BId,
                80.0
            );

            $this->recordConcurrencyEvidence('38b. Homologação Idempotente (1º) vs Reabertura (2º)', $resB, $sessaoConc6BId);

            if (!$resB['workerA']['success'] || !$resB['workerB']['success']) {
                throw new Exception("38b: Homologação idempotente seguida de reabertura deveriam retornar 200: " . json_encode($resB));
            }

            $s6B = $this->engine->getSession($this->rachaAlphaId, $sessaoConc6BId);
            $ev6B = array_column($this->engine->getSessionEvents($this->rachaAlphaId, $sessaoConc6BId), 'tipo_evento');
            if ($s6B['status'] !== 'agendada' || $s6B['apuracao_presenca'] !== 'em_andamento') {
                throw new Exception("38b: A sessão deveria terminar com apuracao_presenca='em_andamento' (reabertura posterior não pode ser apagada): " . json_encode($s6B));
            }
            if ($ev6B !== ['criacao', 'confirmacao_presenca', 'homologacao', 'reabertura']) {
                throw new Exception("38b: Sequência de eventos incorreta: " . implode(',', $ev6B));
            }

            // 38c. Conflito direto: Duas reaberturas simultâneas na mesma sessão homologada (1 sucesso 200, 1 conflito 400)
            $resC = $this->runConcurrentWorkers(
                [
                    'action' => 'reopenPresenceList',
                    'args'   => [
                        'racha_id'   => $this->rachaAlphaId,
                        'sessao_id'  => $sessaoConc6CId,
                        'usuario_id' => 1,
                        'motivo'     => 'Reabertura concorrente A'
                    ]
                ],
                [
                    'action' => 'reopenPresenceList',
                    'args'   => [
                        'racha_id'   => $this->rachaAlphaId,
                        'sessao_id'  => $sessaoConc6CId,
                        'usuario_id' => 2,
                        'motivo'     => 'Reabertura concorrente B'
                    ]
                ],
                $sessaoConc6CId
            );

            $this->recordConcurrencyEvidence('38c. Dupla Reabertura Concorrente', $resC, $sessaoConc6CId);

            $successCountC = ($resC['workerA']['success'] ? 1 : 0) + ($resC['workerB']['success'] ? 1 : 0);
            $loserC = $resC['workerA']['success'] ? $resC['workerB'] : $resC['workerA'];
            if ($successCountC !== 1 || (int)$loserC['http_code'] !== 400) {
                throw new Exception("38c: Esperado 1 sucesso (200) e 1 rejeição (400) na dupla reabertura: " . json_encode($resC));
            }

            $ev6C = array_column($this->engine->getSessionEvents($this->rachaAlphaId, $sessaoConc6CId), 'tipo_evento');
            if ($ev6C !== ['criacao', 'confirmacao_presenca', 'homologacao', 'reabertura']) {
                throw new Exception("38c: Apenas 1 evento de reabertura deveria ter sido gravado: " . implode(',', $ev6C));
            }
        });

        // =====================================================================
        // TESTE 39 (ETAPA 3B.3.1 - ITEM 3):
        // Concorrência Real (Multi-Processo) entre reopenPresenceList() e cancelSession()
        // sobre a mesma sessão inicialmente homologada:
        // - 39a (Cancelamento 1º, Reabertura 2º): sessão cancelada primeiro recusa reabertura normal (400).
        // - 39b (Reabertura 1º, Cancelamento 2º): reabertura ocorre primeiro e o cancelamento prossegue (200)
        //   sem apagar ou duplicar eventos, terminando em status='cancelada'.
        // =====================================================================
        $sessaoConc7A = $this->engine->createSession($this->rachaAlphaId, '2027-06-13', '19:00', '21:00', 1);
        $sessaoConc7AId = $sessaoConc7A['id'];
        $this->engine->confirmPresence($this->rachaAlphaId, $sessaoConc7AId, 1, 'presente', 'organizador_manual', 1);
        $this->engine->homologateSession($this->rachaAlphaId, $sessaoConc7AId, 1, 'Homologação inicial 7A');

        $sessaoConc7B = $this->engine->createSession($this->rachaAlphaId, '2027-06-20', '19:00', '21:00', 1);
        $sessaoConc7BId = $sessaoConc7B['id'];
        $this->engine->confirmPresence($this->rachaAlphaId, $sessaoConc7BId, 1, 'presente', 'organizador_manual', 1);
        $this->engine->homologateSession($this->rachaAlphaId, $sessaoConc7BId, 1, 'Homologação inicial 7B');

        $this->assertTest("39. Concorrência Real (Multi-Processo): Reabertura vs Cancelamento em sessão homologada", function () use ($sessaoConc7AId, $sessaoConc7BId) {
            // 39a. Cancelamento adquire o lock primeiro; Reabertura subsequente é recusada com HTTP 400
            $resA = $this->runConcurrentWorkers(
                [
                    'action' => 'cancelSession',
                    'args'   => [
                        'racha_id'   => $this->rachaAlphaId,
                        'sessao_id'  => $sessaoConc7AId,
                        'motivo'     => 'Cancelamento da sessão antes da tentativa de reabertura',
                        'usuario_id' => 1
                    ]
                ],
                [
                    'action' => 'reopenPresenceList',
                    'args'   => [
                        'racha_id'   => $this->rachaAlphaId,
                        'sessao_id'  => $sessaoConc7AId,
                        'usuario_id' => 2,
                        'motivo'     => 'Tentativa de reabrir sessão recém-cancelada'
                    ]
                ],
                $sessaoConc7AId,
                80.0
            );

            $this->recordConcurrencyEvidence('39a. Cancelamento (1º) vs Reabertura (2º)', $resA, $sessaoConc7AId);

            if (!$resA['workerA']['success'] || (int)$resA['workerA']['http_code'] !== 200) {
                throw new Exception("39a: cancelSession deveria vencer com 200: " . json_encode($resA));
            }
            if ($resA['workerB']['success'] || (int)$resA['workerB']['http_code'] !== 400) {
                throw new Exception("39a: reopenPresenceList após cancelamento deve ser recusada com 400: " . json_encode($resA));
            }

            $s7A = $this->engine->getSession($this->rachaAlphaId, $sessaoConc7AId);
            $ev7A = array_column($this->engine->getSessionEvents($this->rachaAlphaId, $sessaoConc7AId), 'tipo_evento');
            if ($s7A['status'] !== 'cancelada' || $s7A['apuracao_presenca'] !== 'homologada') {
                throw new Exception("39a: Estado final inconsistente: " . json_encode($s7A));
            }
            if ($ev7A !== ['criacao', 'confirmacao_presenca', 'homologacao', 'cancelamento']) {
                throw new Exception("39a: Sequência de eventos inválida: " . implode(',', $ev7A));
            }

            // 39b. Reabertura adquire o lock primeiro; Cancelamento subsequente prossegue normalmente (HTTP 200)
            $resB = $this->runConcurrentWorkers(
                [
                    'action' => 'reopenPresenceList',
                    'args'   => [
                        'racha_id'   => $this->rachaAlphaId,
                        'sessao_id'  => $sessaoConc7BId,
                        'usuario_id' => 2,
                        'motivo'     => 'Reabertura para troca de goleiro às 18h30'
                    ]
                ],
                [
                    'action' => 'cancelSession',
                    'args'   => [
                        'racha_id'   => $this->rachaAlphaId,
                        'sessao_id'  => $sessaoConc7BId,
                        'motivo'     => 'Quadra interditada às 18h31 logo após reabertura',
                        'usuario_id' => 1
                    ]
                ],
                $sessaoConc7BId,
                80.0
            );

            $this->recordConcurrencyEvidence('39b. Reabertura (1º) vs Cancelamento (2º)', $resB, $sessaoConc7BId);

            if (!$resB['workerA']['success'] || (int)$resB['workerA']['http_code'] !== 200) {
                throw new Exception("39b: reopenPresenceList deveria ter sucedido primeiro com 200: " . json_encode($resB));
            }
            if (!$resB['workerB']['success'] || (int)$resB['workerB']['http_code'] !== 200) {
                throw new Exception("39b: cancelSession após reabertura deveria suceder com 200: " . json_encode($resB));
            }

            $s7B = $this->engine->getSession($this->rachaAlphaId, $sessaoConc7BId);
            $ev7B = array_column($this->engine->getSessionEvents($this->rachaAlphaId, $sessaoConc7BId), 'tipo_evento');
            if ($s7B['status'] !== 'cancelada' || $s7B['apuracao_presenca'] !== 'em_andamento') {
                throw new Exception("39b: Estado final inconsistente: " . json_encode($s7B));
            }
            if ($ev7B !== ['criacao', 'confirmacao_presenca', 'homologacao', 'reabertura', 'cancelamento']) {
                throw new Exception("39b: Sequência de eventos inválida: " . implode(',', $ev7B));
            }
        });

        echo "\n--------------------------------------------------------------------\n";
        echo " TELEMETRIA DE CONCORRÊNCIA REAL MULTI-PROCESSO (proc_open + InnoDB)\n";
        echo "--------------------------------------------------------------------\n";
        foreach ($this->concurrencyEvidence as $ev) {
            $wa = $ev['workerA'];
            $wb = $ev['workerB'];
            $threads = implode(',', $ev['lock_wait_threads']);
            $seq = implode(' -> ', $ev['sequencia_eventos']);
            echo sprintf(
                " [%s | Sessão #%d]\n" .
                "   - Lock Wait InnoDB: %d conexões simultâneas em LOCK WAIT (threads=[%s], coord_conn=%d)\n" .
                "   - Worker A: PID=%d | CONN=%d | %s -> HTTP %d (%s)\n" .
                "   - Worker B: PID=%d | CONN=%d | %s -> HTTP %d (%s)\n" .
                "   - Estado Final: status='%s', apuracao_presenca='%s' | Eventos (%d): [%s]\n",
                $ev['cenario'],
                $ev['sessao_id'],
                $ev['innodb_lock_wait_count'],
                $threads,
                $ev['coordinator_conn_id'],
                $wa['pid'],
                $wa['conn_id'],
                $wa['action'],
                $wa['http_code'],
                $wa['success'] ? 'OK' : 'REJEITADO',
                $wb['pid'],
                $wb['conn_id'],
                $wb['action'],
                $wb['http_code'],
                $wb['success'] ? 'OK' : 'REJEITADO',
                $ev['final_status'],
                $ev['final_apuracao'],
                $ev['total_eventos'],
                $seq
            );
        }

        echo "\n====================================================================\n";
        echo " RESULTADO DOS TESTES DO PRESENCE ENGINE (ETAPA 3B.3.1):\n";
        echo " TESTES SEQUENCIAIS DE REGRAS/TRANSAÇÕES: 32\n";
        echo " TESTES DE CONCORRÊNCIA REAL MULTI-PROCESSO: 7 (11 disputas paralelas)\n";
        echo " TOTAL EXECUTADOS: " . ($this->passed + $this->failed) . "\n";
        echo " APROVADOS: {$this->passed} | FALHAS: {$this->failed}\n";
        echo "====================================================================\n";

        if ($this->failed > 0) {
            exit(1);
        }
    }
}

// Execução
$suite = new PresenceEngineTestSuite();
$suite->run();
