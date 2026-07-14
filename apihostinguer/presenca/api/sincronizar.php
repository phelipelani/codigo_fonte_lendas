<?php
// ====================================================
// API — SINCRONIZAR RESPOSTAS PERDIDAS
// POST /presenca/sincronizar
//
// Busca mensagens recentes direto na Evolution API
// e processa as que chegaram enquanto o webhook estava
// fora do ar (não foram processadas ainda).
// Requer: admin autenticado
// ====================================================

require_once __DIR__ . '/../bootstrap.php';
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../whatsapp.php';
require_once __DIR__ . '/../bot.php';

@set_time_limit(120);

$lista = getListaAtual();

if (!$lista) {
    http_response_code(404);
    exit(json_encode(['ok' => false, 'msg' => 'Nenhuma lista ativa esta semana.'], JSON_UNESCAPED_UNICODE));
}

if (!$lista['disparado']) {
    http_response_code(409);
    exit(json_encode(['ok' => false, 'msg' => 'Lista ainda não foi disparada.'], JSON_UNESCAPED_UNICODE));
}

// Busca todos os jogadores da lista atual
$jogadores = getJogadores($lista['id']);

if (empty($jogadores)) {
    exit(json_encode(['ok' => true, 'msg' => 'Nenhum jogador na lista.', 'processadas' => 0], JSON_UNESCAPED_UNICODE));
}

// Monta mapa: numero_normalizado → jogador (para lookup rápido)
$mapaJogadores = [];
foreach ($jogadores as $j) {
    foreach (variacoesNumero($j['numero']) as $var) {
        $mapaJogadores[$var] = $j;
    }
}

// Calcula timestamp do disparo (mínimo: início do dia de hoje)
$inicioHoje = strtotime('today 00:00:00');
$disparoTs  = max($inicioHoje, strtotime($lista['data_racha'] ?? 'today') ?: $inicioHoje);

log_bot("=== SINCRONIZAR iniciado. Lista #{$lista['id']}. Buscando msgs desde " . date('d/m H:i', $disparoTs) . " ===");

// Busca mensagens recentes de todos os jogadores via Evolution API
// Endpoint: POST /chat/findMessages/{instance}
$evolutionUrl  = rtrim(EVOLUTION_URL, '/');
$evolutionInst = EVOLUTION_INSTANCE;
$evolutionKey  = EVOLUTION_APIKEY;

$processadas = 0;
$ignoradas   = 0;
$erros       = 0;

// Para cada jogador na lista, busca mensagens recebidas
foreach ($jogadores as $jogador) {
    // Formata número para remoteJid (Evolution usa formato 55XXXXXXXXXXX@s.whatsapp.net)
    $numero = $jogador['numero'];
    // Garante que tem DDI 55
    if (!str_starts_with($numero, '55')) {
        $numero = '55' . $numero;
    }
    $remoteJid = $numero . '@s.whatsapp.net';

    // Busca últimas mensagens desse contato
    $endpoint = "$evolutionUrl/chat/findMessages/$evolutionInst";
    $body = json_encode([
        'where' => [
            'key' => [
                'remoteJid' => $remoteJid,
                'fromMe'    => false,
            ],
            'messageTimestamp' => ['gte' => $disparoTs],
        ],
        'limit' => 20,
    ], JSON_UNESCAPED_UNICODE);

    $ch = curl_init($endpoint);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => $body,
        CURLOPT_HTTPHEADER     => [
            'Content-Type: application/json',
            'apikey: ' . $evolutionKey,
        ],
        CURLOPT_TIMEOUT        => 10,
        CURLOPT_SSL_VERIFYPEER => false,
    ]);

    $respRaw = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if (!$respRaw || $httpCode >= 400) {
        log_bot("SYNC: Erro ao buscar msgs de {$jogador['nome']} (HTTP $httpCode)");
        $erros++;
        continue;
    }

    $resp  = json_decode($respRaw, true) ?? [];
    // Evolution API pode retornar array direto ou dentro de 'messages'
    $msgs  = is_array($resp) && isset($resp['messages']) ? $resp['messages']['records'] ?? $resp['messages'] : $resp;
    if (!is_array($msgs)) {
        $ignoradas++;
        continue;
    }

    // Ignora mensagens enviadas pelo próprio bot
    $msgs = array_filter($msgs, fn($m) => empty($m['key']['fromMe']));

    if (empty($msgs)) {
        continue;
    }

    // Pega a mensagem mais recente (última resposta do jogador)
    usort($msgs, fn($a, $b) => ($b['messageTimestamp'] ?? 0) <=> ($a['messageTimestamp'] ?? 0));
    $ultimaMsg = $msgs[0];

    // Extrai texto
    $texto = $ultimaMsg['message']['conversation']
          ?? $ultimaMsg['message']['extendedTextMessage']['text']
          ?? $ultimaMsg['message']['imageMessage']['caption']
          ?? $ultimaMsg['message']['buttonsResponseMessage']['selectedDisplayText']
          ?? $ultimaMsg['message']['listResponseMessage']['title']
          ?? '';

    if (!$texto) {
        // Tenta fallback genérico
        foreach ($ultimaMsg['message'] ?? [] as $type => $content) {
            if (is_string($content)) { $texto = $content; break; }
            if (is_array($content) && isset($content['text'])) { $texto = $content['text']; break; }
        }
    }

    if (!$texto) {
        $ignoradas++;
        continue;
    }

    $intencao = identificarIntencao($texto);
    if ($intencao === 'INVALIDO') {
        $ignoradas++;
        
        // Se foi inválido, salva na caixa de entrada para o admin ver
        $jogGeral = db()->fetchOne("SELECT id FROM bot_jogadores WHERE numero = ? OR numero = ?", [$jogador['numero'], '55'.$jogador['numero']]);
        salvarNaCaixaEntrada($jogador['numero'], $texto, $jogGeral['id'] ?? null);

        continue;
    }

    // 🟢 Salva a mensagem válida na Caixa de Entrada Geral 🟢
    $jogGeral = db()->fetchOne("SELECT id FROM bot_jogadores WHERE numero = ? OR numero = ?", [$jogador['numero'], '55'.$jogador['numero']]);
    salvarNaCaixaEntrada($jogador['numero'], $texto, $jogGeral['id'] ?? null);

    // Só processa se o status ainda não reflete a mensagem
    // (evita processar uma mensagem já tratada pelo webhook)
    $statusAtual = $jogador['status'];
    $jaProcessada = match($intencao) {
        'SIM'    => $statusAtual === 'confirmado',
        'NAO'    => $statusAtual === 'ausente',
        'DEPOIS' => $statusAtual === 'a_confirmar',
        default  => false,
    };

    if ($jaProcessada) {
        $ignoradas++;
        log_bot("SYNC: {$jogador['nome']} — resposta '$texto' já refletida no status ($statusAtual). Ignorado.");
        continue;
    }

    log_bot("SYNC: Processando '{$jogador['nome']}' texto='$texto' intencao=$intencao status_atual=$statusAtual");
    processarResposta($lista, $jogador, $texto);
    $processadas++;

    // Recarrega jogador atualizado para evitar conflito em iteração
    $jogadores = array_map(function($j) use ($jogador) {
        return $j['id'] === $jogador['id']
            ? (getJogadorPorNumero($j['lista_id'] ?? 0, $j['numero']) ?? $j)
            : $j;
    }, $jogadores);

    usleep(500_000); // 0.5s entre cada para não sobrecarregar
}

log_bot("=== SINCRONIZAR concluído: $processadas processadas, $ignoradas ignoradas, $erros erros ===");

exit(json_encode([
    'ok'          => true,
    'msg'         => $processadas > 0
        ? "$processadas resposta(s) processada(s) com sucesso!"
        : "Tudo em dia! Nenhuma resposta nova encontrada.",
    'processadas' => $processadas,
    'ignoradas'   => $ignoradas,
    'erros'       => $erros,
], JSON_UNESCAPED_UNICODE));

// ── Helper: variações de número (cópia do webhook.php) ──
function variacoesNumero(string $n): array {
    $vars = [$n];
    if (str_starts_with($n, '55') && strlen($n) >= 12) {
        $semPais = substr($n, 2);
        $vars[]  = $semPais;
        if (strlen($n) === 13 && $n[4] === '9') {
            $sem9   = substr($n, 0, 4) . substr($n, 5);
            $vars[] = $sem9;
            $vars[] = substr($sem9, 2);
        }
        if (strlen($n) === 12) {
            $com9   = substr($n, 0, 4) . '9' . substr($n, 4);
            $vars[] = $com9;
            $vars[] = substr($com9, 2);
        }
    } else {
        $comPais = '55' . $n;
        $vars[]  = $comPais;
        if (strlen($n) === 11 && $n[2] === '9') {
            $sem9   = substr($n, 0, 2) . substr($n, 3);
            $vars[] = $sem9;
            $vars[] = '55' . $sem9;
        }
        if (strlen($n) === 10) {
            $com9   = substr($n, 0, 2) . '9' . substr($n, 2);
            $vars[] = $com9;
            $vars[] = '55' . $com9;
        }
    }
    return array_unique($vars);
}
