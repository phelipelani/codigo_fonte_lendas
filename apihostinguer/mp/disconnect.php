<?php
// ====================================================
// MP Disconnect — Remove conta MP do banco
// POST /mp/disconnect   (admin)
// ====================================================

$authUser = $_REQUEST['authUser'];
$userId   = (int)($authUser['id'] ?? 0);

try {
    $pdo  = Database::getInstance()->getConnection();
    $stmt = $pdo->prepare("DELETE FROM mp_contas WHERE user_id = ?");
    $stmt->execute([$userId]);

    if ($stmt->rowCount() === 0) {
        exit(json_encode(['ok' => false, 'msg' => 'Nenhuma conta MP conectada']));
    }

    error_log("[MP] Conta desconectada para user {$userId}");
    exit(json_encode(['ok' => true, 'msg' => 'Conta Mercado Pago desconectada!']));

} catch (Throwable $e) {
    http_response_code(500);
    exit(json_encode(['ok' => false, 'msg' => $e->getMessage()]));
}
