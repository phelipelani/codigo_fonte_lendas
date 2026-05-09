<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once __DIR__ . '/config/env.php';
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/src/utils/Pontos.php';

$id = 70;
$db = Database::getInstance();

echo "=== 1) PARTIDAS do campeonato $id ===\n";
$partidas = $db->fetchAll("SELECT id, status, campeonato_id, rodada_id, goleiro_timeA_id, goleiro_timeB_id, placar_timeA, placar_timeB FROM campeonato_partidas WHERE campeonato_id = ?", [$id]);
echo "Total: " . count($partidas) . "\n";
foreach ($partidas as $p) {
    echo "  id={$p['id']} status={$p['status']} rodada={$p['rodada_id']} placar={$p['placar_timeA']}x{$p['placar_timeB']} golA={$p['goleiro_timeA_id']} golB={$p['goleiro_timeB_id']}\n";
}

echo "\n=== 2) ESTATISTICAS INDIVIDUAIS (ep) ===\n";
$ep = $db->fetchAll("SELECT ep.partida_id, ep.jogador_id, ep.time_id, ep.gols, ep.assistencias FROM campeonato_estatisticas_partida ep JOIN campeonato_partidas cp ON cp.id = ep.partida_id AND cp.campeonato_id = ?", [$id]);
echo "Total registros: " . count($ep) . "\n";
foreach ($ep as $e) {
    echo "  partida={$e['partida_id']} jogador={$e['jogador_id']} time={$e['time_id']} gols={$e['gols']} assists={$e['assistencias']}\n";
}

echo "\n=== 3) RODADAS ===\n";
$rodadas = $db->fetchAll("SELECT id, status FROM rodadas WHERE campeonato_id = ?", [$id]);
foreach ($rodadas as $r) {
    echo "  rodada_id={$r['id']} status={$r['status']}\n";
    $cre = $db->fetchAll("SELECT cre.jogador_id, cre.time_id, j.nome, j.posicao FROM campeonato_rodada_elencos cre JOIN jogadores j ON j.id = cre.jogador_id WHERE cre.rodada_id = ? LIMIT 5", [$r['id']]);
    echo "  elenco rodada: " . count($cre) . " jogadores (5 primeiros):\n";
    foreach ($cre as $c) {
        echo "    {$c['nome']} [{$c['posicao']}] time_id={$c['time_id']}\n";
    }
}

echo "\n=== 4) GOLEIROS no elenco ===\n";
$gols = $db->fetchAll("SELECT DISTINCT j.id, j.nome, cre.time_id FROM campeonato_rodada_elencos cre JOIN rodadas r ON r.id = cre.rodada_id AND r.campeonato_id = ? JOIN jogadores j ON j.id = cre.jogador_id WHERE j.posicao = 'goleiro'", [$id]);
echo "Total goleiros: " . count($gols) . "\n";
foreach ($gols as $g) {
    $stats = $db->fetchOne("SELECT COUNT(id) AS jogos FROM campeonato_partidas WHERE campeonato_id = ? AND status = 'finalizada' AND (goleiro_timeA_id = ? OR goleiro_timeB_id = ?)", [$id, $g['id'], $g['id']]);
    echo "  {$g['nome']} (id={$g['id']}) time_id={$g['time_id']} partidas_como_goleiro={$stats['jogos']}\n";
}

echo "\n=== FIM ===\n";