<?php
/**
 * Runner de Migrations Versionadas Exclusivo para Sandbox
 * Arquivo: apihostinguer/scripts/migrate_sandbox.php
 *
 * USO:
 *   php migrate_sandbox.php status
 *   php migrate_sandbox.php up
 *   php migrate_sandbox.php down [steps]
 */

require_once __DIR__ . '/../config/database_sandbox.php';

class SandboxMigrationRunner
{
    private PDO $pdo;
    private string $migrationsDir;
    private string $downDir;

    public function __construct(?PDO $adminPdo = null)
    {
        $this->pdo = $adminPdo ?? SandboxDatabase::getAdminConnection();
        $this->migrationsDir = __DIR__ . '/../migrations/multiracha';
        $this->downDir = $this->migrationsDir . '/down';
        $this->ensureMigrationTable();
    }

    private function ensureMigrationTable(): void
    {
        $this->pdo->exec("
            CREATE TABLE IF NOT EXISTS `schema_migrations` (
                `id` INT AUTO_INCREMENT PRIMARY KEY,
                `version` VARCHAR(100) NOT NULL UNIQUE,
                `name` VARCHAR(255) NOT NULL,
                `checksum_sha256` VARCHAR(64) NOT NULL,
                `applied_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                `execution_time_ms` INT NOT NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ");
    }

    /**
     * Executa instruções SQL separadas por ponto e vírgula em fim de linha,
     * suportando DDL de tabelas, constraints e triggers de instrução única.
     */
    private function executeSqlScript(string $sql): void
    {
        $cleaned = preg_replace('/^\s*--.*$/m', '', $sql);
        $statements = preg_split('/;\s*(?:\r?\n|$)/', (string)$cleaned);
        if (!is_array($statements)) {
            return;
        }

        foreach ($statements as $stmt) {
            $trimmed = trim($stmt);
            if ($trimmed !== '') {
                $this->pdo->exec($trimmed);
            }
        }
    }

    public function getAppliedMigrations(): array
    {
        $stmt = $this->pdo->query("SELECT * FROM `schema_migrations` ORDER BY `version` ASC");
        return $stmt->fetchAll();
    }

    public function status(): void
    {
        $applied = array_column($this->getAppliedMigrations(), null, 'version');
        $files = glob($this->migrationsDir . '/*.sql');
        sort($files);

        echo "====================================================================\n";
        echo " STATUS DAS MIGRATIONS NO SANDBOX (db_futlendas_sandbox)\n";
        echo "====================================================================\n";

        foreach ($files as $file) {
            $base = basename($file);
            $version = explode('_', $base)[0];
            $checksum = hash_file('sha256', $file);

            if (isset($applied[$version])) {
                $rec = $applied[$version];
                $match = ($rec['checksum_sha256'] === $checksum) ? "OK" : "DIVERGENTE!";
                echo sprintf(" [APLICADA]   %-48s (Hash: %s, Aplicada em: %s)\n", $base, $match, $rec['applied_at']);
            } else {
                echo sprintf(" [PENDENTE]   %-48s\n", $base);
            }
        }
        echo "====================================================================\n";
    }

    public function up(): int
    {
        $applied = array_column($this->getAppliedMigrations(), 'checksum_sha256', 'version');
        $files = glob($this->migrationsDir . '/*.sql');
        sort($files);
        $count = 0;

        echo "Iniciando execução de migrations (UP) no Sandbox...\n";

        foreach ($files as $file) {
            $base = basename($file);
            $version = explode('_', $base)[0];
            $checksum = hash_file('sha256', $file);

            if (isset($applied[$version])) {
                if ($applied[$version] !== $checksum) {
                    throw new RuntimeException("ERRO DE INTEGRIDADE: O arquivo '{$base}' foi modificado após aplicação (Checksum divergente)!");
                }
                continue;
            }

            echo " -> Aplicando: {$base}... ";
            $start = microtime(true);
            $sql = (string)file_get_contents($file);

            $this->executeSqlScript($sql);
            $duration = (int)((microtime(true) - $start) * 1000);

            $ins = $this->pdo->prepare("
                INSERT INTO `schema_migrations` (`version`, `name`, `checksum_sha256`, `execution_time_ms`)
                VALUES (:version, :name, :checksum, :time_ms)
            ");
            $ins->execute([
                ':version'  => $version,
                ':name'     => $base,
                ':checksum' => $checksum,
                ':time_ms'  => $duration
            ]);

            echo "OK ({$duration}ms)\n";
            $count++;
        }

        // Garante privilégios mínimos atualizados para o usuário de runtime da aplicação
        SandboxDatabase::ensureRuntimeUserAndPrivileges($this->pdo);

        echo "UP concluído com sucesso. {$count} migration(s) aplicada(s).\n";
        return $count;
    }

    public function down(int $steps = 1): int
    {
        $stmt = $this->pdo->query("SELECT * FROM `schema_migrations` WHERE `version` != '000' ORDER BY `version` DESC LIMIT {$steps}");
        $toRollback = $stmt->fetchAll();

        if (empty($toRollback)) {
            echo "Nenhuma migration para reverter.\n";
            return 0;
        }

        echo "Iniciando ROLLBACK SEGURO de {$steps} migration(s)...\n";
        $rolledBack = 0;

        foreach ($toRollback as $rec) {
            $version = $rec['version'];
            $downFiles = glob($this->downDir . "/{$version}_*.sql");

            if (empty($downFiles)) {
                throw new RuntimeException("ABORTADO: Arquivo de rollback (DOWN) inexistente para a versão '{$version}'!");
            }

            $downFile = $downFiles[0];
            $downBase = basename($downFile);
            echo " -> Avaliando segurança para reverter {$rec['name']} via {$downBase}...\n";

            // 1. Extração das tabelas afetadas pelo DROP TABLE ou ALTER TABLE para conferência de segurança
            $downSql = (string)file_get_contents($downFile);
            preg_match_all('/(?:DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?|ALTER\s+TABLE\s+)`?([a-zA-Z0-9_]+)`?/i', $downSql, $matches);
            $targetTables = array_unique($matches[1] ?? []);

            // 2. Trava de segurança: TODAS as tabelas a serem descartadas/revertidas devem estar sem dados operacionais
            foreach ($targetTables as $table) {
                $chk = $this->pdo->query("SHOW TABLES LIKE '{$table}'")->fetch();
                if ($chk) {
                    if ($table === 'jogadores') {
                        // 'jogadores' possui fixtures base da migration 000; verifica se há dados operacionais nas colunas da 008 ou jogadores novos
                        $rowCnt = (int)$this->pdo->query("SELECT COUNT(*) FROM `jogadores` WHERE `whatsapp` IS NOT NULL OR `apelido_bot` IS NOT NULL OR `id` > 10")->fetchColumn();
                    } else {
                        $rowCnt = (int)$this->pdo->query("SELECT COUNT(*) FROM `{$table}`")->fetchColumn();
                    }
                    if ($rowCnt > 0) {
                        throw new RuntimeException("ROLLBACK ABORTADO POR SEGURANÇA: A tabela '{$table}' possui {$rowCnt} registro(s) operacional(is)! O rollback exige tabela vazia.");
                    }
                }
            }

            // 3. Execução do script de reversão
            $this->executeSqlScript($downSql);

            // 4. Remoção do registro em schema_migrations
            $del = $this->pdo->prepare("DELETE FROM `schema_migrations` WHERE `version` = :version");
            $del->execute([':version' => $version]);

            echo "    -> Revertido com sucesso: {$rec['name']}\n";
            $rolledBack++;
        }

        echo "Rollback concluído com sucesso. {$rolledBack} migration(s) revertida(s).\n";
        return $rolledBack;
    }
}

// Execução via CLI
if (php_sapi_name() === 'cli' && isset($argv[0]) && realpath($argv[0]) === __FILE__) {
    $action = $argv[1] ?? 'status';
    $runner = new SandboxMigrationRunner();

    try {
        if ($action === 'status') {
            $runner->status();
        } elseif ($action === 'up') {
            $runner->up();
        } elseif ($action === 'down') {
            $steps = isset($argv[2]) ? (int)$argv[2] : 1;
            $runner->down($steps);
        } else {
            echo "Comando inválido. Use: status | up | down [steps]\n";
        }
    } catch (Exception $e) {
        echo "ERRO FATAL: " . $e->getMessage() . "\n";
        exit(1);
    }
}
