<?php
// ====================================================
// Registra o webhook desta API na Evolution API
// GET /presenca/configurar-webhook?token=MIGRATION_TOKEN
// (token validado no index.php antes do require)
//
// Configura a Evolution para enviar mensagens recebidas
// para /presenca/webhook?token=..., que é o token exigido
// pelo webhook.php (PRESENCA_WEBHOOK_TOKEN ou EVOLUTION_APIKEY).
// ====================================================

header('Content-Type: application/json; charset=utf-8');

if (!EVOLUTION_URL || !EVOLUTION_INSTANCE || !EVOLUTION_APIKEY) {
    http_response_code(500);
    exit(json_encode([
        'ok'  => false,
        'msg' => 'EVOLUTION_URL, EVOLUTION_INSTANCE ou EVOLUTION_APIKEY não configurados no .env',
    ], JSON_UNESCAPED_UNICODE));
}

function _evoRequest(string $metodo, string $endpoint, ?array $body = null): array
{
    $ch = curl_init(rtrim(EVOLUTION_URL, '/') . $endpoint);
    $opts = [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST  => $metodo,
        CURLOPT_HTTPHEADER     => [
            'Content-Type: application/json',
            'apikey: ' . EVOLUTION_APIKEY,
        ],
        CURLOPT_TIMEOUT        => 15,
        CURLOPT_SSL_VERIFYPEER => false,
    ];
    if ($body !== null) {
        $opts[CURLOPT_POSTFIELDS] = json_encode($body, JSON_UNESCAPED_UNICODE);
    }
    curl_setopt_array($ch, $opts);

    $resposta = curl_exec($ch);
    $erro     = curl_error($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($erro) {
        return ['_http_code' => 0, '_curl_error' => $erro];
    }
    $dados = json_decode($resposta, true) ?? ['_raw' => $resposta];
    $dados['_http_code'] = $httpCode;
    return $dados;
}

// ── Monta a URL pública do webhook a partir desta própria requisição ──
$scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
$host   = $_SERVER['HTTP_HOST'] ?? 'futlendas.com.br';
$pathReq = parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH) ?? '';
$webhookPath = str_replace('/presenca/configurar-webhook', '/presenca/webhook', $pathReq);

$tokenWebhook = $_ENV['PRESENCA_WEBHOOK_TOKEN'] ?? ($_ENV['EVOLUTION_APIKEY'] ?? '');
$webhookUrl   = "{$scheme}://{$host}{$webhookPath}?token=" . urlencode($tokenWebhook);

// ── Tenta o formato v2 da Evolution; se falhar, tenta o v1 ──
$eventos = ['MESSAGES_UPSERT'];

$respV2 = _evoRequest('POST', '/webhook/set/' . EVOLUTION_INSTANCE, [
    'webhook' => [
        'enabled'         => true,
        'url'             => $webhookUrl,
        'webhookByEvents' => false,
        'webhookBase64'   => false,
        'events'          => $eventos,
    ],
]);
$ok      = $respV2['_http_code'] >= 200 && $respV2['_http_code'] < 300;
$formato = 'v2';
$respV1  = null;

if (!$ok) {
    $respV1 = _evoRequest('POST', '/webhook/set/' . EVOLUTION_INSTANCE, [
        'enabled'           => true,
        'url'               => $webhookUrl,
        'webhook_by_events' => false,
        'events'            => $eventos,
    ]);
    $ok      = $respV1['_http_code'] >= 200 && $respV1['_http_code'] < 300;
    $formato = 'v1';
}

// ── Confere como ficou ──
$configAtual = _evoRequest('GET', '/webhook/find/' . EVOLUTION_INSTANCE);

log_bot('Webhook ' . ($ok ? "configurado ({$formato})" : 'FALHOU ao configurar') . ": {$webhookUrl}");

http_response_code($ok ? 200 : 502);
exit(json_encode([
    'ok'                => $ok,
    'formato_usado'     => $ok ? $formato : null,
    'webhook_url'       => $webhookUrl,
    'resposta_set'      => $ok && $formato === 'v2' ? $respV2 : ($respV1 ?? $respV2),
    'config_atual'      => $configAtual,
    'proximo_passo'     => $ok
        ? 'Pronto! Peça para alguém responder o bot no WhatsApp e confira /presenca/dados.'
        : 'Falha ao registrar. Confira EVOLUTION_URL/INSTANCE/APIKEY no .env e a resposta acima.',
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT));
