<?php
// ====================================================
// API — Altera status de um jogador manualmente
// ====================================================
// POST /api/acao.php
// Body JSON: { "jogador_id": 5, "acao": "confirmar" }
// Ações: confirmar | ausente | aguardando | mensagem
// ====================================================

require_once __DIR__ . '/../bootstrap.php';
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../whatsapp.php';
require_once __DIR__ . '/../bot.php';

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit(json_encode(['ok' => false, 'msg' => 'Método não permitido']));
}

$body      = json_decode(file_get_contents('php://input'), true) ?? [];
$jogadorId = (int)($body['jogador_id'] ?? 0);
$acao      = $body['acao'] ?? '';

if (!$jogadorId || !$acao) {
    http_response_code(400);
    exit(json_encode(['ok' => false, 'msg' => 'Parâmetros inválidos']));
}

// Busca jogador e lista
$stmt = db()->prepare('SELECT jp.*, lp.id as lista_id, lp.data_racha FROM jogadores_presenca jp JOIN lista_presenca lp ON jp.lista_id = lp.id WHERE jp.id = ?');
$stmt->execute([$jogadorId]);
$jogador = $stmt->fetch();

if (!$jogador) {
    exit(json_encode(['ok' => false, 'msg' => 'Jogador não encontrado']));
}

$lista   = ['id' => $jogador['lista_id'], 'data_racha' => $jogador['data_racha']];
$horario = date('d/m/Y H:i');

switch ($acao) {
    case 'confirmar':
        $ordem = proximaOrdem($jogador['lista_id']);
        atualizarJogador($jogadorId, [
            'status'           => 'confirmado',
            'horario_resposta' => $horario,
            'ordem'            => $ordem,
        ]);
        log_bot("Admin confirmou manualmente: {$jogador['nome']}");
        enviarRelatorio($jogador['lista_id']);
        exit(json_encode(['ok' => true, 'msg' => "{$jogador['nome']} confirmado!"]));

    case 'ausente':
        atualizarJogador($jogadorId, [
            'status'           => 'ausente',
            'horario_resposta' => $horario,
            'ordem'            => null,
        ]);
        log_bot("Admin marcou como ausente: {$jogador['nome']}");
        enviarRelatorio($jogador['lista_id']);
        exit(json_encode(['ok' => true, 'msg' => "{$jogador['nome']} marcado como ausente."]));

    case 'aguardando':
        atualizarJogador($jogadorId, [
            'status'           => 'aguardando',
            'horario_resposta' => null,
            'ordem'            => null,
        ]);
        log_bot("Admin resetou status: {$jogador['nome']}");
        exit(json_encode(['ok' => true, 'msg' => "{$jogador['nome']} voltou para aguardando."]));

    case 'lembrete':
        $msg = "Ei {$jogador['apelido']}, passando pra lembrar!\n\n"
             . "Vai conseguir vir no racha de *" . botConfig('dia_racha') . "* (" . botConfig('horario_racha') . ") em *" . botConfig('local_racha') . "*?\n\n"
             . "Responda: *SIM* / *NÃO* / *DEPOIS*";
        $ok = enviarMensagem($jogador['numero'], $msg);
        atualizarJogador($jogadorId, ['ultimo_lembrete' => date('Y-m-d H:i:s')]);
        exit(json_encode(['ok' => $ok, 'msg' => $ok ? "Lembrete enviado para {$jogador['nome']}." : "Falha ao enviar."]));

    default:
        exit(json_encode(['ok' => false, 'msg' => 'Ação desconhecida']));
}
