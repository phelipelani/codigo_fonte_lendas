<?php
// ==========================================================
// API — Envia mensagem para multiplos jogadores de uma vez
// ==========================================================
// POST /presenca/mensagem-massa
// Body JSON:
//   { "destinatarios": [1,2,3], "texto": "..." }
//   { "destinatarios": "todos",  "texto": "..." }   // todos os cadastrados
//   { "destinatarios": "ativos", "texto": "..." }   // so jogadores ativos
//
// Retorna:
//   {
//     "ok": true,
//     "total": 10,
//     "enviados": 9,
//     "falhou": 1,
//     "detalhes": [
//       { "id": 1, "nome": "Joao", "numero": "5512...", "ok": true },
//       { "id": 2, "nome": "Maria", "numero": "5512...", "ok": false, "erro": "..." }
//     ]
//   }
//
// Observacao: envia sequencialmente com pequeno delay (rate limit
// amigavel pra Evolution API/WhatsApp evitar marcacao como spam).
// ==========================================================

require_once __DIR__ . '/../bootstrap.php';
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../whatsapp.php';

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit(json_encode(['ok' => false, 'msg' => 'Método não permitido']));
}

$body          = json_decode(file_get_contents('php://input'), true) ?? [];
$destinatarios = $body['destinatarios'] ?? null;
$texto         = trim($body['texto'] ?? '');

if (!$texto) {
    http_response_code(400);
    exit(json_encode(['ok' => false, 'msg' => 'O texto da mensagem é obrigatório.']));
}

if ($destinatarios === null || $destinatarios === '') {
    http_response_code(400);
    exit(json_encode(['ok' => false, 'msg' => 'Informe os destinatários (lista de ids, "todos" ou "ativos").']));
}

// =========================================================
// Resolve a lista de jogadores conforme o tipo de destinatario
// =========================================================
$db = Database::getInstance();

if ($destinatarios === 'todos') {
    $jogadores = $db->fetchAll(
        "SELECT id, nome, numero, ativo FROM bot_jogadores ORDER BY nome ASC"
    );
} elseif ($destinatarios === 'ativos') {
    $jogadores = $db->fetchAll(
        "SELECT id, nome, numero, ativo FROM bot_jogadores WHERE ativo = 1 ORDER BY nome ASC"
    );
} elseif (is_array($destinatarios)) {
    // Lista de ids
    $ids = array_values(array_filter(array_map('intval', $destinatarios), fn($id) => $id > 0));
    if (empty($ids)) {
        http_response_code(400);
        exit(json_encode(['ok' => false, 'msg' => 'Nenhum destinatário válido na lista.']));
    }
    $placeholders = implode(',', array_fill(0, count($ids), '?'));
    $jogadores = $db->fetchAll(
        "SELECT id, nome, numero, ativo FROM bot_jogadores WHERE id IN ({$placeholders}) ORDER BY nome ASC",
        $ids
    );
} else {
    http_response_code(400);
    exit(json_encode(['ok' => false, 'msg' => 'Formato de destinatários inválido. Use array de ids, "todos" ou "ativos".']));
}

if (empty($jogadores)) {
    http_response_code(404);
    exit(json_encode(['ok' => false, 'msg' => 'Nenhum jogador encontrado para os destinatários informados.']));
}

// =========================================================
// Envia em sequencia, com delay pequeno pra evitar spam
// =========================================================
$detalhes  = [];
$enviados  = 0;
$falhou    = 0;

foreach ($jogadores as $j) {
    $numero = $j['numero'] ?? '';
    if (!$numero) {
        $detalhes[] = [
            'id'     => (int)$j['id'],
            'nome'   => $j['nome'],
            'numero' => '',
            'ok'     => false,
            'erro'   => 'Sem número cadastrado',
        ];
        $falhou++;
        continue;
    }

    try {
        $ok = enviarMensagem($numero, $texto);
        $detalhes[] = [
            'id'     => (int)$j['id'],
            'nome'   => $j['nome'],
            'numero' => $numero,
            'ok'     => (bool)$ok,
        ];
        if ($ok) {
            $enviados++;
        } else {
            $falhou++;
            $detalhes[count($detalhes) - 1]['erro'] = 'Falha no envio (Evolution API retornou erro)';
        }
    } catch (Throwable $e) {
        $detalhes[] = [
            'id'     => (int)$j['id'],
            'nome'   => $j['nome'],
            'numero' => $numero,
            'ok'     => false,
            'erro'   => $e->getMessage(),
        ];
        $falhou++;
    }

    // Delay entre envios (300ms) — boa pratica pra evitar ban no WhatsApp
    if (count($detalhes) < count($jogadores)) {
        usleep(300000);
    }
}

log_bot("Disparo em massa: {$enviados} enviados, {$falhou} falhou. Texto: \"" . mb_substr($texto, 0, 80) . "...\"");

echo json_encode([
    'ok'        => true,
    'total'     => count($jogadores),
    'enviados'  => $enviados,
    'falhou'    => $falhou,
    'detalhes'  => $detalhes,
], JSON_UNESCAPED_UNICODE);
