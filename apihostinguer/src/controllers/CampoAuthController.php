<?php
/**
 * Autenticacao do modulo /campo
 * Arquivo: src/controllers/CampoAuthController.php
 *
 * Login proprio (campo_usuarios) + Google OAuth. Emite JWT com escopo 'campo'.
 * Contas sao criadas por convite (CampoConviteController) — Google so loga quem ja existe
 * (ou ativa um convite pendente para aquele e-mail).
 */

require_once __DIR__ . '/../utils/JWT.php';
require_once __DIR__ . '/../utils/HttpError.php';
require_once __DIR__ . '/../../config/campo_database.php';

class CampoAuthController
{
    private $db;
    private string $frontendUrl;
    private string $googleClientId;
    private string $googleClientSecret;
    private string $googleRedirectUri;
    private string $googleAuthUrl  = 'https://accounts.google.com/o/oauth2/v2/auth';
    private string $googleTokenUrl = 'https://oauth2.googleapis.com/token';
    private string $googleUserUrl  = 'https://www.googleapis.com/oauth2/v3/userinfo';

    public function __construct()
    {
        $this->db = CampoDatabase::getInstance();

        $this->frontendUrl = rtrim($_ENV['FRONTEND_URL'] ?? $_ENV['APP_URL'] ?? 'https://futlendas.com.br', '/');

        $this->googleClientId     = $_ENV['GOOGLE_CLIENT_ID']     ?? '';
        $this->googleClientSecret = $_ENV['GOOGLE_CLIENT_SECRET'] ?? '';
        // Redirect proprio do /campo (precisa estar autorizado no Google Cloud Console)
        $this->googleRedirectUri  = $_ENV['CAMPO_GOOGLE_REDIRECT_URI']
            ?? ($this->frontendUrl . '/api/campo/auth/google/callback');
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

        $this->json([
            'token' => $this->gerarToken($user),
            'user'  => $this->userPublic($user),
        ]);
    }

    // GET /campo/auth/me  (protegida)
    public function me(): void
    {
        $ctx = $_REQUEST['campoUser'] ?? null;
        if (!$ctx) {
            throw new HttpError('Não autenticado.', 401);
        }
        $user = $this->db->fetchOne('SELECT * FROM campo_usuarios WHERE id = ? LIMIT 1', [(int) $ctx['userId']]);
        if (!$user) {
            throw new HttpError('Usuário não encontrado.', 404);
        }
        $this->json($this->userPublic($user));
    }

    // GET /campo/auth/google — redireciona para o consentimento do Google
    public function googleRedirect(): void
    {
        if ($this->googleClientId === '') {
            throw new HttpError('Google OAuth não configurado.', 500);
        }
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
        $state = bin2hex(random_bytes(16));
        $_SESSION['campo_oauth_state'] = $state;

        // convite opcional (cria conta na 1a vez)
        $convite = $_GET['convite'] ?? null;
        if ($convite) {
            $_SESSION['campo_oauth_convite'] = $convite;
        } else {
            unset($_SESSION['campo_oauth_convite']);
        }

        $params = http_build_query([
            'client_id'     => $this->googleClientId,
            'redirect_uri'  => $this->googleRedirectUri,
            'response_type' => 'code',
            'scope'         => 'openid email profile',
            'state'         => $state,
            'access_type'   => 'online',
            'prompt'        => 'select_account',
        ]);
        header('Location: ' . $this->googleAuthUrl . '?' . $params);
        exit;
    }

    // GET /campo/auth/google/callback
    public function googleCallback(): void
    {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }

        $code  = $_GET['code']  ?? '';
        $state = $_GET['state'] ?? '';
        $savedState = $_SESSION['campo_oauth_state'] ?? '';
        unset($_SESSION['campo_oauth_state']);

        if ($code === '' || $state === '' || !hash_equals($savedState, $state)) {
            $this->redirectFront(null, 'falha_google');
        }

        try {
            $tok = $this->fetchGoogleToken($code);
            $access = $tok['access_token'] ?? '';
            if ($access === '') {
                $this->redirectFront(null, 'falha_google');
            }
            $info  = $this->fetchGoogleUser($access);
            $email = strtolower(trim($info['email'] ?? ''));
            $nome  = trim($info['name'] ?? '') ?: ($email !== '' ? explode('@', $email)[0] : 'Usuário');
            if ($email === '') {
                $this->redirectFront(null, 'falha_google');
            }
        } catch (\Throwable $e) {
            error_log('[campo google] ' . $e->getMessage());
            $this->redirectFront(null, 'falha_google');
            return;
        }

        // Ja existe usuario com esse e-mail?
        $user = $this->db->fetchOne('SELECT * FROM campo_usuarios WHERE LOWER(email) = LOWER(?) LIMIT 1', [$email]);

        // Nao existe: so cria se houver convite valido pendente
        if (!$user) {
            $conviteToken = $_SESSION['campo_oauth_convite'] ?? null;
            unset($_SESSION['campo_oauth_convite']);
            $convite = $conviteToken ? $this->conviteValido($conviteToken) : null;

            if (!$convite) {
                $this->redirectFront(null, 'nao_convidado');
            }

            $username = $this->usernameUnico($email !== '' ? explode('@', $email)[0] : $nome);
            $this->db->execute(
                'INSERT INTO campo_usuarios (clube_id, nome, email, username, papel, jogador_id, ativo)
                 VALUES (?, ?, ?, ?, ?, ?, 1)',
                [(int) $convite['clube_id'], $nome, $email, $username, $convite['papel'],
                 $convite['jogador_id'] !== null ? (int) $convite['jogador_id'] : null]
            );
            $this->db->execute('UPDATE campo_convites SET usado = 1, usado_em = NOW() WHERE token = ?', [$conviteToken]);
            $user = $this->db->fetchOne('SELECT * FROM campo_usuarios WHERE id = ? LIMIT 1', [(int) $this->db->lastInsertId()]);
        }

        if (empty($user['ativo'])) {
            $this->redirectFront(null, 'conta_inativa');
        }
        // vincula e-mail se ainda nao tinha
        if (empty($user['email'])) {
            $this->db->execute('UPDATE campo_usuarios SET email = ? WHERE id = ?', [$email, (int) $user['id']]);
        }

        $this->redirectFront($this->gerarToken($user));
    }

    // ---------- helpers ----------

    private function gerarToken(array $user): string
    {
        return JWT::generate([
            'escopo'    => 'campo',
            'userId'    => (int) $user['id'],
            'clubeId'   => (int) $user['clube_id'],
            'papel'     => $user['papel'],
            'jogadorId' => $user['jogador_id'] !== null ? (int) $user['jogador_id'] : null,
            'nome'      => $user['nome'],
        ], 86400);
    }

    private function redirectFront(?string $token, ?string $erro = null): void
    {
        $base = $this->frontendUrl . '/campo/#/auth/callback';
        if ($token !== null) {
            header('Location: ' . $base . '?token=' . urlencode($token));
        } else {
            header('Location: ' . $base . '?erro=' . urlencode($erro ?? 'falha'));
        }
        exit;
    }

    private function conviteValido(string $token): ?array
    {
        $c = $this->db->fetchOne(
            'SELECT * FROM campo_convites WHERE token = ? AND usado = 0 AND expira_em > NOW() LIMIT 1',
            [$token]
        );
        return $c ?: null;
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

    private function fetchGoogleToken(string $code): array
    {
        $ch = curl_init($this->googleTokenUrl);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => http_build_query([
                'code'          => $code,
                'client_id'     => $this->googleClientId,
                'client_secret' => $this->googleClientSecret,
                'redirect_uri'  => $this->googleRedirectUri,
                'grant_type'    => 'authorization_code',
            ]),
            CURLOPT_HTTPHEADER => ['Content-Type: application/x-www-form-urlencoded'],
            CURLOPT_TIMEOUT    => 10,
        ]);
        $res  = curl_exec($ch);
        $http = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        if ($res === false || $http !== 200) {
            throw new \Exception('Falha na troca de token com o Google.');
        }
        return json_decode($res, true) ?? [];
    }

    private function fetchGoogleUser(string $accessToken): array
    {
        $ch = curl_init($this->googleUserUrl);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER     => ['Authorization: Bearer ' . $accessToken],
            CURLOPT_TIMEOUT        => 10,
        ]);
        $res  = curl_exec($ch);
        $http = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        if ($res === false || $http !== 200) {
            throw new \Exception('Falha ao buscar perfil do Google.');
        }
        return json_decode($res, true) ?? [];
    }

    private function userPublic(array $user): array
    {
        $clube = $this->db->fetchOne('SELECT id, nome, escudo_url FROM campo_clubes WHERE id = ? LIMIT 1', [(int) $user['clube_id']]);
        return [
            'id'        => (int) $user['id'],
            'nome'      => $user['nome'],
            'email'     => $user['email'] ?? null,
            'papel'     => $user['papel'],
            'jogadorId' => $user['jogador_id'] !== null ? (int) $user['jogador_id'] : null,
            'clube'     => $clube ? [
                'id'        => (int) $clube['id'],
                'nome'      => $clube['nome'],
                'escudoUrl' => $clube['escudo_url'] ?? null,
            ] : null,
        ];
    }

    private function getJsonInput(): array
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
