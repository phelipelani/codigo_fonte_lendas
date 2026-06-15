<?php
// ====================================================
// API — REENVIO DE CONVOCAÇÃO PARA QUEM NÃO RESPONDEU
// POST /presenca/reenviar
// Reenvia a mensagem "SIM/NÃO/DEPOIS" apenas para os
// jogadores com status 'aguardando' (Sem Resposta).
// Requer: admin autenticado
// ====================================================

require_once __DIR__ . '/../bootstrap.php';
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../whatsapp.php';

@set_time_limit(120);

$lista = getListaAtual();

if (!$lista) {
    http_response_code(404);
    exit(json_encode([
        'ok'  => false,
        'msg' => 'Nenhuma lista ativa para a semana atual.',
    ], JSON_UNESCAPED_UNICODE));
}

if (!empty($lista['fechado'])) {
    http_response_code(409);
    exit(json_encode([
        'ok'  => false,
        'msg' => 'A lista já está fechada. Reabra antes de reenviar.',
    ], JSON_UNESCAPED_UNICODE));
}

// Busca apenas quem ainda não respondeu
$pendentes = Database::getInstance()->fetchAll(
    "SELECT * FROM jogadores_presenca
     WHERE lista_id = ? AND status = 'aguardando'
     ORDER BY nome ASC",
    [$lista['id']]
);

if (empty($pendentes)) {
    exit(json_encode([
        'ok'  => true,
        'msg' => 'Nenhum jogador pendente — todos já responderam!',
        'enviados' => 0,
        'falhas'   => 0,
    ], JSON_UNESCAPED_UNICODE));
}

$enviados = 0;
$falhas   = 0;

foreach ($pendentes as $jogador) {
    $apelido  = $jogador['apelido'] ?? explode(' ', $jogador['nome'])[0];
    $mensagem =
        "Oi {$apelido}! 👋\n\n" .
        "Ainda não recebi sua resposta sobre o racha de *" . botConfig('dia_racha') . "* " .
        "(" . botConfig('horario_racha') . ") em *" . botConfig('local_racha') . "*.\n\n" .
        "Você vai?\n\n" .
        "*SIM* — Tô dentro!\n" .
        "*NÃO* — Dessa não consigo\n" .
        "*DEPOIS* — Confirmo mais tarde";

    $ok = enviarMensagem($jogador['numero'], $mensagem);

    if ($ok) {
        $enviados++;
        log_bot("Reenvio convocação OK: {$jogador['nome']} ({$jogador['numero']})");
    } else {
        $falhas++;
        log_bot("Reenvio convocação FALHA: {$jogador['nome']} ({$jogador['numero']})");
    }

    sleep(1); // evita rate limit da Evolution API
}

log_bot("=== REENVIO CONVOCAÇÃO CONCLUÍDO: $enviados enviados, $falhas falhas ===");

exit(json_encode([
    'ok'       => true,
    'msg'      => "Convocação reenviada para $enviados jogador(es) pendente(s)" .
                  ($falhas ? ", $falhas falha(s)" : "") . ".",
    'enviados' => $enviados,
    'falhas'   => $falhas,
], JSON_UNESCAPED_UNICODE));
