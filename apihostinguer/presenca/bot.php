<?php
require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/whatsapp.php';

// ====================================================
// LOGICA CENTRAL DO BOT
// ====================================================

// ── Identificar intenção (linguagem natural) ─────────
function identificarIntencao(string $texto): string {
    if (trim($texto) === '') return 'INVALIDO';

    $t = mb_strtolower(trim($texto), 'UTF-8');
    $t = iconv('UTF-8', 'ASCII//TRANSLIT', $t);
    $t = preg_replace('/[^a-z0-9 ]/', '', $t);
    $t = trim($t);

    // CANCELAR (prioridade)
    if (preg_match('/\bcancela(r)?\b/', $t)) return 'CANCELAR';

    // SIM
    if (preg_match('/^(sim|s)$/', $t)) return 'SIM';
    if (preg_match('/\b(to dentro|tô dentro|vou sim|vou estar|estarei|pode botar|pode me botar|pode confirmar|confirma ai|confirma|confirmado|topo|topei|bora|eu vou|vou la|vou la sim|vou ir|vou comparecer|conta comigo|pode contar|to la|tô lá|estarei la|presente|com certeza|claro que sim|obvio|com certeza sim|vai ter eu|dentro)\b/', $t)) return 'SIM';

    // NAO
    if (preg_match('/^(nao|n|no)$/', $t)) return 'NAO';
    if (preg_match('/\b(nao vou|nao consigo|nao posso|nao da|nao vai dar|nao vou conseguir|nao vou poder|dessa nao|dessa vez nao|infelizmente nao|nao dessa vez|fora dessa|fico fora|to fora|sem condicao|sem condicoes|impossivel|nao vai rolar|nao rola|ausente|faltarei|vou faltar|nao vou estar)\b/', $t)) return 'NAO';

    // DEPOIS
    if (preg_match('/^(depois|dep)$/', $t)) return 'DEPOIS';
    if (preg_match('/\b(depois eu|confirmo depois|confirmo mais tarde|vou ver|vou verificar|talvez|talvez sim|nao sei ainda|ainda nao sei|to vendo|depende|vou tentar|tentarei|so sei depois|aviso depois|te aviso|ainda nao|em aberto|deixa em aberto|nao confirmei ainda)\b/', $t)) return 'DEPOIS';

    return 'INVALIDO';
}

// ── Processar resposta de um jogador ─────────────────
function processarResposta(array $lista, array $jogador, string $texto): void {
    $intencao      = identificarIntencao($texto);
    $statusAnterior = $jogador['status'];
    $horario       = date('d/m/Y H:i');
    $mudouStatus   = false;
    $resposta      = '';

    switch ($intencao) {
        case 'SIM':
            if ($statusAnterior === 'confirmado') {
                $resposta = "Opa, {$jogador['apelido']}! Já anotei sua presença, mas valeu por confirmar de novo!";
            } else {
                $ordem = proximaOrdem($lista['id']);
                atualizarJogador($jogador['id'], [
                    'status'           => 'confirmado',
                    'horario_resposta' => $horario,
                    'ordem'            => $ordem,
                    'disparado_em'     => date('Y-m-d H:i:s'),
                ]);
                $resposta = "Confirmado, {$jogador['apelido']}! Presença garantida no racha!\n\n"
                          . "*" . botConfig('local_racha') . "* às *" . botConfig('horario_racha') . "*\n\n"
                          . "Se não puder mais vir, responda *CANCELAR*.";
                $mudouStatus = true;
                log_bot("{$jogador['nome']} CONFIRMOU");
            }
            break;

        case 'NAO':
            if ($statusAnterior !== 'ausente') {
                atualizarJogador($jogador['id'], [
                    'status'           => 'ausente',
                    'horario_resposta' => $horario,
                    'ordem'            => null,
                    'disparado_em'     => date('Y-m-d H:i:s'),
                ]);
                $resposta = "Entendido, {$jogador['apelido']}! Presença cancelada.\n\n"
                          . "Se mudar de ideia, mande *CANCELAR* que a gente reverte!";
                $mudouStatus = true;
                log_bot("{$jogador['nome']} disse NAO");
            } else {
                $resposta = "Tudo bem, {$jogador['apelido']}! Já estava anotado que você não vem.\n\nSe mudar de ideia, mande *CANCELAR*!";
            }
            break;

        case 'DEPOIS':
            if ($statusAnterior === 'confirmado') {
                $resposta = "Opa, {$jogador['apelido']}! Você já está confirmado.\n\nSe quiser cancelar, mande *CANCELAR*.";
            } elseif ($statusAnterior !== 'a_confirmar') {
                atualizarJogador($jogador['id'], [
                    'status'           => 'a_confirmar',
                    'horario_resposta' => $horario,
                    'disparado_em'     => date('Y-m-d H:i:s'),
                ]);
                $resposta = "Beleza, {$jogador['apelido']}! Fico no aguardo.\n\nVou te lembrar de 2 em 2 horas até você confirmar!";
                $mudouStatus = true;
                log_bot("{$jogador['nome']} vai confirmar depois");
            } else {
                $resposta = "Tranquilo, {$jogador['apelido']}! Já sei que você vai confirmar depois. Te aguardo!";
            }
            break;

        case 'CANCELAR':
            if ($statusAnterior === 'confirmado') {
                atualizarJogador($jogador['id'], [
                    'status'           => 'ausente',
                    'horario_resposta' => $horario,
                    'ordem'            => null,
                    'disparado_em'     => date('Y-m-d H:i:s'),
                ]);
                $resposta = "Entendido, {$jogador['apelido']}! Presença cancelada.\n\n"
                          . "Se mudar de ideia, mande *CANCELAR* que a gente reverte!";
                $mudouStatus = true;
                log_bot("{$jogador['nome']} CANCELOU (confirmado -> ausente)");
            } elseif ($statusAnterior === 'ausente') {
                $ordem = proximaOrdem($lista['id']);
                atualizarJogador($jogador['id'], [
                    'status'           => 'confirmado',
                    'horario_resposta' => $horario,
                    'ordem'            => $ordem,
                    'disparado_em'     => date('Y-m-d H:i:s'),
                ]);
                $resposta = "Boa, {$jogador['apelido']}! Mudou de ideia! Presença confirmada!\n\n"
                          . "*" . botConfig('local_racha') . "* às *" . botConfig('horario_racha') . "*\n\n"
                          . "Se precisar cancelar de novo, mande *CANCELAR*.";
                $mudouStatus = true;
                log_bot("{$jogador['nome']} reverteu CANCELAR (ausente -> confirmado)");
            } else {
                $resposta = "Oi {$jogador['apelido']}! Você ainda não confirmou nem recusou.\n\n"
                          . "Responda com:\n*SIM* - Vou comparecer\n*NÃO* - Não vou conseguir ir\n*DEPOIS* - Confirmo mais tarde";
            }
            break;

        default: // INVALIDO
            $resposta = "Oi {$jogador['apelido']}! Não entendi sua resposta.\n\n"
                      . "Por favor, responda com uma dessas opções:\n\n"
                      . "*SIM* - Vou comparecer\n"
                      . "*NÃO* - Não vou conseguir ir\n"
                      . "*DEPOIS* - Confirmo mais tarde\n"
                      . "*CANCELAR* - Mudar de ideia (se já confirmou ou recusou)\n\n"
                      . "É só mandar uma dessas palavras!";
            log_bot("Resposta nao reconhecida de {$jogador['nome']}: \"$texto\"");
    }

    if ($resposta) {
        enviarMensagem($jogador['numero'], $resposta);
    }

    if ($mudouStatus) {
        tocarLista($lista['id']);
        enviarRelatorio($lista['id']);
    }
}

// ── Gerar texto do relatório ─────────────────────────
function gerarTextoRelatorio(int $listaId, string $dataRacha): string {
    $jogadores = getJogadores($listaId);

    $grupos = [
        'linha_confirmados' => [], 'linha_a_confirmar' => [],
        'linha_ausentes'    => [], 'linha_aguardando'  => [],
        'goleiro_confirmados' => [], 'goleiro_a_confirmar' => [],
        'goleiro_ausentes'    => [], 'goleiro_aguardando'  => [],
    ];

    foreach ($jogadores as $j) {
        $prefixo = $j['tipo'] === 'goleiro' ? 'goleiro' : 'linha';
        $entrada = $j['nome'] . ($j['horario_resposta'] ? " _({$j['horario_resposta']})_" : '');

        switch ($j['status']) {
            case 'confirmado':   $grupos["{$prefixo}_confirmados"][] = ['entrada' => $entrada, 'ordem' => (int)$j['ordem']]; break;
            case 'a_confirmar': $grupos["{$prefixo}_a_confirmar"][] = $entrada; break;
            case 'ausente':     $grupos["{$prefixo}_ausentes"][]    = $entrada; break;
            default:            $grupos["{$prefixo}_aguardando"][]  = $j['nome']; break;
        }
    }

    $fmt = function(array $lista): string {
        if (empty($lista)) return '_Nenhum ainda_';
        return implode("\n", array_map(
            fn($item, $i) => sprintf('%02d - %s', $i + 1, $item),
            $lista, array_keys($lista)
        ));
    };

    $sortConf = function(array $lista) use ($fmt): string {
        usort($lista, fn($a, $b) => ($a['ordem'] ?? 999) - ($b['ordem'] ?? 999));
        return $fmt(array_column($lista, 'entrada'));
    };

    $r  = "*LISTA RACHA - {$dataRacha}*\n";
    $r .= botConfig('local_racha') . " | " . botConfig('dia_racha') . " às " . botConfig('horario_racha') . "\n";
    $r .= "---------------------\n\n";

    $r .= "*LINHA - CONFIRMADOS (" . count($grupos['linha_confirmados']) . ")*\n" . $sortConf($grupos['linha_confirmados']) . "\n\n";
    if (!empty($grupos['linha_a_confirmar']))
        $r .= "*LINHA - PENDENTE (" . count($grupos['linha_a_confirmar']) . ")*\n" . $fmt($grupos['linha_a_confirmar']) . "\n\n";
    $r .= "*LINHA - AUSENTES (" . count($grupos['linha_ausentes']) . ")*\n" . $fmt($grupos['linha_ausentes']) . "\n\n";
    if (!empty($grupos['linha_aguardando']))
        $r .= "*LINHA - SEM RESPOSTA (" . count($grupos['linha_aguardando']) . ")*\n" . $fmt($grupos['linha_aguardando']) . "\n\n";

    $r .= "---------------------\n\n";

    $r .= "*GOLEIROS - CONFIRMADOS (" . count($grupos['goleiro_confirmados']) . ")*\n" . $sortConf($grupos['goleiro_confirmados']) . "\n\n";
    if (!empty($grupos['goleiro_a_confirmar']))
        $r .= "*GOLEIROS - PENDENTE (" . count($grupos['goleiro_a_confirmar']) . ")*\n" . $fmt($grupos['goleiro_a_confirmar']) . "\n\n";
    $r .= "*GOLEIROS - AUSENTES (" . count($grupos['goleiro_ausentes']) . ")*\n" . $fmt($grupos['goleiro_ausentes']) . "\n\n";
    if (!empty($grupos['goleiro_aguardando']))
        $r .= "*GOLEIROS - SEM RESPOSTA (" . count($grupos['goleiro_aguardando']) . ")*\n" . $fmt($grupos['goleiro_aguardando']) . "\n";

    $r .= "\n_Atualizado às " . date('H:i') . "_";

    return $r;
}

// ── Enviar relatório para grupo e admin ──────────────
function enviarRelatorio(int $listaId): void {
    $lista = db()->prepare('SELECT * FROM lista_presenca WHERE id = ?');
    $lista->execute([$listaId]);
    $lista = $lista->fetch();
    if (!$lista) return;

    $texto = gerarTextoRelatorio($listaId, $lista['data_racha']);
    log_bot("Enviando relatorio atualizado...");

    enviarGrupo($texto);

    if (MEU_NUMERO && MEU_NUMERO !== '5512999999999') {
        enviarMensagem(MEU_NUMERO, $texto);
    }
}
