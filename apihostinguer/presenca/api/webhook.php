<?php
// ====================================================
// WEBHOOK — recebe eventos da Evolution API
// POST /presenca/webhook
// ====================================================

require_once __DIR__ . '/../bootstrap.php';
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../whatsapp.php';
require_once __DIR__ . '/../bot.php';

$rawBody = file_get_contents('php://input');
$payload = json_decode($rawBody, true);

// ── Payload vazio / inválido ─────────────────────────
if (!$payload) {
    log_bot("WEBHOOK ERRO: payload vazio ou JSON inválido");
    http_response_code(400);
    exit(json_encode(['ok' => false]));
}

$evento = $payload['event'] ?? '';

// ── Log de todos os eventos recebidos (debug) ─────────
log_bot("WEBHOOK evento=$evento instance=" . ($payload['instance'] ?? '-'));

// ── Ignora eventos que não sejam mensagens ────────────
if ($evento !== 'messages.upsert') {
    exit(json_encode(['ok' => true, 'msg' => "evento ignorado: $evento"]));
}

// ── Extrai a mensagem (Evolution API v1 e v2) ─────────
$data = $payload['data'] ?? [];

// v1: data é array de mensagens
// v2: data é objeto único
$msg = is_array($data) && isset($data[0]) ? $data[0] : $data;

// Ignora mensagens enviadas pelo próprio bot
if ($msg['key']['fromMe'] ?? false) {
    exit(json_encode(['ok' => true, 'msg' => 'fromMe ignorado']));
}

$remoteJid = $msg['key']['remoteJid'] ?? '';
log_bot("WEBHOOK remoteJid=$remoteJid");

// Ignora mensagens de grupo
if (str_contains($remoteJid, '@g.us')) {
    exit(json_encode(['ok' => true, 'msg' => 'grupo ignorado']));
}

// ── Extrai número ─────────────────────────────────────
$numero = preg_replace('/\D/', '', explode('@', $remoteJid)[0]);

// ── Extrai texto (múltiplos tipos de mensagem) ────────
$texto = $msg['message']['conversation']
      ?? $msg['message']['extendedTextMessage']['text']
      ?? $msg['message']['imageMessage']['caption']
      ?? $msg['message']['buttonsResponseMessage']['selectedDisplayText']
      ?? $msg['message']['listResponseMessage']['title']
      ?? '';

// Fallback: tenta campo 'text' direto (algumas versões da API)
if (!$texto && isset($msg['message'])) {
    foreach ($msg['message'] as $type => $content) {
        if (is_string($content)) { $texto = $content; break; }
        if (is_array($content) && isset($content['text'])) { $texto = $content['text']; break; }
    }
}

$timestamp = $msg['messageTimestamp'] ?? time();

log_bot("WEBHOOK numero=$numero texto=\"$texto\" ts=$timestamp");

if (!$numero) {
    log_bot("WEBHOOK IGNORADO: número vazio");
    exit(json_encode(['ok' => true, 'msg' => 'numero vazio']));
}

if (!$texto) {
    log_bot("WEBHOOK IGNORADO: sem texto (tipo=" . implode(',', array_keys($msg['message'] ?? [])) . ")");
    exit(json_encode(['ok' => true, 'msg' => 'sem texto']));
}

// ── Verifica lista ativa ──────────────────────────────
$lista = getListaAtual();
if (!$lista) {
    log_bot("WEBHOOK IGNORADO: nenhuma lista esta semana");
    exit(json_encode(['ok' => true, 'msg' => 'sem lista esta semana']));
}
if (!$lista['disparado']) {
    log_bot("WEBHOOK IGNORADO: lista #{$lista['id']} ainda não disparada");
    exit(json_encode(['ok' => true, 'msg' => 'lista nao disparada']));
}
if ($lista['fechado']) {
    log_bot("WEBHOOK IGNORADO: lista #{$lista['id']} fechada");
    exit(json_encode(['ok' => true, 'msg' => 'lista fechada']));
}

// ── Busca jogador pelo número — tenta todas as variações BR ──
//
// WhatsApp pode mandar:  5512999999999 (13 dígitos: 55 + DDD + 9 + 8)
//                        551299999999  (12 dígitos: 55 + DDD + 8, sem o 9)
// Banco pode ter salvo:  5512999999999 | 551299999999
//                        12999999999   | 1299999999   (sem DDI 55)

function variacoesNumero(string $n): array {
    $vars = [$n];

    if (str_starts_with($n, '55') && strlen($n) >= 12) {
        $semPais = substr($n, 2);               // remove DDI 55
        $vars[]  = $semPais;

        if (strlen($n) === 13 && $n[4] === '9') {
            // 5512 9 XXXXXXXX → 5512 XXXXXXXX (sem o 9)
            $sem9   = substr($n, 0, 4) . substr($n, 5);
            $vars[] = $sem9;
            $vars[] = substr($sem9, 2);         // sem DDI também
        }
        if (strlen($n) === 12) {
            // 5512 XXXXXXXX → 5512 9 XXXXXXXX (adiciona o 9)
            $com9   = substr($n, 0, 4) . '9' . substr($n, 4);
            $vars[] = $com9;
            $vars[] = substr($com9, 2);         // sem DDI também
        }
    } else {
        // Não tem DDI — tenta adicionar 55
        $comPais = '55' . $n;
        $vars[]  = $comPais;

        if (strlen($n) === 11 && $n[2] === '9') {
            // 12 9 XXXXXXXX → 12 XXXXXXXX (sem o 9)
            $sem9   = substr($n, 0, 2) . substr($n, 3);
            $vars[] = $sem9;
            $vars[] = '55' . $sem9;
        }
        if (strlen($n) === 10) {
            // 12 XXXXXXXX → 12 9 XXXXXXXX (adiciona o 9)
            $com9   = substr($n, 0, 2) . '9' . substr($n, 2);
            $vars[] = $com9;
            $vars[] = '55' . $com9;
        }
    }

    return array_unique($vars);
}

$jogador       = null;
$numeroUsado   = $numero;
foreach (variacoesNumero($numero) as $variante) {
    $jogador = getJogadorPorNumero($lista['id'], $variante);
    if ($jogador) {
        $numeroUsado = $variante;
        if ($variante !== $numero) {
            log_bot("WEBHOOK: número normalizado $numero → $variante");
        }
        break;
    }
}

if (!$jogador) {
    log_bot("WEBHOOK IGNORADO: número $numero (variações tentadas: " . implode(', ', variacoesNumero($numero)) . ") não está na lista #{$lista['id']}");
    exit(json_encode(['ok' => true, 'msg' => "numero nao reconhecido: $numero"]));
}

// ── Verifica se mensagem é anterior ao disparo ────────
$disparadoEm = null;
if (!empty($jogador['disparado_em'])) {
    $disparadoEm = strtotime($jogador['disparado_em']);
}

if ($disparadoEm && $timestamp < ($disparadoEm - 60)) { // 60s de tolerância
    log_bot("WEBHOOK IGNORADO: mensagem antiga (ts=$timestamp < disparado=" . date('H:i:s', $disparadoEm) . ")");
    exit(json_encode(['ok' => true, 'msg' => 'mensagem antiga']));
}

// ── Processa resposta ─────────────────────────────────
log_bot("WEBHOOK PROCESSANDO: {$jogador['nome']} respondeu \"$texto\"");
processarResposta($lista, $jogador, $texto);

http_response_code(200);
echo json_encode(['ok' => true]);
