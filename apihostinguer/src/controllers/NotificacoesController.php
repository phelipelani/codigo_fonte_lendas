<?php
/**
 * Controller de Notificações
 * Arquivo: src/controllers/NotificacoesController.php
 *
 * Rotas:
 *   GET    /notificacoes          → listar (do usuário logado)
 *   GET    /notificacoes/count    → contar não lidas
 *   PUT    /notificacoes/:id/ler  → marcar uma como lida
 *   PUT    /notificacoes/ler-todas → marcar todas como lidas
 *
 * Uso interno (chamado por outros controllers):
 *   NotificacoesController::criar($db, $usuarioId, $tipo, $titulo, $mensagem, $meta)
 */

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../utils/HttpError.php';
require_once __DIR__ . '/../utils/JWT.php';

class NotificacoesController
{
    private $db;

    public function __construct()
    {
        $this->db = Database::getInstance();
    }

    // ─── GET /notificacoes ────────────────────────────────────────────────────
    public function index(): void
    {
        $userId = $this->getAuthUserId();

        $rows = $this->db->fetchAll("
            SELECT id, tipo, titulo, mensagem, lida, meta, criado_em
            FROM notificacoes
            WHERE usuario_id = ?
            ORDER BY criado_em DESC
            LIMIT 50
        ", [$userId]);

        // Decodifica meta JSON
        $rows = array_map(function ($r) {
            $r['meta'] = $r['meta'] ? json_decode($r['meta'], true) : null;
            return $r;
        }, $rows);

        http_response_code(200);
        echo json_encode($rows, JSON_UNESCAPED_UNICODE);
    }

    // ─── GET /notificacoes/count ──────────────────────────────────────────────
    public function count(): void
    {
        $userId = $this->getAuthUserId();

        $row = $this->db->fetchOne("
            SELECT COUNT(*) AS total
            FROM notificacoes
            WHERE usuario_id = ? AND lida = 0
        ", [$userId]);

        http_response_code(200);
        echo json_encode(['nao_lidas' => (int)($row['total'] ?? 0)]);
    }

    // ─── PUT /notificacoes/:id/ler ────────────────────────────────────────────
    public function marcarLida(int $id): void
    {
        $userId = $this->getAuthUserId();

        $this->db->execute("
            UPDATE notificacoes SET lida = 1
            WHERE id = ? AND usuario_id = ?
        ", [$id, $userId]);

        http_response_code(200);
        echo json_encode(['success' => true]);
    }

    // ─── PUT /notificacoes/ler-todas ──────────────────────────────────────────
    public function marcarTodasLidas(): void
    {
        $userId = $this->getAuthUserId();

        $this->db->execute("
            UPDATE notificacoes SET lida = 1
            WHERE usuario_id = ? AND lida = 0
        ", [$userId]);

        http_response_code(200);
        echo json_encode(['success' => true]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MÉTODO ESTÁTICO — chamado internamente por outros controllers
    // NotificacoesController::criar($db, $usuarioId, 'rodada_nova', 'título', 'msg', ['rodada_id' => 5])
    // ─────────────────────────────────────────────────────────────────────────
    public static function criar($db, int $usuarioId, string $tipo, string $titulo, string $mensagem, array $meta = []): void
    {
        // Evita duplicatas: não cria a mesma notificação não-lida duas vezes
        $tiposUnico = ['convite', 'rodada_nova'];
        if (in_array($tipo, $tiposUnico)) {
            $existe = $db->fetchOne("
                SELECT id FROM notificacoes
                WHERE usuario_id = ? AND tipo = ? AND lida = 0
                LIMIT 1
            ", [$usuarioId, $tipo]);
            if ($existe) return;
        }

        $db->execute("
            INSERT INTO notificacoes (usuario_id, tipo, titulo, mensagem, meta)
            VALUES (?, ?, ?, ?, ?)
        ", [
            $usuarioId,
            $tipo,
            $titulo,
            $mensagem,
            empty($meta) ? null : json_encode($meta),
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    private function getAuthUserId(): int
    {
        $header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
        if (!preg_match('/Bearer\s+(.+)/i', $header, $m)) {
            throw new HttpError('Token não fornecido.', 401);
        }
        $payload = JWT::verify($m[1]);
        if (!$payload || empty($payload['userId'])) {
            throw new HttpError('Token inválido.', 401);
        }
        return (int)$payload['userId'];
    }
}