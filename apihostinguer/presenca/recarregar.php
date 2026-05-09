<?php
require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/whatsapp.php';
require_once __DIR__ . '/bot.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit(json_encode(['ok' => false, 'msg' => 'Método não permitido']));
}

$lista = getListaAtual();

if (!$lista) {
    exit(json_encode(['ok' => false, 'msg' => 'Nenhuma lista ativa para a semana atual.']));
}

enviarRelatorio($lista['id']);

$jogadores = getJogadores($lista['id']);
$contagem  = array_count_values(array_column($jogadores, 'status'));

$msg = sprintf(
    'Relatório reenviado! Confirmados: %d | Ausentes: %d | Pendentes: %d | Sem resposta: %d',
    $contagem['confirmado']  ?? 0,
    $contagem['ausente']     ?? 0,
    $contagem['a_confirmar'] ?? 0,
    $contagem['aguardando']  ?? 0
);

log_bot("Recarregamento manual via painel.");
echo json_encode(['ok' => true, 'msg' => $msg]);
