<?php
/**
 * Conexão Exclusiva para Banco de Desenvolvimento / Sandbox
 * Arquivo: apihostinguer/config/database_sandbox.php
 *
 * TRAVAS DE SEGURANÇA E SEPARAÇÃO DE PRIVILÉGIOS (ETAPA 3B.3):
 * 1. Proíbe conexões a qualquer host que não seja local (127.0.0.1 ou localhost).
 * 2. Proíbe conexões a qualquer banco que não seja 'db_futlendas_sandbox'.
 * 3. Separa estritamente:
 *    - getConnection(): conexão de runtime da aplicação ('futlendas_app_sandbox') com privilégios
 *      mínimos (SELECT, INSERT em racha_sessao_eventos; sem UPDATE/DELETE na trilha de auditoria e sem DDL).
 *    - getAdminConnection(): conexão administrativa ('root') restrita à execução de migrations e
 *      provisionamento/recriação controlada do ambiente descartável de testes.
 * 4. Habilita STRICT_TRANS_TABLES na sessão para impedir truncamento silencioso ou datas inválidas.
 */

class SandboxDatabase
{
    private static ?PDO $runtimeInstance = null;
    private static ?PDO $adminInstance = null;
    private static bool $envLoaded = false;

    /**
     * Carrega variáveis de .env.sandbox e .env.sandbox.local sem sobrescrever variáveis já definidas no ambiente
     */
    private static function loadSandboxEnv(): void
    {
        if (self::$envLoaded) {
            return;
        }
        self::$envLoaded = true;

        $rootDir = realpath(__DIR__ . '/../..');
        if ($rootDir === false) {
            return;
        }

        // .env.sandbox.local tem precedência sobre .env.sandbox
        $files = [
            $rootDir . '/.env.sandbox.local',
            $rootDir . '/.env.sandbox'
        ];

        foreach ($files as $file) {
            if (!is_file($file) || !is_readable($file)) {
                continue;
            }
            $lines = file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            if ($lines === false) {
                continue;
            }
            foreach ($lines as $line) {
                $trimmed = trim($line);
                if ($trimmed === '' || strpos($trimmed, '#') === 0 || strpos($trimmed, '=') === false) {
                    continue;
                }
                [$key, $val] = explode('=', $trimmed, 2);
                $key = trim($key);
                $val = trim($val);
                if ($key !== '' && getenv($key) === false && !isset($_ENV[$key])) {
                    putenv("{$key}={$val}");
                    $_ENV[$key] = $val;
                }
            }
        }
    }

    /**
     * Valida e retorna parâmetros básicos de host, porta e nome do banco do sandbox
     */
    private static function getBaseConfig(): array
    {
        self::loadSandboxEnv();

        $host = (string)(getenv('DB_HOST') ?: ($_ENV['DB_HOST'] ?? '127.0.0.1'));
        $port = (int)(getenv('DB_PORT') ?: ($_ENV['DB_PORT'] ?? 3307));
        $database = (string)(getenv('DB_NAME') ?: ($_ENV['DB_NAME'] ?? 'db_futlendas_sandbox'));

        $allowedHosts = ['127.0.0.1', 'localhost'];
        if (!in_array(strtolower($host), $allowedHosts, true)) {
            throw new RuntimeException("SEGURANÇA BLOQUEADA: Tentativa de conexão a host não local ({$host}) no Sandbox.");
        }

        if ($database !== 'db_futlendas_sandbox') {
            throw new RuntimeException("SEGURANÇA BLOQUEADA: O nome do banco DEVE ser 'db_futlendas_sandbox' (recebido: '{$database}').");
        }

        return [
            'host'     => $host,
            'port'     => $port,
            'database' => $database,
            'options'  => [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
                PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4, SESSION sql_mode = 'STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION,NO_ZERO_DATE,NO_ZERO_IN_DATE'"
            ]
        ];
    }

    /**
     * Conexão de RUNTIME da aplicação (usuário restrito 'futlendas_app_sandbox', nunca 'root').
     */
    public static function getConnection(bool $forceNew = false): PDO
    {
        if (!$forceNew && self::$runtimeInstance !== null) {
            return self::$runtimeInstance;
        }

        $cfg = self::getBaseConfig();
        $appUser = (string)(getenv('DB_APP_USER') ?: ($_ENV['DB_APP_USER'] ?? 'futlendas_app_sandbox'));
        $appPass = (string)(getenv('DB_APP_PASSWORD') !== false ? getenv('DB_APP_PASSWORD') : ($_ENV['DB_APP_PASSWORD'] ?? 'sandbox_app_local_only_3307'));

        if (strtolower($appUser) === 'root') {
            throw new RuntimeException("SEGURANÇA BLOQUEADA: A conexão de runtime da aplicação não pode utilizar o superusuário 'root'. Configure DB_APP_USER com privilégios mínimos.");
        }

        $dsn = "mysql:host={$cfg['host']};port={$cfg['port']};dbname={$cfg['database']};charset=utf8mb4";

        try {
            $pdo = new PDO($dsn, $appUser, $appPass, $cfg['options']);
        } catch (PDOException $e) {
            // Caso o usuário restrito ou banco ainda não tenha sido provisionado no ambiente local, provisiona via admin e reconecta
            self::ensureRuntimeUserAndPrivileges();
            $pdo = new PDO($dsn, $appUser, $appPass, $cfg['options']);
        }

        if (!$forceNew) {
            self::$runtimeInstance = $pdo;
        }

        return $pdo;
    }

    /**
     * Conexão ADMINISTRATIVA exclusiva para migrations (migrate_sandbox.php) e provisionamento de schema de testes.
     */
    public static function getAdminConnection(bool $forceNew = false): PDO
    {
        if (!$forceNew && self::$adminInstance !== null) {
            return self::$adminInstance;
        }

        $cfg = self::getBaseConfig();
        $adminUser = (string)(getenv('DB_ADMIN_USER') ?: ($_ENV['DB_ADMIN_USER'] ?? 'root'));
        $adminPass = (string)(getenv('DB_ADMIN_PASSWORD') !== false ? getenv('DB_ADMIN_PASSWORD') : ($_ENV['DB_ADMIN_PASSWORD'] ?? ''));

        $dsn = "mysql:host={$cfg['host']};port={$cfg['port']};dbname={$cfg['database']};charset=utf8mb4";

        try {
            $pdo = new PDO($dsn, $adminUser, $adminPass, $cfg['options']);
        } catch (PDOException $e) {
            if ((int)$e->getCode() === 1049) {
                $rawDsn = "mysql:host={$cfg['host']};port={$cfg['port']};charset=utf8mb4";
                $rawPdo = new PDO($rawDsn, $adminUser, $adminPass, $cfg['options']);
                $rawPdo->exec("CREATE DATABASE IF NOT EXISTS `db_futlendas_sandbox` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
                $pdo = new PDO($dsn, $adminUser, $adminPass, $cfg['options']);
            } else {
                throw $e;
            }
        }

        if (!$forceNew) {
            self::$adminInstance = $pdo;
        }

        return $pdo;
    }

    /**
     * Provisiona o usuário de runtime 'futlendas_app_sandbox' com privilégios mínimos necessários:
     * - Tabelas operacionais mutáveis: SELECT, INSERT, UPDATE, DELETE
     * - Tabela de auditoria racha_sessao_eventos: ESTRITAMENTE SELECT, INSERT (sem UPDATE, sem DELETE, sem DDL)
     * - Tabela schema_migrations: SELECT
     */
    public static function ensureRuntimeUserAndPrivileges(?PDO $adminPdo = null): void
    {
        self::loadSandboxEnv();
        $pdo = $adminPdo ?? self::getAdminConnection();

        $appUser = (string)(getenv('DB_APP_USER') ?: ($_ENV['DB_APP_USER'] ?? 'futlendas_app_sandbox'));
        $appPass = (string)(getenv('DB_APP_PASSWORD') !== false ? getenv('DB_APP_PASSWORD') : ($_ENV['DB_APP_PASSWORD'] ?? 'sandbox_app_local_only_3307'));

        if (!preg_match('/^[a-zA-Z0-9_]+$/', $appUser) || strtolower($appUser) === 'root') {
            throw new RuntimeException("Nome de usuário de runtime inválido: '{$appUser}'.");
        }

        $quotedPass = $pdo->quote($appPass);

        foreach (['127.0.0.1', 'localhost'] as $host) {
            $pdo->exec("CREATE USER IF NOT EXISTS '{$appUser}'@'{$host}' IDENTIFIED BY {$quotedPass}");
            $pdo->exec("SET PASSWORD FOR '{$appUser}'@'{$host}' = PASSWORD({$quotedPass})");

            // Remove quaisquer privilégios globais ou de banco amplos que pudessem permitir DELETE/UPDATE irrestrito
            try {
                $pdo->exec("REVOKE ALL PRIVILEGES, GRANT OPTION FROM '{$appUser}'@'{$host}'");
            } catch (Throwable $e) {
                // Ignora caso não possua privilégios anteriores
            }

            $mutableTables = [
                'usuarios',
                'jogadores',
                'rachas',
                'racha_organizadores',
                'racha_participantes',
                'racha_mensalistas',
                'racha_sessoes',
                'racha_sessao_presencas',
                'racha_sessao_fila_contadores',
                'racha_sessao_convocacoes',
                'racha_sessao_respostas_idempotencia',
                'racha_whatsapp_instancias',
                'racha_whatsapp_mensagens',
                'racha_mensalistas_renovacoes',
                'financeiro_fundos',
                'financeiro_transferencias',
                'financeiro_cobrancas',
                'financeiro_lancamentos'
            ];

            $existingTables = $pdo->query("SHOW TABLES FROM `db_futlendas_sandbox`")->fetchAll(PDO::FETCH_COLUMN);
            $existingMap = array_flip($existingTables ?: []);

            foreach ($mutableTables as $table) {
                if (isset($existingMap[$table])) {
                    $pdo->exec("GRANT SELECT, INSERT, UPDATE, DELETE ON `db_futlendas_sandbox`.`{$table}` TO '{$appUser}'@'{$host}'");
                }
            }

            // Privilégio estritamente APPEND-ONLY (SELECT, INSERT) na tabela de auditoria racha_sessao_eventos
            if (isset($existingMap['racha_sessao_eventos'])) {
                $pdo->exec("GRANT SELECT, INSERT ON `db_futlendas_sandbox`.`racha_sessao_eventos` TO '{$appUser}'@'{$host}'");
            }

            // Apenas leitura em schema_migrations
            if (isset($existingMap['schema_migrations'])) {
                $pdo->exec("GRANT SELECT ON `db_futlendas_sandbox`.`schema_migrations` TO '{$appUser}'@'{$host}'");
            }
        }

        $pdo->exec("FLUSH PRIVILEGES");
    }

    /**
     * Recria de forma limpa e segura o banco descartável db_futlendas_sandbox para baterias de testes,
     * preservando a regra de nunca executar DELETE/UPDATE em eventos de auditoria e verificando que
     * não há dados fora do escopo de testes/sandbox.
     */
    public static function resetDisposableSandboxSchema(bool $applyMigrations = true): void
    {
        $cfg = self::getBaseConfig();
        $adminPdo = self::getAdminConnection();

        // Verifica que estamos estritamente no banco descartável local
        $currentDb = (string)$adminPdo->query("SELECT DATABASE()")->fetchColumn();
        if ($currentDb !== 'db_futlendas_sandbox') {
            throw new RuntimeException("ABORTADO: Tentativa de recriar schema fora de 'db_futlendas_sandbox' (atual: '{$currentDb}').");
        }

        // Verifica se a tabela rachas existe e se todos os registros pertencem a cenários de teste/sandbox
        $hasRachas = $adminPdo->query("SHOW TABLES LIKE 'rachas'")->fetch();
        if ($hasRachas) {
            $rows = $adminPdo->query("SELECT id, nome FROM rachas")->fetchAll(PDO::FETCH_ASSOC);
            foreach ($rows as $r) {
                $id = (int)$r['id'];
                $nome = (string)$r['nome'];
                $isSandboxFixture = (stripos($nome, 'Teste') !== false) || in_array($id, [1, 2], true);
                if (!$isSandboxFixture) {
                    throw new RuntimeException("ABORTADO POR SEGURANÇA: O racha #{$id} ('{$nome}') não é reconhecido como fixture de teste do sandbox.");
                }
            }
        }

        // Descarta e recria o banco descartável de sandbox
        $adminPdo->exec("DROP DATABASE `db_futlendas_sandbox`");
        $adminPdo->exec("CREATE DATABASE `db_futlendas_sandbox` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
        $adminPdo->exec("USE `db_futlendas_sandbox`");

        // Aplica tabela base mock (000_create_base_mock_tables.sql)
        $baseMockFile = __DIR__ . '/../migrations/multiracha/000_create_base_mock_tables.sql';
        if (is_file($baseMockFile)) {
            $adminPdo->exec((string)file_get_contents($baseMockFile));
        }

        self::resetInstance();

        if ($applyMigrations) {
            require_once __DIR__ . '/../scripts/migrate_sandbox.php';
            $runner = new SandboxMigrationRunner();
            $runner->up();
        } else {
            self::ensureRuntimeUserAndPrivileges();
        }

        self::resetInstance();
    }

    public static function resetInstance(): void
    {
        self::$runtimeInstance = null;
        self::$adminInstance = null;
    }
}
