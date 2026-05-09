<?php
// ====================================================
// API — VISUALIZADOR DE LOGS DO BOT
// GET /presenca/logs?linhas=100
// Requer: admin autenticado
// ====================================================

require_once __DIR__ . '/../bootstrap.php';

$logFile = __DIR__ . '/../logs/bot.log';
$linhas  = min((int)($_GET['linhas'] ?? 100), 500); // max 500 linhas

if (!file_exists($logFile)) {
    exit(json_encode([
        'ok'   => true,
        'logs' => [],
        'msg'  => 'Nenhum log encontrado ainda.',
    ], JSON_UNESCAPED_UNICODE));
}

// Lê as últimas N linhas sem carregar o arquivo inteiro
$linhasLog = [];
$fp = fopen($logFile, 'r');
if ($fp) {
    // Vai para o final e lê de trás para frente
    fseek($fp, 0, SEEK_END);
    $pos     = ftell($fp);
    $buffer  = '';
    $count   = 0;

    while ($pos > 0 && $count < $linhas) {
        $pos--;
        fseek($fp, $pos);
        $char = fgetc($fp);
        if ($char === "\n" && $buffer !== '') {
            array_unshift($linhasLog, trim($buffer));
            $buffer = '';
            $count++;
        } else {
            $buffer = $char . $buffer;
        }
    }

    if ($buffer !== '' && $count < $linhas) {
        array_unshift($linhasLog, trim($buffer));
    }

    fclose($fp);
}

// Tamanho do arquivo
$tamanho = filesize($logFile);
$tamanhoStr = $tamanho > 1024
    ? round($tamanho / 1024, 1) . ' KB'
    : $tamanho . ' B';

exit(json_encode([
    'ok'       => true,
    'logs'     => $linhasLog,
    'total'    => count($linhasLog),
    'tamanho'  => $tamanhoStr,
], JSON_UNESCAPED_UNICODE));
