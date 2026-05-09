<?php
/**
 * Fix script: Recalcula campeonato_estatisticas_partida para rodada_id=62
 *
 * Problema: os eventos em campeonato_eventos_partida têm time_id=0 (bug antigo).
 * Este script resolve o time_id correto via campeonato_rodada_elencos e
 * recalcula gols/assistencias a partir dos eventos.
 *
 * Uso: php fix_rodada62_stats.php
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once __DIR__ . '/config/env.php';
require_once __DIR__ . '/config/database.php';

$db = Database::getInstance();

$rodadaId = 62;

echo "=== Fix estatísticas para rodada_id={$rodadaId} ===\n\n";

// 1. Monta mapa jogador_id → time_id para esta rodada (via elencos)
$elencos = $db->fetchAll(
    "SELECT jogador_id, time_id FROM campeonato_rodada_elencos WHERE rodada_id = ?",
    [$rodadaId]
);
$jogadorTimeMap = [];
foreach ($elencos as $el) {
    $jogadorTimeMap[(int)$el['jogador_id']] = (int)$el['time_id'];
}

// Fallback: também carrega de campeonato_elencos (caso o jogador não esteja no rodada_elencos)
$rodadaInfo = $db->fetchOne("SELECT campeonato_id FROM rodadas WHERE id = ?", [$rodadaId]);
$campeonatoId = $rodadaInfo ? (int)$rodadaInfo['campeonato_id'] : 0;
if ($campeonatoId) {
    $elencosCamp = $db->fetchAll(
        "SELECT jogador_id, time_id FROM campeonato_elencos WHERE campeonato_id = ?",
        [$campeonatoId]
    );
    foreach ($elencosCamp as $ec) {
        $jid = (int)$ec['jogador_id'];
        if (!isset($jogadorTimeMap[$jid])) {
            $jogadorTimeMap[$jid] = (int)$ec['time_id'];
        }
    }
}

echo "Mapa jogador->time carregado: " . count($jogadorTimeMap) . " jogadores\n\n";

// 2. Buscar todas as partidas da rodada
$partidas = $db->fetchAll(
    "SELECT id, timeA_id, timeB_id, placar_timeA, placar_timeB
     FROM campeonato_partidas
     WHERE rodada_id = ?
     ORDER BY id",
    [$rodadaId]
);

if (empty($partidas)) {
    echo "Nenhuma partida encontrada para rodada_id={$rodadaId}\n";
    exit(1);
}

echo "Encontradas " . count($partidas) . " partidas\n\n";

$totalUpdated = 0;

foreach ($partidas as $partida) {
    $partidaId = (int)$partida['id'];
    $timeAId   = (int)$partida['timeA_id'];
    $timeBId   = (int)$partida['timeB_id'];
    echo "--- Partida #{$partidaId} (time {$timeAId} vs {$timeBId}) "
       . "placar: {$partida['placar_timeA']} x {$partida['placar_timeB']} ---\n";

    // 3. Buscar eventos desta partida
    $eventos = $db->fetchAll(
        "SELECT ev.id, ev.jogador_id, ev.time_id, ev.tipo, ev.minuto, ev.assist_por_jogador_id,
                j.nome AS jogador_nome
         FROM campeonato_eventos_partida ev
         JOIN jogadores j ON j.id = ev.jogador_id
         WHERE ev.partida_id = ?
         ORDER BY ev.minuto ASC",
        [$partidaId]
    );

    if (empty($eventos)) {
        echo "  Sem eventos registrados, pulando.\n\n";
        continue;
    }

    echo "  Eventos encontrados: " . count($eventos) . "\n";

    // 4. Resolver time_id de cada jogador e agregar gols/assistencias
    // Para cada partida, um jogador pertence a timeA ou timeB
    $stats = [];

    // Função auxiliar para resolver time_id do jogador nesta partida
    $resolverTimeId = function(int $jogId) use ($jogadorTimeMap, $timeAId, $timeBId): int {
        $timeId = $jogadorTimeMap[$jogId] ?? 0;
        // Verifica se o time do jogador é um dos times desta partida
        if ($timeId === $timeAId || $timeId === $timeBId) {
            return $timeId;
        }
        // Se não bateu (ex: substituto), tenta timeA primeiro, depois timeB
        // Isso não deveria acontecer se os elencos estão corretos
        return $timeAId; // fallback
    };

    foreach ($eventos as $e) {
        $jogId  = (int)$e['jogador_id'];
        $tipo   = $e['tipo'] ?? 'gol';

        // Resolve time_id correto do jogador
        $timeId = $resolverTimeId($jogId);

        $key = "{$jogId}_{$timeId}";
        if (!isset($stats[$key])) {
            $stats[$key] = [
                'jogador_id'   => $jogId,
                'time_id'      => $timeId,
                'gols'         => 0,
                'assistencias' => 0,
            ];
        }

        if (in_array($tipo, ['gol', 'gol_contra'])) {
            $stats[$key]['gols']++;
        }

        // Assistência via campo assist_por_jogador_id
        if (!empty($e['assist_por_jogador_id'])) {
            $aId     = (int)$e['assist_por_jogador_id'];
            $aTimeId = $resolverTimeId($aId);
            $aKey    = "{$aId}_{$aTimeId}";
            if (!isset($stats[$aKey])) {
                $stats[$aKey] = [
                    'jogador_id'   => $aId,
                    'time_id'      => $aTimeId,
                    'gols'         => 0,
                    'assistencias' => 0,
                ];
            }
            $stats[$aKey]['assistencias']++;
        }

        echo "    [{$tipo}] {$e['jogador_nome']} (jog={$jogId}, time={$timeId}, min={$e['minuto']})";
        if (!empty($e['assist_por_jogador_id'])) echo " assist_por={$e['assist_por_jogador_id']}";
        echo "\n";
    }

    // 5. Buscar registros existentes de estatísticas (já tem jogadores com gols=0)
    // para preservar jogadores que participaram mas não fizeram gol
    $existentes = $db->fetchAll(
        "SELECT jogador_id, time_id FROM campeonato_estatisticas_partida WHERE partida_id = ?",
        [$partidaId]
    );

    // Atualiza os existentes com os novos valores (sem deletar - preserva quem não fez gol)
    foreach ($existentes as $ex) {
        $jid = (int)$ex['jogador_id'];
        $tid = (int)$ex['time_id'];
        $key = "{$jid}_{$tid}";

        $gols    = $stats[$key]['gols'] ?? 0;
        $assists = $stats[$key]['assistencias'] ?? 0;

        $db->execute(
            "UPDATE campeonato_estatisticas_partida
             SET gols = ?, assistencias = ?
             WHERE partida_id = ? AND jogador_id = ? AND time_id = ?",
            [$gols, $assists, $partidaId, $jid, $tid]
        );

        if ($gols > 0 || $assists > 0) {
            echo "  -> ATUALIZADO jogador_id={$jid} time_id={$tid} gols={$gols} assists={$assists}\n";
        }

        // Remove do stats map para saber quais são novos
        unset($stats[$key]);
        $totalUpdated++;
    }

    // Insere jogadores que só tinham eventos (gol/assist) mas não estavam na tabela
    foreach ($stats as $s) {
        if ($s['gols'] > 0 || $s['assistencias'] > 0) {
            $db->execute(
                "INSERT INTO campeonato_estatisticas_partida
                    (partida_id, jogador_id, time_id, gols, assistencias)
                 VALUES (?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE gols = VALUES(gols), assistencias = VALUES(assistencias)",
                [$partidaId, $s['jogador_id'], $s['time_id'], $s['gols'], $s['assistencias']]
            );
            echo "  -> INSERIDO jogador_id={$s['jogador_id']} time_id={$s['time_id']} gols={$s['gols']} assists={$s['assistencias']}\n";
            $totalUpdated++;
        }
    }

    echo "\n";
}

echo "=== Concluído! Total de registros processados: {$totalUpdated} ===\n";

// 6. Verificação final: resumo de gols por jogador na rodada
echo "\n=== Verificação: Artilharia rodada {$rodadaId} ===\n";
$verificacao = $db->fetchAll(
    "SELECT j.nome, ep.time_id, t.nome AS time_nome,
            SUM(ep.gols) AS total_gols, SUM(ep.assistencias) AS total_assists
     FROM campeonato_estatisticas_partida ep
     JOIN jogadores j ON j.id = ep.jogador_id
     JOIN campeonato_partidas cp ON cp.id = ep.partida_id
     JOIN times t ON t.id = ep.time_id
     WHERE cp.rodada_id = ?
     GROUP BY ep.jogador_id, j.nome, ep.time_id, t.nome
     HAVING total_gols > 0 OR total_assists > 0
     ORDER BY total_gols DESC, total_assists DESC",
    [$rodadaId]
);

echo sprintf("%-20s %-20s %5s %5s\n", "JOGADOR", "TIME", "GOLS", "ASSIS");
echo str_repeat("-", 55) . "\n";
foreach ($verificacao as $v) {
    echo sprintf("%-20s %-20s %5d %5d\n", $v['nome'], $v['time_nome'], (int)$v['total_gols'], (int)$v['total_assists']);
}

echo "\n=== FIM ===\n";
