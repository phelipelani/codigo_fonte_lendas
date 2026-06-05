<?php
/**
 * Script de recálculo retroativo — rodar 1x no servidor, deletar depois.
 * Acesse: https://www.futlendas.com.br/api/recalcular.php?token=fl-migrate-2024
 */

define('CLI_MODE', true);
require_once __DIR__ . '/config/env.php';
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/src/utils/HttpError.php';
require_once __DIR__ . '/src/utils/Pontos.php';
require_once __DIR__ . '/src/controllers/RodadaController.php';
require_once __DIR__ . '/src/controllers/CampeonatoController.php';

// Proteção por token
$token = $_GET['token'] ?? '';
if ($token !== 'fl-migrate-2024') {
    http_response_code(403);
    die('<h2>403 — Token inválido</h2>');
}

header('Content-Type: text/html; charset=utf-8');

$pdo = Database::getInstance()->getConnection();

echo '<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  body { font-family: monospace; background:#0a0a0a; color:#e2e8f0; padding:20px; }
  h2 { color:#22d3ee; } h3 { color:#94a3b8; margin-top:24px; }
  .ok   { color:#4ade80; } .skip { color:#94a3b8; } .err  { color:#f87171; }
  .box  { background:#111; border:1px solid #1e293b; border-radius:8px; padding:16px; margin:8px 0; }
  .done { color:#fde047; font-size:1.2em; margin-top:24px; }
  .warn { color:#fb923c; border:1px solid #fb923c; padding:12px; border-radius:8px; margin-top:16px; }
</style></head><body>';

echo '<h2>FutLendas — Recálculo Retroativo</h2>';

// ── PASSO 1: Prêmios de rodada ────────────────────────────────────────────────
echo '<h3>PASSO 1 — Prêmios de rodada (MVP, artilheiro, garçom, pé de rato...)</h3><div class="box">';
$rodadas = $pdo->query("SELECT id, data FROM rodadas WHERE status = 'finalizada' ORDER BY data ASC")->fetchAll(PDO::FETCH_ASSOC);
$rc = new RodadaController();
$okR = 0; $errR = 0;
foreach ($rodadas as $r) {
    try {
        $rc->salvarPremiosRodada((int)$r['id']);
        echo "<span class='ok'>✅ Rodada #{$r['id']} ({$r['data']})</span><br>";
        $okR++;
    } catch (Throwable $e) {
        echo "<span class='err'>❌ Rodada #{$r['id']}: " . htmlspecialchars($e->getMessage()) . "</span><br>";
        $errR++;
    }
}
echo "<br><b>Total: " . count($rodadas) . " | OK: $okR | Erros: $errR</b></div>";

// ── PASSO 2: Prêmios de campeonato ────────────────────────────────────────────
echo '<h3>PASSO 2 — Prêmios de campeonato (MVP, artilheiro, garçom, pé de rato...)</h3><div class="box">';
$camps = $pdo->query("SELECT id, nome FROM campeonatos WHERE status = 'finalizado' ORDER BY data ASC")->fetchAll(PDO::FETCH_ASSOC);
$cc = new CampeonatoController();
$okC = 0; $errC = 0;
foreach ($camps as $c) {
    try {
        $premios = $cc->salvarPremiosCampeonato((int)$c['id']);
        echo "<span class='ok'>✅ [{$c['id']}] {$c['nome']} — " . count($premios) . " prêmios</span><br>";
        foreach ($premios as $p) {
            echo "&nbsp;&nbsp;&nbsp;<span class='skip'>• {$p['tipo']}: {$p['jogador']} ({$p['valor']})</span><br>";
        }
        $okC++;
    } catch (Throwable $e) {
        echo "<span class='err'>❌ [{$c['id']}] {$c['nome']}: " . htmlspecialchars($e->getMessage()) . "</span><br>";
        $errC++;
    }
}
echo "<br><b>Total: " . count($camps) . " | OK: $okC | Erros: $errC</b></div>";

// ── PASSO 3: Registrar jogadores campeões ─────────────────────────────────────
echo '<h3>PASSO 3 — Registrar jogadores campeões</h3><div class="box">';
foreach ($camps as $c) {
    $campId = (int)$c['id'];
    $campeaoId = (int)($pdo->query("SELECT time_campeao_id FROM campeonatos WHERE id = $campId")->fetchColumn() ?: 0);
    if (!$campeaoId) {
        echo "<span class='skip'>⏭️ [{$campId}] {$c['nome']} — sem campeão, pulando</span><br>";
        continue;
    }
    try {
        $pdo->prepare("INSERT IGNORE INTO campeonato_vencedores (campeonato_id, time_id, posicao) VALUES (?, ?, 1)")->execute([$campId, $campeaoId]);
        $stmt = $pdo->prepare("SELECT DISTINCT ep.jogador_id FROM campeonato_estatisticas_partida ep JOIN campeonato_partidas cp ON cp.id = ep.partida_id AND cp.campeonato_id = ? AND cp.status = 'finalizada' WHERE ep.time_id = ?");
        $stmt->execute([$campId, $campeaoId]);
        $jogadores = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $ins = $pdo->prepare("INSERT IGNORE INTO campeonato_vencedores (campeonato_id, jogador_id, time_id, posicao) VALUES (?, ?, ?, 1)");
        foreach ($jogadores as $jog) $ins->execute([$campId, (int)$jog['jogador_id'], $campeaoId]);
        echo "<span class='ok'>✅ [{$campId}] {$c['nome']} — " . count($jogadores) . " jogadores</span><br>";
    } catch (Throwable $e) {
        echo "<span class='err'>❌ [{$campId}] {$c['nome']}: " . htmlspecialchars($e->getMessage()) . "</span><br>";
    }
}
echo '</div>';

echo '<p class="done">✅ Recálculo concluído!</p>';
echo '<p class="warn">⚠️ <b>DELETE este arquivo agora!</b><br>Hostinger → Gerenciador de Arquivos → apague <code>recalcular.php</code></p>';
echo '</body></html>';
