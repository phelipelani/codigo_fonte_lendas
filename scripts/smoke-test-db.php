<?php
/**
 * smoke-test-db.php
 * Testa se o PHP consegue ler o .env e conectar no banco local.
 * Uso: php scripts\smoke-test-db.php
 */

require_once __DIR__ . '/../apihostinguer/config/env.php';
require_once __DIR__ . '/../apihostinguer/config/database.php';

echo "=== FutLendas — Smoke test de banco ===\n";
echo "DB_HOST     = " . ($_ENV['DB_HOST']     ?? '(vazio)') . "\n";
echo "DB_USER     = " . ($_ENV['DB_USER']     ?? '(vazio)') . "\n";
echo "DB_NAME     = " . ($_ENV['DB_NAME']     ?? '(vazio)') . "\n";
echo "DB_PASSWORD = " . (empty($_ENV['DB_PASSWORD']) ? '(vazio)' : '(definida)') . "\n";
echo "DB_PORT     = " . ($_ENV['DB_PORT']     ?? '(vazio)') . "\n";
echo "\n";

try {
    $db = Database::getInstance();
    echo "✅ Conexao PDO OK\n";

    $row = $db->fetchOne('SELECT VERSION() AS v, DATABASE() AS db, NOW() AS now');
    echo "   MySQL version : {$row['v']}\n";
    echo "   Database      : {$row['db']}\n";
    echo "   Server time   : {$row['now']}\n\n";

    $users = $db->fetchAll('SELECT id, username, role, email FROM usuarios ORDER BY id');
    echo "👥 Usuarios cadastrados (" . count($users) . "):\n";
    foreach ($users as $u) {
        $email = $u['email'] ?? '(sem email)';
        echo "   #{$u['id']}  {$u['username']}  [{$u['role']}]  {$email}\n";
    }
} catch (Throwable $e) {
    echo "❌ ERRO: " . $e->getMessage() . "\n";
    exit(1);
}
