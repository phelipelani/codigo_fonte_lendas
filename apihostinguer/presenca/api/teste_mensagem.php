<?php
// ====================================================
// API — ENVIO DE MENSAGEM DE TESTE
// POST /presenca/teste-mensagem
// Requer: admin autenticado
// Body: { "numero": "5512999999999", "tipo": "disparo" }
// tipos: disparo | lembrete | relatorio
// ====================================================

require_once __DIR__ . '/../bootstrap.php';
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../whatsapp.php';

$body  = json_decode(file_get_contents('php://input'), true) ?? [];
$numero = preg_replace('/\D/', '', $body['numero'] ?? '');
$tipo   = $body['tipo'] ?? 'disparo';

if (!$numero) {
    http_response_code(400);
    exit(json_encode(['ok' => false, 'msg' => 'Número é obrigatório (só dígitos, com DDI 55)'], JSON_UNESCAPED_UNICODE));
}

$apelido = 'Admin';

switch ($tipo) {
    case 'disparo':
        $mensagem =
            "🧪 *[TESTE DE DISPARO]*\n\n" .
            "Fala {$apelido}, beleza? \n\n" .
            "É segunda e já bate aquela vontade de jogar bola!\n\n" .
            "Você vai estar no racha de *" . botConfig('dia_racha') . "* (" . botConfig('horario_racha') . ") em *" . botConfig('local_racha') . "*?\n\n" .
            "Responda com uma dessas palavras:\n" .
            "*SIM* - Tô dentro!\n" .
            "*NÃO* - Dessa não consigo\n" .
            "*DEPOIS* - Confirmo mais tarde";
        break;

    case 'lembrete':
        $mensagem =
            "🧪 *[TESTE DE LEMBRETE]*\n\n" .
            "Ei {$apelido}! Lembrete do racha de *" . botConfig('dia_racha') . "* em *" . botConfig('local_racha') . "*.\n\n" .
            "Ainda não confirmou presença. Vai conseguir aparecer?\n\n" .
            "*SIM*, *NÃO* ou *DEPOIS*?";
        break;

    case 'relatorio':
        $mensagem =
            "🧪 *[TESTE DE RELATÓRIO]*\n\n" .
            "📋 *Relatório do Racha — " . botConfig('dia_racha') . "*\n" .
            botConfig('local_racha') . " | " . botConfig('dia_racha') . " às " . botConfig('horario_racha') . "\n\n" .
            "✅ *Confirmados (2):*\n" .
            "01. Admin\n" .
            "02. Teste\n\n" .
            "❌ *Ausentes (1):*\n" .
            "01. Exemplo\n\n" .
            "_Esta é uma mensagem de teste_";
        break;

    default:
        http_response_code(400);
        exit(json_encode(['ok' => false, 'msg' => 'Tipo inválido. Use: disparo, lembrete ou relatorio'], JSON_UNESCAPED_UNICODE));
}

$ok = enviarMensagem($numero, $mensagem);

log_bot("Teste de mensagem ($tipo) enviado para $numero: " . ($ok ? 'OK' : 'FALHA'));

exit(json_encode([
    'ok'  => $ok,
    'msg' => $ok
        ? "Mensagem de teste ($tipo) enviada para $numero!"
        : "Falha ao enviar para $numero. Verifique se o número está correto e no WhatsApp.",
], JSON_UNESCAPED_UNICODE));
