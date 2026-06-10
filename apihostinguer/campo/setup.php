<?php
/**
 * campo/setup.php — Fase 1 do modulo /campo
 *
 * Cria as tabelas campo_* (a partir de migrations/campo_001_fundacao.sql)
 * e faz o seed inicial: clube "Caraguatas" + usuarios diretor/tecnico.
 *
 * Rodar UMA vez via:  GET /campo/setup?key=SUA_CHAVE
 * Protegido pela env CAMPO_SETUP_KEY (definida no index.php antes de incluir este arquivo).
 *
 * Query opcional:
 *   ?clube=Caraguatas
 *   ?senha_diretor=...   (default: diretor123)
 *   ?senha_tecnico=...   (default: tecnico123)
 *
 * E IDEMPOTENTE: rodar de novo nao duplica nada.
 */

require_once __DIR__ . '/../config/campo_database.php';
$pdo = CampoDatabase::getInstance()->getConnection();
$out = ['tabelas' => [], 'erros' => [], 'seed' => []];

// ---------- 1. Executa o DDL ----------
$sqlFile = __DIR__ . '/../migrations/campo_001_fundacao.sql';
if (!is_file($sqlFile)) {
    echo '<pre>Migration nao encontrada: ' . htmlspecialchars($sqlFile) . '</pre>';
    return;
}

$sql = file_get_contents($sqlFile);

// Remove linhas de comentario (-- ...) para nao quebrar o split por ;
$linhas = array_filter(
    explode("\n", $sql),
    fn($l) => strncmp(ltrim($l), '--', 2) !== 0
);
$sqlLimpo = implode("\n", $linhas);

foreach (array_filter(array_map('trim', explode(';', $sqlLimpo))) as $stmt) {
    if ($stmt === '') {
        continue;
    }
    try {
        $pdo->exec($stmt);
        if (preg_match('/CREATE TABLE IF NOT EXISTS\s+(\w+)/i', $stmt, $m)) {
            $out['tabelas'][] = $m[1];
        }
    } catch (Throwable $e) {
        $out['erros'][] = $e->getMessage();
    }
}

// ---------- 2. Seed do clube ----------
$nomeClube = trim($_GET['clube'] ?? 'Caraguatas');
$clube = $pdo->prepare('SELECT id FROM campo_clubes WHERE nome = ? LIMIT 1');
$clube->execute([$nomeClube]);
$row = $clube->fetch(PDO::FETCH_ASSOC);

if ($row) {
    $clubeId = (int) $row['id'];
    $out['seed'][] = "Clube '{$nomeClube}' ja existia (id {$clubeId}).";
} else {
    $pdo->prepare('INSERT INTO campo_clubes (nome) VALUES (?)')->execute([$nomeClube]);
    $clubeId = (int) $pdo->lastInsertId();
    $out['seed'][] = "Clube '{$nomeClube}' criado (id {$clubeId}).";
}

// ---------- 3. Seed dos usuarios ----------
$seedUser = function (PDO $pdo, int $clubeId, string $nome, string $username, string $senha, string $papel) use (&$out) {
    $chk = $pdo->prepare('SELECT id FROM campo_usuarios WHERE username = ? LIMIT 1');
    $chk->execute([$username]);
    if ($chk->fetch()) {
        $out['seed'][] = "Usuario '{$username}' ja existia (nao alterado).";
        return;
    }
    $hash = password_hash($senha, PASSWORD_BCRYPT);
    $ins  = $pdo->prepare(
        'INSERT INTO campo_usuarios (clube_id, nome, username, password_hash, papel, ativo) VALUES (?, ?, ?, ?, ?, 1)'
    );
    $ins->execute([$clubeId, $nome, $username, $hash, $papel]);
    $out['seed'][] = "Usuario '{$username}' ({$papel}) criado. Senha: {$senha}";
};

$senhaDir = $_GET['senha_diretor'] ?? 'diretor123';
$senhaTec = $_GET['senha_tecnico'] ?? 'tecnico123';

$seedUser($pdo, $clubeId, 'Diretor do Clube', 'diretor', $senhaDir, 'diretor');
$seedUser($pdo, $clubeId, 'Técnico do Clube', 'tecnico', $senhaTec, 'tecnico');

// ---------- 4. Resumo ----------
header('Content-Type: text/html; charset=utf-8');
echo '<h2>Setup /campo — Fase 1</h2>';
echo '<p><b>Tabelas garantidas:</b> ' . htmlspecialchars(implode(', ', $out['tabelas']) ?: '(nenhuma nova)') . '</p>';
echo '<p><b>Seed:</b></p><ul>';
foreach ($out['seed'] as $s) {
    echo '<li>' . htmlspecialchars($s) . '</li>';
}
echo '</ul>';
if ($out['erros']) {
    echo '<p style="color:#b00"><b>Erros:</b></p><ul>';
    foreach ($out['erros'] as $e) {
        echo '<li>' . htmlspecialchars($e) . '</li>';
    }
    echo '</ul>';
}
echo '<hr><p style="color:#a60"><b>IMPORTANTE:</b> apague/desative a rota de setup depois de rodar, '
   . 'e troque as senhas padrao no primeiro acesso.</p>';
