<?php
// ====================================================
// WRAPPER EVOLUTION API
// ====================================================

require_once __DIR__ . '/bootstrap.php';

function _chamarEvolution(string $endpoint, array $body): array {
    $url  = rtrim(EVOLUTION_URL, '/') . $endpoint;
    $json = json_encode($body, JSON_UNESCAPED_UNICODE);

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => $json,
        CURLOPT_HTTPHEADER     => [
            'Content-Type: application/json',
            'apikey: ' . EVOLUTION_APIKEY,
        ],
        CURLOPT_TIMEOUT        => 15,
        CURLOPT_SSL_VERIFYPEER => false,
    ]);

    $resposta = curl_exec($ch);
    $erro     = curl_error($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($erro) {
        log_bot("ERRO curl [$endpoint]: $erro");
        return ['ok' => false, 'erro' => $erro];
    }

    $dados = json_decode($resposta, true) ?? [];
    $dados['_http_code'] = $httpCode;
    return $dados;
}

function enviarMensagem(string $numero, string $texto): bool {
    $resultado = _chamarEvolution(
        '/message/sendText/' . EVOLUTION_INSTANCE,
        ['number' => $numero, 'text' => $texto, 'delay' => 1200]
    );

    $ok = isset($resultado['key']['id']) || ($resultado['_http_code'] >= 200 && $resultado['_http_code'] < 300);
    if (!$ok) {
        log_bot("Falha ao enviar para $numero: " . json_encode($resultado));
    }
    return $ok;
}

function enviarGrupo(string $texto): bool {
    if (!defined('ID_GRUPO') || !ID_GRUPO) return false;

    $resultado = _chamarEvolution(
        '/message/sendText/' . EVOLUTION_INSTANCE,
        ['number' => ID_GRUPO, 'text' => $texto, 'delay' => 1200]
    );

    $ok = isset($resultado['key']['id']) || ($resultado['_http_code'] >= 200 && $resultado['_http_code'] < 300);
    if (!$ok) {
        log_bot("Falha ao enviar para o grupo: " . json_encode($resultado));
    }
    return $ok;
}

function log_bot(string $msg): void {
    $dir = __DIR__ . '/logs';
    if (!is_dir($dir)) mkdir($dir, 0755, true);
    file_put_contents(
        $dir . '/bot.log',
        '[' . date('d/m/Y H:i:s') . '] ' . $msg . PHP_EOL,
        FILE_APPEND | LOCK_EX
    );
}
