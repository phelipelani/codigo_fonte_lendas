<?php
// ====================================================
// CRON — FECHAR LISTA TERÇA 21:00
// ====================================================
// No Hostinger, configure o cron assim:
//   0 21 * * 2   /usr/bin/php /home/usuario/public_html/presenca/cron/fechar.php
// ====================================================

require_once __DIR__ . '/../bootstrap.php';
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../whatsapp.php';
require_once __DIR__ . '/../bot.php';

log_bot("=== CRON FECHAR LISTA INICIADO ===");

$lista = getListaAtual();

if (!$lista || !$lista['disparado'] || $lista['fechado']) {
    log_bot("Nenhuma lista ativa para fechar.");
    exit;
}

// Marca pendentes como ausente
$stmt = db()->prepare(
    "UPDATE jogadores_presenca
     SET status = 'ausente', horario_resposta = ?
     WHERE lista_id = ? AND status IN ('aguardando', 'a_confirmar')"
);
$horario = date('d/m/Y H:i');
$stmt->execute([$horario, $lista['id']]);
$marcados = $stmt->rowCount();

log_bot("$marcados jogador(es) sem resposta marcados como ausente.");

// Fecha a lista
db()->prepare(
    'UPDATE lista_presenca SET fechado = 1, disparado = 0, atualizado_em = NOW() WHERE id = ?'
)->execute([$lista['id']]);

// Envia relatório final
enviarRelatorio($lista['id']);

log_bot("=== LISTA FECHADA. Próxima lista será criada na segunda. ===");
