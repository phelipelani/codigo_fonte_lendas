<?php
// Arquivo: src/controllers/CartolendaLigaController.php

require_once __DIR__ . '/../utils/CartolendaEventos.php';

class CartolendaLigaController {

    private PDO $pdo;
    private const CUSTO_TRANSFERENCIA = 2.00;

    public function __construct() {
        $this->pdo = Database::getInstance()->getConnection();
    }

    // ──────────────────────────────────────────────────────────
    // HELPERS
    // ──────────────────────────────────────────────────────────

    private function json($data, int $status = 200): void {
        http_response_code($status);
        header('Content-Type: application/json');
        echo json_encode($data);
    }

    private function error(string $msg, int $status = 400): void {
        $this->json(['error' => true, 'message' => $msg], $status);
    }

    private function userId(): int {
        $authUser = $_REQUEST['authUser'] ?? null;
        return (int) ($authUser['userId'] ?? 0);
    }

    private function isAdmin(): bool {
        $authUser = $_REQUEST['authUser'] ?? null;
        return ($authUser['role'] ?? '') === 'admin';
    }

    private function body(): array {
        return json_decode(file_get_contents('php://input'), true) ?? [];
    }

    private function gerarCodigo(): string {
        do {
            $code = strtoupper(substr(str_shuffle('ABCDEFGHJKLMNPQRSTUVWXYZ23456789'), 0, 8));
            $exists = $this->pdo->prepare("SELECT id FROM cartolendas_ligas WHERE codigo_convite = ?");
            $exists->execute([$code]);
        } while ($exists->fetch());
        return $code;
    }

    private function getSaldoUsuario(int $userId): float {
        $st = $this->pdo->prepare("SELECT lendas_coins FROM cartolendas_ranking WHERE usuario_id = ?");
        $st->execute([$userId]);
        $row = $st->fetch(PDO::FETCH_ASSOC);
        return $row ? (float)$row['lendas_coins'] : 100.00;
    }

    private function setSaldoUsuario(int $userId, float $novoSaldo): void {
        $st = $this->pdo->prepare("
            INSERT INTO cartolendas_ranking (usuario_id, lendas_coins)
            VALUES (?, ?)
            ON DUPLICATE KEY UPDATE lendas_coins = ?
        ");
        $st->execute([$userId, $novoSaldo, $novoSaldo]);
    }

    private function rodadaAbertaParaTransferencia(int $rodadaId): bool {
        // Janela fecha quando admin faz check-in (status = em_andamento)
        $st = $this->pdo->prepare("SELECT status FROM rodadas WHERE id = ?");
        $st->execute([$rodadaId]);
        $row = $st->fetch(PDO::FETCH_ASSOC);
        if (!$row) return false;
        return in_array($row['status'], ['agendada', 'aberta']);
    }

    // ──────────────────────────────────────────────────────────
    // LIGAS — CRUD
    // ──────────────────────────────────────────────────────────

    // GET /cartolendas/ligas
    public function listar(): void {
        $userId = $this->userId();
        $st = $this->pdo->prepare("
            SELECT l.*,
                   u.username AS criador_nome,
                   c.nome     AS campeonato_nome,
                   (SELECT COUNT(*) FROM cartolendas_liga_membros WHERE liga_id = l.id) AS total_membros,
                   (SELECT COUNT(*) FROM cartolendas_liga_membros WHERE liga_id = l.id AND usuario_id = ?) AS sou_membro
            FROM cartolendas_ligas l
            JOIN usuarios    u ON u.id = l.criador_id
            JOIN campeonatos c ON c.id = l.campeonato_id
            WHERE l.ativa = 1
            ORDER BY l.tipo = 'global' DESC, l.created_at DESC
        ");
        $st->execute([$userId]);
        $this->json($st->fetchAll(PDO::FETCH_ASSOC));
    }

    // GET /cartolendas/ligas/:id
    public function detalhe(int $ligaId): void {
        $userId = $this->userId();
        $st = $this->pdo->prepare("
            SELECT l.*,
                   u.username AS criador_nome,
                   c.nome     AS campeonato_nome,
                   c.fase_atual,
                   (SELECT COUNT(*) FROM cartolendas_liga_membros WHERE liga_id = l.id) AS total_membros,
                   (SELECT COUNT(*) FROM cartolendas_liga_membros WHERE liga_id = l.id AND usuario_id = ?) AS sou_membro
            FROM cartolendas_ligas l
            JOIN usuarios    u ON u.id = l.criador_id
            JOIN campeonatos c ON c.id = l.campeonato_id
            WHERE l.id = ?
        ");
        $st->execute([$userId, $ligaId]);
        $liga = $st->fetch(PDO::FETCH_ASSOC);
        if (!$liga) { $this->error('Liga não encontrada', 404); return; }

        // Membros com ranking
        $membros = $this->pdo->prepare("
            SELECT u.id, u.username,
                   j.nome AS jogador_nome, j.foto_url, j.avatar_url,
                   COALESCE(r.pontos_total, 0)   AS pontos_total,
                   COALESCE(r.lendas_coins, 100) AS lendas_coins,
                   COALESCE(r.divisao, 'Bronze')  AS divisao,
                   COALESCE(r.rodadas_jogadas, 0) AS rodadas_jogadas,
                   COALESCE(r.melhor_rodada_pts, 0) AS melhor_rodada_pts
            FROM cartolendas_liga_membros m
            JOIN usuarios u ON u.id = m.usuario_id
            LEFT JOIN jogadores j ON j.usuario_id = u.id
            LEFT JOIN cartolendas_ranking r ON r.usuario_id = u.id
            WHERE m.liga_id = ?
            ORDER BY r.pontos_total DESC
        ");
        $membros->execute([$ligaId]);
        $liga['membros'] = $membros->fetchAll(PDO::FETCH_ASSOC);

        $this->json($liga);
    }

    // POST /cartolendas/ligas
    public function criar(): void {
        $userId = $this->userId();
        $body   = $this->body();

        $nome         = trim($body['nome'] ?? '');
        $tipo         = $body['tipo'] ?? 'privada';
        $campeonatoId = (int)($body['campeonato_id'] ?? 0);
        $descricao    = trim($body['descricao'] ?? '');
        $maxMembros   = (int)($body['max_membros'] ?? 20);

        if (!$nome)         { $this->error('Nome obrigatório'); return; }
        if (!$campeonatoId) { $this->error('Campeonato obrigatório'); return; }
        if ($tipo === 'global' && !$this->isAdmin()) { $this->error('Apenas admin pode criar liga global', 403); return; }

        // Verifica se já existe liga com mesmo nome
        $stNome = $this->pdo->prepare("SELECT id FROM cartolendas_ligas WHERE nome = ? AND ativa = 1");
        $stNome->execute([$nome]);
        if ($stNome->fetch()) {
            $this->error('Já existe uma liga ativa com esse nome. Escolha outro nome.');
            return;
        }

        $codigo = $tipo === 'privada' ? $this->gerarCodigo() : null;

        // Verifica se campeonato existe
        $stCamp = $this->pdo->prepare("SELECT id, nome FROM campeonatos WHERE id = ?");
        $stCamp->execute([$campeonatoId]);
        if (!$stCamp->fetch()) {
            $this->error("Campeonato ID {$campeonatoId} não encontrado no banco de dados.");
            return;
        }

        // Verifica se usuario existe
        $stUser = $this->pdo->prepare("SELECT id FROM usuarios WHERE id = ?");
        $stUser->execute([$userId]);
        if (!$stUser->fetch()) {
            $this->error("Usuário ID {$userId} não encontrado. Faça login novamente.");
            return;
        }

        try {
            $st = $this->pdo->prepare("
                INSERT INTO cartolendas_ligas (nome, descricao, tipo, codigo_convite, criador_id, campeonato_id, max_membros)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ");
            $st->execute([$nome, $descricao, $tipo, $codigo, $userId, $campeonatoId, $maxMembros]);
            $ligaId = (int)$this->pdo->lastInsertId();

            // Criador entra automaticamente
            $this->pdo->prepare("INSERT IGNORE INTO cartolendas_liga_membros (liga_id, usuario_id) VALUES (?, ?)")
                      ->execute([$ligaId, $userId]);

            $this->json(['id' => $ligaId, 'codigo_convite' => $codigo, 'message' => 'Liga criada!'], 201);
        } catch (\PDOException $e) {
            $sqlState = (string)$e->getCode();
            $msg = $e->getMessage();
            if (strpos($msg, 'Duplicate') !== false) {
                $this->error('Já existe uma liga com esse nome ou código. Tente outro nome.');
            } elseif (strpos($msg, 'foreign key') !== false || strpos($msg, 'FOREIGN KEY') !== false) {
                $this->error("Erro de referência no banco: {$msg}");
            } else {
                $this->error("Erro ao criar liga: [{$sqlState}] {$msg}", 500);
            }
        }
    }

    // POST /cartolendas/ligas/entrar
    public function entrar(): void {
        $userId = $this->userId();
        $body   = $this->body();
        $codigo = strtoupper(trim($body['codigo'] ?? ''));

        if (!$codigo) { $this->error('Código obrigatório'); return; }

        $st = $this->pdo->prepare("SELECT * FROM cartolendas_ligas WHERE codigo_convite = ? AND ativa = 1");
        $st->execute([$codigo]);
        $liga = $st->fetch(PDO::FETCH_ASSOC);
        if (!$liga) { $this->error('Código inválido ou liga encerrada', 404); return; }

        // Verifica vagas
        $membros = (int)$this->pdo->query("SELECT COUNT(*) FROM cartolendas_liga_membros WHERE liga_id = {$liga['id']}")->fetchColumn();
        if ($membros >= $liga['max_membros']) { $this->error('Liga cheia'); return; }

        $ins = $this->pdo->prepare("INSERT IGNORE INTO cartolendas_liga_membros (liga_id, usuario_id) VALUES (?, ?)");
        $ins->execute([$liga['id'], $userId]);

        $this->json(['message' => "Entrou na liga {$liga['nome']}!", 'liga_id' => $liga['id']]);
    }

    // POST /cartolendas/ligas/:id/adicionar-membro
    // body: { usuario_id: number }
    // Apenas admin ou criador da liga pode usar
    public function adicionarMembro(int $ligaId): void {
        $userId = $this->userId();
        $body   = $this->body();
        $targetUserId = (int)($body['usuario_id'] ?? 0);

        if (!$targetUserId) { $this->error('usuario_id obrigatório'); return; }

        // Verifica se é admin ou criador da liga
        $st = $this->pdo->prepare("SELECT criador_id, max_membros FROM cartolendas_ligas WHERE id = ? AND ativa = 1");
        $st->execute([$ligaId]);
        $liga = $st->fetch(PDO::FETCH_ASSOC);
        if (!$liga) { $this->error('Liga não encontrada', 404); return; }

        if ((int)$liga['criador_id'] !== $userId && !$this->isAdmin()) {
            $this->error('Apenas o criador da liga ou admin pode adicionar membros', 403); return;
        }

        // Verifica vagas
        $membros = (int)$this->pdo->query("SELECT COUNT(*) FROM cartolendas_liga_membros WHERE liga_id = {$ligaId}")->fetchColumn();
        if ($membros >= (int)$liga['max_membros']) { $this->error('Liga cheia'); return; }

        // Verifica se usuário existe
        $userRow = $this->pdo->prepare("SELECT id, username FROM usuarios WHERE id = ?");
        $userRow->execute([$targetUserId]);
        $targetUser = $userRow->fetch(PDO::FETCH_ASSOC);
        if (!$targetUser) { $this->error('Usuário não encontrado', 404); return; }

        // Adiciona (IGNORE para evitar duplicata)
        $this->pdo->prepare("INSERT IGNORE INTO cartolendas_liga_membros (liga_id, usuario_id) VALUES (?, ?)")
                  ->execute([$ligaId, $targetUserId]);

        $this->json(['message' => "{$targetUser['username']} adicionado à liga!"]);
    }

    // GET /cartolendas/usuarios-disponiveis/:ligaId
    // Lista usuários que podem ser adicionados (que NÃO estão na liga)
    public function usuariosDisponiveis(int $ligaId): void {
        $st = $this->pdo->prepare("
            SELECT u.id, u.username, j.nome AS jogador_nome, j.foto_url, j.avatar_url
            FROM usuarios u
            LEFT JOIN jogadores j ON j.usuario_id = u.id
            WHERE u.id NOT IN (
                SELECT usuario_id FROM cartolendas_liga_membros WHERE liga_id = ?
            )
            ORDER BY COALESCE(j.nome, u.username) ASC
        ");
        $st->execute([$ligaId]);
        $this->json($st->fetchAll(PDO::FETCH_ASSOC));
    }

    // DELETE /cartolendas/ligas/:id/sair
    public function sair(int $ligaId): void {
        $userId = $this->userId();
        $this->pdo->prepare("DELETE FROM cartolendas_liga_membros WHERE liga_id = ? AND usuario_id = ?")
                  ->execute([$ligaId, $userId]);
        $this->json(['message' => 'Saiu da liga.']);
    }

    // ──────────────────────────────────────────────────────────
    // RANKING POR LIGA
    // ──────────────────────────────────────────────────────────

    // GET /cartolendas/ligas/:id/ranking
    public function rankingLiga(int $ligaId): void {
        $st = $this->pdo->prepare("
            SELECT u.id AS usuario_id, u.username,
                   j.nome AS jogador_nome, j.foto_url, j.avatar_url,
                   COALESCE(r.pontos_total, 0)     AS pontos_total,
                   COALESCE(r.lendas_coins, 100)   AS lendas_coins,
                   COALESCE(r.divisao, 'Bronze')    AS divisao,
                   COALESCE(r.melhor_rodada_pts, 0) AS melhor_rodada_pts,
                   COALESCE(r.rodadas_jogadas, 0)   AS rodadas_jogadas,
                   COALESCE(r.patrimonio, 0)         AS patrimonio,
                   ROW_NUMBER() OVER (ORDER BY COALESCE(r.pontos_total,0) DESC) AS posicao
            FROM cartolendas_liga_membros m
            JOIN usuarios u ON u.id = m.usuario_id
            LEFT JOIN jogadores  j ON j.usuario_id = u.id
            LEFT JOIN cartolendas_ranking r ON r.usuario_id = u.id
            WHERE m.liga_id = ?
            ORDER BY pontos_total DESC
        ");
        $st->execute([$ligaId]);
        $this->json($st->fetchAll(PDO::FETCH_ASSOC));
    }

    // ──────────────────────────────────────────────────────────
    // CAPITÃO
    // ──────────────────────────────────────────────────────────

    // POST /cartolendas/capitao
    public function definirCapitao(): void {
        $userId    = $this->userId();
        $body      = $this->body();
        $jogadorId = (int)($body['jogador_id'] ?? 0);
        $rodadaId  = (int)($body['rodada_id']  ?? 0);

        if (!$jogadorId || !$rodadaId) { $this->error('jogador_id e rodada_id obrigatórios'); return; }

        // Verifica se jogador está no time do usuário nessa rodada
        $st = $this->pdo->prepare("
            SELECT e.id FROM cartolendas_escalacao e
            JOIN cartolendas_times t ON t.id = e.cartolendas_time_id
            WHERE t.usuario_id = ? AND t.rodada_id = ? AND e.jogador_id = ? AND e.eh_reserva = 0
        ");
        $st->execute([$userId, $rodadaId, $jogadorId]);
        if (!$st->fetch()) { $this->error('Jogador não está escalado como titular.'); return; }

        // Busca time_id
        $timeId = (int)$this->pdo->prepare("SELECT id FROM cartolendas_times WHERE usuario_id = ? AND rodada_id = ?")
            ->execute([$userId, $rodadaId]) ? $this->pdo->prepare("SELECT id FROM cartolendas_times WHERE usuario_id = ? AND rodada_id = ?")->execute([$userId, $rodadaId]) : 0;

        $stTime = $this->pdo->prepare("SELECT id FROM cartolendas_times WHERE usuario_id = ? AND rodada_id = ?");
        $stTime->execute([$userId, $rodadaId]);
        $time = $stTime->fetch(PDO::FETCH_ASSOC);
        if (!$time) { $this->error('Time não encontrado'); return; }

        $ins = $this->pdo->prepare("
            INSERT INTO cartolendas_capitao (cartolendas_time_id, jogador_id, rodada_id)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE jogador_id = ?
        ");
        $ins->execute([$time['id'], $jogadorId, $rodadaId, $jogadorId]);
        $this->json(['message' => 'Capitão definido!']);
    }

    // GET /cartolendas/capitao/:rodadaId
    public function getCapitao(int $rodadaId): void {
        $userId = $this->userId();
        // Busca preço da última rodada finalizada
        $ufRow = $this->pdo->query("
            SELECT id FROM rodadas WHERE status = 'finalizada' ORDER BY data DESC, id DESC LIMIT 1
        ")->fetch(PDO::FETCH_ASSOC);
        $precoRodadaId = $ufRow ? (int)$ufRow['id'] : $rodadaId;

        $st = $this->pdo->prepare("
            SELECT c.jogador_id, j.nome, j.foto_url,
                   p.preco, p.media_pontos
            FROM cartolendas_capitao c
            JOIN cartolendas_times t ON t.id = c.cartolendas_time_id
            JOIN jogadores j ON j.id = c.jogador_id
            LEFT JOIN cartolendas_precos p ON p.jogador_id = c.jogador_id AND p.rodada_id = ?
            WHERE t.usuario_id = ? AND c.rodada_id = ?
        ");
        $st->execute([$precoRodadaId, $userId, $rodadaId]);
        $this->json($st->fetch(PDO::FETCH_ASSOC) ?: null);
    }

    // ──────────────────────────────────────────────────────────
    // TRANSFERÊNCIAS
    // ──────────────────────────────────────────────────────────

    // POST /cartolendas/transferencias
    public function transferir(): void {
        $userId        = $this->userId();
        $body          = $this->body();
        $saiId         = (int)($body['jogador_sai_id']   ?? 0);
        $entraId       = (int)($body['jogador_entra_id'] ?? 0);
        $rodadaId      = (int)($body['rodada_id']        ?? 0);

        if (!$saiId || !$entraId || !$rodadaId) { $this->error('Dados incompletos'); return; }
        if ($saiId === $entraId) { $this->error('Jogadores iguais'); return; }

        // Verifica janela aberta
        if (!$this->rodadaAbertaParaTransferencia($rodadaId)) {
            $this->error('Janela de transferência fechada. O check-in da rodada já foi feito.'); return;
        }

        // Saldo do usuário
        $saldo = $this->getSaldoUsuario($userId);
        if ($saldo < self::CUSTO_TRANSFERENCIA) {
            $this->error("Saldo insuficiente. Transferência custa " . self::CUSTO_TRANSFERENCIA . " coins."); return;
        }

        // Verifica se jogador que sai está no time
        $stEsc = $this->pdo->prepare("
            SELECT e.id, e.eh_reserva, e.posicao
            FROM cartolendas_escalacao e
            JOIN cartolendas_times t ON t.id = e.cartolendas_time_id
            WHERE t.usuario_id = ? AND t.rodada_id = ? AND e.jogador_id = ?
        ");
        $stEsc->execute([$userId, $rodadaId, $saiId]);
        $escalacao = $stEsc->fetch(PDO::FETCH_ASSOC);
        if (!$escalacao) { $this->error('Jogador a sair não está no seu time.'); return; }

        // Verifica se jogador que entra não está no time
        $stJaEsc = $this->pdo->prepare("
            SELECT e.id FROM cartolendas_escalacao e
            JOIN cartolendas_times t ON t.id = e.cartolendas_time_id
            WHERE t.usuario_id = ? AND t.rodada_id = ? AND e.jogador_id = ?
        ");
        $stJaEsc->execute([$userId, $rodadaId, $entraId]);
        if ($stJaEsc->fetch()) { $this->error('Jogador que entra já está no seu time.'); return; }

        // Verifica compatibilidade de posição
        $stJog = $this->pdo->prepare("SELECT posicao FROM jogadores WHERE id = ?");
        $stJog->execute([$entraId]);
        $jogEntra = $stJog->fetch(PDO::FETCH_ASSOC);
        if (!$jogEntra) { $this->error('Jogador não encontrado.'); return; }

        $posicaoEscalacao = $escalacao['posicao']; // goleiro ou linha
        $posicaoJogEntra  = $jogEntra['posicao'] === 'goleiro' ? 'goleiro' : 'linha';
        if ($posicaoEscalacao !== $posicaoJogEntra) {
            $this->error("Posição incompatível: seu slot é {$posicaoEscalacao}."); return;
        }

        // Busca preços (da última rodada finalizada)
        $ufRow = $this->pdo->query("
            SELECT id FROM rodadas WHERE status = 'finalizada' ORDER BY data DESC, id DESC LIMIT 1
        ")->fetch(PDO::FETCH_ASSOC);
        $precoRodadaId = $ufRow ? (int)$ufRow['id'] : $rodadaId;

        $stPreco = $this->pdo->prepare("SELECT preco FROM cartolendas_precos WHERE jogador_id = ? AND rodada_id = ?");
        $stPreco->execute([$saiId, $precoRodadaId]);
        $precoSai = (float)($stPreco->fetchColumn() ?: 10.00);
        $stPreco->execute([$entraId, $precoRodadaId]);
        $precoEntra = (float)($stPreco->fetchColumn() ?: 10.00);

        // Verifica orçamento: paga a diferença se o que entra for mais caro + custo de transferência
        $diferenca = $precoEntra - $precoSai;
        $custoTotal = self::CUSTO_TRANSFERENCIA + max(0, $diferenca);
        if ($saldo < $custoTotal) {
            $this->error("Saldo insuficiente. Precisa de {$custoTotal} coins (diferença de preço + custo de transferência)."); return;
        }

        $this->pdo->beginTransaction();
        try {
            // Atualiza escalação
            $stUpdate = $this->pdo->prepare("
                UPDATE cartolendas_escalacao e
                JOIN cartolendas_times t ON t.id = e.cartolendas_time_id
                SET e.jogador_id = ?, e.preco_na_escalacao = ?
                WHERE t.usuario_id = ? AND t.rodada_id = ? AND e.jogador_id = ?
            ");
            $stUpdate->execute([$entraId, $precoEntra, $userId, $rodadaId, $saiId]);

            // Registra transferência
            $novoSaldo = $saldo - $custoTotal + max(0, -$diferenca);
            $stTrans = $this->pdo->prepare("
                INSERT INTO cartolendas_transferencias
                    (usuario_id, rodada_id, jogador_saiu_id, jogador_entrou_id,
                     preco_saiu, preco_entrou, custo_coins, saldo_anterior, saldo_posterior)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            $stTrans->execute([$userId, $rodadaId, $saiId, $entraId,
                $precoSai, $precoEntra, $custoTotal, $saldo, $novoSaldo]);

            // Atualiza saldo
            $this->setSaldoUsuario($userId, $novoSaldo);

            // Se era capitão, remove capitania
            $this->pdo->prepare("
                DELETE c FROM cartolendas_capitao c
                JOIN cartolendas_times t ON t.id = c.cartolendas_time_id
                WHERE t.usuario_id = ? AND c.rodada_id = ? AND c.jogador_id = ?
            ")->execute([$userId, $rodadaId, $saiId]);

            $this->pdo->commit();

            CartolendaEventos::fire('transferencia', [
                'usuario_id'  => $userId,
                'rodada_id'   => $rodadaId,
            ]);

            $this->json([
                'message'       => 'Transferência realizada!',
                'novo_saldo'    => $novoSaldo,
                'custo_total'   => $custoTotal,
            ]);
        } catch (\Throwable $e) {
            $this->pdo->rollBack();
            $this->error('Erro ao processar transferência: ' . $e->getMessage(), 500);
        }
    }

    // GET /cartolendas/transferencias/:rodadaId
    public function historicoTransferencias(int $rodadaId): void {
        $userId = $this->userId();
        $st = $this->pdo->prepare("
            SELECT t.*,
                   js.nome     AS jogador_saiu_nome,   js.foto_url AS saiu_foto,
                   je.nome     AS jogador_entrou_nome, je.foto_url AS entrou_foto
            FROM cartolendas_transferencias t
            JOIN jogadores js ON js.id = t.jogador_saiu_id
            JOIN jogadores je ON je.id = t.jogador_entrou_id
            WHERE t.usuario_id = ? AND t.rodada_id = ?
            ORDER BY t.created_at DESC
        ");
        $st->execute([$userId, $rodadaId]);
        $this->json($st->fetchAll(PDO::FETCH_ASSOC));
    }

    // ──────────────────────────────────────────────────────────
    // CHAT DA LIGA
    // ──────────────────────────────────────────────────────────

    // GET /cartolendas/ligas/:id/chat
    public function getChat(int $ligaId): void {
        $userId = $this->userId();

        // Só membros
        $stMembro = $this->pdo->prepare("SELECT id FROM cartolendas_liga_membros WHERE liga_id = ? AND usuario_id = ?");
        $stMembro->execute([$ligaId, $userId]);
        if (!$stMembro->fetch()) { $this->error('Você não é membro desta liga.', 403); return; }

        $st = $this->pdo->prepare("
            SELECT c.id, c.mensagem, c.created_at,
                   u.username,
                   j.nome AS jogador_nome, j.foto_url, j.avatar_url
            FROM cartolendas_chat c
            JOIN usuarios u ON u.id = c.usuario_id
            LEFT JOIN jogadores j ON j.usuario_id = u.id
            WHERE c.liga_id = ?
            ORDER BY c.created_at DESC
            LIMIT 100
        ");
        $st->execute([$ligaId]);
        $this->json(array_reverse($st->fetchAll(PDO::FETCH_ASSOC)));
    }

    // POST /cartolendas/ligas/:id/chat
    public function enviarMensagem(int $ligaId): void {
        $userId    = $this->userId();
        $body      = $this->body();
        $mensagem  = trim($body['mensagem'] ?? '');

        if (!$mensagem) { $this->error('Mensagem vazia'); return; }
        if (mb_strlen($mensagem) > 500) { $this->error('Mensagem muito longa (máx 500 caracteres)'); return; }

        // Só membros
        $stMembro = $this->pdo->prepare("SELECT id FROM cartolendas_liga_membros WHERE liga_id = ? AND usuario_id = ?");
        $stMembro->execute([$ligaId, $userId]);
        if (!$stMembro->fetch()) { $this->error('Você não é membro desta liga.', 403); return; }

        $st = $this->pdo->prepare("INSERT INTO cartolendas_chat (liga_id, usuario_id, mensagem) VALUES (?, ?, ?)");
        $st->execute([$ligaId, $userId, $mensagem]);

        $this->json(['message' => 'Mensagem enviada!', 'id' => (int)$this->pdo->lastInsertId()], 201);
    }

    // ──────────────────────────────────────────────────────────
    // DRAFT
    // ──────────────────────────────────────────────────────────

    // GET /cartolendas/ligas/:id/draft
    public function getDraft(int $ligaId): void {
        $st = $this->pdo->prepare("
            SELECT d.*, j.nome, j.foto_url, j.posicao,
                   u.username, j.avatar_url AS user_avatar
            FROM cartolendas_draft d
            JOIN jogadores j ON j.id = d.jogador_id
            JOIN usuarios  u ON u.id = d.usuario_id
            WHERE d.liga_id = ?
            ORDER BY d.ordem_pick ASC
        ");
        $st->execute([$ligaId]);
        $this->json($st->fetchAll(PDO::FETCH_ASSOC));
    }

    // POST /cartolendas/ligas/:id/draft
    public function fazerPick(int $ligaId): void {
        $userId    = $this->userId();
        $body      = $this->body();
        $jogadorId = (int)($body['jogador_id'] ?? 0);
        $rodadaRef = (int)($body['rodada_ref'] ?? 0);

        if (!$jogadorId || !$rodadaRef) { $this->error('Dados incompletos'); return; }

        // Verifica membro
        $stM = $this->pdo->prepare("SELECT id FROM cartolendas_liga_membros WHERE liga_id = ? AND usuario_id = ?");
        $stM->execute([$ligaId, $userId]);
        if (!$stM->fetch()) { $this->error('Não é membro desta liga', 403); return; }

        // Verifica se jogador já foi draftado nesta liga
        $stD = $this->pdo->prepare("SELECT id FROM cartolendas_draft WHERE liga_id = ? AND jogador_id = ?");
        $stD->execute([$ligaId, $jogadorId]);
        if ($stD->fetch()) { $this->error('Jogador já draftado nesta liga'); return; }

        // Próximo número de pick
        $ordem = (int)$this->pdo->query("SELECT COUNT(*) FROM cartolendas_draft WHERE liga_id = $ligaId")->fetchColumn() + 1;

        $st = $this->pdo->prepare("
            INSERT INTO cartolendas_draft (liga_id, usuario_id, jogador_id, ordem_pick, rodada_ref)
            VALUES (?, ?, ?, ?, ?)
        ");
        $st->execute([$ligaId, $userId, $jogadorId, $ordem, $rodadaRef]);
        $this->json(['message' => 'Pick realizado!', 'ordem' => $ordem], 201);
    }

    // ──────────────────────────────────────────────────────────
    // MERCADO — Jogadores disponíveis para escalar
    // ──────────────────────────────────────────────────────────

    // GET /cartolendas/mercado/:rodadaId?campeonato_id=X
    public function mercado(int $rodadaId): void {
        $campeonatoId = (int)($_GET['campeonato_id'] ?? 0);

        // Busca a última rodada finalizada DO MESMO CAMPEONATO para preços atualizados
        // Se a rodada pedida já está finalizada e tem preços, usa ela mesma
        $precoRodadaId = $rodadaId;

        // Verifica se a rodada pedida tem preços
        $temPrecos = $this->pdo->prepare("
            SELECT COUNT(*) FROM cartolendas_precos WHERE rodada_id = ?
        ");
        $temPrecos->execute([$rodadaId]);

        if ((int)$temPrecos->fetchColumn() === 0) {
            // Rodada pedida não tem preços — busca última finalizada do campeonato
            $rodadaInfo = $this->pdo->prepare("SELECT campeonato_id FROM rodadas WHERE id = ?");
            $rodadaInfo->execute([$rodadaId]);
            $rodInfo = $rodadaInfo->fetch(PDO::FETCH_ASSOC);
            $campId = $rodInfo ? (int)$rodInfo['campeonato_id'] : $campeonatoId;

            if ($campId > 0) {
                $ultimaFinalizada = $this->pdo->prepare("
                    SELECT id FROM rodadas
                    WHERE campeonato_id = ? AND status = 'finalizada'
                    ORDER BY data DESC, id DESC LIMIT 1
                ");
                $ultimaFinalizada->execute([$campId]);
            } else {
                $ultimaFinalizada = $this->pdo->prepare("
                    SELECT id FROM rodadas
                    WHERE status = 'finalizada'
                    ORDER BY data DESC, id DESC LIMIT 1
                ");
                $ultimaFinalizada->execute();
            }
            $ufRow = $ultimaFinalizada->fetch(PDO::FETCH_ASSOC);
            if ($ufRow) $precoRodadaId = (int)$ufRow['id'];
        }

        if ($campeonatoId > 0) {
            // Filtra jogadores inscritos no campeonato + TODOS os goleiros
            $st = $this->pdo->prepare("
                SELECT j.id, j.nome, j.foto_url, j.avatar_url, j.posicao, j.usuario_id,
                       COALESCE(p.preco, 10.00)       AS preco,
                       COALESCE(p.media_pontos, 0)     AS media_pontos,
                       COALESCE(p.variacao, 0)          AS variacao
                FROM jogadores j
                LEFT JOIN cartolendas_precos p ON p.jogador_id = j.id AND p.rodada_id = ?
                WHERE j.id IN (
                    SELECT ce.jogador_id FROM campeonato_elencos ce WHERE ce.campeonato_id = ?
                    UNION
                    SELECT g.id FROM jogadores g WHERE g.posicao = 'goleiro'
                )
                ORDER BY j.nome ASC
            ");
            $st->execute([$precoRodadaId, $campeonatoId]);
        } else {
            // Fallback: todos os jogadores
            $st = $this->pdo->prepare("
                SELECT j.id, j.nome, j.foto_url, j.avatar_url, j.posicao, j.usuario_id,
                       COALESCE(p.preco, 10.00)       AS preco,
                       COALESCE(p.media_pontos, 0)     AS media_pontos,
                       COALESCE(p.variacao, 0)          AS variacao
                FROM jogadores j
                LEFT JOIN cartolendas_precos p ON p.jogador_id = j.id AND p.rodada_id = ?
                ORDER BY j.nome ASC
            ");
            $st->execute([$precoRodadaId]);
        }
        $this->json($st->fetchAll(PDO::FETCH_ASSOC));
    }

    // ──────────────────────────────────────────────────────────
    // MEU TIME — Escalação do usuário para a rodada
    // ──────────────────────────────────────────────────────────

    // GET /cartolendas/meu-time/:rodadaId
    public function meuTime(int $rodadaId): void {
        $userId = $this->userId();

        // Busca última rodada finalizada do MESMO CAMPEONATO para preços atualizados
        $rodadaCampRow = $this->pdo->prepare("SELECT campeonato_id FROM rodadas WHERE id = ?");
        $rodadaCampRow->execute([$rodadaId]);
        $campRow = $rodadaCampRow->fetch(PDO::FETCH_ASSOC);
        $campIdMeuTime = $campRow ? (int)$campRow['campeonato_id'] : 0;

        if ($campIdMeuTime > 0) {
            $ufSt = $this->pdo->prepare("
                SELECT id FROM rodadas WHERE campeonato_id = ? AND status = 'finalizada' ORDER BY data DESC, id DESC LIMIT 1
            ");
            $ufSt->execute([$campIdMeuTime]);
            $ufRow = $ufSt->fetch(PDO::FETCH_ASSOC);
        } else {
            $ufRow = $this->pdo->query("
                SELECT id FROM rodadas WHERE status = 'finalizada' ORDER BY data DESC, id DESC LIMIT 1
            ")->fetch(PDO::FETCH_ASSOC);
        }
        $precoRodadaId = $ufRow ? (int)$ufRow['id'] : $rodadaId;

        // Verba dinâmica do técnico (sobe/desce com valorização)
        $verbaTecnico = $this->getSaldoUsuario($userId);

        // Busca o time do usuário para a rodada
        $stTime = $this->pdo->prepare("
            SELECT id, orcamento_gasto, total_pontos, calculado
            FROM cartolendas_times
            WHERE usuario_id = ? AND rodada_id = ?
        ");
        $stTime->execute([$userId, $rodadaId]);
        $time = $stTime->fetch(PDO::FETCH_ASSOC);

        if (!$time) {
            $this->json([
                'escalacao'       => [],
                'capitao_id'      => null,
                'orcamento_gasto' => 0,
                'total_pontos'    => 0,
                'verba_tecnico'   => $verbaTecnico,
            ]);
            return;
        }

        // Busca escalação com dados do jogador e preço da última rodada finalizada
        $stEsc = $this->pdo->prepare("
            SELECT e.jogador_id, e.eh_reserva, e.posicao, e.preco_na_escalacao,
                   e.pontos_obtidos,
                   COALESCE(e.preco_apos_rodada, e.preco_na_escalacao) AS preco_apos_rodada,
                   j.nome, j.foto_url, j.avatar_url, j.posicao AS posicao_real,
                   COALESCE(p.preco, 10.00) AS preco_atual,
                   COALESCE(p.media_pontos, 0) AS media_pontos,
                   COALESCE(p.variacao, 0) AS variacao
            FROM cartolendas_escalacao e
            JOIN jogadores j ON j.id = e.jogador_id
            LEFT JOIN cartolendas_precos p ON p.jogador_id = e.jogador_id AND p.rodada_id = ?
            WHERE e.cartolendas_time_id = ?
            ORDER BY e.eh_reserva ASC, e.posicao ASC
        ");
        $stEsc->execute([$precoRodadaId, $time['id']]);

        // Busca capitão
        $stCap = $this->pdo->prepare("
            SELECT jogador_id FROM cartolendas_capitao
            WHERE cartolendas_time_id = ? AND rodada_id = ?
        ");
        $stCap->execute([$time['id'], $rodadaId]);
        $capRow = $stCap->fetch(PDO::FETCH_ASSOC);

        $this->json([
            'escalacao'       => $stEsc->fetchAll(PDO::FETCH_ASSOC),
            'capitao_id'      => $capRow ? (int)$capRow['jogador_id'] : null,
            'orcamento_gasto' => (float)$time['orcamento_gasto'],
            'total_pontos'    => (float)$time['total_pontos'],
            'calculado'       => (int)$time['calculado'],
            'verba_tecnico'   => $verbaTecnico,
        ]);
    }

    // ──────────────────────────────────────────────────────────
    // ESCALAR — Salvar/atualizar escalação
    // ──────────────────────────────────────────────────────────

    // POST /cartolendas/escalar
    public function escalar(): void {
        $userId = $this->userId();
        $body   = $this->body();

        $rodadaId  = (int)($body['rodada_id'] ?? 0);
        $jogadores = $body['jogadores'] ?? [];

        if (!$rodadaId)   { $this->error('rodada_id obrigatório'); return; }
        if (!is_array($jogadores) || count($jogadores) === 0) {
            $this->error('Lista de jogadores obrigatória'); return;
        }

        // Verifica janela aberta
        if (!$this->rodadaAbertaParaTransferencia($rodadaId)) {
            $this->error('Janela de escalação fechada. A rodada já está em andamento.'); return;
        }

        // Validar composição: 1 goleiro + 6 linha (titulares) + 1 reserva = 8 jogadores
        $titulares = array_values(array_filter($jogadores, fn($j) => empty($j['eh_reserva'])));
        $reservas  = array_values(array_filter($jogadores, fn($j) => !empty($j['eh_reserva'])));

        if (count($jogadores) > 8) { $this->error('Máximo 8 jogadores (7 titulares + 1 reserva)'); return; }
        if (count($titulares) !== 7) { $this->error('São necessários exatamente 7 titulares (1 goleiro + 6 linha)'); return; }
        if (count($reservas) > 1) { $this->error('Máximo 1 reserva'); return; }

        // Buscar posições dos jogadores
        $ids = array_map(fn($j) => (int)$j['jogador_id'], $jogadores);
        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        $stJog = $this->pdo->prepare("SELECT id, posicao FROM jogadores WHERE id IN ($placeholders)");
        $stJog->execute($ids);
        $posicoes = [];
        while ($row = $stJog->fetch(PDO::FETCH_ASSOC)) {
            $posicoes[(int)$row['id']] = $row['posicao'];
        }

        // Contar goleiros entre titulares: exatamente 1 goleiro + 6 linha
        $goleirosCount = 0;
        $linhaCount    = 0;
        foreach ($titulares as $j) {
            $jid = (int)$j['jogador_id'];
            if (!isset($posicoes[$jid])) { $this->error("Jogador $jid não encontrado"); return; }
            if ($posicoes[$jid] === 'goleiro') $goleirosCount++;
            else $linhaCount++;
        }

        if ($goleirosCount !== 1) { $this->error('Precisa de exatamente 1 goleiro titular'); return; }
        if ($linhaCount !== 6)    { $this->error('Precisa de exatamente 6 jogadores de linha titulares'); return; }

        // Validar orçamento (usa preço da última rodada finalizada)
        $ufRow = $this->pdo->query("
            SELECT id FROM rodadas WHERE status = 'finalizada' ORDER BY data DESC, id DESC LIMIT 1
        ")->fetch(PDO::FETCH_ASSOC);
        $precoRodadaId = $ufRow ? (int)$ufRow['id'] : $rodadaId;

        $stPreco = $this->pdo->prepare("
            SELECT jogador_id, COALESCE(preco, 10.00) AS preco
            FROM cartolendas_precos WHERE jogador_id IN ($placeholders) AND rodada_id = ?
        ");
        $stPreco->execute([...$ids, $precoRodadaId]);
        $precosMap = [];
        while ($row = $stPreco->fetch(PDO::FETCH_ASSOC)) {
            $precosMap[(int)$row['jogador_id']] = (float)$row['preco'];
        }

        $orcamentoTotal = 0;
        foreach ($jogadores as $j) {
            $jid = (int)$j['jogador_id'];
            $orcamentoTotal += $precosMap[$jid] ?? 10.00;
        }

        // Verba dinâmica: começa em 100 LC, sobe/desce com valorização dos jogadores
        $verbaTecnico = $this->getSaldoUsuario($userId);

        if ($orcamentoTotal > $verbaTecnico) {
            $this->error("Orçamento excedido: " . number_format($orcamentoTotal, 2) . "/" . number_format($verbaTecnico, 2) . " Lendas Coins"); return;
        }

        // Validar auto-escalação obrigatória: o usuário deve estar no próprio time
        $stJogUsuario = $this->pdo->prepare("SELECT id FROM jogadores WHERE usuario_id = ? LIMIT 1");
        $stJogUsuario->execute([$userId]);
        $jogadorDoUsuario = $stJogUsuario->fetchColumn();
        if ($jogadorDoUsuario && !in_array((int)$jogadorDoUsuario, $ids)) {
            $this->error('Você deve escalar a si mesmo no time!'); return;
        }

        // Transaction: criar/atualizar time + escalação
        $this->pdo->beginTransaction();
        try {
            // Upsert cartolendas_times
            $stUpsert = $this->pdo->prepare("
                INSERT INTO cartolendas_times (usuario_id, rodada_id, orcamento_gasto)
                VALUES (?, ?, ?)
                ON DUPLICATE KEY UPDATE orcamento_gasto = VALUES(orcamento_gasto)
            ");
            $stUpsert->execute([$userId, $rodadaId, $orcamentoTotal]);

            // Buscar time_id
            $stTimeId = $this->pdo->prepare("SELECT id FROM cartolendas_times WHERE usuario_id = ? AND rodada_id = ?");
            $stTimeId->execute([$userId, $rodadaId]);
            $timeId = (int)$stTimeId->fetchColumn();

            // Limpa escalação antiga
            $this->pdo->prepare("DELETE FROM cartolendas_escalacao WHERE cartolendas_time_id = ?")
                      ->execute([$timeId]);

            // Insere nova escalação
            $stIns = $this->pdo->prepare("
                INSERT INTO cartolendas_escalacao
                    (cartolendas_time_id, jogador_id, eh_reserva, posicao, preco_na_escalacao)
                VALUES (?, ?, ?, ?, ?)
            ");

            foreach ($jogadores as $j) {
                $jid       = (int)$j['jogador_id'];
                $ehReserva = !empty($j['eh_reserva']) ? 1 : 0;
                $posicao   = ($posicoes[$jid] === 'goleiro') ? 'goleiro' : 'linha';
                $preco     = $precosMap[$jid] ?? 10.00;
                $stIns->execute([$timeId, $jid, $ehReserva, $posicao, $preco]);
            }

            // Garante registro no ranking
            $this->pdo->prepare("
                INSERT IGNORE INTO cartolendas_ranking (usuario_id, pontos_total, lendas_coins, divisao, rodadas_jogadas)
                VALUES (?, 0, 100.00, 'Bronze', 0)
            ")->execute([$userId]);

            $this->pdo->commit();

            CartolendaEventos::fire('escalacao_salva', [
                'usuario_id' => $userId,
                'rodada_id'  => $rodadaId,
            ]);

            $this->json([
                'message'         => 'Escalação salva!',
                'orcamento_gasto' => $orcamentoTotal,
                'jogadores'       => count($jogadores),
                'verba_tecnico'   => $verbaTecnico,
            ], 201);
        } catch (\Throwable $e) {
            $this->pdo->rollBack();
            $this->error('Erro ao salvar escalação: ' . $e->getMessage(), 500);
        }
    }

    // ──────────────────────────────────────────────────────────
    // RANKING GLOBAL
    // ──────────────────────────────────────────────────────────

    // GET /cartolendas/ranking
    public function ranking(): void {
        $st = $this->pdo->query("
            SELECT r.usuario_id, r.pontos_total, r.lendas_coins, r.divisao,
                   r.rodadas_jogadas, r.melhor_rodada_pts,
                   COALESCE(r.patrimonio, 0) AS patrimonio,
                   u.username,
                   j.nome AS jogador_nome, j.foto_url, j.avatar_url,
                   ROW_NUMBER() OVER (ORDER BY r.pontos_total DESC) AS posicao
            FROM cartolendas_ranking r
            JOIN usuarios u ON u.id = r.usuario_id
            LEFT JOIN jogadores j ON j.usuario_id = u.id
            ORDER BY r.pontos_total DESC
        ");
        $this->json($st->fetchAll(PDO::FETCH_ASSOC));
    }

    // ──────────────────────────────────────────────────────────
    // HISTÓRICO — Rodadas do usuário
    // ──────────────────────────────────────────────────────────

    // GET /cartolendas/historico
    public function historico(): void {
        $userId = $this->userId();
        $st = $this->pdo->prepare("
            SELECT t.rodada_id, t.total_pontos, t.orcamento_gasto, t.calculado,
                   COALESCE(t.patrimonio_apos, 0) AS patrimonio,
                   r.data, r.status,
                   (SELECT COUNT(*) FROM cartolendas_escalacao WHERE cartolendas_time_id = t.id) AS total_jogadores
            FROM cartolendas_times t
            JOIN rodadas r ON r.id = t.rodada_id
            WHERE t.usuario_id = ?
            ORDER BY r.data DESC
        ");
        $st->execute([$userId]);
        $this->json($st->fetchAll(PDO::FETCH_ASSOC));
    }

    // ──────────────────────────────────────────────────────────
    // STATS DA RODADA (estilo Cartola)
    // ──────────────────────────────────────────────────────────

    // GET /cartolendas/stats/rodada?rodada_id=X  (se omitido, pega última finalizada)
    public function statsRodada(): void {
        $rodadaId = (int)($_GET['rodada_id'] ?? 0);

        if (!$rodadaId) {
            $row = $this->pdo->query("SELECT id FROM rodadas WHERE status = 'finalizada' ORDER BY id DESC LIMIT 1")->fetch(PDO::FETCH_ASSOC);
            $rodadaId = $row ? (int)$row['id'] : 0;
        }

        if (!$rodadaId) { $this->json(['rodada_id' => 0, 'sem_dados' => true]); return; }

        // Info da rodada
        $rodadaInfo = $this->pdo->prepare("SELECT id, data, status FROM rodadas WHERE id = ?");
        $rodadaInfo->execute([$rodadaId]);
        $rodada = $rodadaInfo->fetch(PDO::FETCH_ASSOC);

        // ── Jogador mais escalado da rodada ──
        $maisEscalado = $this->pdo->prepare("
            SELECT j.id, j.nome, j.foto_url, j.avatar_url, j.posicao,
                   COUNT(*) AS total_escalacoes
            FROM cartolendas_escalacao e
            JOIN cartolendas_times t ON t.id = e.cartolendas_time_id
            JOIN jogadores j ON j.id = e.jogador_id
            WHERE t.rodada_id = ? AND e.eh_reserva = 0
            GROUP BY j.id
            ORDER BY total_escalacoes DESC
            LIMIT 5
        ");
        $maisEscalado->execute([$rodadaId]);

        // ── Melhor pontuação da rodada (jogador) — baseado em PERFORMANCE REAL ──
        // Usa cartolendas_precos que agora calcula pontos reais das partidas
        $melhorPontuacao = $this->pdo->prepare("
            SELECT j.id, j.nome, j.foto_url, j.avatar_url, j.posicao,
                   cp.pontos_rodada AS pontos
            FROM cartolendas_precos cp
            JOIN jogadores j ON j.id = cp.jogador_id
            WHERE cp.rodada_id = ? AND cp.pontos_rodada > 0
            ORDER BY cp.pontos_rodada DESC
            LIMIT 5
        ");
        $melhorPontuacao->execute([$rodadaId]);

        // ── Pior pontuação da rodada (jogador) — só quem jogou ──
        $piorPontuacao = $this->pdo->prepare("
            SELECT j.id, j.nome, j.foto_url, j.avatar_url, j.posicao,
                   cp.pontos_rodada AS pontos
            FROM cartolendas_precos cp
            JOIN jogadores j ON j.id = cp.jogador_id
            WHERE cp.rodada_id = ? AND cp.pontos_rodada > 0
            ORDER BY cp.pontos_rodada ASC
            LIMIT 5
        ");
        $piorPontuacao->execute([$rodadaId]);

        // ── Melhor time da rodada (usuário) ──
        $melhorTime = $this->pdo->prepare("
            SELECT t.id, t.total_pontos, t.usuario_id,
                   u.username, j.nome AS jogador_nome, j.foto_url, j.avatar_url
            FROM cartolendas_times t
            JOIN usuarios u ON u.id = t.usuario_id
            LEFT JOIN jogadores j ON j.usuario_id = t.usuario_id
            WHERE t.rodada_id = ? AND t.calculado = 1
            ORDER BY t.total_pontos DESC
            LIMIT 5
        ");
        $melhorTime->execute([$rodadaId]);

        // ── Capitão mais escolhido ──
        $capitaoPopular = $this->pdo->prepare("
            SELECT j.id, j.nome, j.foto_url, j.avatar_url, j.posicao,
                   COUNT(*) AS total_capitanias
            FROM cartolendas_capitao c
            JOIN jogadores j ON j.id = c.jogador_id
            WHERE c.rodada_id = ?
            GROUP BY j.id
            ORDER BY total_capitanias DESC
            LIMIT 3
        ");
        $capitaoPopular->execute([$rodadaId]);

        // ── Média de pontos da rodada ──
        $mediaRodada = $this->pdo->prepare("
            SELECT ROUND(AVG(total_pontos), 2) AS media_pontos,
                   COUNT(*) AS total_times,
                   ROUND(MAX(total_pontos), 2) AS maior_pontuacao,
                   ROUND(MIN(total_pontos), 2) AS menor_pontuacao
            FROM cartolendas_times
            WHERE rodada_id = ? AND calculado = 1
        ");
        $mediaRodada->execute([$rodadaId]);

        // ── Rodadas finalizadas (para seletor) ──
        $rodadasFinalizadas = $this->pdo->query("
            SELECT id, data FROM rodadas
            WHERE status = 'finalizada'
            ORDER BY id DESC LIMIT 20
        ")->fetchAll(PDO::FETCH_ASSOC);

        $this->json([
            'rodada_id'           => $rodadaId,
            'rodada'              => $rodada,
            'rodadas_disponiveis' => $rodadasFinalizadas,
            'mais_escalados'      => $maisEscalado->fetchAll(PDO::FETCH_ASSOC),
            'melhores_jogadores'  => $melhorPontuacao->fetchAll(PDO::FETCH_ASSOC),
            'piores_jogadores'    => $piorPontuacao->fetchAll(PDO::FETCH_ASSOC),
            'melhores_times'      => $melhorTime->fetchAll(PDO::FETCH_ASSOC),
            'capitao_popular'     => $capitaoPopular->fetchAll(PDO::FETCH_ASSOC),
            'resumo'              => $mediaRodada->fetch(PDO::FETCH_ASSOC),
        ]);
    }

    // ──────────────────────────────────────────────────────────
    // STATS DO MERCADO
    // ──────────────────────────────────────────────────────────

    // GET /cartolendas/stats/mercado?campeonato_id=X
    public function statsMercado(): void {
        $campeonatoId = (int)($_GET['campeonato_id'] ?? 0);

        // Busca a última rodada finalizada para pegar dados de preço
        $ultimaRodada = $this->pdo->query("
            SELECT id FROM rodadas
            WHERE status = 'finalizada'
            ORDER BY id DESC LIMIT 1
        ")->fetch(PDO::FETCH_ASSOC);

        $rodadaId = $ultimaRodada ? (int)$ultimaRodada['id'] : 0;

        // Filtro de jogadores inscritos no campeonato (se informado)
        $inscritoFilter = '';
        $paramsBase = [$rodadaId];
        if ($campeonatoId > 0) {
            $inscritoFilter = ' AND p.jogador_id IN (SELECT ce.jogador_id FROM campeonato_elencos ce WHERE ce.campeonato_id = ?)';
            $paramsBase[] = $campeonatoId;
        }

        // Jogador mais caro
        $maisCaro = $this->pdo->prepare("
            SELECT j.id, j.nome, j.foto_url, j.posicao, p.preco, p.media_pontos, p.variacao
            FROM cartolendas_precos p
            JOIN jogadores j ON j.id = p.jogador_id
            WHERE p.rodada_id = ? {$inscritoFilter}
            ORDER BY p.preco DESC LIMIT 1
        ");
        $maisCaro->execute($paramsBase);

        // Jogador mais barato
        $maisBarato = $this->pdo->prepare("
            SELECT j.id, j.nome, j.foto_url, j.posicao, p.preco, p.media_pontos, p.variacao
            FROM cartolendas_precos p
            JOIN jogadores j ON j.id = p.jogador_id
            WHERE p.rodada_id = ? {$inscritoFilter}
            ORDER BY p.preco ASC LIMIT 1
        ");
        $maisBarato->execute($paramsBase);

        // Maior valorização da última rodada
        $maiorAlta = $this->pdo->prepare("
            SELECT j.id, j.nome, j.foto_url, j.posicao, p.preco, p.variacao, p.media_pontos
            FROM cartolendas_precos p
            JOIN jogadores j ON j.id = p.jogador_id
            WHERE p.rodada_id = ? {$inscritoFilter}
            ORDER BY p.variacao DESC LIMIT 3
        ");
        $maiorAlta->execute($paramsBase);

        // Maior desvalorização da última rodada
        $maiorQueda = $this->pdo->prepare("
            SELECT j.id, j.nome, j.foto_url, j.posicao, p.preco, p.variacao, p.media_pontos
            FROM cartolendas_precos p
            JOIN jogadores j ON j.id = p.jogador_id
            WHERE p.rodada_id = ? {$inscritoFilter}
            ORDER BY p.variacao ASC LIMIT 3
        ");
        $maiorQueda->execute($paramsBase);

        // Estatísticas gerais
        $stats = $this->pdo->prepare("
            SELECT COUNT(*) AS total_jogadores,
                   ROUND(AVG(preco), 2) AS preco_medio,
                   ROUND(MAX(preco), 2) AS preco_maximo,
                   ROUND(MIN(preco), 2) AS preco_minimo
            FROM cartolendas_precos p
            WHERE p.rodada_id = ? {$inscritoFilter}
        ");
        $stats->execute($paramsBase);

        $this->json([
            'rodada_referencia' => $rodadaId,
            'mais_caro'         => $maisCaro->fetch(PDO::FETCH_ASSOC) ?: null,
            'mais_barato'       => $maisBarato->fetch(PDO::FETCH_ASSOC) ?: null,
            'maiores_altas'     => $maiorAlta->fetchAll(PDO::FETCH_ASSOC),
            'maiores_quedas'    => $maiorQueda->fetchAll(PDO::FETCH_ASSOC),
            'estatisticas'      => $stats->fetch(PDO::FETCH_ASSOC) ?: null,
        ]);
    }

    // ──────────────────────────────────────────────────────────
    // HISTÓRICO DE JOGADORES (evolução de preço/pontos)
    // GET /cartolendas/historico-jogadores?campeonato_id=X
    // ──────────────────────────────────────────────────────────

    public function historicoJogadores(): void {
        $campId = (int)($_GET['campeonato_id'] ?? 0);
        if (!$campId) { $this->error('campeonato_id obrigatório'); return; }

        // Busca rodadas finalizadas do campeonato
        $rodadas = $this->pdo->prepare("
            SELECT id, data, status
            FROM rodadas
            WHERE campeonato_id = ? AND status = 'finalizada'
            ORDER BY data ASC, id ASC
        ");
        $rodadas->execute([$campId]);
        $rodadasList = $rodadas->fetchAll(PDO::FETCH_ASSOC);

        if (empty($rodadasList)) {
            $this->json(['rodadas' => [], 'jogadores' => []]);
            return;
        }

        $rodadaIds = array_column($rodadasList, 'id');
        $placeholders = implode(',', array_fill(0, count($rodadaIds), '?'));

        // Busca todos os preços históricos de todas as rodadas
        $st = $this->pdo->prepare("
            SELECT p.jogador_id, p.rodada_id, p.preco, p.variacao, p.pontos_rodada, p.media_pontos,
                   j.nome, j.foto_url, j.avatar_url, j.posicao
            FROM cartolendas_precos p
            JOIN jogadores j ON j.id = p.jogador_id
            WHERE p.rodada_id IN ($placeholders)
            ORDER BY p.jogador_id ASC, p.rodada_id ASC
        ");
        $st->execute($rodadaIds);
        $rows = $st->fetchAll(PDO::FETCH_ASSOC);

        // Busca gols e assistências por jogador por rodada (da tabela de estatísticas do campeonato)
        $stStats = $this->pdo->prepare("
            SELECT ep.jogador_id,
                   cp.rodada_id,
                   SUM(ep.gols) AS gols,
                   SUM(ep.assistencias) AS assistencias
            FROM campeonato_estatisticas_partida ep
            JOIN campeonato_partidas cp ON cp.id = ep.partida_id
            WHERE cp.campeonato_id = ? AND cp.rodada_id IN ($placeholders)
            GROUP BY ep.jogador_id, cp.rodada_id
        ");
        $stStats->execute(array_merge([$campId], $rodadaIds));
        $statsRows = $stStats->fetchAll(PDO::FETCH_ASSOC);

        // Mapa de stats: jogador_id -> rodada_id -> {gols, assistencias}
        $statsMap = [];
        foreach ($statsRows as $s) {
            $statsMap[(int)$s['jogador_id']][(int)$s['rodada_id']] = [
                'gols' => (int)$s['gols'],
                'assistencias' => (int)$s['assistencias'],
            ];
        }

        // Agrupa por jogador
        $jogadores = [];
        foreach ($rows as $r) {
            $jid = (int)$r['jogador_id'];
            $rid = (int)$r['rodada_id'];
            if (!isset($jogadores[$jid])) {
                $jogadores[$jid] = [
                    'id' => $jid,
                    'nome' => $r['nome'],
                    'foto_url' => $r['foto_url'],
                    'avatar_url' => $r['avatar_url'],
                    'posicao' => $r['posicao'],
                    'rodadas' => [],
                ];
            }
            $jogadores[$jid]['rodadas'][] = [
                'rodada_id'     => $rid,
                'preco'         => (float)$r['preco'],
                'variacao'      => (float)$r['variacao'],
                'pontos_rodada' => (float)$r['pontos_rodada'],
                'media_pontos'  => (float)$r['media_pontos'],
                'gols'          => $statsMap[$jid][$rid]['gols'] ?? 0,
                'assistencias'  => $statsMap[$jid][$rid]['assistencias'] ?? 0,
            ];
        }

        // Calcula resumo de cada jogador
        foreach ($jogadores as &$jog) {
            $totalPts = 0;
            $totalGols = 0;
            $totalAssist = 0;
            $count = count($jog['rodadas']);
            $precoInicial = $jog['rodadas'][0]['preco'] ?? 0;
            $precoAtual = end($jog['rodadas'])['preco'] ?? 0;
            foreach ($jog['rodadas'] as $rd) {
                $totalPts += $rd['pontos_rodada'];
                $totalGols += $rd['gols'];
                $totalAssist += $rd['assistencias'];
            }
            $jog['media_pontos'] = $count > 0 ? round($totalPts / $count, 2) : 0;
            $jog['total_pontos'] = round($totalPts, 2);
            $jog['total_gols'] = $totalGols;
            $jog['total_assistencias'] = $totalAssist;
            $jog['valorizacao_total'] = round($precoAtual - $precoInicial, 2);
            $jog['preco_atual'] = $precoAtual;
        }
        unset($jog);

        // Ordena por total_pontos desc
        $jogadoresArr = array_values($jogadores);
        usort($jogadoresArr, fn($a, $b) => $b['total_pontos'] <=> $a['total_pontos']);

        $this->json([
            'rodadas' => $rodadasList,
            'jogadores' => $jogadoresArr,
        ]);
    }

    // ──────────────────────────────────────────────────────────
    // MEU HISTÓRICO (pessoal do user logado)
    // GET /cartolendas/meu-historico?campeonato_id=X
    // ──────────────────────────────────────────────────────────

    public function meuHistorico(): void {
        $userId = $this->userId();
        $campId = (int)($_GET['campeonato_id'] ?? 0);
        if (!$campId) { $this->error('campeonato_id obrigatório'); return; }

        // Busca o jogador_id do próprio usuário
        $meuJogador = $this->pdo->prepare("SELECT id FROM jogadores WHERE usuario_id = ?");
        $meuJogador->execute([$userId]);
        $meuJogadorId = (int)($meuJogador->fetch(PDO::FETCH_ASSOC)['id'] ?? 0);

        // Rodadas finalizadas
        $rodadas = $this->pdo->prepare("
            SELECT id, data FROM rodadas
            WHERE campeonato_id = ? AND status = 'finalizada'
            ORDER BY data ASC, id ASC
        ");
        $rodadas->execute([$campId]);
        $rodadasList = $rodadas->fetchAll(PDO::FETCH_ASSOC);

        // Evolução de pontos e LendaCoins por rodada
        // Tenta com saldo_lc_apos; se coluna não existir, faz fallback sem ela
        try {
            $evolucao = $this->pdo->prepare("
                SELECT t.rodada_id, t.total_pontos, t.orcamento_gasto,
                       COALESCE(t.saldo_lc_apos, 100.0) AS saldo_lc,
                       r.data
                FROM cartolendas_times t
                JOIN rodadas r ON r.id = t.rodada_id
                WHERE t.usuario_id = ? AND r.campeonato_id = ? AND t.calculado = 1
                ORDER BY r.data ASC, r.id ASC
            ");
            $evolucao->execute([$userId, $campId]);
            $evolucaoList = $evolucao->fetchAll(PDO::FETCH_ASSOC);
        } catch (\Throwable $e) {
            // Coluna saldo_lc_apos pode não existir ainda — fallback
            $evolucao = $this->pdo->prepare("
                SELECT t.rodada_id, t.total_pontos, t.orcamento_gasto,
                       100.0 AS saldo_lc,
                       r.data
                FROM cartolendas_times t
                JOIN rodadas r ON r.id = t.rodada_id
                WHERE t.usuario_id = ? AND r.campeonato_id = ? AND t.calculado = 1
                ORDER BY r.data ASC, r.id ASC
            ");
            $evolucao->execute([$userId, $campId]);
            $evolucaoList = $evolucao->fetchAll(PDO::FETCH_ASSOC);
        }

        // Jogadores que mais escalei (excluindo eu mesmo)
        $maisEscalado = $this->pdo->prepare("
            SELECT j.id, j.nome, j.foto_url, j.avatar_url, j.posicao,
                   COUNT(*) AS vezes_escalado
            FROM cartolendas_escalacao e
            JOIN cartolendas_times t ON t.id = e.cartolendas_time_id
            JOIN jogadores j ON j.id = e.jogador_id
            JOIN rodadas r ON r.id = t.rodada_id AND r.campeonato_id = ?
            WHERE t.usuario_id = ? AND e.jogador_id != ? AND e.eh_reserva = 0
            GROUP BY j.id
            ORDER BY vezes_escalado DESC
            LIMIT 5
        ");
        $maisEscalado->execute([$campId, $userId, $meuJogadorId]);

        // Jogador que mais me rendeu pontos (excluindo eu mesmo)
        $maisRendeu = $this->pdo->prepare("
            SELECT j.id, j.nome, j.foto_url, j.avatar_url, j.posicao,
                   SUM(e.pontos_obtidos) AS total_pontos,
                   COUNT(*) AS vezes_escalado
            FROM cartolendas_escalacao e
            JOIN cartolendas_times t ON t.id = e.cartolendas_time_id
            JOIN jogadores j ON j.id = e.jogador_id
            JOIN rodadas r ON r.id = t.rodada_id AND r.campeonato_id = ?
            WHERE t.usuario_id = ? AND t.calculado = 1 AND e.jogador_id != ?
            GROUP BY j.id
            ORDER BY total_pontos DESC
            LIMIT 5
        ");
        $maisRendeu->execute([$campId, $userId, $meuJogadorId]);

        // Jogador que mais fez pontos (individualmente, no meu time)
        $maisPontuou = $this->pdo->prepare("
            SELECT j.id, j.nome, j.foto_url, j.avatar_url, j.posicao,
                   MAX(e.pontos_obtidos) AS melhor_pontuacao,
                   SUM(e.pontos_obtidos) AS total_pontos
            FROM cartolendas_escalacao e
            JOIN cartolendas_times t ON t.id = e.cartolendas_time_id
            JOIN jogadores j ON j.id = e.jogador_id
            JOIN rodadas r ON r.id = t.rodada_id AND r.campeonato_id = ?
            WHERE t.usuario_id = ? AND t.calculado = 1 AND e.jogador_id != ?
            GROUP BY j.id
            ORDER BY melhor_pontuacao DESC
            LIMIT 5
        ");
        $maisPontuou->execute([$campId, $userId, $meuJogadorId]);

        // Jogador que menos rendeu (excluindo eu)
        $menosRendeu = $this->pdo->prepare("
            SELECT j.id, j.nome, j.foto_url, j.avatar_url, j.posicao,
                   SUM(e.pontos_obtidos) AS total_pontos,
                   COUNT(*) AS vezes_escalado
            FROM cartolendas_escalacao e
            JOIN cartolendas_times t ON t.id = e.cartolendas_time_id
            JOIN jogadores j ON j.id = e.jogador_id
            JOIN rodadas r ON r.id = t.rodada_id AND r.campeonato_id = ?
            WHERE t.usuario_id = ? AND t.calculado = 1 AND e.jogador_id != ?
            GROUP BY j.id
            HAVING vezes_escalado >= 1
            ORDER BY total_pontos ASC
            LIMIT 5
        ");
        $menosRendeu->execute([$campId, $userId, $meuJogadorId]);

        // Minha valorização como jogador no Cartolendas
        $minhaValorizacao = [];
        if ($meuJogadorId) {
            $stMeuPreco = $this->pdo->prepare("
                SELECT p.rodada_id, p.preco, p.variacao, p.pontos_rodada, p.media_pontos,
                       r.data
                FROM cartolendas_precos p
                JOIN rodadas r ON r.id = p.rodada_id AND r.campeonato_id = ?
                WHERE p.jogador_id = ?
                ORDER BY r.data ASC, r.id ASC
            ");
            $stMeuPreco->execute([$campId, $meuJogadorId]);
            $minhaValorizacao = $stMeuPreco->fetchAll(PDO::FETCH_ASSOC);
        }

        // Ranking e saldo atual
        $rankSt = $this->pdo->prepare("
            SELECT pontos_total, lendas_coins, divisao, rodadas_jogadas, melhor_rodada_pts
            FROM cartolendas_ranking
            WHERE usuario_id = ?
        ");
        $rankSt->execute([$userId]);
        $meuRanking = $rankSt->fetch(PDO::FETCH_ASSOC) ?: null;

        $this->json([
            'evolucao'              => $evolucaoList,
            'mais_escalado'         => $maisEscalado->fetchAll(PDO::FETCH_ASSOC),
            'mais_rendeu'           => $maisRendeu->fetchAll(PDO::FETCH_ASSOC),
            'mais_pontuou'          => $maisPontuou->fetchAll(PDO::FETCH_ASSOC),
            'menos_rendeu'          => $menosRendeu->fetchAll(PDO::FETCH_ASSOC),
            'minha_valorizacao'     => $minhaValorizacao,
            'meu_jogador_id'        => $meuJogadorId,
            'ranking'               => $meuRanking,
        ]);
    }

    // ──────────────────────────────────────────────────────────
    // VER ESCALAÇÃO DE OUTRO TÉCNICO
    // GET /cartolendas/escalacao-tecnico/:rodadaId/:userId
    // ──────────────────────────────────────────────────────────

    public function escalacaoTecnico(int $rodadaId, int $targetUserId): void {
        // Busca última rodada finalizada para preços
        $ufRow = $this->pdo->query("
            SELECT id FROM rodadas WHERE status = 'finalizada' ORDER BY data DESC, id DESC LIMIT 1
        ")->fetch(PDO::FETCH_ASSOC);
        $precoRodadaId = $ufRow ? (int)$ufRow['id'] : $rodadaId;

        // Busca time
        $stTime = $this->pdo->prepare("
            SELECT id, total_pontos, calculado, orcamento_gasto,
                   COALESCE(patrimonio_apos, 0) AS patrimonio
            FROM cartolendas_times
            WHERE usuario_id = ? AND rodada_id = ?
        ");
        $stTime->execute([$targetUserId, $rodadaId]);
        $time = $stTime->fetch(PDO::FETCH_ASSOC);

        if (!$time) {
            $this->json(['escalacao' => [], 'tecnico' => null, 'message' => 'Técnico não escalou nesta rodada']);
            return;
        }

        // Busca escalação
        $stEsc = $this->pdo->prepare("
            SELECT e.jogador_id, e.eh_reserva, e.posicao, e.preco_na_escalacao,
                   e.pontos_obtidos, COALESCE(e.preco_apos_rodada, e.preco_na_escalacao) AS preco_apos,
                   j.nome, j.foto_url, j.avatar_url, j.posicao AS posicao_real,
                   COALESCE(p.preco, 10.00) AS preco_atual,
                   COALESCE(p.variacao, 0) AS variacao
            FROM cartolendas_escalacao e
            JOIN jogadores j ON j.id = e.jogador_id
            LEFT JOIN cartolendas_precos p ON p.jogador_id = e.jogador_id AND p.rodada_id = ?
            WHERE e.cartolendas_time_id = ?
            ORDER BY e.eh_reserva ASC, e.posicao ASC
        ");
        $stEsc->execute([$precoRodadaId, $time['id']]);

        // Busca capitão
        $stCap = $this->pdo->prepare("
            SELECT jogador_id FROM cartolendas_capitao
            WHERE cartolendas_time_id = ? AND rodada_id = ?
        ");
        $stCap->execute([$time['id'], $rodadaId]);
        $capRow = $stCap->fetch(PDO::FETCH_ASSOC);

        // Info do técnico
        $stUser = $this->pdo->prepare("
            SELECT u.id, u.username, j.nome AS jogador_nome, j.foto_url, j.avatar_url,
                   COALESCE(r.pontos_total, 0) AS pontos_total,
                   COALESCE(r.divisao, 'Bronze') AS divisao,
                   COALESCE(r.patrimonio, 0) AS patrimonio_global
            FROM usuarios u
            LEFT JOIN jogadores j ON j.usuario_id = u.id
            LEFT JOIN cartolendas_ranking r ON r.usuario_id = u.id
            WHERE u.id = ?
        ");
        $stUser->execute([$targetUserId]);
        $tecnico = $stUser->fetch(PDO::FETCH_ASSOC);

        $this->json([
            'escalacao'       => $stEsc->fetchAll(PDO::FETCH_ASSOC),
            'capitao_id'      => $capRow ? (int)$capRow['jogador_id'] : null,
            'total_pontos'    => (float)$time['total_pontos'],
            'orcamento_gasto' => (float)$time['orcamento_gasto'],
            'patrimonio'      => (float)$time['patrimonio'],
            'calculado'       => (int)$time['calculado'],
            'tecnico'         => $tecnico,
        ]);
    }

    // ──────────────────────────────────────────────────────────
    // RANKING TÉCNICOS POR RODADA
    // GET /cartolendas/ranking-rodada/:rodadaId
    // ──────────────────────────────────────────────────────────

    public function rankingRodada(int $rodadaId): void {
        $st = $this->pdo->prepare("
            SELECT t.usuario_id, t.total_pontos, t.orcamento_gasto,
                   COALESCE(t.patrimonio_apos, 0) AS patrimonio,
                   u.username,
                   j.nome AS jogador_nome, j.foto_url, j.avatar_url,
                   COALESCE(r.divisao, 'Bronze') AS divisao,
                   ROW_NUMBER() OVER (ORDER BY t.total_pontos DESC) AS posicao
            FROM cartolendas_times t
            JOIN usuarios u ON u.id = t.usuario_id
            LEFT JOIN jogadores j ON j.usuario_id = t.usuario_id
            LEFT JOIN cartolendas_ranking r ON r.usuario_id = t.usuario_id
            WHERE t.rodada_id = ? AND t.calculado = 1
            ORDER BY t.total_pontos DESC
        ");
        $st->execute([$rodadaId]);
        $this->json($st->fetchAll(PDO::FETCH_ASSOC));
    }

    // ──────────────────────────────────────────────────────────
    // RANKING DE JOGADORES (flexível)
    // GET /cartolendas/ranking-jogadores?tipo=pontos|valorizacao&escopo=rodada|geral&rodada_id=X
    // ──────────────────────────────────────────────────────────

    public function rankingJogadores(): void {
        $tipo     = $_GET['tipo'] ?? 'pontos';      // pontos | valorizacao
        $escopo   = $_GET['escopo'] ?? 'geral';      // rodada | geral
        $rodadaId = (int)($_GET['rodada_id'] ?? 0);

        if ($escopo === 'rodada') {
            if (!$rodadaId) {
                // Pega última finalizada
                $row = $this->pdo->query("SELECT id FROM rodadas WHERE status = 'finalizada' ORDER BY id DESC LIMIT 1")->fetch(PDO::FETCH_ASSOC);
                $rodadaId = $row ? (int)$row['id'] : 0;
            }
            if (!$rodadaId) { $this->json([]); return; }

            if ($tipo === 'valorizacao') {
                $st = $this->pdo->prepare("
                    SELECT j.id, j.nome, j.foto_url, j.avatar_url, j.posicao,
                           p.variacao, p.preco, p.pontos_rodada, p.media_pontos
                    FROM cartolendas_precos p
                    JOIN jogadores j ON j.id = p.jogador_id
                    WHERE p.rodada_id = ?
                    ORDER BY p.variacao DESC
                    LIMIT 30
                ");
            } else {
                $st = $this->pdo->prepare("
                    SELECT j.id, j.nome, j.foto_url, j.avatar_url, j.posicao,
                           p.pontos_rodada AS pontos, p.preco, p.variacao, p.media_pontos
                    FROM cartolendas_precos p
                    JOIN jogadores j ON j.id = p.jogador_id
                    WHERE p.rodada_id = ? AND p.pontos_rodada > 0
                    ORDER BY p.pontos_rodada DESC
                    LIMIT 30
                ");
            }
            $st->execute([$rodadaId]);
        } else {
            // Escopo geral — soma de todas as rodadas
            if ($tipo === 'valorizacao') {
                // Valorização total = preço atual - 10.00 (preço inicial)
                $st = $this->pdo->query("
                    SELECT j.id, j.nome, j.foto_url, j.avatar_url, j.posicao,
                           sub.preco_atual,
                           ROUND(sub.preco_atual - 10.00, 2) AS valorizacao_total,
                           sub.total_pontos, sub.rodadas_jogadas,
                           ROUND(sub.total_pontos / GREATEST(sub.rodadas_jogadas, 1), 2) AS media_pontos
                    FROM (
                        SELECT p.jogador_id,
                               (SELECT p2.preco FROM cartolendas_precos p2 WHERE p2.jogador_id = p.jogador_id ORDER BY p2.rodada_id DESC LIMIT 1) AS preco_atual,
                               SUM(p.pontos_rodada) AS total_pontos,
                               COUNT(CASE WHEN p.pontos_rodada > 0 THEN 1 END) AS rodadas_jogadas
                        FROM cartolendas_precos p
                        GROUP BY p.jogador_id
                    ) sub
                    JOIN jogadores j ON j.id = sub.jogador_id
                    ORDER BY valorizacao_total DESC
                    LIMIT 30
                ");
            } else {
                $st = $this->pdo->query("
                    SELECT j.id, j.nome, j.foto_url, j.avatar_url, j.posicao,
                           ROUND(SUM(p.pontos_rodada), 2) AS total_pontos,
                           COUNT(CASE WHEN p.pontos_rodada > 0 THEN 1 END) AS rodadas_jogadas,
                           ROUND(SUM(p.pontos_rodada) / GREATEST(COUNT(CASE WHEN p.pontos_rodada > 0 THEN 1 END), 1), 2) AS media_pontos,
                           (SELECT p2.preco FROM cartolendas_precos p2 WHERE p2.jogador_id = p.jogador_id ORDER BY p2.rodada_id DESC LIMIT 1) AS preco_atual
                    FROM cartolendas_precos p
                    JOIN jogadores j ON j.id = p.jogador_id
                    GROUP BY p.jogador_id
                    HAVING total_pontos > 0
                    ORDER BY total_pontos DESC
                    LIMIT 30
                ");
            }
        }
        $this->json($st->fetchAll(PDO::FETCH_ASSOC));
    }

    // ──────────────────────────────────────────────────────────
    // MEU PATRIMÔNIO — Detalhes de valorização do time
    // GET /cartolendas/meu-patrimonio?rodada_id=X
    // ──────────────────────────────────────────────────────────

    public function meuPatrimonio(): void {
        $userId   = $this->userId();
        $rodadaId = (int)($_GET['rodada_id'] ?? 0);

        // Se não informou rodada, pega última finalizada
        if (!$rodadaId) {
            $row = $this->pdo->query("SELECT id FROM rodadas WHERE status = 'finalizada' ORDER BY id DESC LIMIT 1")->fetch(PDO::FETCH_ASSOC);
            $rodadaId = $row ? (int)$row['id'] : 0;
        }

        if (!$rodadaId) {
            $this->json(['patrimonio_atual' => 0, 'jogadores' => [], 'message' => 'Nenhuma rodada finalizada']);
            return;
        }

        // Busca time do usuário nesta rodada
        $stTime = $this->pdo->prepare("
            SELECT id, total_pontos, COALESCE(patrimonio_apos, 0) AS patrimonio
            FROM cartolendas_times
            WHERE usuario_id = ? AND rodada_id = ?
        ");
        $stTime->execute([$userId, $rodadaId]);
        $time = $stTime->fetch(PDO::FETCH_ASSOC);

        if (!$time) {
            $this->json(['patrimonio_atual' => 0, 'jogadores' => [], 'message' => 'Você não escalou nesta rodada']);
            return;
        }

        // Busca jogadores da escalação com preço na escalação e preço após
        $stEsc = $this->pdo->prepare("
            SELECT e.jogador_id,
                   e.preco_na_escalacao,
                   COALESCE(e.preco_apos_rodada, e.preco_na_escalacao) AS preco_apos,
                   e.pontos_obtidos, e.eh_reserva,
                   j.nome, j.foto_url, j.avatar_url, j.posicao,
                   COALESCE(p.variacao, 0) AS variacao_rodada
            FROM cartolendas_escalacao e
            JOIN jogadores j ON j.id = e.jogador_id
            LEFT JOIN cartolendas_precos p ON p.jogador_id = e.jogador_id AND p.rodada_id = ?
            WHERE e.cartolendas_time_id = ?
            ORDER BY e.eh_reserva ASC, e.pontos_obtidos DESC
        ");
        $stEsc->execute([$rodadaId, $time['id']]);
        $jogadores = $stEsc->fetchAll(PDO::FETCH_ASSOC);

        // Calcula patrimônio e variação
        $patrimonioAtual   = 0.0;
        $patrimonioAnterior = 0.0;
        foreach ($jogadores as &$jog) {
            $precoEsc  = (float)$jog['preco_na_escalacao'];
            $precoApos = (float)$jog['preco_apos'];
            $patrimonioAtual   += $precoApos;
            $patrimonioAnterior += $precoEsc;
            $jog['valorizacao'] = round($precoApos - $precoEsc, 2);
        }
        unset($jog);

        // Busca evolução do patrimônio ao longo das rodadas
        $stEvol = $this->pdo->prepare("
            SELECT t.rodada_id, r.data, t.total_pontos,
                   COALESCE(t.patrimonio_apos, 0) AS patrimonio
            FROM cartolendas_times t
            JOIN rodadas r ON r.id = t.rodada_id
            WHERE t.usuario_id = ? AND t.calculado = 1
            ORDER BY r.data ASC, r.id ASC
        ");
        $stEvol->execute([$userId]);

        $this->json([
            'rodada_id'           => $rodadaId,
            'patrimonio_atual'    => round($patrimonioAtual, 2),
            'patrimonio_anterior' => round($patrimonioAnterior, 2),
            'variacao_total'      => round($patrimonioAtual - $patrimonioAnterior, 2),
            'total_pontos'        => (float)$time['total_pontos'],
            'jogadores'           => $jogadores,
            'evolucao'            => $stEvol->fetchAll(PDO::FETCH_ASSOC),
        ]);
    }

    // ──────────────────────────────────────────────────────────
    // EVENTOS EM TEMPO REAL (polling)
    // ──────────────────────────────────────────────────────────

    // GET /cartolendas/events?since=YYYY-MM-DD+HH:MM:SS
    public function getEvents(): void {
        // Usa NOW() do MySQL para evitar discrepância de timezone PHP vs MySQL
        $dbNow = $this->pdo->query("SELECT NOW()")->fetchColumn();

        $since = $_GET['since'] ?? null;
        if (!$since) {
            // Primeira chamada: busca últimos 30 segundos (via MySQL)
            $since = $this->pdo->query("SELECT DATE_SUB(NOW(), INTERVAL 30 SECOND)")->fetchColumn();
        }

        CartolendaEventos::cleanup();
        $events = CartolendaEventos::since($since);

        $this->json([
            'events'      => $events,
            'server_time' => $dbNow,
        ]);
    }

    // ──────────────────────────────────────────────────────────
    // RESET DE TEMPORADA (admin only)
    // ──────────────────────────────────────────────────────────

    // POST /cartolendas/temporada/reset
    public function resetTemporada(): void {
        if (!$this->isAdmin()) {
            $this->error('Somente admins podem resetar temporada.', 403);
            return;
        }

        $body = $this->body();
        $temporadaNome = $body['temporada_nome'] ?? date('Y') . '-S' . ceil(date('n') / 6);

        try {
            $this->pdo->beginTransaction();

            // 1. Contar rankings atuais
            $count = (int)$this->pdo->query("SELECT COUNT(*) FROM cartolendas_ranking")->fetchColumn();
            if ($count === 0) {
                $this->pdo->rollBack();
                $this->error('Nenhum ranking para arquivar.');
                return;
            }

            // 2. Calcular posição final de cada técnico
            $rankings = $this->pdo->query("
                SELECT r.*, u.username
                FROM cartolendas_ranking r
                JOIN usuarios u ON u.id = r.usuario_id
                ORDER BY r.pontos_total DESC
            ")->fetchAll(PDO::FETCH_ASSOC);

            // 3. Arquivar no histórico
            $stArchive = $this->pdo->prepare("
                INSERT INTO cartolendas_ranking_historico
                    (usuario_id, username, pontos_total, lendas_coins, divisao,
                     rodadas_jogadas, melhor_rodada_pts, patrimonio, temporada, posicao_final)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");

            $pos = 0;
            foreach ($rankings as $r) {
                $pos++;
                $stArchive->execute([
                    $r['usuario_id'], $r['username'], $r['pontos_total'],
                    $r['lendas_coins'], $r['divisao'], $r['rodadas_jogadas'],
                    $r['melhor_rodada_pts'], $r['patrimonio'] ?? 0,
                    $temporadaNome, $pos
                ]);
            }

            // 4. Resetar rankings
            $this->pdo->exec("
                UPDATE cartolendas_ranking SET
                    pontos_total = 0,
                    rodadas_jogadas = 0,
                    melhor_rodada_pts = 0,
                    lendas_coins = 100.00,
                    divisao = 'Bronze',
                    patrimonio = 100.00,
                    patrimonio_anterior = 0,
                    temporada = 'atual'
            ");

            // 5. Limpar times/escalações/capitães de rodadas finalizadas
            $this->pdo->exec("
                DELETE e FROM cartolendas_escalacao e
                INNER JOIN cartolendas_times t ON t.id = e.cartolendas_time_id
                INNER JOIN rodadas r ON r.id = t.rodada_id
                WHERE r.status = 'finalizada'
            ");

            $this->pdo->exec("
                DELETE c FROM cartolendas_capitao c
                INNER JOIN cartolendas_times t ON t.id = c.cartolendas_time_id
                INNER JOIN rodadas r ON r.id = t.rodada_id
                WHERE r.status = 'finalizada'
            ");

            $this->pdo->exec("
                DELETE t FROM cartolendas_times t
                INNER JOIN rodadas r ON r.id = t.rodada_id
                WHERE r.status = 'finalizada'
            ");

            // 6. Limpar transferências antigas
            $this->pdo->exec("DELETE FROM cartolendas_transferencias");

            // 7. Manter cartolendas_historico_precos (dados históricos de preço)
            // 8. Resetar preços para valor padrão
            $this->pdo->exec("
                UPDATE cartolendas_precos SET
                    preco = 10.00,
                    variacao = 0,
                    pontos_rodada = 0,
                    media_pontos = 0
            ");

            $this->pdo->commit();

            // Dispara evento
            CartolendaEventos::fire('temporada_reset', [
                'temporada'       => $temporadaNome,
                'tecnicos_arquivados' => $count,
            ]);

            $this->json([
                'message'    => "Temporada '{$temporadaNome}' arquivada! Rankings resetados.",
                'temporada'  => $temporadaNome,
                'arquivados' => $count,
            ]);

        } catch (\Throwable $e) {
            $this->pdo->rollBack();
            $this->error('Erro ao resetar temporada: ' . $e->getMessage(), 500);
        }
    }

    // GET /cartolendas/temporada/historico?temporada=2025-S1
    public function getHistoricoTemporada(): void {
        $temporada = $_GET['temporada'] ?? null;

        if ($temporada) {
            // Retorna ranking completo da temporada
            $st = $this->pdo->prepare("
                SELECT usuario_id, username, pontos_total, lendas_coins, divisao,
                       rodadas_jogadas, melhor_rodada_pts, patrimonio, posicao_final
                FROM cartolendas_ranking_historico
                WHERE temporada = ?
                ORDER BY posicao_final ASC
            ");
            $st->execute([$temporada]);
            $ranking = $st->fetchAll(PDO::FETCH_ASSOC);

            $this->json([
                'temporada' => $temporada,
                'ranking'   => $ranking,
            ]);
        } else {
            // Lista temporadas disponíveis
            $temporadas = $this->pdo->query("
                SELECT temporada, COUNT(*) as tecnicos,
                       MAX(archived_at) as data_arquivo,
                       MAX(pontos_total) as maior_pontuacao
                FROM cartolendas_ranking_historico
                GROUP BY temporada
                ORDER BY MAX(archived_at) DESC
            ")->fetchAll(PDO::FETCH_ASSOC);

            $this->json(['temporadas' => $temporadas]);
        }
    }

    // ──────────────────────────────────────────────────────────
    // ROTEADOR
    // ──────────────────────────────────────────────────────────

    public static function route(string $method, string $path): void {
        try {
            AuthMiddleware::handle();
            $ctrl = new self();

            // Eventos em tempo real (polling)
            if ($path === '/cartolendas/events' && $method === 'GET') { $ctrl->getEvents(); return; }

            // Temporada (reset + histórico)
            if ($path === '/cartolendas/temporada/reset' && $method === 'POST') { $ctrl->resetTemporada(); return; }
            if ($path === '/cartolendas/temporada/historico' && $method === 'GET') { $ctrl->getHistoricoTemporada(); return; }

            // Ligas
            if ($path === '/cartolendas/ligas' && $method === 'GET')  { $ctrl->listar(); return; }
            if ($path === '/cartolendas/ligas' && $method === 'POST') { $ctrl->criar();  return; }
            if ($path === '/cartolendas/ligas/entrar' && $method === 'POST') { $ctrl->entrar(); return; }

            if (preg_match('#^/cartolendas/ligas/(\d+)$#', $path, $m)) {
                if ($method === 'GET') { $ctrl->detalhe((int)$m[1]); return; }
            }
            if (preg_match('#^/cartolendas/ligas/(\d+)/sair$#', $path, $m) && $method === 'DELETE') {
                $ctrl->sair((int)$m[1]); return;
            }
            if (preg_match('#^/cartolendas/ligas/(\d+)/adicionar-membro$#', $path, $m) && $method === 'POST') {
                $ctrl->adicionarMembro((int)$m[1]); return;
            }
            if (preg_match('#^/cartolendas/usuarios-disponiveis/(\d+)$#', $path, $m) && $method === 'GET') {
                $ctrl->usuariosDisponiveis((int)$m[1]); return;
            }
            if (preg_match('#^/cartolendas/ligas/(\d+)/ranking$#', $path, $m) && $method === 'GET') {
                $ctrl->rankingLiga((int)$m[1]); return;
            }

            // Chat
            if (preg_match('#^/cartolendas/ligas/(\d+)/chat$#', $path, $m)) {
                if ($method === 'GET')  { $ctrl->getChat((int)$m[1]);       return; }
                if ($method === 'POST') { $ctrl->enviarMensagem((int)$m[1]); return; }
            }

            // Draft
            if (preg_match('#^/cartolendas/ligas/(\d+)/draft$#', $path, $m)) {
                if ($method === 'GET')  { $ctrl->getDraft((int)$m[1]);  return; }
                if ($method === 'POST') { $ctrl->fazerPick((int)$m[1]); return; }
            }

            // Capitão
            if ($path === '/cartolendas/capitao' && $method === 'POST') { $ctrl->definirCapitao(); return; }
            if (preg_match('#^/cartolendas/capitao/(\d+)$#', $path, $m) && $method === 'GET') {
                $ctrl->getCapitao((int)$m[1]); return;
            }

            // Transferências
            if ($path === '/cartolendas/transferencias' && $method === 'POST') { $ctrl->transferir(); return; }
            if (preg_match('#^/cartolendas/transferencias/(\d+)$#', $path, $m) && $method === 'GET') {
                $ctrl->historicoTransferencias((int)$m[1]); return;
            }

            // Mercado
            if (preg_match('#^/cartolendas/mercado/(\d+)$#', $path, $m) && $method === 'GET') {
                $ctrl->mercado((int)$m[1]); return;
            }

            // Meu Time
            if (preg_match('#^/cartolendas/meu-time/(\d+)$#', $path, $m) && $method === 'GET') {
                $ctrl->meuTime((int)$m[1]); return;
            }

            // Escalar
            if ($path === '/cartolendas/escalar' && $method === 'POST') { $ctrl->escalar(); return; }

            // Ranking Global
            if ($path === '/cartolendas/ranking' && $method === 'GET') { $ctrl->ranking(); return; }

            // Histórico
            if ($path === '/cartolendas/historico' && $method === 'GET') { $ctrl->historico(); return; }

            // Stats
            if ($path === '/cartolendas/stats/rodada' && $method === 'GET') { $ctrl->statsRodada(); return; }
            if ($path === '/cartolendas/stats/mercado' && $method === 'GET') { $ctrl->statsMercado(); return; }

            // Histórico de jogadores e meu histórico
            if ($path === '/cartolendas/historico-jogadores' && $method === 'GET') { $ctrl->historicoJogadores(); return; }
            if ($path === '/cartolendas/meu-historico' && $method === 'GET') { $ctrl->meuHistorico(); return; }

            // Escalação de outro técnico
            if (preg_match('#^/cartolendas/escalacao-tecnico/(\d+)/(\d+)$#', $path, $m) && $method === 'GET') {
                $ctrl->escalacaoTecnico((int)$m[1], (int)$m[2]); return;
            }

            // Ranking técnicos por rodada
            if (preg_match('#^/cartolendas/ranking-rodada/(\d+)$#', $path, $m) && $method === 'GET') {
                $ctrl->rankingRodada((int)$m[1]); return;
            }

            // Ranking de jogadores (flexível)
            if ($path === '/cartolendas/ranking-jogadores' && $method === 'GET') { $ctrl->rankingJogadores(); return; }

            // Meu patrimônio
            if ($path === '/cartolendas/meu-patrimonio' && $method === 'GET') { $ctrl->meuPatrimonio(); return; }

            http_response_code(404);
            echo json_encode(['error' => 'Rota não encontrada']);
        } catch (\Throwable $e) {
            http_response_code(500);
            header('Content-Type: application/json');
            echo json_encode([
                'error'   => true,
                'message' => $e->getMessage(),
                'file'    => basename($e->getFile()),
                'line'    => $e->getLine(),
                'trace'   => array_slice(array_map(fn($t) => ($t['file'] ?? '?') . ':' . ($t['line'] ?? '?') . ' ' . ($t['function'] ?? ''), $e->getTrace()), 0, 5),
            ]);
        }
    }
}