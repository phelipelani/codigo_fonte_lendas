<?php
// ====================================================
// API - CAIXA DE ENTRADA DO BOT
// ====================================================
// GET /presenca/caixa-entrada (lista mensagens agrupadas por jogador)
// POST /presenca/caixa-entrada/limpar (marca todas como lidas)

require_once __DIR__ . '/../bootstrap.php';
require_once __DIR__ . '/../db.php';

AuthMiddleware::isAdmin();
header('Content-Type: application/json; charset=utf-8');

$method = $_SERVER['REQUEST_METHOD'];
$path   = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

if ($method === 'GET') {
    $rows = db()->query("
        SELECT c.id, c.jogador_id, c.nome_avulso, c.numero, c.mensagem, c.recebido_em,
               j.nome
        FROM bot_caixa_entrada c
        LEFT JOIN bot_jogadores j ON j.id = c.jogador_id
        WHERE c.lido = 0
        ORDER BY c.recebido_em ASC
    ")->fetchAll(PDO::FETCH_ASSOC);

    $agrupado = [];
    foreach ($rows as $r) {
        $key = $r['numero'];
        if (!isset($agrupado[$key])) {
            $nome = $r['nome'] ?? $r['nome_avulso'];
            if (!$nome) $nome = $r['numero'];
            
            $agrupado[$key] = [
                'jogador_id' => $r['jogador_id'],
                'numero'     => $r['numero'],
                'nome'       => $nome,
                'mensagens'  => []
            ];
        }
        $agrupado[$key]['mensagens'][] = $r['mensagem'];
    }

    echo json_encode([
        'ok' => true,
        'respostas' => array_values($agrupado)
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($method === 'POST') {
    // Marca tudo como lido
    db()->exec("UPDATE bot_caixa_entrada SET lido = 1 WHERE lido = 0");
    
    echo json_encode(['ok' => true, 'msg' => 'Caixa de entrada limpa com sucesso.']);
    exit;
}

http_response_code(405);
echo json_encode(['ok' => false, 'msg' => 'Metodo nao permitido']);
