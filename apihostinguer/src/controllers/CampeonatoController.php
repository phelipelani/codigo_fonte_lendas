<?php
/**
 * Arquivo: src/controllers/CampeonatoController.php
 * 
 * MUDANÇAS nesta versão:
 * - store(): removido o UPDATE desnecessário de formato, o campo é salvo direto no INSERT
 * - iniciar(): para Liga com modo fixo, vai para 'em_andamento'; Copa vai para 'fase_de_grupos'
 * - Adicionado suporte a edição (update) tratando formato_mata_mata como parte do campo formato
 */

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../utils/HttpError.php';
require_once __DIR__ . '/../utils/Pontos.php';

class CampeonatoController
{
    private $db;

    public function __construct()
    {
        $this->db = Database::getInstance();
    }

    // =========================================================
    // GET /campeonatos
    // =========================================================
    public function index(): void
    {
        $camps = $this->db->fetchAll("
            SELECT
                c.id, c.nome, c.data, c.formato, c.fase_atual, c.num_times,
                c.tem_fase_grupos, c.fase_grupos_ida_volta, c.tem_repescagem,
                c.tem_terceiro_lugar, c.modo_selecao_times, c.status,
                c.time_campeao_id, c.foto_campiao_url,
                t.nome  AS time_campeao_nome,
                t.logo_url AS time_campeao_logo,
                COUNT(DISTINCT ct.time_id) AS total_times_inscritos,
                (SELECT MAX(data) FROM rodadas r WHERE r.campeonato_id = c.id) as data_fim,
                (SELECT COUNT(*) FROM rodadas r WHERE r.campeonato_id = c.id) as total_rodadas,
                (SELECT COUNT(*) FROM rodadas r WHERE r.campeonato_id = c.id AND r.status IN ('finalizada', 'em_andamento')) as rodadas_completas
            FROM campeonatos c
            LEFT JOIN times t  ON t.id  = c.time_campeao_id
            LEFT JOIN campeonato_times ct ON ct.campeonato_id = c.id
            GROUP BY c.id
            ORDER BY c.data DESC
        ");

        http_response_code(200);
        echo json_encode(array_map(fn($c) => $this->formatCampeonato($c), $camps), JSON_UNESCAPED_UNICODE);
    }

    // =========================================================
    // GET /campeonatos/:id
    // =========================================================
    public function show(int $id): void
    {
        $camp = $this->getCampeonatoOr404($id);
        http_response_code(200);
        echo json_encode($this->formatCampeonato($camp), JSON_UNESCAPED_UNICODE);
    }

    // =========================================================
    // POST /campeonatos
    // Payload: { nome, data, formato, num_times, modo_selecao_times,
    //            tem_fase_grupos, tem_lower_bracket, formato_mata_mata }
    // =========================================================
    public function store(): void
    {
        $input = $this->json();

        if (empty($input['nome'])) throw new HttpError('Nome é obrigatório.', 400);
        if (empty($input['data'])) throw new HttpError('Data é obrigatória.', 400);

        // O front manda formato já composto (ex: "copa_4_semi_final" ou "liga")
        // ATENÇÃO: só compõe formato copa se tipo NÃO for liga
        $formato     = $input['formato'] ?? 'liga';
        $formatoMata = $input['formato_mata_mata'] ?? null;

        // Só recompõe se o formato enviado não for 'liga' e vier separado
        if ($formato !== 'liga' && $formatoMata && !str_contains($formato, $formatoMata)) {
            $numTimes = (int)($input['num_times'] ?? 4);
            $formato  = "copa_{$numTimes}_{$formatoMata}";
        }

        $numTimes         = (int)($input['num_times'] ?? 4);
        $modoSelecao      = $input['modo_selecao_times'] ?? 'sorteio';
        $temFaseGrupos    = !empty($input['tem_fase_grupos'])   ? 1 : 0;
        $temRepescagem    = !empty($input['tem_lower_bracket'])  ? 1 : 0;
        $temTerceiroLugar = !empty($input['tem_terceiro_lugar']) ? 1 : 0;

        $this->db->execute("
            INSERT INTO campeonatos
                (nome, data, formato, num_times, modo_selecao_times,
                 tem_fase_grupos, tem_repescagem, tem_terceiro_lugar,
                 fase_atual, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'inscricao', 'aberto')
        ", [
            $input['nome'], $input['data'], $formato, $numTimes, $modoSelecao,
            $temFaseGrupos, $temRepescagem, $temTerceiroLugar,
        ]);

        $newId = (int)$this->db->lastInsertId();
        $camp  = $this->getCampeonatoOr404($newId);

        http_response_code(201);
        echo json_encode($this->formatCampeonato($camp), JSON_UNESCAPED_UNICODE);
    }

    // =========================================================
    // PUT /campeonatos/:id
    // =========================================================
    public function update(int $id): void
    {
        $this->getCampeonatoOr404($id);
        $input  = $this->json();
        $fields = []; $params = [];

        $allowed = [
            'nome', 'data', 'num_times', 'status', 'fase_atual',
            'tem_terceiro_lugar', 'tem_repescagem', 'fase_grupos_ida_volta',
        ];

        foreach ($allowed as $col) {
            if (array_key_exists($col, $input)) {
                $fields[] = "{$col} = ?";
                $params[] = $input[$col];
            }
        }

        // Recalcula formato se enviaram componentes separados
        if (isset($input['formato'])) {
            $fmt = $input['formato'];
            if (isset($input['formato_mata_mata']) && !str_contains($fmt, $input['formato_mata_mata'])) {
                $n   = $input['num_times'] ?? $this->getCampeonatoOr404($id)['num_times'];
                $fmt = "copa_{$n}_{$input['formato_mata_mata']}";
            }
            $fields[] = 'formato = ?';
            $params[] = $fmt;
        }

        if (empty($fields)) throw new HttpError('Nenhum campo para atualizar.', 400);

        $params[] = $id;
        $this->db->execute("UPDATE campeonatos SET " . implode(', ', $fields) . " WHERE id = ?", $params);

        $camp = $this->getCampeonatoOr404($id);
        http_response_code(200);
        echo json_encode($this->formatCampeonato($camp), JSON_UNESCAPED_UNICODE);
    }

    // =========================================================
    // DELETE /campeonatos/:id
    // =========================================================
    public function destroy(int $id): void
    {
        $this->getCampeonatoOr404($id);
        $this->db->execute("DELETE FROM campeonatos WHERE id = ?", [$id]);
        http_response_code(200);
        echo json_encode(['success' => true]);
    }

    // =========================================================
    // GET /campeonatos/:id/times
    // =========================================================
    public function times(int $id): void
    {
        $this->getCampeonatoOr404($id);
        $times = $this->db->fetchAll("
            SELECT t.id, t.nome, t.logo_url
            FROM campeonato_times ct
            JOIN times t ON t.id = ct.time_id
            WHERE ct.campeonato_id = ?
            ORDER BY t.nome ASC
        ", [$id]);

        http_response_code(200);
        echo json_encode($times, JSON_UNESCAPED_UNICODE);
    }

    // =========================================================
    // POST /campeonatos/:id/times
    // =========================================================
    public function addTime(int $id): void
    {
        $this->getCampeonatoOr404($id);
        $input  = $this->json();
        $timeId = (int)($input['time_id'] ?? 0);

        if (!$timeId) throw new HttpError('time_id é obrigatório.', 400);

        $time = $this->db->fetchOne("SELECT id FROM times WHERE id = ?", [$timeId]);
        if (!$time) throw new HttpError('Time não encontrado.', 404);

        $existing = $this->db->fetchOne(
            "SELECT campeonato_id FROM campeonato_times WHERE campeonato_id = ? AND time_id = ?",
            [$id, $timeId]
        );
        if ($existing) throw new HttpError('Time já inscrito neste campeonato.', 409);

        $this->db->execute(
            "INSERT INTO campeonato_times (campeonato_id, time_id) VALUES (?, ?)",
            [$id, $timeId]
        );

        http_response_code(201);
        echo json_encode(['success' => true]);
    }

    // =========================================================
    // DELETE /campeonatos/:id/times/:timeId
    // =========================================================
    public function removeTime(int $id, int $timeId): void
    {
        $this->getCampeonatoOr404($id);
        $this->db->execute(
            "DELETE FROM campeonato_times WHERE campeonato_id = ? AND time_id = ?",
            [$id, $timeId]
        );
        http_response_code(200);
        echo json_encode(['success' => true]);
    }

    // =========================================================
    // POST /campeonatos/:id/iniciar
    // =========================================================
    public function iniciar(int $id): void
    {
        $camp = $this->getCampeonatoOr404($id);

        $timesCount = $this->db->fetchOne(
            "SELECT COUNT(*) AS total FROM campeonato_times WHERE campeonato_id = ?",
            [$id]
        );

        if ((int)$timesCount['total'] < 2) {
            throw new HttpError('Inscreva pelo menos 2 times antes de iniciar.', 400);
        }

        $ehCopa       = (int)($camp['tem_fase_grupos'] ?? 0) === 1;
        $ehLiga       = !$ehCopa || $camp['formato'] === 'liga';
        $modoSelecao  = $camp['modo_selecao_times'];

        // Liga sempre vai para em_andamento
        // Copa vai para fase_de_grupos (partidas geradas via POST /fase-grupos/iniciar)
        $novaFase = ($ehCopa && $camp['formato'] !== 'liga') ? 'fase_de_grupos' : 'em_andamento';

        $this->db->execute(
            "UPDATE campeonatos SET fase_atual = ?, status = 'em_andamento' WHERE id = ?",
            [$novaFase, $id]
        );

        // Se Liga com modo fixo: gera as partidas de rodadas automaticamente
        // (estrutura da liga usa rodadas manuais, então apenas muda a fase)

        http_response_code(200);
        echo json_encode(['success' => true, 'fase_atual' => $novaFase]);
    }

    // =========================================================
    // POST /campeonatos/:id/finalizar
    // =========================================================
    public function finalizar(int $id): void
    {
        $camp = $this->getCampeonatoOr404($id);

        // Para Copa (mata-mata): campeão vem da partida final
        $campeaoId = null;
        $formato   = $camp['formato'] ?? '';
        $ehCopa    = str_starts_with($formato, 'copa_') || in_array($formato, ['grupos', 'mata-mata', 'mata_mata']);

        if ($ehCopa) {
            // Busca vencedor da partida final do mata-mata
            $final = $this->db->fetchOne("
                SELECT placar_timeA, placar_timeB, placar_penaltis_timeA, placar_penaltis_timeB,
                       timeA_id, timeB_id
                FROM campeonato_partidas
                WHERE campeonato_id = ? AND fase = 'mata_mata' AND fase_mata_mata = 'final' AND status = 'finalizada'
                ORDER BY id DESC LIMIT 1
            ", [$id]);

            if ($final) {
                $pA = (int)$final['placar_timeA'];
                $pB = (int)$final['placar_timeB'];
                $penA = $final['placar_penaltis_timeA'] !== null ? (int)$final['placar_penaltis_timeA'] : null;
                $penB = $final['placar_penaltis_timeB'] !== null ? (int)$final['placar_penaltis_timeB'] : null;

                if ($pA > $pB || ($pA === $pB && $penA !== null && $penA > $penB)) {
                    $campeaoId = (int)$final['timeA_id'];
                } elseif ($pB > $pA || ($pA === $pB && $penB !== null && $penB > $penA)) {
                    $campeaoId = (int)$final['timeB_id'];
                }
            }
        }

        // Para Liga ou fallback: usa classificação de pontos
        if (!$campeaoId) {
            $classificacao = $this->calcularClassificacao($id);
            $campeaoId     = $classificacao[0]['time_id'] ?? null;
        }

        $this->db->execute(
            "UPDATE campeonatos SET fase_atual = 'finalizada', status = 'finalizado', time_campeao_id = ? WHERE id = ?",
            [$campeaoId, $id]
        );

        // Registra o time campeão + todos os jogadores que participaram
        if ($campeaoId) {
            // 1. Registra o time
            $this->db->execute(
                "INSERT IGNORE INTO campeonato_vencedores (campeonato_id, time_id, posicao) VALUES (?, ?, 1)",
                [$id, $campeaoId]
            );

            // 2. Registra cada jogador cujo time de maior frequência no camp é o campeão.
            //    Isso evita dar título a goleiros rotativos que jogaram mais pelo time rival.
            $jogadoresCampeoes = $this->getJogadoresCampeoes($id, $campeaoId);

            foreach ($jogadoresCampeoes as $jog) {
                $this->db->execute(
                    "INSERT IGNORE INTO campeonato_vencedores (campeonato_id, jogador_id, time_id, posicao) VALUES (?, ?, ?, 1)",
                    [$id, (int)$jog['jogador_id'], $campeaoId]
                );
            }
        }

        // 3. Calcula e salva prêmios individuais do campeonato
        $premios = $this->salvarPremiosCampeonato($id);

        http_response_code(200);
        echo json_encode([
            'success'             => true,
            'time_campeao_id'     => $campeaoId,
            'jogadores_registrados' => isset($jogadoresCampeoes) ? count($jogadoresCampeoes) : 0,
            'premios_calculados'  => $premios,
        ]);
    }

    // =========================================================
    // Calcula e salva os prêmios individuais do campeonato:
    // MVP, Artilheiro, Garçom, Melhor Goleiro, Melhor Zagueiro, Pé de Rato
    // =========================================================
    // Retorna os jogadores que devem receber o título:
    // somente quem jogou mais pelo time campeão do que por qualquer outro time.
    // Resolve o caso de goleiros rotativos (Alexandre, Gogo, Alex) que não são
    // fixos — cada um defende mais um time específico ao longo do camp.
    // =========================================================
    public function getJogadoresCampeoes(int $campId, int $campeaoId): array
    {
        // ── 1. Identifica goleiros do campeonato via campeonato_partidas ────────────
        // Fonte mais confiável: goleiro_timeA_id / goleiro_timeB_id são explícitos.
        $goleiros   = $this->db->fetchAll("
            SELECT DISTINCT goleiro_id FROM (
                SELECT goleiro_timeA_id AS goleiro_id FROM campeonato_partidas
                WHERE campeonato_id = ? AND status = 'finalizada' AND goleiro_timeA_id IS NOT NULL
                UNION
                SELECT goleiro_timeB_id AS goleiro_id FROM campeonato_partidas
                WHERE campeonato_id = ? AND status = 'finalizada' AND goleiro_timeB_id IS NOT NULL
            ) g
        ", [$campId, $campId]);
        $goleiroIds = array_map('intval', array_column($goleiros, 'goleiro_id'));

        // ── 2. Jogadores de linha (excluindo goleiros): usa campeonato_estatisticas_partida ──
        // Jogadores de linha são fixos por time — ep.time_id é confiável para eles.
        $excl = empty($goleiroIds)
            ? ''
            : 'AND ep.jogador_id NOT IN (' . implode(',', $goleiroIds) . ')'; // IDs vindos do próprio BD — seguro

        $jogadoresLinha = $this->db->fetchAll("
            SELECT a.jogador_id
            FROM (
                SELECT ep.jogador_id, ep.time_id, COUNT(*) AS jogos
                FROM campeonato_estatisticas_partida ep
                JOIN campeonato_partidas cp ON cp.id = ep.partida_id
                    AND cp.campeonato_id = ?
                    AND cp.status = 'finalizada'
                {$excl}
                GROUP BY ep.jogador_id, ep.time_id
            ) a
            WHERE a.time_id = ?
              AND a.jogos > COALESCE((
                  SELECT MAX(b.jogos)
                  FROM (
                      SELECT ep2.jogador_id, ep2.time_id, COUNT(*) AS jogos
                      FROM campeonato_estatisticas_partida ep2
                      JOIN campeonato_partidas cp2 ON cp2.id = ep2.partida_id
                          AND cp2.campeonato_id = ?
                          AND cp2.status = 'finalizada'
                      GROUP BY ep2.jogador_id, ep2.time_id
                  ) b
                  WHERE b.jogador_id = a.jogador_id AND b.time_id != ?
              ), 0)
        ", [$campId, $campeaoId, $campId, $campeaoId]);

        // ── 3. Goleiros: só ganham título se defenderam MAIS DE 50% das partidas do campeão ──
        // Goleiros são rotativos (não fixos por time). Regra: se o time campeão jogou N
        // partidas e o goleiro defendeu mais da metade delas, o título é dele também.
        // Ex.: campeão jogou 30, goleiro defendeu 16 (53%) → ganha. Defendeu 14 (47%) → não.
        $totalJogosCampeao = (int)$this->db->fetchOne("
            SELECT COUNT(*) AS total FROM campeonato_partidas
            WHERE campeonato_id = ? AND status = 'finalizada'
              AND (timeA_id = ? OR timeB_id = ?)
        ", [$campId, $campeaoId, $campeaoId])['total'];

        $jogadoresGoleiro = [];
        if ($totalJogosCampeao > 0) {
            foreach ($goleiroIds as $gkId) {
                $jogosDefendidos = (int)$this->db->fetchOne("
                    SELECT COUNT(*) AS total FROM campeonato_partidas
                    WHERE campeonato_id = ? AND status = 'finalizada'
                      AND ((timeA_id = ? AND goleiro_timeA_id = ?)
                        OR (timeB_id = ? AND goleiro_timeB_id = ?))
                ", [$campId, $campeaoId, $gkId, $campeaoId, $gkId])['total'];

                // Estritamente mais da metade (16 de 30 sim, 15 de 30 não)
                if ($jogosDefendidos * 2 > $totalJogosCampeao) {
                    $jogadoresGoleiro[] = ['jogador_id' => $gkId];
                }
            }
        }

        return array_merge($jogadoresLinha, $jogadoresGoleiro);
    }

    // Pode ser chamado diretamente para recálculo retroativo.
    // =========================================================
    public function salvarPremiosCampeonato(int $campId): array
    {
        // Remove prêmios anteriores (idempotente — pode rodar várias vezes)
        $this->db->execute("DELETE FROM campeonato_premios WHERE campeonato_id = ?", [$campId]);

        // Busca todos os jogadores que participaram do campeonato com seus totais
        $jogadores = $this->db->fetchAll("
            SELECT
                ep.jogador_id,
                j.nome,
                j.joga_recuado,
                SUM(ep.gols)         AS gols,
                SUM(ep.assistencias) AS assists,
                SUM(ep.clean_sheet)  AS clean_sheets,
                SUM(CASE WHEN (ep.time_id = cp.timeA_id AND cp.placar_timeA > cp.placar_timeB)
                              OR (ep.time_id = cp.timeB_id AND cp.placar_timeB > cp.placar_timeA)
                         THEN 1 ELSE 0 END) AS vitorias,
                SUM(CASE WHEN cp.placar_timeA = cp.placar_timeB THEN 1 ELSE 0 END) AS empates,
                SUM(CASE WHEN (ep.time_id = cp.timeA_id AND cp.placar_timeA < cp.placar_timeB)
                              OR (ep.time_id = cp.timeB_id AND cp.placar_timeB < cp.placar_timeA)
                         THEN 1 ELSE 0 END) AS derrotas,
                COUNT(DISTINCT ep.partida_id) AS jogos,
                MAX(CASE WHEN cp.goleiro_timeA_id = ep.jogador_id
                           OR cp.goleiro_timeB_id = ep.jogador_id THEN 1 ELSE 0 END) AS is_goleiro
            FROM campeonato_estatisticas_partida ep
            JOIN campeonato_partidas cp ON cp.id = ep.partida_id
                AND cp.campeonato_id = ?
                AND cp.status = 'finalizada'
            JOIN jogadores j ON j.id = ep.jogador_id
            GROUP BY ep.jogador_id, j.nome, j.joga_recuado
        ", [$campId]);

        if (empty($jogadores)) return [];

        // Calcula pontuação total de cada jogador no campeonato
        $pontuados = [];
        foreach ($jogadores as $j) {
            $gols    = (int)$j['gols'];
            $assists = (int)$j['assists'];
            $cs      = (int)$j['clean_sheets'];
            $v       = (int)$j['vitorias'];
            $e       = (int)$j['empates'];
            $d       = (int)$j['derrotas'];
            $isRec   = (int)$j['joga_recuado'] === 1;
            $isGol   = (int)$j['is_goleiro'] > 0;

            if ($isGol || $isRec) {
                $pts = Pontos::calcularJogadorRecuado($cs, $v, $e, $d);
            } else {
                $pts = Pontos::calcularJogadorLinha($gols, $assists, 0, $v, $e, $d);
            }

            $pontuados[] = [
                'jogador_id' => (int)$j['jogador_id'],
                'nome'       => $j['nome'],
                'pts'        => $pts,
                'gols'       => $gols,
                'assists'    => $assists,
                'cs'         => $cs,
                'jogos'      => (int)$j['jogos'],
                'is_goleiro' => $isGol,
                'is_recuado' => $isRec,
            ];
        }

        $inseridos = [];

        // Helper: insere prêmio para o(s) melhor(es) empatados no topo
        $insertTied = function (array $lista, string $tipo, string $campo, bool $asc = false) use ($campId, &$inseridos) {
            if (empty($lista)) return;
            usort($lista, fn($a, $b) => $asc ? ($a[$campo] <=> $b[$campo]) : ($b[$campo] <=> $a[$campo]));
            $topVal = $lista[0][$campo];
            foreach ($lista as $p) {
                if ($p[$campo] != $topVal) break;
                $this->db->execute(
                    "INSERT IGNORE INTO campeonato_premios (campeonato_id, jogador_id, tipo_premio, valor) VALUES (?, ?, ?, ?)",
                    [$campId, $p['jogador_id'], $tipo, $p[$campo]]
                );
                $inseridos[] = ['tipo' => $tipo, 'jogador' => $p['nome'], 'valor' => $p[$campo]];
            }
        };

        // ── MVP do Campeonato (maior pontuação — jogadores de linha) ──
        $linha = array_values(array_filter($pontuados, fn($p) => !$p['is_goleiro']));
        $insertTied($linha, 'mvp', 'pts');

        // ── Artilheiro do Campeonato ──
        $artilheiros = array_values(array_filter($pontuados, fn($p) => $p['gols'] > 0));
        $insertTied($artilheiros, 'artilheiro', 'gols');

        // ── Garçom do Campeonato ──
        $garcons = array_values(array_filter($pontuados, fn($p) => $p['assists'] > 0));
        $insertTied($garcons, 'garcom', 'assists');

        // ── Melhor Goleiro do Campeonato ──
        $goleiros = array_values(array_filter($pontuados, fn($p) => $p['is_goleiro']));
        $insertTied($goleiros, 'melhor_goleiro', 'pts');

        // ── Melhor Zagueiro do Campeonato ──
        $recuados = array_values(array_filter($pontuados, fn($p) => $p['is_recuado'] && !$p['is_goleiro']));
        $insertTied($recuados, 'melhor_zagueiro', 'pts');

        // ── Pé de Rato do Campeonato (menor pontuação entre jogadores de linha, mín. 2 jogos) ──
        $linhaMin2 = array_values(array_filter($linha, fn($p) => !$p['is_recuado'] && $p['jogos'] >= 2));
        if (count($linhaMin2) > 1) {
            $insertTied($linhaMin2, 'pe_de_rato', 'pts', true); // asc = menor pts
        }

        return $inseridos;
    }

    // =========================================================
    // POST /campeonatos/:id/foto-campeao
    // =========================================================
    public function fotoCampeao(int $id): void
    {
        $this->getCampeonatoOr404($id);

        if (empty($_FILES['foto'])) {
            throw new HttpError('Nenhum arquivo enviado.', 400);
        }

        require_once __DIR__ . '/../utils/S3Client.php';
        $url = S3Client::upload($_FILES['foto'], 'campeonatos');

        $this->db->execute(
            "UPDATE campeonatos SET foto_campiao_url = ? WHERE id = ?",
            [$url, $id]
        );

        http_response_code(200);
        echo json_encode(['url' => $url]);
    }

    // =========================================================
    // GET /campeonatos/:id/classificacao?rodada=<id>
    // =========================================================
    public function classificacao(int $id): void
    {
        $this->getCampeonatoOr404($id);
        $rodadaId = isset($_GET['rodada']) && is_numeric($_GET['rodada'])
            ? (int)$_GET['rodada'] : null;

        http_response_code(200);
        echo json_encode($this->calcularClassificacao($id, $rodadaId), JSON_UNESCAPED_UNICODE);
    }

    // =========================================================
    // GET /campeonatos/:id/rivalidades
    // =========================================================
    public function rivalidades(int $id): void
    {
        $this->getCampeonatoOr404($id);

        // Rivalidades entre times (head-to-head de todas as partidas finalizadas)
        $rivalidades = $this->db->fetchAll("
            SELECT
                ta.nome     AS capitaoA_nome,
                ta.logo_url AS capitaoA_foto,
                tb.nome     AS capitaoB_nome,
                tb.logo_url AS capitaoB_foto,
                COUNT(*)    AS total_jogos,
                SUM(CASE WHEN cp.placar_timeA > cp.placar_timeB THEN 1 ELSE 0 END) AS vitoriasA,
                SUM(CASE WHEN cp.placar_timeB > cp.placar_timeA THEN 1 ELSE 0 END) AS vitoriasB,
                SUM(CASE WHEN cp.placar_timeA = cp.placar_timeB THEN 1 ELSE 0 END) AS empates,
                SUM(cp.placar_timeA) AS golsA,
                SUM(cp.placar_timeB) AS golsB
            FROM campeonato_partidas cp
            JOIN times ta ON ta.id = cp.timeA_id
            JOIN times tb ON tb.id = cp.timeB_id
            WHERE cp.campeonato_id = ? AND cp.status = 'finalizada'
            GROUP BY cp.timeA_id, cp.timeB_id, ta.nome, ta.logo_url, tb.nome, tb.logo_url
            ORDER BY COUNT(*) DESC
        ", [$id]);

        http_response_code(200);
        echo json_encode($rivalidades, JSON_UNESCAPED_UNICODE);
    }

    // =========================================================
    // GET /campeonatos/:id/estatisticas-jogadores
    // =========================================================
    public function estatisticasJogadores(int $id): void
    {
        $this->getCampeonatoOr404($id);

        // Tenta buscar da tabela de estatísticas; fallback para elencos sem stats
        $stats = $this->db->fetchAll("
            SELECT
                j.id   AS jogador_id,
                j.nome,
                j.foto_url,
                t.nome AS time_nome,
                COALESCE(SUM(ep.gols), 0)         AS total_gols,
                COALESCE(SUM(ep.assistencias), 0)  AS total_assistencias
            FROM campeonato_times ct
            JOIN times t ON t.id = ct.time_id
            JOIN time_jogadores tj ON tj.time_id = t.id
            JOIN jogadores j ON j.id = tj.jogador_id
            LEFT JOIN campeonato_estatisticas_partida ep
                ON ep.jogador_id = j.id AND ep.campeonato_id = ct.campeonato_id
            WHERE ct.campeonato_id = ?
            GROUP BY j.id, t.id
            ORDER BY total_gols DESC, total_assistencias DESC
        ", [$id]);

        http_response_code(200);
        echo json_encode($stats, JSON_UNESCAPED_UNICODE);
    }

    // =========================================================
    // GET /campeonatos/:id/stats-avancadas
    // =========================================================
    public function statsAvancadas(int $id): void
    {
        $this->getCampeonatoOr404($id);
        $rodadaId = isset($_GET['rodada_id']) ? (int)$_GET['rodada_id'] : null;

        // ── Usa StatsService como source of truth para pontuação ──
        $stats = new StatsService($this->db);

        // Jogadores de linha (usa Pontos::sqlPontosPartida)
        $jogadores = $stats->getJogadoresLinhaRanking($id, $rodadaId);

        // Goleiros (usa fórmula CS + V/E/D)
        $goleiros = $stats->getGoleirosRankingCampeonato($id, $rodadaId);

        // Algoz e vítima de cada goleiro
        foreach ($goleiros as &$g) {
            $av = $stats->getGoleiroAlgozVitima($id, (int)$g['id']);
            $g['algoz']  = $av['algoz'];
            $g['vitima'] = $av['vitima'];
        }
        unset($g);

        $linha = array_values($jogadores);

        $timesTotais = $this->db->fetchAll("
            SELECT
                t.id, t.nome, t.logo_url,
                COUNT(DISTINCT cp.id) AS jogos,
                SUM(CASE
                    WHEN (cp.timeA_id = t.id AND cp.placar_timeA > cp.placar_timeB)
                      OR (cp.timeB_id = t.id AND cp.placar_timeB > cp.placar_timeA) THEN 1 ELSE 0
                END) AS vitorias,
                SUM(CASE WHEN cp.placar_timeA = cp.placar_timeB THEN 1 ELSE 0 END) AS empates,
                SUM(CASE
                    WHEN (cp.timeA_id = t.id AND cp.placar_timeA < cp.placar_timeB)
                      OR (cp.timeB_id = t.id AND cp.placar_timeB < cp.placar_timeA) THEN 1 ELSE 0
                END) AS derrotas,
                COALESCE(SUM(CASE WHEN cp.timeA_id = t.id THEN cp.placar_timeA ELSE cp.placar_timeB END), 0) AS gp,
                COALESCE(SUM(CASE WHEN cp.timeA_id = t.id THEN cp.placar_timeB ELSE cp.placar_timeA END), 0) AS gc
            FROM campeonato_times ct
            JOIN times t ON t.id = ct.time_id
            LEFT JOIN campeonato_partidas cp
                ON (cp.timeA_id = t.id OR cp.timeB_id = t.id)
               AND cp.campeonato_id = ? AND cp.status = 'finalizada'
            WHERE ct.campeonato_id = ?
            GROUP BY t.id
        ", [$id, $id]);

        // ── Zagueiros (jogadores recuados) — via StatsService ──
        $zagueiros = $stats->getZagueirosRanking($id, $rodadaId);

        // ── Confrontos entre times (head-to-head) ──
        $confrontosTimes = $this->db->fetchAll("
            SELECT
                cp.timeA_id, ta.nome AS timeA_nome, ta.logo_url AS timeA_logo,
                cp.timeB_id, tb.nome AS timeB_nome, tb.logo_url AS timeB_logo,
                SUM(CASE WHEN cp.placar_timeA > cp.placar_timeB THEN 1 ELSE 0 END) AS vitoriasA,
                SUM(CASE WHEN cp.placar_timeB > cp.placar_timeA THEN 1 ELSE 0 END) AS vitoriasB,
                SUM(CASE WHEN cp.placar_timeA = cp.placar_timeB THEN 1 ELSE 0 END) AS empates,
                SUM(cp.placar_timeA) AS golsA,
                SUM(cp.placar_timeB) AS golsB
            FROM campeonato_partidas cp
            JOIN times ta ON ta.id = cp.timeA_id
            JOIN times tb ON tb.id = cp.timeB_id
            WHERE cp.campeonato_id = ? AND cp.status = 'finalizada'
            GROUP BY cp.timeA_id, cp.timeB_id, ta.nome, ta.logo_url, tb.nome, tb.logo_url
            ORDER BY (SUM(CASE WHEN cp.placar_timeA > cp.placar_timeB THEN 1 ELSE 0 END)
                    + SUM(CASE WHEN cp.placar_timeB > cp.placar_timeA THEN 1 ELSE 0 END)
                    + SUM(CASE WHEN cp.placar_timeA = cp.placar_timeB THEN 1 ELSE 0 END)) DESC
        ", [$id]);

        http_response_code(200);
        echo json_encode([
            'jogadores'        => $linha,
            'goleiros'         => $goleiros,
            'zagueiros'        => $zagueiros,
            'times'            => ['totais' => array_values($timesTotais), 'rivalidades' => []],
            'confrontos_times' => $confrontosTimes,
        ], JSON_UNESCAPED_UNICODE);
    }

    // =========================================================
    // FASE DE GRUPOS
    // =========================================================

    public function faseGruposPartidas(int $id): void
    {
        $this->getCampeonatoOr404($id);

        $partidas = $this->db->fetchAll("
            SELECT
                cp.id, cp.campeonato_id,
                cp.timeA_id AS time_a_id, ta.nome AS time_a_nome, ta.logo_url AS time_a_logo,
                cp.timeB_id AS time_b_id, tb.nome AS time_b_nome, tb.logo_url AS time_b_logo,
                cp.placar_timeA AS placar_time_a,
                cp.placar_timeB AS placar_time_b,
                cp.status, cp.ordem_jogo
            FROM campeonato_partidas cp
            JOIN times ta ON ta.id = cp.timeA_id
            JOIN times tb ON tb.id = cp.timeB_id
            WHERE cp.campeonato_id = ? AND cp.fase = 'fase_de_grupos'
            ORDER BY cp.ordem_jogo ASC, cp.id ASC
        ", [$id]);

        http_response_code(200);
        echo json_encode($partidas, JSON_UNESCAPED_UNICODE);
    }

    public function faseGruposIniciar(int $id): void
    {
        $camp = $this->getCampeonatoOr404($id);

        $existentes = $this->db->fetchOne(
            "SELECT COUNT(*) AS total FROM campeonato_partidas WHERE campeonato_id = ? AND fase = 'fase_de_grupos'",
            [$id]
        );
        if ((int)$existentes['total'] > 0) {
            throw new HttpError('Fase de grupos já foi iniciada.', 409);
        }

        $times = $this->db->fetchAll(
            "SELECT time_id FROM campeonato_times WHERE campeonato_id = ? ORDER BY time_id ASC",
            [$id]
        );
        $timeIds = array_column($times, 'time_id');

        if (count($timeIds) < 2) throw new HttpError('Inscreva pelo menos 2 times.', 400);

        $idaEVolta = (int)($camp['fase_grupos_ida_volta'] ?? 0) === 1;
        $partidas  = $this->gerarRoundRobin($timeIds, $idaEVolta);
        $ordem     = 1;

        foreach ($partidas as $p) {
            $this->db->execute("
                INSERT INTO campeonato_partidas
                    (campeonato_id, timeA_id, timeB_id, fase, status, ordem_jogo)
                VALUES (?, ?, ?, 'fase_de_grupos', 'pendente', ?)
            ", [$id, $p[0], $p[1], $ordem++]);
        }

        $this->db->execute(
            "UPDATE campeonatos SET fase_atual = 'fase_de_grupos' WHERE id = ?",
            [$id]
        );

        http_response_code(201);
        echo json_encode(['success' => true, 'total_partidas' => count($partidas)]);
    }

    public function faseGruposClassificacao(int $id): void
    {
        $this->getCampeonatoOr404($id);
        http_response_code(200);
        echo json_encode($this->calcularClassificacao($id), JSON_UNESCAPED_UNICODE);
    }

    public function faseGruposFinalizar(int $id): void
    {
        $camp = $this->getCampeonatoOr404($id);

        $pendentes = $this->db->fetchOne("
            SELECT COUNT(*) AS total FROM campeonato_partidas
            WHERE campeonato_id = ? AND fase = 'fase_de_grupos' AND status != 'finalizada'
        ", [$id]);

        if ((int)$pendentes['total'] > 0) {
            throw new HttpError('Finalize todas as partidas da fase de grupos primeiro.', 400);
        }

        $classificacao = $this->calcularClassificacao($id);
        $timeIds       = array_column($classificacao, 'time_id');
        $formato       = $camp['formato'] ?? '';
        $temRepescagem = (int)($camp['tem_repescagem'] ?? 0) === 1;

        $this->gerarMataMata($id, $timeIds, $formato, $temRepescagem);

        $this->db->execute(
            "UPDATE campeonatos SET fase_atual = 'mata_mata' WHERE id = ?",
            [$id]
        );

        http_response_code(200);
        echo json_encode(['success' => true, 'fase_atual' => 'mata_mata']);
    }

    // =========================================================
    // MATA-MATA BRACKET
    // =========================================================

    public function mataMatabracket(int $id): void
    {
        $camp = $this->getCampeonatoOr404($id);

        $partidas = $this->db->fetchAll("
            SELECT
                cp.id, cp.fase_mata_mata, cp.bracket, cp.ordem_confronto, cp.status,
                cp.placar_timeA, cp.placar_timeB,
                cp.placar_penaltis_timeA, cp.placar_penaltis_timeB,
                cp.timeA_id, ta.nome AS timeA_nome, ta.logo_url AS timeA_logo,
                cp.timeB_id, tb.nome AS timeB_nome, tb.logo_url AS timeB_logo
            FROM campeonato_partidas cp
            LEFT JOIN times ta ON ta.id = cp.timeA_id
            LEFT JOIN times tb ON tb.id = cp.timeB_id
            WHERE cp.campeonato_id = ? AND cp.fase = 'mata_mata'
            ORDER BY cp.ordem_confronto ASC, cp.id ASC
        ", [$id]);

        $upper = []; $lower = []; $grandFinal = null; $terceiroLugar = null;

        foreach ($partidas as $p) {
            if ($p['fase_mata_mata'] === 'terceiro_lugar') { $terceiroLugar = $p; continue; }
            if ($p['fase_mata_mata'] === 'grand_final')    { $grandFinal    = $p; continue; }

            $bracket = strtolower($p['bracket'] ?? 'upper');
            if ($bracket === 'lower') {
                $lower[$p['fase_mata_mata']][] = $p;
            } else {
                $upper[$p['fase_mata_mata']][] = $p;
            }
        }

        if (!$grandFinal && !empty($upper['final'])) {
            $grandFinal = $upper['final'][0];
            unset($upper['final']);
        }

        http_response_code(200);
        echo json_encode([
            'campeonato' => [
                'id'                 => (int)$camp['id'],
                'nome'               => $camp['nome'],
                'tem_repescagem'     => (bool)$camp['tem_repescagem'],
                'tem_terceiro_lugar' => (bool)$camp['tem_terceiro_lugar'],
            ],
            'bracket' => [
                'upper'          => $upper,
                'lower'          => $lower,
                'grand_final'    => $grandFinal,
                'terceiro_lugar' => $terceiroLugar,
            ],
        ], JSON_UNESCAPED_UNICODE);
    }

    // =========================================================
    // SORTEIO
    // =========================================================

    public function criarTimesSorteio(int $id): void
    {
        $this->getCampeonatoOr404($id);
        $input = $this->json();

        if (empty($input['times']) || !is_array($input['times'])) {
            throw new HttpError('Payload times[] é obrigatório.', 400);
        }

        $timesConfig = [
            ['nome' => 'Time Amarelo', 'logo_url' => '/assets/Amarelo.webp'],
            ['nome' => 'Time Verde',   'logo_url' => '/assets/Verde.png'],
            ['nome' => 'Time Azul',    'logo_url' => '/assets/Azul.webp'],
            ['nome' => 'Time Rosa',    'logo_url' => '/assets/Rosa.webp'],
            ['nome' => 'Time 5',       'logo_url' => null],
        ];

        foreach ($input['times'] as $idx => $timeSorteado) {
            $cfg     = $timesConfig[$idx] ?? ['nome' => "Time " . ($idx + 1), 'logo_url' => null];
            $nome    = $timeSorteado['nome'] ?? $cfg['nome'];
            $logoUrl = $cfg['logo_url'];

            $existing = $this->db->fetchOne("SELECT id FROM times WHERE nome = ?", [$nome]);
            if ($existing) {
                $timeId = (int)$existing['id'];
            } else {
                $this->db->execute(
                    "INSERT INTO times (nome, logo_url) VALUES (?, ?)",
                    [$nome, $logoUrl]
                );
                $timeId = (int)$this->db->lastInsertId();
            }

            $jaInscrito = $this->db->fetchOne(
                "SELECT campeonato_id FROM campeonato_times WHERE campeonato_id = ? AND time_id = ?",
                [$id, $timeId]
            );
            if (!$jaInscrito) {
                $this->db->execute(
                    "INSERT INTO campeonato_times (campeonato_id, time_id) VALUES (?, ?)",
                    [$id, $timeId]
                );
            }

            foreach ($timeSorteado['jogadores'] ?? [] as $jSorteado) {
                $jogadorId = null;

                if (!empty($jSorteado['id'])) {
                    $j = $this->db->fetchOne("SELECT id FROM jogadores WHERE id = ?", [$jSorteado['id']]);
                    if ($j) $jogadorId = (int)$j['id'];
                }

                if (!$jogadorId && !empty($jSorteado['nome'])) {
                    $j = $this->db->fetchOne(
                        "SELECT id FROM jogadores WHERE LOWER(nome) = LOWER(?)",
                        [$jSorteado['nome']]
                    );
                    if ($j) {
                        $jogadorId = (int)$j['id'];
                    } else {
                        $this->db->execute(
                            "INSERT INTO jogadores (nome, nivel, posicao) VALUES (?, ?, 'linha')",
                            [$jSorteado['nome'], $jSorteado['nota'] ?? 5]
                        );
                        $jogadorId = (int)$this->db->lastInsertId();
                    }
                }

                if (!$jogadorId) continue;

                $jExisting = $this->db->fetchOne(
                    "SELECT time_id FROM time_jogadores WHERE time_id = ? AND jogador_id = ?",
                    [$timeId, $jogadorId]
                );
                if (!$jExisting) {
                    $this->db->execute(
                        "INSERT INTO time_jogadores (time_id, jogador_id) VALUES (?, ?)",
                        [$timeId, $jogadorId]
                    );
                }

                $eExisting = $this->db->fetchOne(
                    "SELECT id FROM campeonato_elencos WHERE campeonato_id = ? AND time_id = ? AND jogador_id = ?",
                    [$id, $timeId, $jogadorId]
                );
                if (!$eExisting) {
                    $this->db->execute(
                        "INSERT INTO campeonato_elencos (campeonato_id, time_id, jogador_id) VALUES (?, ?, ?)",
                        [$id, $timeId, $jogadorId]
                    );
                }
            }
        }

        http_response_code(201);
        echo json_encode(['success' => true]);
    }

    public function syncJogadoresPorNomes(): void
    {
        $input = $this->json();
        $nomes = $input['nomes'] ?? [];

        if (empty($nomes)) throw new HttpError('nomes[] é obrigatório.', 400);

        $encontrados = []; $novos = 0; $existentes = 0;

        foreach ($nomes as $nome) {
            $nome = trim($nome);
            if (!$nome) continue;

            $jogador = $this->db->fetchOne(
                "SELECT id, nome, nivel, foto_url, posicao, joga_recuado FROM jogadores WHERE LOWER(nome) = LOWER(?)",
                [$nome]
            );

            if ($jogador) {
                $encontrados[] = $jogador;
                $existentes++;
            } else {
                $this->db->execute(
                    "INSERT INTO jogadores (nome, nivel, posicao) VALUES (?, 5, 'linha')",
                    [$nome]
                );
                $encontrados[] = [
                    'id' => (int)$this->db->lastInsertId(),
                    'nome' => $nome, 'nivel' => 5,
                    'foto_url' => null, 'posicao' => 'linha', 'joga_recuado' => false,
                ];
                $novos++;
            }
        }

        http_response_code(200);
        echo json_encode([
            'jogadores'  => $encontrados,
            'novos'      => $novos,
            'existentes' => $existentes,
        ], JSON_UNESCAPED_UNICODE);
    }

    // =========================================================
    // HELPERS PRIVADOS
    // =========================================================

    private function getCampeonatoOr404(int $id): array
    {
        $camp = $this->db->fetchOne("
            SELECT c.*, t.nome AS time_campeao_nome, t.logo_url AS time_campeao_logo
            FROM campeonatos c
            LEFT JOIN times t ON t.id = c.time_campeao_id
            WHERE c.id = ?
        ", [$id]);

        if (!$camp) throw new HttpError('Campeonato não encontrado.', 404);
        return $camp;
    }

    private function formatCampeonato(array $c): array
    {
        return [
            'id'                    => (int)$c['id'],
            'nome'                  => $c['nome'],
            'data'                  => $c['data'],
            'data_fim'              => $c['data_fim'] ?? null,
            'total_rodadas'         => (int)($c['total_rodadas'] ?? 0),
            'rodadas_completas'     => (int)($c['rodadas_completas'] ?? 0),
            'formato'               => $c['formato'],
            'fase_atual'            => $c['fase_atual'],
            'num_times'             => (int)($c['num_times'] ?? 4),
            'tem_fase_grupos'       => (bool)($c['tem_fase_grupos'] ?? false),
            'fase_grupos_ida_volta' => (bool)($c['fase_grupos_ida_volta'] ?? false),
            'tem_repescagem'        => (bool)($c['tem_repescagem'] ?? false),
            'tem_terceiro_lugar'    => (bool)($c['tem_terceiro_lugar'] ?? false),
            'modo_selecao_times'    => $c['modo_selecao_times'] ?? 'sorteio',
            'status'                => $c['status'] ?? 'aberto',
            'time_campeao_id'       => $c['time_campeao_id'] ? (int)$c['time_campeao_id'] : null,
            'time_campeao_nome'     => $c['time_campeao_nome'] ?? null,
            'time_campeao_logo'     => $c['time_campeao_logo'] ?? null,
            'foto_campiao_url'      => $c['foto_campiao_url'] ?? null,
            'total_times_inscritos' => (int)($c['total_times_inscritos'] ?? 0),
        ];
    }

    private function calcularClassificacao(int $campeonatoId, ?int $rodadaId = null): array
    {
        $whereRodada = $rodadaId ? "AND cp.rodada_id <= {$rodadaId}" : '';
        $pV = Pontos::VITORIAS;
        $pE = Pontos::EMPATES;

        $rows = $this->db->fetchAll("
            SELECT
                t.id AS time_id, t.nome, t.logo_url,
                COALESCE(SUM(CASE
                    WHEN (cp.timeA_id = t.id AND cp.placar_timeA > cp.placar_timeB)
                      OR (cp.timeB_id = t.id AND cp.placar_timeB > cp.placar_timeA) THEN {$pV}
                    WHEN cp.placar_timeA IS NOT NULL AND cp.placar_timeA = cp.placar_timeB THEN {$pE}
                    ELSE 0
                END), 0) AS pontos,
                COUNT(cp.id) AS jogos,
                COALESCE(SUM(CASE
                    WHEN (cp.timeA_id = t.id AND cp.placar_timeA > cp.placar_timeB)
                      OR (cp.timeB_id = t.id AND cp.placar_timeB > cp.placar_timeA) THEN 1 ELSE 0
                END), 0) AS vitorias,
                COALESCE(SUM(CASE
                    WHEN cp.placar_timeA IS NOT NULL AND cp.placar_timeA = cp.placar_timeB THEN 1 ELSE 0
                END), 0) AS empates,
                COALESCE(SUM(CASE
                    WHEN (cp.timeA_id = t.id AND cp.placar_timeA < cp.placar_timeB)
                      OR (cp.timeB_id = t.id AND cp.placar_timeB < cp.placar_timeA) THEN 1 ELSE 0
                END), 0) AS derrotas,
                COALESCE(SUM(CASE WHEN cp.timeA_id = t.id THEN cp.placar_timeA ELSE cp.placar_timeB END), 0) AS gols_pro,
                COALESCE(SUM(CASE WHEN cp.timeA_id = t.id THEN cp.placar_timeB ELSE cp.placar_timeA END), 0) AS gols_contra
            FROM campeonato_times ct
            JOIN times t ON t.id = ct.time_id
            LEFT JOIN campeonato_partidas cp
                ON (cp.timeA_id = t.id OR cp.timeB_id = t.id)
               AND cp.campeonato_id = ct.campeonato_id
               AND cp.status = 'finalizada'
               {$whereRodada}
            WHERE ct.campeonato_id = ?
            GROUP BY t.id
            ORDER BY pontos DESC, vitorias DESC,
                (COALESCE(SUM(CASE WHEN cp.timeA_id = t.id THEN cp.placar_timeA ELSE cp.placar_timeB END), 0)
                 - COALESCE(SUM(CASE WHEN cp.timeA_id = t.id THEN cp.placar_timeB ELSE cp.placar_timeA END), 0)) DESC,
                COALESCE(SUM(CASE WHEN cp.timeA_id = t.id THEN cp.placar_timeA ELSE cp.placar_timeB END), 0) DESC,
                t.nome ASC
        ", [$campeonatoId]);

        return array_values(array_map(function ($r, $idx) {
            $saldo = (int)$r['gols_pro'] - (int)$r['gols_contra'];
            $jogos = (int)$r['jogos'];
            return [
                'posicao'        => $idx + 1,
                'time_id'        => (int)$r['time_id'],
                'nome'           => $r['nome'],
                'logo_url'       => $r['logo_url'],
                'pontos'         => (int)$r['pontos'],
                'jogos'          => $jogos,
                'vitorias'       => (int)$r['vitorias'],
                'empates'        => (int)$r['empates'],
                'derrotas'       => (int)$r['derrotas'],
                'gols_pro'       => (int)$r['gols_pro'],
                'gols_contra'    => (int)$r['gols_contra'],
                'saldo_gols'     => $saldo,
                'aproveitamento' => $jogos > 0 ? round(((int)$r['pontos'] / ($jogos * Pontos::VITORIAS)) * 100, 1) : 0,
            ];
        }, $rows, array_keys($rows)));
    }

    private function gerarRoundRobin(array $times, bool $idaEVolta = false): array
    {
        $partidas = [];
        $n        = count($times);
        for ($i = 0; $i < $n; $i++) {
            for ($j = $i + 1; $j < $n; $j++) {
                $partidas[] = [$times[$i], $times[$j]];
                if ($idaEVolta) $partidas[] = [$times[$j], $times[$i]];
            }
        }
        return $this->distribuirPartidas($partidas);
    }

    private function distribuirPartidas(array $partidas): array
    {
        if (count($partidas) <= 2) return $partidas;

        $resultado = []; $restantes = $partidas; $ultimosTimes = [];

        while (!empty($restantes)) {
            $melhor = null; $melhorIdx = -1;
            foreach ($restantes as $idx => $p) {
                if (!in_array($p[0], $ultimosTimes) && !in_array($p[1], $ultimosTimes)) {
                    $melhor = $p; $melhorIdx = $idx; break;
                }
            }
            if ($melhor === null) { $melhor = $restantes[0]; $melhorIdx = 0; }

            $resultado[]  = $melhor;
            $ultimosTimes = [$melhor[0], $melhor[1]];
            array_splice($restantes, $melhorIdx, 1);
        }
        return $resultado;
    }

    private function gerarMataMata(int $campeonatoId, array $timeIds, string $formato, bool $temRepescagem): void
    {
        // Remove partidas de mata-mata pendentes anteriores para evitar duplicatas
        $this->db->execute(
            "DELETE FROM campeonato_partidas WHERE campeonato_id = ? AND fase = 'mata_mata' AND status = 'pendente'",
            [$campeonatoId]
        );

        preg_match('/copa_\d+_(.+)/', $formato, $matches);
        $tipoMata = $matches[1] ?? 'semi_final';
        $n        = count($timeIds);

        if ($temRepescagem && $n >= 4) {
            $this->inserirPartidaMata($campeonatoId, $timeIds[0], $timeIds[1], 'semifinal',  'upper', 1);
            $this->inserirPartidaMata($campeonatoId, $timeIds[2], $timeIds[3], 'lower_r1',   'lower', 1);
            $this->inserirPartidaMata($campeonatoId, null,        null,        'lower_r2',   'lower', 2);
            $this->inserirPartidaMata($campeonatoId, null,        null,        'grand_final','upper', 3);
            return;
        }

        if ($n === 4) {
            if ($tipoMata === 'direto_final') {
                $this->inserirPartidaMata($campeonatoId, $timeIds[0], $timeIds[1], 'final', 'upper', 1);
            } elseif ($tipoMata === 'semi_final') {
                // 4º eliminado, 1º direto final, 2º vs 3º semi
                $this->inserirPartidaMata($campeonatoId, $timeIds[1], $timeIds[2], 'semifinal', 'upper', 1);
                $this->inserirPartidaMata($campeonatoId, $timeIds[0], null,        'final',     'upper', 2);
            } else {
                // semi_classica: 1x4, 2x3
                $this->inserirPartidaMata($campeonatoId, $timeIds[0], $timeIds[3], 'semifinal', 'upper', 1);
                $this->inserirPartidaMata($campeonatoId, $timeIds[1], $timeIds[2], 'semifinal', 'upper', 2);
                $this->inserirPartidaMata($campeonatoId, null,        null,        'final',     'upper', 3);
            }
        } elseif ($n === 5) {
            // 5º eliminado, semis: 1x4, 2x3
            $this->inserirPartidaMata($campeonatoId, $timeIds[0], $timeIds[3], 'semifinal', 'upper', 1);
            $this->inserirPartidaMata($campeonatoId, $timeIds[1], $timeIds[2], 'semifinal', 'upper', 2);
            $this->inserirPartidaMata($campeonatoId, null,        null,        'final',     'upper', 3);
        } elseif ($n >= 6) {
            $confrontos = $n >= 8
                ? [[0,7],[1,6],[2,5],[3,4]]
                : [[0,$n-1],[1,$n-2]];

            foreach ($confrontos as $i => [$a, $b]) {
                $this->inserirPartidaMata($campeonatoId, $timeIds[$a] ?? null, $timeIds[$b] ?? null, 'quartas', 'upper', $i + 1);
            }
            $base = count($confrontos) + 1;
            $this->inserirPartidaMata($campeonatoId, null, null, 'semifinal', 'upper', $base);
            $this->inserirPartidaMata($campeonatoId, null, null, 'semifinal', 'upper', $base + 1);
            $this->inserirPartidaMata($campeonatoId, null, null, 'final',     'upper', $base + 2);
        }
    }

    private function inserirPartidaMata(int $campeonatoId, ?int $timeA, ?int $timeB, string $fase, string $bracket, int $ordem): void
    {
        $this->db->execute("
            INSERT IGNORE INTO campeonato_partidas
                (campeonato_id, timeA_id, timeB_id, fase, fase_mata_mata, bracket, ordem_confronto, status)
            VALUES (?, ?, ?, 'mata_mata', ?, ?, ?, 'pendente')
        ", [$campeonatoId, $timeA, $timeB, $fase, $bracket, $ordem]);
    }

    // =========================================================
    // GET /campeonatos/:id/elenco
    // Lista o elenco completo de todos os times do campeonato
    // =========================================================
    public function elencoCompleto(int $id): void
    {
        $this->getCampeonatoOr404($id);

        $rows = $this->db->fetchAll("
            SELECT ce.id, ce.campeonato_id, ce.time_id, ce.jogador_id,
                   ce.is_capitao, ce.is_pe_de_rato,
                   t.nome AS time_nome, t.logo_url AS time_logo,
                   j.nome AS jogador_nome, j.posicao, j.foto_url, j.avatar_url, j.nivel
            FROM campeonato_elencos ce
            JOIN times t ON t.id = ce.time_id
            JOIN jogadores j ON j.id = ce.jogador_id
            WHERE ce.campeonato_id = ?
            ORDER BY t.nome ASC, j.nome ASC
        ", [$id]);

        // Agrupa por time
        $times = [];
        foreach ($rows as $r) {
            $tid = (int)$r['time_id'];
            if (!isset($times[$tid])) {
                $times[$tid] = [
                    'time_id' => $tid,
                    'time_nome' => $r['time_nome'],
                    'time_logo' => $r['time_logo'],
                    'jogadores' => [],
                ];
            }
            $times[$tid]['jogadores'][] = [
                'id' => (int)$r['jogador_id'],
                'nome' => $r['jogador_nome'],
                'posicao' => $r['posicao'],
                'foto_url' => $r['foto_url'],
                'avatar_url' => $r['avatar_url'],
                'nivel' => (int)$r['nivel'],
                'is_capitao' => (bool)$r['is_capitao'],
                'is_pe_de_rato' => (bool)$r['is_pe_de_rato'],
                'elenco_id' => (int)$r['id'],
            ];
        }

        http_response_code(200);
        echo json_encode(array_values($times), JSON_UNESCAPED_UNICODE);
    }

    // =========================================================
    // POST /campeonatos/:id/elenco/adicionar
    // Adiciona um jogador ao elenco de um time no campeonato
    // (sem remover os existentes — para substituição mid-season)
    // =========================================================
    public function adicionarJogadorElenco(int $id): void
    {
        $this->getCampeonatoOr404($id);
        $input = $this->json();
        $timeId    = (int)($input['time_id'] ?? 0);
        $jogadorId = (int)($input['jogador_id'] ?? 0);

        if (!$timeId)    throw new HttpError('time_id é obrigatório.', 400);
        if (!$jogadorId) throw new HttpError('jogador_id é obrigatório.', 400);

        // Verifica se o time está inscrito no campeonato
        $timeInscrito = $this->db->fetchOne(
            "SELECT time_id FROM campeonato_times WHERE campeonato_id = ? AND time_id = ?",
            [$id, $timeId]
        );
        if (!$timeInscrito) throw new HttpError('Time não está inscrito neste campeonato.', 404);

        // Verifica se o jogador existe
        $jogador = $this->db->fetchOne("SELECT id, nome FROM jogadores WHERE id = ?", [$jogadorId]);
        if (!$jogador) throw new HttpError('Jogador não encontrado.', 404);

        // Verifica se já está no elenco deste time neste campeonato
        $jaExiste = $this->db->fetchOne(
            "SELECT id FROM campeonato_elencos WHERE campeonato_id = ? AND time_id = ? AND jogador_id = ?",
            [$id, $timeId, $jogadorId]
        );
        if ($jaExiste) throw new HttpError('Jogador já está no elenco deste time neste campeonato.', 409);

        // Garante que o jogador está no time (time_jogadores)
        $noTime = $this->db->fetchOne(
            "SELECT time_id FROM time_jogadores WHERE time_id = ? AND jogador_id = ?",
            [$timeId, $jogadorId]
        );
        if (!$noTime) {
            $this->db->execute(
                "INSERT INTO time_jogadores (time_id, jogador_id) VALUES (?, ?)",
                [$timeId, $jogadorId]
            );
        }

        // Insere no elenco do campeonato
        $this->db->execute(
            "INSERT INTO campeonato_elencos (campeonato_id, time_id, jogador_id) VALUES (?, ?, ?)",
            [$id, $timeId, $jogadorId]
        );

        http_response_code(201);
        echo json_encode([
            'success' => true,
            'message' => "Jogador {$jogador['nome']} adicionado ao elenco com sucesso."
        ], JSON_UNESCAPED_UNICODE);
    }

    // =========================================================
    // DELETE /campeonatos/:id/elenco/:jogadorId
    // Remove um jogador do elenco de um time no campeonato
    // =========================================================
    public function removerJogadorElenco(int $id, int $elencoId): void
    {
        $this->getCampeonatoOr404($id);

        $registro = $this->db->fetchOne(
            "SELECT ce.id, j.nome AS jogador_nome
             FROM campeonato_elencos ce
             JOIN jogadores j ON j.id = ce.jogador_id
             WHERE ce.id = ? AND ce.campeonato_id = ?",
            [$elencoId, $id]
        );
        if (!$registro) throw new HttpError('Registro de elenco não encontrado.', 404);

        $this->db->execute("DELETE FROM campeonato_elencos WHERE id = ?", [$elencoId]);

        http_response_code(200);
        echo json_encode([
            'success' => true,
            'message' => "Jogador {$registro['jogador_nome']} removido do elenco."
        ], JSON_UNESCAPED_UNICODE);
    }

    private function json(): array
    {
        return json_decode(file_get_contents('php://input'), true) ?? [];
    }
}