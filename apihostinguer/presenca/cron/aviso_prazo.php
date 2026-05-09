<?php
// ====================================================
// CRON — AVISO DE PRAZO TERÇA 17:00
// ====================================================
// No Hostinger, configure o cron assim:
//   0 17 * * 2   /usr/bin/php /home/usuario/public_html/presenca/cron/aviso_prazo.php
// ====================================================

require_once __DIR__ . '/../bootstrap.php';
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../whatsapp.php';
require_once __DIR__ . '/../bot.php';

log_bot("=== CRON AVISO DE PRAZO INICIADO ===");

$lista = getListaAtual();

if (!$lista || !$lista['disparado'] || $lista['fechado']) {
    log_bot("Nenhuma lista ativa. Aviso abortado.");
    exit;
}

$stmt = db()->prepare(
    "SELECT * FROM jogadores_presenca
     WHERE lista_id = ? AND status IN ('aguardando', 'a_confirmar')"
);
$stmt->execute([$lista['id']]);
$pendentes = $stmt->fetchAll();

if (empty($pendentes)) {
    log_bot("Todos já responderam. Nenhum aviso necessário.");
    exit;
}

log_bot("Enviando aviso de prazo para " . count($pendentes) . " jogador(es)...");

foreach ($pendentes as $jogador) {
    $msg =
        "*Atenção, {$jogador['apelido']}!*\n\n" .
        "São 17h e você ainda não confirmou para o racha de hoje à noite.\n\n" .
        "A partir de agora sua vaga *não é mais garantida*!\n\n" .
        "Responda agora: *SIM* ou *NÃO*";

    $ok = enviarMensagem($jogador['numero'], $msg);
    atualizarJogador($jogador['id'], ['disparado_em' => date('Y-m-d H:i:s')]);

    log_bot("Aviso para {$jogador['nome']}: " . ($ok ? 'OK' : 'FALHA'));
    sleep(2);
}

log_bot("=== AVISO DE PRAZO CONCLUIDO ===");
