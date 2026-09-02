<?php

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';

class BetsController {

    public function adminAddSaldo() {
        $user = $_REQUEST['authUser'] ?? null;
        if (!$user || ($user['role'] !== 'admin' && $user['role'] !== 'dono')) {
            http_response_code(403);
            echo json_encode(["error" => "Acesso negado."]);
            return;
        }

        $input = json_decode(file_get_contents('php://input'), true);
        $usuarioId = $input['usuario_id'] ?? null;
        $valor = (float)($input['valor'] ?? 0);

        if (!$usuarioId || $valor <= 0) {
            http_response_code(400);
            echo json_encode(["error" => "Usuário ou valor inválido."]);
            return;
        }

        $stmt = $this->pdo->prepare("UPDATE bets_carteira SET saldo = saldo + ? WHERE usuario_id = ?");
        $stmt->execute([$valor, $usuarioId]);

        echo json_encode(["success" => true, "message" => "Saldo adicionado com sucesso!"]);
    }

    private $pdo;
    
    public function __construct() {
        $this->pdo = Database::getInstance()->getConnection();
    }

    // Calcula fatorial
    private function factorial($n) {
        if ($n === 0) return 1;
        $f = 1;
        for ($i = 1; $i <= $n; $i++) {
            $f *= $i;
        }
        return $f;
    }

    // Calcula P(X = k) para Poisson
    private function poissonProbability($lambda, $k) {
        return (pow($lambda, $k) * exp(-$lambda)) / $this->factorial($k);
    }

    // Calcula P(X >= k) - Probabilidade de "Mais de (k-0.5)"
    private function poissonCumulativeGreater($lambda, $k) {
        $cumulativeLess = 0;
        for ($i = 0; $i < $k; $i++) {
            $cumulativeLess += $this->poissonProbability($lambda, $i);
        }
        return 1 - $cumulativeLess;
    }

    public function adminCriarMercadoGols() {
        $user = $_REQUEST['authUser'] ?? null;
        if (!$user || ($user['role'] !== 'admin' && $user['role'] !== 'dono')) {
            http_response_code(403);
            echo json_encode(["error" => "Acesso negado."]);
            return;
        }

        $input = json_decode(file_get_contents('php://input'), true);
        $campeonatoId = $input['campeonato_id'] ?? null;
        $rodadaId = $input['rodada_id'] ?? null;
        $timeId = $input['time_id'] ?? null;
        $nomeTime = $input['nome_time'] ?? 'Time';

        if (!$campeonatoId || !$rodadaId) {
            $stmtAtiva = $this->pdo->prepare("SELECT id, campeonato_id FROM rodadas WHERE status = 'aberta' ORDER BY id DESC LIMIT 1");
            $stmtAtiva->execute();
            $rodadaAberta = $stmtAtiva->fetch(PDO::FETCH_ASSOC);
            if ($rodadaAberta) {
                $campeonatoId = $rodadaAberta['campeonato_id'];
                $rodadaId = $rodadaAberta['id'];
            }
        }

        if (!$campeonatoId || !$rodadaId || !$timeId) {
            http_response_code(400);
            echo json_encode(["error" => "Dados incompletos"]);
            return;
        }

        $stmt = $this->pdo->prepare("
            SELECT AVG(
                CASE 
                    WHEN timeA_id = ? THEN placar_timeA
                    WHEN timeB_id = ? THEN placar_timeB
                    ELSE 0 
                END
            ) as media_gols 
            FROM campeonato_partidas 
            WHERE campeonato_id = ? AND (timeA_id = ? OR timeB_id = ?) AND status = 'finalizada'
        ");
        $stmt->execute([$timeId, $timeId, $campeonatoId, $timeId, $timeId]);
        $row = $stmt->fetch();
        
        $mediaGols = $row ? (float) $row['media_gols'] : 0;
        
        if ($mediaGols <= 0) {
            $mediaGols = 7.5;
        }

        $titulo = "Total de Gols - $nomeTime";

        try {
            $this->pdo->beginTransaction();

            $stmt = $this->pdo->prepare("INSERT INTO bets_mercados (campeonato_id, rodada_id, titulo, regra_categoria, regra_alvo_id, created_at) VALUES (?, ?, ?, 'gols_pro', ?, NOW())");
            $stmt->execute([$campeonatoId, $rodadaId, $titulo, $timeId]);
            $mercadoId = $this->pdo->lastInsertId();

            $baseLine = floor($mediaGols) + 0.5;
            $linhas = [
                $baseLine - 2,
                $baseLine - 1,
                $baseLine,
                $baseLine + 1,
                $baseLine + 2
            ];

            foreach ($linhas as $linha) {
                if ($linha <= 0.5) continue;
                
                $k = ceil($linha); 
                
                $probOver = $this->poissonCumulativeGreater($mediaGols, $k);
                $probUnder = 1 - $probOver;
                
                $margin = 0.90;

                $oddOver = $probOver > 0.05 ? (1 / $probOver) * $margin : 15.00;
                $oddUnder = $probUnder > 0.05 ? (1 / $probUnder) * $margin : 15.00;

                if ($oddOver > 15) $oddOver = 15.00;
                if ($oddOver < 1.05) $oddOver = 1.05;
                if ($oddUnder > 15) $oddUnder = 15.00;
                if ($oddUnder < 1.05) $oddUnder = 1.05;

                $stmtOp = $this->pdo->prepare("INSERT INTO bets_opcoes (mercado_id, descricao, regra_condicao, regra_valor, odd) VALUES (?, ?, 'maior_que', ?, ?)");
                $stmtOp->execute([$mercadoId, "Mais de $linha", $linha, round($oddOver, 2)]);
                
                $stmtOp = $this->pdo->prepare("INSERT INTO bets_opcoes (mercado_id, descricao, regra_condicao, regra_valor, odd) VALUES (?, ?, 'menor_que', ?, ?)");
                $stmtOp->execute([$mercadoId, "Menos de $linha", $linha, round($oddUnder, 2)]);
            }

            $this->pdo->commit();
            echo json_encode(["success" => true, "mercado_id" => $mercadoId, "message" => "Mercado criado com linhas geradas matematicamente!"]);
        } catch (Exception $e) {
            $this->pdo->rollBack();
            http_response_code(500);
            echo json_encode(["error" => "Falha ao criar mercado", "details" => $e->getMessage()]);
        }
    }

    public function adminCriarMercadoGoleiro() {
        $user = $_REQUEST['authUser'] ?? null;
        if (!$user || ($user['role'] !== 'admin' && $user['role'] !== 'dono')) {
            http_response_code(403);
            echo json_encode(["error" => "Acesso negado."]);
            return;
        }

        $input = json_decode(file_get_contents('php://input'), true);
        $campeonatoId = $input['campeonato_id'] ?? null;
        $rodadaId = $input['rodada_id'] ?? null;
        $goleiroId = $input['goleiro_id'] ?? null;
        $nomeGoleiro = $input['nome_goleiro'] ?? 'Goleiro';

        if (!$campeonatoId || !$rodadaId) {
            $stmtAtiva = $this->pdo->prepare("SELECT id, campeonato_id FROM rodadas WHERE status = 'aberta' ORDER BY id DESC LIMIT 1");
            $stmtAtiva->execute();
            $rodadaAberta = $stmtAtiva->fetch(PDO::FETCH_ASSOC);
            if ($rodadaAberta) {
                $campeonatoId = $rodadaAberta['campeonato_id'];
                $rodadaId = $rodadaAberta['id'];
            }
        }

        if (!$campeonatoId || !$rodadaId || !$goleiroId) {
            http_response_code(400);
            echo json_encode(["error" => "Dados incompletos"]);
            return;
        }

        $stmt = $this->pdo->prepare("
            SELECT AVG(
                CASE 
                    WHEN t.id = cp.timeA_id THEN cp.placar_timeB
                    WHEN t.id = cp.timeB_id THEN cp.placar_timeA
                    ELSE 0 
                END
            ) as media_gols 
            FROM jogadores j
            LEFT JOIN time_jogadores tj ON j.id = tj.jogador_id
            LEFT JOIN times t ON tj.time_id = t.id
            LEFT JOIN campeonato_partidas cp ON (t.id = cp.timeA_id OR t.id = cp.timeB_id) AND cp.status = 'finalizada'
            WHERE j.id = ? AND cp.campeonato_id = ?
        ");
        $stmt->execute([$goleiroId, $campeonatoId]);
        $row = $stmt->fetch();
        
        $mediaGols = $row ? (float) $row['media_gols'] : 0;
        
        if ($mediaGols <= 0) {
            $mediaGols = 4.5; // Goleiros tomam menos gols em média do que o time faz
        }

        $titulo = "Total de Gols Sofridos - $nomeGoleiro";

        try {
            $this->pdo->beginTransaction();

            $stmt = $this->pdo->prepare("INSERT INTO bets_mercados (campeonato_id, rodada_id, titulo, regra_categoria, regra_alvo_id, created_at) VALUES (?, ?, ?, 'gols_sofridos', ?, NOW())");
            $stmt->execute([$campeonatoId, $rodadaId, $titulo, $goleiroId]);
            $mercadoId = $this->pdo->lastInsertId();

            $baseLine = floor($mediaGols) + 0.5;
            $linhas = [
                $baseLine - 2,
                $baseLine - 1,
                $baseLine,
                $baseLine + 1,
                $baseLine + 2
            ];

            foreach ($linhas as $linha) {
                if ($linha <= 0.5) continue;
                
                $k = ceil($linha); 
                
                $probOver = $this->poissonCumulativeGreater($mediaGols, $k);
                $probUnder = 1 - $probOver;
                
                $margin = 0.90;

                $oddOver = $probOver > 0.05 ? (1 / $probOver) * $margin : 15.00;
                $oddUnder = $probUnder > 0.05 ? (1 / $probUnder) * $margin : 15.00;

                if ($oddOver > 15) $oddOver = 15.00;
                if ($oddOver < 1.05) $oddOver = 1.05;
                if ($oddUnder > 15) $oddUnder = 15.00;
                if ($oddUnder < 1.05) $oddUnder = 1.05;

                $stmtOp = $this->pdo->prepare("INSERT INTO bets_opcoes (mercado_id, descricao, regra_condicao, regra_valor, odd) VALUES (?, ?, 'maior_que', ?, ?)");
                $stmtOp->execute([$mercadoId, "Mais de $linha", $linha, round($oddOver, 2)]);
                
                $stmtOp = $this->pdo->prepare("INSERT INTO bets_opcoes (mercado_id, descricao, regra_condicao, regra_valor, odd) VALUES (?, ?, 'menor_que', ?, ?)");
                $stmtOp->execute([$mercadoId, "Menos de $linha", $linha, round($oddUnder, 2)]);
            }

            $this->pdo->commit();
            echo json_encode(["success" => true, "mercado_id" => $mercadoId, "message" => "Mercado do goleiro criado com linhas geradas matematicamente!"]);
        } catch (Exception $e) {
            $this->pdo->rollBack();
            http_response_code(500);
            echo json_encode(["error" => "Falha ao criar mercado de goleiro", "details" => $e->getMessage()]);
        }
    }


    public function getMercados() {
        $campeonatoId = $_GET['campeonato_id'] ?? null;
        $rodadaId = $_GET['rodada_id'] ?? null;

        if (!$campeonatoId || !$rodadaId) {
            $stmtAtiva = $this->pdo->prepare("SELECT id, campeonato_id FROM rodadas WHERE status = 'aberta' ORDER BY id DESC LIMIT 1");
            $stmtAtiva->execute();
            $rodadaAberta = $stmtAtiva->fetch(PDO::FETCH_ASSOC);
            if ($rodadaAberta) {
                $campeonatoId = $rodadaAberta['campeonato_id'];
                $rodadaId = $rodadaAberta['id'];
            } else {
                echo json_encode([]);
                return;
            }
        }

        // Verifica se a rodada ja tem partidas finalizadas (rodada em andamento)
        $stmtRodadaEmAndamento = $this->pdo->prepare("
            SELECT COUNT(*) as total FROM campeonato_partidas
            WHERE rodada_id = ? AND status = 'finalizada'
        ");
        $stmtRodadaEmAndamento->execute([$rodadaId]);
        $rodadaEmAndamento = (int)$stmtRodadaEmAndamento->fetch(PDO::FETCH_ASSOC)['total'] > 0;

        if ($rodadaEmAndamento) {
            // Fecha automaticamente todos os mercados abertos desta rodada
            $this->pdo->prepare("UPDATE bets_mercados SET status = 'fechado' WHERE rodada_id = ? AND status = 'aberto'")->execute([$rodadaId]);
            // Retorna vazio — nenhum mercado disponivel
            echo json_encode(['mercados' => [], 'encerrado' => true, 'mensagem' => 'As apostas para esta rodada foram encerradas pois os jogos já começaram.']);
            return;
        }

        $stmt = $this->pdo->prepare("
            SELECT bm.*, 
                   t.logo_url as escudo, 
                   j.foto_url as foto 
            FROM bets_mercados bm
            LEFT JOIN times t ON bm.regra_alvo_id = t.id AND bm.regra_categoria IN ('gols_pro', 'vencedor')
            LEFT JOIN jogadores j ON bm.regra_alvo_id = j.id AND bm.regra_categoria = 'gols_sofridos'
            WHERE bm.campeonato_id = ? AND bm.rodada_id = ? AND bm.status = 'aberto'
        ");
        $stmt->execute([$campeonatoId, $rodadaId]);
        $mercados = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($mercados as &$mercado) {
            if ($mercado['escudo']) {
                $mercado['imagem'] = $mercado['escudo'];
            } elseif ($mercado['foto']) {
                $mercado['imagem'] = $mercado['foto'];
            }

            $stmtOp = $this->pdo->prepare("SELECT * FROM bets_opcoes WHERE mercado_id = ?");
            $stmtOp->execute([$mercado['id']]);
            $mercado['opcoes'] = $stmtOp->fetchAll(PDO::FETCH_ASSOC);
        }

        echo json_encode($mercados);
    }

    public function adminGetMercados() {
        $user = $_REQUEST['authUser'] ?? null;
        if (!$user || ($user['role'] !== 'admin' && $user['role'] !== 'dono')) {
            http_response_code(403);
            echo json_encode(["error" => "Acesso negado."]);
            return;
        }

        $campeonatoId = $_GET['campeonato_id'] ?? null;
        $rodadaId = $_GET['rodada_id'] ?? null;

        if (!$campeonatoId || !$rodadaId) {
            $stmtAtiva = $this->pdo->prepare("SELECT id, campeonato_id FROM rodadas WHERE status = 'aberta' ORDER BY id DESC LIMIT 1");
            $stmtAtiva->execute();
            $rodadaAberta = $stmtAtiva->fetch(PDO::FETCH_ASSOC);
            if ($rodadaAberta) {
                $campeonatoId = $rodadaAberta['campeonato_id'];
                $rodadaId = $rodadaAberta['id'];
            } else {
                echo json_encode([]);
                return;
            }
        }

        $stmt = $this->pdo->prepare("
            SELECT bm.*, 
                   t.logo_url as escudo, 
                   j.foto_url as foto 
            FROM bets_mercados bm
            LEFT JOIN times t ON bm.regra_alvo_id = t.id AND bm.regra_categoria IN ('gols_pro', 'vencedor')
            LEFT JOIN jogadores j ON bm.regra_alvo_id = j.id AND bm.regra_categoria = 'gols_sofridos'
            WHERE bm.campeonato_id = ? AND bm.rodada_id = ?
            ORDER BY bm.created_at DESC
        ");
        $stmt->execute([$campeonatoId, $rodadaId]);
        $mercados = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($mercados as &$mercado) {
            if ($mercado['escudo']) {
                $mercado['imagem'] = $mercado['escudo'];
            } elseif ($mercado['foto']) {
                $mercado['imagem'] = $mercado['foto'];
            }

            $stmtOp = $this->pdo->prepare("SELECT * FROM bets_opcoes WHERE mercado_id = ?");
            $stmtOp->execute([$mercado['id']]);
            $mercado['opcoes'] = $stmtOp->fetchAll(PDO::FETCH_ASSOC);
        }

        echo json_encode($mercados);
    }

    public function getCarteira() {
        $user = $_REQUEST['authUser'] ?? null;
        $stmt = $this->pdo->prepare("SELECT * FROM bets_carteira WHERE usuario_id = ?");
        $stmt->execute([$user['userId']]);
        $carteira = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$carteira) {
            echo json_encode(["saldo" => 0, "lucro_prejuizo_total" => 0]);
        } else {
            echo json_encode($carteira);
        }
    }

    public function fazerAposta() {
        $user = $_REQUEST['authUser'] ?? null;
        $input = json_decode(file_get_contents('php://input'), true);
        
        $valorApostado = $input['valor'] ?? 0;
        $opcoes = $input['opcoes'] ?? []; 

        if ($valorApostado <= 0 || empty($opcoes)) {
            http_response_code(400);
            echo json_encode(["error" => "Valor invalido ou nenhuma selecao feita"]);
            return;
        }

        try {
            $this->pdo->beginTransaction();

            $stmtSaldo = $this->pdo->prepare("SELECT saldo FROM bets_carteira WHERE usuario_id = ? FOR UPDATE");
            $stmtSaldo->execute([$user['userId']]);
            $carteira = $stmtSaldo->fetch();

            if (!$carteira || $carteira['saldo'] < $valorApostado) {
                $this->pdo->rollBack();
                http_response_code(400);
                echo json_encode(["error" => "Saldo insuficiente"]);
                return;
            }

            $stmtDesc = $this->pdo->prepare("UPDATE bets_carteira SET saldo = saldo - ? WHERE usuario_id = ?");
            $stmtDesc->execute([$valorApostado, $user['userId']]);

            $inQuery = implode(',', array_fill(0, count($opcoes), '?'));
            $stmtOps = $this->pdo->prepare("
                SELECT bo.id, bo.odd, bo.mercado_id, bm.regra_categoria, bm.regra_alvo_id, bm.rodada_id, bm.status as mercado_status
                FROM bets_opcoes bo
                JOIN bets_mercados bm ON bo.mercado_id = bm.id
                WHERE bo.id IN ($inQuery)
            ");
            $stmtOps->execute($opcoes);
            $opcoesDB = $stmtOps->fetchAll(PDO::FETCH_ASSOC);

            if (count($opcoesDB) !== count($opcoes)) {
                $this->pdo->rollBack();
                http_response_code(400);
                echo json_encode(["error" => "Alguma opcao invalida foi selecionada"]);
                return;
            }

            // -------------------------------------------------------
            // VALIDACAO 1: Mercado fechado ou rodada em andamento
            // -------------------------------------------------------
            $rodadasDaAposta = array_unique(array_column($opcoesDB, 'rodada_id'));
            foreach ($rodadasDaAposta as $ridAposta) {
                $stmtAndamento = $this->pdo->prepare("
                    SELECT COUNT(*) as total FROM campeonato_partidas
                    WHERE rodada_id = ? AND status = 'finalizada'
                ");
                $stmtAndamento->execute([$ridAposta]);
                $qtdFinalizadas = (int)$stmtAndamento->fetch(PDO::FETCH_ASSOC)['total'];
                if ($qtdFinalizadas > 0) {
                    // Fecha os mercados abertos desta rodada automaticamente
                    $this->pdo->prepare("UPDATE bets_mercados SET status = 'fechado' WHERE rodada_id = ? AND status = 'aberto'")->execute([$ridAposta]);
                    $this->pdo->rollBack();
                    http_response_code(400);
                    echo json_encode(["error" => "As apostas para esta rodada foram encerradas pois os jogos já começaram."]);
                    return;
                }
            }

            // Verificar se algum mercado selecionado já está fechado/apurado
            foreach ($opcoesDB as $op) {
                if ($op['mercado_status'] !== 'aberto') {
                    $this->pdo->rollBack();
                    http_response_code(400);
                    echo json_encode(["error" => "Um ou mais mercados selecionados já estão encerrados."]);
                    return;
                }
            }

            // -------------------------------------------------------
            // VALIDACAO 2: Mercados correlatos (vitorias <-> pontos mesmo time)
            // -------------------------------------------------------
            $GRUPO_CORRELATO = ['vitorias', 'pontos'];
            $alvosPorGrupoCorrelato = []; // [alvo_id => [categoria1, categoria2, ...]]
            foreach ($opcoesDB as $op) {
                $cat = $op['regra_categoria'];
                $alvo = $op['regra_alvo_id'];
                if (in_array($cat, $GRUPO_CORRELATO)) {
                    if (!isset($alvosPorGrupoCorrelato[$alvo])) {
                        $alvosPorGrupoCorrelato[$alvo] = [];
                    }
                    $alvosPorGrupoCorrelato[$alvo][] = $cat;
                }
            }
            foreach ($alvosPorGrupoCorrelato as $alvoId => $cats) {
                if (count(array_unique($cats)) > 1) {
                    $this->pdo->rollBack();
                    http_response_code(400);
                    echo json_encode(["error" => "Você não pode combinar apostas de Vitórias e Pontos do mesmo time no mesmo bilhete, pois são mercados correlacionados (pontos = vitórias × 3)."]);
                    return;
                }
            }

            // -------------------------------------------------------
            // VALIDACAO 3: Duas opcoes do mesmo mercado
            // -------------------------------------------------------
            $mercadosVistos = [];
            $oddTotal = 1.0;
            foreach ($opcoesDB as $op) {
                if (in_array($op['mercado_id'], $mercadosVistos)) {
                    $this->pdo->rollBack();
                    http_response_code(400);
                    echo json_encode(["error" => "Voce nao pode selecionar duas opcoes do mesmo mercado."]);
                    return;
                }
                $mercadosVistos[] = $op['mercado_id'];
                $oddTotal *= (float) $op['odd'];
            }


            $retornoPotencial = $valorApostado * $oddTotal;

            $stmtBilhete = $this->pdo->prepare("INSERT INTO bets_bilhetes (usuario_id, valor_apostado, odd_total, retorno_potencial, status, created_at) VALUES (?, ?, ?, ?, 'pendente', NOW())");
            $stmtBilhete->execute([$user['userId'], $valorApostado, $oddTotal, $retornoPotencial]);
            $bilheteId = $this->pdo->lastInsertId();

            foreach ($opcoesDB as $op) {
                $stmtPerna = $this->pdo->prepare("INSERT INTO bets_bilhete_opcoes (bilhete_id, opcao_id, odd_momento) VALUES (?, ?, ?)");
                $stmtPerna->execute([$bilheteId, $op['id'], $op['odd']]);
            }

            $this->pdo->commit();
            echo json_encode(["success" => true, "bilhete_id" => $bilheteId, "novo_saldo" => $carteira['saldo'] - $valorApostado]);
        } catch (Exception $e) {
            $this->pdo->rollBack();
            http_response_code(500);
            echo json_encode(["error" => "Falha ao registrar aposta", "details" => $e->getMessage()]);
        }
    }
    
    public function getHistoricoApostas() {
        $user = $_REQUEST['authUser'] ?? null;
        $stmt = $this->pdo->prepare("SELECT * FROM bets_bilhetes WHERE usuario_id = ? ORDER BY created_at DESC");
        $stmt->execute([$user['userId']]);
        $bilhetes = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        foreach ($bilhetes as &$b) {
            $stmtOps = $this->pdo->prepare("
                SELECT bbo.*, bo.descricao, bm.titulo, bm.rodada_id as opcao_rodada_id, bm.status as mercado_status, bm.rodada_id as opcao_rodada_id, bm.resultado_real 
                FROM bets_bilhete_opcoes bbo 
                JOIN bets_opcoes bo ON bbo.opcao_id = bo.id 
                JOIN bets_mercados bm ON bo.mercado_id = bm.id
                WHERE bbo.bilhete_id = ?
            ");
            $stmtOps->execute([$b['id']]);
            $b['opcoes'] = $stmtOps->fetchAll(PDO::FETCH_ASSOC);
        }
        
        echo json_encode($bilhetes);
    }

    public function getRanking() {
        $stmt = $this->pdo->prepare("
            SELECT u.id as usuario_id, u.username as nome, u.email, bc.saldo, bc.lucro_prejuizo_total
            FROM bets_carteira bc
            JOIN usuarios u ON bc.usuario_id = u.id
            ORDER BY bc.saldo DESC
            LIMIT 50
        ");
        $stmt->execute();
        $ranking = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Retornar também a posição
        $pos = 1;
        foreach ($ranking as &$r) {
            $r['posicao'] = $pos++;
        }

        echo json_encode($ranking);
    }

    public function adminGetStatsTimes() {
        $user = $_REQUEST['authUser'] ?? null;
        if (!$user || ($user['role'] !== 'admin' && $user['role'] !== 'dono')) {
            http_response_code(403);
            echo json_encode(["error" => "Acesso negado."]);
            return;
        }

        $campeonatoId = $_GET['campeonato_id'] ?? null;
        if (!$campeonatoId) {
            $stmtAtiva = $this->pdo->prepare("SELECT campeonato_id FROM rodadas WHERE status = 'aberta' ORDER BY id DESC LIMIT 1");
            $stmtAtiva->execute();
            $rodadaAberta = $stmtAtiva->fetch(PDO::FETCH_ASSOC);
            if ($rodadaAberta) {
                $campeonatoId = $rodadaAberta['campeonato_id'];
            } else {
                echo json_encode([]);
                return;
            }
        }

        $stmt = $this->pdo->prepare("
            SELECT t.id, t.nome, t.logo_url as escudo,
                   COALESCE(SUM(CASE WHEN t.id = cp.timeA_id THEN cp.placar_timeA ELSE cp.placar_timeB END), 0) as gols_pro,
                   COALESCE(SUM(CASE WHEN t.id = cp.timeA_id THEN cp.placar_timeB ELSE cp.placar_timeA END), 0) as gols_sofridos,
                   COUNT(cp.id) as jogos,
                   COUNT(DISTINCT cp.rodada_id) as rodadas_jogadas,
                   COALESCE(SUM(
                       CASE 
                           WHEN (t.id = cp.timeA_id AND cp.placar_timeA > cp.placar_timeB) OR (t.id = cp.timeB_id AND cp.placar_timeB > cp.placar_timeA) THEN 1
                           ELSE 0
                       END
                   ), 0) as vitorias,
                   COALESCE(SUM(
                       CASE 
                           WHEN (t.id = cp.timeA_id AND cp.placar_timeA < cp.placar_timeB) OR (t.id = cp.timeB_id AND cp.placar_timeB < cp.placar_timeA) THEN 1
                           ELSE 0
                       END
                   ), 0) as derrotas,
                   COALESCE(SUM(
                       CASE 
                           WHEN (t.id = cp.timeA_id AND cp.placar_timeA > cp.placar_timeB) OR (t.id = cp.timeB_id AND cp.placar_timeB > cp.placar_timeA) THEN 3
                           WHEN cp.placar_timeA = cp.placar_timeB THEN 1
                           ELSE 0
                       END
                   ), 0) as pontos
            FROM times t
            JOIN campeonato_times ct ON t.id = ct.time_id AND ct.campeonato_id = ?
            LEFT JOIN campeonato_partidas cp ON (t.id = cp.timeA_id OR t.id = cp.timeB_id) AND cp.status = 'finalizada' AND cp.campeonato_id = ?
            GROUP BY t.id, t.nome, t.logo_url
            ORDER BY pontos DESC, gols_pro DESC
        ");
        $stmt->execute([$campeonatoId, $campeonatoId]);
        $stats = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($stats as &$s) {
            $r = (int)$s['rodadas_jogadas'];
            // Evitar divisão por zero caso o time não tenha jogado rodadas ainda
            $divisor = $r > 0 ? $r : 1; 
            
            $s['media_gols_pro'] = round((int)$s['gols_pro'] / $divisor, 2);
            $s['media_gols_sofridos'] = round((int)$s['gols_sofridos'] / $divisor, 2);
            $s['media_vitorias'] = round((int)$s['vitorias'] / $divisor, 2);
            $s['media_derrotas'] = round((int)$s['derrotas'] / $divisor, 2);
            $s['media_pontos'] = round((int)$s['pontos'] / $divisor, 2);
        }

        echo json_encode($stats);
    }

    public function adminGetStatsGoleiros() {
        $user = $_REQUEST['authUser'] ?? null;
        if (!$user || ($user['role'] !== 'admin' && $user['role'] !== 'dono')) {
            http_response_code(403);
            echo json_encode(["error" => "Acesso negado."]);
            return;
        }

        $campeonatoId = $_GET['campeonato_id'] ?? null;
        if (!$campeonatoId) {
            $stmtAtiva = $this->pdo->prepare("SELECT campeonato_id FROM rodadas WHERE status = 'aberta' ORDER BY id DESC LIMIT 1");
            $stmtAtiva->execute();
            $rodadaAberta = $stmtAtiva->fetch(PDO::FETCH_ASSOC);
            if ($rodadaAberta) {
                $campeonatoId = $rodadaAberta['campeonato_id'];
            } else {
                echo json_encode([]);
                return;
            }
        }

        $stmt = $this->pdo->prepare("
            SELECT j.id, j.nome, j.foto_url as foto, t.nome as time_nome,
                   COALESCE(SUM(CASE WHEN t.id = cp.timeA_id THEN cp.placar_timeB ELSE cp.placar_timeA END), 0) as gols_sofridos,
                   COUNT(cp.id) as jogos,
                   COUNT(DISTINCT cp.rodada_id) as rodadas_jogadas
            FROM jogadores j
            JOIN campeonato_elencos ce ON j.id = ce.jogador_id AND ce.campeonato_id = ?
            JOIN times t ON ce.time_id = t.id
            LEFT JOIN campeonato_partidas cp ON (t.id = cp.timeA_id OR t.id = cp.timeB_id) AND cp.status = 'finalizada' AND cp.campeonato_id = ?
            WHERE j.posicao = 'goleiro'
            GROUP BY j.id, j.nome, j.foto_url, t.nome
            ORDER BY gols_sofridos ASC
        ");
        $stmt->execute([$campeonatoId, $campeonatoId]);
        $stats = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($stats as &$s) {
            $r = (int)$s['rodadas_jogadas'];
            $divisor = $r > 0 ? $r : 1;
            $s['media_gols_sofridos'] = round((int)$s['gols_sofridos'] / $divisor, 2);
        }

        echo json_encode($stats);
    }

    public function adminExcluirMercado($id) {
        $user = $_REQUEST['authUser'] ?? null;
        if (!$user || ($user['role'] !== 'admin' && $user['role'] !== 'dono')) {
            http_response_code(403);
            echo json_encode(["error" => "Acesso negado."]);
            return;
        }

        try {
            $this->pdo->beginTransaction();

            // 1. Procurar todos os bilhetes que contém alguma opção desse mercado e ainda estão 'pendente'
            $stmtBilhetes = $this->pdo->prepare("
                SELECT DISTINCT b.id as bilhete_id, b.usuario_id, b.valor_apostado 
                FROM bets_bilhetes b
                JOIN bets_bilhete_opcoes bbo ON b.id = bbo.bilhete_id
                JOIN bets_opcoes bo ON bbo.opcao_id = bo.id
                WHERE bo.mercado_id = ? AND b.status = 'pendente'
            ");
            $stmtBilhetes->execute([$id]);
            $bilhetesCancelados = $stmtBilhetes->fetchAll(PDO::FETCH_ASSOC);

            // 2. Cancelar esses bilhetes e devolver o dinheiro
            foreach ($bilhetesCancelados as $bilhete) {
                // Devolve saldo
                $stmtRefund = $this->pdo->prepare("UPDATE bets_carteira SET saldo = saldo + ? WHERE usuario_id = ?");
                $stmtRefund->execute([$bilhete['valor_apostado'], $bilhete['usuario_id']]);

                // Marca como cancelado
                $stmtCancel = $this->pdo->prepare("UPDATE bets_bilhetes SET status = 'cancelado_reembolsado' WHERE id = ?");
                $stmtCancel->execute([$bilhete['bilhete_id']]);
            }

            // 3. Excluir opções do mercado
            $stmtDelOpcoes = $this->pdo->prepare("DELETE FROM bets_opcoes WHERE mercado_id = ?");
            $stmtDelOpcoes->execute([$id]);

            // 4. Excluir mercado
            $stmtDelMercado = $this->pdo->prepare("DELETE FROM bets_mercados WHERE id = ?");
            $stmtDelMercado->execute([$id]);

            $this->pdo->commit();
            echo json_encode(["success" => true, "message" => "Mercado excluído. " . count($bilhetesCancelados) . " apostas reembolsadas."]);
        } catch (Exception $e) {
            $this->pdo->rollBack();
            http_response_code(500);
            echo json_encode(["error" => "Falha ao excluir mercado e reembolsar", "details" => $e->getMessage()]);
        }
    }

    public function adminAtualizarMercadoStatus($id) {
        $user = $_REQUEST['authUser'] ?? null;
        if (!$user || ($user['role'] !== 'admin' && $user['role'] !== 'dono')) {
            http_response_code(403);
            return;
        }

        $input = json_decode(file_get_contents('php://input'), true);
        $status = $input['status'] ?? 'aberto'; // 'aberto' ou 'pausado'

        $stmt = $this->pdo->prepare("UPDATE bets_mercados SET status = ? WHERE id = ?");
        $stmt->execute([$status, $id]);

        echo json_encode(["success" => true]);
    }

    public function adminAtualizarOpcao($id) {
        $user = $_REQUEST['authUser'] ?? null;
        if (!$user || ($user['role'] !== 'admin' && $user['role'] !== 'dono')) {
            http_response_code(403);
            return;
        }

        $input = json_decode(file_get_contents('php://input'), true);
        $odd = $input['odd'] ?? null;

        if (!$odd) {
            http_response_code(400);
            return;
        }

        $stmt = $this->pdo->prepare("UPDATE bets_opcoes SET odd = ? WHERE id = ?");
        $stmt->execute([$odd, $id]);

        echo json_encode(["success" => true]);
    }

    public function adminCriarMercadoGenerico() {
        $user = $_REQUEST['authUser'] ?? null;
        if (!$user || ($user['role'] !== 'admin' && $user['role'] !== 'dono')) {
            http_response_code(403);
            echo json_encode(["error" => "Acesso negado."]);
            return;
        }

        $input = json_decode(file_get_contents('php://input'), true);
        $campeonatoId = $input['campeonato_id'] ?? null;
        $rodadaId = $input['rodada_id'] ?? null;
        $alvoId = $input['alvo_id'] ?? null;
        $tipoAlvo = $input['tipo_alvo'] ?? 'time'; // time, goleiro
        $categoria = $input['categoria'] ?? 'gols_pro'; // gols_pro, gols_sofridos, vitorias, derrotas, pontos
        $nomeAlvo = $input['nome_alvo'] ?? 'Alvo';

        if (!$campeonatoId || !$rodadaId) {
            $stmtAtiva = $this->pdo->prepare("SELECT id, campeonato_id FROM rodadas WHERE status = 'aberta' ORDER BY id DESC LIMIT 1");
            $stmtAtiva->execute();
            $rodadaAberta = $stmtAtiva->fetch(PDO::FETCH_ASSOC);
            if ($rodadaAberta) {
                $campeonatoId = $rodadaAberta['campeonato_id'];
                $rodadaId = $rodadaAberta['id'];
            }
        }

        if (!$campeonatoId || !$rodadaId || !$alvoId) {
            http_response_code(400);
            echo json_encode(["error" => "Dados incompletos"]);
            return;
        }

        $media = 0;
        
        if ($tipoAlvo === 'time') {
            $stmt = $this->pdo->prepare("
                SELECT 
                    COALESCE(SUM(CASE WHEN t.id = cp.timeA_id THEN cp.placar_timeA ELSE cp.placar_timeB END), 0) as gols_pro,
                    COALESCE(SUM(CASE WHEN t.id = cp.timeA_id THEN cp.placar_timeB ELSE cp.placar_timeA END), 0) as gols_sofridos,
                    COUNT(DISTINCT cp.rodada_id) as rodadas_jogadas,
                    COALESCE(SUM(CASE WHEN (t.id = cp.timeA_id AND cp.placar_timeA > cp.placar_timeB) OR (t.id = cp.timeB_id AND cp.placar_timeB > cp.placar_timeA) THEN 1 ELSE 0 END), 0) as vitorias,
                    COALESCE(SUM(CASE WHEN (t.id = cp.timeA_id AND cp.placar_timeA < cp.placar_timeB) OR (t.id = cp.timeB_id AND cp.placar_timeB < cp.placar_timeA) THEN 1 ELSE 0 END), 0) as derrotas,
                    COALESCE(SUM(CASE WHEN (t.id = cp.timeA_id AND cp.placar_timeA > cp.placar_timeB) OR (t.id = cp.timeB_id AND cp.placar_timeB > cp.placar_timeA) THEN 3 WHEN cp.placar_timeA = cp.placar_timeB THEN 1 ELSE 0 END), 0) as pontos
                FROM times t
                JOIN campeonato_times ct ON t.id = ct.time_id AND ct.campeonato_id = ?
                LEFT JOIN campeonato_partidas cp ON (t.id = cp.timeA_id OR t.id = cp.timeB_id) AND cp.campeonato_id = ? AND cp.status = 'finalizada'
                WHERE t.id = ?
                GROUP BY t.id
            ");
            $stmt->execute([$campeonatoId, $campeonatoId, $alvoId]);
            $stats = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($stats) {
                $rodadas = (int)$stats['rodadas_jogadas'] > 0 ? (int)$stats['rodadas_jogadas'] : 1;
                switch ($categoria) {
                    case 'gols_pro': $media = $stats['gols_pro'] / $rodadas; break;
                    case 'gols_sofridos': $media = $stats['gols_sofridos'] / $rodadas; break;
                    case 'vitorias': $media = $stats['vitorias'] / $rodadas; break;
                    case 'derrotas': $media = $stats['derrotas'] / $rodadas; break;
                    case 'pontos': $media = $stats['pontos'] / $rodadas; break;
                }
            }
        } else if ($tipoAlvo === 'goleiro') {
            $stmt = $this->pdo->prepare("
                SELECT 
                    COALESCE(SUM(CASE WHEN t.id = cp.timeA_id THEN cp.placar_timeB ELSE cp.placar_timeA END), 0) as gols_sofridos,
                    COUNT(DISTINCT cp.rodada_id) as rodadas_jogadas
                FROM jogadores j
                JOIN campeonato_elencos ce ON j.id = ce.jogador_id AND ce.campeonato_id = ?
                JOIN times t ON ce.time_id = t.id
                LEFT JOIN campeonato_partidas cp ON (t.id = cp.timeA_id OR t.id = cp.timeB_id) AND cp.campeonato_id = ? AND cp.status = 'finalizada'
                WHERE j.id = ?
                GROUP BY j.id
            ");
            $stmt->execute([$campeonatoId, $campeonatoId, $alvoId]);
            $stats = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($stats) {
                $rodadas = (int)$stats['rodadas_jogadas'] > 0 ? (int)$stats['rodadas_jogadas'] : 1;
                $media = $stats['gols_sofridos'] / $rodadas;
                $categoria = 'gols_sofridos'; // Goleiro só tem gols sofridos
            }
        }

        if ($media <= 0) {
            $media = 2.5; // fallback
        }

        $titulos = [
            'gols_pro' => "Total de Gols - $nomeAlvo",
            'gols_sofridos' => "Gols Sofridos - $nomeAlvo",
            'vitorias' => "Vitórias - $nomeAlvo",
            'derrotas' => "Derrotas - $nomeAlvo",
            'pontos' => "Pontos Feitos - $nomeAlvo"
        ];
        $titulo = $titulos[$categoria] ?? "Mercado - $nomeAlvo";

        try {
            $this->pdo->beginTransaction();

            $stmt = $this->pdo->prepare("INSERT INTO bets_mercados (campeonato_id, rodada_id, titulo, regra_categoria, regra_alvo_id, created_at) VALUES (?, ?, ?, ?, ?, NOW())");
            $stmt->execute([$campeonatoId, $rodadaId, $titulo, $categoria, $alvoId]);
            $mercadoId = $this->pdo->lastInsertId();

            $baseLine = floor($media) + 0.5;
            $linhas = [
                $baseLine - 2,
                $baseLine - 1,
                $baseLine,
                $baseLine + 1,
                $baseLine + 2
            ];

            foreach ($linhas as $linha) {
                if ($linha <= 0.5) continue;
                
                $k = ceil($linha); 
                
                $probOver = $this->poissonCumulativeGreater($media, $k);
                $probUnder = 1 - $probOver;
                
                $margin = 0.90;

                $oddOver = $probOver > 0.05 ? (1 / $probOver) * $margin : 15.00;
                $oddUnder = $probUnder > 0.05 ? (1 / $probUnder) * $margin : 15.00;

                if ($oddOver > 15) $oddOver = 15.00;
                if ($oddOver < 1.05) $oddOver = 1.05;
                if ($oddUnder > 15) $oddUnder = 15.00;
                if ($oddUnder < 1.05) $oddUnder = 1.05;

                $stmtOp = $this->pdo->prepare("INSERT INTO bets_opcoes (mercado_id, descricao, regra_condicao, regra_valor, odd) VALUES (?, ?, 'maior_que', ?, ?)");
                $stmtOp->execute([$mercadoId, "Mais de $linha", $linha, round($oddOver, 2)]);
                
                $stmtOp = $this->pdo->prepare("INSERT INTO bets_opcoes (mercado_id, descricao, regra_condicao, regra_valor, odd) VALUES (?, ?, 'menor_que', ?, ?)");
                $stmtOp->execute([$mercadoId, "Menos de $linha", $linha, round($oddUnder, 2)]);
            }

            $this->pdo->commit();
            echo json_encode(["success" => true, "mercado_id" => $mercadoId, "message" => "Mercado criado com sucesso!"]);
        } catch (Exception $e) {
            $this->pdo->rollBack();
            http_response_code(500);
            echo json_encode(["error" => "Falha ao criar mercado genérico", "details" => $e->getMessage()]);
        }
    }

    public function adminApurarRodada($rodadaId) {
        $user = $_REQUEST['authUser'] ?? null;
        if (!$user || ($user['role'] !== 'admin' && $user['role'] !== 'dono')) {
            http_response_code(403);
            echo json_encode(["error" => "Acesso negado."]);
            return;
        }

        try {
            $this->pdo->beginTransaction();

            $stmt = $this->pdo->prepare("SELECT * FROM bets_mercados WHERE rodada_id = ?");
            $stmt->execute([$rodadaId]);
            $mercados = $stmt->fetchAll(PDO::FETCH_ASSOC);

            foreach ($mercados as $mercado) {
                $alvoId = $mercado['regra_alvo_id'];
                $categoria = $mercado['regra_categoria'];
                $realResult = 0;

                $stmtCheck = $this->pdo->prepare("SELECT id FROM times WHERE id = ?");
                $stmtCheck->execute([$alvoId]);
                $isTime = $stmtCheck->fetch() ? true : false;

                if ($isTime) {
                    $stmtStats = $this->pdo->prepare("
                        SELECT 
                            COALESCE(SUM(CASE WHEN t.id = cp.timeA_id THEN cp.placar_timeA ELSE cp.placar_timeB END), 0) as gols_pro,
                            COALESCE(SUM(CASE WHEN t.id = cp.timeA_id THEN cp.placar_timeB ELSE cp.placar_timeA END), 0) as gols_sofridos,
                            COALESCE(SUM(CASE WHEN (t.id = cp.timeA_id AND cp.placar_timeA > cp.placar_timeB) OR (t.id = cp.timeB_id AND cp.placar_timeB > cp.placar_timeA) THEN 1 ELSE 0 END), 0) as vitorias,
                            COALESCE(SUM(CASE WHEN (t.id = cp.timeA_id AND cp.placar_timeA < cp.placar_timeB) OR (t.id = cp.timeB_id AND cp.placar_timeB < cp.placar_timeA) THEN 1 ELSE 0 END), 0) as derrotas,
                            COALESCE(SUM(CASE WHEN (t.id = cp.timeA_id AND cp.placar_timeA > cp.placar_timeB) OR (t.id = cp.timeB_id AND cp.placar_timeB > cp.placar_timeA) THEN 3 WHEN cp.placar_timeA = cp.placar_timeB THEN 1 ELSE 0 END), 0) as pontos
                        FROM times t
                        JOIN campeonato_partidas cp ON (t.id = cp.timeA_id OR t.id = cp.timeB_id) AND cp.rodada_id = ?
                        WHERE t.id = ? AND cp.status IN ('finalizada', 'em_andamento')
                    ");
                    $stmtStats->execute([$mercado['rodada_id'], $alvoId]);
                    $stats = $stmtStats->fetch(PDO::FETCH_ASSOC);
                    
                    if ($stats) {
                        switch ($categoria) {
                            case 'gols_pro': $realResult = $stats['gols_pro']; break;
                            case 'gols_sofridos': $realResult = $stats['gols_sofridos']; break;
                            case 'vitorias': $realResult = $stats['vitorias']; break;
                            case 'derrotas': $realResult = $stats['derrotas']; break;
                            case 'pontos': $realResult = $stats['pontos']; break;
                        }
                    }
                } else {
                    $stmtStats = $this->pdo->prepare("
                        SELECT COALESCE(SUM(CASE WHEN t.id = cp.timeA_id THEN cp.placar_timeB ELSE cp.placar_timeA END), 0) as gols_sofridos
                        FROM jogadores j
                        JOIN campeonato_elencos ce ON j.id = ce.jogador_id
                        JOIN times t ON ce.time_id = t.id
                        JOIN campeonato_partidas cp ON (t.id = cp.timeA_id OR t.id = cp.timeB_id) AND cp.rodada_id = ?
                        WHERE j.id = ? AND cp.status IN ('finalizada', 'em_andamento')
                    ");
                    $stmtStats->execute([$mercado['rodada_id'], $alvoId]);
                    $stats = $stmtStats->fetch(PDO::FETCH_ASSOC);
                    if ($stats) $realResult = $stats['gols_sofridos'];
                }

                $stmtOps = $this->pdo->prepare("SELECT * FROM bets_opcoes WHERE mercado_id = ?");
                $stmtOps->execute([$mercado['id']]);
                $opcoes = $stmtOps->fetchAll(PDO::FETCH_ASSOC);

                foreach ($opcoes as $op) {
                    $linha = (float)$op['regra_valor'];
                    $condicao = $op['regra_condicao'];
                    
                    $opGanhou = false;
                    if ($condicao === 'maior_que' && $realResult > $linha) $opGanhou = true;
                    if ($condicao === 'menor_que' && $realResult < $linha) $opGanhou = true;

                    $opStatus = $opGanhou ? 'ganhou' : 'perdeu';
                    try {
                        $this->pdo->exec("UPDATE bets_opcoes SET status_resultado = '$opStatus' WHERE id = " . $op['id']);
                    } catch (Exception $e) {}
                }

                $this->pdo->prepare("UPDATE bets_mercados SET status = 'resolvido', resultado_real = ? WHERE id = ?")->execute([$realResult, $mercado['id']]);
            }

            $stmtBilhetes = $this->pdo->prepare("SELECT DISTINCT bb.* FROM bets_bilhetes bb JOIN bets_bilhete_opcoes bbo ON bb.id = bbo.bilhete_id JOIN bets_opcoes bo ON bbo.opcao_id = bo.id JOIN bets_mercados bm ON bo.mercado_id = bm.id WHERE bm.rodada_id = ?");
            $stmtBilhetes->execute([$rodadaId]);
            $bilhetes = $stmtBilhetes->fetchAll(PDO::FETCH_ASSOC);

            foreach ($bilhetes as $bilhete) {
                $statusAntigo = $bilhete['status'];
                
                $stmtBops = $this->pdo->prepare("
                    SELECT bbo.opcao_id, bo.regra_condicao, bo.regra_valor, bm.regra_categoria, bm.regra_alvo_id, bm.titulo, bm.rodada_id as opcao_rodada_id
                    FROM bets_bilhete_opcoes bbo
                    JOIN bets_opcoes bo ON bbo.opcao_id = bo.id
                    JOIN bets_mercados bm ON bo.mercado_id = bm.id
                    WHERE bbo.bilhete_id = ?
                ");
                $stmtBops->execute([$bilhete['id']]);
                $opcoesBilhete = $stmtBops->fetchAll(PDO::FETCH_ASSOC);

                $bilheteVenceu = true;

                foreach ($opcoesBilhete as $opb) {
                    $alvoId = $opb['regra_alvo_id'];
                    $categoria = $opb['regra_categoria'];
                    
                    $stmtCheck = $this->pdo->prepare("SELECT id FROM times WHERE id = ?");
                    $stmtCheck->execute([$alvoId]);
                    $isTime = $stmtCheck->fetch() ? true : false;

                    $realResult = 0;
                    if ($isTime) {
                        $stmtStats = $this->pdo->prepare("
                            SELECT 
                                COALESCE(SUM(CASE WHEN t.id = cp.timeA_id THEN cp.placar_timeA ELSE cp.placar_timeB END), 0) as gols_pro,
                                COALESCE(SUM(CASE WHEN t.id = cp.timeA_id THEN cp.placar_timeB ELSE cp.placar_timeA END), 0) as gols_sofridos,
                                COALESCE(SUM(CASE WHEN (t.id = cp.timeA_id AND cp.placar_timeA > cp.placar_timeB) OR (t.id = cp.timeB_id AND cp.placar_timeB > cp.placar_timeA) THEN 1 ELSE 0 END), 0) as vitorias,
                                COALESCE(SUM(CASE WHEN (t.id = cp.timeA_id AND cp.placar_timeA < cp.placar_timeB) OR (t.id = cp.timeB_id AND cp.placar_timeB < cp.placar_timeA) THEN 1 ELSE 0 END), 0) as derrotas,
                                COALESCE(SUM(CASE WHEN (t.id = cp.timeA_id AND cp.placar_timeA > cp.placar_timeB) OR (t.id = cp.timeB_id AND cp.placar_timeB > cp.placar_timeA) THEN 3 WHEN cp.placar_timeA = cp.placar_timeB THEN 1 ELSE 0 END), 0) as pontos
                            FROM times t
                            JOIN campeonato_partidas cp ON (t.id = cp.timeA_id OR t.id = cp.timeB_id) AND cp.rodada_id = ?
                            WHERE t.id = ? AND cp.status IN ('finalizada', 'em_andamento')
                        ");
                        $stmtStats->execute([$opb['opcao_rodada_id'], $alvoId]);
                        $s = $stmtStats->fetch(PDO::FETCH_ASSOC);
                        if ($s) {
                            switch ($categoria) {
                                case 'gols_pro': $realResult = $s['gols_pro']; break;
                                case 'gols_sofridos': $realResult = $s['gols_sofridos']; break;
                                case 'vitorias': $realResult = $s['vitorias']; break;
                                case 'derrotas': $realResult = $s['derrotas']; break;
                                case 'pontos': $realResult = $s['pontos']; break;
                            }
                        }
                    } else {
                        $stmtStats = $this->pdo->prepare("
                            SELECT COALESCE(SUM(CASE WHEN t.id = cp.timeA_id THEN cp.placar_timeB ELSE cp.placar_timeA END), 0) as gols_sofridos
                            FROM jogadores j
                            JOIN campeonato_elencos ce ON j.id = ce.jogador_id
                            JOIN times t ON ce.time_id = t.id
                            JOIN campeonato_partidas cp ON (t.id = cp.timeA_id OR t.id = cp.timeB_id) AND cp.rodada_id = ?
                            WHERE j.id = ? AND cp.status IN ('finalizada', 'em_andamento')
                        ");
                        $stmtStats->execute([$opb['opcao_rodada_id'], $alvoId]);
                        $s = $stmtStats->fetch(PDO::FETCH_ASSOC);
                        if ($s) $realResult = $s['gols_sofridos'];
                    }

                    $linha = (float)$opb['regra_valor'];
                    $cond = $opb['regra_condicao'];
                    
                    $opGanhou = false;
                    if ($cond === 'maior_que' && $realResult > $linha) $opGanhou = true;
                    if ($cond === 'menor_que' && $realResult < $linha) $opGanhou = true;

                    if (!$opGanhou) {
                        $bilheteVenceu = false;
                        break;
                    }
                }

                file_put_contents('/tmp/debug_bets.log', "Bilhete {$bilhete['id']}: realResult={$realResult}, linha={$linha}, cond={$cond}, opGanhou=" . ($opGanhou ? '1' : '0') . "
", FILE_APPEND); $novoStatus = $bilheteVenceu ? 'ganhou' : 'perdeu';
                $premio = (float)$bilhete['valor_apostado'] * (float)$bilhete['odd_total'];

                if ($statusAntigo !== $novoStatus) {
                    if ($statusAntigo === 'ganhou' && $novoStatus === 'perdeu') {
                        $this->pdo->prepare("UPDATE bets_carteira SET saldo = saldo - ?, lucro_prejuizo_total = lucro_prejuizo_total - ? WHERE usuario_id = ?")->execute([$premio, $premio, $bilhete['usuario_id']]);
                    }
                    if ($statusAntigo === 'perdeu' && $novoStatus === 'ganhou') {
                        $this->pdo->prepare("UPDATE bets_carteira SET saldo = saldo + ?, lucro_prejuizo_total = lucro_prejuizo_total + ? WHERE usuario_id = ?")->execute([$premio, $premio, $bilhete['usuario_id']]);
                    }
                    if ($statusAntigo === 'pendente') {
                        if ($novoStatus === 'ganhou') {
                            $this->pdo->prepare("UPDATE bets_carteira SET saldo = saldo + ?, lucro_prejuizo_total = lucro_prejuizo_total + ? WHERE usuario_id = ?")->execute([$premio, $premio - $bilhete['valor_apostado'], $bilhete['usuario_id']]);
                        } else {
                            $this->pdo->prepare("UPDATE bets_carteira SET lucro_prejuizo_total = lucro_prejuizo_total - ? WHERE usuario_id = ?")->execute([$bilhete['valor_apostado'], $bilhete['usuario_id']]);
                        }
                    }

                    $this->pdo->prepare("UPDATE bets_bilhetes SET status = ? WHERE id = ?")->execute([$novoStatus, $bilhete['id']]);
                }
            }

            $this->pdo->commit();
            echo json_encode(["success" => true, "message" => "Rodada apurada com sucesso! " . count($bilhetes) . " bilhetes avaliados."]);
        } catch (Exception $e) {
            $this->pdo->rollBack();
            http_response_code(500);
            echo json_encode(["error" => "Falha ao apurar rodada", "details" => $e->getMessage()]);
        }
    }
}
