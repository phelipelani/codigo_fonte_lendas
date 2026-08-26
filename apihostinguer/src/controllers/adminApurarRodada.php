<?php
// Function adminApurarRodada to be added to BetsController

    public function adminApurarRodada($rodadaId) {
        $user = $_REQUEST['authUser'] ?? null;
        if (!$user || ($user['role'] !== 'admin' && $user['role'] !== 'dono')) {
            http_response_code(403);
            echo json_encode(["error" => "Acesso negado."]);
            return;
        }

        try {
            $this->pdo->beginTransaction();

            // 1. Obter todos os mercados dessa rodada
            $stmt = $this->pdo->prepare("SELECT * FROM bets_mercados WHERE rodada_id = ?");
            $stmt->execute([$rodadaId]);
            $mercados = $stmt->fetchAll(PDO::FETCH_ASSOC);

            foreach ($mercados as $mercado) {
                $alvoId = $mercado['regra_alvo_id'];
                $categoria = $mercado['regra_categoria'];
                $realResult = 0;

                // Identificar o tipo do alvo (time ou goleiro) pelo titulo ou lógica, ou podemos inferir
                // Se categoria = 'gols_sofridos' e não sabemos se é time, podemos rodar as duas e somar?
                // O mais seguro é verificar se $alvoId existe na tabela de times ou jogadores.
                // Mas os IDs podem colidir. A api antiga não guardava 'tipo_alvo' no banco.
                // Como não guardamos tipo_alvo na tabela bets_mercados, e os times tem IDs baixos, jogadores tem altos, 
                // vamos checar se é time primeiro.
                
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
                    $stmtStats->execute([$rodadaId, $alvoId]);
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
                    // É goleiro
                    $stmtStats = $this->pdo->prepare("
                        SELECT 
                            COALESCE(SUM(CASE WHEN t.id = cp.timeA_id THEN cp.placar_timeB ELSE cp.placar_timeA END), 0) as gols_sofridos
                        FROM jogadores j
                        JOIN campeonato_elencos ce ON j.id = ce.jogador_id
                        JOIN times t ON ce.time_id = t.id
                        JOIN campeonato_partidas cp ON (t.id = cp.timeA_id OR t.id = cp.timeB_id) AND cp.rodada_id = ?
                        WHERE j.id = ? AND cp.status IN ('finalizada', 'em_andamento')
                    ");
                    $stmtStats->execute([$rodadaId, $alvoId]);
                    $stats = $stmtStats->fetch(PDO::FETCH_ASSOC);
                    
                    if ($stats) {
                        $realResult = $stats['gols_sofridos'];
                    }
                }

                // Resolver as opções do mercado
                $stmtOps = $this->pdo->prepare("SELECT * FROM bets_opcoes WHERE mercado_id = ?");
                $stmtOps->execute([$mercado['id']]);
                $opcoes = $stmtOps->fetchAll(PDO::FETCH_ASSOC);

                foreach ($opcoes as $op) {
                    $linha = (float)$op['regra_valor'];
                    $condicao = $op['regra_condicao']; // maior_que ou menor_que
                    
                    $opGanhou = false;
                    if ($condicao === 'maior_que' && $realResult > $linha) $opGanhou = true;
                    if ($condicao === 'menor_que' && $realResult < $linha) $opGanhou = true;

                    $opStatus = $opGanhou ? 'ganhou' : 'perdeu';
                    
                    // Atualiza status da opção se tivermos a coluna (não temos, então pulamos, 
                    // avaliamos direto no bilhete). O ideal é atualizar a opção se houver campo.
                    // Vamos tentar atualizar caso o schema possua. (Ignoramos erro se não existir)
                    try {
                        $this->pdo->exec("UPDATE bets_opcoes SET status = '$opStatus' WHERE id = " . $op['id']);
                    } catch (Exception $e) {}
                }

                // Marca o mercado como resolvido
                $this->pdo->prepare("UPDATE bets_mercados SET status = 'resolvido' WHERE id = ?")->execute([$mercado['id']]);
            }

            // 2. Resolver os bilhetes
            // Pegamos todos os bilhetes da rodada
            $stmtBilhetes = $this->pdo->prepare("SELECT * FROM bets_bilhetes WHERE rodada_id = ?");
            $stmtBilhetes->execute([$rodadaId]);
            $bilhetes = $stmtBilhetes->fetchAll(PDO::FETCH_ASSOC);

            foreach ($bilhetes as $bilhete) {
                $statusAntigo = $bilhete['status'];
                
                // Pega as opções do bilhete
                $stmtBops = $this->pdo->prepare("
                    SELECT bbo.opcao_id, bo.regra_condicao, bo.regra_valor, bm.regra_categoria, bm.regra_alvo_id, bm.titulo
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
                    
                    // (Lógica repetida mas rápida para garantir o resultado do mercado de CADA opção)
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
                        $stmtStats->execute([$rodadaId, $alvoId]);
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
                        $stmtStats->execute([$rodadaId, $alvoId]);
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

                $novoStatus = $bilheteVenceu ? 'ganhou' : 'perdeu';
                $premio = (float)$bilhete['valor_apostado'] * (float)$bilhete['odd_total'];

                // Só fazemos movimentação se o status de fato mudar!
                if ($statusAntigo !== $novoStatus) {
                    
                    // REVERSÃO SE ESTAVA COMO GANHOU E AGORA É PERDEU
                    if ($statusAntigo === 'ganhou' && $novoStatus === 'perdeu') {
                        $this->pdo->prepare("UPDATE bets_carteira SET saldo = saldo - ?, lucro_prejuizo_total = lucro_prejuizo_total - ? WHERE usuario_id = ?")->execute([$premio, $premio, $bilhete['usuario_id']]);
                    }
                    
                    // REVERSÃO SE ESTAVA COMO PERDEU E AGORA É GANHOU
                    if ($statusAntigo === 'perdeu' && $novoStatus === 'ganhou') {
                        $this->pdo->prepare("UPDATE bets_carteira SET saldo = saldo + ?, lucro_prejuizo_total = lucro_prejuizo_total + ? WHERE usuario_id = ?")->execute([$premio, $premio, $bilhete['usuario_id']]);
                    }

                    // APLICAÇÃO NORMAL (Pendente -> Ganhou/Perdeu)
                    if ($statusAntigo === 'pendente') {
                        if ($novoStatus === 'ganhou') {
                            $this->pdo->prepare("UPDATE bets_carteira SET saldo = saldo + ?, lucro_prejuizo_total = lucro_prejuizo_total + ? WHERE usuario_id = ?")->execute([$premio, $premio - $bilhete['valor_apostado'], $bilhete['usuario_id']]);
                        } else {
                            $this->pdo->prepare("UPDATE bets_carteira SET lucro_prejuizo_total = lucro_prejuizo_total - ? WHERE usuario_id = ?")->execute([$bilhete['valor_apostado'], $bilhete['usuario_id']]);
                        }
                    }

                    // Atualiza bilhete
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
