<?php
// ====================================================
// MP Criar PIX — Gera cobrança PIX para jogador
// POST /mp/pix   (admin)
// Body: { valor, descricao, nome_pagador, email_pagador, cpf_pagador? }
// ====================================================

$authUser = $_REQUEST['authUser'];
$userId   = (int)($authUser['id'] ?? 0);

$body    = json_decode(file_get_contents('php://input'), true) ?? [];
$valor   = (float)($body['valor']         ?? 0);
$descr   = trim($body['descricao']        ?? 'Racha FutLendas');
$nome    = trim($body['nome_pagador']     ?? '');
$email   = trim($body['email_pagador']    ?? '');
$cpf     = preg_replace('/\D/', '', $body['cpf_pagador'] ?? '');

if ($valor <= 0) {
    http_response_code(400);
    exit(json_encode(['ok' => false, 'msg' => 'Valor inválido']));
}
if (!$email) {
    http_response_code(400);
    exit(json_encode(['ok' => false, 'msg' => 'E-mail do pagador é obrigatório']));
}

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

    // Monta o payload para PIX
    $payload = [
        'transaction_amount' => $valor,
        'description'        => $descr,
        'payment_method_id'  => 'pix',
        'payer'              => [
            'email'      => $email,
            'first_name' => $nome ?: 'Jogador',
        ],
    ];

    if ($cpf && strlen($cpf) === 11) {
        $payload['payer']['identification'] = [
            'type'   => 'CPF',
            'number' => $cpf,
        ];
    }

    $ch = curl_init('https://api.mercadopago.com/v1/payments');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_HTTPHEADER     => [
            "Authorization: Bearer {$accessToken}",
            'Content-Type: application/json',
            'X-Idempotency-Key: futlendas-' . uniqid(),
        ],
        CURLOPT_POSTFIELDS     => json_encode($payload),
        CURLOPT_TIMEOUT        => 15,
    ]);
    $resp     = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    $result = json_decode($resp, true);

    if ($httpCode >= 400 || !$result) {
        http_response_code($httpCode ?: 500);
        exit(json_encode([
            'ok'  => false,
            'msg' => $result['message'] ?? 'Erro ao criar PIX',
        ]));
    }

    // Extrai dados do QR code
    $txInfo     = $result['point_of_interaction']['transaction_data'] ?? [];
    $qrCode     = $txInfo['qr_code']        ?? null;
    $qrCodeBase64 = $txInfo['qr_code_base64'] ?? null;
    $ticketUrl  = $txInfo['ticket_url']      ?? null;

    exit(json_encode([
        'ok'           => true,
        'payment_id'   => $result['id'],
        'status'       => $result['status'],
        'valor'        => $valor,
        'qr_code'      => $qrCode,
        'qr_code_img'  => $qrCodeBase64 ? "data:image/png;base64,{$qrCodeBase64}" : null,
        'ticket_url'   => $ticketUrl,
        'expiracao'    => $result['date_of_expiration'] ?? null,
    ]));

} catch (Throwable $e) {
    http_response_code(500);
    exit(json_encode(['ok' => false, 'msg' => $e->getMessage()]));
}
