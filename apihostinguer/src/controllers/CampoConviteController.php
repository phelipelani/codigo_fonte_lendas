<?php
/**
 * Convites do modulo /campo
 * Arquivo: src/controllers/CampoConviteController.php
 *
 * Diretor (ou tecnico) gera um convite com papel; o convidado ativa a conta
 * definindo nome/usuario/senha (ou entrando com Google carregando o token).
 */

require_once __DIR__ . '/../utils/JWT.php';
require_once __DIR__ . '/../utils/HttpError.php';
require_once __DIR__ . '/../../config/campo_database.php';

class CampoConviteController
{
    private $db;
    private string $frontendUrl;

    public function __construct()
    {
        $this->db = CampoDatabase::getInstance();
        $this->frontendUrl = rtrim($_ENV['FRONTEND_URL'] ?? $_ENV['APP_URL'] ?? 'https://futlendas.com.br', '/');
    }

    // POST /campo/convites  (diretor/tecnico)
    public function store(): void
    {
        $clubeId = CampoMiddleware::clubeId();
        $in = $this->input();

        $papel = $in['papel'] ?? '';
        if (!in_array($papel, ['diretor', 'tecnico', 'jogador'], true)) {
            throw new HttpError('Papel inválido.', 400);
        }

        $jogadorId = null;
        if ($papel === 'jogador') {
            $jogadorId = isset($in['jogador_id']) && $in['jogador_id'] !== '' ? (int) $in['jogador_id'] : null;
            if ($jogadorId) {
                $ok = $this->db->fetchOne(
                    'SELECT id FROM campo_jogadores WHERE id = ? AND clube_id = ? LIMIT 1',
                    [$jogadorId, $clubeId]
                );
                if (!$ok) {
                    throw new HttpError('Jogador inválido.', 400);
                }
            }
        }

        $email = isset($in['email']) ? strtolower(trim((string) $in['email'])) : '';
        if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new HttpError('E-mail inválido.', 400);
        }

        $token    = bin2hex(random_bytes(24));
        $expiraEm = date('Y-m-d H:i:s', strtotime('+7 days'));
        $criadoPor = (int) ($_REQUEST['campoUser']['userId'] ?? 0) ?: null;

        $this->db->execute(
            'INSERT INTO campo_convites (clube_id, token, email, papel, jogador_id, criado_por, usado, expira_em)
             VALUES (?, ?, ?, ?, ?, ?, 0, ?)',
            [$clubeId, $token, $email ?: null, $papel, $jogadorId, $criadoPor, $expiraEm]
        );

        $this->json([
            'token'    => $token,
            'link'     => $this->frontendUrl . '/campo/#/convite/' . $token,
            'papel'    => $papel,
            'expiraEm' => $expiraEm,
        ], 201);
    }

    // GET /campo/convites/{token}  (publico)
    public function validate(string $token): void
    {
        $c = $this->buscarValido($token);
        $clube = $this->db->fetchOne('SELECT nome FROM campo_clubes WHERE id = ? LIMIT 1', [(int) $c['clube_id']]);
        $jogadorNome = null;
        if ($c['jogador_id']) {
            $j = $this->db->fetchOne('SELECT nome FROM campo_jogadores WHERE id = ? LIMIT 1', [(int) $c['jogador_id']]);
            $jogadorNome = $j['nome'] ?? null;
        }
        $this->json([
            'papel'       => $c['papel'],
            'clube'       => $clube['nome'] ?? null,
            'email'       => $c['email'],
            'jogadorNome' => $jogadorNome,
        ]);
    }

    // POST /campo/convites/{token}/ativar  (publico) -> cria a conta e ja loga
    public function ativar(string $token): void
    {
        $c = $this->buscarValido($token);
        $in = $this->input();

        $nome  = trim($in['nome'] ?? '');
        $senha = (string) ($in['password'] ?? '');
        $email = isset($in['email']) ? strtolower(trim((string) $in['email'])) : ($c['email'] ?: '');
        $username = trim($in['username'] ?? '');

        if ($nome === '') {
            throw new HttpError('Nome é obrigatório.', 400);
        }
        if (strlen($senha) < 6) {
            throw new HttpError('A senha deve ter ao menos 6 caracteres.', 400);
        }
        if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new HttpError('E-mail inválido.', 400);
        }
        if ($username === '') {
            $username = $email !== '' ? explode('@', $email)[0] : $nome;
        }
        $username = $this->usernameUnico($username);

        if ($email !== '') {
            $dup = $this->db->fetchOne('SELECT id FROM campo_usuarios WHERE LOWER(email) = LOWER(?) LIMIT 1', [$email]);
            if ($dup) {
                throw new HttpError('Já existe uma conta com esse e-mail.', 409);
            }
        }

        $this->db->execute(
            'INSERT INTO campo_usuarios (clube_id, nome, email, username, password_hash, papel, jogador_id, ativo)
             VALUES (?, ?, ?, ?, ?, ?, ?, 1)',
            [
                (int) $c['clube_id'],
                $nome,
                $email ?: null,
                $username,
                password_hash($senha, PASSWORD_BCRYPT),
                $c['papel'],
                $c['jogador_id'] !== null ? (int) $c['jogador_id'] : null,
            ]
        );
        $userId = (int) $this->db->lastInsertId();
        $this->db->execute('UPDATE campo_convites SET usado = 1, usado_em = NOW() WHERE token = ?', [$token]);

        $user = $this->db->fetchOne('SELECT * FROM campo_usuarios WHERE id = ? LIMIT 1', [$userId]);
        $clube = $this->db->fetchOne('SELECT id, nome, escudo_url FROM campo_clubes WHERE id = ? LIMIT 1', [(int) $user['clube_id']]);

        $tokenJwt = JWT::generate([
            'escopo'    => 'campo',
            'userId'    => $userId,
            'clubeId'   => (int) $user['clube_id'],
            'papel'     => $user['papel'],
            'jogadorId' => $user['jogador_id'] !== null ? (int) $user['jogador_id'] : null,
            'nome'      => $user['nome'],
        ], 86400);

        $this->json([
            'token' => $tokenJwt,
            'user'  => [
                'id'        => $userId,
                'nome'      => $user['nome'],
                'email'     => $user['email'],
                'papel'     => $user['papel'],
                'jogadorId' => $user['jogador_id'] !== null ? (int) $user['jogador_id'] : null,
                'clube'     => $clube ? ['id' => (int) $clube['id'], 'nome' => $clube['nome'], 'escudoUrl' => $clube['escudo_url']] : null,
            ],
        ], 201);
    }

    // ---------- helpers ----------

    private function buscarValido(string $token): array
    {
        $c = $this->db->fetchOne(
            'SELECT * FROM campo_convites WHERE token = ? LIMIT 1',
            [$token]
        );
        if (!$c) {
            throw new HttpError('Convite não encontrado.', 404);
        }
        if ((int) $c['usado'] === 1) {
            throw new HttpError('Este convite já foi usado.', 410);
        }
        if (strtotime($c['expira_em']) < time()) {
            throw new HttpError('Este convite expirou.', 410);
        }
        return $c;
    }

    private function usernameUnico(string $base): string
    {
        $base = strtolower(trim($base));
        $base = @iconv('UTF-8', 'ASCII//TRANSLIT', $base) ?: $base;
        $base = preg_replace('/[^a-z0-9]/', '', $base);
        $base = substr($base, 0, 20) ?: 'user';
        $u = $base;
        $i = 1;
        while ($this->db->fetchOne('SELECT id FROM campo_usuarios WHERE username = ? LIMIT 1', [$u])) {
            $u = $base . $i;
            $i++;
        }
        return $u;
    }

    private function input(): array
    {
        $data = json_decode(file_get_contents('php://input'), true);
        return is_array($data) ? $data : [];
    }

    private function json($data, int $code = 200): void
    {
        http_response_code($code);
        echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }
}
