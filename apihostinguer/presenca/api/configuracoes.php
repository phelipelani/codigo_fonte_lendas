<?php
// ====================================================
// API — Configurações do bot
// GET /presenca/configuracoes  → retorna config atual
// PUT /presenca/configuracoes  → atualiza config
// ====================================================

require_once __DIR__ . '/../bootstrap.php';
require_once __DIR__ . '/../db.php';

$camposPermitidos = ['dia_racha', 'horario_racha', 'local_racha', 'intervalo_lembrete_horas'];

// ── GET ─────────────────────────────────────────────
if ($method === 'GET') {
    $config = [];
    foreach ($camposPermitidos as $chave) {
        $config[$chave] = botConfig($chave);
    }
    exit(json_encode(['ok' => true, 'config' => $config], JSON_UNESCAPED_UNICODE));
}

// ── PUT ─────────────────────────────────────────────
if ($method === 'PUT') {
    $body = json_decode(file_get_contents('php://input'), true) ?? [];

    $atualizados = 0;
    foreach ($camposPermitidos as $chave) {
        if (!isset($body[$chave])) continue;

        $valor = trim($body[$chave]);
        if ($valor === '') continue;

        // Upsert: INSERT ou UPDATE se já existir
        Database::getInstance()->execute(
            "INSERT INTO bot_config (chave, valor) VALUES (?, ?)
             ON DUPLICATE KEY UPDATE valor = VALUES(valor)",
            [$chave, $valor]
        );
        $atualizados++;
    }

    log_bot("Configurações atualizadas via painel: $atualizados campo(s)");
    exit(json_encode(['ok' => true, 'msg' => "Configurações salvas! ($atualizados campo(s) atualizado(s))"]));
}

http_response_code(405);
exit(json_encode(['ok' => false, 'msg' => 'Método não permitido']));
