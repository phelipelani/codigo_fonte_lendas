<?php
/**
 * Controller de Jogadores
 * Arquivo: src/controllers/JogadorController.php
 *
 * Rotas:
 *   GET    /jogadores              → Lista todos (suporta ?posicao=goleiro)
 *   GET    /jogadores/{id}         → Detalhes com times vinculados
 *   POST   /jogadores              → Criar
 *   PUT    /jogadores/{id}         → Editar completo
 *   PUT    /jogadores/{id}/details → Editar parcial: nivel, joga_recuado
 *   DELETE /jogadores/{id}         → Deletar
 */

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../utils/HttpError.php';

class JogadorController
{
    private $db;

    public function __construct()
    {
        $this->db = Database::getInstance();
    }

    // =========================================================
    // GET /jogadores
    // Suporta ?posicao=goleiro para filtrar por posição
    // =========================================================
    public function index(): void
    {
        $where  = [];
        $params = [];

        if (!empty($_GET['posicao'])) {
            $where[]  = "j.posicao = ?";
            $params[] = $_GET['posicao'];
        }

        $sql = "
            SELECT
                j.id, j.nome, j.posicao, j.nivel,
                j.joga_recuado AS jogarRecuado,
                j.foto_url     AS fotoUrl,
                j.avatar_url   AS avatarUrl,
                j.usuario_id   AS usuarioId,
                u.role         AS usuarioRole,
                CASE WHEN u.id IS NOT NULL THEN 1 ELSE 0 END AS temContaAtiva
            FROM jogadores j
            LEFT JOIN usuarios u ON u.id = j.usuario_id
        ";

        if ($where) {
            $sql .= " WHERE " . implode(' AND ', $where);
        }

        $sql .= " ORDER BY j.nome ASC";

        $jogadores = $this->db->fetchAll($sql, $params);

        $result = array_map(function ($j) {
            return [
                'id'           => (int) $j['id'],
                'nome'         => $j['nome'],
                'posicao'      => $j['posicao'],
                'nivel'        => (int) $j['nivel'],
                'jogarRecuado' => (bool) $j['jogarRecuado'],
                'joga_recuado' => (bool) $j['jogarRecuado'],
                'fotoUrl'      => $j['fotoUrl'],
                'foto_url'     => $j['fotoUrl'],
                'avatarUrl'    => $j['avatarUrl'],
                'usuarioId'    => $j['usuarioId'] ? (int) $j['usuarioId'] : null,
                'usuario'      => $j['usuarioId'] ? [
                    'role'            => $j['usuarioRole'],
                    'tem_conta_ativa' => (bool) $j['temContaAtiva'],
                ] : null,
            ];
        }, $jogadores);

        http_response_code(200);
        echo json_encode($result, JSON_UNESCAPED_UNICODE);
    }

    // =========================================================
    // GET /jogadores/{id}
    // =========================================================
    public function show(int $id): void
    {
        $jogador = $this->db->fetchOne("
            SELECT
                j.id, j.nome, j.posicao, j.nivel,
                j.joga_recuado AS jogarRecuado,
                j.foto_url     AS fotoUrl,
                j.avatar_url   AS avatarUrl,
                j.usuario_id   AS usuarioId,
                u.role         AS usuarioRole,
                CASE WHEN u.id IS NOT NULL THEN 1 ELSE 0 END AS temContaAtiva
            FROM jogadores j
            LEFT JOIN usuarios u ON u.id = j.usuario_id
            WHERE j.id = ?
        ", [$id]);

        if (!$jogador) {
            throw new HttpError('Jogador não encontrado.', 404);
        }

        $times = $this->db->fetchAll("
            SELECT
                t.id, t.nome,
                t.logo_url      AS logoUrl,
                tj.is_capitao   AS isCapitao,
                tj.is_pe_de_rato AS isPeDeRato
            FROM time_jogadores tj
            JOIN times t ON t.id = tj.time_id
            WHERE tj.jogador_id = ?
            ORDER BY t.nome ASC
        ", [$id]);

        $timesFormatados = array_map(fn($t) => [
            'id'         => (int) $t['id'],
            'nome'       => $t['nome'],
            'logoUrl'    => $t['logoUrl'],
            'logo_url'   => $t['logoUrl'],
            'isCapitao'  => (bool) $t['isCapitao'],
            'isPeDeRato' => (bool) $t['isPeDeRato'],
        ], $times);

        http_response_code(200);
        echo json_encode([
            'id'           => (int) $jogador['id'],
            'nome'         => $jogador['nome'],
            'posicao'      => $jogador['posicao'],
            'nivel'        => (int) $jogador['nivel'],
            'jogarRecuado' => (bool) $jogador['jogarRecuado'],
            'joga_recuado' => (bool) $jogador['jogarRecuado'],
            'fotoUrl'      => $jogador['fotoUrl'],
            'foto_url'     => $jogador['fotoUrl'],
            'avatarUrl'    => $jogador['avatarUrl'],
            'usuarioId'    => $jogador['usuarioId'] ? (int) $jogador['usuarioId'] : null,
            'usuario'      => $jogador['usuarioId'] ? [
                'role'            => $jogador['usuarioRole'],
                'tem_conta_ativa' => (bool) $jogador['temContaAtiva'],
            ] : null,
            'times'        => $timesFormatados,
        ], JSON_UNESCAPED_UNICODE);
    }

    // =========================================================
    // POST /jogadores
    // =========================================================
    public function store(): void
    {
        $input = $this->getJsonInput();

        if (empty($input['nome'])) {
            throw new HttpError('Nome é obrigatório.', 400);
        }

        if (empty($input['posicao']) || !in_array($input['posicao'], ['linha', 'goleiro'])) {
            throw new HttpError('Posição inválida. Use "linha" ou "goleiro".', 400);
        }

        // Verifica se nome já existe
        $existing = $this->db->fetchOne('SELECT id FROM jogadores WHERE nome = ? LIMIT 1', [$input['nome']]);
        if ($existing) {
            throw new HttpError('Já existe um jogador com este nome.', 409);
        }

        $nivel       = isset($input['nivel']) ? max(0, min(10, (int) $input['nivel'])) : 5;
        $jogaRecuado = !empty($input['joga_recuado']) || !empty($input['jogarRecuado']);
        $fotoUrl     = $input['foto_url'] ?? $input['fotoUrl'] ?? null;
        $usuarioId   = $input['usuarioId'] ?? $input['usuario_id'] ?? null;

        $this->db->execute(
            'INSERT INTO jogadores (nome, posicao, nivel, joga_recuado, foto_url, usuario_id) VALUES (?, ?, ?, ?, ?, ?)',
            [$input['nome'], $input['posicao'], $nivel, $jogaRecuado ? 1 : 0, $fotoUrl, $usuarioId]
        );

        $newId = (int) $this->db->lastInsertId();

        http_response_code(201);
        echo json_encode([
            'id'           => $newId,
            'nome'         => $input['nome'],
            'posicao'      => $input['posicao'],
            'nivel'        => $nivel,
            'jogarRecuado' => $jogaRecuado,
            'joga_recuado' => $jogaRecuado,
            'fotoUrl'      => $fotoUrl,
            'foto_url'     => $fotoUrl,
            'avatarUrl'    => null,
            'usuarioId'    => $usuarioId ? (int) $usuarioId : null,
            'usuario'      => null,
        ], JSON_UNESCAPED_UNICODE);
    }

    // =========================================================
    // PUT /jogadores/{id} — edição completa
    // =========================================================
    public function update(int $id): void
    {
        $jogador = $this->db->fetchOne('SELECT id FROM jogadores WHERE id = ?', [$id]);
        if (!$jogador) {
            throw new HttpError('Jogador não encontrado.', 404);
        }

        $input  = $this->getJsonInput();
        $fields = [];
        $params = [];

        if (isset($input['nome'])) {
            $fields[] = 'nome = ?';
            $params[] = $input['nome'];
        }

        if (isset($input['posicao'])) {
            if (!in_array($input['posicao'], ['linha', 'goleiro'])) {
                throw new HttpError('Posição inválida.', 400);
            }
            $fields[] = 'posicao = ?';
            $params[] = $input['posicao'];
        }

        if (isset($input['nivel'])) {
            $fields[] = 'nivel = ?';
            $params[] = max(0, min(10, (int) $input['nivel']));
        }

        if (isset($input['joga_recuado']) || isset($input['jogarRecuado'])) {
            $val      = $input['joga_recuado'] ?? $input['jogarRecuado'];
            $fields[] = 'joga_recuado = ?';
            $params[] = $val ? 1 : 0;
        }

        if (isset($input['foto_url']) || isset($input['fotoUrl'])) {
            $fields[] = 'foto_url = ?';
            $params[] = $input['foto_url'] ?? $input['fotoUrl'];
        }

        if (empty($fields)) {
            throw new HttpError('Nenhum campo para atualizar.', 400);
        }

        $params[] = $id;
        $this->db->execute('UPDATE jogadores SET ' . implode(', ', $fields) . ' WHERE id = ?', $params);

        $updated = $this->db->fetchOne("
            SELECT j.*, u.role AS usuarioRole,
                   CASE WHEN u.id IS NOT NULL THEN 1 ELSE 0 END AS temContaAtiva
            FROM jogadores j
            LEFT JOIN usuarios u ON u.id = j.usuario_id
            WHERE j.id = ?
        ", [$id]);

        http_response_code(200);
        echo json_encode([
            'id'           => (int) $updated['id'],
            'nome'         => $updated['nome'],
            'posicao'      => $updated['posicao'],
            'nivel'        => (int) $updated['nivel'],
            'jogarRecuado' => (bool) $updated['joga_recuado'],
            'joga_recuado' => (bool) $updated['joga_recuado'],
            'fotoUrl'      => $updated['foto_url'],
            'foto_url'     => $updated['foto_url'],
            'avatarUrl'    => $updated['avatar_url'],
            'usuarioId'    => $updated['usuario_id'] ? (int) $updated['usuario_id'] : null,
            'usuario'      => $updated['usuario_id'] ? [
                'role'            => $updated['usuarioRole'],
                'tem_conta_ativa' => (bool) $updated['temContaAtiva'],
            ] : null,
        ], JSON_UNESCAPED_UNICODE);
    }

    // =========================================================
    // PUT /jogadores/{id}/details — edição parcial
    // =========================================================
    public function updateDetails(int $id): void
    {
        $this->update($id);
    }

    // =========================================================
    // DELETE /jogadores/{id}
    // =========================================================
    public function destroy(int $id): void
    {
        $jogador = $this->db->fetchOne('SELECT id, nome FROM jogadores WHERE id = ?', [$id]);
        if (!$jogador) {
            throw new HttpError('Jogador não encontrado.', 404);
        }

        $this->db->beginTransaction();
        try {
            // Remove registros dependentes antes de deletar o jogador
            $this->db->execute('DELETE FROM time_jogadores WHERE jogador_id = ?', [$id]);
            $this->db->execute('DELETE FROM campeonato_estatisticas_partida WHERE jogador_id = ?', [$id]);
            $this->db->execute('DELETE FROM campeonato_vencedores WHERE jogador_id = ?', [$id]);
            $this->db->execute('DELETE FROM campeonato_premios WHERE jogador_id = ?', [$id]);
            $this->db->execute('DELETE FROM premios_rodada WHERE jogador_id = ?', [$id]);
            $this->db->execute('DELETE FROM convites WHERE jogador_id = ?', [$id]);
            $this->db->execute('DELETE FROM jogadores WHERE id = ?', [$id]);

            $this->db->commit();
        } catch (\Exception $e) {
            $this->db->rollBack();
            throw $e;
        }

        http_response_code(200);
        echo json_encode(['success' => true, 'nome' => $jogador['nome']], JSON_UNESCAPED_UNICODE);
    }


    // =========================================================
    // GET /jogadores/{id}/perfil-completo
    // =========================================================
    public function perfilCompleto(int $id): void
    {
        // Dados básicos do jogador
        $jogador = $this->db->fetchOne("
            SELECT id, nome, posicao, nivel, joga_recuado, foto_url, avatar_url
            FROM jogadores WHERE id = ?
        ", [$id]);

        if (!$jogador) throw new HttpError('Jogador não encontrado.', 404);

        // Totais históricos
        $totais = $this->db->fetchOne("
            SELECT
                COUNT(DISTINCT ep.partida_id)  AS jogos,
                COALESCE(SUM(ep.gols), 0)      AS gols,
                COALESCE(SUM(ep.assistencias), 0) AS assists,
                COALESCE(SUM(ep.clean_sheet), 0)  AS clean_sheets
            FROM campeonato_estatisticas_partida ep
            JOIN campeonato_partidas cp ON cp.id = ep.partida_id AND cp.status = 'finalizada'
            WHERE ep.jogador_id = ?
        ", [$id]);

        // Desempenho (V/E/D)
        $desempenho = $this->db->fetchOne("
            SELECT
                SUM(CASE WHEN (ep.time_id=cp.timeA_id AND cp.placar_timeA>cp.placar_timeB)
                              OR (ep.time_id=cp.timeB_id AND cp.placar_timeB>cp.placar_timeA)
                         THEN 1 ELSE 0 END) AS vitorias,
                SUM(CASE WHEN cp.placar_timeA=cp.placar_timeB THEN 1 ELSE 0 END) AS empates,
                SUM(CASE WHEN (ep.time_id=cp.timeA_id AND cp.placar_timeA<cp.placar_timeB)
                              OR (ep.time_id=cp.timeB_id AND cp.placar_timeB<cp.placar_timeA)
                         THEN 1 ELSE 0 END) AS derrotas
            FROM campeonato_estatisticas_partida ep
            JOIN campeonato_partidas cp ON cp.id = ep.partida_id AND cp.status = 'finalizada'
            WHERE ep.jogador_id = ?
        ", [$id]);

        // Títulos
        $titulos = $this->db->fetchAll("
            SELECT c.id, c.nome
            FROM campeonato_vencedores cv
            JOIN campeonatos c ON c.id = cv.campeonato_id
            WHERE cv.jogador_id = ?
            ORDER BY c.id DESC
        ", [$id]);

        // Prêmios (mvp, artilheiro, garcom, pe_de_rato)
        $premiosCamp = $this->db->fetchAll("
            SELECT tipo_premio, c.nome AS campeonato_nome
            FROM campeonato_premios cp2
            JOIN campeonatos c ON c.id = cp2.campeonato_id
            WHERE cp2.jogador_id = ?
        ", [$id]);

        $premiosRodada = $this->db->fetchAll("
            SELECT tipo_premio
            FROM premios_rodada
            WHERE jogador_id = ?
        ", [$id]);

        // Merge todos os prêmios num array único
        $todosPrems = array_merge(
            array_map(fn($p) => ['tipo_premio' => $p['tipo_premio'], 'origem' => 'campeonato'], $premiosCamp),
            array_map(fn($p) => ['tipo_premio' => $p['tipo_premio'], 'origem' => 'rodada'], $premiosRodada)
        );

        // MVPs semanais (rodada)
        $mvpsSemanais = count(array_filter($premiosRodada, fn($p) => $p['tipo_premio'] === 'mvp'));

        // Melhor dupla (parceiro com mais gols juntos)
        $melhorDupla = $this->db->fetchOne("
            SELECT j2.nome, COUNT(*) AS total
            FROM campeonato_estatisticas_partida ep1
            JOIN campeonato_estatisticas_partida ep2
                ON ep2.partida_id = ep1.partida_id
               AND ep2.time_id    = ep1.time_id
               AND ep2.jogador_id <> ep1.jogador_id
            JOIN campeonato_partidas cp ON cp.id = ep1.partida_id AND cp.status = 'finalizada'
            JOIN jogadores j2 ON j2.id = ep2.jogador_id
            WHERE ep1.jogador_id = ?
            GROUP BY ep2.jogador_id, j2.nome
            ORDER BY total DESC
            LIMIT 1
        ", [$id]);

        // Stats para radar (médias por jogo)
        $jogos = max((int)($totais['jogos'] ?? 1), 1);
        $statsRadar = [
            'gols'         => round((float)($totais['gols'] ?? 0) / $jogos, 2),
            'assists'      => round((float)($totais['assists'] ?? 0) / $jogos, 2),
            'clean_sheets' => round((float)($totais['clean_sheets'] ?? 0) / $jogos, 2),
            'vitorias'     => round((float)($desempenho['vitorias'] ?? 0) / $jogos, 2),
            'jogos'        => (int)$jogos,
        ];

        http_response_code(200);
        echo json_encode([
            'id'           => (int)$jogador['id'],
            'nome'         => $jogador['nome'],
            'posicao'      => $jogador['posicao'],
            'nivel'        => (int)$jogador['nivel'],
            'jogarRecuado' => (bool)$jogador['joga_recuado'],
            'joga_recuado' => (bool)$jogador['joga_recuado'],
            'fotoUrl'      => $jogador['foto_url'],
            'foto_url'     => $jogador['foto_url'],
            'avatarUrl'    => $jogador['avatar_url'],
            'avatar_url'   => $jogador['avatar_url'],
            'stats' => [
                'totais'      => [
                    'jogos'        => (int)($totais['jogos'] ?? 0),
                    'gols'         => (int)($totais['gols'] ?? 0),
                    'assists'      => (int)($totais['assists'] ?? 0),
                    'clean_sheets' => (int)($totais['clean_sheets'] ?? 0),
                ],
                'desempenho'  => [
                    'vitorias' => (int)($desempenho['vitorias'] ?? 0),
                    'empates'  => (int)($desempenho['empates'] ?? 0),
                    'derrotas' => (int)($desempenho['derrotas'] ?? 0),
                ],
                'titulos'     => $titulos,
                'premios'     => $todosPrems,
                'mvpsSemanais'=> $mvpsSemanais,
                'melhorDupla' => $melhorDupla,
                'radar'       => $statsRadar,
            ],
        ], JSON_UNESCAPED_UNICODE);
    }

    // =========================================================
    private function getJsonInput(): array
    {
        return json_decode(file_get_contents('php://input'), true) ?? [];
    }
}