<?php
/**
 * Arquivo: src/services/StatsService.php
 *
 * Serviço de estatísticas do FutLendas (produção).
 * Delega cálculos de pontuação para Pontos.php (source of truth).
 */

require_once __DIR__ . '/../utils/Pontos.php';

class StatsService
{
    private $db;

    public function __construct(Database $db)
    {
        $this->db = $db;
    }

    // =========================================================
    // FRAGMENTOS SQL REUTILIZÁVEIS
    // =========================================================

    /** Vitória: time do jogador venceu */
    private function sqlVitoria(string $ep = 'ep', string $cp = 'cp'): string
    {
        return "CASE WHEN ({$ep}.time_id = {$cp}.timeA_id AND {$cp}.placar_timeA > {$cp}.placar_timeB)
                       OR ({$ep}.time_id = {$cp}.timeB_id AND {$cp}.placar_timeB > {$cp}.placar_timeA)
                     THEN 1 ELSE 0 END";
    }

    /** Empate */
    private function sqlEmpate(string $cp = 'cp'): string
    {
        return "CASE WHEN {$cp}.placar_timeA = {$cp}.placar_timeB THEN 1 ELSE 0 END";
    }

    /** Derrota */
    private function sqlDerrota(string $ep = 'ep', string $cp = 'cp'): string
    {
        return "CASE WHEN ({$ep}.time_id = {$cp}.timeA_id AND {$cp}.placar_timeA < {$cp}.placar_timeB)
                       OR ({$ep}.time_id = {$cp}.timeB_id AND {$cp}.placar_timeB < {$cp}.placar_timeA)
                     THEN 1 ELSE 0 END";
    }

    /** Clean sheet: time do jogador não sofreu gol */
    private function sqlCleanSheet(string $ep = 'ep', string $cp = 'cp'): string
    {
        return "CASE WHEN ({$ep}.time_id = {$cp}.timeA_id AND {$cp}.placar_timeB = 0)
                       OR ({$ep}.time_id = {$cp}.timeB_id AND {$cp}.placar_timeA = 0)
                     THEN 1 ELSE 0 END";
    }

    /**
     * Fragmento SQL de pontuação por partida.
     * Delega para Pontos::sqlPontosPartida() — source of truth.
     */
    private function sqlPontuacao(string $ep = 'ep', string $cp = 'cp', string $j = 'j'): string
    {
        return Pontos::sqlPontosPartida($ep, $cp, $j);
    }

    // =========================================================
    // MÉTODOS PÚBLICOS
    // =========================================================

    /**
     * Estatísticas individuais de um jogador (por campeonato ou global).
     */
    public function getPlayerStats(int $jogadorId, ?int $campeonatoId = null): array
    {
        $where = $campeonatoId
            ? "AND cp.campeonato_id = ?"
            : "";
        $params = $campeonatoId
            ? [$jogadorId, $campeonatoId]
            : [$jogadorId];

        $sqlVit = $this->sqlVitoria();
        $sqlEmp = $this->sqlEmpate();
        $sqlDer = $this->sqlDerrota();
        $sqlCS  = $this->sqlCleanSheet();
        $sqlPts = $this->sqlPontuacao();

        $row = $this->db->fetchOne("
            SELECT
                ep.jogador_id,
                j.nome,
                j.foto_url,
                j.joga_recuado,
                COUNT(DISTINCT ep.partida_id)   AS jogos,
                SUM(ep.gols)                    AS gols,
                SUM(ep.assistencias)            AS assistencias,
                SUM({$sqlVit})                  AS vitorias,
                SUM({$sqlEmp})                  AS empates,
                SUM({$sqlDer})                  AS derrotas,
                SUM({$sqlCS})                   AS clean_sheets,
                ROUND(SUM({$sqlPts}), 1)        AS pontos
            FROM campeonato_estatisticas_partida ep
            JOIN campeonato_partidas cp ON cp.id = ep.partida_id AND cp.status = 'finalizada' {$where}
            JOIN jogadores j ON j.id = ep.jogador_id
            WHERE ep.jogador_id = ?
            GROUP BY ep.jogador_id, j.nome, j.foto_url, j.joga_recuado
        ", array_merge($params));

        return $row ?: [];
    }

    /**
     * Ranking de artilheiros (por campeonato ou global).
     */
    public function getArtilheiros(?int $campeonatoId = null, int $limit = 20): array
    {
        $where  = $campeonatoId ? "AND cp.campeonato_id = ?" : "";
        $params = $campeonatoId ? [$campeonatoId] : [];

        return $this->db->fetchAll("
            SELECT j.id, j.nome, j.foto_url,
                   SUM(ep.gols) AS gols,
                   COUNT(DISTINCT ep.partida_id) AS jogos
            FROM campeonato_estatisticas_partida ep
            JOIN campeonato_partidas cp ON cp.id = ep.partida_id AND cp.status = 'finalizada' {$where}
            JOIN jogadores j ON j.id = ep.jogador_id
            GROUP BY j.id, j.nome, j.foto_url
            HAVING gols > 0
            ORDER BY gols DESC, jogos ASC
            LIMIT {$limit}
        ", $params);
    }

    /**
     * Ranking de garçons/assistências (por campeonato ou global).
     */
    public function getGarcons(?int $campeonatoId = null, int $limit = 20): array
    {
        $where  = $campeonatoId ? "AND cp.campeonato_id = ?" : "";
        $params = $campeonatoId ? [$campeonatoId] : [];

        return $this->db->fetchAll("
            SELECT j.id, j.nome, j.foto_url,
                   SUM(ep.assistencias) AS assistencias,
                   COUNT(DISTINCT ep.partida_id) AS jogos
            FROM campeonato_estatisticas_partida ep
            JOIN campeonato_partidas cp ON cp.id = ep.partida_id AND cp.status = 'finalizada' {$where}
            JOIN jogadores j ON j.id = ep.jogador_id
            GROUP BY j.id, j.nome, j.foto_url
            HAVING assistencias > 0
            ORDER BY assistencias DESC, jogos ASC
            LIMIT {$limit}
        ", $params);
    }

    /**
     * Estatísticas de um goleiro específico.
     */
    public function getGoleiroStats(int $jogadorId, ?int $campeonatoId = null): ?array
    {
        $where  = $campeonatoId ? "AND cp.campeonato_id = ?" : "";
        $params = $campeonatoId ? [$jogadorId, $jogadorId, $campeonatoId] : [$jogadorId, $jogadorId];

        $row = $this->db->fetchOne("
            SELECT j.id, j.nome, j.foto_url,
                   COUNT(DISTINCT cp.id) AS jogos,
                   SUM(CASE WHEN cp.goleiro_timeA_id = j.id THEN cp.placar_timeB
                            WHEN cp.goleiro_timeB_id = j.id THEN cp.placar_timeA
                            ELSE 0 END) AS gols_sofridos,
                   SUM(CASE WHEN (cp.goleiro_timeA_id = j.id AND cp.placar_timeB = 0)
                              OR (cp.goleiro_timeB_id = j.id AND cp.placar_timeA = 0)
                            THEN 1 ELSE 0 END) AS clean_sheets,
                   ROUND(
                       SUM(CASE WHEN cp.goleiro_timeA_id = j.id THEN cp.placar_timeB
                                WHEN cp.goleiro_timeB_id = j.id THEN cp.placar_timeA
                                ELSE 0 END)
                       / NULLIF(COUNT(DISTINCT cp.id), 0), 2
                   ) AS media_gols_sofridos
            FROM campeonato_partidas cp
            JOIN jogadores j ON j.id IN (cp.goleiro_timeA_id, cp.goleiro_timeB_id)
            WHERE cp.status = 'finalizada'
              AND (cp.goleiro_timeA_id = ? OR cp.goleiro_timeB_id = ?)
              {$where}
            GROUP BY j.id, j.nome, j.foto_url
        ", $params);

        return $row ?: null;
    }

    /**
     * Ranking geral de goleiros (por clean sheets).
     */
    public function getGoleiroRanking(?int $campeonatoId = null, int $limit = 10): array
    {
        $where  = $campeonatoId ? "AND cp.campeonato_id = ?" : "";
        $params = $campeonatoId ? [$campeonatoId] : [];

        return $this->db->fetchAll("
            SELECT j.id, j.nome, j.foto_url,
                   COUNT(DISTINCT cp.id) AS jogos,
                   SUM(CASE WHEN (cp.goleiro_timeA_id = j.id AND cp.placar_timeB = 0)
                              OR (cp.goleiro_timeB_id = j.id AND cp.placar_timeA = 0)
                            THEN 1 ELSE 0 END) AS clean_sheets,
                   ROUND(
                       SUM(CASE WHEN cp.goleiro_timeA_id = j.id THEN cp.placar_timeB
                                WHEN cp.goleiro_timeB_id = j.id THEN cp.placar_timeA
                                ELSE 0 END)
                       / NULLIF(COUNT(DISTINCT cp.id), 0), 2
                   ) AS media_gols_sofridos
            FROM campeonato_partidas cp
            JOIN jogadores j ON j.id IN (cp.goleiro_timeA_id, cp.goleiro_timeB_id)
            WHERE cp.status = 'finalizada' AND j.id IS NOT NULL
              {$where}
            GROUP BY j.id, j.nome, j.foto_url
            ORDER BY clean_sheets DESC, media_gols_sofridos ASC
            LIMIT {$limit}
        ", $params);
    }

    /**
     * Goleiros agrupados por time.
     */
    public function getGoleiroPorTime(?int $campeonatoId = null): array
    {
        $where  = $campeonatoId ? "AND cp.campeonato_id = ?" : "";
        $params = $campeonatoId ? [$campeonatoId] : [];

        return $this->db->fetchAll("
            SELECT t.id AS time_id, t.nome AS time_nome, t.logo_url AS time_logo,
                   j.id AS jogador_id, j.nome, j.foto_url,
                   COUNT(DISTINCT cp.id) AS jogos
            FROM campeonato_partidas cp
            JOIN jogadores j ON j.id IN (cp.goleiro_timeA_id, cp.goleiro_timeB_id)
            JOIN times t ON (cp.goleiro_timeA_id = j.id AND t.id = cp.timeA_id)
                         OR (cp.goleiro_timeB_id = j.id AND t.id = cp.timeB_id)
            WHERE cp.status = 'finalizada' AND j.id IS NOT NULL
              {$where}
            GROUP BY t.id, t.nome, t.logo_url, j.id, j.nome, j.foto_url
            ORDER BY t.nome, jogos DESC
        ", $params);
    }

    /**
     * Totais globais: partidas, gols, jogadores, campeonatos, times, média de gols.
     */
    public function getTotaisGlobais(): array
    {
        $totalPartidas = (int)($this->db->fetchOne(
            "SELECT COUNT(*) AS n FROM campeonato_partidas WHERE status = 'finalizada'"
        )['n'] ?? 0);

        $totalGols = (int)($this->db->fetchOne(
            "SELECT COALESCE(SUM(gols),0) AS n
             FROM campeonato_estatisticas_partida ep
             JOIN campeonato_partidas cp ON cp.id = ep.partida_id
             WHERE cp.status = 'finalizada'"
        )['n'] ?? 0);

        $totalJogadores = (int)($this->db->fetchOne(
            "SELECT COUNT(DISTINCT id) AS n FROM jogadores"
        )['n'] ?? 0);

        $totalCampeonatos = (int)($this->db->fetchOne(
            "SELECT COUNT(*) AS n FROM campeonatos"
        )['n'] ?? 0);

        $totalTimes = (int)($this->db->fetchOne(
            "SELECT COUNT(*) AS n FROM times"
        )['n'] ?? 0);

        $mgRow = $this->db->fetchOne(
            "SELECT SUM(ep.gols) / NULLIF(COUNT(DISTINCT ep.partida_id), 0) AS mg
             FROM campeonato_estatisticas_partida ep
             JOIN campeonato_partidas cp ON cp.id = ep.partida_id
             WHERE cp.status = 'finalizada'"
        );

        return [
            'total_partidas'    => $totalPartidas,
            'total_gols'        => $totalGols,
            'total_jogadores'   => $totalJogadores,
            'total_campeonatos' => $totalCampeonatos,
            'total_times'       => $totalTimes,
            'media_gols'        => round((float)($mgRow['mg'] ?? 0), 2),
        ];
    }

    /**
     * Ranking de prêmios por tipo.
     * Usa nomes de tipo_premio de produção.
     *
     * Rodada: 'mvp_rodada', 'artilheiro_rodada', 'garcom_rodada',
     *         'melhor_goleiro_rodada', 'melhor_zagueiro_rodada', 'pe_de_rato_rodada'
     * Campeonato: 'mvp', 'artilheiro', 'garcom',
     *             'melhor_goleiro', 'melhor_zagueiro', 'pe_de_rato'
     */
    public function getPremiosRanking(string $tipoPremio, string $escopo = 'rodada', int $limit = 10): array
    {
        if ($escopo === 'rodada') {
            $validTypes = ['mvp_rodada', 'artilheiro_rodada', 'garcom_rodada',
                           'melhor_goleiro_rodada', 'melhor_zagueiro_rodada', 'pe_de_rato_rodada'];
            if (!in_array($tipoPremio, $validTypes, true)) {
                return [];
            }
            return $this->db->fetchAll("
                SELECT j.id, j.nome, j.foto_url, COUNT(*) AS total
                FROM premios_rodada pr
                JOIN jogadores j ON j.id = pr.jogador_id
                WHERE pr.tipo_premio = ?
                GROUP BY j.id, j.nome, j.foto_url
                ORDER BY total DESC
                LIMIT {$limit}
            ", [$tipoPremio]);
        }

        // escopo = campeonato
        $validTypes = ['mvp', 'artilheiro', 'garcom',
                       'melhor_goleiro', 'melhor_zagueiro', 'pe_de_rato'];
        if (!in_array($tipoPremio, $validTypes, true)) {
            return [];
        }
        return $this->db->fetchAll("
            SELECT j.id, j.nome, j.foto_url, COUNT(*) AS total
            FROM campeonato_premios cp2
            JOIN jogadores j ON j.id = cp2.jogador_id
            WHERE cp2.tipo_premio = ?
            GROUP BY j.id, j.nome, j.foto_url
            ORDER BY total DESC
            LIMIT {$limit}
        ", [$tipoPremio]);
    }

    /**
     * Destaques da última rodada que teve prêmios atribuídos.
     * Usa tipo_premio de produção: 'mvp_rodada', 'pe_de_rato_rodada',
     *   'artilheiro_rodada', 'garcom_rodada', 'melhor_goleiro_rodada', 'melhor_zagueiro_rodada'
     */
    public function getDestaquesUltimaRodada(): array
    {
        $ultimaRodada = $this->db->fetchOne("
            SELECT pr.rodada_id
            FROM premios_rodada pr
            JOIN rodadas r ON r.id = pr.rodada_id
            ORDER BY r.data DESC, r.id DESC
            LIMIT 1
        ");

        $rodadaId = $ultimaRodada['rodada_id'] ?? null;
        if (!$rodadaId) {
            return [
                'rodada_id'   => null,
                'mvp'         => null,
                'pe_de_rato'  => null,
                'artilheiro'  => null,
                'garcom'      => null,
                'goleiro'     => null,
                'zagueiro'    => null,
            ];
        }

        $fetchPremio = function (string $tipo) use ($rodadaId) {
            return $this->db->fetchOne("
                SELECT j.id, j.nome, j.foto_url, pr.pontuacao AS total
                FROM premios_rodada pr
                JOIN jogadores j ON j.id = pr.jogador_id
                WHERE pr.rodada_id = ? AND pr.tipo_premio = ?
                LIMIT 1
            ", [$rodadaId, $tipo]) ?: null;
        };

        return [
            'rodada_id'   => (int)$rodadaId,
            'mvp'         => $fetchPremio('mvp_rodada'),
            'pe_de_rato'  => $fetchPremio('pe_de_rato_rodada'),
            'artilheiro'  => $fetchPremio('artilheiro_rodada'),
            'garcom'      => $fetchPremio('garcom_rodada'),
            'goleiro'     => $fetchPremio('melhor_goleiro_rodada'),
            'zagueiro'    => $fetchPremio('melhor_zagueiro_rodada'),
        ];
    }

    /**
     * Pontos de cada jogador em uma rodada específica.
     */
    public function getPontosRodada(int $rodadaId): array
    {
        $sqlPts = $this->sqlPontuacao();

        return $this->db->fetchAll("
            SELECT
                ep.jogador_id,
                j.nome,
                j.foto_url,
                j.joga_recuado,
                SUM(ep.gols)          AS gols,
                SUM(ep.assistencias)  AS assistencias,
                SUM({$this->sqlVitoria()})   AS vitorias,
                SUM({$this->sqlEmpate()})    AS empates,
                SUM({$this->sqlDerrota()})   AS derrotas,
                SUM({$this->sqlCleanSheet()}) AS clean_sheets,
                ROUND(SUM({$sqlPts}), 1)     AS pontos
            FROM campeonato_estatisticas_partida ep
            JOIN campeonato_partidas cp ON cp.id = ep.partida_id AND cp.status = 'finalizada'
            JOIN jogadores j ON j.id = ep.jogador_id
            WHERE cp.rodada_id = ?
            GROUP BY ep.jogador_id, j.nome, j.foto_url, j.joga_recuado
            ORDER BY pontos DESC
        ", [$rodadaId]);
    }

    /**
     * Melhor dupla (mais gols juntos, mais jogos juntos, mais vitórias juntas).
     */
    public function getMelhorDupla(string $tipo = 'conexao'): ?array
    {
        switch ($tipo) {
            case 'conexao':
                // Dupla com mais gols + assistência entre si
                return $this->db->fetchOne("
                    SELECT
                        ja.id AS artilheiro_id, ja.nome AS artilheiro_nome, ja.foto_url AS artilheiro_foto,
                        jb.id AS garcom_id,     jb.nome AS garcom_nome,     jb.foto_url AS garcom_foto,
                        COUNT(*) AS total
                    FROM campeonato_eventos_partida ev
                    JOIN campeonato_partidas cp ON cp.id = ev.partida_id AND cp.status = 'finalizada'
                    JOIN jogadores ja ON ja.id = ev.jogador_id
                    JOIN jogadores jb ON jb.id = ev.assist_por_jogador_id
                    WHERE ev.tipo = 'gol' AND ev.assist_por_jogador_id IS NOT NULL
                    GROUP BY ev.jogador_id, ev.assist_por_jogador_id
                    ORDER BY total DESC LIMIT 1
                ") ?: null;

            case 'inseparavel':
                // Dupla com mais jogos juntos no mesmo time
                return $this->db->fetchOne("
                    SELECT
                        j1.id AS jogador1_id, j1.nome AS jogador1_nome, j1.foto_url AS jogador1_foto,
                        j2.id AS jogador2_id, j2.nome AS jogador2_nome, j2.foto_url AS jogador2_foto,
                        COUNT(DISTINCT ep1.partida_id) AS total
                    FROM campeonato_estatisticas_partida ep1
                    JOIN campeonato_estatisticas_partida ep2
                        ON ep2.partida_id = ep1.partida_id
                       AND ep2.time_id = ep1.time_id
                       AND ep2.jogador_id > ep1.jogador_id
                    JOIN campeonato_partidas cp ON cp.id = ep1.partida_id AND cp.status = 'finalizada'
                    JOIN jogadores j1 ON j1.id = ep1.jogador_id
                    JOIN jogadores j2 ON j2.id = ep2.jogador_id
                    GROUP BY ep1.jogador_id, ep2.jogador_id
                    ORDER BY total DESC LIMIT 1
                ") ?: null;

            case 'vencedora':
                // Dupla com mais vitórias juntos
                $sqlVit = $this->sqlVitoria('ep1', 'cp');
                return $this->db->fetchOne("
                    SELECT
                        j1.id AS jogador1_id, j1.nome AS jogador1_nome, j1.foto_url AS jogador1_foto,
                        j2.id AS jogador2_id, j2.nome AS jogador2_nome, j2.foto_url AS jogador2_foto,
                        SUM({$sqlVit}) AS total
                    FROM campeonato_estatisticas_partida ep1
                    JOIN campeonato_estatisticas_partida ep2
                        ON ep2.partida_id = ep1.partida_id
                       AND ep2.time_id = ep1.time_id
                       AND ep2.jogador_id > ep1.jogador_id
                    JOIN campeonato_partidas cp ON cp.id = ep1.partida_id AND cp.status = 'finalizada'
                    JOIN jogadores j1 ON j1.id = ep1.jogador_id
                    JOIN jogadores j2 ON j2.id = ep2.jogador_id
                    GROUP BY ep1.jogador_id, ep2.jogador_id
                    ORDER BY total DESC LIMIT 1
                ") ?: null;

            default:
                return null;
        }
    }

    /**
     * Recordes de partida: mais gols em um jogo, mais assists, show completo.
     */
    public function getRecordes(): array
    {
        $hatTrickKing = $this->db->fetchOne("
            SELECT j.id, j.nome, j.foto_url, ep.gols AS recorde, c.nome AS campeonato_nome
            FROM campeonato_estatisticas_partida ep
            JOIN campeonato_partidas cp ON cp.id = ep.partida_id AND cp.status = 'finalizada'
            JOIN jogadores j ON j.id = ep.jogador_id
            LEFT JOIN campeonatos c ON c.id = cp.campeonato_id
            ORDER BY ep.gols DESC LIMIT 1
        ") ?: null;

        $assistenteReal = $this->db->fetchOne("
            SELECT j.id, j.nome, j.foto_url, ep.assistencias AS recorde, c.nome AS campeonato_nome
            FROM campeonato_estatisticas_partida ep
            JOIN campeonato_partidas cp ON cp.id = ep.partida_id AND cp.status = 'finalizada'
            JOIN jogadores j ON j.id = ep.jogador_id
            LEFT JOIN campeonatos c ON c.id = cp.campeonato_id
            ORDER BY ep.assistencias DESC LIMIT 1
        ") ?: null;

        $showCompleto = $this->db->fetchOne("
            SELECT j.id, j.nome, j.foto_url, ep.gols, ep.assistencias,
                   (ep.gols + ep.assistencias) AS recorde, c.nome AS campeonato_nome
            FROM campeonato_estatisticas_partida ep
            JOIN campeonato_partidas cp ON cp.id = ep.partida_id AND cp.status = 'finalizada'
            JOIN jogadores j ON j.id = ep.jogador_id
            LEFT JOIN campeonatos c ON c.id = cp.campeonato_id
            ORDER BY recorde DESC LIMIT 1
        ") ?: null;

        return [
            'hatTrickKing'   => $hatTrickKing,
            'assistenteReal' => $assistenteReal,
            'showCompleto'   => $showCompleto,
        ];
    }

    /**
     * Evolução de gols por campeonato (timeline).
     */
    public function getEvolucaoGols(): array
    {
        return $this->db->fetchAll("
            SELECT c.id AS campeonato_id, c.nome AS campeonato_nome,
                   SUM(ep.gols) AS total_gols,
                   COUNT(DISTINCT cp.id) AS total_partidas,
                   ROUND(SUM(ep.gols) / NULLIF(COUNT(DISTINCT cp.id), 0), 2) AS media_gols
            FROM campeonato_estatisticas_partida ep
            JOIN campeonato_partidas cp ON cp.id = ep.partida_id AND cp.status = 'finalizada'
            JOIN campeonatos c ON c.id = cp.campeonato_id
            GROUP BY c.id, c.nome
            ORDER BY c.id ASC
        ");
    }

    /**
     * Participações decisivas (gols + assistências) — ranking.
     */
    public function getParticipacoes(?int $campeonatoId = null, int $limit = 20): array
    {
        $where  = $campeonatoId ? "AND cp.campeonato_id = ?" : "";
        $params = $campeonatoId ? [$campeonatoId] : [];

        return $this->db->fetchAll("
            SELECT j.id, j.nome, j.foto_url,
                   SUM(ep.gols + ep.assistencias) AS participacoes,
                   SUM(ep.gols) AS gols,
                   SUM(ep.assistencias) AS assistencias,
                   COUNT(DISTINCT ep.partida_id) AS jogos
            FROM campeonato_estatisticas_partida ep
            JOIN campeonato_partidas cp ON cp.id = ep.partida_id AND cp.status = 'finalizada' {$where}
            JOIN jogadores j ON j.id = ep.jogador_id
            GROUP BY j.id, j.nome, j.foto_url
            HAVING participacoes > 0
            ORDER BY participacoes DESC, jogos ASC
            LIMIT {$limit}
        ", $params);
    }

    /**
     * Ranking de zagueiros/jogadores recuados (por clean sheets e aproveitamento).
     */
    public function getZagueiros(?int $campeonatoId = null, int $limit = 10): array
    {
        $where  = $campeonatoId ? "AND cp.campeonato_id = ?" : "";
        $params = $campeonatoId ? [$campeonatoId] : [];

        $sqlCS  = $this->sqlCleanSheet();
        $sqlVit = $this->sqlVitoria();

        return $this->db->fetchAll("
            SELECT j.id, j.nome, j.foto_url,
                   COUNT(DISTINCT ep.partida_id) AS jogos,
                   SUM({$sqlCS})  AS clean_sheets,
                   SUM({$sqlVit}) AS vitorias
            FROM campeonato_estatisticas_partida ep
            JOIN campeonato_partidas cp ON cp.id = ep.partida_id AND cp.status = 'finalizada' {$where}
            JOIN jogadores j ON j.id = ep.jogador_id
            WHERE j.joga_recuado = 1
            GROUP BY j.id, j.nome, j.foto_url
            ORDER BY clean_sheets DESC, vitorias DESC
            LIMIT {$limit}
        ", $params);
    }

    /**
     * Score Lendário (G.O.A.T.) — ranking completo com performance + títulos + prêmios.
     * Calcula em PHP para respeitar a mesma lógica de Pontos.php.
     */
    public function getScoreLendario(int $limit = 50): array
    {
        $sqlBonusRod  = Pontos::sqlSubqueryBonusRodada('ep.jogador_id');
        $sqlBonusCamp = Pontos::sqlSubqueryBonusCampeonato('ep.jogador_id');

        $sqlVit = $this->sqlVitoria('ep', 'part');
        $sqlEmp = $this->sqlEmpate('part');
        $sqlDer = $this->sqlDerrota('ep', 'part');
        $sqlCS  = $this->sqlCleanSheet('ep', 'part');

        $rows = $this->db->fetchAll("
            SELECT
                ep.jogador_id AS id,
                j.nome,
                j.foto_url,
                j.joga_recuado,
                COUNT(DISTINCT ep.partida_id) AS total_jogos,
                SUM(ep.gols)                  AS total_gols,
                SUM(ep.assistencias)          AS total_assists,
                SUM({$sqlVit})                AS vitorias,
                SUM({$sqlEmp})                AS empates,
                SUM({$sqlDer})                AS derrotas,
                SUM({$sqlCS})                 AS clean_sheets,
                (SELECT COUNT(*) FROM campeonato_partidas gp
                 WHERE gp.status = 'finalizada'
                   AND (gp.goleiro_timeA_id = ep.jogador_id OR gp.goleiro_timeB_id = ep.jogador_id)
                ) AS total_como_goleiro,
                {$sqlBonusRod}  AS pts_premios_rodada,
                {$sqlBonusCamp} AS pts_premios_camp,
                (SELECT COUNT(*) FROM campeonato_vencedores cv
                 WHERE cv.jogador_id = ep.jogador_id) AS qtd_titulos
            FROM campeonato_estatisticas_partida ep
            JOIN campeonato_partidas part ON part.id = ep.partida_id AND part.status = 'finalizada'
            JOIN jogadores j ON j.id = ep.jogador_id
            GROUP BY ep.jogador_id, j.nome, j.foto_url, j.joga_recuado
        ");

        foreach ($rows as &$row) {
            $gols      = (int)$row['total_gols'];
            $assists   = (int)$row['total_assists'];
            $cs        = (int)$row['clean_sheets'];
            $vitorias  = (int)$row['vitorias'];
            $empates   = (int)$row['empates'];
            $derrotas  = (int)$row['derrotas'];
            $isRecuado = (int)$row['joga_recuado'] === 1;
            $isGoleiro = (int)$row['total_como_goleiro'] > 0;

            if ($isRecuado || $isGoleiro) {
                $ptsPerformance = Pontos::calcularJogadorRecuado($cs, $vitorias, $empates, $derrotas);
            } else {
                $ptsPerformance = Pontos::calcularJogadorLinha($gols, $assists, $cs, $vitorias, $empates, $derrotas);
            }

            $ptsTitulos = (int)$row['qtd_titulos'] * Pontos::TITULO_PONTOS_CORRIDOS;

            $score = $ptsPerformance
                   + $ptsTitulos
                   + (float)($row['pts_premios_rodada'] ?? 0)
                   + (float)($row['pts_premios_camp'] ?? 0);

            $row['score_lendario']  = round($score, 1);
            $row['pts_performance'] = round($ptsPerformance, 1);
            $row['pts_titulos']     = $ptsTitulos;
            $row['total_jogos']     = (int)$row['total_jogos'];
            $row['total_gols']      = $gols;
            $row['total_assists']   = $assists;
            $row['qtd_titulos']     = (int)$row['qtd_titulos'];
        }
        unset($row);

        // Ordena por score_lendario DESC
        usort($rows, fn($a, $b) => $b['score_lendario'] <=> $a['score_lendario']);

        return array_slice($rows, 0, $limit);
    }

    // =========================================================
    // RANKINGS POR CAMPEONATO (usados em CampeonatoController)
    // =========================================================

    /**
     * Ranking de jogadores de linha em um campeonato.
     * Usa Pontos::sqlPontosPartida() — source of truth.
     * Não exclui goleiros globalmente: sqlPontosPartida detecta per-match.
     */
    public function getJogadoresLinhaRanking(int $campeonatoId, ?int $rodadaId = null): array
    {
        $whereRodada = $rodadaId ? "AND cp.rodada_id = ?" : "";
        $params      = $rodadaId ? [$campeonatoId, $rodadaId] : [$campeonatoId];

        $sqlPts = $this->sqlPontuacao();
        $sqlVit = $this->sqlVitoria();
        $sqlEmp = $this->sqlEmpate();
        $sqlDer = $this->sqlDerrota();
        $sqlCS  = $this->sqlCleanSheet();

        return $this->db->fetchAll("
            SELECT
                j.id, j.nome, j.foto_url, j.posicao,
                t.id   AS time_id,
                t.nome AS time_nome,
                COALESCE(SUM(ep.gols), 0)         AS gols,
                COALESCE(SUM(ep.assistencias), 0)  AS assistencias,
                COALESCE(SUM(ep.clean_sheet), 0)   AS clean_sheets,
                COALESCE(SUM(ep.gols_contra), 0)   AS gols_contra,
                COUNT(DISTINCT ep.partida_id)      AS jogos,
                SUM({$sqlVit})  AS vitorias,
                SUM({$sqlEmp})  AS empates,
                SUM({$sqlDer})  AS derrotas,
                ROUND(SUM({$sqlPts}), 2) AS pontos
            FROM campeonato_estatisticas_partida ep
            JOIN campeonato_partidas cp ON cp.id = ep.partida_id
                AND cp.campeonato_id = ?
                AND cp.status = 'finalizada'
                {$whereRodada}
            JOIN jogadores j ON j.id = ep.jogador_id
            JOIN times t ON t.id = ep.time_id
            WHERE ep.jogador_id NOT IN (
                SELECT DISTINCT goleiro_timeA_id FROM campeonato_partidas
                WHERE campeonato_id = ? AND goleiro_timeA_id IS NOT NULL
                UNION
                SELECT DISTINCT goleiro_timeB_id FROM campeonato_partidas
                WHERE campeonato_id = ? AND goleiro_timeB_id IS NOT NULL
            )
            GROUP BY j.id, j.nome, j.foto_url, j.posicao, t.id, t.nome
            ORDER BY pontos DESC, gols DESC
        ", array_merge($params, [$campeonatoId, $campeonatoId]));
    }

    /**
     * Ranking de goleiros em um campeonato.
     * Consolidado por jogador (sem duplicar por time).
     * Identifica goleiros per-match via goleiro_timeA_id/goleiro_timeB_id.
     */
    public function getGoleirosRankingCampeonato(int $campeonatoId, ?int $rodadaId = null): array
    {
        $whereRodada = $rodadaId ? "AND cp.rodada_id = ?" : "";
        $params      = $rodadaId ? [$campeonatoId, $rodadaId] : [$campeonatoId];

        $pCS = Pontos::CLEAN_SHEET;
        $pV  = Pontos::VITORIAS;
        $pE  = Pontos::EMPATES;
        $pD  = Pontos::DERROTAS;

        return $this->db->fetchAll("
            SELECT
                j.id, j.nome, j.foto_url,
                'goleiro' AS posicao,
                COUNT(DISTINCT ep.partida_id) AS jogos,
                COALESCE(SUM(ep.clean_sheet), 0) AS clean_sheets,
                SUM(CASE
                    WHEN cp.goleiro_timeA_id = ep.jogador_id THEN cp.placar_timeB
                    WHEN cp.goleiro_timeB_id = ep.jogador_id THEN cp.placar_timeA
                    ELSE 0 END) AS gols_sofridos,
                ROUND(SUM(
                    CASE WHEN cp.goleiro_timeA_id = ep.jogador_id THEN cp.placar_timeB
                         WHEN cp.goleiro_timeB_id = ep.jogador_id THEN cp.placar_timeA
                         ELSE 0 END
                ) / NULLIF(COUNT(DISTINCT ep.partida_id), 0), 2) AS media_gols,
                SUM({$this->sqlVitoria()})  AS vitorias,
                SUM({$this->sqlEmpate()})   AS empates,
                SUM({$this->sqlDerrota()})  AS derrotas,
                ROUND(
                    SUM(ep.clean_sheet * {$pCS}
                        + CASE WHEN ({$this->sqlVitoria()}) = 1 THEN {$pV}
                               WHEN ({$this->sqlEmpate()})  = 1 THEN {$pE}
                               ELSE {$pD} END)
                , 2) AS pontos
            FROM campeonato_estatisticas_partida ep
            JOIN campeonato_partidas cp ON cp.id = ep.partida_id
                AND cp.campeonato_id = ?
                AND cp.status = 'finalizada'
                AND (cp.goleiro_timeA_id = ep.jogador_id OR cp.goleiro_timeB_id = ep.jogador_id)
                {$whereRodada}
            JOIN jogadores j ON j.id = ep.jogador_id
            GROUP BY j.id, j.nome, j.foto_url
            ORDER BY pontos DESC, clean_sheets DESC
        ", $params);
    }

    /**
     * Ranking de zagueiros/recuados em um campeonato.
     * Usa mesma fórmula de pontos recuado (CS + V/E/D).
     */
    public function getZagueirosRanking(int $campeonatoId, ?int $rodadaId = null): array
    {
        $whereRodada = $rodadaId ? "AND cp.rodada_id = ?" : "";
        $params      = $rodadaId ? [$campeonatoId, $rodadaId] : [$campeonatoId];

        $pCS = Pontos::CLEAN_SHEET;
        $pV  = Pontos::VITORIAS;
        $pE  = Pontos::EMPATES;
        $pD  = Pontos::DERROTAS;

        $sqlCS  = $this->sqlCleanSheet();
        $sqlVit = $this->sqlVitoria();
        $sqlEmp = $this->sqlEmpate();
        $sqlDer = $this->sqlDerrota();

        return $this->db->fetchAll("
            SELECT
                j.id, j.nome, j.foto_url,
                t.id   AS time_id,
                t.nome AS time_nome,
                COALESCE(SUM(ep.gols), 0)         AS gols,
                COALESCE(SUM(ep.assistencias), 0)  AS assistencias,
                COALESCE(SUM(ep.clean_sheet), 0)   AS clean_sheets,
                COUNT(DISTINCT ep.partida_id)      AS jogos,
                SUM({$sqlVit}) AS vitorias,
                SUM({$sqlEmp}) AS empates,
                SUM({$sqlDer}) AS derrotas,
                ROUND(
                    SUM(
                        ({$sqlCS}) * {$pCS}
                      + (CASE WHEN ({$sqlVit}) = 1 THEN {$pV}
                              WHEN ({$sqlEmp}) = 1 THEN {$pE}
                              ELSE {$pD} END)
                    )
                , 2) AS pontos
            FROM campeonato_estatisticas_partida ep
            JOIN campeonato_partidas cp ON cp.id = ep.partida_id
                AND cp.campeonato_id = ?
                AND cp.status = 'finalizada'
                {$whereRodada}
            JOIN jogadores j ON j.id = ep.jogador_id AND j.joga_recuado = 1
            JOIN times t ON t.id = ep.time_id
            WHERE ep.jogador_id NOT IN (
                SELECT DISTINCT goleiro_timeA_id FROM campeonato_partidas
                WHERE campeonato_id = ? AND goleiro_timeA_id IS NOT NULL
                UNION
                SELECT DISTINCT goleiro_timeB_id FROM campeonato_partidas
                WHERE campeonato_id = ? AND goleiro_timeB_id IS NOT NULL
            )
            GROUP BY j.id, j.nome, j.foto_url, t.id, t.nome
            ORDER BY clean_sheets DESC, pontos DESC
        ", array_merge($params, [$campeonatoId, $campeonatoId]));
    }

    /**
     * Algoz e vítima de um goleiro em um campeonato.
     */
    public function getGoleiroAlgozVitima(int $campeonatoId, int $goleiroId): array
    {
        // Algoz: quem mais fez gol contra ele (tenta eventos primeiro)
        $algozRow = $this->db->fetchOne("
            SELECT j2.nome, j2.foto_url, COUNT(*) AS total_gols
            FROM campeonato_eventos_partida ev2
            JOIN campeonato_partidas cp2 ON cp2.id = ev2.partida_id
                AND cp2.campeonato_id = ?
                AND (cp2.goleiro_timeA_id = ? OR cp2.goleiro_timeB_id = ?)
            JOIN jogadores j2 ON j2.id = ev2.jogador_id
            WHERE ev2.tipo = 'gol'
              AND ((cp2.goleiro_timeA_id = ? AND ev2.time_id = cp2.timeB_id)
                OR (cp2.goleiro_timeB_id = ? AND ev2.time_id = cp2.timeA_id))
            GROUP BY ev2.jogador_id, j2.nome, j2.foto_url
            ORDER BY COUNT(*) DESC
            LIMIT 1
        ", [$campeonatoId, $goleiroId, $goleiroId, $goleiroId, $goleiroId]);

        // Fallback: busca por estatísticas
        if (!$algozRow) {
            $algozRow = $this->db->fetchOne("
                SELECT j2.nome, j2.foto_url, SUM(ep2.gols) AS total_gols
                FROM campeonato_estatisticas_partida ep2
                JOIN campeonato_partidas cp2 ON cp2.id = ep2.partida_id
                    AND cp2.campeonato_id = ?
                    AND (cp2.goleiro_timeA_id = ? OR cp2.goleiro_timeB_id = ?)
                JOIN jogadores j2 ON j2.id = ep2.jogador_id
                WHERE ep2.gols > 0
                  AND ((cp2.goleiro_timeA_id = ? AND ep2.time_id = cp2.timeB_id)
                    OR (cp2.goleiro_timeB_id = ? AND ep2.time_id = cp2.timeA_id))
                GROUP BY ep2.jogador_id, j2.nome, j2.foto_url
                ORDER BY SUM(ep2.gols) DESC
                LIMIT 1
            ", [$campeonatoId, $goleiroId, $goleiroId, $goleiroId, $goleiroId]);
        }

        // Vítima: quem menos gols fez contra ele
        $vitimaRow = $this->db->fetchOne("
            SELECT j2.nome, j2.foto_url, SUM(ep2.gols) AS total_gols
            FROM campeonato_estatisticas_partida ep2
            JOIN campeonato_partidas cp2 ON cp2.id = ep2.partida_id
                AND cp2.campeonato_id = ?
                AND (cp2.goleiro_timeA_id = ? OR cp2.goleiro_timeB_id = ?)
            JOIN jogadores j2 ON j2.id = ep2.jogador_id
            WHERE (cp2.goleiro_timeA_id = ? AND ep2.time_id = cp2.timeB_id)
               OR (cp2.goleiro_timeB_id = ? AND ep2.time_id = cp2.timeA_id)
            GROUP BY ep2.jogador_id, j2.nome, j2.foto_url
            HAVING COUNT(DISTINCT ep2.partida_id) >= 2
            ORDER BY SUM(ep2.gols) ASC
            LIMIT 1
        ", [$campeonatoId, $goleiroId, $goleiroId, $goleiroId, $goleiroId]);

        return [
            'algoz'  => $algozRow ? [
                'nome'       => $algozRow['nome'],
                'foto_url'   => $algozRow['foto_url'],
                'total_gols' => (int)$algozRow['total_gols'],
            ] : null,
            'vitima' => $vitimaRow ? [
                'nome'       => $vitimaRow['nome'],
                'foto_url'   => $vitimaRow['foto_url'],
                'total_gols' => (int)$vitimaRow['total_gols'],
            ] : null,
        ];
    }
}
