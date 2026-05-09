<?php
// ====================================================
// API — Retorna estado atual em JSON para o dashboard
// ====================================================

require_once __DIR__ . '/../bootstrap.php';
require_once __DIR__ . '/../db.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

$lista = getListaAtual();

if (!$lista) {
    echo json_encode(['lista' => null, 'jogadores' => [], 'config' => [
        'dia_racha'     => botConfig('dia_racha'),
        'horario_racha' => botConfig('horario_racha'),
        'local_racha'   => botConfig('local_racha'),
    ]]);
    exit;
}

$jogadores = getJogadores($lista['id']);

// Separa por status e tipo para o dashboard
$confirmados  = [];
$pendentes    = [];
$ausentes     = [];
$semResposta  = [];

foreach ($jogadores as $j) {
    $item = [
        'id'               => $j['id'],
        'nome'             => $j['nome'],
        'apelido'          => $j['apelido'],
        'tipo'             => $j['tipo'],
        'status'           => $j['status'],
        'horario_resposta' => $j['horario_resposta'],
        'ordem'            => $j['ordem'],
    ];

    switch ($j['status']) {
        case 'confirmado':  $confirmados[] = $item; break;
        case 'a_confirmar': $pendentes[]   = $item; break;
        case 'ausente':     $ausentes[]    = $item; break;
        default:            $semResposta[] = $item; break;
    }
}

// Ordena confirmados pela ordem de confirmação
usort($confirmados, fn($a, $b) => ($a['ordem'] ?? 999) - ($b['ordem'] ?? 999));

echo json_encode([
    'lista' => [
        'id'           => $lista['id'],
        'data_racha'   => $lista['data_racha'],
        'disparado'    => (bool) $lista['disparado'],
        'fechado'      => (bool) $lista['fechado'],
        'atualizado_em'=> $lista['atualizado_em'],
    ],
    'jogadores' => [
        'confirmados' => $confirmados,
        'pendentes'   => $pendentes,
        'ausentes'    => $ausentes,
        'sem_resposta'=> $semResposta,
    ],
    'config' => [
        'dia_racha'                => botConfig('dia_racha'),
        'horario_racha'            => botConfig('horario_racha'),
        'local_racha'              => botConfig('local_racha'),
        'intervalo_lembrete_horas' => botConfig('intervalo_lembrete_horas'),
    ],
], JSON_UNESCAPED_UNICODE);
