<?php
// ====================================================
// API — FECHAR / REABRIR LISTA DA SEMANA
// POST /presenca/fechar
// Requer: admin autenticado
// ====================================================

require_once __DIR__ . '/../bootstrap.php';
require_once __DIR__ . '/../db.php';

$lista = getListaAtual();

if (!$lista) {
    http_response_code(404);
    exit(json_encode([
        'ok'  => false,
        'msg' => 'Nenhuma lista ativa encontrada para esta semana.',
    ], JSON_UNESCAPED_UNICODE));
}

// Toggle: fecha se aberta, reabre se fechada
$novoFechado = $lista['fechado'] ? 0 : 1;

Database::getInstance()->execute(
    'UPDATE lista_presenca SET fechado = ?, atualizado_em = NOW() WHERE id = ?',
    [$novoFechado, $lista['id']]
);

$status = $novoFechado ? 'fechada' : 'reaberta';
log_bot("Lista #{$lista['id']} $status via painel admin.");

exit(json_encode([
    'ok'     => true,
    'msg'    => "Lista $status com sucesso!",
    'fechado' => (bool) $novoFechado,
], JSON_UNESCAPED_UNICODE));
