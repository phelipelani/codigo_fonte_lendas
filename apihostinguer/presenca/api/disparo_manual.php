<?php
// ====================================================
// API — DISPARO MANUAL DA LISTA SEMANAL
// POST /presenca/disparar
// Requer: admin autenticado
// ====================================================

require_once __DIR__ . '/../bootstrap.php';
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../whatsapp.php';

@set_time_limit(120); // até 2min para enviar todas as mensagens

$body  = json_decode(file_get_contents('php://input'), true) ?? [];
$forcar = !empty($body['forcar']); // true = recria lista mesmo que já exista esta semana

$semana = getNumeroSemana('now');
$ano    = (int) date('Y');

// Verifica lista existente
$listaExistente = Database::getInstance()->fetchOne(
    'SELECT id, disparado, fechado FROM lista_presenca WHERE semana = ? AND ano = ? LIMIT 1',
    [$semana, $ano]
);

if ($listaExistente && !$forcar) {
    http_response_code(409);
    exit(json_encode([
        'ok'      => false,
        'msg'     => 'Já existe uma lista para esta semana (id=' . $listaExistente['id'] . '). Use forcar:true para recriar.',
        'lista_id' => $listaExistente['id'],
    ], JSON_UNESCAPED_UNICODE));
}

// Se forçar, apaga lista e jogadores da semana atual
if ($listaExistente && $forcar) {
    Database::getInstance()->execute(
        'DELETE FROM lista_presenca WHERE semana = ? AND ano = ?',
        [$semana, $ano]
    );
    log_bot("Disparo manual: lista anterior (semana $semana/$ano) removida para novo disparo forçado.");
}

// Cria nova lista
$dataRacha = date('d/m/Y');
Database::getInstance()->execute(
    'INSERT INTO lista_presenca (data_racha, semana, ano, disparado) VALUES (?, ?, ?, 0)',
    [$dataRacha, $semana, $ano]
);
$listaId = (int) db()->lastInsertId();
log_bot("Disparo manual: lista criada id=$listaId, data=$dataRacha");

// Adiciona jogadores
$todosJogadores = getJogadoresAtivos();
$stmtInsert = db()->prepare(
    'INSERT INTO jogadores_presenca (lista_id, nome, numero, tipo, apelido, status, disparado_em)
     VALUES (?, ?, ?, ?, ?, "aguardando", NOW())'
);
foreach ($todosJogadores as $j) {
    $apelido = escolherApelido($listaId);
    $numeroNorm = normalizarTelefone($j['numero']);
    $stmtInsert->execute([$listaId, $j['nome'], $numeroNorm, $j['tipo'], $apelido]);
    if ($numeroNorm !== $j['numero']) {
        log_bot("Número normalizado: {$j['nome']} {$j['numero']} → $numeroNorm");
    }
}

// Marca como disparado
Database::getInstance()->execute(
    'UPDATE lista_presenca SET disparado = 1, atualizado_em = NOW() WHERE id = ?',
    [$listaId]
);

// Envia mensagens
$jogadores = getJogadores($listaId);
$enviados  = 0;
$falhas    = 0;

foreach ($jogadores as $jogador) {
    $mensagem =
        "Fala {$jogador['apelido']}, beleza? \n\n" .
        "É " . botConfig('dia_racha') . " e já bate aquela vontade de jogar bola!\n\n" .
        "Você vai estar no racha de *" . botConfig('dia_racha') . "* (" . botConfig('horario_racha') . ") em *" . botConfig('local_racha') . "*?\n\n" .
        "Responda com uma dessas palavras:\n" .
        "*SIM* - Tô dentro!\n" .
        "*NÃO* - Dessa não consigo\n" .
        "*DEPOIS* - Confirmo mais tarde";

    $ok = enviarMensagem($jogador['numero'], $mensagem);
    atualizarJogador($jogador['id'], ['disparado_em' => date('Y-m-d H:i:s')]);

    if ($ok) $enviados++; else $falhas++;
    log_bot("Disparo manual para {$jogador['nome']}: " . ($ok ? 'OK' : 'FALHA'));
    sleep(1); // evita rate limit
}

log_bot("=== DISPARO MANUAL CONCLUÍDO: $enviados enviados, $falhas falhas ===");

exit(json_encode([
    'ok'       => true,
    'msg'      => "Lista disparada! $enviados mensagens enviadas" . ($falhas ? ", $falhas falhas" : "") . ".",
    'lista_id' => $listaId,
    'enviados' => $enviados,
    'falhas'   => $falhas,
], JSON_UNESCAPED_UNICODE));
