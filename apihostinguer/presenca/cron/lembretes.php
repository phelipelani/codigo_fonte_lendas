<?php
// ====================================================
// CRON — LEMBRETES A CADA 2 HORAS
// ====================================================
// No Hostinger, configure o cron assim:
//   0 */2 * * 1,2   /usr/bin/php /home/usuario/public_html/presenca/cron/lembretes.php
// (roda a cada 2h apenas na segunda e terça)
// ====================================================

require_once __DIR__ . '/../bootstrap.php';
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../whatsapp.php';
require_once __DIR__ . '/../bot.php';

log_bot("=== CRON LEMBRETES INICIADO ===");

$lista = getListaAtual();

if (!$lista || !$lista['disparado'] || $lista['fechado']) {
    log_bot("Nenhuma lista ativa. Lembretes abortados.");
    exit;
}

$agora            = time();
$intervaloSegundos = (int)botConfig('intervalo_lembrete_horas') * 3600;

// Busca pendentes cujo último contato foi há 2h+
$stmt = db()->prepare(
    "SELECT * FROM jogadores_presenca
     WHERE lista_id = ?
       AND status IN ('aguardando', 'a_confirmar')
       AND (
             ultimo_lembrete IS NULL
             OR TIMESTAMPDIFF(SECOND, ultimo_lembrete, NOW()) >= ?
           )"
);
$stmt->execute([$lista['id'], $intervaloSegundos]);
$pendentes = $stmt->fetchAll();

if (empty($pendentes)) {
    log_bot("Nenhum lembrete necessário neste ciclo.");
    exit;
}

log_bot("Enviando lembretes para " . count($pendentes) . " jogador(es)...");

foreach ($pendentes as $jogador) {
    if ($jogador['status'] === 'a_confirmar') {
        $msg =
            "Ei {$jogador['apelido']}, passando pra lembrar!\n\n" .
            "Você disse que ia confirmar depois. Já decidiu?\n\n" .
            "Racha de *" . botConfig('dia_racha') . "* (" . botConfig('horario_racha') . ") em *" . botConfig('local_racha') . "*.\n\n" .
            "Responda: *SIM* / *NÃO* / *DEPOIS*";
    } else {
        $msg =
            "Ei {$jogador['apelido']}, passando pra lembrar!\n\n" .
            "Ainda não recebi sua resposta sobre o racha de *" . botConfig('dia_racha') . "* (" . botConfig('horario_racha') . ") em *" . botConfig('local_racha') . "*.\n\n" .
            "Vai conseguir vir?\n\n" .
            "Responda: *SIM* / *NÃO* / *DEPOIS*";
    }

    $ok = enviarMensagem($jogador['numero'], $msg);

    atualizarJogador($jogador['id'], [
        'ultimo_lembrete' => date('Y-m-d H:i:s'),
        'disparado_em'    => date('Y-m-d H:i:s'),
    ]);

    log_bot("Lembrete para {$jogador['nome']} (status: {$jogador['status']}): " . ($ok ? 'OK' : 'FALHA'));
    sleep(2);
}

log_bot("=== LEMBRETES CONCLUIDOS ===");
