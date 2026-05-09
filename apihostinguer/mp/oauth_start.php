<?php
// ====================================================
// MP OAuth — Inicia o fluxo de autorização
// GET /mp/oauth/start   (admin)
// Retorna: { ok, url }  → frontend abre essa URL
// ====================================================

$authUser = $_REQUEST['authUser'];
$userId   = (int)($authUser['id'] ?? 0);

if (!$userId) {
    http_response_code(401);
    exit(json_encode(['ok' => false, 'msg' => 'Usuário não identificado']));
}

$clientId    = $_ENV['MP_CLIENT_ID']    ?? '';
$redirectUri = $_ENV['MP_REDIRECT_URI'] ?? 'https://futlendas.com.br/api/mp/callback';

if (!$clientId) {
    http_response_code(500);
    exit(json_encode(['ok' => false, 'msg' => 'MP_CLIENT_ID não configurado no .env']));
}

// Gera state assinado (user_id + timestamp + HMAC)
$payload = base64_encode(json_encode(['uid' => $userId, 'ts' => time()]));
$secret  = $_ENV['JWT_SECRET'] ?? 'futlendas_secret';
$sig     = substr(hash_hmac('sha256', $payload, $secret), 0, 16);
$state   = $payload . '.' . $sig;

// URL de autorização do Mercado Pago
$params = http_build_query([
    'client_id'     => $clientId,
    'response_type' => 'code',
    'platform_id'   => 'mp',
    'redirect_uri'  => $redirectUri,
    'state'         => $state,
]);

$url = "https://auth.mercadopago.com.br/authorization?{$params}";

exit(json_encode(['ok' => true, 'url' => $url], JSON_UNESCAPED_SLASHES));
