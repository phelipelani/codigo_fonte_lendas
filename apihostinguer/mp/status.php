<?php
// ====================================================
// MP Status — Verifica se conta MP está conectada
// GET /mp/status   (admin)
// Retorna: { ok, conectado, mp_user_id, scope, expira_em }
// ====================================================

$authUser = $_REQUEST['authUser'];
$userId   = (int)($authUser['id'] ?? 0);

try {
    $pdo  = Database::getInstance()->getConnection();
    $stmt = $pdo->prepare(
        "SELECT mp_user_id, scope, token_expira_em, public_key, atualizado_em
         FROM mp_contas WHERE user_id = ? LIMIT 1"
    );
    $stmt->execute([$userId]);
    $conta = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$conta) {
        exit(json_encode(['ok' => true, 'conectado' => false]));
    }

    exit(json_encode([
        'ok'          => true,
        'conectado'   => true,
        'mp_user_id'  => $conta['mp_user_id'],
        'scope'       => $conta['scope'],
        'expira_em'   => $conta['token_expira_em'],
        'public_key'  => $conta['public_key'],
        'atualizado'  => $conta['atualizado_em'],
    ], JSON_UNESCAPED_UNICODE));

} catch (Throwable $e) {
    http_response_code(500);
    exit(json_encode(['ok' => false, 'msg' => $e->getMessage()]));
}
