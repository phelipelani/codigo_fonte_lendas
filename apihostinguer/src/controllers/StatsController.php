<?php
/**
 * Arquivo: src/controllers/StatsController.php
 *
 * GET /stats/hall-da-fama  -> hallDaFama()
 *
 * Refatorado para delegar ao StatsService onde possivel.
 */

require_once __DIR__ . '/../utils/Pontos.php';
require_once __DIR__ . '/../services/StatsService.php';

class StatsController
{
    private $db;
    private StatsService $stats;

    public function __construct()
    {
        $this->db = Database::getInstance();
        $this->stats = new StatsService($this->db);
    }

    // =========================================================
    // GET /stats/hall-da-fama
    // =========================================================
    public function hallDaFama(): void
    {
        $errors = []; // coleta erros parciais para debug

        // -- Constantes de pontuacao --
        $pV = Pontos::VITORIAS;
        $pE = Pontos::EMPATES;

        // -- 1. ESTATISTICAS GERAIS (StatsService) --
        try {
            $estatisticasGerais = $this->stats->getTotaisGlobais();
        } catch (Throwable $e) {
            $errors[] = 'estatisticasGerais: ' . $e->getMessage();
            $estatisticasGerais = null;
        }

        // -- 2. SCORE LENDARIO (G.O.A.T) (StatsService) --
        $goat = null;
        try {
            $allScores = $this->stats->getScoreLendario(50);
            if (!empty($allScores)) {
                $goat = $allScores[0]; // ja vem ordenado por score_lendario DESC
            }
        } catch (Throwable $e) {
            $errors[] = 'goat: ' . $e->getMessage();
        }

        // -- 3. RANKINGS HISTORICOS --
        try {
            $maioresCampeoes = $this->db->fetchAll("
                SELECT j.id, j.nome, j.foto_url, COUNT(*) AS total
                FROM campeonato_vencedores cv
                JOIN jogadores j ON j.id = cv.jogador_id
                GROUP BY j.id, j.nome, j.foto_url
                ORDER BY total DESC LIMIT 10
            ");
        } catch (Throwable $e) {
            $errors[] = 'maioresCampeoes: ' . $e->getMessage();
            $maioresCampeoes = [];
        }

        try {
            $rows = $this->stats->getArtilheiros(null, 10);
            $artilheirosAllTime = array_map(function ($r) {
                return [
                    'id'       => $r['id'],
                    'nome'     => $r['nome'],
                    'foto_url' => $r['foto_url'],
                    'total'    => $r['gols'],
                ];
            }, $rows);
        } catch (Throwable $e) {
            $errors[] = 'artilheirosAllTime: ' . $e->getMessage();
            $artilheirosAllTime = [];
        }

        try {
            $rows = $this->stats->getGarcons(null, 10);
            $garconsAllTime = array_map(function ($r) {
                return [
                    'id'       => $r['id'],
                    'nome'     => $r['nome'],
                    'foto_url' => $r['foto_url'],
                    'total'    => $r['assistencias'],
                ];
            }, $rows);
        } catch (Throwable $e) {
            $errors[] = 'garconsAllTime: ' . $e->getMessage();
            $garconsAllTime = [];
        }

        try {
            $rows = $this->stats->getParticipacoes(null, 10);
            $participacoesDecisivas = array_map(function ($r) {
                return [
                    'id'       => $r['id'],
                    'nome'     => $r['nome'],
                    'foto_url' => $r['foto_url'],
                    'total'    => $r['participacoes'],
                ];
            }, $rows);
        } catch (Throwable $e) {
            $errors[] = 'participacoesDecisivas: ' . $e->getMessage();
            $participacoesDecisivas = [];
        }

        try {
            $incansaveis = $this->db->fetchAll("
                SELECT j.id, j.nome, j.foto_url, COUNT(DISTINCT ep.partida_id) AS jogos
                FROM campeonato_estatisticas_partida ep
                JOIN campeonato_partidas cp ON cp.id = ep.partida_id AND cp.status = 'finalizada'
                JOIN jogadores j ON j.id = ep.jogador_id
                GROUP BY j.id, j.nome, j.foto_url
                ORDER BY jogos DESC LIMIT 10
            ");
        } catch (Throwable $e) {
            $errors[] = 'incansaveis: ' . $e->getMessage();
            $incansaveis = [];
        }

        // -- 4. RECORDES DE PARTIDA (direct SQL) --
        try {
            $hatTrickKing = $this->db->fetchOne("
                SELECT j.id, j.nome, j.foto_url, ep.gols AS recorde, c.nome AS campeonato_nome
                FROM campeonato_estatisticas_partida ep
                JOIN campeonato_partidas cp ON cp.id = ep.partida_id AND cp.status = 'finalizada'
                JOIN jogadores j ON j.id = ep.jogador_id
                LEFT JOIN campeonatos c ON c.id = cp.campeonato_id
                ORDER BY ep.gols DESC LIMIT 1
            ") ?: null;
        } catch (Throwable $e) {
            $errors[] = 'hatTrickKing: ' . $e->getMessage();
            $hatTrickKing = null;
        }

        try {
            $assistenteReal = $this->db->fetchOne("
                SELECT j.id, j.nome, j.foto_url, ep.assistencias AS recorde, c.nome AS campeonato_nome
                FROM campeonato_estatisticas_partida ep
                JOIN campeonato_partidas cp ON cp.id = ep.partida_id AND cp.status = 'finalizada'
                JOIN jogadores j ON j.id = ep.jogador_id
                LEFT JOIN campeonatos c ON c.id = cp.campeonato_id
                ORDER BY ep.assistencias DESC LIMIT 1
            ") ?: null;
        } catch (Throwable $e) {
            $errors[] = 'assistenteReal: ' . $e->getMessage();
            $assistenteReal = null;
        }

        try {
            $showCompleto = $this->db->fetchOne("
                SELECT j.id, j.nome, j.foto_url, ep.gols, ep.assistencias,
                       (ep.gols + ep.assistencias) AS recorde, c.nome AS campeonato_nome
                FROM campeonato_estatisticas_partida ep
                JOIN campeonato_partidas cp ON cp.id = ep.partida_id AND cp.status = 'finalizada'
                JOIN jogadores j ON j.id = ep.jogador_id
                LEFT JOIN campeonatos c ON c.id = cp.campeonato_id
                ORDER BY recorde DESC LIMIT 1
            ") ?: null;
        } catch (Throwable $e) {
            $errors[] = 'showCompleto: ' . $e->getMessage();
            $showCompleto = null;
        }

        // -- 5. EFICIENCIA (direct SQL) --
        $minJogos = 5;

        try {
            $melhorMediaGols = $this->db->fetchOne("
                SELECT j.id, j.nome, j.foto_url,
                       COUNT(DISTINCT ep.partida_id) AS jogos,
                       ROUND(SUM(ep.gols) / COUNT(DISTINCT ep.partida_id), 2) AS media
                FROM campeonato_estatisticas_partida ep
                JOIN campeonato_partidas cp ON cp.id = ep.partida_id AND cp.status = 'finalizada'
                JOIN jogadores j ON j.id = ep.jogador_id
                GROUP BY j.id, j.nome, j.foto_url
                HAVING jogos >= $minJogos
                ORDER BY media DESC LIMIT 1
            ") ?: null;
        } catch (Throwable $e) {
            $errors[] = 'melhorMediaGols: ' . $e->getMessage();
            $melhorMediaGols = null;
        }

        try {
            $melhorMediaAssists = $this->db->fetchOne("
                SELECT j.id, j.nome, j.foto_url,
                       COUNT(DISTINCT ep.partida_id) AS jogos,
                       ROUND(SUM(ep.assistencias) / COUNT(DISTINCT ep.partida_id), 2) AS media
                FROM campeonato_estatisticas_partida ep
                JOIN campeonato_partidas cp ON cp.id = ep.partida_id AND cp.status = 'finalizada'
                JOIN jogadores j ON j.id = ep.jogador_id
                GROUP BY j.id, j.nome, j.foto_url
                HAVING jogos >= $minJogos
                ORDER BY media DESC LIMIT 1
            ") ?: null;
        } catch (Throwable $e) {
            $errors[] = 'melhorMediaAssists: ' . $e->getMessage();
            $melhorMediaAssists = null;
        }

        try {
            $melhorAproveitamento = $this->db->fetchOne("
                SELECT j.id, j.nome, j.foto_url,
                       COUNT(DISTINCT ep.partida_id) AS jogos,
                       SUM(CASE WHEN (ep.time_id=cp.timeA_id AND cp.placar_timeA>cp.placar_timeB)
                                     OR (ep.time_id=cp.timeB_id AND cp.placar_timeB>cp.placar_timeA)
                                THEN 1 ELSE 0 END) AS vitorias,
                       ROUND(
                           SUM(CASE WHEN (ep.time_id=cp.timeA_id AND cp.placar_timeA>cp.placar_timeB)
                                         OR (ep.time_id=cp.timeB_id AND cp.placar_timeB>cp.placar_timeA)
                                    THEN {$pV}
                                    WHEN cp.placar_timeA=cp.placar_timeB THEN {$pE}
                                    ELSE 0 END)
                           / NULLIF(COUNT(DISTINCT ep.partida_id) * {$pV}, 0) * 100
                       , 1) AS aproveitamento
                FROM campeonato_estatisticas_partida ep
                JOIN campeonato_partidas cp ON cp.id = ep.partida_id AND cp.status = 'finalizada'
                JOIN jogadores j ON j.id = ep.jogador_id
                GROUP BY j.id, j.nome, j.foto_url
                HAVING jogos >= $minJogos
                ORDER BY aproveitamento DESC LIMIT 1
            ") ?: null;
        } catch (Throwable $e) {
            $errors[] = 'melhorAproveitamento: ' . $e->getMessage();
            $melhorAproveitamento = null;
        }

        // -- 6. PREMIACOES (StatsService) --

        try {
            $mvpCampeonato = $this->stats->getPremiosRanking('mvp', 'campeonato', 5);
        } catch (Throwable $e) {
            $errors[] = 'mvpCampeonato: ' . $e->getMessage();
            $mvpCampeonato = [];
        }

        try {
            $mvpSemanal = $this->stats->getPremiosRanking('mvp_rodada', 'rodada', 5);
        } catch (Throwable $e) {
            $errors[] = 'mvpSemanal: ' . $e->getMessage();
            $mvpSemanal = [];
        }

        try {
            $artilheiroSemanal = $this->stats->getPremiosRanking('artilheiro_rodada', 'rodada', 5);
        } catch (Throwable $e) {
            $errors[] = 'artilheiroSemanal: ' . $e->getMessage();
            $artilheiroSemanal = [];
        }

        try {
            $garcomSemanal = $this->stats->getPremiosRanking('garcom_rodada', 'rodada', 5);
        } catch (Throwable $e) {
            $errors[] = 'garcomSemanal: ' . $e->getMessage();
            $garcomSemanal = [];
        }

        try {
            $chuteirasOuro = $this->stats->getPremiosRanking('artilheiro', 'campeonato', 5);
        } catch (Throwable $e) {
            $errors[] = 'chuteirasOuro: ' . $e->getMessage();
            $chuteirasOuro = [];
        }

        try {
            $luvasOuro = $this->stats->getPremiosRanking('garcom', 'campeonato', 5);
        } catch (Throwable $e) {
            $errors[] = 'luvasOuro: ' . $e->getMessage();
            $luvasOuro = [];
        }

        try {
            $melhorGoleiroCamp = $this->stats->getPremiosRanking('melhor_goleiro', 'campeonato', 5);
        } catch (Throwable $e) {
            $errors[] = 'melhorGoleiroCamp: ' . $e->getMessage();
            $melhorGoleiroCamp = [];
        }

        try {
            $melhorZagueiroCamp = $this->stats->getPremiosRanking('melhor_zagueiro', 'campeonato', 5);
        } catch (Throwable $e) {
            $errors[] = 'melhorZagueiroCamp: ' . $e->getMessage();
            $melhorZagueiroCamp = [];
        }

        try {
            $melhorGoleiroSemanal = $this->stats->getPremiosRanking('melhor_goleiro_rodada', 'rodada', 5);
        } catch (Throwable $e) {
            $errors[] = 'melhorGoleiroSemanal: ' . $e->getMessage();
            $melhorGoleiroSemanal = [];
        }

        try {
            $melhorZagueiroSemanal = $this->stats->getPremiosRanking('melhor_zagueiro_rodada', 'rodada', 5);
        } catch (Throwable $e) {
            $errors[] = 'melhorZagueiroSemanal: ' . $e->getMessage();
            $melhorZagueiroSemanal = [];
        }

        try {
            $peDeRatoCampeonato = $this->stats->getPremiosRanking('pe_de_rato', 'campeonato', 5);
        } catch (Throwable $e) {
            $errors[] = 'peDeRatoCampeonato: ' . $e->getMessage();
            $peDeRatoCampeonato = [];
        }

        try {
            $peDeRatoSemanal = $this->stats->getPremiosRanking('pe_de_rato_rodada', 'rodada', 5);
        } catch (Throwable $e) {
            $errors[] = 'peDeRatoSemanal: ' . $e->getMessage();
            $peDeRatoSemanal = [];
        }

        // -- MVP e Pe de Rato da ULTIMA RODADA (StatsService) --
        $mvpUltimaRodada            = null;
        $peDeRatoUltimaRodada       = null;
        $artilheiroUltimaRodada     = null;
        $garcomUltimaRodada         = null;
        $goleiroUltimaRodada        = null;
        $zagueiroUltimaRodada       = null;

        try {
            $destaques = $this->stats->getDestaquesUltimaRodada();
            $mvpUltimaRodada        = $destaques['mvp'];
            $peDeRatoUltimaRodada   = $destaques['pe_de_rato'];
            $artilheiroUltimaRodada = $destaques['artilheiro'];
            $garcomUltimaRodada     = $destaques['garcom'];
            $goleiroUltimaRodada    = $destaques['goleiro'];
            $zagueiroUltimaRodada   = $destaques['zagueiro'];
        } catch (Throwable $e) {
            $errors[] = 'ultimaRodada: ' . $e->getMessage();
        }

        // -- 7. GOLEIROS --
        try {
            $goleirosLendarios = $this->stats->getGoleiroRanking(null, 5);
        } catch (Throwable $e) {
            $errors[] = 'goleirosLendarios: ' . $e->getMessage();
            $goleirosLendarios = [];
        }

        try {
            $goleirosCS = $this->db->fetchAll("
                SELECT j.id, j.nome, j.foto_url, SUM(ep.clean_sheet) AS total
                FROM campeonato_estatisticas_partida ep
                JOIN campeonato_partidas cp ON cp.id = ep.partida_id AND cp.status = 'finalizada'
                JOIN jogadores j ON j.id = ep.jogador_id
                WHERE (cp.goleiro_timeA_id = ep.jogador_id OR cp.goleiro_timeB_id = ep.jogador_id)
                GROUP BY j.id, j.nome, j.foto_url
                ORDER BY total DESC LIMIT 5
            ");
        } catch (Throwable $e) {
            $errors[] = 'goleirosCS: ' . $e->getMessage();
            $goleirosCS = [];
        }

        try {
            $goleirosMedia = $this->db->fetchAll("
                SELECT j.id, j.nome, j.foto_url,
                       COUNT(DISTINCT ep.partida_id) AS jogos,
                       ROUND(SUM(
                           CASE WHEN cp.goleiro_timeA_id = ep.jogador_id THEN cp.placar_timeB
                                WHEN cp.goleiro_timeB_id = ep.jogador_id THEN cp.placar_timeA
                                ELSE 0 END
                       ) / NULLIF(COUNT(DISTINCT ep.partida_id), 0), 2) AS media
                FROM campeonato_estatisticas_partida ep
                JOIN campeonato_partidas cp ON cp.id = ep.partida_id AND cp.status = 'finalizada'
                JOIN jogadores j ON j.id = ep.jogador_id
                WHERE (cp.goleiro_timeA_id = ep.jogador_id OR cp.goleiro_timeB_id = ep.jogador_id)
                GROUP BY j.id, j.nome, j.foto_url
                HAVING jogos >= 3
                ORDER BY media ASC LIMIT 5
            ");
        } catch (Throwable $e) {
            $errors[] = 'goleirosMedia: ' . $e->getMessage();
            $goleirosMedia = [];
        }

        // -- 8. MURALHAS (StatsService) --
        try {
            $rows = $this->stats->getZagueiros(null, 5);
            $muralhas = array_map(function ($r) {
                return [
                    'id'       => $r['id'],
                    'nome'     => $r['nome'],
                    'foto_url' => $r['foto_url'],
                    'total'    => $r['clean_sheets'],
                ];
            }, $rows);
        } catch (Throwable $e) {
            $errors[] = 'muralhas: ' . $e->getMessage();
            $muralhas = [];
        }

        // -- 9. DUPLAS LENDARIAS (direct SQL) --
        try {
            $dupConexao = $this->db->fetchOne("
                SELECT
                    ja.nome AS artilheiro_nome, ja.foto_url AS artilheiro_foto,
                    jb.nome AS garcom_nome,     jb.foto_url AS garcom_foto,
                    COUNT(*) AS total
                FROM campeonato_eventos_partida ev
                JOIN campeonato_partidas cp ON cp.id = ev.partida_id AND cp.status = 'finalizada'
                JOIN jogadores ja ON ja.id = ev.jogador_id
                JOIN jogadores jb ON jb.id = ev.assist_por_jogador_id
                WHERE ev.tipo = 'gol' AND ev.assist_por_jogador_id IS NOT NULL
                GROUP BY ev.jogador_id, ev.assist_por_jogador_id
                ORDER BY total DESC LIMIT 1
            ") ?: null;
        } catch (Throwable $e) {
            $errors[] = 'dupConexao: ' . $e->getMessage();
            $dupConexao = null;
        }

        try {
            $dupInseparavel = $this->db->fetchOne("
                SELECT
                    j1.nome AS jogador1_nome, j1.foto_url AS jogador1_foto,
                    j2.nome AS jogador2_nome, j2.foto_url AS jogador2_foto,
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
        } catch (Throwable $e) {
            $errors[] = 'dupInseparavel: ' . $e->getMessage();
            $dupInseparavel = null;
        }

        try {
            $dupVencedora = $this->db->fetchOne("
                SELECT
                    j1.nome AS jogador1_nome, j1.foto_url AS jogador1_foto,
                    j2.nome AS jogador2_nome, j2.foto_url AS jogador2_foto,
                    SUM(CASE
                        WHEN (ep1.time_id=cp.timeA_id AND cp.placar_timeA>cp.placar_timeB)
                          OR (ep1.time_id=cp.timeB_id AND cp.placar_timeB>cp.placar_timeA)
                        THEN 1 ELSE 0 END) AS total
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
        } catch (Throwable $e) {
            $errors[] = 'dupVencedora: ' . $e->getMessage();
            $dupVencedora = null;
        }

        // -- 10. PARTIDAS HISTORICAS (direct SQL) --
        try {
            $partidaMaisGols = $this->db->fetchOne("
                SELECT cp.id, cp.placar_timeA, cp.placar_timeB,
                       (cp.placar_timeA + cp.placar_timeB) AS total_gols,
                       t1.nome AS timeA_nome, t1.logo_url AS timeA_logo,
                       t2.nome AS timeB_nome, t2.logo_url AS timeB_logo,
                       c.nome AS campeonato_nome
                FROM campeonato_partidas cp
                LEFT JOIN times t1 ON t1.id = cp.timeA_id
                LEFT JOIN times t2 ON t2.id = cp.timeB_id
                LEFT JOIN campeonatos c ON c.id = cp.campeonato_id
                WHERE cp.status = 'finalizada'
                ORDER BY total_gols DESC LIMIT 1
            ") ?: null;
        } catch (Throwable $e) {
            $errors[] = 'partidaMaisGols: ' . $e->getMessage();
            $partidaMaisGols = null;
        }

        try {
            $maiorGoleada = $this->db->fetchOne("
                SELECT cp.id, cp.placar_timeA, cp.placar_timeB,
                       ABS(cp.placar_timeA - cp.placar_timeB) AS diferenca,
                       t1.nome AS timeA_nome, t1.logo_url AS timeA_logo,
                       t2.nome AS timeB_nome, t2.logo_url AS timeB_logo,
                       c.nome AS campeonato_nome
                FROM campeonato_partidas cp
                LEFT JOIN times t1 ON t1.id = cp.timeA_id
                LEFT JOIN times t2 ON t2.id = cp.timeB_id
                LEFT JOIN campeonatos c ON c.id = cp.campeonato_id
                WHERE cp.status = 'finalizada'
                ORDER BY diferenca DESC LIMIT 1
            ") ?: null;
        } catch (Throwable $e) {
            $errors[] = 'maiorGoleada: ' . $e->getMessage();
            $maiorGoleada = null;
        }

        try {
            $empateMaisGols = $this->db->fetchOne("
                SELECT cp.id, cp.placar_timeA, cp.placar_timeB,
                       (cp.placar_timeA + cp.placar_timeB) AS total_gols,
                       t1.nome AS timeA_nome, t1.logo_url AS timeA_logo,
                       t2.nome AS timeB_nome, t2.logo_url AS timeB_logo,
                       c.nome AS campeonato_nome
                FROM campeonato_partidas cp
                LEFT JOIN times t1 ON t1.id = cp.timeA_id
                LEFT JOIN times t2 ON t2.id = cp.timeB_id
                LEFT JOIN campeonatos c ON c.id = cp.campeonato_id
                WHERE cp.status = 'finalizada' AND cp.placar_timeA = cp.placar_timeB
                ORDER BY total_gols DESC LIMIT 1
            ") ?: null;
        } catch (Throwable $e) {
            $errors[] = 'empateMaisGols: ' . $e->getMessage();
            $empateMaisGols = null;
        }

        // -- 11. TIMES (direct SQL) --
        try {
            $timeDinastia = $this->db->fetchOne("
                SELECT t.id, t.nome, t.logo_url, COUNT(*) AS total
                FROM campeonatos c
                JOIN times t ON t.id = c.time_campeao_id
                GROUP BY t.id, t.nome, t.logo_url
                ORDER BY total DESC LIMIT 1
            ") ?: null;
        } catch (Throwable $e) {
            $errors[] = 'timeDinastia: ' . $e->getMessage();
            $timeDinastia = null;
        }

        try {
            $timeArtilheiro = $this->db->fetchOne("
                SELECT t.id, t.nome, t.logo_url, SUM(ep.gols) AS total
                FROM campeonato_estatisticas_partida ep
                JOIN campeonato_partidas cp ON cp.id = ep.partida_id AND cp.status = 'finalizada'
                JOIN times t ON t.id = ep.time_id
                GROUP BY t.id, t.nome, t.logo_url
                ORDER BY total DESC LIMIT 1
            ") ?: null;
        } catch (Throwable $e) {
            $errors[] = 'timeArtilheiro: ' . $e->getMessage();
            $timeArtilheiro = null;
        }

        try {
            $timeMelhorDefesa = $this->db->fetchOne("
                SELECT t.id, t.nome, t.logo_url,
                       COUNT(DISTINCT cp.id) AS jogos,
                       ROUND(SUM(
                           CASE WHEN cp.timeA_id = t.id THEN cp.placar_timeB
                                ELSE cp.placar_timeA END
                       ) / NULLIF(COUNT(DISTINCT cp.id), 0), 2) AS media
                FROM campeonato_partidas cp
                JOIN times t ON t.id = cp.timeA_id OR t.id = cp.timeB_id
                WHERE cp.status = 'finalizada'
                GROUP BY t.id, t.nome, t.logo_url
                HAVING jogos >= 3
                ORDER BY media ASC LIMIT 1
            ") ?: null;
        } catch (Throwable $e) {
            $errors[] = 'timeMelhorDefesa: ' . $e->getMessage();
            $timeMelhorDefesa = null;
        }

        try {
            $timeMaisVitorias = $this->db->fetchOne("
                SELECT t.id, t.nome, t.logo_url,
                       SUM(CASE
                           WHEN cp.timeA_id = t.id AND cp.placar_timeA > cp.placar_timeB THEN 1
                           WHEN cp.timeB_id = t.id AND cp.placar_timeB > cp.placar_timeA THEN 1
                           ELSE 0 END) AS total
                FROM campeonato_partidas cp
                JOIN times t ON t.id = cp.timeA_id OR t.id = cp.timeB_id
                WHERE cp.status = 'finalizada'
                GROUP BY t.id, t.nome, t.logo_url
                ORDER BY total DESC LIMIT 1
            ") ?: null;
        } catch (Throwable $e) {
            $errors[] = 'timeMaisVitorias: ' . $e->getMessage();
            $timeMaisVitorias = null;
        }

        // -- RESPOSTA --
        http_response_code(200);
        echo json_encode([
            'goat'               => $goat,
            'estatisticasGerais' => $estatisticasGerais,
            'rankings' => [
                'maioresCampeoes'        => $maioresCampeoes ?? [],
                'artilheirosAllTime'     => $artilheirosAllTime ?? [],
                'garconsAllTime'         => $garconsAllTime ?? [],
                'participacoesDecisivas' => $participacoesDecisivas ?? [],
                'incansaveis'            => $incansaveis ?? [],
            ],
            'recordesPartida' => [
                'hatTrickKing'   => $hatTrickKing ?? null,
                'assistenteReal' => $assistenteReal ?? null,
                'showCompleto'   => $showCompleto ?? null,
            ],
            'eficiencia' => [
                'melhorMediaGols'      => $melhorMediaGols ?? null,
                'melhorMediaAssists'   => $melhorMediaAssists ?? null,
                'melhorAproveitamento' => $melhorAproveitamento ?? null,
            ],
            'premios' => [
                'mvpCampeonato'           => $mvpCampeonato ?? [],
                'mvpSemanal'              => $mvpSemanal ?? [],
                'artilheiroSemanal'       => $artilheiroSemanal ?? [],
                'garcomSemanal'           => $garcomSemanal ?? [],
                'chuteirasOuro'           => $chuteirasOuro ?? [],
                'luvasOuro'               => $luvasOuro ?? [],
                'melhorGoleiroCamp'       => $melhorGoleiroCamp ?? [],
                'melhorZagueiroCamp'      => $melhorZagueiroCamp ?? [],
                'melhorGoleiroSemanal'    => $melhorGoleiroSemanal ?? [],
                'melhorZagueiroSemanal'   => $melhorZagueiroSemanal ?? [],
                'peDeRatoCampeonato'      => $peDeRatoCampeonato ?? [],
                'peDeRatoSemanal'         => $peDeRatoSemanal ?? [],
                'mvpUltimaRodada'         => $mvpUltimaRodada,
                'peDeRatoUltimaRodada'    => $peDeRatoUltimaRodada,
                'artilheiroUltimaRodada'  => $artilheiroUltimaRodada,
                'garcomUltimaRodada'      => $garcomUltimaRodada,
                'goleiroUltimaRodada'     => $goleiroUltimaRodada,
                'zagueiroUltimaRodada'    => $zagueiroUltimaRodada,
            ],
            'goleiros' => [
                'lendarios'   => $goleirosLendarios ?? [],
                'cleanSheets' => $goleirosCS ?? [],
                'melhorMedia' => $goleirosMedia ?? [],
            ],
            'muralhas' => $muralhas ?? [],
            'duplas' => [
                'conexao'     => $dupConexao ?? null,
                'inseparavel' => $dupInseparavel ?? null,
                'vencedora'   => $dupVencedora ?? null,
            ],
            'partidasHistoricas' => [
                'maisGols'       => $partidaMaisGols ?? null,
                'maiorGoleada'   => $maiorGoleada ?? null,
                'empateMaisGols' => $empateMaisGols ?? null,
            ],
            'times' => [
                'dinastia'     => $timeDinastia ?? null,
                'artilheiro'   => $timeArtilheiro ?? null,
                'melhorDefesa' => $timeMelhorDefesa ?? null,
                'maisVitorias' => $timeMaisVitorias ?? null,
            ],
            '_debug_errors' => $errors, // TEMPORARIO -- remover depois de confirmar funcionamento
        ], JSON_UNESCAPED_UNICODE);
        exit; // IMPORTANTE: garante que nada mais e escrito no output
    }
}
