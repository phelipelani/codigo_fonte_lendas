<?php
// ====================================================
// MP Setup — Cria tabela mp_contas
// GET /mp/setup   (admin — rodar 1x e apagar)
// ====================================================

$pdo = Database::getInstance()->getConnection();

try {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS mp_contas (
            id              INT AUTO_INCREMENT PRIMARY KEY,
            user_id         INT NOT NULL             COMMENT 'ID do usuário no sistema FutLendas',
            mp_user_id      VARCHAR(50) NOT NULL      COMMENT 'User ID no Mercado Pago',
            access_token    TEXT NOT NULL,
            refresh_token   TEXT NULL,
            token_expira_em DATETIME NULL,
            public_key      VARCHAR(150) NULL,
            scope           VARCHAR(500) NULL,
            live_mode       TINYINT(1) DEFAULT 1,
            criado_em       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            atualizado_em   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY uk_user    (user_id),
            UNIQUE KEY uk_mp_user (mp_user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");

    exit(json_encode(['ok' => true, 'msg' => 'Tabela mp_contas criada com sucesso!']));
} catch (Throwable $e) {
    http_response_code(500);
    exit(json_encode(['ok' => false, 'msg' => $e->getMessage()]));
}
