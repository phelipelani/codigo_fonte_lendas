<?php
// ====================================================
// MP OAuth — Callback após autorização
// GET /mp/callback  (browser redirect do Mercado Pago)
// Sem auth JWT — usa o state para identificar o usuário
// ====================================================

$frontendBase = 'https://futlendas.com.br';

$code  = $_GET['code']  ?? '';
$state = $_GET['state'] ?? '';
$error = $_GET['error'] ?? '';

if ($error) {
    header("Location: {$frontendBase}/financeiro?mp=erro&msg=" . urlencode($error));
    exit;
}

if (!$code || !$state) {
    header("Location: {$frontendBase}/financeiro?mp=erro&msg=parametros_invalidos");
    exit;
}

// ── Valida e decodifica o state ──────────────────────
$secret = $_ENV['JWT_SECRET'] ?? 'futlendas_secret';
$parts  = explode('.', $state, 2);
if (count($parts) !== 2) {
    header("Location: {$frontendBase}/financeiro?mp=erro&msg=state_invalido");
    exit;
}
[$payload, $sig] = $parts;
$expectedSig = substr(hash_hmac('sha256', $payload, $secret), 0, 16);
if (!hash_equals($expectedSig, $sig)) {
    header("Location: {$frontendBase}/financeiro?mp=erro&msg=state_assinatura_invalida");
    exit;
}

$data = json_decode(base64_decode($payload), true);
$userId = (int)($data['uid'] ?? 0);
$ts     = (int)($data['ts'] ?? 0);

// State não pode ter mais de 10 minutos
if (!$userId || (time() - $ts) > 600) {
    header("Location: {$frontendBase}/financeiro?mp=erro&msg=state_expirado");
    exit;
}

// ── Troca o code pelo access_token ──────────────────
$clientId     = $_ENV['MP_CLIENT_ID']     ?? '';
$clientSecret = $_ENV['MP_CLIENT_SECRET'] ?? '';
$redirectUri  = $_ENV['MP_REDIRECT_URI']  ?? 'https://futlendas.com.br/api/mp/callback';

$ch = curl_init('https://api.mercadopago.com/oauth/token');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST           => true,
    CURLOPT_HTTPHEADER     => ['Content-Type: application/x-www-form-urlencoded'],
    CURLOPT_POSTFIELDS     => http_build_query([
        'client_id'     => $clientId,
        'client_secret' => $clientSecret,
        'grant_type'    => 'authorization_code',
        'code'          => $code,
        'redirect_uri'  => $redirectUri,
    ]),
    CURLOPT_TIMEOUT        => 15,
]);
$resp     = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

$token = json_decode($resp, true);

if ($httpCode !== 200 || empty($token['access_token'])) {
    $errMsg = urlencode($token['message'] ?? $token['error'] ?? 'troca_falhou');
    error_log("[MP OAuth] Falha na troca do code: HTTP {$httpCode} — {$resp}");
    header("Location: {$frontendBase}/financeiro?mp=erro&msg={$errMsg}");
    exit;
}

$accessToken  = $token['access_token'];
$refreshToken = $token['refresh_token'] ?? null;
$mpUserId     = (string)($token['user_id'] ?? '');
$publicKey    = $token['public_key'] ?? null;
$scope        = $token['scope'] ?? null;
$expiresIn    = (int)($token['expires_in'] ?? 0); // segundos
$expiraEm     = $expiresIn > 0
    ? date('Y-m-d H:i:s', time() + $expiresIn)
    : null;

// ── Salva ou atualiza no banco ───────────────────────
try {
    $pdo = Database::getInstance()->getConnection();
    $stmt = $pdo->prepare("
        INSERT INTO mp_contas
            (user_id, mp_user_id, access_token, refresh_token, token_expira_em, public_key, scope)
        VALUES
            (?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            mp_user_id      = VALUES(mp_user_id),
            access_token    = VALUES(access_token),
            refresh_token   = VALUES(refresh_token),
            token_expira_em = VALUES(token_expira_em),
            public_key      = VALUES(public_key),
            scope           = VALUES(scope),
            atualizado_em   = NOW()
    ");
    $stmt->execute([$userId, $mpUserId, $accessToken, $refreshToken, $expiraEm, $publicKey, $scope]);

    error_log("[MP OAuth] Conta MP {$mpUserId} conectada para user {$userId}");
    header("Location: {$frontendBase}/financeiro?mp=conectado");
    exit;

} catch (Throwable $e) {
    error_log("[MP OAuth] Erro ao salvar conta: " . $e->getMessage());
    header("Location: {$frontendBase}/financeiro?mp=erro&msg=" . urlencode('erro_banco'));
    exit;
}
