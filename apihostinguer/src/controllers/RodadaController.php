<?php
/**
 * Arquivo: src/controllers/RodadaController.php
 *
 * Rotas cobertas:
 * POST   /rodadas/liga/:ligaId            → createForLiga()
 * POST   /rodadas/campeonato/:campId      → createForCampeonato()
 * GET    /rodadas/liga/:ligaId            → listByLiga()
 * GET    /rodadas/campeonato/:campId      → listByCampeonato()
 * GET    /rodadas/:id                     → show()
 * PUT    /rodadas/:id                     → update()
 * DELETE /rodadas/:id                     → destroy()
 * POST   /rodadas/:id/finalizar           → finalizar()
 *
 * GET    /rodadas/:id/jogadores           → jogadores()
 * POST   /rodadas/:id/sync-jogadores      → syncJogadores()
 * PUT    /jogadores/batch                 → updateJogadoresBatch()
 *
 * GET    /rodadas/:id/times              → getTimes()
 * POST   /rodadas/:id/times              → saveTimes()
 *
 * POST   /rodadas/:id/partidas           → createPartida()  ← cria partida vazia
 * GET    /campeonatos/rodada/:id/partidas → getPartidas()   ← histórico
 * POST   /campeonatos/rodada/:id/partida  → salvarPartida() ← salva resultado completo
 * PUT    /partidas/:id/finalizar         → finalizarPartida()
 * GET    /partidas/:id/detalhes          → detalhesPartida()
 * PUT    /partidas/:id                   → editarPartida()
 * DELETE /partidas/:id                   → deletarPartida()
 * GET    /partidas/globais               → partidasGlobais()
 *
 * POST   /rodadas/:id/substituicao       → substituicao()
 */

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../utils/HttpError.php';
require_once __DIR__ . '/../utils/Pontos.php';
require_once __DIR__ . '/../utils/CartolendaEventos.php';

class RodadaController
{
    private $db;

    public function __construct()
    {
        $this->db = Database::getInstance();
    }

    // =========================================================
    // CRIAR RODADA PARA LIGA
    // POST /rodadas/liga/:ligaId   body: { data }
    // =========================================================
    public function createForLiga(int $ligaId): void
    {
        $liga = $this->db->fetchOne("SELECT id FROM ligas WHERE id = ?", [$ligaId]);
        if (!$liga) throw new HttpError('Liga não encontrada.', 404);

        $input = $this->json();
        if (empty($input['data'])) throw new HttpError('Data é obrigatória.', 400);

        $this->db->execute(
            "INSERT INTO rodadas (liga_id, data, status) VALUES (?, ?, 'aberta')",
            [$ligaId, $input['data']]
        );

        $id = (int)$this->db->lastInsertId();
        $rodada = $this->getRodadaOr404($id);

        http_response_code(201);
        echo json_encode($this->formatRodada($rodada), JSON_UNESCAPED_UNICODE);
    }

    // =========================================================
    // CRIAR RODADA PARA CAMPEONATO
    // POST /rodadas/campeonato/:campId   body: { data }
    // =========================================================
    public function createForCampeonato(int $campId): void
    {
        $camp = $this->db->fetchOne("SELECT id FROM campeonatos WHERE id = ?", [$campId]);
        if (!$camp) throw new HttpError('Campeonato não encontrado.', 404);

        $input = $this->json();
        if (empty($input['data'])) throw new HttpError('Data é obrigatória.', 400);

        $this->db->execute(
            "INSERT INTO rodadas (campeonato_id, data, status) VALUES (?, ?, 'aberta')",
            [$campId, $input['data']]
        );

        $id = (int)$this->db->lastInsertId();
        $rodada = $this->getRodadaOr404($id);

        http_response_code(201);
        echo json_encode($this->formatRodada($rodada), JSON_UNESCAPED_UNICODE);
    }

    // =========================================================
    // LISTAR RODADAS DA LIGA
    // GET /rodadas/liga/:ligaId
    // =========================================================
    public function listByLiga(int $ligaId): void
    {
        $rodadas = $this->db->fetchAll(
            "SELECT * FROM rodadas WHERE liga_id = ? ORDER BY data DESC",
            [$ligaId]
        );
        http_response_code(200);
        echo json_encode(array_map(fn($r) => $this->formatRodada($r), $rodadas), JSON_UNESCAPED_UNICODE);
    }

    // =========================================================
    // LISTAR RODADAS DO CAMPEONATO
    // GET /rodadas/campeonato/:campId
    // =========================================================
    public function listByCampeonato(int $campId): void
    {
        $rodadas = $this->db->fetchAll(
            "SELECT * FROM rodadas WHERE campeonato_id = ? ORDER BY data DESC",
            [$campId]
        );
        http_response_code(200);
        echo json_encode(array_map(fn($r) => $this->formatRodada($r), $rodadas), JSON_UNESCAPED_UNICODE);
    }

    // =========================================================
    // BUSCAR RODADA
    // GET /rodadas/:id
    // =========================================================
    public function show(int $id): void
    {
        $rodada = $this->getRodadaOr404($id);
        http_response_code(200);
        echo json_encode($this->formatRodada($rodada), JSON_UNESCAPED_UNICODE);
    }

    // =========================================================
    // ATUALIZAR RODADA
    // PUT /rodadas/:id   body: { data?, status? }
    // =========================================================
    public function update(int $id): void
    {
        $this->getRodadaOr404($id);
        $input = $this->json();

        $fields = []; $params = [];
        if (isset($input['data']))   { $fields[] = 'data = ?';   $params[] = $input['data']; }
        if (isset($input['status'])) { $fields[] = 'status = ?'; $params[] = $input['status']; }

        if (empty($fields)) throw new HttpError('Nenhum campo para atualizar.', 400);

        $params[] = $id;
        $this->db->execute("UPDATE rodadas SET " . implode(', ', $fields) . " WHERE id = ?", $params);

        $rodada = $this->getRodadaOr404($id);
        http_response_code(200);
        echo json_encode($this->formatRodada($rodada), JSON_UNESCAPED_UNICODE);
    }

    // =========================================================
    // DELETAR RODADA (inclusive finalizadas)
    // DELETE /rodadas/:id
    // =========================================================
    public function destroy(int $id): void
    {
        $rodada = $this->getRodadaOr404($id);

        // Busca partidas desta rodada para limpar estatísticas e eventos
        $partidas = $this->db->fetchAll(
            "SELECT id FROM campeonato_partidas WHERE rodada_id = ?", [$id]
        );
        $partidaIds = array_map(fn($p) => (int)$p['id'], $partidas);

        // Limpa dados de partidas (estatísticas + eventos)
        foreach ($partidaIds as $pid) {
            $this->db->execute("DELETE FROM campeonato_estatisticas_partida WHERE partida_id = ?", [$pid]);
            $this->db->execute("DELETE FROM campeonato_eventos_partida WHERE partida_id = ?", [$pid]);
        }

        // Limpa partidas
        $this->db->execute("DELETE FROM campeonato_partidas WHERE rodada_id = ?", [$id]);

        // Limpa elenco da rodada
        $this->db->execute("DELETE FROM campeonato_rodada_elencos WHERE rodada_id = ?", [$id]);

        // Limpa dados Cartolendas desta rodada
        $cartolendaTimes = $this->db->fetchAll(
            "SELECT id FROM cartolendas_times WHERE rodada_id = ?", [$id]
        );
        foreach ($cartolendaTimes as $ct) {
            $this->db->execute("DELETE FROM cartolendas_escalacao WHERE cartolendas_time_id = ?", [(int)$ct['id']]);
        }
        $this->db->execute("DELETE FROM cartolendas_times WHERE rodada_id = ?", [$id]);
        $this->db->execute("DELETE FROM cartolendas_capitao WHERE rodada_id = ?", [$id]);
        $this->db->execute("DELETE FROM cartolendas_precos WHERE rodada_id = ?", [$id]);
        $this->db->execute("DELETE FROM cartolendas_historico_precos WHERE rodada_id = ?", [$id]);

        // Limpa dados de liga (fluxo antigo)
        $this->db->execute("DELETE FROM rodada_jogadores WHERE rodada_id = ?", [$id]);
        $this->db->execute("DELETE FROM rodada_times WHERE rodada_id = ?", [$id]);
        $this->db->execute("DELETE FROM premios_rodada WHERE rodada_id = ?", [$id]);

        // Deleta a rodada
        $this->db->execute("DELETE FROM rodadas WHERE id = ?", [$id]);

        http_response_code(200);
        echo json_encode(['success' => true, 'message' => 'Rodada deletada com sucesso.']);
    }

    // =========================================================
    // FINALIZAR RODADA
    // POST /rodadas/:id/finalizar
    // =========================================================
    public function finalizar(int $id): void
    {
        $rodada = $this->getRodadaOr404($id);

        // Impede dupla finalização (evita duplicar pontos no ranking)
        if (($rodada['status'] ?? '') === 'finalizada') {
            http_response_code(400);
            echo json_encode(['error' => 'Rodada já está finalizada.']);
            return;
        }

        $this->db->execute(
            "UPDATE rodadas SET status = 'finalizada' WHERE id = ?",
            [$id]
        );

        // ── Salvar prêmios da rodada (MVP, Artilheiro, Garçom, etc.) ──
        $this->salvarPremiosRodada($id);

        // ── Cartolendas: carry-over automático (herda escalação anterior para quem não escalou) ──
        $this->carryOverEscalacao($id);

        // ── Cartolendas: calcular pontos dos times fantasy ──
        $this->calcularPontosCartolendas($id);

        // ── Cartolendas: atualizar preços dos jogadores ──
        $this->atualizarPrecosCartolendas($id);

        // ── Cartolendas: calcular patrimônio dos técnicos ──
        $this->calcularPatrimonioRodada($id);

        // ── Cartolendas: disparar eventos em tempo real ──
        CartolendaEventos::fire('rodada_finalizada', ['rodada_id' => $id]);
        CartolendaEventos::fire('precos_atualizados', ['rodada_id' => $id]);
        CartolendaEventos::fire('ranking_atualizado', ['rodada_id' => $id]);

        http_response_code(200);
        echo json_encode(['success' => true]);
    }

    /**
     * Calcula e salva os prêmios da rodada (MVP, Artilheiro, Garçom, Pé de Rato,
     * Melhor Goleiro, Melhor Zagueiro) na tabela premios_rodada.
     * Usa Pontos.php como source of truth para cálculo de pontuação.
     */
    private function salvarPremiosRodada(int $rodadaId): void
    {
        // Remove prêmios anteriores desta rodada (caso re-finalize)
        $this->db->execute(
            "DELETE FROM premios_rodada WHERE rodada_id = ?",
            [$rodadaId]
        );

        // Busca todos os jogadores que participaram das partidas desta rodada
        $jogadores = $this->db->fetchAll("
            SELECT
                ep.jogador_id,
                j.nome,
                j.joga_recuado,
                SUM(ep.gols)          AS gols,
                SUM(ep.assistencias)  AS assists,
                SUM(ep.clean_sheet)   AS clean_sheets,
                SUM(CASE WHEN (ep.time_id = cp.timeA_id AND cp.placar_timeA > cp.placar_timeB)
                              OR (ep.time_id = cp.timeB_id AND cp.placar_timeB > cp.placar_timeA)
                         THEN 1 ELSE 0 END) AS vitorias,
                SUM(CASE WHEN cp.placar_timeA = cp.placar_timeB
                         THEN 1 ELSE 0 END) AS empates,
                SUM(CASE WHEN (ep.time_id = cp.timeA_id AND cp.placar_timeA < cp.placar_timeB)
                              OR (ep.time_id = cp.timeB_id AND cp.placar_timeB < cp.placar_timeA)
                         THEN 1 ELSE 0 END) AS derrotas,
                (SELECT COUNT(*) FROM campeonato_partidas gp
                 WHERE gp.rodada_id = ?
                   AND gp.status = 'finalizada'
                   AND (gp.goleiro_timeA_id = ep.jogador_id OR gp.goleiro_timeB_id = ep.jogador_id)
                ) AS is_goleiro
            FROM campeonato_estatisticas_partida ep
            JOIN campeonato_partidas cp ON cp.id = ep.partida_id
               AND cp.rodada_id = ? AND cp.status = 'finalizada'
            JOIN jogadores j ON j.id = ep.jogador_id
            GROUP BY ep.jogador_id, j.nome, j.joga_recuado
        ", [$rodadaId, $rodadaId]);

        if (empty($jogadores)) return;

        // Calcula pontuação de cada jogador
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
                'is_goleiro' => $isGol,
                'is_recuado' => $isRec,
            ];
        }

        // Helper: insere prêmio para TODOS os empatados no topo (ou fundo)
        $insertTied = function (array $lista, string $tipo, string $campo, bool $asc = false) use ($rodadaId) {
            if (empty($lista)) return;
            $arr = array_values($lista);
            usort($arr, fn($a, $b) => $asc ? ($a[$campo] <=> $b[$campo]) : ($b[$campo] <=> $a[$campo]));
            $topVal = $arr[0][$campo];
            foreach ($arr as $p) {
                if ($p[$campo] != $topVal) break;
                $this->db->execute(
                    "INSERT INTO premios_rodada (rodada_id, jogador_id, tipo_premio, pontuacao) VALUES (?, ?, ?, ?)",
                    [$rodadaId, $p['jogador_id'], $tipo, $p[$campo]]
                );
            }
        };

        // ── MVP da Rodada (maior pontuação entre jogadores de LINHA) ──
        $linhaParaMvp = array_values(array_filter($pontuados, fn($p) => !$p['is_goleiro']));
        if (empty($linhaParaMvp)) {
            $linhaParaMvp = $pontuados; // fallback se só houver goleiros
        }
        $insertTied($linhaParaMvp, 'mvp_rodada', 'pts');

        // ── Artilheiro da Rodada (mais gols) ──────────────────
        $artilheiros = array_values(array_filter($pontuados, fn($p) => $p['gols'] > 0));
        $insertTied($artilheiros, 'artilheiro_rodada', 'gols');

        // ── Garçom da Rodada (mais assists) ───────────────────
        $garcons = array_values(array_filter($pontuados, fn($p) => $p['assists'] > 0));
        $insertTied($garcons, 'garcom_rodada', 'assists');

        // ── Melhor Goleiro da Rodada ──────────────────────────
        $goleiros = array_values(array_filter($pontuados, fn($p) => $p['is_goleiro']));
        $insertTied($goleiros, 'melhor_goleiro_rodada', 'pts');

        // ── Melhor Zagueiro/Recuado da Rodada ─────────────────
        $recuados = array_values(array_filter($pontuados, fn($p) => $p['is_recuado'] && !$p['is_goleiro']));
        $insertTied($recuados, 'melhor_zagueiro_rodada', 'pts');

        // ── Pé de Rato da Rodada (menor pontuação entre jogadores de linha) ──
        $linha = array_values(array_filter($pontuados, fn($p) => !$p['is_goleiro'] && !$p['is_recuado']));
        if (count($linha) > 1) {
            $insertTied($linha, 'pe_de_rato_rodada', 'pts', true); // asc = menor pts
        }
    }

    /**
     * Carry-over automático: para técnicos que escalaram na rodada anterior
     * mas NÃO escalaram nesta rodada, herda a escalação anterior.
     * Inspirado no Cartola FC — se o técnico não mexer, mantém o time.
     */
    private function carryOverEscalacao(int $rodadaId): void
    {
        // Descobre o campeonato desta rodada
        $rodada = $this->db->fetchOne(
            "SELECT campeonato_id FROM rodadas WHERE id = ?",
            [$rodadaId]
        );
        if (!$rodada) return;
        $campId = (int)$rodada['campeonato_id'];

        // Busca a rodada finalizada anterior (do mesmo campeonato)
        $rodadaAnterior = $this->db->fetchOne("
            SELECT id FROM rodadas
            WHERE campeonato_id = ? AND id < ? AND status = 'finalizada'
            ORDER BY data DESC, id DESC LIMIT 1
        ", [$campId, $rodadaId]);

        if (!$rodadaAnterior) return; // primeira rodada, sem carry-over
        $rodadaAnteriorId = (int)$rodadaAnterior['id'];

        // Busca técnicos que escalaram na rodada anterior
        $timesAnteriores = $this->db->fetchAll("
            SELECT usuario_id, id AS time_id, orcamento_gasto
            FROM cartolendas_times
            WHERE rodada_id = ? AND calculado = 1
        ", [$rodadaAnteriorId]);

        if (empty($timesAnteriores)) return;

        // Busca quem JÁ escalou nesta rodada
        $jaEscalaram = $this->db->fetchAll("
            SELECT usuario_id FROM cartolendas_times WHERE rodada_id = ?
        ", [$rodadaId]);
        $jaEscalaramIds = array_column($jaEscalaram, 'usuario_id');

        foreach ($timesAnteriores as $ta) {
            $userId = (int)$ta['usuario_id'];

            // Pula se já escalou nesta rodada
            if (in_array($userId, $jaEscalaramIds)) continue;

            // Cria time nesta rodada
            $this->db->execute("
                INSERT INTO cartolendas_times (usuario_id, rodada_id, nome_time, orcamento_gasto, calculado, created_at, updated_at)
                VALUES (?, ?, 'Meu Time', ?, 0, NOW(), NOW())
            ", [$userId, $rodadaId, $ta['orcamento_gasto']]);
            $newTimeId = (int)$this->db->lastInsertId();

            // Copia escalação da rodada anterior
            $escalacaoAnt = $this->db->fetchAll("
                SELECT jogador_id, posicao, eh_reserva, preco_na_escalacao
                FROM cartolendas_escalacao
                WHERE cartolendas_time_id = ?
            ", [$ta['time_id']]);

            foreach ($escalacaoAnt as $esc) {
                $this->db->execute("
                    INSERT INTO cartolendas_escalacao (cartolendas_time_id, jogador_id, posicao, eh_reserva, preco_na_escalacao, pontos_obtidos, jogou, created_at)
                    VALUES (?, ?, ?, ?, ?, 0, 0, NOW())
                ", [$newTimeId, $esc['jogador_id'], $esc['posicao'], $esc['eh_reserva'], $esc['preco_na_escalacao']]);
            }

            // Copia capitão
            $capAnt = $this->db->fetchOne("
                SELECT jogador_id FROM cartolendas_capitao
                WHERE cartolendas_time_id = ? AND rodada_id = ?
            ", [$ta['time_id'], $rodadaAnteriorId]);

            if ($capAnt) {
                $this->db->execute("
                    INSERT INTO cartolendas_capitao (cartolendas_time_id, jogador_id, rodada_id)
                    VALUES (?, ?, ?)
                ", [$newTimeId, $capAnt['jogador_id'], $rodadaId]);
            }

            error_log("[Cartolendas] Carry-over: user {$userId} herdou escalação da rodada {$rodadaAnteriorId} → {$rodadaId} (time {$newTimeId})");
        }
    }

    /**
     * Calcula pontos Cartolendas para todos os times da rodada.
     * Chamado automaticamente ao finalizar rodada.
     */
    private function calcularPontosCartolendas(int $rodadaId): void
    {
        // Busca times Cartolendas que ainda não foram calculados
        $times = $this->db->fetchAll("
            SELECT id, usuario_id
            FROM cartolendas_times
            WHERE rodada_id = ? AND calculado = 0
        ", [$rodadaId]);

        if (empty($times)) return;

        // Busca todas as partidas finalizadas desta rodada
        $partidas = $this->db->fetchAll("
            SELECT id, timeA_id, timeB_id, placar_timeA, placar_timeB,
                   goleiro_timeA_id, goleiro_timeB_id
            FROM campeonato_partidas
            WHERE rodada_id = ? AND status = 'finalizada'
        ", [$rodadaId]);

        if (empty($partidas)) return;

        // Monta mapa: jogador_id → stats agregadas (gols, assistencias, resultado)
        $statsMap = [];

        // Identifica jogadores que REALMENTE participaram (têm eventos ou são goleiros)
        // Isso evita dar V/E/D a jogadores ausentes que estão no elenco
        $jogadoresComEvento = [];
        foreach ($partidas as $p) {
            $pid = (int)$p['id'];
            // Jogadores com gol ou assistência (eventos)
            $eventos = $this->db->fetchAll("
                SELECT DISTINCT jogador_id FROM campeonato_eventos_partida WHERE partida_id = ?
                UNION
                SELECT DISTINCT assist_por_jogador_id FROM campeonato_eventos_partida
                WHERE partida_id = ? AND assist_por_jogador_id IS NOT NULL
            ", [$pid, $pid]);
            foreach ($eventos as $ev) {
                $jogadoresComEvento[(int)$ev['jogador_id']] = true;
            }
            // Goleiros sempre participaram
            if ($p['goleiro_timeA_id']) $jogadoresComEvento[(int)$p['goleiro_timeA_id']] = true;
            if ($p['goleiro_timeB_id']) $jogadoresComEvento[(int)$p['goleiro_timeB_id']] = true;
        }

        foreach ($partidas as $p) {
            $partidaId = (int)$p['id'];
            $placarA   = (int)$p['placar_timeA'];
            $placarB   = (int)$p['placar_timeB'];
            $goleiroA  = $p['goleiro_timeA_id'] ? (int)$p['goleiro_timeA_id'] : null;
            $goleiroB  = $p['goleiro_timeB_id'] ? (int)$p['goleiro_timeB_id'] : null;

            // Resultado por time
            $resultadoA = $placarA > $placarB ? 'vitoria' : ($placarA === $placarB ? 'empate' : 'derrota');
            $resultadoB = $placarB > $placarA ? 'vitoria' : ($placarB === $placarA ? 'empate' : 'derrota');

            // Clean sheet: time não sofreu gol
            $cleanSheetA = ($placarB === 0) ? 1 : 0;
            $cleanSheetB = ($placarA === 0) ? 1 : 0;

            // Busca stats individuais da partida
            $estatisticas = $this->db->fetchAll("
                SELECT ep.jogador_id, ep.time_id, ep.gols, ep.assistencias,
                       j.posicao, j.joga_recuado
                FROM campeonato_estatisticas_partida ep
                JOIN jogadores j ON j.id = ep.jogador_id
                WHERE ep.partida_id = ?
            ", [$partidaId]);

            foreach ($estatisticas as $ep) {
                $jid    = (int)$ep['jogador_id'];
                $timeId = (int)$ep['time_id'];
                $gols   = (int)$ep['gols'];
                $assists = (int)$ep['assistencias'];

                // Determina resultado e clean sheet baseado no time
                if ($timeId === (int)$p['timeA_id']) {
                    $resultado  = $resultadoA;
                    $cleanSheet = $cleanSheetA;
                    $ehGoleiro  = ($goleiroA === $jid);
                } else {
                    $resultado  = $resultadoB;
                    $cleanSheet = $cleanSheetB;
                    $ehGoleiro  = ($goleiroB === $jid);
                }

                // Determina tipo de jogador
                $posicao     = $ep['posicao'];
                $jogaRecuado = !empty($ep['joga_recuado']);

                // Jogador de linha com 0 gols/assists e sem eventos → provavelmente ausente
                // Não recebe V/E/D (fica com 0 pts no Cartolendas)
                $temContribuicao = ($gols > 0 || $assists > 0 || $ehGoleiro || $jogaRecuado || isset($jogadoresComEvento[$jid]));

                // Calcula pontos usando Pontos.php
                $vitorias = $resultado === 'vitoria' ? 1 : 0;
                $empates  = $resultado === 'empate'  ? 1 : 0;
                $derrotas = $resultado === 'derrota' ? 1 : 0;

                if (!$temContribuicao) {
                    // Jogador sem contribuição → 0 pontos (provável ausente)
                    $pts = 0.0;
                } elseif ($posicao === 'goleiro' || $ehGoleiro) {
                    // Goleiro: CS valorizado + penalidade por gols sofridos
                    $golsSofridos = ($timeId === (int)$p['timeA_id']) ? $placarB : $placarA;
                    $pts = Pontos::cartolendas_goleiro($cleanSheet, $golsSofridos, $vitorias, $empates, $derrotas);
                } elseif ($jogaRecuado) {
                    // Zagueiro: CS + gols/assists super valorizados
                    $pts = Pontos::cartolendas_zagueiro($gols, $assists, $cleanSheet, $vitorias, $empates, $derrotas);
                } else {
                    // Linha: gols e assists são o foco
                    $pts = Pontos::cartolendas_linha($gols, $assists, $vitorias, $empates, $derrotas);
                }

                // Acumula (jogador pode ter jogado múltiplas partidas na rodada)
                if (!isset($statsMap[$jid])) {
                    $statsMap[$jid] = 0.0;
                }
                $statsMap[$jid] += $pts;
            }
        }

        // ── Mapa de substituições do check-in ──
        // Quando um jogador é substituído na rodada (ex: Lani → Luis),
        // campeonato_rodada_elencos guarda jogador_original_id = Lani, jogador_id = Luis
        // Isso permite que no Cartolendas, quem escalou Lani receba os pontos de Luis.
        $subsRows = $this->db->fetchAll("
            SELECT jogador_original_id, jogador_id
            FROM campeonato_rodada_elencos
            WHERE rodada_id = ? AND jogador_original_id IS NOT NULL
        ", [$rodadaId]);
        $subMap = []; // original_id → substituto_id
        foreach ($subsRows as $sr) {
            $subMap[(int)$sr['jogador_original_id']] = (int)$sr['jogador_id'];
        }

        // Agora calcula para cada time Cartolendas
        foreach ($times as $time) {
            $timeId  = (int)$time['id'];
            $userId  = (int)$time['usuario_id'];

            // Busca escalação (titulares + reservas)
            $escalacao = $this->db->fetchAll("
                SELECT jogador_id, eh_reserva
                FROM cartolendas_escalacao
                WHERE cartolendas_time_id = ?
            ", [$timeId]);

            // Busca capitão
            $capRow = $this->db->fetchOne("
                SELECT jogador_id FROM cartolendas_capitao
                WHERE cartolendas_time_id = ? AND rodada_id = ?
            ", [$timeId, $rodadaId]);
            $capitaoId = $capRow ? (int)$capRow['jogador_id'] : 0;

            // Separa titulares e reservas
            $titulares = [];
            $reservas  = [];
            foreach ($escalacao as $esc) {
                if ((int)$esc['eh_reserva']) {
                    $reservas[] = (int)$esc['jogador_id'];
                } else {
                    $titulares[] = (int)$esc['jogador_id'];
                }
            }

            // ── Calcula pontos de cada titular (com mapa de substituição) ──
            $titularPontos = []; // jid → pts (já considerando substituição do check-in)
            foreach ($titulares as $jid) {
                // Se o jogador escalado foi substituído no check-in, usa os pontos do substituto
                $lookupId = $subMap[$jid] ?? $jid;
                $pts = $statsMap[$lookupId] ?? 0.0;
                $titularPontos[$jid] = $pts;
            }

            // ── Nova lógica de reserva ──
            // Reserva substitui o titular com MENOR pontuação,
            // mas SOMENTE se o reserva pontuou mais que esse titular.
            $reservaUsado       = false;
            $reservaJogId       = !empty($reservas) ? $reservas[0] : null;
            $titularSubstituido = null;
            $ptsReserva         = 0.0;

            if ($reservaJogId) {
                $lookupReserva = $subMap[$reservaJogId] ?? $reservaJogId;
                $ptsReserva    = $statsMap[$lookupReserva] ?? 0.0;

                // Encontra o titular com a menor pontuação
                $menorPts = null;
                $menorJid = null;
                foreach ($titularPontos as $jid => $pts) {
                    if ($menorPts === null || $pts < $menorPts) {
                        $menorPts = $pts;
                        $menorJid = $jid;
                    }
                }

                // Reserva entra se pontuou MAIS que o pior titular
                if ($menorJid !== null && $ptsReserva > $menorPts) {
                    $titularSubstituido = $menorJid;
                    $reservaUsado = true;

                    // Marca substituição na escalação
                    $this->db->execute("
                        UPDATE cartolendas_escalacao
                        SET jogou = 0, substituido_por_id = ?
                        WHERE cartolendas_time_id = ? AND jogador_id = ?
                    ", [$reservaJogId, $timeId, $menorJid]);

                    $this->db->execute("
                        UPDATE cartolendas_escalacao
                        SET jogou = 1
                        WHERE cartolendas_time_id = ? AND jogador_id = ?
                    ", [$timeId, $reservaJogId]);
                }
            }

            $totalPontos = 0.0;

            // Calcula pontos dos titulares
            foreach ($titulares as $jid) {
                $lookupId = $subMap[$jid] ?? $jid;
                $jogou    = isset($statsMap[$lookupId]);
                $pts      = $titularPontos[$jid];

                // Se titular foi substituído pela reserva → 0 pts (reserva assume)
                if ($jid === $titularSubstituido) {
                    $pts   = 0.0;
                    $jogou = false;
                }

                // Capitão: pontos dobrados
                if ($jid === $capitaoId && $jogou) {
                    $pts *= 2;
                }

                // Atualiza pontos individuais
                $this->db->execute("
                    UPDATE cartolendas_escalacao
                    SET pontos_obtidos = ?, jogou = ?
                    WHERE cartolendas_time_id = ? AND jogador_id = ?
                ", [$pts, $jogou ? 1 : 0, $timeId, $jid]);

                $totalPontos += $pts;
            }

            // Calcula pontos da reserva
            if ($reservaJogId) {
                $ptsReservaFinal = $reservaUsado ? $ptsReserva : 0.0;

                $this->db->execute("
                    UPDATE cartolendas_escalacao
                    SET pontos_obtidos = ?, jogou = ?
                    WHERE cartolendas_time_id = ? AND jogador_id = ?
                ", [$ptsReservaFinal, $reservaUsado ? 1 : 0, $timeId, $reservaJogId]);

                $totalPontos += $ptsReservaFinal;
            }

            // Atualiza total do time
            $this->db->execute("
                UPDATE cartolendas_times
                SET total_pontos = ?, calculado = 1
                WHERE id = ?
            ", [$totalPontos, $timeId]);

            // Atualiza ranking global do usuário
            $this->db->execute("
                INSERT INTO cartolendas_ranking (usuario_id, pontos_total, rodadas_jogadas, melhor_rodada_pts)
                VALUES (?, ?, 1, ?)
                ON DUPLICATE KEY UPDATE
                    pontos_total    = pontos_total + VALUES(pontos_total),
                    rodadas_jogadas = rodadas_jogadas + 1,
                    melhor_rodada_pts = GREATEST(melhor_rodada_pts, VALUES(melhor_rodada_pts))
            ", [$userId, $totalPontos, $totalPontos]);

            // Atualiza divisão baseada em pontos
            $rankRow = $this->db->fetchOne("
                SELECT pontos_total, lendas_coins FROM cartolendas_ranking WHERE usuario_id = ?
            ", [$userId]);
            if ($rankRow) {
                $pontosTotal = (float)$rankRow['pontos_total'];
                $divisao = 'Bronze';
                if ($pontosTotal >= 1500) $divisao = 'Lenda';
                elseif ($pontosTotal >= 800) $divisao = 'Ouro';
                elseif ($pontosTotal >= 300) $divisao = 'Prata';

                $this->db->execute("
                    UPDATE cartolendas_ranking SET divisao = ? WHERE usuario_id = ?
                ", [$divisao, $userId]);

                // Salva snapshot do saldo LC no time para tracking de evolução
                $saldoLC = (float)($rankRow['lendas_coins'] ?? 100.0);
                $this->db->execute("
                    UPDATE cartolendas_times SET saldo_lc_apos = ? WHERE id = ?
                ", [$saldoLC, $timeId]);
            }

            // ── PATRIMÔNIO: soma dos preços atuais dos jogadores escalados ──
            // Busca preços atualizados (após atualizarPrecosCartolendas rodar)
            // Como esta função roda ANTES de atualizarPrecos, usamos um callback
            // que será chamado depois. Por ora, salvamos o timeId para calcular depois.
            // O patrimônio será calculado no recalcularCartolendas e no finalizar.
        }
    }

    /**
     * Atualiza preços dos jogadores após finalizar rodada.
     * Fórmula: variação = (pontos_rodada - média_geral) × 0.5
     * Limites: variação ±3.00 por rodada, preço entre 5.00 e 25.00
     * Jogador que não jogou: -0.50
     */
    private function atualizarPrecosCartolendas(int $rodadaId): void
    {
        // Busca o campeonato desta rodada
        $rodadaInfo = $this->db->fetchOne("SELECT campeonato_id FROM rodadas WHERE id = ?", [$rodadaId]);
        if (!$rodadaInfo) return;
        $campeonatoId = (int)$rodadaInfo['campeonato_id'];

        // Busca jogadores que REALMENTE participaram:
        // 1. Têm eventos (gol, assistência) OU
        // 2. São goleiros designados OU
        // 3. São recuados com stats OU
        // 4. Têm gols ou assistências nas stats
        // Isso evita dar valorização a jogadores ausentes
        $jogadoresComEvento = $this->db->fetchAll("
            SELECT DISTINCT ev.jogador_id
            FROM campeonato_eventos_partida ev
            JOIN campeonato_partidas cp ON cp.id = ev.partida_id
            WHERE cp.rodada_id = ? AND cp.status = 'finalizada'
            UNION
            SELECT DISTINCT ev.assist_por_jogador_id
            FROM campeonato_eventos_partida ev
            JOIN campeonato_partidas cp ON cp.id = ev.partida_id
            WHERE cp.rodada_id = ? AND cp.status = 'finalizada' AND ev.assist_por_jogador_id IS NOT NULL
            UNION
            SELECT goleiro_timeA_id FROM campeonato_partidas WHERE rodada_id = ? AND status = 'finalizada' AND goleiro_timeA_id IS NOT NULL
            UNION
            SELECT goleiro_timeB_id FROM campeonato_partidas WHERE rodada_id = ? AND status = 'finalizada' AND goleiro_timeB_id IS NOT NULL
        ", [$rodadaId, $rodadaId, $rodadaId, $rodadaId]);

        // Também inclui TODOS os jogadores que têm estatísticas nas partidas
        // (inclui jogadores de linha que jogaram mas não fizeram gol/assist)
        $jogadoresComStats = $this->db->fetchAll("
            SELECT DISTINCT ep.jogador_id
            FROM campeonato_estatisticas_partida ep
            JOIN campeonato_partidas cp ON cp.id = ep.partida_id
            WHERE cp.rodada_id = ? AND cp.status = 'finalizada'
        ", [$rodadaId]);

        $jogadoresQueJogaram = [];
        foreach ($jogadoresComEvento as $jr) {
            $jogadoresQueJogaram[(int)$jr['jogador_id']] = true;
        }
        foreach ($jogadoresComStats as $jr) {
            $jogadoresQueJogaram[(int)$jr['jogador_id']] = true;
        }

        if (empty($jogadoresQueJogaram)) return;

        // Calcula pontos REAIS de cada jogador nesta rodada baseado na performance em partidas
        // (NÃO usa cartolendas_escalacao — isso daria pontos de substitutos ao jogador original)
        $partidas = $this->db->fetchAll("
            SELECT id, timeA_id, timeB_id, placar_timeA, placar_timeB,
                   goleiro_timeA_id, goleiro_timeB_id
            FROM campeonato_partidas
            WHERE rodada_id = ? AND status = 'finalizada'
        ", [$rodadaId]);

        $pontosReais = []; // jogador_id => pontos reais da rodada
        foreach ($partidas as $p) {
            $partidaId = (int)$p['id'];
            $placarA   = (int)$p['placar_timeA'];
            $placarB   = (int)$p['placar_timeB'];
            $goleiroA  = $p['goleiro_timeA_id'] ? (int)$p['goleiro_timeA_id'] : null;
            $goleiroB  = $p['goleiro_timeB_id'] ? (int)$p['goleiro_timeB_id'] : null;

            $resultadoA = $placarA > $placarB ? 'vitoria' : ($placarA === $placarB ? 'empate' : 'derrota');
            $resultadoB = $placarB > $placarA ? 'vitoria' : ($placarB === $placarA ? 'empate' : 'derrota');
            $cleanSheetA = ($placarB === 0) ? 1 : 0;
            $cleanSheetB = ($placarA === 0) ? 1 : 0;

            $estatisticas = $this->db->fetchAll("
                SELECT ep.jogador_id, ep.time_id, ep.gols, ep.assistencias,
                       COALESCE(ep.gols_contra, 0) AS gols_contra,
                       j.joga_recuado
                FROM campeonato_estatisticas_partida ep
                JOIN jogadores j ON j.id = ep.jogador_id
                WHERE ep.partida_id = ?
            ", [$partidaId]);

            foreach ($estatisticas as $ep) {
                $jid = (int)$ep['jogador_id'];

                // Só calcula pontos para quem REALMENTE jogou
                if (!isset($jogadoresQueJogaram[$jid])) continue;

                $timeId = (int)$ep['time_id'];
                $gols   = (int)$ep['gols'];
                $assists = (int)$ep['assistencias'];
                $gc     = (int)$ep['gols_contra'];

                if ($timeId === (int)$p['timeA_id']) {
                    $resultado  = $resultadoA;
                    $cleanSheet = $cleanSheetA;
                    $ehGoleiro  = ($goleiroA === $jid);
                } else {
                    $resultado  = $resultadoB;
                    $cleanSheet = $cleanSheetB;
                    $ehGoleiro  = ($goleiroB === $jid);
                }

                $jogaRecuado = !empty($ep['joga_recuado']);
                $vitorias = $resultado === 'vitoria' ? 1 : 0;
                $empates  = $resultado === 'empate'  ? 1 : 0;
                $derrotas = $resultado === 'derrota' ? 1 : 0;

                if ($ehGoleiro) {
                    $golsSofridos = ($timeId === (int)$p['timeA_id']) ? $placarB : $placarA;
                    $pts = Pontos::cartolendas_goleiro($cleanSheet, $golsSofridos, $vitorias, $empates, $derrotas);
                } elseif ($jogaRecuado) {
                    $pts = Pontos::cartolendas_zagueiro($gols, $assists, $cleanSheet, $vitorias, $empates, $derrotas, $gc);
                } else {
                    $pts = Pontos::cartolendas_linha($gols, $assists, $vitorias, $empates, $derrotas, $gc);
                }

                if (!isset($pontosReais[$jid])) {
                    $pontosReais[$jid] = 0.0;
                }
                $pontosReais[$jid] += $pts;
            }
        }

        if (empty($pontosReais)) return;

        // Calcula média geral da rodada (baseada nos pontos REAIS dos jogadores que jogaram)
        $somaTotal = 0.0;
        $countTotal = 0;
        foreach ($pontosReais as $jid => $pts) {
            $somaTotal += $pts;
            $countTotal++;
        }

        $mediaGeral = $countTotal > 0 ? $somaTotal / $countTotal : 0.0;

        // Busca rodada anterior DO MESMO CAMPEONATO para pegar preço base
        $rodadaAnterior = $this->db->fetchOne("
            SELECT id FROM rodadas
            WHERE id < ? AND campeonato_id = ? AND status = 'finalizada'
            ORDER BY id DESC LIMIT 1
        ", [$rodadaId, $campeonatoId]);
        $rodadaAnteriorId = $rodadaAnterior ? (int)$rodadaAnterior['id'] : null;

        // Busca apenas jogadores inscritos no campeonato (via elencos dos times)
        $todosJogadores = $this->db->fetchAll("
            SELECT DISTINCT ce.jogador_id AS id
            FROM campeonato_elencos ce
            WHERE ce.campeonato_id = ?
        ", [$campeonatoId]);

        foreach ($todosJogadores as $jog) {
            $jid = (int)$jog['id'];

            // Preço anterior (da rodada anterior, ou 10.00 se primeira rodada)
            $precoAnterior = 10.00;
            if ($rodadaAnteriorId) {
                $precoRow = $this->db->fetchOne("
                    SELECT preco FROM cartolendas_precos
                    WHERE jogador_id = ? AND rodada_id = ?
                ", [$jid, $rodadaAnteriorId]);
                if ($precoRow) {
                    $precoAnterior = (float)$precoRow['preco'];
                }
            }

            // Calcula variação — baseada na performance REAL do jogador
            // Fator 0.3 (era 0.5) porque pontos Cartolendas são maiores
            if (isset($pontosReais[$jid])) {
                // Jogador jogou — variação baseada em performance real vs média
                $variacao = ($pontosReais[$jid] - $mediaGeral) * 0.3;
            } else {
                // Jogador não jogou nesta rodada (inclui substituídos) — leve desvalorização
                $variacao = -0.50;
            }

            // Limita variação: máximo ±5.00 por rodada (era ±3.00)
            $variacao = max(-5.00, min(5.00, $variacao));

            // Calcula novo preço com limites: 3.00 a 35.00 (era 5.00 a 25.00)
            $novoPreco = $precoAnterior + $variacao;
            $novoPreco = max(3.00, min(35.00, $novoPreco));

            // Variação real (pode ser diferente da calculada por causa dos limites)
            $variacaoReal = round($novoPreco - $precoAnterior, 2);

            // Calcula média de pontos (média ponderada com histórico)
            $mediaRow = $this->db->fetchOne("
                SELECT AVG(pontos_rodada) AS media
                FROM cartolendas_precos
                WHERE jogador_id = ? AND pontos_rodada IS NOT NULL
            ", [$jid]);
            $mediaHistorica = $mediaRow && $mediaRow['media'] !== null ? (float)$mediaRow['media'] : 0.0;
            // Só atribui pontos se o jogador realmente jogou
            $pontosRodadaAtual = isset($pontosReais[$jid]) ? $pontosReais[$jid] : 0.0;
            // Média simples: (histórica + atual) / 2, ou só atual se não tem histórico
            $mediaPontos = $mediaHistorica > 0
                ? round(($mediaHistorica + $pontosRodadaAtual) / 2, 2)
                : round($pontosRodadaAtual, 2);

            // Upsert preço para esta rodada
            $this->db->execute("
                INSERT INTO cartolendas_precos (jogador_id, rodada_id, preco, variacao, pontos_rodada, media_pontos)
                VALUES (?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    preco = VALUES(preco),
                    variacao = VALUES(variacao),
                    pontos_rodada = VALUES(pontos_rodada),
                    media_pontos = VALUES(media_pontos)
            ", [$jid, $rodadaId, round($novoPreco, 2), $variacaoReal, $pontosRodadaAtual, $mediaPontos]);

            // Registra histórico de preços
            $this->db->execute("
                INSERT INTO cartolendas_historico_precos (jogador_id, rodada_id, preco_antes, preco_depois, variacao)
                VALUES (?, ?, ?, ?, ?)
            ", [$jid, $rodadaId, $precoAnterior, round($novoPreco, 2), $variacaoReal]);
        }
    }

    // =========================================================
    // RECALCULAR CARTOLENDAS — recalcula pontos e preços
    // para TODAS as rodadas finalizadas (corrige dados antigos)
    // =========================================================
    public function recalcularCartolendas(): array
    {
        $log = [];

        // 1. Busca todas as rodadas finalizadas em ordem
        $rodadas = $this->db->fetchAll("
            SELECT id, data, campeonato_id FROM rodadas
            WHERE status = 'finalizada'
            ORDER BY id ASC
        ");

        if (empty($rodadas)) {
            return ['message' => 'Nenhuma rodada finalizada encontrada.'];
        }

        $log[] = count($rodadas) . ' rodadas finalizadas encontradas.';

        // 2. Reset: marca todos os cartolendas_times como não calculados
        $this->db->execute("UPDATE cartolendas_times SET calculado = 0, total_pontos = 0");
        $log[] = 'Reset: calculado = 0 em todos os cartolendas_times.';

        // 3. Reset: zera ranking global para recalcular do zero
        // IMPORTANTE: lendas_coins volta para 100.00 (valor inicial) para acumular deltas do zero
        $this->db->execute("UPDATE cartolendas_ranking SET pontos_total = 0, rodadas_jogadas = 0, melhor_rodada_pts = 0, lendas_coins = 100.00, patrimonio = 0, patrimonio_anterior = 0");
        $log[] = 'Reset: ranking zerado para recalcular (incluindo lendas_coins → 100).';

        // 4. Reset: apaga todos os preços e histórico para recalcular na ordem correta
        $this->db->execute("DELETE FROM cartolendas_precos");
        $this->db->execute("DELETE FROM cartolendas_historico_precos");
        $log[] = 'Reset: preços e histórico de preços apagados.';

        // 5. Reset: limpa pontos e flags de escalação
        $this->db->execute("UPDATE cartolendas_escalacao SET pontos_obtidos = 0, jogou = 0, substituido_por_id = NULL");
        $log[] = 'Reset: escalações zeradas.';

        // 6. Recalcula cada rodada na ordem
        foreach ($rodadas as $rod) {
            $rodId = (int)$rod['id'];
            $dataRod = $rod['data'] ?? '?';

            $this->calcularPontosCartolendas($rodId);
            $this->atualizarPrecosCartolendas($rodId);

            // 6b. Calcula patrimônio de cada time nesta rodada
            $this->calcularPatrimonioRodada($rodId);

            $log[] = "Rodada {$dataRod} (id={$rodId}): recalculada.";
        }

        // 7. Recalcula divisões
        $rankings = $this->db->fetchAll("SELECT usuario_id, pontos_total FROM cartolendas_ranking");
        foreach ($rankings as $r) {
            $pts = (float)$r['pontos_total'];
            $divisao = 'Bronze';
            if ($pts >= 500) $divisao = 'Lenda';
            elseif ($pts >= 250) $divisao = 'Ouro';
            elseif ($pts >= 100) $divisao = 'Prata';
            $this->db->execute("UPDATE cartolendas_ranking SET divisao = ? WHERE usuario_id = ?", [$divisao, (int)$r['usuario_id']]);
        }
        $log[] = 'Divisões recalculadas.';

        return ['success' => true, 'log' => $log];
    }

    // =========================================================
    // PATRIMÔNIO — Calcula o valor total do time de cada técnico
    // baseado nos preços atualizados dos jogadores escalados
    // =========================================================
    private function calcularPatrimonioRodada(int $rodadaId): void
    {
        // Busca todos os times desta rodada que foram calculados
        $times = $this->db->fetchAll("
            SELECT id, usuario_id, orcamento_gasto FROM cartolendas_times
            WHERE rodada_id = ? AND calculado = 1
        ", [$rodadaId]);

        foreach ($times as $time) {
            $timeId = (int)$time['id'];
            $userId = (int)$time['usuario_id'];

            // Busca preços atuais (pós-rodada) E preço na escalação (pré-rodada) dos jogadores
            $escalacao = $this->db->fetchAll("
                SELECT e.jogador_id,
                       COALESCE(p.preco, 10.00) AS preco_atual,
                       COALESCE(e.preco_na_escalacao, 10.00) AS preco_compra
                FROM cartolendas_escalacao e
                LEFT JOIN cartolendas_precos p ON p.jogador_id = e.jogador_id AND p.rodada_id = ?
                WHERE e.cartolendas_time_id = ?
            ", [$rodadaId, $timeId]);

            $patrimonio = 0.0;
            $valorAntes = 0.0; // quanto os jogadores valiam na escalação
            $valorDepois = 0.0; // quanto valem agora

            foreach ($escalacao as $esc) {
                $precoAtual  = (float)$esc['preco_atual'];
                $precoCompra = (float)$esc['preco_compra'];

                $patrimonio  += $precoAtual;
                $valorAntes  += $precoCompra;
                $valorDepois += $precoAtual;

                // Salva preco_apos_rodada em cada escalação (para histórico)
                $this->db->execute("
                    UPDATE cartolendas_escalacao
                    SET preco_apos_rodada = ?
                    WHERE cartolendas_time_id = ? AND jogador_id = ?
                ", [$precoAtual, $timeId, (int)$esc['jogador_id']]);
            }

            // ── Reajuste da verba (lendas_coins) ──
            // Se seus jogadores valorizaram, sua verba sobe.
            // Se desvalorizaram, cai. Estilo Cartola FC.
            //
            // Fórmula: lendas_coins += (valor_depois - valor_antes)
            // Ex: comprou por 95, jogadores agora valem 103 → +8 LC de verba
            $deltaValorizacao = round($valorDepois - $valorAntes, 2);

            if ($deltaValorizacao != 0) {
                $this->db->execute("
                    UPDATE cartolendas_ranking
                    SET lendas_coins = GREATEST(50.00, lendas_coins + ?),
                        patrimonio_anterior = patrimonio
                    WHERE usuario_id = ?
                ", [$deltaValorizacao, $userId]);

                error_log("[Cartolendas] Reajuste verba user {$userId}: antes={$valorAntes} depois={$valorDepois} delta={$deltaValorizacao}");
            }

            // Salva patrimônio no time
            $this->db->execute("
                UPDATE cartolendas_times SET patrimonio_apos = ? WHERE id = ?
            ", [round($patrimonio, 2), $timeId]);

            // Atualiza patrimônio no ranking global
            $this->db->execute("
                UPDATE cartolendas_ranking SET patrimonio = ? WHERE usuario_id = ?
            ", [round($patrimonio, 2), $userId]);
        }
    }

    // =========================================================
    // JOGADORES DA RODADA
    // GET /rodadas/:id/jogadores
    // =========================================================
    public function jogadores(int $id): void
    {
        $this->getRodadaOr404($id);

        $jogadores = $this->db->fetchAll("
            SELECT j.id, j.nome, j.nivel, j.foto_url, j.posicao, j.joga_recuado,
                   j.nota_ultima_rodada
            FROM rodada_jogadores rj
            JOIN jogadores j ON j.id = rj.jogador_id
            WHERE rj.rodada_id = ?
            ORDER BY j.nome ASC
        ", [$id]);

        http_response_code(200);
        echo json_encode($jogadores, JSON_UNESCAPED_UNICODE);
    }

    // =========================================================
    // SYNC JOGADORES
    // POST /rodadas/:id/sync-jogadores   body: { nomes: [] }
    // Encontra ou cria jogadores, vincula à rodada
    // =========================================================
    public function syncJogadores(int $id): void
    {
        $this->getRodadaOr404($id);
        $input = $this->json();
        $nomes = $input['nomes'] ?? [];

        if (empty($nomes)) throw new HttpError('nomes[] é obrigatório.', 400);

        // Remove vínculos antigos
        $this->db->execute("DELETE FROM rodada_jogadores WHERE rodada_id = ?", [$id]);

        $jogadores = []; $novos = 0; $existentes = 0;

        foreach ($nomes as $nome) {
            $nome = trim($nome);
            if (!$nome) continue;

            $jogador = $this->db->fetchOne(
                "SELECT id, nome, nivel, foto_url, posicao, joga_recuado, nota_ultima_rodada
                 FROM jogadores WHERE LOWER(nome) = LOWER(?)",
                [$nome]
            );

            if ($jogador) {
                $existentes++;
            } else {
                $this->db->execute(
                    "INSERT INTO jogadores (nome, nivel, posicao) VALUES (?, 5, 'linha')",
                    [$nome]
                );
                $jogadorId = (int)$this->db->lastInsertId();
                $jogador = $this->db->fetchOne(
                    "SELECT id, nome, nivel, foto_url, posicao, joga_recuado, nota_ultima_rodada
                     FROM jogadores WHERE id = ?",
                    [$jogadorId]
                );
                $novos++;
            }

            // Vincula à rodada
            $this->db->execute(
                "INSERT IGNORE INTO rodada_jogadores (rodada_id, jogador_id) VALUES (?, ?)",
                [$id, $jogador['id']]
            );

            $jogadores[] = $jogador;
        }

        http_response_code(200);
        echo json_encode([
            'jogadores'  => $jogadores,
            'novos'      => $novos,
            'existentes' => $existentes,
        ], JSON_UNESCAPED_UNICODE);
    }

    // =========================================================
    // UPDATE BATCH DE JOGADORES (notas/recuado)
    // PUT /jogadores/batch   body: { jogadores: [{id, nivel, nota_ultima_rodada, joga_recuado}] }
    // =========================================================
    public function updateJogadoresBatch(): void
    {
        $input = $this->json();
        $jogadores = $input['jogadores'] ?? [];

        if (empty($jogadores)) throw new HttpError('jogadores[] é obrigatório.', 400);

        foreach ($jogadores as $j) {
            if (empty($j['id'])) continue;

            $fields = []; $params = [];
            if (isset($j['nivel']))              { $fields[] = 'nivel = ?';              $params[] = (int)$j['nivel']; }
            if (isset($j['nota_ultima_rodada'])) { $fields[] = 'nota_ultima_rodada = ?'; $params[] = (int)$j['nota_ultima_rodada']; }
            if (isset($j['joga_recuado']))       { $fields[] = 'joga_recuado = ?';       $params[] = $j['joga_recuado'] ? 1 : 0; }

            if (!empty($fields)) {
                $params[] = (int)$j['id'];
                $this->db->execute(
                    "UPDATE jogadores SET " . implode(', ', $fields) . " WHERE id = ?",
                    $params
                );
            }
        }

        http_response_code(200);
        echo json_encode(['success' => true]);
    }

    // =========================================================
    // GET TIMES DA RODADA
    // GET /rodadas/:id/times
    // Retorna jogadores com numero_time e nome_time
    // =========================================================
    public function getTimes(int $id): void
    {
        $this->getRodadaOr404($id);

        $jogadores = $this->db->fetchAll("
            SELECT j.id, j.nome, j.nivel, j.posicao, j.foto_url,
                   rt.numero_time, rt.nome_time
            FROM rodada_times rt
            JOIN jogadores j ON j.id = rt.jogador_id
            WHERE rt.rodada_id = ?
            ORDER BY rt.numero_time ASC, j.nome ASC
        ", [$id]);

        http_response_code(200);
        echo json_encode($jogadores, JSON_UNESCAPED_UNICODE);
    }

    // =========================================================
    // SALVAR TIMES DA RODADA (sorteio/manual)
    // POST /rodadas/:id/times
    // body: { times: [{ nome: string, jogadores: [{id}] }] }
    // =========================================================
    public function saveTimes(int $id): void
    {
        $this->getRodadaOr404($id);
        $input = $this->json();
        $times = $input['times'] ?? [];

        if (empty($times)) throw new HttpError('times[] é obrigatório.', 400);

        // Limpa times anteriores
        $this->db->execute("DELETE FROM rodada_times WHERE rodada_id = ?", [$id]);

        foreach ($times as $idx => $time) {
            $numeroTime = $idx + 1;
            $nomeTime   = $time['nome'] ?? "Time {$numeroTime}";

            foreach ($time['jogadores'] ?? [] as $j) {
                $jogadorId = (int)($j['id'] ?? 0);
                if (!$jogadorId) continue;

                $this->db->execute(
                    "INSERT INTO rodada_times (rodada_id, jogador_id, numero_time, nome_time) VALUES (?, ?, ?, ?)",
                    [$id, $jogadorId, $numeroTime, $nomeTime]
                );
            }
        }

        http_response_code(201);
        echo json_encode(['success' => true, 'message' => 'Times salvos com sucesso!']);
    }

    // =========================================================
    // CRIAR PARTIDA VAZIA
    // POST /rodadas/:id/partidas
    // O front cria a partida vazia e depois atualiza via PUT /partidas/:id/finalizar
    // =========================================================
    public function createPartida(int $id): void
    {
        $rodada = $this->getRodadaOr404($id);
        $campId = (int)($rodada['campeonato_id'] ?? 0);

        if ($campId) {
            // Rodada de campeonato → campeonato_partidas
            $this->db->execute(
                "INSERT INTO campeonato_partidas
                    (campeonato_id, rodada_id, fase, timeA_id, timeB_id, status)
                 VALUES (?, ?, 'futlendao', 0, 0, 'em_andamento')",
                [$campId, $id]
            );
        } else {
            // Rodada de liga → tabela legada
            $this->db->execute(
                "INSERT INTO partidas (rodada_id, status) VALUES (?, 'em_andamento')",
                [$id]
            );
        }

        $partidaId = (int)$this->db->lastInsertId();

        http_response_code(201);
        echo json_encode(['id' => $partidaId, 'rodada_id' => $id, 'status' => 'em_andamento']);
    }

    // =========================================================
    // FINALIZAR PARTIDA
    // PUT /partidas/:id/finalizar
    // body: { placar_time1, placar_time2, jogadores_time1[], jogadores_time2[] }
    // =========================================================
    public function finalizarPartida(int $id): void
    {
        $partida = $this->db->fetchOne("SELECT * FROM campeonato_partidas WHERE id = ?", [$id]);
        if (!$partida) throw new HttpError('Partida não encontrada.', 404);

        $input   = $this->json();
        $placarA = (int)($input['placar_timeA'] ?? $input['placar_time1'] ?? 0);
        $placarB = (int)($input['placar_timeB'] ?? $input['placar_time2'] ?? 0);
        $timeAId = (int)($input['timeA_id'] ?? $input['time1_id'] ?? $partida['timeA_id']);
        $timeBId = (int)($input['timeB_id'] ?? $input['time2_id'] ?? $partida['timeB_id']);

        // Penaltis (para mata-mata)
        $penA = isset($input['placar_penaltis_timeA']) ? (int)$input['placar_penaltis_timeA'] : null;
        $penB = isset($input['placar_penaltis_timeB']) ? (int)$input['placar_penaltis_timeB'] : null;

        $this->db->execute("
            UPDATE campeonato_partidas
            SET placar_timeA = ?, placar_timeB = ?,
                placar_penaltis_timeA = ?, placar_penaltis_timeB = ?,
                timeA_id = ?, timeB_id = ?,
                status = 'finalizada', fim_em = NOW()
            WHERE id = ?
        ", [$placarA, $placarB, $penA, $penB, $timeAId, $timeBId, $id]);

        // Salva estatísticas individuais
        $this->db->execute("DELETE FROM campeonato_estatisticas_partida WHERE partida_id = ?", [$id]);

        $jogTime1 = $input['jogadores_time1'] ?? $input['timeA_jogadores'] ?? [];
        $jogTime2 = $input['jogadores_time2'] ?? $input['timeB_jogadores'] ?? [];

        // Calcula clean_sheet: time não sofreu gol
        $csTimeA = ($placarB == 0) ? 1 : 0;
        $csTimeB = ($placarA == 0) ? 1 : 0;

        foreach ([[$jogTime1, $timeAId, $csTimeA], [$jogTime2, $timeBId, $csTimeB]] as [$grupo, $timeId, $cs]) {
            foreach ($grupo as $j) {
                $jogId = (int)($j['jogador_id'] ?? $j['id'] ?? 0);
                if (!$jogId) continue;
                $this->db->execute("
                    INSERT INTO campeonato_estatisticas_partida
                        (partida_id, jogador_id, time_id, gols, assistencias, clean_sheet, gols_contra)
                    VALUES (?, ?, ?, ?, ?, ?, 0)
                    ON DUPLICATE KEY UPDATE gols = VALUES(gols), assistencias = VALUES(assistencias), clean_sheet = VALUES(clean_sheet), gols_contra = VALUES(gols_contra)
                ", [$id, $jogId, $timeId, (int)($j['gols'] ?? 0), (int)($j['assistencias'] ?? 0), $cs]);
            }
        }

        // Garante que goleiros tenham registro em stats
        $goleiroAId = !empty($partida['goleiro_timeA_id']) ? (int)$partida['goleiro_timeA_id'] : null;
        $goleiroBId = !empty($partida['goleiro_timeB_id']) ? (int)$partida['goleiro_timeB_id'] : null;
        foreach ([[$goleiroAId, $timeAId, $csTimeA], [$goleiroBId, $timeBId, $csTimeB]] as [$golId, $tId, $cs]) {
            if ($golId) {
                $this->db->execute("
                    INSERT IGNORE INTO campeonato_estatisticas_partida
                        (partida_id, jogador_id, time_id, gols, assistencias, clean_sheet, gols_contra)
                    VALUES (?, ?, ?, 0, 0, ?, 0)
                ", [$id, $golId, $tId, $cs]);
            }
        }

        // Avanço automático no mata-mata
        if (($partida['fase'] ?? '') === 'mata_mata') {
            $this->avancarVencedorMataMata($partida, $placarA, $placarB, $penA, $penB);
        }

        http_response_code(200);
        echo json_encode(['success' => true]);
    }

    // =========================================================
    // GET PARTIDAS DA RODADA (histórico)
    // GET /campeonatos/rodada/:id/partidas
    // =========================================================
    public function getPartidas(int $rodadaId): void
    {
        $this->getRodadaOr404($rodadaId);

        $partidas = $this->db->fetchAll("
            SELECT
                p.id, p.rodada_id, p.status,
                p.placar_timeA, p.placar_timeB,
                p.duracao_segundos,
                p.goleiro_timeA_id, p.goleiro_timeB_id,
                t1.id AS timeA_id, t1.nome AS nome_timeA, t1.logo_url AS timeA_logo_url,
                t2.id AS timeB_id, t2.nome AS nome_timeB, t2.logo_url AS timeB_logo_url
            FROM campeonato_partidas p
            LEFT JOIN times t1 ON t1.id = p.timeA_id
            LEFT JOIN times t2 ON t2.id = p.timeB_id
            WHERE p.rodada_id = ? AND p.status = 'finalizada'
            ORDER BY p.id ASC
        ", [$rodadaId]);

        http_response_code(200);
        echo json_encode($partidas, JSON_UNESCAPED_UNICODE);
    }

    // =========================================================
    // SALVAR PARTIDA COMPLETA (do useSalvarPartidaCampeonato)
    // POST /campeonatos/rodada/:id/partida
    // body: { timeA_id, timeB_id, placar_timeA, placar_timeB,
    //         duracao_segundos, timeA_jogadores[], timeB_jogadores[], eventos[] }
    // =========================================================
    public function salvarPartida(int $rodadaId): void
    {
        $rodada  = $this->getRodadaOr404($rodadaId);
        $input   = $this->json();

        $campId      = (int)($rodada['campeonato_id'] ?? 0);
        $timeAId     = (int)($input['timeA_id'] ?? 0);
        $timeBId     = (int)($input['timeB_id'] ?? 0);
        $placarA     = (int)($input['placar_timeA'] ?? 0);
        $placarB     = (int)($input['placar_timeB'] ?? 0);
        $duracao     = (int)($input['duracao_segundos'] ?? 0);
        $goleiroA    = !empty($input['goleiro_timeA_id']) ? (int)$input['goleiro_timeA_id'] : null;
        $goleiroB    = !empty($input['goleiro_timeB_id']) ? (int)$input['goleiro_timeB_id'] : null;
        $jogadoresA  = $input['timeA_jogadores'] ?? [];
        $jogadoresB  = $input['timeB_jogadores'] ?? [];

        if (!$campId) throw new HttpError('Rodada não pertence a um campeonato.', 400);
        if (!$timeAId || !$timeBId) throw new HttpError('timeA_id e timeB_id são obrigatórios.', 400);

        // Insere na tabela correta: campeonato_partidas
        $this->db->execute("
            INSERT INTO campeonato_partidas
                (campeonato_id, rodada_id, fase,
                 timeA_id, timeB_id,
                 placar_timeA, placar_timeB,
                 duracao_segundos,
                 goleiro_timeA_id, goleiro_timeB_id,
                 fim_em, status)
            VALUES (?, ?, 'futlendao', ?, ?, ?, ?, ?, ?, ?, NOW(), 'finalizada')
        ", [$campId, $rodadaId, $timeAId, $timeBId, $placarA, $placarB, $duracao, $goleiroA, $goleiroB]);

        $partidaId = (int)$this->db->lastInsertId();

        // Conta gols e assistências por jogador a partir dos eventos
        $golsPorJogador = [];
        $assistPorJogador = [];
        foreach ($input['eventos'] ?? [] as $e) {
            $jogId = (int)($e['jogador_id'] ?? 0);
            if (!$jogId) continue;
            $tipo = $e['tipo'] ?? '';
            if ($tipo === 'gol' || $tipo === 'gol_contra') {
                $golsPorJogador[$jogId] = ($golsPorJogador[$jogId] ?? 0) + 1;
            }
            // Assistência pode vir como evento separado ou como campo no evento de gol
            if ($tipo === 'assistencia') {
                $assistPorJogador[$jogId] = ($assistPorJogador[$jogId] ?? 0) + 1;
            }
            if (!empty($e['assist_por_jogador_id'])) {
                $aId = (int)$e['assist_por_jogador_id'];
                $assistPorJogador[$aId] = ($assistPorJogador[$aId] ?? 0) + 1;
            }
        }

        // Salva estatísticas em campeonato_estatisticas_partida
        $this->db->execute(
            "DELETE FROM campeonato_estatisticas_partida WHERE partida_id = ?",
            [$partidaId]
        );

        // Calcula clean_sheet: time não sofreu gol
        $csTimeA = ($placarB == 0) ? 1 : 0;
        $csTimeB = ($placarA == 0) ? 1 : 0;

        // Conta gols_contra por jogador
        $golsContraMap = [];
        foreach ($input['eventos'] ?? [] as $e) {
            if (($e['tipo'] ?? '') === 'gol_contra') {
                $jId = (int)($e['jogador_id'] ?? 0);
                if ($jId) $golsContraMap[$jId] = ($golsContraMap[$jId] ?? 0) + 1;
            }
        }

        foreach ([[$jogadoresA, $timeAId, $csTimeA], [$jogadoresB, $timeBId, $csTimeB]] as [$grupo, $timeId, $cs]) {
            foreach ($grupo as $j) {
                $jogId = (int)($j['id'] ?? $j['jogador_id'] ?? 0);
                if (!$jogId) continue;
                // Prioriza contagem dos eventos, fallback para dados do jogador
                $gols   = $golsPorJogador[$jogId] ?? (int)($j['gols'] ?? 0);
                $assist = $assistPorJogador[$jogId] ?? (int)($j['assistencias'] ?? 0);
                $gc = $golsContraMap[$jogId] ?? 0;
                $this->db->execute("
                    INSERT INTO campeonato_estatisticas_partida
                        (partida_id, jogador_id, time_id, gols, assistencias, clean_sheet, gols_contra)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE gols = VALUES(gols), assistencias = VALUES(assistencias), clean_sheet = VALUES(clean_sheet), gols_contra = VALUES(gols_contra)
                ", [$partidaId, $jogId, $timeId, $gols, $assist, $cs, $gc]);
            }
        }

        // Garante que goleiros tenham registro em stats (podem não estar no array de jogadores)
        foreach ([[$goleiroA, $timeAId, $csTimeA], [$goleiroB, $timeBId, $csTimeB]] as [$golId, $timeId, $cs]) {
            if ($golId) {
                $this->db->execute("
                    INSERT IGNORE INTO campeonato_estatisticas_partida
                        (partida_id, jogador_id, time_id, gols, assistencias, clean_sheet, gols_contra)
                    VALUES (?, ?, ?, 0, 0, ?, 0)
                ", [$partidaId, $golId, $timeId, $cs]);
            }
        }

        // Salva eventos em campeonato_eventos_partida
        foreach ($input['eventos'] ?? [] as $e) {
            $jogId = (int)($e['jogador_id'] ?? 0);
            if (!$jogId) continue;
            // minuto a partir dos segundos
            $minuto = (int)floor((int)($e['tempo_segundos'] ?? 0) / 60);
            $assistId = !empty($e['assist_por_jogador_id']) ? (int)$e['assist_por_jogador_id'] : null;
            $this->db->execute("
                INSERT INTO campeonato_eventos_partida
                    (partida_id, jogador_id, time_id, tipo, minuto, assist_por_jogador_id)
                VALUES (?, ?, ?, ?, ?, ?)
            ", [
                $partidaId,
                $jogId,
                (int)($e['time_id'] ?? 0),
                $e['tipo'] ?? 'gol',
                $minuto,
                $assistId,
            ]);
        }

        http_response_code(201);
        echo json_encode(['success' => true, 'partida_id' => $partidaId]);
    }

    // =========================================================
    // DETALHES DA PARTIDA (para edição de súmula)
    // GET /partidas/:id/detalhes
    // =========================================================
    public function detalhesPartida(int $id): void
    {
        $partida = $this->db->fetchOne("
            SELECT p.*,
                t1.nome AS timeA_nome, t2.nome AS timeB_nome
            FROM campeonato_partidas p
            LEFT JOIN times t1 ON t1.id = p.timeA_id
            LEFT JOIN times t2 ON t2.id = p.timeB_id
            WHERE p.id = ?
        ", [$id]);
        if (!$partida) throw new HttpError('Partida não encontrada.', 404);

        // Busca elenco via estatísticas da partida
        $elenco = $this->db->fetchAll("
            SELECT j.id AS jogador_id, j.nome, j.posicao,
                   ep.time_id,
                   CASE WHEN ep.time_id = ? THEN 'timeA' ELSE 'timeB' END AS lado
            FROM campeonato_estatisticas_partida ep
            JOIN jogadores j ON j.id = ep.jogador_id
            WHERE ep.partida_id = ?
        ", [$partida['timeA_id'], $id]);

        // Se elenco vazio via estatísticas, busca via campeonato_rodada_elencos
        if (empty($elenco)) {
            $rodadaId = (int)$partida['rodada_id'];
            $elenco = $this->db->fetchAll("
                SELECT j.id AS jogador_id, j.nome, j.posicao,
                       cre.time_id,
                       CASE WHEN cre.time_id = ? THEN 'timeA' ELSE 'timeB' END AS lado
                FROM campeonato_rodada_elencos cre
                JOIN jogadores j ON j.id = cre.jogador_id
                WHERE cre.rodada_id = ? AND cre.time_id IN (?, ?)
            ", [$partida['timeA_id'], $rodadaId, $partida['timeA_id'], $partida['timeB_id']]);
        }

        // Separa em timeA e timeB para o frontend
        $timeA = array_values(array_filter($elenco, fn($j) => $j['lado'] === 'timeA'));
        $timeB = array_values(array_filter($elenco, fn($j) => $j['lado'] === 'timeB'));

        $eventos = $this->db->fetchAll("
            SELECT ev.*,
                   j.nome  AS jogador_nome,
                   j.nome  AS nome_jogador,
                   ev.minuto * 60 AS tempo_segundos,
                   ja.nome AS nome_assistente
            FROM campeonato_eventos_partida ev
            JOIN jogadores j  ON j.id  = ev.jogador_id
            LEFT JOIN jogadores ja ON ja.id = ev.assist_por_jogador_id
            WHERE ev.partida_id = ?
            ORDER BY ev.minuto ASC
        ", [$id]);

        // Monta mapa jogador→time a partir do elenco para corrigir time_id=0
        $jogadorTimeMap = [];
        foreach ($elenco as $j) {
            $jogadorTimeMap[(int)$j['jogador_id']] = (int)$j['time_id'];
        }

        // Resolve time_id=0 nos eventos (bug antigo)
        $timeAId = (int)$partida['timeA_id'];
        $timeBId = (int)$partida['timeB_id'];
        foreach ($eventos as &$ev) {
            if ((int)$ev['time_id'] === 0) {
                $jogId = (int)$ev['jogador_id'];
                $ev['time_id'] = $jogadorTimeMap[$jogId] ?? $timeAId;
            }
        }
        unset($ev);

        http_response_code(200);
        echo json_encode([
            'partida' => $partida,
            'elenco'  => $elenco,
            'timeA'   => $timeA,
            'timeB'   => $timeB,
            'eventos' => $eventos,
        ], JSON_UNESCAPED_UNICODE);
    }

    public function editarPartida(int $id): void
    {
        $partida = $this->db->fetchOne("SELECT * FROM campeonato_partidas WHERE id = ?", [$id]);
        if (!$partida) throw new HttpError('Partida não encontrada.', 404);

        $input   = $this->json();
        $placarA = (int)($input['placar_timeA'] ?? $partida['placar_timeA']);
        $placarB = (int)($input['placar_timeB'] ?? $partida['placar_timeB']);

        $timeAId = (int)$partida['timeA_id'];
        $timeBId = (int)$partida['timeB_id'];

        $this->db->execute(
            "UPDATE campeonato_partidas SET placar_timeA = ?, placar_timeB = ? WHERE id = ?",
            [$placarA, $placarB, $id]
        );

        if (isset($input['eventos'])) {
            $this->db->execute("DELETE FROM campeonato_eventos_partida WHERE partida_id = ?", [$id]);
            $this->db->execute("DELETE FROM campeonato_estatisticas_partida WHERE partida_id = ?", [$id]);

            $stats = [];
            foreach ($input['eventos'] as $e) {
                $jogId  = (int)($e['jogador_id'] ?? 0);
                $timeId = (int)($e['time_id'] ?? 0);
                if (!$jogId) continue;

                // Resolve time_id=0 → usa timeA como fallback
                if ($timeId === 0) {
                    $timeId = $timeAId;
                }

                $minuto  = (int)floor((int)($e['tempo_segundos'] ?? 0) / 60);
                $assistId = !empty($e['assist_por_jogador_id']) ? (int)$e['assist_por_jogador_id'] : null;

                $this->db->execute("
                    INSERT INTO campeonato_eventos_partida
                        (partida_id, jogador_id, time_id, tipo, minuto, assist_por_jogador_id)
                    VALUES (?, ?, ?, ?, ?, ?)
                ", [$id, $jogId, $timeId, $e['tipo'] ?? 'gol', $minuto, $assistId]);

                $key = "{$jogId}_{$timeId}";
                if (!isset($stats[$key])) $stats[$key] = ['jogador_id' => $jogId, 'time_id' => $timeId, 'gols' => 0, 'assistencias' => 0];
                if (in_array($e['tipo'] ?? 'gol', ['gol', 'gol_contra'])) $stats[$key]['gols']++;

                if ($assistId) {
                    $aKey = "{$assistId}_{$timeId}";
                    if (!isset($stats[$aKey])) $stats[$aKey] = ['jogador_id' => $assistId, 'time_id' => $timeId, 'gols' => 0, 'assistencias' => 0];
                    $stats[$aKey]['assistencias']++;
                }
            }

            // Re-insere estatísticas dos jogadores dos elencos (para não perder quem não fez gol)
            $rodadaId = (int)$partida['rodada_id'];
            $elencoJogadores = $this->db->fetchAll("
                SELECT jogador_id, time_id FROM campeonato_rodada_elencos
                WHERE rodada_id = ? AND time_id IN (?, ?)
            ", [$rodadaId, $timeAId, $timeBId]);

            foreach ($elencoJogadores as $ej) {
                $jid = (int)$ej['jogador_id'];
                $tid = (int)$ej['time_id'];
                $key = "{$jid}_{$tid}";
                if (!isset($stats[$key])) {
                    $stats[$key] = ['jogador_id' => $jid, 'time_id' => $tid, 'gols' => 0, 'assistencias' => 0];
                }
            }

            // Calcula clean_sheet: time não sofreu gol
            $csTimeA = ($placarB == 0) ? 1 : 0;
            $csTimeB = ($placarA == 0) ? 1 : 0;

            foreach ($stats as $s) {
                $cs = ($s['time_id'] === $timeAId) ? $csTimeA : $csTimeB;
                $this->db->execute("
                    INSERT INTO campeonato_estatisticas_partida
                        (partida_id, jogador_id, time_id, gols, assistencias, clean_sheet)
                    VALUES (?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE gols = VALUES(gols), assistencias = VALUES(assistencias), clean_sheet = VALUES(clean_sheet)
                ", [$id, $s['jogador_id'], $s['time_id'], $s['gols'], $s['assistencias'], $cs]);
            }
        }

        http_response_code(200);
        echo json_encode(['success' => true]);
    }

    public function deletarPartida(int $id): void
    {
        $partida = $this->db->fetchOne("SELECT id FROM campeonato_partidas WHERE id = ?", [$id]);
        if (!$partida) throw new HttpError('Partida não encontrada.', 404);

        $this->db->execute("DELETE FROM campeonato_eventos_partida WHERE partida_id = ?", [$id]);
        $this->db->execute("DELETE FROM campeonato_estatisticas_partida WHERE partida_id = ?", [$id]);
        $this->db->execute("DELETE FROM campeonato_partidas WHERE id = ?", [$id]);

        http_response_code(200);
        echo json_encode(['success' => true, 'message' => 'Partida excluída.']);
    }

    public function partidasGlobais(): void
    {
        $campId = isset($_GET['campeonato_id']) ? (int)$_GET['campeonato_id'] : null;
        $where  = $campId ? "AND p.campeonato_id = {$campId}" : '';

        $partidas = $this->db->fetchAll("
            SELECT
                p.id AS partida_id, p.status,
                p.placar_timeA AS placarA, p.placar_timeB AS placarB,
                p.duracao_segundos,
                r.data,
                c.nome AS nome_competicao,
                t1.nome AS timeA_nome, t1.logo_url AS timeA_logo,
                t2.nome AS timeB_nome, t2.logo_url AS timeB_logo
            FROM campeonato_partidas p
            JOIN rodadas r ON r.id = p.rodada_id
            LEFT JOIN campeonatos c ON c.id = p.campeonato_id
            LEFT JOIN times t1 ON t1.id = p.timeA_id
            LEFT JOIN times t2 ON t2.id = p.timeB_id
            WHERE p.status = 'finalizada' {$where}
            ORDER BY r.data DESC, p.id DESC
            LIMIT 200
        ");

        http_response_code(200);
        echo json_encode($partidas, JSON_UNESCAPED_UNICODE);
    }

    // =========================================================
    // SUBSTITUIÇÃO NA RODADA
    // POST /rodadas/:id/substituicao
    // body: { time_id, jogador_sai_id, jogador_entra_id }
    // =========================================================
    public function substituicao(int $id): void
    {
        $rodada = $this->getRodadaOr404($id);
        $input  = $this->json();

        $jogadorSaiId   = (int)($input['jogador_sai_id']   ?? 0);
        $jogadorEntraId = (int)($input['jogador_entra_id'] ?? 0);
        $timeId         = (int)($input['time_id']          ?? 0);

        if (!$jogadorSaiId || !$jogadorEntraId) {
            throw new HttpError('jogador_sai_id e jogador_entra_id são obrigatórios.', 400);
        }

        // Rodada de campeonato → altera campeonato_rodada_elencos
        if (!empty($rodada['campeonato_id'])) {
            $updated = $this->db->execute("
                UPDATE campeonato_rodada_elencos
                SET jogador_id = ?, is_capitao = 0, jogador_original_id = ?
                WHERE rodada_id = ? AND time_id = ? AND jogador_id = ?
            ", [$jogadorEntraId, $jogadorSaiId, $id, $timeId, $jogadorSaiId]);

            if ($updated === 0) {
                throw new HttpError('Jogador não encontrado nessa rodada/time.', 404);
            }

            http_response_code(200);
            echo json_encode(['success' => true]);
            return;
        }

        // Rodada de liga → altera rodada_times (fluxo antigo)
        $this->db->execute("
            UPDATE rodada_times
            SET jogador_id = ?
            WHERE rodada_id = ? AND jogador_id = ?
        ", [$jogadorEntraId, $id, $jogadorSaiId]);

        http_response_code(200);
        echo json_encode(['success' => true]);
    }

    // =========================================================
    // ELENCO DA RODADA (usado pelo useElencoRodada)
    // GET /rodadas/:id/elenco
    //
    // Lógica:
    // 1. Busca a rodada para saber o campeonato_id
    // 2. Se for rodada de campeonato:
    //    a. Se campeonato_rodada_elencos ainda está vazio para essa rodada,
    //       copia automaticamente do campeonato_elencos (elenco base)
    //    b. Retorna campeonato_rodada_elencos (já com substituições aplicadas)
    // 3. Se for rodada de liga: retorna rodada_times (fluxo antigo)
    // =========================================================
    public function elenco(int $id): void
    {
        $rodada = $this->getRodadaOr404($id);

        // ---- RODADA DE CAMPEONATO ----
        if (!empty($rodada['campeonato_id'])) {
            $campId = (int)$rodada['campeonato_id'];

            // Verifica se já existe elenco para essa rodada
            $count = $this->db->fetchOne(
                "SELECT COUNT(*) AS c FROM campeonato_rodada_elencos WHERE rodada_id = ?",
                [$id]
            );

            // Se vazio, copia o elenco para essa rodada
            if ((int)$count['c'] === 0) {

                // Tenta primeiro campeonato_elencos (fonte preferida)
                $elencoBase = $this->db->fetchAll("
                    SELECT time_id, jogador_id, is_capitao, is_pe_de_rato
                    FROM campeonato_elencos
                    WHERE campeonato_id = ?
                ", [$campId]);

                // Fallback: busca de time_jogadores (times inscritos no campeonato)
                if (empty($elencoBase)) {
                    $elencoBase = $this->db->fetchAll("
                        SELECT tj.time_id, tj.jogador_id,
                               tj.is_capitao, tj.is_pe_de_rato
                        FROM time_jogadores tj
                        JOIN campeonato_times ct ON ct.time_id = tj.time_id
                        WHERE ct.campeonato_id = ?
                    ", [$campId]);
                }

                foreach ($elencoBase as $item) {
                    $this->db->execute(
                        "INSERT INTO campeonato_rodada_elencos (rodada_id, time_id, jogador_id, is_capitao)
                         VALUES (?, ?, ?, ?)",
                        [$id, $item['time_id'], $item['jogador_id'], $item['is_capitao'] ?? 0]
                    );
                }
            }

            // Retorna elenco da rodada com dados completos
            $elenco = $this->db->fetchAll("
                SELECT
                    cre.id        AS vinculo_id,
                    cre.time_id,
                    t.nome        AS nome_time,
                    t.logo_url    AS logo_time,
                    cre.jogador_id,
                    j.nome        AS nome_jogador,
                    j.posicao,
                    j.nivel,
                    j.foto_url,
                    cre.is_capitao,
                    COALESCE(ce.is_pe_de_rato, 0) AS is_pe_de_rato
                FROM campeonato_rodada_elencos cre
                JOIN times t   ON t.id = cre.time_id
                JOIN jogadores j ON j.id = cre.jogador_id
                LEFT JOIN campeonato_elencos ce
                    ON ce.campeonato_id = ? AND ce.time_id = cre.time_id AND ce.jogador_id = cre.jogador_id
                WHERE cre.rodada_id = ?
                ORDER BY t.nome ASC, j.nome ASC
            ", [$campId, $id]);

            http_response_code(200);
            echo json_encode($elenco, JSON_UNESCAPED_UNICODE);
            return;
        }

        // ---- RODADA DE LIGA (fluxo antigo) ----
        $elenco = $this->db->fetchAll("
            SELECT
                rt.id         AS vinculo_id,
                rt.numero_time AS time_id,
                rt.nome_time,
                NULL          AS logo_time,
                j.id          AS jogador_id,
                j.nome        AS nome_jogador,
                j.posicao,
                j.nivel,
                j.foto_url,
                0             AS is_capitao,
                0             AS is_pe_de_rato
            FROM rodada_times rt
            JOIN jogadores j ON j.id = rt.jogador_id
            WHERE rt.rodada_id = ?
            ORDER BY rt.numero_time ASC, j.nome ASC
        ", [$id]);

        http_response_code(200);
        echo json_encode($elenco, JSON_UNESCAPED_UNICODE);
    }

    // =========================================================
    // HELPERS
    // =========================================================
    private function getRodadaOr404(int $id): array
    {
        $rodada = $this->db->fetchOne("SELECT * FROM rodadas WHERE id = ?", [$id]);
        if (!$rodada) throw new HttpError('Rodada não encontrada.', 404);
        return $rodada;
    }

    private function formatRodada(array $r): array
    {
        return [
            'id'             => (int)$r['id'],
            'liga_id'        => $r['liga_id'] ? (int)$r['liga_id'] : null,
            'campeonato_id'  => $r['campeonato_id'] ? (int)$r['campeonato_id'] : null,
            'data'           => $r['data'],
            'status'         => $r['status'] ?? 'aberta',
        ];
    }

    // =========================================================
    // AVANÇO AUTOMÁTICO DO VENCEDOR NO MATA-MATA
    // =========================================================

    private function avancarVencedorMataMata(array $partida, int $placarA, int $placarB, ?int $penA, ?int $penB): void
    {
        $campeonatoId = (int)$partida['campeonato_id'];
        $faseMata     = $partida['fase_mata_mata'] ?? '';
        $bracket      = strtolower($partida['bracket'] ?? 'upper');
        $ordem        = (int)($partida['ordem_confronto'] ?? 0);
        $timeAId      = (int)$partida['timeA_id'];
        $timeBId      = (int)$partida['timeB_id'];

        // Determinar vencedor e perdedor
        if ($placarA > $placarB) {
            $vencedorId = $timeAId;
            $perdedorId = $timeBId;
        } elseif ($placarB > $placarA) {
            $vencedorId = $timeBId;
            $perdedorId = $timeAId;
        } elseif ($penA !== null && $penB !== null && $penA > $penB) {
            $vencedorId = $timeAId;
            $perdedorId = $timeBId;
        } elseif ($penA !== null && $penB !== null && $penB > $penA) {
            $vencedorId = $timeBId;
            $perdedorId = $timeAId;
        } else {
            // Empate sem penaltis — não é possível avançar
            return;
        }

        // Configurações do campeonato
        $camp = $this->db->fetchOne(
            "SELECT tem_repescagem, tem_terceiro_lugar FROM campeonatos WHERE id = ?",
            [$campeonatoId]
        );
        $temRepescagem    = (bool)($camp['tem_repescagem'] ?? false);
        $temTerceiroLugar = (bool)($camp['tem_terceiro_lugar'] ?? false);

        // ── Double Elimination (Repescagem) ──
        if ($temRepescagem) {
            if ($faseMata === 'semifinal' && $bracket === 'upper') {
                // Vencedor → grand_final timeA
                $this->colocarTimeNoSlot($campeonatoId, 'grand_final', 'upper', $vencedorId, 'timeA_id');
                // Perdedor → lower_r2 timeB (enfrenta vencedor do lower_r1)
                $this->colocarTimeNoSlot($campeonatoId, 'lower_r2', 'lower', $perdedorId, 'timeB_id');
            } elseif ($faseMata === 'lower_r1' && $bracket === 'lower') {
                // Vencedor → lower_r2 timeA
                $this->colocarTimeNoSlot($campeonatoId, 'lower_r2', 'lower', $vencedorId, 'timeA_id');
            } elseif ($faseMata === 'lower_r2' && $bracket === 'lower') {
                // Vencedor → grand_final timeB
                $this->colocarTimeNoSlot($campeonatoId, 'grand_final', 'upper', $vencedorId, 'timeB_id');
            }
            // grand_final: sem avanço
            return;
        }

        // ── Single Elimination ──

        if ($faseMata === 'quartas') {
            // Buscar todas as semifinais ordenadas
            $semis = $this->db->fetchAll(
                "SELECT id, ordem_confronto, timeA_id, timeB_id FROM campeonato_partidas
                 WHERE campeonato_id = ? AND fase = 'mata_mata' AND fase_mata_mata = 'semifinal'
                 ORDER BY ordem_confronto ASC",
                [$campeonatoId]
            );

            // quartas 1,2 → primeira semi; quartas 3,4 → segunda semi
            $semiIdx = ($ordem <= 2) ? 0 : 1;
            $slot    = ($ordem % 2 === 1) ? 'timeA_id' : 'timeB_id';

            if (isset($semis[$semiIdx])) {
                $this->db->execute(
                    "UPDATE campeonato_partidas SET {$slot} = ? WHERE id = ?",
                    [$vencedorId, (int)$semis[$semiIdx]['id']]
                );
            }

        } elseif ($faseMata === 'semifinal') {
            // Vencedor → final
            $final = $this->db->fetchOne(
                "SELECT id, timeA_id, timeB_id FROM campeonato_partidas
                 WHERE campeonato_id = ? AND fase = 'mata_mata' AND fase_mata_mata = 'final'
                 ORDER BY ordem_confronto ASC LIMIT 1",
                [$campeonatoId]
            );

            if ($final) {
                $slot = empty($final['timeA_id']) ? 'timeA_id' : 'timeB_id';
                $this->db->execute(
                    "UPDATE campeonato_partidas SET {$slot} = ? WHERE id = ?",
                    [$vencedorId, (int)$final['id']]
                );
            }

            // Terceiro lugar: perdedores das semis
            if ($temTerceiroLugar) {
                $tc = $this->db->fetchOne(
                    "SELECT id, timeA_id, timeB_id FROM campeonato_partidas
                     WHERE campeonato_id = ? AND fase = 'mata_mata' AND fase_mata_mata = 'terceiro_lugar'
                     LIMIT 1",
                    [$campeonatoId]
                );
                if ($tc) {
                    $slot = empty($tc['timeA_id']) ? 'timeA_id' : 'timeB_id';
                    $this->db->execute(
                        "UPDATE campeonato_partidas SET {$slot} = ? WHERE id = ?",
                        [$perdedorId, (int)$tc['id']]
                    );
                }
            }
        }
        // final / terceiro_lugar: sem avanço necessário
    }

    /**
     * Coloca um time em um slot de uma partida de mata-mata buscando por fase_mata_mata + bracket.
     */
    private function colocarTimeNoSlot(int $campeonatoId, string $faseMata, string $bracket, int $timeId, string $coluna): void
    {
        $this->db->execute("
            UPDATE campeonato_partidas
            SET {$coluna} = ?
            WHERE campeonato_id = ? AND fase = 'mata_mata' AND fase_mata_mata = ? AND bracket = ?
            LIMIT 1
        ", [$timeId, $campeonatoId, $faseMata, $bracket]);
    }

    private function json(): array
    {
        return json_decode(file_get_contents('php://input'), true) ?? [];
    }
}