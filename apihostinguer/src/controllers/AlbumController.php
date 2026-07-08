<?php
/**
 * Controller do Álbum de Figurinhas
 * Arquivo: src/controllers/AlbumController.php
 *
 * Rotas (registradas em public/index.php):
 *   --- Catálogo (admin) ---
 *   GET    /album/figurinhas              Lista catálogo completo
 *   POST   /album/figurinhas              Cria figurinha
 *   PUT    /album/figurinhas/{id}         Edita figurinha
 *   DELETE /album/figurinhas/{id}         Desativa figurinha
 *   GET    /album/paginas                 Lista páginas do livro
 *   POST   /album/paginas                 Cria página
 *   PUT    /album/paginas/{id}            Edita página
 *
 *   --- Usuário ---
 *   GET    /album/meu                     Álbum montado (páginas + figurinhas + meu inventário)
 *   GET    /album/pacotes                 Meus pacotes fechados
 *   POST   /album/pacotes/{id}/abrir      Abre um pacote (sorteia 5 figurinhas)
 *   GET    /album/whatsapp                Meu whatsapp vinculado
 *   PUT    /album/whatsapp                Vincula/atualiza meu whatsapp
 *
 *   --- Mural de trocas ---
 *   GET    /album/mural                   Lista figurinhas disponiveis para troca
 *   POST   /album/mural                   Disponibiliza uma figurinha repetida
 *   DELETE /album/mural/{id}              Retira a propria oferta do mural
 *   GET    /album/mural/{id}/opcoes        Repetidas do usuario validas para a troca
 *   POST   /album/mural/{id}/trocar        Executa a troca (atomica)
 *
 *   --- Admin ---
 *   POST   /album/admin/distribuir        Distribui pacotes para jogadores
 */

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../utils/HttpError.php';

class AlbumController
{
    private $db;

    // Probabilidades de raridade no sorteio de figurinhas
    // 85% comum / 10% rara / 5% lendaria
    private const PROB_LENDARIA = 0.05;
    private const PROB_RARA     = 0.10;
    private const PACOTE_TAMANHO = 5;       // figurinhas por pacote
    private const ANTI_FRUSTRACAO = 10;     // pacotes sem lendária → próxima garante 1

    public function __construct()
    {
        $this->db = Database::getInstance();
    }

    // =========================================================
    // HELPERS
    // =========================================================
    private function getJsonInput(): array
    {
        $raw   = file_get_contents('php://input');
        $input = json_decode($raw, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new HttpError('Body da requisição inválido (JSON esperado).', 400);
        }
        return $input ?? [];
    }

    private function authUserId(): int
    {
        $authUser = $_REQUEST['authUser'] ?? null;
        $uid = (int)($authUser['userId'] ?? 0);
        if (!$uid) {
            throw new HttpError('Não autorizado.', 401);
        }
        return $uid;
    }

    // =========================================================
    // CATÁLOGO — PÁGINAS
    // =========================================================
    public function listarPaginas(): void
    {
        $paginas = $this->db->fetchAll(
            'SELECT * FROM album_paginas WHERE ativa = 1 ORDER BY numero ASC'
        );
        foreach ($paginas as &$p) {
            $p['meta_json'] = $p['meta_json'] ? json_decode($p['meta_json'], true) : null;
        }
        $this->ok(['paginas' => $paginas]);
    }

    public function criarPagina(): void
    {
        $in = $this->getJsonInput();
        if (empty($in['numero']) || empty($in['tipo'])) {
            throw new HttpError('numero e tipo são obrigatórios.', 400);
        }
        $this->db->execute(
            'INSERT INTO album_paginas
                (numero, tipo, titulo, subtitulo, subtitulo_cor, tag, data_referencia, texto, meta_json)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
                (int)$in['numero'],
                $in['tipo'],
                $in['titulo']          ?? null,
                $in['subtitulo']       ?? null,
                $in['subtitulo_cor']   ?? null,
                $in['tag']             ?? null,
                $in['data_referencia'] ?? null,
                $in['texto']           ?? null,
                isset($in['meta_json']) ? json_encode($in['meta_json'], JSON_UNESCAPED_UNICODE) : null,
            ]
        );
        $this->ok(['id' => (int)$this->db->lastInsertId(), 'message' => 'Página criada.'], 201);
    }

    public function atualizarPagina(int $id): void
    {
        $in = $this->getJsonInput();
        $campos = ['titulo','subtitulo','subtitulo_cor','tag','data_referencia','texto'];
        $sets = [];
        $vals = [];
        foreach ($campos as $c) {
            if (array_key_exists($c, $in)) {
                $sets[] = "$c = ?";
                $vals[] = $in[$c];
            }
        }
        if (array_key_exists('numero', $in)) { $sets[] = 'numero = ?'; $vals[] = (int)$in['numero']; }
        if (array_key_exists('meta_json', $in)) {
            $sets[] = 'meta_json = ?';
            $vals[] = json_encode($in['meta_json'], JSON_UNESCAPED_UNICODE);
        }
        if (!$sets) {
            throw new HttpError('Nada para atualizar.', 400);
        }
        $vals[] = $id;
        $this->db->execute('UPDATE album_paginas SET ' . implode(', ', $sets) . ' WHERE id = ?', $vals);
        $this->ok(['message' => 'Página atualizada.']);
    }

    // =========================================================
    // CATÁLOGO — FIGURINHAS
    // =========================================================
    public function listarFigurinhas(): void
    {
        $figs = $this->db->fetchAll(
            'SELECT * FROM album_figurinhas WHERE ativa = 1 ORDER BY numero ASC'
        );
        $this->ok(['figurinhas' => $figs]);
    }

    public function criarFigurinha(): void
    {
        $in = $this->getJsonInput();
        if (empty($in['numero']) || empty($in['nome'])) {
            throw new HttpError('numero e nome são obrigatórios.', 400);
        }
        $categoria = $in['categoria'] ?? 'jogador';
        $raridade  = $in['raridade']  ?? 'comum';
        if (!in_array($categoria, ['jogador','etiqueta','escudo','estatistica','foto'], true)) {
            throw new HttpError('Categoria inválida.', 400);
        }
        if (!in_array($raridade, ['comum','rara','lendaria'], true)) {
            throw new HttpError('Raridade inválida.', 400);
        }
        try {
            $this->db->execute(
                'INSERT INTO album_figurinhas
                    (numero, nome, `time`, descricao, categoria, raridade, imagem_url, pagina_id, slot)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [
                    (int)$in['numero'],
                    trim($in['nome']),
                    $in['time']       ?? null,
                    $in['descricao']  ?? null,
                    $categoria,
                    $raridade,
                    $in['imagem_url'] ?? null,
                    isset($in['pagina_id']) ? (int)$in['pagina_id'] : null,
                    isset($in['slot'])      ? (int)$in['slot']      : null,
                ]
            );
        } catch (\Throwable $e) {
            throw new HttpError('Número de figurinha já existe ou erro: ' . $e->getMessage(), 409);
        }
        $this->ok(['id' => (int)$this->db->lastInsertId(), 'message' => 'Figurinha criada.'], 201);
    }

    public function atualizarFigurinha(int $id): void
    {
        $in = $this->getJsonInput();
        $campos = ['nome','descricao','categoria','raridade','imagem_url'];
        $sets = [];
        $vals = [];
        foreach ($campos as $c) {
            if (array_key_exists($c, $in)) { $sets[] = "$c = ?"; $vals[] = $in[$c]; }
        }
        // `time` e palavra reservada — precisa de backticks
        if (array_key_exists('time', $in)) { $sets[] = '`time` = ?'; $vals[] = $in['time']; }
        foreach (['numero','pagina_id','slot'] as $c) {
            if (array_key_exists($c, $in)) {
                $sets[] = "$c = ?";
                $vals[] = $in[$c] === null ? null : (int)$in[$c];
            }
        }
        if (!$sets) {
            throw new HttpError('Nada para atualizar.', 400);
        }
        $vals[] = $id;
        $this->db->execute('UPDATE album_figurinhas SET ' . implode(', ', $sets) . ' WHERE id = ?', $vals);
        $this->ok(['message' => 'Figurinha atualizada.']);
    }

    public function deletarFigurinha(int $id): void
    {
        $this->db->execute('UPDATE album_figurinhas SET ativa = 0 WHERE id = ?', [$id]);
        $this->ok(['message' => 'Figurinha desativada.']);
    }

    // =========================================================
    // ÁLBUM DO USUÁRIO
    // =========================================================
    /**
     * Garante que o usuário receba 2 pacotes de boas-vindas no 1º acesso.
     * Seguro contra repetição: uma vez criados, o COUNT nunca mais volta a 0.
     */
    private function garantirBoasVindas(int $uid): void
    {
        $jaTeve = (int)($this->db->fetchOne(
            'SELECT COUNT(*) AS n FROM album_pacotes WHERE usuario_id = ?',
            [$uid]
        )['n'] ?? 0);

        if ($jaTeve === 0) {
            for ($i = 0; $i < 2; $i++) {
                $this->db->execute(
                    'INSERT INTO album_pacotes (usuario_id, tipo, motivo, status)
                     VALUES (?, ?, ?, ?)',
                    [$uid, 'boas_vindas', 'Pacote de boas-vindas', 'fechado']
                );
            }
        }
    }

    // =========================================================
    // RANKING / DISPUTA
    // =========================================================
    public function ranking(): void
    {
        $this->authUserId(); // Valida se está logado

        try {
            $sql = "
                SELECT 
                    u.id, 
                    u.username AS nome, 
                    u.foto_url AS avatar, 
                    COUNT(DISTINCT i.figurinha_id) as total_obtidas,
                    (SELECT COUNT(*) FROM album_figurinhas WHERE ativa = 1) as total_figurinhas,
                    (SELECT COUNT(*) FROM album_pacotes p WHERE p.usuario_id = u.id AND p.status = 'aberto') as pacotes_abertos
                FROM usuarios u
                JOIN album_inventario i ON u.id = i.usuario_id
                JOIN album_figurinhas f ON i.figurinha_id = f.id
                WHERE f.ativa = 1
                GROUP BY u.id, u.username, u.foto_url
                ORDER BY total_obtidas DESC, u.username ASC
            ";

            $ranking = $this->db->fetchAll($sql);
            
            $this->ok(['ranking' => $ranking]);
        } catch (\Throwable $e) {
            // Em caso de erro SQL, retorna mensagem de erro para debug
            http_response_code(500);
            echo json_encode(['error' => true, 'message' => 'Erro DB: ' . $e->getMessage()]);
            exit;
        }
    }

    // =========================================================
    // ÁLBUM DO USUÁRIO
    // =========================================================
    public function meuAlbum(): void
    {
        $uid = $this->authUserId();
        $this->garantirBoasVindas($uid);

        $paginas = $this->db->fetchAll(
            'SELECT * FROM album_paginas WHERE ativa = 1 ORDER BY numero ASC'
        );
        foreach ($paginas as &$p) {
            $p['meta_json'] = $p['meta_json'] ? json_decode($p['meta_json'], true) : null;
        }
        unset($p);

        $figs = $this->db->fetchAll(
            'SELECT * FROM album_figurinhas WHERE ativa = 1 ORDER BY numero ASC'
        );

        // Inventário do usuário: figurinha_id => quantidade
        $invRows = $this->db->fetchAll(
            'SELECT figurinha_id, quantidade FROM album_inventario WHERE usuario_id = ?',
            [$uid]
        );
        $inv = [];
        foreach ($invRows as $r) {
            $inv[(int)$r['figurinha_id']] = (int)$r['quantidade'];
        }

        // Anexa quantidade que o user tem em cada figurinha
        foreach ($figs as &$f) {
            $qtd = $inv[(int)$f['id']] ?? 0;
            $f['quantidade']  = $qtd;
            $f['obtida']      = $qtd > 0;
            $f['repetida']    = $qtd > 1;
        }
        unset($f);

        $totalFigs = count($figs);
        $obtidas   = count(array_filter($figs, fn($f) => $f['obtida']));

        // Pacotes fechados aguardando abertura
        $pacotesFechados = (int)($this->db->fetchOne(
            "SELECT COUNT(*) AS n FROM album_pacotes WHERE usuario_id = ? AND status = 'fechado'",
            [$uid]
        )['n'] ?? 0);

        $this->ok([
            'paginas'    => $paginas,
            'figurinhas' => $figs,
            'progresso'  => [
                'total'      => $totalFigs,
                'obtidas'    => $obtidas,
                'faltam'     => $totalFigs - $obtidas,
                'percentual' => $totalFigs > 0 ? round($obtidas / $totalFigs * 100, 1) : 0,
            ],
            'pacotes_fechados' => $pacotesFechados,
        ]);
    }

    // =========================================================
    // PACOTES
    // =========================================================
    public function meusPacotes(): void
    {
        $uid = $this->authUserId();
        $this->garantirBoasVindas($uid);
        $pacotes = $this->db->fetchAll(
            "SELECT id, tipo, motivo, status, criado_em, aberto_em
             FROM album_pacotes
             WHERE usuario_id = ?
             ORDER BY (status = 'fechado') DESC, criado_em DESC",
            [$uid]
        );
        $this->ok(['pacotes' => $pacotes]);
    }

    public function abrirPacote(int $pacoteId): void
    {
        $uid = $this->authUserId();

        $pacote = $this->db->fetchOne(
            'SELECT * FROM album_pacotes WHERE id = ? AND usuario_id = ? LIMIT 1',
            [$pacoteId, $uid]
        );
        if (!$pacote) {
            throw new HttpError('Pacote não encontrado.', 404);
        }
        if ($pacote['status'] === 'aberto') {
            throw new HttpError('Esse pacote já foi aberto.', 409);
        }

        $sorteadas = $this->sortearFigurinhas($uid);
        if (count($sorteadas) === 0) {
            throw new HttpError('Não há figurinhas cadastradas no álbum ainda.', 422);
        }

        $resultado = [];
        $this->db->beginTransaction();
        try {
            foreach ($sorteadas as $figId) {
                // Quanto o user já tem dessa figurinha
                $atual = $this->db->fetchOne(
                    'SELECT quantidade FROM album_inventario WHERE usuario_id = ? AND figurinha_id = ?',
                    [$uid, $figId]
                );
                $eraRepetida = $atual ? 1 : 0;

                if ($atual) {
                    $this->db->execute(
                        'UPDATE album_inventario SET quantidade = quantidade + 1
                         WHERE usuario_id = ? AND figurinha_id = ?',
                        [$uid, $figId]
                    );
                } else {
                    $this->db->execute(
                        'INSERT INTO album_inventario (usuario_id, figurinha_id, quantidade)
                         VALUES (?, ?, 1)',
                        [$uid, $figId]
                    );
                }

                $this->db->execute(
                    'INSERT INTO album_pacote_figurinhas (pacote_id, figurinha_id, era_repetida)
                     VALUES (?, ?, ?)',
                    [$pacoteId, $figId, $eraRepetida]
                );

                $fig = $this->db->fetchOne('SELECT * FROM album_figurinhas WHERE id = ?', [$figId]);
                $fig['era_repetida'] = (bool)$eraRepetida;
                $resultado[] = $fig;
            }

            $this->db->execute(
                "UPDATE album_pacotes SET status = 'aberto', aberto_em = NOW() WHERE id = ?",
                [$pacoteId]
            );

            $this->db->commit();
        } catch (\Throwable $e) {
            $this->db->rollBack();
            throw new HttpError('Erro ao abrir pacote: ' . $e->getMessage(), 500);
        }

        $this->ok(['figurinhas' => $resultado]);
    }

    /**
     * Sorteia PACOTE_TAMANHO figurinhas DISTINTAS entre si.
     * Distribuicao: 85% comum / 10% rara / 5% lendaria. Aplica anti-frustracao.
     */
    private function sortearFigurinhas(int $uid): array
    {
        $comuns    = $this->idsPorRaridade('comum');
        $raras     = $this->idsPorRaridade('rara');
        $lendarias = $this->idsPorRaridade('lendaria');

        if (empty($comuns) && empty($raras) && empty($lendarias)) {
            return [];
        }

        $escolhidas = [];
        $usados     = [];

        // Anti-frustracao: pacotes sem lendaria → forca 1 lendaria
        $garantirLendaria = !empty($lendarias) && $this->precisaGarantirLendaria($uid);

        for ($i = 0; $i < self::PACOTE_TAMANHO; $i++) {
            // Define qual raridade tentar nesta posicao
            if ($garantirLendaria && $i === 0) {
                $tier = 'lendaria';
            } else {
                $r = mt_rand(1, 10000) / 10000;
                if (!empty($lendarias) && $r <= self::PROB_LENDARIA) {
                    $tier = 'lendaria';
                } elseif (!empty($raras) && $r <= self::PROB_LENDARIA + self::PROB_RARA) {
                    $tier = 'rara';
                } else {
                    $tier = 'comum';
                }
            }

            // Tenta no pool preferido; se esgotado, fallback nos outros
            $ordem = $this->ordemFallback($tier);
            $escolhida = null;
            foreach ($ordem as $t) {
                $pool = $t === 'lendaria' ? $lendarias : ($t === 'rara' ? $raras : $comuns);
                $disp = array_values(array_diff($pool, $usados));
                if (!empty($disp)) {
                    $escolhida = $disp[array_rand($disp)];
                    break;
                }
            }
            if ($escolhida === null) break; // catalogo menor que PACOTE_TAMANHO
            $escolhidas[] = $escolhida;
            $usados[]     = $escolhida;
        }

        return $escolhidas;
    }

    /** IDs das figurinhas ativas com a raridade pedida. */
    private function idsPorRaridade(string $raridade): array
    {
        $rows = $this->db->fetchAll(
            'SELECT id FROM album_figurinhas WHERE ativa = 1 AND raridade = ?',
            [$raridade]
        );
        return array_map(fn($r) => (int)$r['id'], $rows);
    }

    /** Ordem de fallback de pools quando o preferido esta esgotado. */
    private function ordemFallback(string $tier): array
    {
        switch ($tier) {
            case 'lendaria': return ['lendaria','rara','comum'];
            case 'rara':     return ['rara','comum','lendaria'];
            default:         return ['comum','rara','lendaria'];
        }
    }

    /**
     * Retorna true se o usuário abriu >= ANTI_FRUSTRACAO pacotes sem nenhuma lendária.
     */
    private function precisaGarantirLendaria(int $uid): bool
    {
        $ultima = $this->db->fetchOne(
            "SELECT MAX(p.aberto_em) AS ultima
             FROM album_pacotes p
             JOIN album_pacote_figurinhas pf ON pf.pacote_id = p.id
             JOIN album_figurinhas f ON f.id = pf.figurinha_id
             WHERE p.usuario_id = ? AND p.status = 'aberto' AND f.raridade = 'lendaria'",
            [$uid]
        );
        $ultimaData = $ultima['ultima'] ?? null;

        if ($ultimaData) {
            $count = (int)($this->db->fetchOne(
                "SELECT COUNT(*) AS n FROM album_pacotes
                 WHERE usuario_id = ? AND status = 'aberto' AND aberto_em > ?",
                [$uid, $ultimaData]
            )['n'] ?? 0);
        } else {
            $count = (int)($this->db->fetchOne(
                "SELECT COUNT(*) AS n FROM album_pacotes
                 WHERE usuario_id = ? AND status = 'aberto'",
                [$uid]
            )['n'] ?? 0);
        }

        return $count >= self::ANTI_FRUSTRACAO;
    }

    // =========================================================
    // WHATSAPP — vínculo
    // =========================================================
    public function getWhatsapp(): void
    {
        $uid  = $this->authUserId();
        $user = $this->db->fetchOne('SELECT whatsapp FROM usuarios WHERE id = ?', [$uid]);
        $this->ok(['whatsapp' => $user['whatsapp'] ?? null]);
    }

    public function setWhatsapp(): void
    {
        $uid = $this->authUserId();
        $in  = $this->getJsonInput();
        $raw = preg_replace('/\D/', '', $in['whatsapp'] ?? '');

        if (strlen($raw) < 10 || strlen($raw) > 13) {
            throw new HttpError('Número de WhatsApp inválido.', 400);
        }
        // Normaliza para 55DDDNNNNNNNNN
        $num = $this->normalizarTelefone($raw);

        $this->db->execute('UPDATE usuarios SET whatsapp = ? WHERE id = ?', [$num, $uid]);
        $this->ok(['whatsapp' => $num, 'message' => 'WhatsApp vinculado!']);
    }

    private function normalizarTelefone(string $n): string
    {
        if (str_starts_with($n, '55')) {
            if (strlen($n) === 12) {
                $n = substr($n, 0, 4) . '9' . substr($n, 4);
            }
            return $n;
        }
        if (strlen($n) === 11) return '55' . $n;
        if (strlen($n) === 10) return '55' . substr($n, 0, 2) . '9' . substr($n, 2);
        return $n;
    }

    // =========================================================
    // ADMIN — listar usuarios (para distribuir pacotes)
    // =========================================================
    public function listarUsuarios(): void
    {
        $usuarios = $this->db->fetchAll(
            "SELECT u.id, u.username, u.whatsapp, u.role,
                    (SELECT COUNT(*) FROM album_pacotes p
                     WHERE p.usuario_id = u.id AND p.status = 'fechado') AS pacotes_fechados
             FROM usuarios u
             WHERE u.ativo = 1
             ORDER BY u.username ASC"
        );
        $this->ok(['usuarios' => $usuarios]);
    }

    // =========================================================
    // ADMIN — distribuir pacotes
    // =========================================================
    public function distribuirPacotes(): void
    {
        $in = $this->getJsonInput();
        $distribuicao = $in['distribuicao'] ?? [];
        $motivo       = trim($in['motivo'] ?? 'Distribuição de pacotes');

        if (!is_array($distribuicao) || empty($distribuicao)) {
            throw new HttpError('Informe a distribuição (lista de usuario_id + quantidade).', 400);
        }

        $criados = 0;
        $this->db->beginTransaction();
        try {
            foreach ($distribuicao as $item) {
                $usuarioId = (int)($item['usuario_id'] ?? 0);
                $qtd       = (int)($item['quantidade'] ?? 0);
                $tipo      = $item['tipo'] ?? 'racha';
                if ($usuarioId <= 0 || $qtd <= 0) {
                    continue;
                }
                for ($i = 0; $i < $qtd; $i++) {
                    $this->db->execute(
                        'INSERT INTO album_pacotes (usuario_id, tipo, motivo, status)
                         VALUES (?, ?, ?, ?)',
                        [$usuarioId, $tipo, $motivo, 'fechado']
                    );
                    $criados++;
                }
            }
            $this->db->commit();
        } catch (\Throwable $e) {
            $this->db->rollBack();
            throw new HttpError('Erro ao distribuir: ' . $e->getMessage(), 500);
        }

        $this->ok(['message' => "{$criados} pacote(s) distribuído(s).", 'total' => $criados]);
    }

    // =========================================================
    // MURAL DE TROCAS
    // =========================================================

    /**
     * Ajusta o inventario de um usuario. Cria a linha se nao existe;
     * remove a linha se a quantidade chegar a zero.
     */
    private function ajustarInventario(int $uid, int $figId, int $delta): void
    {
        $row = $this->db->fetchOne(
            'SELECT id, quantidade FROM album_inventario WHERE usuario_id = ? AND figurinha_id = ?',
            [$uid, $figId]
        );
        if ($row) {
            $nova = (int)$row['quantidade'] + $delta;
            if ($nova <= 0) {
                $this->db->execute('DELETE FROM album_inventario WHERE id = ?', [$row['id']]);
            } else {
                $this->db->execute(
                    'UPDATE album_inventario SET quantidade = ? WHERE id = ?',
                    [$nova, $row['id']]
                );
            }
        } elseif ($delta > 0) {
            $this->db->execute(
                'INSERT INTO album_inventario (usuario_id, figurinha_id, quantidade) VALUES (?, ?, ?)',
                [$uid, $figId, $delta]
            );
        }
    }

    /**
     * GET /album/mural — lista todas as ofertas disponiveis.
     * Marca `ja_obtida` (o usuario logado ja tem a figurinha) e `minha`.
     */
    public function listarMural(): void
    {
        $uid = $this->authUserId();

        $rows = $this->db->fetchAll(
            "SELECT MIN(t.id) as id, t.figurinha_id, t.ofertante_id, MIN(t.criado_em) as criado_em,
                    f.numero, f.nome, f.time, f.categoria, f.raridade, f.imagem_url,
                    u.username AS ofertante_nome
             FROM album_trocas t
             JOIN album_figurinhas f ON f.id = t.figurinha_id
             JOIN usuarios u ON u.id = t.ofertante_id
             WHERE t.status = 'disponivel'
             GROUP BY t.figurinha_id, t.ofertante_id, f.numero, f.nome, f.time, f.categoria, f.raridade, f.imagem_url, u.username
             ORDER BY criado_em DESC"
        );

        $invRows = $this->db->fetchAll(
            'SELECT figurinha_id, quantidade FROM album_inventario WHERE usuario_id = ?',
            [$uid]
        );
        $inv = [];
        foreach ($invRows as $r) {
            $inv[(int)$r['figurinha_id']] = (int)$r['quantidade'];
        }

        foreach ($rows as &$r) {
            $r['ja_obtida'] = (($inv[(int)$r['figurinha_id']] ?? 0) > 0);
            $r['minha']     = ((int)$r['ofertante_id'] === $uid);
        }
        unset($r);

        $this->ok(['trocas' => $rows]);
    }

    /**
     * POST /album/mural — disponibiliza uma figurinha repetida no mural.
     * Body: { figurinha_id }
     */
    public function disponibilizarTroca(): void
    {
        $uid = $this->authUserId();
        $in  = $this->getJsonInput();
        $figId = (int)($in['figurinha_id'] ?? 0);
        if ($figId <= 0) {
            throw new HttpError('figurinha_id e obrigatorio.', 400);
        }

        $inv = $this->db->fetchOne(
            'SELECT quantidade FROM album_inventario WHERE usuario_id = ? AND figurinha_id = ?',
            [$uid, $figId]
        );
        $qtd = (int)($inv['quantidade'] ?? 0);

        // Quantas dessa figurinha o usuario ja tem ativas no mural
        $jaNoMural = (int)($this->db->fetchOne(
            "SELECT COUNT(*) AS n FROM album_trocas
             WHERE ofertante_id = ? AND figurinha_id = ? AND status = 'disponivel'",
            [$uid, $figId]
        )['n'] ?? 0);

        // Precisa manter 1 para o proprio album + 1 livre para cada oferta
        if ($qtd < 2 + $jaNoMural) {
            throw new HttpError('Voce nao tem repetidas suficientes dessa figurinha para oferecer.', 422);
        }

        $this->db->execute(
            "INSERT INTO album_trocas (figurinha_id, ofertante_id, status)
             VALUES (?, ?, 'disponivel')",
            [$figId, $uid]
        );

        $this->ok([
            'id'      => (int)$this->db->lastInsertId(),
            'message' => 'Figurinha disponibilizada no mural!',
        ], 201);
    }

    /**
     * DELETE /album/mural/{id} — retira a propria oferta do mural.
     */
    public function retirarTroca(int $id): void
    {
        $uid   = $this->authUserId();
        $troca = $this->db->fetchOne('SELECT * FROM album_trocas WHERE id = ?', [$id]);
        if (!$troca) {
            throw new HttpError('Oferta nao encontrada.', 404);
        }
        if ((int)$troca['ofertante_id'] !== $uid) {
            throw new HttpError('Essa oferta nao e sua.', 403);
        }
        if ($troca['status'] !== 'disponivel') {
            throw new HttpError('Essa oferta nao esta mais disponivel.', 409);
        }
        $this->db->execute("UPDATE album_trocas SET status = 'cancelada' WHERE id = ?", [$id]);
        $this->ok(['message' => 'Oferta retirada do mural.']);
    }

    /**
     * GET /album/mural/{id}/opcoes — repetidas do usuario logado validas
     * para essa troca (que o ofertante ainda nao tem).
     */
    public function opcoesTroca(int $id): void
    {
        $uid = $this->authUserId();

        $troca = $this->db->fetchOne(
            "SELECT t.*, f.numero, f.nome, f.time, f.categoria, f.raridade, f.imagem_url,
                    u.username AS ofertante_nome
             FROM album_trocas t
             JOIN album_figurinhas f ON f.id = t.figurinha_id
             JOIN usuarios u ON u.id = t.ofertante_id
             WHERE t.id = ?",
            [$id]
        );
        if (!$troca) {
            throw new HttpError('Oferta nao encontrada.', 404);
        }
        if ($troca['status'] !== 'disponivel') {
            throw new HttpError('Essa oferta nao esta mais disponivel.', 409);
        }
        if ((int)$troca['ofertante_id'] === $uid) {
            throw new HttpError('Voce nao pode trocar com voce mesmo.', 422);
        }

        $ofertanteId = (int)$troca['ofertante_id'];

        // Repetidas do clicador (qtd >= 2) que o ofertante NAO possui
        $opcoes = $this->db->fetchAll(
            "SELECT f.id, f.numero, f.nome, f.time, f.categoria, f.raridade, f.imagem_url,
                    inv.quantidade
             FROM album_inventario inv
             JOIN album_figurinhas f ON f.id = inv.figurinha_id
             WHERE inv.usuario_id = ?
               AND inv.quantidade >= 2
               AND f.ativa = 1
               AND f.id NOT IN (
                   SELECT figurinha_id FROM album_inventario
                   WHERE usuario_id = ? AND quantidade > 0
               )
             ORDER BY f.numero ASC",
            [$uid, $ofertanteId]
        );

        $this->ok(['troca' => $troca, 'opcoes' => $opcoes]);
    }

    /**
     * POST /album/mural/{id}/trocar — executa a troca de forma atomica.
     * Body: { figurinha_oferecida_id }
     */
    public function executarTroca(int $id): void
    {
        $uid = $this->authUserId();
        $in  = $this->getJsonInput();
        $figOferecidaId = (int)($in['figurinha_oferecida_id'] ?? 0);
        if ($figOferecidaId <= 0) {
            throw new HttpError('figurinha_oferecida_id e obrigatorio.', 400);
        }

        $this->db->beginTransaction();
        try {
            // Trava a linha da troca contra corrida
            $troca = $this->db->fetchOne(
                'SELECT * FROM album_trocas WHERE id = ? FOR UPDATE',
                [$id]
            );
            if (!$troca) {
                throw new HttpError('Oferta nao encontrada.', 404);
            }
            if ($troca['status'] !== 'disponivel') {
                throw new HttpError('Essa oferta ja foi trocada ou retirada.', 409);
            }

            $ofertanteId  = (int)$troca['ofertante_id'];
            $figDoMuralId = (int)$troca['figurinha_id'];
            if ($ofertanteId === $uid) {
                throw new HttpError('Voce nao pode trocar com voce mesmo.', 422);
            }

            // Clicador precisa ter a figurinha oferecida repetida (qtd >= 2)
            $invClic = $this->db->fetchOne(
                'SELECT quantidade FROM album_inventario WHERE usuario_id = ? AND figurinha_id = ?',
                [$uid, $figOferecidaId]
            );
            if ((int)($invClic['quantidade'] ?? 0) < 2) {
                throw new HttpError('Voce nao tem essa figurinha repetida para oferecer.', 422);
            }

            // Ofertante NAO pode ter a figurinha oferecida
            $invOferDaOferecida = $this->db->fetchOne(
                'SELECT quantidade FROM album_inventario WHERE usuario_id = ? AND figurinha_id = ?',
                [$ofertanteId, $figOferecidaId]
            );
            if ((int)($invOferDaOferecida['quantidade'] ?? 0) > 0) {
                throw new HttpError('O dono ja tem essa figurinha.', 422);
            }

            // Ofertante ainda precisa ter a figurinha do mural repetida
            $invOfer = $this->db->fetchOne(
                'SELECT quantidade FROM album_inventario WHERE usuario_id = ? AND figurinha_id = ?',
                [$ofertanteId, $figDoMuralId]
            );
            if ((int)($invOfer['quantidade'] ?? 0) < 2) {
                throw new HttpError('O dono nao tem mais essa figurinha disponivel.', 409);
            }

            // Troca: ofertante cede a do mural e recebe a oferecida
            $this->ajustarInventario($ofertanteId, $figDoMuralId, -1);
            $this->ajustarInventario($ofertanteId, $figOferecidaId, +1);
            // Clicador cede a oferecida e recebe a do mural
            $this->ajustarInventario($uid, $figOferecidaId, -1);
            $this->ajustarInventario($uid, $figDoMuralId, +1);

            $this->db->execute(
                "UPDATE album_trocas
                 SET status = 'concluida', recebedor_id = ?, figurinha_recebida_id = ?, concluido_em = NOW()
                 WHERE id = ?",
                [$uid, $figOferecidaId, $id]
            );

            $this->db->commit();
        } catch (\Throwable $e) {
            $this->db->rollBack();
            if ($e instanceof HttpError) {
                throw $e;
            }
            throw new HttpError('Erro ao executar troca: ' . $e->getMessage(), 500);
        }

        // Notificacao in-app ao ofertante (fora da transacao)
        try {
            $figMural = $this->db->fetchOne('SELECT nome FROM album_figurinhas WHERE id = ?', [(int)$troca['figurinha_id']]);
            $figRec   = $this->db->fetchOne('SELECT nome FROM album_figurinhas WHERE id = ?', [$figOferecidaId]);
            $clic     = $this->db->fetchOne('SELECT username FROM usuarios WHERE id = ?', [$uid]);
            NotificacoesController::criar(
                $this->db,
                (int)$troca['ofertante_id'],
                'album_troca',
                'Troca realizada!',
                "{$clic['username']} pegou \"{$figMural['nome']}\" e te deu \"{$figRec['nome']}\".",
                ['troca_id' => $id]
            );
        } catch (\Throwable $e) {
            // notificacao e best-effort — nao quebra a troca
        }

        $this->ok(['message' => 'Troca realizada com sucesso!']);
    }

    /**
     * GET /album/trocas/novidades — trocas concluidas que o ofertante
     * (usuario logado) ainda nao viu. Alimenta o modal de novidades.
     */
    public function novidadesTrocas(): void
    {
        $uid = $this->authUserId();
        $rows = $this->db->fetchAll(
            "SELECT t.id, t.concluido_em,
                    fc.numero AS cedida_numero, fc.nome AS cedida_nome,
                    fc.raridade AS cedida_raridade, fc.imagem_url AS cedida_imagem,
                    fr.numero AS recebida_numero, fr.nome AS recebida_nome,
                    fr.raridade AS recebida_raridade, fr.imagem_url AS recebida_imagem,
                    u.username AS recebedor_nome
             FROM album_trocas t
             JOIN album_figurinhas fc ON fc.id = t.figurinha_id
             LEFT JOIN album_figurinhas fr ON fr.id = t.figurinha_recebida_id
             JOIN usuarios u ON u.id = t.recebedor_id
             WHERE t.ofertante_id = ?
               AND t.status = 'concluida'
               AND t.ofertante_visto = 0
             ORDER BY t.concluido_em DESC",
            [$uid]
        );
        $this->ok(['trocas' => $rows]);
    }

    /**
     * POST /album/trocas/novidades/visto — marca todas as trocas
     * concluidas do usuario como ja vistas.
     */
    public function marcarTrocasVistas(): void
    {
        $uid = $this->authUserId();
        $this->db->execute(
            "UPDATE album_trocas SET ofertante_visto = 1
             WHERE ofertante_id = ? AND status = 'concluida'",
            [$uid]
        );
        $this->ok(['message' => 'Novidades marcadas como vistas.']);
    }

    /**
     * GET /album/figurinhas/{id}/origem — como o usuario logado obteve
     * essa figurinha (pacote, troca ou ainda nao tem).
     */
    public function origemFigurinha(int $figId): void
    {
        $uid = $this->authUserId();

        $fig = $this->db->fetchOne(
            'SELECT id, numero, nome, `time`, raridade, imagem_url
             FROM album_figurinhas WHERE id = ?',
            [$figId]
        );
        if (!$fig) {
            throw new HttpError('Figurinha nao encontrada.', 404);
        }

        $inv = $this->db->fetchOne(
            'SELECT quantidade, obtida_em FROM album_inventario
             WHERE usuario_id = ? AND figurinha_id = ?',
            [$uid, $figId]
        );

        $eventos = [];

        // Veio de troca?
        $troca = $this->db->fetchOne(
            "SELECT t.concluido_em, u.username AS de
             FROM album_trocas t
             JOIN usuarios u ON u.id = t.ofertante_id
             WHERE t.recebedor_id = ? AND t.figurinha_id = ? AND t.status = 'concluida'
             ORDER BY t.concluido_em DESC LIMIT 1",
            [$uid, $figId]
        );
        if ($troca) {
            $eventos[] = [
                'tipo'  => 'troca',
                'data'  => $troca['concluido_em'],
                'texto' => 'Trocada com ' . $troca['de'],
            ];
        }

        // Veio de pacote?
        $pac = $this->db->fetchOne(
            "SELECT p.aberto_em
             FROM album_pacote_figurinhas pf
             JOIN album_pacotes p ON p.id = pf.pacote_id
             WHERE p.usuario_id = ? AND pf.figurinha_id = ?
             ORDER BY p.aberto_em ASC LIMIT 1",
            [$uid, $figId]
        );
        if ($pac) {
            $eventos[] = [
                'tipo'  => 'pacote',
                'data'  => $pac['aberto_em'],
                'texto' => 'Encontrada ao abrir um pacote',
            ];
        }

        $this->ok([
            'figurinha'  => $fig,
            'quantidade' => (int)($inv['quantidade'] ?? 0),
            'obtida'     => (bool)$inv,
            'obtida_em'  => $inv['obtida_em'] ?? null,
            'eventos'    => $eventos,
        ]);
    }

    // =========================================================
    private function ok(array $data, int $code = 200): void
    {
        http_response_code($code);
        echo json_encode(['ok' => true] + $data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }
}
