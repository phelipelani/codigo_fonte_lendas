<?php
// ====================================================
// MP Balance — Saldo da conta conectada
// GET /mp/balance   (admin)
// ====================================================

$authUser = $_REQUEST['authUser'];
$userId   = (int)($authUser['id'] ?? 0);

try {
    $pdo  = Database::getInstance()->getConnection();
    $stmt = $pdo->prepare("SELECT access_token FROM mp_contas WHERE user_id = ? LIMIT 1");
    $stmt->execute([$userId]);
    $conta = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$conta) {
        http_response_code(404);
        exit(json_encode(['ok' => false, 'msg' => 'Conta MP não conectada']));
    }

    $accessToken = $conta['access_token'];

    // Busca saldo via API MP
    $ch = curl_init('https://api.mercadopago.com/v1/account/balance');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER     => [
            "Authorization: Bearer {$accessToken}",
            'Content-Type: application/json',
        ],
        CURLOPT_TIMEOUT        => 10,
    ]);
    $resp     = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode !== 200) {
        $err = json_decode($resp, true);
        http_response_code($httpCode);
        exit(json_encode([
            'ok'  => false,
            'msg' => $err['message'] ?? 'Erro ao buscar saldo',
        ]));
    }

    $data = json_decode($resp, true);

    // Estrutura relevante do saldo MP
    $saldo = [
        'total'       => $data['total_amount']       ?? 0,
        'disponivel'  => $data['available_balance']  ?? 0,
        'pendente'    => $data['unavailable_balance'] ?? 0,
        'moeda'       => 'BRL',
    ];

    exit(json_encode(['ok' => true, 'saldo' => $saldo]));

} catch (Throwable $e) {
    http_response_code(500);
    exit(json_encode(['ok' => false, 'msg' => $e->getMessage()]));
}
