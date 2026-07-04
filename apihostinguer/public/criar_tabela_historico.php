<?php
require_once __DIR__ . '/../config/env.php';
require_once __DIR__ . '/../config/database.php';
try {
    $db = Database::getInstance();
    $sql = "
    ALTER TABLE cartolendas_ranking 
    ADD COLUMN temporada VARCHAR(50) DEFAULT 'atual';
    ";
    
    $db->execute($sql);
    echo "<h1>Sucesso Absoluto!</h1><p>A coluna <b>temporada</b> foi adicionada na tabela de ranking com sucesso.</p>";
} catch (\Throwable $e) {
    echo "<h1>Erro ao alterar tabela</h1><p>" . htmlspecialchars($e->getMessage()) . "</p>";
}
