<?php
// ====================================================
// MP Transações — Pagamentos recentes
// GET /mp/transacoes?limite=20&offset=0   (admin)
// ====================================================

$authUser = $_REQUEST['authUser'];
$userId   = (int)($authUser['id'] ?? 0);
$limite   = min((int)($_GET['limite'] ?? 20), 100);
$offset   = (int)($_GET['offset'] ?? 0);

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

    // Busca pagamentos recebidos
    $params = http_build_query([
        'sort'   => 'date_created',
        'criteria' => 'desc',
        'limit'  => $limite,
        'offset' => $offset,
    ]);

    $ch = curl_init("https://api.mercadopago.com/v1/payments/search?{$params}");
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER     => [
            "Authorization: Bearer {$accessToken}",
            'Content-Type: application/json',
        ],
        CURLOPT_TIMEOUT => 10,
    ]);
    $resp     = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode !== 200) {
        $err = json_decode($resp, true);
        http_response_code($httpCode);
        exit(json_encode(['ok' => false, 'msg' => $err['message'] ?? 'Erro ao buscar transações']));
    }

    $data     = json_decode($resp, true);
    $results  = $data['results'] ?? [];
    $total    = $data['paging']['total'] ?? 0;

    // Formata para exibição
    $transacoes = array_map(function ($p) {
        return [
            'id'          => $p['id'],
            'descricao'   => $p['description'] ?? '',
            'valor'       => (float)($p['transaction_amount'] ?? 0),
            'status'      => $p['status'] ?? '',
            'tipo'        => $p['payment_type_id'] ?? '',
            'metodo'      => $p['payment_method_id'] ?? '',
            'criado_em'   => $p['date_created'] ?? '',
            'aprovado_em' => $p['date_approved'] ?? null,
            'pagador'     => $p['payer']['first_name'] ?? '' . ' ' . ($p['payer']['last_name'] ?? ''),
            'email'       => $p['payer']['email'] ?? '',
        ];
    }, $results);

    exit(json_encode([
        'ok'         => true,
        'transacoes' => $transacoes,
        'total'      => $total,
        'limite'     => $limite,
        'offset'     => $offset,
    ]));

} catch (Throwable $e) {
    http_response_code(500);
    exit(json_encode(['ok' => false, 'msg' => $e->getMessage()]));
}
