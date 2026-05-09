<?php
// ====================================================
// HELPERS DE BANCO — usa o Database singleton do Hostinger
// ====================================================

// Atalho para o singleton já existente
function db(): PDO {
    return Database::getInstance()->getConnection();
}

// Retorna o número da semana ISO
function getNumeroSemana(string $data): int {
    return (int)(new DateTime($data))->format('W');
}

// Retorna a lista ativa da semana atual
function getListaAtual(): ?array {
    $semana = getNumeroSemana('now');
    $ano    = (int)date('Y');
    return Database::getInstance()->fetchOne(
        'SELECT * FROM lista_presenca WHERE semana = ? AND ano = ? ORDER BY id DESC LIMIT 1',
        [$semana, $ano]
    ) ?: null;
}

// Retorna todos os jogadores de uma lista ordenados
function getJogadores(int $listaId): array {
    return Database::getInstance()->fetchAll(
        'SELECT * FROM jogadores_presenca WHERE lista_id = ? ORDER BY ordem ASC, id ASC',
        [$listaId]
    );
}

// Retorna um jogador pelo número na lista
function getJogadorPorNumero(int $listaId, string $numero): ?array {
    return Database::getInstance()->fetchOne(
        'SELECT * FROM jogadores_presenca WHERE lista_id = ? AND numero = ? LIMIT 1',
        [$listaId, $numero]
    ) ?: null;
}

// Atualiza campos de um jogador
function atualizarJogador(int $id, array $campos): void {
    $sets   = implode(', ', array_map(fn($k) => "$k = ?", array_keys($campos)));
    $vals   = array_values($campos);
    $vals[] = $id;
    Database::getInstance()->execute(
        "UPDATE jogadores_presenca SET $sets WHERE id = ?",
        $vals
    );
}

// Próxima ordem disponível na lista
function proximaOrdem(int $listaId): int {
    $row = Database::getInstance()->fetchOne(
        'SELECT MAX(ordem) AS max_ordem FROM jogadores_presenca WHERE lista_id = ?',
        [$listaId]
    );
    return (int)($row['max_ordem'] ?? 0) + 1;
}

// Escolhe apelido que ainda não foi usado na lista
function escolherApelido(int $listaId): string {
    $rows    = Database::getInstance()->fetchAll(
        'SELECT apelido FROM jogadores_presenca WHERE lista_id = ?',
        [$listaId]
    );
    $usados      = array_column($rows, 'apelido');
    $disponiveis = array_values(array_diff(APELIDOS, $usados));
    $lista       = $disponiveis ?: APELIDOS;
    return $lista[array_rand($lista)];
}

// Atualiza o timestamp da lista
function tocarLista(int $listaId): void {
    Database::getInstance()->execute(
        'UPDATE lista_presenca SET atualizado_em = NOW() WHERE id = ?',
        [$listaId]
    );
}

// ── Normaliza número para formato 55DDDNNNNNNNNN ─────────────
// Garante que todos os números no banco sigam o mesmo padrão,
// evitando divergências com o formato enviado pela Evolution API.
function normalizarTelefone(string $numero): string {
    $n = preg_replace('/\D/', '', $numero);
    if (!$n) return $n;

    // Já tem DDI 55
    if (str_starts_with($n, '55')) {
        // 12 dígitos: 55 + DDD + 8 → adiciona o 9
        if (strlen($n) === 12) {
            $n = substr($n, 0, 4) . '9' . substr($n, 4);
        }
        return $n; // 13 dígitos: ok
    }

    // Sem DDI: 11 dígitos (DDD + 9 + 8) → adiciona 55
    if (strlen($n) === 11) {
        return '55' . $n;
    }

    // Sem DDI e sem 9: 10 dígitos (DDD + 8) → adiciona 55 + 9
    if (strlen($n) === 10) {
        return '55' . substr($n, 0, 2) . '9' . substr($n, 2);
    }

    // Retorna como está (número internacional diferente ou já correto)
    return $n;
}

// ── Config dinâmica do bot (banco → .env → padrão) ──────────
function botConfig(string $key): string {
    static $cache = null;
    if ($cache === null) {
        try {
            $rows  = Database::getInstance()->fetchAll('SELECT chave, valor FROM bot_config');
            $cache = array_column($rows, 'valor', 'chave');
        } catch (Throwable $e) {
            $cache = [];
        }
    }
    $defaults = [
        'dia_racha'                => $_ENV['DIA_RACHA']                ?? 'Terça',
        'horario_racha'            => $_ENV['HORARIO_RACHA']            ?? '21:00',
        'local_racha'              => $_ENV['LOCAL_RACHA']              ?? 'Arena Litoral',
        'intervalo_lembrete_horas' => $_ENV['INTERVALO_LEMBRETE_HORAS'] ?? '2',
    ];
    return $cache[$key] ?? $defaults[$key] ?? '';
}

// ── Jogadores ativos do banco (fallback: config.php) ────────
function getJogadoresAtivos(): array {
    try {
        $rows = Database::getInstance()->fetchAll(
            "SELECT nome, numero, tipo FROM bot_jogadores WHERE ativo = 1 ORDER BY tipo DESC, nome ASC"
        );
        if (!empty($rows)) return $rows;
    } catch (Throwable $e) {
        // tabela ainda não existe — usa constantes do config.php
    }
    $linha    = array_map(fn($j) => array_merge($j, ['tipo' => 'linha']),   JOGADORES_LINHA);
    $goleiros = array_map(fn($j) => array_merge($j, ['tipo' => 'goleiro']), GOLEIROS);
    return array_merge($linha, $goleiros);
}
