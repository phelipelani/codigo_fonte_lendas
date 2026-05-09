<?php
// ====================================================
// API — CRUD de jogadores do bot
// GET    /presenca/jogadores          → lista todos
// POST   /presenca/jogadores          → cria jogador
// PUT    /presenca/jogadores/{id}     → edita jogador
// DELETE /presenca/jogadores/{id}     → remove jogador
// POST   /presenca/jogadores/{id}/toggle → ativa/desativa
// ====================================================

require_once __DIR__ . '/../bootstrap.php';
require_once __DIR__ . '/../db.php';

// $method e $jogadorId são passados pelo roteador (public/index.php)

// ── GET — lista todos ────────────────────────────────
if ($method === 'GET') {
    $rows = Database::getInstance()->fetchAll(
        "SELECT id, nome, numero, tipo, ativo, criado_em, atualizado_em
         FROM bot_jogadores
         ORDER BY tipo DESC, nome ASC"
    );
    exit(json_encode(['ok' => true, 'jogadores' => $rows], JSON_UNESCAPED_UNICODE));
}

// ── POST sem ID — criar ─────────────────────────────
if ($method === 'POST' && !isset($jogadorId)) {
    $body   = json_decode(file_get_contents('php://input'), true) ?? [];
    $nome   = trim($body['nome']   ?? '');
    $numero = normalizarTelefone($body['numero'] ?? '');
    $tipo   = $body['tipo'] ?? 'linha';

    if (!$nome || !$numero) {
        http_response_code(400);
        exit(json_encode(['ok' => false, 'msg' => 'Nome e número são obrigatórios']));
    }
    if (!in_array($tipo, ['linha', 'goleiro'])) {
        http_response_code(400);
        exit(json_encode(['ok' => false, 'msg' => 'Tipo deve ser linha ou goleiro']));
    }

    try {
        Database::getInstance()->execute(
            "INSERT INTO bot_jogadores (nome, numero, tipo) VALUES (?, ?, ?)",
            [$nome, $numero, $tipo]
        );
        $id = Database::getInstance()->lastInsertId();
        log_bot("Jogador adicionado via painel: $nome ($numero) - $tipo");
        exit(json_encode(['ok' => true, 'msg' => "$nome adicionado!", 'id' => $id]));
    } catch (Throwable $e) {
        http_response_code(409);
        exit(json_encode(['ok' => false, 'msg' => 'Número já cadastrado ou erro: ' . $e->getMessage()]));
    }
}

// ── PUT — editar ────────────────────────────────────
if ($method === 'PUT' && isset($jogadorId)) {
    $body   = json_decode(file_get_contents('php://input'), true) ?? [];
    $nome   = trim($body['nome']   ?? '');
    $numero = normalizarTelefone($body['numero'] ?? '');
    $tipo   = $body['tipo'] ?? 'linha';

    if (!$nome || !$numero) {
        http_response_code(400);
        exit(json_encode(['ok' => false, 'msg' => 'Nome e número são obrigatórios']));
    }
    if (!in_array($tipo, ['linha', 'goleiro'])) {
        http_response_code(400);
        exit(json_encode(['ok' => false, 'msg' => 'Tipo deve ser linha ou goleiro']));
    }

    $affected = Database::getInstance()->execute(
        "UPDATE bot_jogadores SET nome = ?, numero = ?, tipo = ? WHERE id = ?",
        [$nome, $numero, $tipo, $jogadorId]
    );

    if (!$affected) {
        exit(json_encode(['ok' => false, 'msg' => 'Jogador não encontrado']));
    }

    log_bot("Jogador #$jogadorId editado via painel: $nome ($numero)");
    exit(json_encode(['ok' => true, 'msg' => "$nome atualizado!"]));
}

// ── DELETE — remover ────────────────────────────────
if ($method === 'DELETE' && isset($jogadorId)) {
    $jogador = Database::getInstance()->fetchOne(
        "SELECT nome FROM bot_jogadores WHERE id = ?", [$jogadorId]
    );
    if (!$jogador) {
        exit(json_encode(['ok' => false, 'msg' => 'Jogador não encontrado']));
    }

    Database::getInstance()->execute(
        "DELETE FROM bot_jogadores WHERE id = ?", [$jogadorId]
    );

    log_bot("Jogador #{$jogadorId} ({$jogador['nome']}) removido via painel");
    exit(json_encode(['ok' => true, 'msg' => "{$jogador['nome']} removido!"]));
}

// ── POST /{id}/toggle — ativar/desativar ─────────────
if ($method === 'POST' && isset($jogadorId)) {
    $jogador = Database::getInstance()->fetchOne(
        "SELECT nome, ativo FROM bot_jogadores WHERE id = ?", [$jogadorId]
    );
    if (!$jogador) {
        exit(json_encode(['ok' => false, 'msg' => 'Jogador não encontrado']));
    }

    $novoAtivo = $jogador['ativo'] ? 0 : 1;
    Database::getInstance()->execute(
        "UPDATE bot_jogadores SET ativo = ? WHERE id = ?", [$novoAtivo, $jogadorId]
    );

    $status = $novoAtivo ? 'ativado' : 'desativado';
    log_bot("Jogador {$jogador['nome']} $status via painel");
    exit(json_encode(['ok' => true, 'msg' => "{$jogador['nome']} $status!", 'ativo' => (bool)$novoAtivo]));
}

http_response_code(405);
exit(json_encode(['ok' => false, 'msg' => 'Método não permitido']));
