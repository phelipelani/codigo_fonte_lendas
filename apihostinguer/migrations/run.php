<?php
/**
 * Runner de migrations — acesse via browser UMA vez e delete depois.
 * URL: https://seudominio.com/api/migrations/run.php
 *
 * SEGURANÇA: protegido por token. Defina MIGRATION_TOKEN no .env
 * ou passe ?token=SEU_TOKEN na URL.
 */

require_once __DIR__ . '/../config/env.php';

// Proteção mínima por token
$token = $_GET['token'] ?? '';
$expected = $_ENV['MIGRATION_TOKEN'] ?? 'futlendas-migrate-2024';
if ($token !== $expected) {
    http_response_code(403);
    die(json_encode(['error' => 'Token inválido. Use ?token=SEU_TOKEN']));
}

header('Content-Type: text/html; charset=utf-8');

$host     = $_ENV['DB_HOST']     ?? 'localhost';
$user     = $_ENV['DB_USER']     ?? 'root';
$password = $_ENV['DB_PASSWORD'] ?? '';
$database = $_ENV['DB_NAME']     ?? 'futlendas_db';
$port     = $_ENV['DB_PORT']     ?? 3306;

try {
    $pdo = new PDO(
        "mysql:host={$host};port={$port};dbname={$database};charset=utf8mb4",
        $user, $password,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
} catch (Exception $e) {
    die("<b>Erro ao conectar:</b> " . htmlspecialchars($e->getMessage()));
}

function colExists(PDO $pdo, string $table, string $col): bool {
    $r = $pdo->prepare("SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND COLUMN_NAME=?");
    $r->execute([$table, $col]);
    return (int)$r->fetchColumn() > 0;
}
function tableExists(PDO $pdo, string $table): bool {
    $r = $pdo->prepare("SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=?");
    $r->execute([$table]);
    return (int)$r->fetchColumn() > 0;
}
function run(PDO $pdo, string $label, string $sql): void {
    try {
        $pdo->exec($sql);
        echo "<tr><td>✅</td><td><b>{$label}</b></td><td style='color:green'>OK</td></tr>\n";
    } catch (Exception $e) {
        echo "<tr><td>❌</td><td><b>{$label}</b></td><td style='color:red'>" . htmlspecialchars($e->getMessage()) . "</td></tr>\n";
    }
}
function skip(string $label, string $reason): void {
    echo "<tr><td>⏭️</td><td><b>{$label}</b></td><td style='color:#888'>Pulado — {$reason}</td></tr>\n";
}

echo "<!DOCTYPE html><html><head><meta charset='utf-8'><title>Migrations</title></head><body>";
echo "<h2>FutLendas — Migrations</h2><table border='1' cellpadding='6'><tr><th></th><th>Migration</th><th>Resultado</th></tr>\n";

// ── 002: dados_json → meta ───────────────────────────────────────────────────
if (colExists($pdo, 'notificacoes', 'dados_json')) {
    run($pdo, '002: notificacoes.dados_json → meta',
        "ALTER TABLE notificacoes CHANGE COLUMN dados_json meta TEXT NULL DEFAULT NULL");
} else {
    skip('002: notificacoes.dados_json → meta', 'coluna já se chama meta');
}

// ── 003: usuarios.whatsapp ───────────────────────────────────────────────────
if (!colExists($pdo, 'usuarios', 'whatsapp')) {
    run($pdo, '003: ADD usuarios.whatsapp',
        "ALTER TABLE usuarios ADD COLUMN whatsapp VARCHAR(20) NULL DEFAULT NULL AFTER email");
} else {
    skip('003: ADD usuarios.whatsapp', 'coluna já existe');
}

// ── 004: Album — 5 tabelas ───────────────────────────────────────────────────
$album004 = [
    'album_paginas' => "CREATE TABLE album_paginas (
        id INT AUTO_INCREMENT PRIMARY KEY, numero INT NOT NULL, tipo VARCHAR(30) NOT NULL,
        titulo VARCHAR(150) NULL, subtitulo VARCHAR(150) NULL, subtitulo_cor VARCHAR(20) NULL,
        tag VARCHAR(80) NULL, data_referencia VARCHAR(80) NULL, texto MEDIUMTEXT NULL,
        meta_json JSON NULL, ativa TINYINT(1) NOT NULL DEFAULT 1,
        criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
        atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_numero (numero)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

    'album_figurinhas' => "CREATE TABLE album_figurinhas (
        id INT AUTO_INCREMENT PRIMARY KEY, numero INT NOT NULL, nome VARCHAR(150) NOT NULL,
        descricao VARCHAR(255) NULL, categoria VARCHAR(30) NOT NULL DEFAULT 'jogador',
        raridade VARCHAR(20) NOT NULL DEFAULT 'comum', imagem_url VARCHAR(500) NULL,
        pagina_id INT NULL, slot INT NULL, ativa TINYINT(1) NOT NULL DEFAULT 1,
        criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uk_numero (numero), KEY idx_pagina (pagina_id), KEY idx_raridade (raridade),
        CONSTRAINT fk_fig_pagina FOREIGN KEY (pagina_id) REFERENCES album_paginas(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

    'album_pacotes' => "CREATE TABLE album_pacotes (
        id INT AUTO_INCREMENT PRIMARY KEY, usuario_id INT NOT NULL,
        tipo VARCHAR(30) NOT NULL DEFAULT 'racha', motivo VARCHAR(200) NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'fechado',
        criado_em DATETIME DEFAULT CURRENT_TIMESTAMP, aberto_em DATETIME NULL,
        KEY idx_usuario (usuario_id), KEY idx_status (usuario_id, status),
        CONSTRAINT fk_pac_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

    'album_inventario' => "CREATE TABLE album_inventario (
        id INT AUTO_INCREMENT PRIMARY KEY, usuario_id INT NOT NULL, figurinha_id INT NOT NULL,
        quantidade INT NOT NULL DEFAULT 1, obtida_em DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uk_user_fig (usuario_id, figurinha_id), KEY idx_usuario (usuario_id),
        CONSTRAINT fk_inv_usuario   FOREIGN KEY (usuario_id)   REFERENCES usuarios(id)         ON DELETE CASCADE,
        CONSTRAINT fk_inv_figurinha FOREIGN KEY (figurinha_id) REFERENCES album_figurinhas(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

    'album_pacote_figurinhas' => "CREATE TABLE album_pacote_figurinhas (
        id INT AUTO_INCREMENT PRIMARY KEY, pacote_id INT NOT NULL, figurinha_id INT NOT NULL,
        era_repetida TINYINT(1) NOT NULL DEFAULT 0,
        KEY idx_pacote (pacote_id),
        CONSTRAINT fk_pf_pacote    FOREIGN KEY (pacote_id)    REFERENCES album_pacotes(id)     ON DELETE CASCADE,
        CONSTRAINT fk_pf_figurinha FOREIGN KEY (figurinha_id) REFERENCES album_figurinhas(id)  ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
];

foreach ($album004 as $table => $sql) {
    if (!tableExists($pdo, $table)) {
        run($pdo, "004: CREATE {$table}", $sql);
    } else {
        skip("004: CREATE {$table}", 'tabela já existe');
    }
}

// ── 005: timeA_id / timeB_id nullable ────────────────────────────────────────
run($pdo, '005: campeonato_partidas timeA/B nullable',
    "ALTER TABLE campeonato_partidas
       MODIFY COLUMN timeA_id INT(11) DEFAULT NULL,
       MODIFY COLUMN timeB_id INT(11) DEFAULT NULL");

// ── 006: campeonato_vencedores.time_id + posicao ─────────────────────────────
if (!colExists($pdo, 'campeonato_vencedores', 'time_id')) {
    run($pdo, '006a: ADD campeonato_vencedores.time_id',
        "ALTER TABLE campeonato_vencedores ADD COLUMN time_id INT(11) DEFAULT NULL");
} else {
    skip('006a: ADD campeonato_vencedores.time_id', 'coluna já existe');
}
if (!colExists($pdo, 'campeonato_vencedores', 'posicao')) {
    run($pdo, '006b: ADD campeonato_vencedores.posicao',
        "ALTER TABLE campeonato_vencedores ADD COLUMN posicao INT(11) DEFAULT 1");
} else {
    skip('006b: ADD campeonato_vencedores.posicao', 'coluna já existe');
}

echo "</table>";
echo "<p style='color:red'><b>⚠️ DELETE este arquivo do servidor após rodar!</b></p>";
echo "</body></html>";
