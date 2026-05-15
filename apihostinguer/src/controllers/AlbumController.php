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
 *   --- Admin ---
 *   POST   /album/admin/distribuir        Distribui pacotes para jogadores
 */

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../utils/HttpError.php';

class AlbumController
{
    private $db;

    // Probabilidades de raridade no sorteio de figurinhas
    private const PROB_LENDARIA = 0.10;     // 10%
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
        if (!in_array($raridade, ['comum','lendaria'], true)) {
            throw new HttpError('Raridade inválida.', 400);
        }
        try {
            $this->db->execute(
                'INSERT INTO album_figurinhas
                    (numero, nome, descricao, categoria, raridade, imagem_url, pagina_id, slot)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [
                    (int)$in['numero'],
                    trim($in['nome']),
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
     * 90% comum / 10% lendária. Aplica anti-frustração.
     */
    private function sortearFigurinhas(int $uid): array
    {
        $comuns    = $this->db->fetchAll(
            "SELECT id FROM album_figurinhas WHERE ativa = 1 AND raridade = 'comum'"
        );
        $lendarias = $this->db->fetchAll(
            "SELECT id FROM album_figurinhas WHERE ativa = 1 AND raridade = 'lendaria'"
        );
        $comuns    = array_map(fn($r) => (int)$r['id'], $comuns);
        $lendarias = array_map(fn($r) => (int)$r['id'], $lendarias);

        if (empty($comuns) && empty($lendarias)) {
            return [];
        }

        $escolhidas = [];
        $usados     = [];

        // Anti-frustração: se passou de N pacotes sem lendária, garante 1
        $garantirLendaria = !empty($lendarias) && $this->precisaGarantirLendaria($uid);

        for ($i = 0; $i < self::PACOTE_TAMANHO; $i++) {
            $querLendaria = false;

            if ($garantirLendaria && $i === 0) {
                $querLendaria = true;
            } elseif (!empty($lendarias) && (mt_rand(1, 10000) / 10000) <= self::PROB_LENDARIA) {
                $querLendaria = true;
            }

            $pool = $querLendaria && !empty($lendarias) ? $lendarias : $comuns;
            // Se o pool preferido está esgotado para distinção, cai no outro
            $disponiveis = array_values(array_diff($pool, $usados));
            if (empty($disponiveis)) {
                $outro = $pool === $comuns ? $lendarias : $comuns;
                $disponiveis = array_values(array_diff($outro, $usados));
            }
            if (empty($disponiveis)) {
                break; // catálogo menor que 5 — devolve o que tem
            }

            $escolhida = $disponiveis[array_rand($disponiveis)];
            $escolhidas[] = $escolhida;
            $usados[]     = $escolhida;
        }

        return $escolhidas;
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
    private function ok(array $data, int $code = 200): void
    {
        http_response_code($code);
        echo json_encode(['ok' => true] + $data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }
}
