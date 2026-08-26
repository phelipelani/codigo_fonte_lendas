<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once __DIR__ . '/../config/env.php';
require_once __DIR__ . '/../config/database.php';

try {
    $db = Database::getInstance();

    $diego = $db->fetchOne("SELECT id, nome FROM jogadores WHERE nome LIKE '%Diego%amigo%Luis%'");
    $modelo = $db->fetchOne("SELECT id, nome FROM jogadores WHERE nome LIKE '%modelo%'");

    if (!$diego || !$modelo) {
        die("Jogadores não encontrados. Diego: " . print_r($diego, true) . ", Modelo: " . print_r($modelo, true));
    }

    echo "Diego ID: {$diego['id']} ({$diego['nome']})<br>";
    echo "Modelo ID: {$modelo['id']} ({$modelo['nome']})<br>";

    // Iniciar transação
    $db->execute("START TRANSACTION");

    // Atualizar campeonato_estatisticas_partida
    $db->execute(
        "UPDATE campeonato_estatisticas_partida SET jogador_id = ? WHERE jogador_id = ?",
        [$modelo['id'], $diego['id']]
    );
    echo "Estatísticas de partida atualizadas!<br>";

    // time_jogadores (se aplicável)
    $db->execute(
        "UPDATE time_jogadores SET jogador_id = ? WHERE jogador_id = ?",
        [$modelo['id'], $diego['id']]
    );
    echo "Vínculo com times atualizado!<br>";

    $db->execute("COMMIT");
    echo "Sucesso! Pode deletar este arquivo.";

} catch (Exception $e) {
    if (isset($db)) {
        $db->execute("ROLLBACK");
    }
    echo "Erro: " . $e->getMessage();
}
