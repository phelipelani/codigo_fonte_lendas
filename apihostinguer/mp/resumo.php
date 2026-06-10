<?php
// ====================================================
// MP Resumo — Entradas do mês atual e anterior
// GET /mp/resumo   (admin)
// Busca os últimos 300 pagamentos sem filtro de data
// (igual ao transacoes.php que sabemos funcionar)
// e agrega por mês no PHP.
// ====================================================

$authUser = $_REQUEST['authUser'];
$userId   = (int)($authUser['userId'] ?? 0);

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

    // Busca sem filtro de data — mesmo endpoint que transacoes.php
    $params = http_build_query([
        'sort'     => 'date_created',
        'criteria' => 'desc',
        'limit'    => 300,
        'offset'   => 0,
    ]);

    $ch = curl_init("https://api.mercadopago.com/v1/payments/search?{$params}");
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER     => [
            "Authorization: Bearer {$accessToken}",
            'Content-Type: application/json',
        ],
        CURLOPT_TIMEOUT => 15,
    ]);
    $resp     = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode !== 200) {
        $err = json_decode($resp, true);
        http_response_code($httpCode);
        exit(json_encode(['ok' => false, 'msg' => $err['message'] ?? 'Erro ao buscar pagamentos']));
    }

    $data    = json_decode($resp, true);
    $results = $data['results'] ?? [];

    // Limites de cada mês (apenas primeiros 10 caracteres: YYYY-MM-DD)
    $mesAtualInicio    = date('Y-m-01');
    $mesAtualFim       = date('Y-m-t');
    $mesAnteriorInicio = date('Y-m-01', strtotime('first day of last month'));
    $mesAnteriorFim    = date('Y-m-t',  strtotime('last day of last month'));

    $resumo = [
        'mes_atual'    => ['entradas' => 0.0, 'saidas' => 0.0, 'liquido' => 0.0, 'qtd_entradas' => 0, 'qtd_saidas' => 0],
        'mes_anterior' => ['entradas' => 0.0, 'saidas' => 0.0, 'liquido' => 0.0, 'qtd_entradas' => 0, 'qtd_saidas' => 0],
    ];

    foreach ($results as $r) {
        // Usa date_approved se disponível, senão date_created
        $dataRef = substr($r['date_approved'] ?? $r['date_created'] ?? '', 0, 10);
        if (!$dataRef) continue;

        $valor = (float)($r['transaction_amount'] ?? 0);

        if ($dataRef >= $mesAtualInicio && $dataRef <= $mesAtualFim) {
            $chave = 'mes_atual';
        } elseif ($dataRef >= $mesAnteriorInicio && $dataRef <= $mesAnteriorFim) {
            $chave = 'mes_anterior';
        } else {
            continue;
        }

        if ($valor > 0) {
            $resumo[$chave]['entradas']     += $valor;
            $resumo[$chave]['qtd_entradas'] += 1;
        }
    }

    $resumo['mes_atual']['liquido']    = round($resumo['mes_atual']['entradas'],    2);
    $resumo['mes_anterior']['liquido'] = round($resumo['mes_anterior']['entradas'], 2);
    $resumo['mes_atual']['entradas']    = round($resumo['mes_atual']['entradas'],    2);
    $resumo['mes_anterior']['entradas'] = round($resumo['mes_anterior']['entradas'], 2);

    // Labels em pt-BR
    $meses = [
        1=>'Janeiro',2=>'Fevereiro',3=>'Março',4=>'Abril',
        5=>'Maio',6=>'Junho',7=>'Julho',8=>'Agosto',
        9=>'Setembro',10=>'Outubro',11=>'Novembro',12=>'Dezembro',
    ];
    $resumo['mes_atual']['label']    = $meses[(int)date('n')]                           . ' ' . date('Y');
    $resumo['mes_anterior']['label'] = $meses[(int)date('n', strtotime('last month'))] . ' ' . date('Y', strtotime('last month'));

    exit(json_encode(['ok' => true] + $resumo, JSON_UNESCAPED_UNICODE));

} catch (Throwable $e) {
    http_response_code(500);
    exit(json_encode(['ok' => false, 'msg' => $e->getMessage()]));
}
