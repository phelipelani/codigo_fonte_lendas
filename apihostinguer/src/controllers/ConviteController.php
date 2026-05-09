<?php
/**
 * Controller de Convites
 * Arquivo: src/controllers/ConviteController.php
 *
 * Rotas:
 *   POST /convites                   → Criar convite (admin)
 *   POST /auth/convite/gerar         → Alias usado pelo front (admin)
 *   GET  /convites/{token}           → Validar convite (público)
 *   GET  /auth/convite/validar/{token} → Alias usado pelo front (público)
 *   POST /convites/{token}/aceitar   → Aceitar convite e criar conta (público)
 *   POST /auth/convite/ativar        → Alias usado pelo front (público)
 */

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../utils/HttpError.php';
require_once __DIR__ . '/../utils/JWT.php';
require_once __DIR__ . '/NotificacoesController.php';

class ConviteController
{
    private $db;
    private string $appUrl;

    public function __construct()
    {
        $this->db     = Database::getInstance();
        $this->appUrl = rtrim($_ENV['APP_URL'] ?? 'http://localhost:5173', '/');
    }

    // =========================================================
    // POST /convites  ou  POST /auth/convite/gerar
    // Cria um convite para um jogador
    // =========================================================
    public function store(): void
    {
        $input = $this->getJsonInput();

        // Aceita jogadorId ou jogador_id
        $jogadorId = $input['jogadorId'] ?? $input['jogador_id'] ?? null;
        if (!$jogadorId) {
            throw new HttpError('jogadorId é obrigatório.', 400);
        }

        $jogador = $this->db->fetchOne(
            'SELECT id, nome, foto_url FROM jogadores WHERE id = ?',
            [(int) $jogadorId]
        );

        if (!$jogador) {
            throw new HttpError('Jogador não encontrado.', 404);
        }

        // Aceita role, tipo_usuario ou tipo
        $role = $input['role'] ?? $input['tipo_usuario'] ?? $input['tipo'] ?? 'user';
        if (!in_array($role, ['user', 'admin'])) {
            $role = 'user';
        }

        // Gera token único
        $token    = bin2hex(random_bytes(32));
        $expiraEm = date('Y-m-d H:i:s', strtotime('+48 hours'));

        // Remove convites anteriores não usados deste jogador
        $this->db->execute(
            'DELETE FROM convites WHERE jogador_id = ? AND usado = 0',
            [(int) $jogadorId]
        );

        // Insere novo convite
        $this->db->execute(
            'INSERT INTO convites (token, jogador_id, role, usado, expira_em) VALUES (?, ?, ?, 0, ?)',
            [$token, (int) $jogadorId, $role, $expiraEm]
        );

        $conviteId = $this->db->lastInsertId();
        $link      = $this->appUrl . '/ativar-conta/' . $token;

        http_response_code(201);
        echo json_encode([
            'message' => 'Convite gerado com sucesso!',
            'convite' => [
                'id'          => (int) $conviteId,
                'token'       => $token,
                'link'        => $link,
                'expira_em'   => $expiraEm,
                'expiraEm'    => $expiraEm,
                'tipo_usuario'=> $role,
                'role'        => $role,
                'jogador'     => [
                    'id'      => (int) $jogador['id'],
                    'nome'    => $jogador['nome'],
                    'foto_url'=> $jogador['foto_url'],
                ],
            ],
        ], JSON_UNESCAPED_UNICODE);
    }

    // =========================================================
    // GET /convites/{token}  ou  GET /auth/convite/validar/{token}
    // Valida se um convite existe e não foi usado
    // =========================================================
    public function validate(string $token): void
    {
        $convite = $this->db->fetchOne(
            'SELECT c.*, j.nome AS jogador_nome, j.foto_url AS jogador_foto
             FROM convites c
             JOIN jogadores j ON j.id = c.jogador_id
             WHERE c.token = ? AND c.usado = 0 AND c.expira_em > NOW()
             LIMIT 1',
            [$token]
        );

        if (!$convite) {
            throw new HttpError('Convite inválido ou expirado.', 400);
        }

        http_response_code(200);
        echo json_encode([
            'message' => 'Convite válido.',
            'valido'  => true,
            'convite' => [
                'jogador_id'  => (int) $convite['jogador_id'],
                'jogador_nome'=> $convite['jogador_nome'],
                'jogador_foto'=> $convite['jogador_foto'],
                'expira_em'   => $convite['expira_em'],
                'role'        => $convite['role'],
            ],
        ], JSON_UNESCAPED_UNICODE);
    }

    // =========================================================
    // POST /convites/{token}/aceitar  ou  POST /auth/convite/ativar
    // Aceita o convite e cria a conta do usuário
    // =========================================================
    public function aceitar(string $token): void
    {
        $input = $this->getJsonInput();

        if (empty($input['username'])) {
            throw new HttpError('Username é obrigatório.', 400);
        }

        if (empty($input['password'])) {
            throw new HttpError('Senha é obrigatória.', 400);
        }

        if (strlen($input['password']) < 6) {
            throw new HttpError('Senha deve ter pelo menos 6 caracteres.', 400);
        }

        $convite = $this->db->fetchOne(
            'SELECT c.*, j.nome AS jogador_nome, j.foto_url AS jogador_foto
             FROM convites c
             JOIN jogadores j ON j.id = c.jogador_id
             WHERE c.token = ? AND c.usado = 0 AND c.expira_em > NOW()
             LIMIT 1',
            [$token]
        );

        if (!$convite) {
            throw new HttpError('Convite inválido ou expirado.', 400);
        }

        // Verifica se o username já existe
        $existing = $this->db->fetchOne(
            'SELECT id FROM usuarios WHERE username = ? LIMIT 1',
            [$input['username']]
        );

        if ($existing) {
            throw new HttpError('Este username já está em uso.', 409);
        }

        $passwordHash = password_hash($input['password'], PASSWORD_BCRYPT, ['cost' => 12]);

        // Transaction para garantir atomicidade (tudo ou nada)
        $this->db->beginTransaction();

        try {
            // Cria o usuário
            $this->db->execute(
                'INSERT INTO usuarios (username, password_hash, role) VALUES (?, ?, ?)',
                [$input['username'], $passwordHash, $convite['role']]
            );

            $userId = $this->db->lastInsertId();

            // Marca convite como usado
            $this->db->execute(
                'UPDATE convites SET usado = 1, usado_em = NOW() WHERE token = ?',
                [$token]
            );

            // Vincula usuário ao jogador
            $this->db->execute(
                'UPDATE jogadores SET usuario_id = ? WHERE id = ? AND usuario_id IS NULL',
                [$userId, $convite['jogador_id']]
            );

            // Cria notificação de boas-vindas para o novo usuário
            NotificacoesController::criar(
                $this->db,
                (int)$userId,
                'convite',
                'Bem-vindo ao FutLendas!',
                "Sua conta foi ativada. Bem-vindo, {$input['username']}! Explore suas estatísticas.",
                ['jogador_id' => (int)$convite['jogador_id']]
            );

            $this->db->commit();
        } catch (\Exception $e) {
            $this->db->rollBack();
            throw $e;
        }

        // Gera JWT para já logar automaticamente (fora da transaction — leitura apenas)
        $jwtToken = JWT::generate([
            'userId'    => (int)$userId,
            'username'  => $input['username'],
            'role'      => $convite['role'],
            'jogadorId' => (int)$convite['jogador_id'],
        ], 86400);

        http_response_code(201);
        echo json_encode([
            'message' => 'Conta criada com sucesso!',
            'token'   => $jwtToken,
            'user'    => [
                'id'           => (int) $userId,
                'username'     => $input['username'],
                'role'         => $convite['role'],
                'jogador_id'   => (int) $convite['jogador_id'],
                'jogador_nome' => $convite['jogador_nome'],
            ],
        ], JSON_UNESCAPED_UNICODE);
    }

    // =========================================================
    private function getJsonInput(): array
    {
        return json_decode(file_get_contents('php://input'), true) ?? [];
    }
}