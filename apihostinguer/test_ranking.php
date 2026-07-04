<?php
require_once __DIR__ . '/config/database.php';
$db = Database::getInstance();
try {
    $sql = "
        SELECT 
            u.id, 
            u.nome, 
            u.avatar, 
            COUNT(DISTINCT i.figurinha_id) as total_obtidas,
            (SELECT COUNT(*) FROM album_figurinhas WHERE ativa = 1) as total_figurinhas,
            (SELECT COUNT(*) FROM album_pacotes p WHERE p.usuario_id = u.id AND p.status = 'fechado') as pacotes_abertos
        FROM usuarios u
        JOIN album_inventario i ON u.id = i.usuario_id
        JOIN album_figurinhas f ON i.figurinha_id = f.id
        WHERE f.ativa = 1
        GROUP BY u.id, u.nome, u.avatar
        ORDER BY total_obtidas DESC, u.nome ASC
    ";
    $ranking = $db->fetchAll($sql);
    echo "Sucesso: " . count($ranking) . " usuarios";
} catch (\Throwable $e) {
    echo "Erro SQL: " . $e->getMessage();
}
