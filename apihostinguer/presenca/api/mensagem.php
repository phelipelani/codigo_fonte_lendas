<?php
// ====================================================
// API — Envia mensagem avulsa para jogador ou grupo
// ====================================================
// POST /api/mensagem.php
// Body JSON: { "destino": "5512999999999", "texto": "Oi!" }
// Destino "grupo" envia para o grupo configurado
// ====================================================

require_once __DIR__ . '/../bootstrap.php';
require_once __DIR__ . '/../whatsapp.php';

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit(json_encode(['ok' => false, 'msg' => 'Método não permitido']));
}

$body    = json_decode(file_get_contents('php://input'), true) ?? [];
$destino = trim($body['destino'] ?? '');
$texto   = trim($body['texto']   ?? '');

if (!$destino || !$texto) {
    exit(json_encode(['ok' => false, 'msg' => 'Destino e texto são obrigatórios']));
}

if ($destino === 'grupo') {
    $ok = enviarGrupo($texto);
    $msg = $ok ? 'Mensagem enviada para o grupo!' : 'Falha ao enviar para o grupo.';
} else {
    $numero = preg_replace('/\D/', '', $destino);
    $ok  = enviarMensagem($numero, $texto);
    $msg = $ok ? "Mensagem enviada para $numero!" : "Falha ao enviar para $numero.";
}

log_bot("Mensagem avulsa → $destino: \"" . mb_substr($texto, 0, 60) . "\"");
echo json_encode(['ok' => $ok, 'msg' => $msg]);
