<?php
// ====================================================
// CRON — DISPARO SEGUNDA-FEIRA 10:00
// ====================================================
// No Hostinger, configure o cron assim:
//   0 10 * * 1   /usr/bin/php /home/usuario/public_html/presenca/cron/disparo.php
// ====================================================

require_once __DIR__ . '/../bootstrap.php';
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../whatsapp.php';
require_once __DIR__ . '/../bot.php';

log_bot("=== CRON DISPARO INICIADO ===");

$semana = getNumeroSemana('now');
$ano    = (int) date('Y');

// Verifica se já existe lista para esta semana
$stmt = db()->prepare('SELECT id FROM lista_presenca WHERE semana = ? AND ano = ? LIMIT 1');
$stmt->execute([$semana, $ano]);
$listaExistente = $stmt->fetch();

if ($listaExistente) {
    log_bot("Lista da semana $semana/$ano ja existe (id={$listaExistente['id']}). Abortando.");
    exit;
}

// Cria a lista da semana
$dataRacha = date('d/m/Y');
db()->prepare(
    'INSERT INTO lista_presenca (data_racha, semana, ano, disparado) VALUES (?, ?, ?, 0)'
)->execute([$dataRacha, $semana, $ano]);

$listaId = (int) db()->lastInsertId();
log_bot("Lista criada: id=$listaId, data=$dataRacha");

// Adiciona todos os jogadores (banco → fallback config.php)
$todosJogadores = getJogadoresAtivos();

$stmt = db()->prepare(
    'INSERT INTO jogadores_presenca (lista_id, nome, numero, tipo, apelido, status, disparado_em)
     VALUES (?, ?, ?, ?, ?, "aguardando", NOW())'
);

foreach ($todosJogadores as $j) {
    $apelido = escolherApelido($listaId);
    $stmt->execute([$listaId, $j['nome'], $j['numero'], $j['tipo'], $apelido]);
    log_bot("Jogador adicionado: {$j['nome']} ({$j['numero']}) - apelido: $apelido");
}

// Marca como disparado
db()->prepare('UPDATE lista_presenca SET disparado = 1, atualizado_em = NOW() WHERE id = ?')->execute([$listaId]);

// Envia mensagem inicial para cada jogador
$jogadores = getJogadores($listaId);
foreach ($jogadores as $jogador) {
    $mensagem =
        "Fala {$jogador['apelido']}, beleza? \n\n" .
        "É segunda e já bate aquela vontade de jogar bola!\n\n" .
        "Você vai estar no racha de *" . botConfig('dia_racha') . "* (" . botConfig('horario_racha') . ") em *" . botConfig('local_racha') . "*?\n\n" .
        "Responda com uma dessas palavras:\n" .
        "*SIM* - Tô dentro!\n" .
        "*NÃO* - Dessa não consigo\n" .
        "*DEPOIS* - Confirmo mais tarde";

    $ok = enviarMensagem($jogador['numero'], $mensagem);

    // Atualiza timestamp do disparo
    atualizarJogador($jogador['id'], ['disparado_em' => date('Y-m-d H:i:s')]);

    log_bot("Mensagem enviada para {$jogador['nome']}: " . ($ok ? 'OK' : 'FALHA'));
    sleep(2); // evita rate limit
}

log_bot("=== DISPARO CONCLUIDO: " . count($jogadores) . " jogadores notificados ===");
