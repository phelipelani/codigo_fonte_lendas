<?php
/**
 * DashboardController.php
 * Endpoint:
 *   GET /dashboard/overview
 *
 * Agrega todas as métricas e resumos necessários para o centro de comando da Dashboard:
 * - totais (resumo global)
 * - campeonato_atual (informações da competição ativa, rodadas, líder)
 * - destaques (MVP, Pé de Rato, Artilheiro/Destaque da última rodada)
 * - ultima_rodada (confrontos finalizados com placar e logos)
 * - momentos (maior goleada, jogo mais movimentado, etc.)
 * - tendencias (jogadores em alta e em queda na rodada)
 * - top_jogadores (Top 5 geral para resumo operacional)
 * - campeoes (dados prontos para o Hall dos Campeões)
 * - historia (legado histórico acumulado)
 */

require_once __DIR__ . '/../services/StatsService.php';

class DashboardController
{
    private Database $db;
    private StatsService $stats;

    public function __construct()
    {
        $this->db = Database::getInstance();
        $this->stats = new StatsService($this->db);
    }

    public function overview(): void
    {
        try {
            // 1. Totais Globais
            $totaisRaw = $this->stats->getTotaisGlobais();
            $totalJogos     = (int)($totaisRaw['total_partidas'] ?? 0);
            $totalGols      = (int)($totaisRaw['total_gols'] ?? 0);
            $totalJogadores = (int)($totaisRaw['total_jogadores'] ?? 0);
            $mediaGols      = $totalJogos > 0 ? round($totalGols / $totalJogos, 1) : 0;

            // 2. Campeonato Atual (Ativo)
            $campAtivo = $this->db->fetchOne("
                SELECT id, nome, formato, fase_atual, status
                FROM campeonatos
                WHERE status != 'finalizado' AND fase_atual != 'finalizada'
                ORDER BY id DESC
                LIMIT 1
            ");

            $campeonatoAtualData = null;
            if ($campAtivo) {
                $campId = (int)$campAtivo['id'];

                // Total de rodadas e rodada atual
                $todasRodadas = $this->db->fetchAll("SELECT id, data, status FROM rodadas WHERE campeonato_id = ? ORDER BY id ASC", [$campId]);
                $totalRodadas = count($todasRodadas);

                $rodadaAberta = $this->db->fetchOne("SELECT id FROM rodadas WHERE campeonato_id = ? AND status = 'aberta' ORDER BY id ASC LIMIT 1", [$campId]);
                $ultimaFinalizadaCamp = $this->db->fetchOne("SELECT id FROM rodadas WHERE campeonato_id = ? AND status = 'finalizada' ORDER BY id DESC LIMIT 1", [$campId]);

                $rodadaAtualNum = null;
                if ($rodadaAberta) {
                    // Descobre o índice da rodada
                    foreach ($todasRodadas as $idx => $r) {
                        if ((int)$r['id'] === (int)$rodadaAberta['id']) {
                            $rodadaAtualNum = $idx + 1;
                            break;
                        }
                    }
                } elseif ($ultimaFinalizadaCamp) {
                    foreach ($todasRodadas as $idx => $r) {
                        if ((int)$r['id'] === (int)$ultimaFinalizadaCamp['id']) {
                            $rodadaAtualNum = $idx + 1;
                            break;
                        }
                    }
                }

                // Líder atual da competição (classificação por vitórias = 3, empates = 1)
                $pV = 3;
                $pE = 1;
                $classif = $this->db->fetchAll("
                    SELECT
                        t.id AS time_id, t.nome, t.logo_url,
                        COALESCE(SUM(CASE
                            WHEN (cp.timeA_id = t.id AND cp.placar_timeA > cp.placar_timeB)
                              OR (cp.timeB_id = t.id AND cp.placar_timeB > cp.placar_timeA) THEN {$pV}
                            WHEN cp.placar_timeA IS NOT NULL AND cp.placar_timeA = cp.placar_timeB THEN {$pE}
                            ELSE 0
                        END), 0) AS pontos,
                        COUNT(cp.id) AS jogos
                    FROM times t
                    JOIN campeonato_times ct ON ct.time_id = t.id AND ct.campeonato_id = ?
                    LEFT JOIN campeonato_partidas cp ON (cp.timeA_id = t.id OR cp.timeB_id = t.id)
                        AND cp.campeonato_id = ? AND cp.status = 'finalizada'
                    GROUP BY t.id, t.nome, t.logo_url
                    ORDER BY pontos DESC, jogos ASC, t.nome ASC
                ", [$campId, $campId]);

                $lider = null;
                if (!empty($classif)) {
                    $lider = [
                        'time_id' => (int)$classif[0]['time_id'],
                        'nome'    => $classif[0]['nome'],
                        'escudo'  => $classif[0]['logo_url'],
                        'pontos'  => (int)$classif[0]['pontos'],
                    ];
                }

                // Quantidade de partidas concluídas na última rodada do campeonato
                $qtdJogosUltima = 0;
                if ($ultimaFinalizadaCamp) {
                    $cntRow = $this->db->fetchOne("SELECT COUNT(*) as c FROM campeonato_partidas WHERE rodada_id = ? AND status = 'finalizada'", [(int)$ultimaFinalizadaCamp['id']]);
                    $qtdJogosUltima = (int)($cntRow['c'] ?? 0);
                }

                $campeonatoAtualData = [
                    'id'            => $campId,
                    'nome'          => $campAtivo['nome'],
                    'formato'       => $campAtivo['formato'] === 'copa' ? 'Copa' : 'Pontos Corridos',
                    'status'        => 'Em andamento',
                    'rodada_atual'  => $rodadaAtualNum,
                    'total_rodadas' => $totalRodadas,
                    'lider'         => $lider,
                    'partidas_ultima_rodada' => $qtdJogosUltima,
                ];
            }

            // 3. Última Rodada Finalizada (com partidas e placares)
            $ultimaRodadaInfo = $this->db->fetchOne("
                SELECT r.id, r.data, r.campeonato_id, c.nome AS campeonato_nome
                FROM rodadas r
                JOIN campeonatos c ON c.id = r.campeonato_id
                WHERE r.status = 'finalizada'
                ORDER BY r.data DESC, r.id DESC
                LIMIT 1
            ");

            $partidasUltimaRodada = [];
            $momentos = null;
            $tendencias = ['em_alta' => [], 'em_queda' => []];

            if ($ultimaRodadaInfo) {
                $rid = (int)$ultimaRodadaInfo['id'];

                $partidasRows = $this->db->fetchAll("
                    SELECT
                        cp.id,
                        cp.placar_timeA AS placarA,
                        cp.placar_timeB AS placarB,
                        cp.status,
                        cp.duracao_segundos,
                        tA.id AS timeA_id, tA.nome AS timeA_nome, tA.logo_url AS timeA_logo,
                        tB.id AS timeB_id, tB.nome AS timeB_nome, tB.logo_url AS timeB_logo
                    FROM campeonato_partidas cp
                    JOIN times tA ON tA.id = cp.timeA_id
                    JOIN times tB ON tB.id = cp.timeB_id
                    WHERE cp.rodada_id = ? AND cp.status = 'finalizada'
                    ORDER BY cp.id ASC
                ", [$rid]);

                foreach ($partidasRows as $p) {
                    $partidasUltimaRodada[] = [
                        'id'               => (int)$p['id'],
                        'placarA'          => (int)$p['placarA'],
                        'placarB'          => (int)$p['placarB'],
                        'timeA'            => [
                            'id'   => (int)$p['timeA_id'],
                            'nome' => $p['timeA_nome'],
                            'logo' => $p['timeA_logo'],
                        ],
                        'timeB'            => [
                            'id'   => (int)$p['timeB_id'],
                            'nome' => $p['timeB_nome'],
                            'logo' => $p['timeB_logo'],
                        ],
                        'duracao_segundos' => (int)$p['duracao_segundos'],
                    ];
                }

                // Cálculo dos Momentos da Rodada
                if (!empty($partidasRows)) {
                    $maiorGoleadaPartida = null;
                    $maiorDif = -1;
                    $jogoMaisGolsPartida = null;
                    $maxGols = -1;

                    foreach ($partidasRows as $p) {
                        $pA = (int)$p['placarA'];
                        $pB = (int)$p['placarB'];
                        $dif = abs($pA - $pB);
                        $totGols = $pA + $pB;

                        if ($dif > $maiorDif) {
                            $maiorDif = $dif;
                            $maiorGoleadaPartida = "{$p['timeA_nome']} {$pA} x {$pB} {$p['timeB_nome']}";
                        }
                        if ($totGols > $maxGols) {
                            $maxGols = $totGols;
                            $jogoMaisGolsPartida = "{$p['timeA_nome']} {$pA} x {$pB} {$p['timeB_nome']} ({$totGols} gols)";
                        }
                    }

                    $momentos = [
                        'maior_goleada'  => $maiorGoleadaPartida,
                        'jogo_mais_gols' => $jogoMaisGolsPartida,
                    ];
                }

                // Tendências da Rodada: Pontos dos jogadores na rodada
                try {
                    $pontosRodada = $this->stats->getPontosRodada($rid);
                    if (!empty($pontosRodada)) {
                        $alta = array_slice($pontosRodada, 0, 3);
                        foreach ($alta as $a) {
                            $tendencias['em_alta'][] = [
                                'id'     => (int)($a['jogador_id'] ?? $a['id'] ?? 0),
                                'nome'   => $a['nome'],
                                'foto'   => $a['foto_url'],
                                'pontos' => (float)$a['pontos'],
                            ];
                        }
                        // Pior pontuação (invertida)
                        $reversed = array_reverse($pontosRodada);
                        $queda = array_slice($reversed, 0, 3);
                        foreach ($queda as $q) {
                            $tendencias['em_queda'][] = [
                                'id'     => (int)($q['jogador_id'] ?? $q['id'] ?? 0),
                                'nome'   => $q['nome'],
                                'foto'   => $q['foto_url'],
                                'pontos' => (float)$q['pontos'],
                            ];
                        }
                    }
                } catch (\Throwable $e) {
                    // fallback silencioso se falhar
                }
            }

            // 4. Destaques da Rodada (Todos os MVPs, todos os Pés de Rato e outros prêmios da rodada)
            $ridPremios = $ultimaRodadaInfo ? (int)$ultimaRodadaInfo['id'] : 0;
            if (!$ridPremios) {
                $rowR = $this->db->fetchOne("SELECT rodada_id FROM premios_rodada ORDER BY rodada_id DESC LIMIT 1");
                $ridPremios = (int)($rowR['rodada_id'] ?? 0);
            }

            $mvpsList = [];
            $pesDeRatoList = [];
            $outrosDestaques = [];

            if ($ridPremios > 0) {
                $premiosRows = $this->db->fetchAll("
                    SELECT pr.tipo_premio, pr.pontuacao AS total, j.id, j.nome, j.foto_url
                    FROM premios_rodada pr
                    JOIN jogadores j ON j.id = pr.jogador_id
                    WHERE pr.rodada_id = ?
                    ORDER BY pr.tipo_premio, pr.pontuacao DESC
                ", [$ridPremios]);

                foreach ($premiosRows as $pr) {
                    $item = [
                        'id'       => (int)$pr['id'],
                        'nome'     => $pr['nome'],
                        'foto_url' => $pr['foto_url'],
                        'total'    => $pr['total'],
                    ];
                    if ($pr['tipo_premio'] === 'mvp_rodada') {
                        $mvpsList[] = $item;
                    } elseif ($pr['tipo_premio'] === 'pe_de_rato_rodada') {
                        $pesDeRatoList[] = $item;
                    } else {
                        $label = 'Destaque';
                        if ($pr['tipo_premio'] === 'artilheiro_rodada') $label = 'Artilheiro';
                        elseif ($pr['tipo_premio'] === 'garcom_rodada') $label = 'Garçom';
                        elseif ($pr['tipo_premio'] === 'melhor_goleiro_rodada') $label = 'Melhor Goleiro';
                        elseif ($pr['tipo_premio'] === 'melhor_zagueiro_rodada') $label = 'Melhor Zagueiro';

                        $item['tipo'] = $pr['tipo_premio'];
                        $item['label'] = $label;
                        $outrosDestaques[] = $item;
                    }
                }
            }

            $destaquesData = [
                'mvps'             => $mvpsList,
                'pes_de_rato'      => $pesDeRatoList,
                'outros_destaques' => $outrosDestaques,
                // Fallbacks para compatibilidade
                'mvp'              => $mvpsList[0] ?? null,
                'pe_de_rato'       => $pesDeRatoList[0] ?? null,
                'jogador_rodada'   => $outrosDestaques[0] ?? null,
            ];

            // 5. Top 5 Jogadores (Score Lendário com link para Analytics)
            $topScoreRaw = $this->stats->getScoreLendario(5);
            $topJogadores = array_map(function ($row) {
                return [
                    'id'           => (int)($row['id'] ?? 0),
                    'nome'         => $row['nome'] ?? '',
                    'foto_url'     => $row['foto_url'] ?? null,
                    'jogos'        => (int)($row['total_jogos'] ?? 0),
                    'pontos'       => (float)($row['score_lendario'] ?? 0),
                    'titulos'      => (int)($row['qtd_titulos'] ?? 0),
                ];
            }, $topScoreRaw);

            // 6. Ranking de Times - Campeões (Hall dos Campeões)
            $campeoesRaw = $this->db->fetchAll("
                SELECT
                    t.id,
                    t.nome,
                    t.logo_url AS escudo_url,
                    CASE WHEN c.formato = 'liga' THEN 'pontos_corridos' WHEN c.formato = 'copa' THEN 'mata_mata' ELSE c.formato END AS formato,
                    COUNT(c.id) AS titulos,
                    GROUP_CONCAT(c.nome SEPARATOR '||') AS nomes_campeonatos,
                    GROUP_CONCAT(c.data SEPARATOR '||') AS datas_campeonatos
                FROM campeonatos c
                JOIN times t ON t.id = c.time_campeao_id
                WHERE c.status = 'finalizado' OR c.time_campeao_id IS NOT NULL
                GROUP BY t.id, formato
            ");

            $campeoes = [];
            foreach ($campeoesRaw as $row) {
                $nomes = explode('||', $row['nomes_campeonatos'] ?? '');
                $datas = explode('||', $row['datas_campeonatos'] ?? '');
                $conquistas = [];
                for ($i = 0; $i < count($nomes); $i++) {
                    if (!empty($nomes[$i])) {
                        $conquistas[] = [
                            'nome' => $nomes[$i],
                            'data' => $datas[$i] ?? ''
                        ];
                    }
                }
                usort($conquistas, function($a, $b) {
                    return strcmp($b['data'], $a['data']);
                });
                $campeoes[] = [
                    'id'         => (int)$row['id'],
                    'nome'       => $row['nome'],
                    'escudo_url' => $row['escudo_url'],
                    'formato'    => $row['formato'],
                    'titulos'    => (int)$row['titulos'],
                    'conquistas' => $conquistas
                ];
            }

            // 7. História do FutLendas (Legado)
            $campsRealizados = (int)($this->db->fetchOne("SELECT COUNT(*) as c FROM campeonatos WHERE status = 'finalizado' OR time_campeao_id IS NOT NULL")['c'] ?? 0);
            $timesParticiparam = (int)($this->db->fetchOne("SELECT COUNT(DISTINCT time_id) as c FROM campeonato_times")['c'] ?? 0);
            $mvpsDistribuidos = (int)($this->db->fetchOne("SELECT COUNT(*) as c FROM premios_rodada WHERE tipo_premio = 'mvp_rodada'")['c'] ?? 0);

            $historia = [
                'campeonatos_realizados' => $campsRealizados,
                'times_participaram'     => $timesParticiparam,
                'partidas_disputadas'    => $totalJogos,
                'gols_marcados'          => $totalGols,
                'media_gols'             => $mediaGols,
                'mvps_distribuidos'      => $mvpsDistribuidos,
            ];

            http_response_code(200);
            echo json_encode([
                'totais'           => [
                    'total_partidas'  => $totalJogos,
                    'total_gols'      => $totalGols,
                    'total_jogadores' => $totalJogadores,
                    'media_gols'      => $mediaGols,
                ],
                'campeonato_atual' => $campeonatoAtualData,
                'destaques'        => $destaquesData,
                'ultima_rodada'    => [
                    'rodada_id'        => $ultimaRodadaInfo ? (int)$ultimaRodadaInfo['id'] : null,
                    'data'             => $ultimaRodadaInfo ? $ultimaRodadaInfo['data'] : null,
                    'campeonato_nome'  => $ultimaRodadaInfo ? $ultimaRodadaInfo['campeonato_nome'] : null,
                    'partidas'         => $partidasUltimaRodada,
                ],
                'momentos'         => $momentos,
                'tendencias'       => $tendencias,
                'top_jogadores'    => $topJogadores,
                'campeoes'         => $campeoes,
                'historia'         => $historia,
            ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        } catch (\Throwable $e) {
            error_log('[dashboard/overview] ERROR: ' . $e->getMessage() . ' in ' . $e->getFile() . ':' . $e->getLine());
            http_response_code(500);
            echo json_encode(['error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
        }
    }
}
