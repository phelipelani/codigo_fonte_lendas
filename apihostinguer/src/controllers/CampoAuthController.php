<?php
/**
 * Autenticacao do modulo /campo
 * Arquivo: src/controllers/CampoAuthController.php
 *
 * Login proprio (tabela campo_usuarios), separado do Futlendas.
 * Emite JWT com escopo 'campo' carregando clubeId + papel.
 */

require_once __DIR__ . '/../utils/JWT.php';
require_once __DIR__ . '/../utils/HttpError.php';
require_once __DIR__ . '/../../config/campo_database.php';

class CampoAuthController
{
    private $db;

    public function __construct()
    {
        $this->db = CampoDatabase::getInstance();
    }

    // POST /campo/auth/login
    public function login(): void
    {
        $in    = $this->getJsonInput();
        $login = trim($in['login'] ?? '');
        $senha = $in['password'] ?? '';

        if ($login === '' || $senha === '') {
            throw new HttpError('Login e senha são obrigatórios.', 400);
        }

        $user = $this->db->fetchOne(
            'SELECT * FROM campo_usuarios WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?) LIMIT 1',
            [$login, $login]
        );

        if (!$user || empty($user['password_hash']) || !password_verify($senha, $user['password_hash'])) {
            throw new HttpError('Credenciais inválidas.', 401);
        }

        if (empty($user['ativo'])) {
            throw new HttpError('Conta inativa. Fale com o diretor do clube.', 403);
        }

        $jogadorId = $user['jogador_id'] !== null ? (int) $user['jogador_id'] : null;

        $token = JWT::generate([
            'escopo'    => 'campo',
            'userId'    => (int) $user['id'],
            'clubeId'   => (int) $user['clube_id'],
            'papel'     => $user['papel'],
            'jogadorId' => $jogadorId,
            'nome'      => $user['nome'],
        ], 86400); // 24h

        $this->json([
            'token' => $token,
            'user'  => $this->userPublic($user, $jogadorId),
        ]);
    }

    // GET /campo/auth/me  (protegida por CampoMiddleware::auth())
    public function me(): void
    {
        $ctx = $_REQUEST['campoUser'] ?? null;
        if (!$ctx) {
            throw new HttpError('Não autenticado.', 401);
        }

        $user = $this->db->fetchOne(
            'SELECT * FROM campo_usuarios WHERE id = ? LIMIT 1',
            [(int) $ctx['userId']]
        );
        if (!$user) {
            throw new HttpError('Usuário não encontrado.', 404);
        }

        $jogadorId = $user['jogador_id'] !== null ? (int) $user['jogador_id'] : null;
        $this->json($this->userPublic($user, $jogadorId));
    }

    // ---------- helpers ----------

    private function userPublic(array $user, ?int $jogadorId): array
    {
        $clube = $this->db->fetchOne(
            'SELECT id, nome, escudo_url FROM campo_clubes WHERE id = ? LIMIT 1',
            [(int) $user['clube_id']]
        );

        return [
            'id'        => (int) $user['id'],
            'nome'      => $user['nome'],
            'email'     => $user['email'] ?? null,
            'papel'     => $user['papel'],
            'jogadorId' => $jogadorId,
            'clube'     => $clube ? [
                'id'        => (int) $clube['id'],
                'nome'      => $clube['nome'],
                'escudoUrl' => $clube['escudo_url'] ?? null,
            ] : null,
        ];
    }

    private function getJsonInput(): array
    {
        $raw  = file_get_contents('php://input');
        $data = json_decode($raw, true);
        return is_array($data) ? $data : [];
    }

    private function json($data, int $code = 200): void
    {
        http_response_code($code);
        echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }
}
