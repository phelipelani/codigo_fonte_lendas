<?php
// ====================================================
// SETUP — Cria as tabelas no MySQL
// Execute UMA VEZ: https://seusite.com.br/presenca/setup
// APAGUE este arquivo depois!
// ====================================================

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/db.php';

header('Content-Type: text/html; charset=utf-8');

function executar(string $sql, string $descricao): void {
    try {
        db()->exec($sql);
        echo "✅ $descricao<br>";
    } catch (PDOException $e) {
        echo "❌ $descricao — Erro: " . htmlspecialchars($e->getMessage()) . "<br>";
    }
}

echo "<h2>Setup — Bot de Presença FutLendas</h2><hr><br>";

executar("
    CREATE TABLE IF NOT EXISTS lista_presenca (
        id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        data_racha    VARCHAR(10)  NOT NULL COMMENT 'DD/MM/YYYY',
        semana        TINYINT      NOT NULL COMMENT 'Semana ISO do ano',
        ano           SMALLINT     NOT NULL,
        disparado     TINYINT(1)   NOT NULL DEFAULT 0,
        fechado       TINYINT(1)   NOT NULL DEFAULT 0,
        criado_em     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        atualizado_em DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_semana_ano (semana, ano)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
", "Tabela lista_presenca");

executar("
    CREATE TABLE IF NOT EXISTS jogadores_presenca (
        id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        lista_id          INT UNSIGNED NOT NULL,
        nome              VARCHAR(100) NOT NULL,
        numero            VARCHAR(20)  NOT NULL COMMENT 'Só dígitos',
        tipo              ENUM('linha','goleiro') NOT NULL DEFAULT 'linha',
        apelido           VARCHAR(100) DEFAULT NULL,
        status            ENUM('aguardando','confirmado','ausente','a_confirmar') NOT NULL DEFAULT 'aguardando',
        horario_resposta  VARCHAR(20)  DEFAULT NULL COMMENT 'DD/MM/YYYY HH:MM',
        ordem             SMALLINT     DEFAULT NULL COMMENT 'Ordem de confirmação',
        disparado_em      DATETIME     DEFAULT NULL,
        ultimo_lembrete   DATETIME     DEFAULT NULL,
        FOREIGN KEY (lista_id) REFERENCES lista_presenca(id) ON DELETE CASCADE,
        INDEX idx_lista_numero (lista_id, numero),
        INDEX idx_lista_status (lista_id, status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
", "Tabela jogadores_presenca");

executar("
    CREATE TABLE IF NOT EXISTS bot_jogadores (
        id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        nome          VARCHAR(100) NOT NULL,
        numero        VARCHAR(20)  NOT NULL,
        tipo          ENUM('linha','goleiro') NOT NULL DEFAULT 'linha',
        ativo         TINYINT(1)   NOT NULL DEFAULT 1,
        criado_em     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        atualizado_em DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY idx_numero (numero)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
", "Tabela bot_jogadores");

executar("
    CREATE TABLE IF NOT EXISTS bot_config (
        chave VARCHAR(50)  NOT NULL PRIMARY KEY,
        valor VARCHAR(255) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
", "Tabela bot_config");

// Seed: config padrão
$configs = [
    'dia_racha'                => 'Terça',
    'horario_racha'            => '21:00',
    'local_racha'              => 'Arena Litoral',
    'intervalo_lembrete_horas' => '2',
];
$seedConfig = 0;
foreach ($configs as $chave => $valor) {
    $stmt = db()->prepare("INSERT IGNORE INTO bot_config (chave, valor) VALUES (?, ?)");
    $stmt->execute([$chave, $valor]);
    $seedConfig += $stmt->rowCount();
}
echo "✅ Config padrão: $seedConfig valor(es) inserido(s)<br>";

// Seed: jogadores (só se tabela estiver vazia)
$count = (int) db()->query("SELECT COUNT(*) FROM bot_jogadores")->fetchColumn();
if ($count === 0) {
    $jogadores = [];
    foreach (JOGADORES_LINHA as $j) $jogadores[] = [$j['nome'], $j['numero'], 'linha'];
    foreach (GOLEIROS        as $j) $jogadores[] = [$j['nome'], $j['numero'], 'goleiro'];

    $stmt = db()->prepare("INSERT IGNORE INTO bot_jogadores (nome, numero, tipo) VALUES (?, ?, ?)");
    $inseridos = 0;
    foreach ($jogadores as [$nome, $numero, $tipo]) {
        $stmt->execute([$nome, $numero, $tipo]);
        $inseridos += $stmt->rowCount();
    }
    echo "✅ Jogadores importados: $inseridos jogador(es)<br>";
} else {
    echo "✅ bot_jogadores já possui $count jogador(es) — seed ignorado<br>";
}

$logsDir = __DIR__ . '/logs';
if (!is_dir($logsDir)) {
    mkdir($logsDir, 0755, true);
    echo "✅ Pasta logs/ criada<br>";
} else {
    echo "✅ Pasta logs/ já existe<br>";
}

echo "<br><hr>";
echo "<strong>⚠️ APAGUE este arquivo (presenca/setup.php) após a instalação!</strong><br>";
echo "<br>Setup concluído.";
