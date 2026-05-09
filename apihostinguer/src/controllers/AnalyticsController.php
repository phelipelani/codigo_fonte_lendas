<?php
/**
 * AnalyticsController.php
 * Endpoints:
 *   GET /analytics/geral
 *   GET /analytics/jogador/:id
 *   GET /analytics/time/:id
 *   GET /analytics/sinergia
 *   GET /analytics/confronto/:idA/:idB
 *
 * Usa as tabelas do novo backend PHP:
 *   campeonato_partidas, campeonato_estatisticas_partida, campeonato_eventos_partida
 *
 * Delega cálculos de estatísticas para StatsService quando possível.
 */

require_once __DIR__ . '/../services/StatsService.php';

class AnalyticsController
{
    private Database $db;
    private StatsService $stats;

    private function safeGet($row, string $key, $default = 0) {
        if (!$row || !is_array($row)) return $default;
        return $row[$key] ?? $default;
    }

    public function __construct()
    {
        $this->db = Database::getInstance();
        $this->stats = new StatsService($this->db);
    }

    // =========================================================
    // HELPERS
    // =========================================================

    /** Retorna todas as partidas finalizadas (base para todos os cálculos) */
    private function sqlPartidasBase(): string
    {
        return "FROM campeonato_partidas cp
                WHERE cp.status = 'finalizada'";
    }

    private function roundTo2(float $v): float
    {
        return round($v, 2);
    }

    // =========================================================
    // GET /analytics/geral
    // =========================================================
    public function geral(): void
    {
        try {
        // ── 1. Totais globais (via StatsService) ────────────────
        $totaisRaw = $this->stats->getTotaisGlobais();
        $totalJogos        = (int)($totaisRaw['total_partidas'] ?? 0);
        $totalGols         = (int)($totaisRaw['total_gols'] ?? 0);
        $totalJogadores    = (int)($totaisRaw['total_jogadores'] ?? 0);
        $mediaGols         = (float)($totaisRaw['media_gols'] ?? 0);

        // Assistências — getTotaisGlobais não retorna, query direta
        $_r = $this->db->fetchOne("SELECT COALESCE(SUM(assistencias), 0) AS c FROM campeonato_estatisticas_partida ep JOIN campeonato_partidas cp ON cp.id = ep.partida_id AND cp.status = 'finalizada'");
        $totalAssistencias = (int)$this->safeGet($_r, 'c', 0);

        // ── 2. Evolução de gols (últimos 12 meses) ── via StatsService
        $evolucaoRaw = $this->stats->getEvolucaoGols();
        // StatsService retorna por campeonato; frontend espera por mês — manter query direta
        $evolucao = $this->db->fetchAll("
            SELECT
                DATE_FORMAT(cp.fim_em, '%m/%Y')          AS mes_ano,
                DATE_FORMAT(cp.fim_em, '%Y-%m')          AS mes_order,
                SUM(cp.placar_timeA + cp.placar_timeB)   AS total_gols,
                COUNT(*)                                  AS total_jogos
            FROM campeonato_partidas cp
            WHERE cp.status = 'finalizada'
              AND cp.fim_em >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
            GROUP BY mes_ano, mes_order
            ORDER BY mes_order ASC
        ");

        // ── 3. Rankings (via StatsService) ──────────────────────

        // Artilheiros (todos os campeonatos)
        $artilheirosRaw = $this->stats->getArtilheiros(null, 20);
        $artilheiros = array_map(function ($a) {
            $jogos = (int)($a['jogos'] ?? 1);
            $gols  = (int)($a['gols'] ?? 0);
            return [
                'id'       => $a['id'],
                'nome'     => $a['nome'],
                'foto_url' => $a['foto_url'],
                'gols'     => $gols,
                'jogos'    => $jogos,
                'media'    => $jogos > 0 ? round($gols / $jogos, 2) : 0,
            ];
        }, $artilheirosRaw);

        // Garçons
        $garconsRaw = $this->stats->getGarcons(null, 20);
        $garcons = array_map(function ($g) {
            $jogos = (int)($g['jogos'] ?? 1);
            $assists = (int)($g['assistencias'] ?? 0);
            return [
                'id'           => $g['id'],
                'nome'         => $g['nome'],
                'foto_url'     => $g['foto_url'],
                'assistencias' => $assists,
                'jogos'        => $jogos,
                'media'        => $jogos > 0 ? round($assists / $jogos, 2) : 0,
            ];
        }, $garconsRaw);

        // Artilheiros por média (mín. 5 jogos) — keep as direct SQL (min 5 games filter)
        $mediaGolsRank = $this->db->fetchAll("
            SELECT j.id, j.nome, j.foto_url,
                   SUM(ep.gols)        AS gols,
                   COUNT(DISTINCT ep.partida_id) AS jogos,
                   ROUND(SUM(ep.gols) / COUNT(DISTINCT ep.partida_id), 2) AS media
            FROM campeonato_estatisticas_partida ep
            JOIN jogadores j ON j.id = ep.jogador_id
            JOIN campeonato_partidas cp ON cp.id = ep.partida_id AND cp.status = 'finalizada'
            GROUP BY j.id, j.nome, j.foto_url
            HAVING jogos >= 5 AND gols > 0
            ORDER BY media DESC
            LIMIT 20
        ");

        // Goleiros (muralhas) — via StatsService
        $goleirosRaw = $this->stats->getGoleiroRanking(null, 20);
        $goleiros = array_map(function ($g) {
            $jogos = (int)($g['jogos'] ?? 1);
            return [
                'id'             => $g['id'],
                'nome'           => $g['nome'],
                'foto_url'       => $g['foto_url'],
                'jogos'          => $jogos,
                'gols_sofridos'  => null, // getGoleiroRanking não retorna gols_sofridos individual
                'clean_sheets'   => (int)($g['clean_sheets'] ?? 0),
                'media_sofridos' => (float)($g['media_gols_sofridos'] ?? 0),
            ];
        }, $goleirosRaw);
        // Preencher gols_sofridos via cálculo: media_sofridos * jogos
        foreach ($goleiros as &$_g) {
            $_g['gols_sofridos'] = (int)round($_g['media_sofridos'] * $_g['jogos']);
        }
        unset($_g);

        // Zagueiros (xerifes) — via StatsService
        $zagueirosRaw = $this->stats->getZagueiros(null, 20);
        $zagueiros = array_map(function ($z) {
            return [
                'id'                  => $z['id'],
                'nome'                => $z['nome'],
                'foto_url'            => $z['foto_url'],
                'jogos'               => (int)($z['jogos'] ?? 0),
                'gols'                => 0,
                'assistencias'        => 0,
                'clean_sheets'        => (int)($z['clean_sheets'] ?? 0),
                'media_gols_sofridos' => 0,
            ];
        }, $zagueirosRaw);

        // Maiores participações (G+A) — via StatsService
        $participacoes = $this->stats->getParticipacoes(null, 20);

        // ── 4. Melhor dupla (garçom + artilheiro) — via StatsService
        $duplaRaw = $this->stats->getMelhorDupla('conexao');
        $melhorDupla = null;
        if ($duplaRaw) {
            $melhorDupla = [
                'garcom_nome'       => $duplaRaw['garcom_nome']     ?? null,
                'garcom_foto'       => $duplaRaw['garcom_foto']     ?? null,
                'artilheiro_nome'   => $duplaRaw['artilheiro_nome'] ?? null,
                'artilheiro_foto'   => $duplaRaw['artilheiro_foto'] ?? null,
                'gols_juntos'       => (int)($duplaRaw['total'] ?? 0),
            ];
        }

        // ── 5. Recordes — via StatsService
        $recordesRaw = $this->stats->getRecordes();
        // Recordes de partida individual (hatTrick, assistenteReal, showCompleto)
        // Controller também precisa maior_goleada e mais_gols_jogo (aggregates de partida)
        $maiorGoleada = $this->db->fetchOne("
            SELECT MAX(ABS(placar_timeA - placar_timeB)) AS maior_goleada
            FROM campeonato_partidas WHERE status = 'finalizada'
        ");
        $maisGolsJogo = $this->db->fetchOne("
            SELECT MAX(placar_timeA + placar_timeB) AS mais_gols_jogo
            FROM campeonato_partidas WHERE status = 'finalizada'
        ");

        // ── 6. Ranking geral de pontuação — via StatsService (getScoreLendario)
        $scoreLendarioRaw = $this->stats->getScoreLendario(50);
        $rankingPontuacao = array_map(function ($row) {
            return [
                'id'           => (int)($row['id'] ?? 0),
                'nome'         => $row['nome'] ?? '',
                'foto_url'     => $row['foto_url'] ?? null,
                'joga_recuado' => $row['joga_recuado'] ?? 0,
                'jogos'        => (int)($row['total_jogos'] ?? 0),
                'gols'         => (int)($row['total_gols'] ?? 0),
                'assistencias' => (int)($row['total_assists'] ?? 0),
                'vitorias'     => (int)($row['vitorias'] ?? 0),
                'empates'      => (int)($row['empates'] ?? 0),
                'derrotas'     => (int)($row['derrotas'] ?? 0),
                'clean_sheets' => (int)($row['clean_sheets'] ?? 0),
                'titulos'      => (int)($row['qtd_titulos'] ?? 0),
                'mvps'         => 0,
                'pontos'       => (float)($row['score_lendario'] ?? 0),
            ];
        }, $scoreLendarioRaw);

        // ── 7. Destaque da última rodada — via StatsService
        $destaques = $this->stats->getDestaquesUltimaRodada();
        $destaqueRodada = null;
        $peDeRatoRodada = null;

        if ($destaques['rodada_id']) {
            // Buscar meta da rodada para nr_rodada, campeonato_nome, camp_ativo
            $rodadaId = (int)$destaques['rodada_id'];
            $metaRow = $this->db->fetchOne("
                SELECT
                    r.campeonato_id,
                    c.nome AS campeonato_nome,
                    c.fase_atual,
                    (SELECT COUNT(*) FROM rodadas r2
                     WHERE r2.campeonato_id = r.campeonato_id AND r2.id <= r.id) AS nr_rodada
                FROM rodadas r
                JOIN campeonatos c ON c.id = r.campeonato_id
                WHERE r.id = ?
            ", [$rodadaId]);

            if ($metaRow) {
                $campNome  = $metaRow['campeonato_nome'];
                $nrRodada  = (int)$metaRow['nr_rodada'];
                $isAtivo   = !in_array($metaRow['fase_atual'], ['finalizado', 'cancelado', 'encerrado']);

                $mvpData = $destaques['mvp'];
                if ($mvpData) {
                    $destaqueRodada = [
                        'nome'       => $mvpData['nome'],
                        'foto_url'   => $mvpData['foto_url'],
                        'rodada'     => $nrRodada,
                        'campeonato' => $campNome,
                        'camp_ativo' => $isAtivo,
                    ];
                }

                $ratData = $destaques['pe_de_rato'];
                if ($ratData) {
                    $peDeRatoRodada = [
                        'nome'       => $ratData['nome'],
                        'foto_url'   => $ratData['foto_url'],
                        'rodada'     => $nrRodada,
                        'campeonato' => $campNome,
                        'camp_ativo' => $isAtivo,
                    ];
                }
            }
        }

        http_response_code(200);
        echo json_encode([
            'totais' => [
                'total_jogos'         => $totalJogos,
                'total_gols'          => $totalGols,
                'total_assistencias'  => $totalAssistencias,
                'media_gols'          => $mediaGols,
                'total_jogadores'     => $totalJogadores,
            ],
            'evolucao' => $evolucao,
            'rankings' => [
                'artilheiros'   => $artilheiros,
                'garcons'       => $garcons,
                'mediaGols'     => $mediaGolsRank,
                'goleiros'      => $goleiros,
                'zagueiros'     => $zagueiros,
                'participacoes' => $participacoes,
            ],
            'melhorDupla'      => $melhorDupla,
            'recordes' => [
                'maior_goleada'  => (int)$this->safeGet($maiorGoleada, 'maior_goleada', 0),
                'mais_gols_jogo' => (int)$this->safeGet($maisGolsJogo, 'mais_gols_jogo', 0),
            ],
            'rankingPontuacao' => $rankingPontuacao,
            'destaqueRodada'   => $destaqueRodada,
            'peDeRatoRodada'   => $peDeRatoRodada,
        ], JSON_UNESCAPED_UNICODE);
        } catch (\Throwable $e) {
            error_log('[analytics/geral] ERROR: ' . $e->getMessage() . ' in ' . $e->getFile() . ':' . $e->getLine());
            http_response_code(500);
            echo json_encode(['error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
        }
    }

    // =========================================================
    // GET /analytics/jogador/:id
    // =========================================================
    public function jogador(int $id): void
    {
        $jogador = $this->db->fetchOne("SELECT * FROM jogadores WHERE id = ?", [$id]);
        if (!$jogador) {
            http_response_code(404);
            echo json_encode(['error' => 'Jogador não encontrado']);
            return;
        }

        // Totais + desempenho via StatsService
        $playerStats = $this->stats->getPlayerStats($id);

        $totaisJogos    = (int)($playerStats['jogos'] ?? 0);
        $totaisGols     = (int)($playerStats['gols'] ?? 0);
        $totaisAssists  = (int)($playerStats['assistencias'] ?? 0);
        $totaisCS       = (int)($playerStats['clean_sheets'] ?? 0);
        $totaisVitorias = (int)($playerStats['vitorias'] ?? 0);
        $totaisEmpates  = (int)($playerStats['empates'] ?? 0);
        $totaisDerrotas = (int)($playerStats['derrotas'] ?? 0);

        // Recordes pessoais
        $recordes = $this->db->fetchOne("
            SELECT
                MAX(ep.gols)        AS mais_gols_partida,
                MAX(ep.assistencias) AS mais_assists_partida
            FROM campeonato_estatisticas_partida ep
            JOIN campeonato_partidas cp ON cp.id = ep.partida_id AND cp.status = 'finalizada'
            WHERE ep.jogador_id = ?
        ", [$id]);

        // Parcerias
        // Garçom favorito (quem mais assistiu para este jogador)
        $garcomFav = $this->db->fetchOne("
            SELECT j.id, j.nome, j.foto_url,
                   COUNT(*) AS total
            FROM campeonato_eventos_partida ev
            JOIN campeonato_partidas cp ON cp.id = ev.partida_id AND cp.status = 'finalizada'
            JOIN jogadores j ON j.id = ev.assist_por_jogador_id
            WHERE ev.jogador_id = ? AND ev.tipo = 'gol' AND ev.assist_por_jogador_id IS NOT NULL
            GROUP BY j.id ORDER BY total DESC LIMIT 1
        ", [$id]);

        // Artilheiro favorito (quem este jogador mais assistiu)
        $artilheiroFav = $this->db->fetchOne("
            SELECT j.id, j.nome, j.foto_url,
                   COUNT(*) AS total
            FROM campeonato_eventos_partida ev
            JOIN campeonato_partidas cp ON cp.id = ev.partida_id AND cp.status = 'finalizada'
            JOIN jogadores j ON j.id = ev.jogador_id
            WHERE ev.assist_por_jogador_id = ? AND ev.tipo = 'gol'
            GROUP BY j.id ORDER BY total DESC LIMIT 1
        ", [$id]);

        // Zagueiro mais sólido que jogou no mesmo time
        $zagueiroSolido = $this->db->fetchOne("
            SELECT j.id, j.nome, j.foto_url,
                   SUM(CASE
                       WHEN (ep2.time_id = cp.timeA_id AND cp.placar_timeB = 0)
                         OR (ep2.time_id = cp.timeB_id AND cp.placar_timeA = 0)
                       THEN 1 ELSE 0 END) AS clean_sheets
            FROM campeonato_estatisticas_partida ep1
            JOIN campeonato_estatisticas_partida ep2 ON ep2.partida_id = ep1.partida_id
               AND ep2.time_id = ep1.time_id AND ep2.jogador_id != ep1.jogador_id
            JOIN jogadores j ON j.id = ep2.jogador_id AND j.joga_recuado = 1
            JOIN campeonato_partidas cp ON cp.id = ep1.partida_id AND cp.status = 'finalizada'
            WHERE ep1.jogador_id = ?
            GROUP BY j.id ORDER BY clean_sheets DESC LIMIT 1
        ", [$id]);

        // Zagueiro artilheiro no mesmo time
        $zagueiroArtilheiro = $this->db->fetchOne("
            SELECT j.id, j.nome, j.foto_url,
                   SUM(ep2.gols) AS gols
            FROM campeonato_estatisticas_partida ep1
            JOIN campeonato_estatisticas_partida ep2 ON ep2.partida_id = ep1.partida_id
               AND ep2.time_id = ep1.time_id AND ep2.jogador_id != ep1.jogador_id
            JOIN jogadores j ON j.id = ep2.jogador_id AND j.joga_recuado = 1
            JOIN campeonato_partidas cp ON cp.id = ep1.partida_id AND cp.status = 'finalizada'
            WHERE ep1.jogador_id = ?
            GROUP BY j.id HAVING gols > 0 ORDER BY gols DESC LIMIT 1
        ", [$id]);

        // Goleiro de confiança (mais CS quando este jogador estava no time)
        $goleiroConfianca = $this->db->fetchOne("
            SELECT j.id, j.nome, j.foto_url,
                   SUM(CASE
                       WHEN (cp.goleiro_timeA_id = j.id AND cp.placar_timeB = 0)
                         OR (cp.goleiro_timeB_id = j.id AND cp.placar_timeA = 0)
                       THEN 1 ELSE 0 END) AS clean_sheets
            FROM campeonato_estatisticas_partida ep
            JOIN campeonato_partidas cp ON cp.id = ep.partida_id AND cp.status = 'finalizada'
            JOIN jogadores j ON
                (ep.time_id = cp.timeA_id AND j.id = cp.goleiro_timeA_id)
             OR (ep.time_id = cp.timeB_id AND j.id = cp.goleiro_timeB_id)
            WHERE ep.jogador_id = ?
            GROUP BY j.id HAVING clean_sheets > 0 ORDER BY clean_sheets DESC LIMIT 1
        ", [$id]);

        // Parceiro frequente (mais jogou junto no mesmo time)
        $parceiroFrequente = $this->db->fetchOne("
            SELECT j.id, j.nome, j.foto_url,
                   COUNT(*) AS jogos_juntos
            FROM campeonato_estatisticas_partida ep1
            JOIN campeonato_estatisticas_partida ep2 ON ep2.partida_id = ep1.partida_id
               AND ep2.time_id = ep1.time_id AND ep2.jogador_id != ep1.jogador_id
            JOIN jogadores j ON j.id = ep2.jogador_id
            JOIN campeonato_partidas cp ON cp.id = ep1.partida_id AND cp.status = 'finalizada'
            WHERE ep1.jogador_id = ?
            GROUP BY j.id ORDER BY jogos_juntos DESC LIMIT 1
        ", [$id]);

        // Parceiro de vitórias
        $parceiroVitorias = $this->db->fetchOne("
            SELECT j.id, j.nome, j.foto_url,
                   SUM(CASE
                       WHEN (ep1.time_id = cp.timeA_id AND cp.placar_timeA > cp.placar_timeB)
                         OR (ep1.time_id = cp.timeB_id AND cp.placar_timeB > cp.placar_timeA)
                       THEN 1 ELSE 0 END) AS vitorias_juntos
            FROM campeonato_estatisticas_partida ep1
            JOIN campeonato_estatisticas_partida ep2 ON ep2.partida_id = ep1.partida_id
               AND ep2.time_id = ep1.time_id AND ep2.jogador_id != ep1.jogador_id
            JOIN jogadores j ON j.id = ep2.jogador_id
            JOIN campeonato_partidas cp ON cp.id = ep1.partida_id AND cp.status = 'finalizada'
            WHERE ep1.jogador_id = ?
            GROUP BY j.id HAVING vitorias_juntos > 0 ORDER BY vitorias_juntos DESC LIMIT 1
        ", [$id]);

        // Últimas 10 partidas
        $ultimasPartidas = $this->db->fetchAll("
            SELECT
                ep.partida_id,
                ep.gols,
                ep.assistencias,
                ep.time_id,
                cp.timeA_id, cp.timeB_id,
                cp.placar_timeA, cp.placar_timeB,
                cp.fim_em AS data,
                ta.nome AS timeA_nome,
                tb.nome AS timeB_nome,
                CASE
                    WHEN (ep.time_id = cp.timeA_id AND cp.placar_timeA > cp.placar_timeB)
                      OR (ep.time_id = cp.timeB_id AND cp.placar_timeB > cp.placar_timeA)
                    THEN 'V'
                    WHEN cp.placar_timeA = cp.placar_timeB THEN 'E'
                    ELSE 'D'
                END AS resultado,
                CASE
                    WHEN (ep.time_id = cp.timeA_id AND cp.placar_timeB = 0)
                      OR (ep.time_id = cp.timeB_id AND cp.placar_timeA = 0)
                    THEN 1 ELSE 0
                END AS clean_sheet
            FROM campeonato_estatisticas_partida ep
            JOIN campeonato_partidas cp ON cp.id = ep.partida_id AND cp.status = 'finalizada'
            JOIN times ta ON ta.id = cp.timeA_id
            JOIN times tb ON tb.id = cp.timeB_id
            WHERE ep.jogador_id = ?
            ORDER BY cp.fim_em DESC
            LIMIT 10
        ", [$id]);

        // Títulos conquistados pelo jogador
        $titulos = $this->db->fetchAll("
            SELECT c.id, c.nome, c.data, t.nome AS time_nome, t.logo_url AS time_logo
            FROM campeonato_vencedores cv
            JOIN campeonatos c ON c.id = cv.campeonato_id
            LEFT JOIN times t ON t.id = c.time_campeao_id
            WHERE cv.jogador_id = ?
            ORDER BY c.data DESC
        ", [$id]);

        // Prêmios individuais (MVPs de rodada, MVP camp, artilheiro, garçom, pé de rato)
        $premiosRodada = $this->db->fetchAll("
            SELECT pr.tipo_premio, pr.pontuacao,
                   DATE_FORMAT(r.data, '%d/%m/%Y') AS rodada_nome,
                   r.campeonato_id
            FROM premios_rodada pr
            JOIN rodadas r ON r.id = pr.rodada_id
            WHERE pr.jogador_id = ?
            ORDER BY r.id DESC
        ", [$id]);

        $premiosCampeonato = $this->db->fetchAll("
            SELECT cp2.tipo_premio, cp2.valor, c.nome AS campeonato_nome, c.data
            FROM campeonato_premios cp2
            JOIN campeonatos c ON c.id = cp2.campeonato_id
            WHERE cp2.jogador_id = ?
            ORDER BY c.data DESC
        ", [$id]);

        // Ranking geral — posição do jogador via StatsService (getScoreLendario)
        $allPlayers = $this->stats->getScoreLendario(500);
        $posicao = 0;
        $pontosTotal = 0.0;
        foreach ($allPlayers as $idx => $p) {
            if ((int)$p['id'] === $id) {
                $posicao = $idx + 1;
                $pontosTotal = (float)($p['score_lendario'] ?? 0);
                break;
            }
        }

        http_response_code(200);
        echo json_encode([
            'jogador'       => $jogador,
            'totais'        => [
                'jogos'        => $totaisJogos,
                'gols'         => $totaisGols,
                'assists'      => $totaisAssists,
                'clean_sheets' => $totaisCS,
            ],
            'desempenho'    => [
                'vitorias' => $totaisVitorias,
                'empates'  => $totaisEmpates,
                'derrotas' => $totaisDerrotas,
            ],
            'recordes'      => [
                'mais_gols_partida'   => (int)($recordes['mais_gols_partida']   ?? 0),
                'mais_assists_partida'=> (int)($recordes['mais_assists_partida']?? 0),
            ],
            'titulos'       => $titulos,
            'rankingGeral'  => [
                'posicao'       => $posicao,
                'pontos_total'  => $pontosTotal,
            ],
            'premiosRodada'      => $premiosRodada,
            'premiosCampeonato'  => $premiosCampeonato,
            'parcerias'     => [
                'garcomFavorito'     => $garcomFav,
                'artilheiroFavorito' => $artilheiroFav,
                'zagueiroSolido'     => $zagueiroSolido,
                'zagueiroArtilheiro' => $zagueiroArtilheiro,
                'goleiroConfianca'   => $goleiroConfianca,
                'parceiroFrequente'  => $parceiroFrequente,
                'parceiroVitorias'   => $parceiroVitorias,
            ],
            'ultimasPartidas' => $ultimasPartidas,
        ], JSON_UNESCAPED_UNICODE);
    }

    // =========================================================
    // GET /analytics/time/:id
    // =========================================================
    public function time(int $id): void
    {
        $time = $this->db->fetchOne("SELECT * FROM times WHERE id = ?", [$id]);
        if (!$time) {
            http_response_code(404);
            echo json_encode(['error' => 'Time não encontrado']);
            return;
        }

        // Desempenho geral
        $desempenho = $this->db->fetchOne("
            SELECT
                COUNT(*) AS jogos,
                SUM(CASE WHEN (timeA_id = ? AND placar_timeA > placar_timeB)
                           OR (timeB_id = ? AND placar_timeB > placar_timeA) THEN 1 ELSE 0 END) AS vitorias,
                SUM(CASE WHEN placar_timeA = placar_timeB THEN 1 ELSE 0 END) AS empates,
                SUM(CASE WHEN (timeA_id = ? AND placar_timeA < placar_timeB)
                           OR (timeB_id = ? AND placar_timeB < placar_timeA) THEN 1 ELSE 0 END) AS derrotas,
                SUM(CASE WHEN timeA_id = ? THEN placar_timeA ELSE placar_timeB END) AS gols_pro,
                SUM(CASE WHEN timeA_id = ? THEN placar_timeB ELSE placar_timeA END) AS gols_contra
            FROM campeonato_partidas
            WHERE status = 'finalizada' AND (timeA_id = ? OR timeB_id = ?)
        ", [$id, $id, $id, $id, $id, $id, $id, $id]);

        // Rankings internos do time
        $artilheiros = $this->db->fetchAll("
            SELECT j.id, j.nome, j.foto_url,
                   SUM(ep.gols) AS total
            FROM campeonato_estatisticas_partida ep
            JOIN jogadores j ON j.id = ep.jogador_id
            JOIN campeonato_partidas cp ON cp.id = ep.partida_id AND cp.status = 'finalizada'
            WHERE ep.time_id = ?
            GROUP BY j.id ORDER BY total DESC LIMIT 5
        ", [$id]);

        $garcons = $this->db->fetchAll("
            SELECT j.id, j.nome, j.foto_url,
                   SUM(ep.assistencias) AS total
            FROM campeonato_estatisticas_partida ep
            JOIN jogadores j ON j.id = ep.jogador_id
            JOIN campeonato_partidas cp ON cp.id = ep.partida_id AND cp.status = 'finalizada'
            WHERE ep.time_id = ?
            GROUP BY j.id ORDER BY total DESC LIMIT 5
        ", [$id]);

        $maisJogaram = $this->db->fetchAll("
            SELECT j.id, j.nome, j.foto_url,
                   COUNT(DISTINCT ep.partida_id) AS total
            FROM campeonato_estatisticas_partida ep
            JOIN jogadores j ON j.id = ep.jogador_id
            JOIN campeonato_partidas cp ON cp.id = ep.partida_id AND cp.status = 'finalizada'
            WHERE ep.time_id = ?
            GROUP BY j.id ORDER BY total DESC LIMIT 5
        ", [$id]);

        // Títulos do time
        $titulos = $this->db->fetchAll("
            SELECT c.id, c.nome, c.data
            FROM campeonatos c
            WHERE c.time_campeao_id = ?
            ORDER BY c.data DESC
        ", [$id]);

        // Últimas 10 partidas
        $ultimasPartidas = $this->db->fetchAll("
            SELECT cp.id AS partida_id,
                   cp.timeA_id, cp.timeB_id,
                   cp.placar_timeA, cp.placar_timeB,
                   ta.nome AS timeA_nome, tb.nome AS timeB_nome,
                   ta.logo_url AS timeA_logo, tb.logo_url AS timeB_logo,
                   cp.fim_em AS data,
                   CASE
                       WHEN (cp.timeA_id = ? AND cp.placar_timeA > cp.placar_timeB)
                         OR (cp.timeB_id = ? AND cp.placar_timeB > cp.placar_timeA)
                       THEN 'V'
                       WHEN cp.placar_timeA = cp.placar_timeB THEN 'E'
                       ELSE 'D'
                   END AS resultado
            FROM campeonato_partidas cp
            JOIN times ta ON ta.id = cp.timeA_id
            JOIN times tb ON tb.id = cp.timeB_id
            WHERE cp.status = 'finalizada' AND (cp.timeA_id = ? OR cp.timeB_id = ?)
            ORDER BY cp.fim_em DESC LIMIT 10
        ", [$id, $id, $id, $id]);

        http_response_code(200);
        echo json_encode([
            'info'           => $time,
            'desempenho'     => $desempenho,
            'rankings'       => [
                'artilheiros' => $artilheiros,
                'garcons'     => $garcons,
                'mais_jogaram' => $maisJogaram,
            ],
            'titulos'        => $titulos,
            'ultimasPartidas' => $ultimasPartidas,
        ], JSON_UNESCAPED_UNICODE);
    }

    // =========================================================
    // GET /analytics/sinergia
    // =========================================================
    public function sinergia(): void
    {
        // Conexão Letal: duplas artilheiro+garçom (gols assistidos juntos)
        $topDuplasGols = $this->db->fetchAll("
            SELECT
                jb.nome AS artilheiro_nome, jb.foto_url AS artilheiro_foto,
                ja.nome AS garcom_nome,     ja.foto_url AS garcom_foto,
                COUNT(*) AS gols_juntos
            FROM campeonato_eventos_partida ev
            JOIN campeonato_partidas cp ON cp.id = ev.partida_id AND cp.status = 'finalizada'
            JOIN jogadores jb ON jb.id = ev.jogador_id
            JOIN jogadores ja ON ja.id = ev.assist_por_jogador_id
            WHERE ev.tipo = 'gol' AND ev.assist_por_jogador_id IS NOT NULL
            GROUP BY ev.jogador_id, ev.assist_por_jogador_id
            ORDER BY gols_juntos DESC LIMIT 5
        ");

        // Duplas Artilheiras: mais gols combinados no mesmo time
        $maisLetais = $this->db->fetchAll("
            SELECT
                j1.nome AS jogador1_nome, j1.foto_url AS jogador1_foto,
                j2.nome AS jogador2_nome, j2.foto_url AS jogador2_foto,
                (SUM(ep1.gols) + SUM(ep2.gols)) AS gols_combinados
            FROM campeonato_estatisticas_partida ep1
            JOIN campeonato_estatisticas_partida ep2 ON ep2.partida_id = ep1.partida_id
               AND ep2.time_id = ep1.time_id AND ep2.jogador_id > ep1.jogador_id
            JOIN jogadores j1 ON j1.id = ep1.jogador_id
            JOIN jogadores j2 ON j2.id = ep2.jogador_id
            JOIN campeonato_partidas cp ON cp.id = ep1.partida_id AND cp.status = 'finalizada'
            GROUP BY ep1.jogador_id, ep2.jogador_id
            HAVING gols_combinados > 0
            ORDER BY gols_combinados DESC LIMIT 5
        ");

        // Parceiros Inseparáveis: mais jogaram juntos
        $maisJogaramJuntos = $this->db->fetchAll("
            SELECT
                j1.nome AS jogador1_nome, j1.foto_url AS jogador1_foto,
                j2.nome AS jogador2_nome, j2.foto_url AS jogador2_foto,
                COUNT(*) AS jogos_juntos
            FROM campeonato_estatisticas_partida ep1
            JOIN campeonato_estatisticas_partida ep2 ON ep2.partida_id = ep1.partida_id
               AND ep2.time_id = ep1.time_id AND ep2.jogador_id > ep1.jogador_id
            JOIN jogadores j1 ON j1.id = ep1.jogador_id
            JOIN jogadores j2 ON j2.id = ep2.jogador_id
            JOIN campeonato_partidas cp ON cp.id = ep1.partida_id AND cp.status = 'finalizada'
            GROUP BY ep1.jogador_id, ep2.jogador_id
            ORDER BY jogos_juntos DESC LIMIT 5
        ");

        // Duplas Vencedoras: mais vitórias juntos
        $maisVenceramJuntos = $this->db->fetchAll("
            SELECT
                j1.nome AS jogador1_nome, j1.foto_url AS jogador1_foto,
                j2.nome AS jogador2_nome, j2.foto_url AS jogador2_foto,
                SUM(CASE
                    WHEN (ep1.time_id = cp.timeA_id AND cp.placar_timeA > cp.placar_timeB)
                      OR (ep1.time_id = cp.timeB_id AND cp.placar_timeB > cp.placar_timeA)
                    THEN 1 ELSE 0 END) AS vitorias_juntos
            FROM campeonato_estatisticas_partida ep1
            JOIN campeonato_estatisticas_partida ep2 ON ep2.partida_id = ep1.partida_id
               AND ep2.time_id = ep1.time_id AND ep2.jogador_id > ep1.jogador_id
            JOIN jogadores j1 ON j1.id = ep1.jogador_id
            JOIN jogadores j2 ON j2.id = ep2.jogador_id
            JOIN campeonato_partidas cp ON cp.id = ep1.partida_id AND cp.status = 'finalizada'
            GROUP BY ep1.jogador_id, ep2.jogador_id
            HAVING vitorias_juntos > 0
            ORDER BY vitorias_juntos DESC LIMIT 5
        ");

        // Muralhas: duplas de zagueiros com mais clean sheets juntos
        $muralhas = $this->db->fetchAll("
            SELECT
                j1.nome AS jogador1_nome, j1.foto_url AS jogador1_foto,
                j2.nome AS jogador2_nome, j2.foto_url AS jogador2_foto,
                SUM(CASE
                    WHEN (ep1.time_id = cp.timeA_id AND cp.placar_timeB = 0)
                      OR (ep1.time_id = cp.timeB_id AND cp.placar_timeA = 0)
                    THEN 1 ELSE 0 END) AS clean_sheets_juntos
            FROM campeonato_estatisticas_partida ep1
            JOIN campeonato_estatisticas_partida ep2 ON ep2.partida_id = ep1.partida_id
               AND ep2.time_id = ep1.time_id AND ep2.jogador_id > ep1.jogador_id
            JOIN jogadores j1 ON j1.id = ep1.jogador_id AND j1.joga_recuado = 1
            JOIN jogadores j2 ON j2.id = ep2.jogador_id AND j2.joga_recuado = 1
            JOIN campeonato_partidas cp ON cp.id = ep1.partida_id AND cp.status = 'finalizada'
            GROUP BY ep1.jogador_id, ep2.jogador_id
            HAVING clean_sheets_juntos > 0
            ORDER BY clean_sheets_juntos DESC LIMIT 5
        ");

        http_response_code(200);
        echo json_encode([
            'topDuplasGols'      => $topDuplasGols,
            'maisLetais'         => $maisLetais,
            'maisJogaramJuntos'  => $maisJogaramJuntos,
            'maisVenceramJuntos' => $maisVenceramJuntos,
            'muralhas'           => $muralhas,
        ], JSON_UNESCAPED_UNICODE);
    }

    // =========================================================
    // GET /analytics/confronto/:idA/:idB
    // =========================================================
    public function confronto(int $idA, int $idB): void
    {
        $jogA = $this->db->fetchOne("SELECT * FROM jogadores WHERE id = ?", [$idA]);
        $jogB = $this->db->fetchOne("SELECT * FROM jogadores WHERE id = ?", [$idB]);

        if (!$jogA || !$jogB) {
            http_response_code(404);
            echo json_encode(['error' => 'Jogador não encontrado']);
            return;
        }

        // Stats globais de cada um — via StatsService
        $buildStats = function (int $jid): array {
            $ps = $this->stats->getPlayerStats($jid);
            $stats = [
                'jogos'        => $ps['jogos'] ?? 0,
                'gols'         => $ps['gols'] ?? 0,
                'assists'      => $ps['assistencias'] ?? 0,
                'clean_sheets' => $ps['clean_sheets'] ?? 0,
            ];
            $desempenho = [
                'jogos'    => $ps['jogos'] ?? 0,
                'vitorias' => $ps['vitorias'] ?? 0,
                'empates'  => $ps['empates'] ?? 0,
                'derrotas' => $ps['derrotas'] ?? 0,
            ];
            return ['stats' => $stats, 'desempenho' => $desempenho];
        };

        $dataA = $buildStats($idA);
        $dataB = $buildStats($idB);

        // Confrontos diretos (estiveram em times opostos)
        $confDireto = $this->db->fetchOne("
            SELECT
                COUNT(DISTINCT cp.id) AS jogos,
                SUM(CASE
                    WHEN (epA.time_id = cp.timeA_id AND cp.placar_timeA > cp.placar_timeB)
                      OR (epA.time_id = cp.timeB_id AND cp.placar_timeB > cp.placar_timeA)
                    THEN 1 ELSE 0 END) AS vitorias_A,
                SUM(CASE
                    WHEN (epB.time_id = cp.timeA_id AND cp.placar_timeA > cp.placar_timeB)
                      OR (epB.time_id = cp.timeB_id AND cp.placar_timeB > cp.placar_timeA)
                    THEN 1 ELSE 0 END) AS vitorias_B,
                SUM(CASE WHEN cp.placar_timeA = cp.placar_timeB THEN 1 ELSE 0 END) AS empates,
                SUM(epA.gols) AS gols_A,
                SUM(epB.gols) AS gols_B
            FROM campeonato_estatisticas_partida epA
            JOIN campeonato_estatisticas_partida epB ON epB.partida_id = epA.partida_id
               AND epB.time_id != epA.time_id
            JOIN campeonato_partidas cp ON cp.id = epA.partida_id AND cp.status = 'finalizada'
            WHERE epA.jogador_id = ? AND epB.jogador_id = ?
        ", [$idA, $idB]);

        // Parceria (jogaram juntos no mesmo time)
        $parceria = $this->db->fetchOne("
            SELECT
                COUNT(DISTINCT cp.id) AS jogos_juntos,
                SUM(CASE
                    WHEN (epA.time_id = cp.timeA_id AND cp.placar_timeA > cp.placar_timeB)
                      OR (epA.time_id = cp.timeB_id AND cp.placar_timeB > cp.placar_timeA)
                    THEN 1 ELSE 0 END) AS vitorias_juntos
            FROM campeonato_estatisticas_partida epA
            JOIN campeonato_estatisticas_partida epB ON epB.partida_id = epA.partida_id
               AND epB.time_id = epA.time_id
            JOIN campeonato_partidas cp ON cp.id = epA.partida_id AND cp.status = 'finalizada'
            WHERE epA.jogador_id = ? AND epB.jogador_id = ?
        ", [$idA, $idB]);

        // Gols assistidos cruzados quando juntos
        $golsAassistidosPorB = (int)($this->db->fetchOne("
            SELECT COUNT(*) AS c
            FROM campeonato_eventos_partida ev
            JOIN campeonato_partidas cp ON cp.id = ev.partida_id AND cp.status = 'finalizada'
            WHERE ev.tipo = 'gol' AND ev.jogador_id = ? AND ev.assist_por_jogador_id = ?
        ", [$idA, $idB])['c'] ?? 0);

        $golsBassistidosPorA = (int)($this->db->fetchOne("
            SELECT COUNT(*) AS c
            FROM campeonato_eventos_partida ev
            JOIN campeonato_partidas cp ON cp.id = ev.partida_id AND cp.status = 'finalizada'
            WHERE ev.tipo = 'gol' AND ev.jogador_id = ? AND ev.assist_por_jogador_id = ?
        ", [$idB, $idA])['c'] ?? 0);

        http_response_code(200);
        echo json_encode([
            'jogadorA' => array_merge(
                ['id' => $jogA['id'], 'nome' => $jogA['nome'], 'foto_url' => $jogA['foto_url'], 'posicao' => $jogA['posicao']],
                $dataA
            ),
            'jogadorB' => array_merge(
                ['id' => $jogB['id'], 'nome' => $jogB['nome'], 'foto_url' => $jogB['foto_url'], 'posicao' => $jogB['posicao']],
                $dataB
            ),
            'confronto' => $confDireto,
            'parceria'  => array_merge($parceria ?: [], [
                'gols_A_assistidos_por_B' => $golsAassistidosPorB,
                'gols_B_assistidos_por_A' => $golsBassistidosPorA,
            ]),
        ], JSON_UNESCAPED_UNICODE);
    }

    // =========================================================
    // GET /analytics/panoramica
    // =========================================================
    public function panoramica(): void
    {
        try {
            $pdo = Database::getInstance()->getConnection();

            $totalGols    = (int) $pdo->query("SELECT COALESCE(SUM(gols),0) FROM campeonato_estatisticas_partida")->fetchColumn();
            $totalAssists = (int) $pdo->query("SELECT COALESCE(SUM(assistencias),0) FROM campeonato_estatisticas_partida")->fetchColumn();
            $totalJogs    = (int) $pdo->query("SELECT COUNT(*) FROM jogadores")->fetchColumn();
            $totalPartidas= (int) $pdo->query("SELECT COUNT(*) FROM campeonato_partidas WHERE status = 'finalizada'")->fetchColumn();

            $artilheiros = $pdo->query("
                SELECT j.nome, j.foto_url, SUM(ej.gols) as total
                FROM campeonato_estatisticas_partida ej
                JOIN jogadores j ON j.id = ej.jogador_id
                GROUP BY j.id HAVING total > 0 ORDER BY total DESC LIMIT 5
            ")->fetchAll(PDO::FETCH_ASSOC);

            $garcons = $pdo->query("
                SELECT j.nome, j.foto_url, SUM(ej.assistencias) as total
                FROM campeonato_estatisticas_partida ej
                JOIN jogadores j ON j.id = ej.jogador_id
                GROUP BY j.id HAVING total > 0 ORDER BY total DESC LIMIT 5
            ")->fetchAll(PDO::FETCH_ASSOC);

            // MVP e Pé de Rato da última rodada finalizada
            $ultimaRodada = $pdo->query("
                SELECT id FROM rodadas WHERE status = 'finalizada'
                ORDER BY data DESC, id DESC LIMIT 1
            ")->fetch(PDO::FETCH_ASSOC);

            $mvpRodada = null;
            $peDeRatoRodada = null;
            $artilheiroRodada = null;
            $garcomRodada = null;
            $goleiroRodada = null;
            $zagueiroRodada = null;

            if ($ultimaRodada) {
                $rid = (int)$ultimaRodada['id'];
                $mvpRodada = $pdo->query("
                    SELECT j.nome, j.foto_url, pr.pontuacao as total, pr.tipo_premio
                    FROM premios_rodada pr
                    JOIN jogadores j ON j.id = pr.jogador_id
                    WHERE pr.rodada_id = {$rid} AND pr.tipo_premio = 'mvp_rodada'
                    LIMIT 1
                ")->fetch(PDO::FETCH_ASSOC) ?: null;

                $peDeRatoRodada = $pdo->query("
                    SELECT j.nome, j.foto_url, pr.pontuacao as total, pr.tipo_premio
                    FROM premios_rodada pr
                    JOIN jogadores j ON j.id = pr.jogador_id
                    WHERE pr.rodada_id = {$rid} AND pr.tipo_premio = 'pe_de_rato_rodada'
                    LIMIT 1
                ")->fetch(PDO::FETCH_ASSOC) ?: null;

                $artilheiroRodada = $pdo->query("
                    SELECT j.nome, j.foto_url, pr.pontuacao as total, pr.tipo_premio
                    FROM premios_rodada pr
                    JOIN jogadores j ON j.id = pr.jogador_id
                    WHERE pr.rodada_id = {$rid} AND pr.tipo_premio = 'artilheiro_rodada'
                    LIMIT 1
                ")->fetch(PDO::FETCH_ASSOC) ?: null;

                $garcomRodada = $pdo->query("
                    SELECT j.nome, j.foto_url, pr.pontuacao as total, pr.tipo_premio
                    FROM premios_rodada pr
                    JOIN jogadores j ON j.id = pr.jogador_id
                    WHERE pr.rodada_id = {$rid} AND pr.tipo_premio = 'garcom_rodada'
                    LIMIT 1
                ")->fetch(PDO::FETCH_ASSOC) ?: null;

                $goleiroRodada = $pdo->query("
                    SELECT j.nome, j.foto_url, pr.pontuacao as total, pr.tipo_premio
                    FROM premios_rodada pr
                    JOIN jogadores j ON j.id = pr.jogador_id
                    WHERE pr.rodada_id = {$rid} AND pr.tipo_premio = 'melhor_goleiro_rodada'
                    LIMIT 1
                ")->fetch(PDO::FETCH_ASSOC) ?: null;

                $zagueiroRodada = $pdo->query("
                    SELECT j.nome, j.foto_url, pr.pontuacao as total, pr.tipo_premio
                    FROM premios_rodada pr
                    JOIN jogadores j ON j.id = pr.jogador_id
                    WHERE pr.rodada_id = {$rid} AND pr.tipo_premio = 'melhor_zagueiro_rodada'
                    LIMIT 1
                ")->fetch(PDO::FETCH_ASSOC) ?: null;
            }

            http_response_code(200);
            echo json_encode([
                'totais' => [
                    'total_gols'        => $totalGols,
                    'total_assistencias'=> $totalAssists,
                    'total_jogadores'   => $totalJogs,
                    'total_jogos'       => $totalPartidas,
                ],
                'rankings' => [
                    'artilheiros' => $artilheiros,
                    'garcons'     => $garcons,
                ],
                'ultimaRodada' => [
                    'mvp'           => $mvpRodada,
                    'peDeRato'      => $peDeRatoRodada,
                    'artilheiro'    => $artilheiroRodada ?? null,
                    'garcom'        => $garcomRodada ?? null,
                    'melhorGoleiro' => $goleiroRodada ?? null,
                    'melhorZagueiro'=> $zagueiroRodada ?? null,
                ],
            ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        } catch (\Exception $e) {
            http_response_code(200);
            echo json_encode([
                'totais' => ['total_gols'=>0,'total_assistencias'=>0,'total_jogadores'=>0,'total_jogos'=>0],
                'rankings'=>[],
                'ultimaRodada'=>['mvp'=>null,'peDeRato'=>null],
                'debug'=>$e->getMessage()
            ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        }
    }
}
