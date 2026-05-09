<?php
/**
 * Controller de Autenticação
 * Arquivo: src/controllers/AuthController.php
 *
 * Rotas:
 *   POST   /auth/login                  → Login por username/email + senha
 *   GET    /auth/google                 → Redireciona para o Google
 *   GET    /auth/google/callback        → Callback OAuth do Google
 *   POST   /auth/forgot-password        → Solicita recuperação de senha
 *   POST   /auth/reset-password         → Redefine a senha via token
 *   POST   /auth/register               → Registro via convite (token)
 *   GET    /auth/me                     → Dados do usuário logado (🔒)
 */

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../utils/JWT.php';
require_once __DIR__ . '/../utils/HttpError.php';

class AuthController
{
    private $db;

    // Configurações Google OAuth
    private string $googleClientId;
    private string $googleClientSecret;
    private string $googleRedirectUri;
    private string $googleAuthUrl   = 'https://accounts.google.com/o/oauth2/v2/auth';
    private string $googleTokenUrl  = 'https://oauth2.googleapis.com/token';
    private string $googleUserUrl   = 'https://www.googleapis.com/oauth2/v3/userinfo';

    // Configurações SMTP
    private string $smtpHost;
    private int    $smtpPort;
    private string $smtpUser;
    private string $smtpPass;
    private string $smtpFromName;
    private string $frontendUrl;

    public function __construct()
    {
        $this->db = Database::getInstance();

        // FRONTEND_URL = URL publica do site (ex: https://futlendas.com.br) — usada para
        // redirects de volta ao SPA (callback OAuth, link de reset de senha por email).
        // NAO confundir com APP_URL, que historicamente era a URL da API.
        $this->frontendUrl = rtrim(
            $_ENV['FRONTEND_URL']
            ?? $_ENV['APP_URL']
            ?? 'https://futlendas.com.br',
            '/'
        );

        // Google
        $this->googleClientId     = $_ENV['GOOGLE_CLIENT_ID']     ?? '';
        $this->googleClientSecret = $_ENV['GOOGLE_CLIENT_SECRET']  ?? '';
        $this->googleRedirectUri  = $_ENV['GOOGLE_REDIRECT_URI'] ?? ($this->frontendUrl . '/api/auth/google/callback');

        // SMTP
        $this->smtpHost     = $_ENV['SMTP_HOST']      ?? 'smtp.hostinger.com';
        $this->smtpPort     = (int) ($_ENV['SMTP_PORT'] ?? 465);
        $this->smtpUser     = $_ENV['SMTP_USER']      ?? '';
        $this->smtpPass     = $_ENV['SMTP_PASS']      ?? '';
        $this->smtpFromName = $_ENV['SMTP_FROM_NAME'] ?? 'Futlendas';
    }

    // =========================================================
    // POST /auth/login
    // =========================================================
    public function login(): void
    {
        $input = $this->getJsonInput();

        if (empty($input['login'])) {
            throw new HttpError('Username ou email é obrigatório.', 400);
        }

        if (empty($input['password'])) {
            throw new HttpError('Senha é obrigatória.', 400);
        }

        $login    = trim($input['login']);
        $password = $input['password'];

        // Aceita login por username OU email (case-insensitive)
        $user = $this->db->fetchOne(
            'SELECT * FROM usuarios WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?) LIMIT 1',
            [$login, $login]
        );

        if (!$user) {
            throw new HttpError('Credenciais inválidas.', 401);
        }

        // Usuário cadastrado via Google sem senha local
        if (empty($user['password_hash'])) {
            throw new HttpError('Esta conta usa login com Google. Clique em "Entrar com Google".', 401);
        }

        if (!password_verify($password, $user['password_hash'])) {
            throw new HttpError('Credenciais inválidas.', 401);
        }

        if (empty($user['ativo'])) {
            throw new HttpError('Conta inativa. Verifique seu convite ou entre em contato com o administrador.', 403);
        }

        $this->respondWithToken($user, 200, 'Login realizado com sucesso!');
    }

    // =========================================================
    // GET /auth/google
    // Redireciona o usuário para a tela de login do Google
    // =========================================================
    public function googleRedirect(): void
    {
        if (empty($this->googleClientId)) {
            throw new HttpError('Google OAuth não configurado.', 500);
        }

        // State aleatório para proteção CSRF (usando session, mais confiável que cookie)
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
        $state = bin2hex(random_bytes(16));
        $_SESSION['oauth_state'] = $state;

        // Se veio com token de convite na query, salva na session para usar no callback
        $conviteToken = $_GET['convite'] ?? null;
        if ($conviteToken) {
            $_SESSION['oauth_convite_token'] = $conviteToken;
        } else {
            unset($_SESSION['oauth_convite_token']);
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

    // =========================================================
    // GET /auth/google/callback
    // Recebe o código do Google, troca por token e loga/cria usuário
    // =========================================================
    public function googleCallback(): void
    {
        // Validação CSRF via session
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
        $state        = $_GET['state']              ?? '';
        $sessionState = $_SESSION['oauth_state']    ?? '';

        if (empty($state) || empty($sessionState) || !hash_equals($sessionState, $state)) {
            throw new HttpError('Estado OAuth inválido. Tente novamente.', 400);
        }

        // Remove o state da session (uso único)
        unset($_SESSION['oauth_state']);

        // Recupera token de convite se existir
        $conviteToken = $_SESSION['oauth_convite_token'] ?? null;
        unset($_SESSION['oauth_convite_token']);

        $code = $_GET['code'] ?? '';
        if (empty($code)) {
            $error = $_GET['error'] ?? 'acesso_negado';
            throw new HttpError("Login com Google cancelado: {$error}.", 400);
        }

        // Troca o code por um access_token
        $tokenData = $this->fetchGoogleToken($code);

        if (empty($tokenData['access_token'])) {
            throw new HttpError('Falha ao obter token do Google.', 502);
        }

        // Busca os dados do usuário no Google
        $googleUser = $this->fetchGoogleUser($tokenData['access_token']);

        if (empty($googleUser['sub']) || empty($googleUser['email'])) {
            throw new HttpError('Não foi possível obter os dados da conta Google.', 502);
        }

        $googleId = $googleUser['sub'];
        $email    = $googleUser['email'];
        $name     = $googleUser['name']    ?? $googleUser['given_name'] ?? explode('@', $email)[0];
        $fotoUrl  = $googleUser['picture'] ?? null;

        // Busca por google_id primeiro, depois por email
        $user = $this->db->fetchOne(
            'SELECT * FROM usuarios WHERE google_id = ? LIMIT 1',
            [$googleId]
        );

        if (!$user && !empty($email)) {
            $user = $this->db->fetchOne(
                'SELECT * FROM usuarios WHERE email = ? LIMIT 1',
                [$email]
            );
        }

        if ($user) {
            // Usuário já existe — atualiza google_id e foto se necessário
            $this->db->execute(
                'UPDATE usuarios SET google_id = ?, foto_url = COALESCE(foto_url, ?) WHERE id = ?',
                [$googleId, $fotoUrl, $user['id']]
            );

            // Recarrega com dados atualizados
            $user = $this->db->fetchOne(
                'SELECT * FROM usuarios WHERE id = ?',
                [$user['id']]
            );
        } else {
            // Usuário novo — cria a conta (sem senha, pois usa Google)
            $username = $this->generateUniqueUsername($name);

            $this->db->execute(
                'INSERT INTO usuarios (username, email, google_id, foto_url, role) VALUES (?, ?, ?, ?, ?)',
                [$username, $email, $googleId, $fotoUrl, 'user']
            );

            $user = $this->db->fetchOne(
                'SELECT * FROM usuarios WHERE id = ?',
                [$this->db->lastInsertId()]
            );
        }

        // Se veio com convite, vincula o jogador ao usuário e marca convite como usado
        if ($conviteToken) {
            $convite = $this->db->fetchOne(
                'SELECT * FROM convites WHERE token = ? AND usado = 0 AND expira_em > NOW() LIMIT 1',
                [$conviteToken]
            );

            if ($convite && !empty($convite['jogador_id'])) {
                $this->db->beginTransaction();
                try {
                    // Vincula jogador ao usuário
                    $this->db->execute(
                        'UPDATE jogadores SET usuario_id = ? WHERE id = ? AND usuario_id IS NULL',
                        [$user['id'], $convite['jogador_id']]
                    );

                    // Marca convite como usado
                    $this->db->execute(
                        'UPDATE convites SET usado = 1, usado_em = NOW() WHERE token = ?',
                        [$conviteToken]
                    );

                    // Atualiza role se o convite define admin
                    if (($convite['role'] ?? 'user') === 'admin' && $user['role'] !== 'admin') {
                        $this->db->execute(
                            'UPDATE usuarios SET role = ? WHERE id = ?',
                            ['admin', $user['id']]
                        );
                        $user['role'] = 'admin';
                    }

                    // Notificação de boas-vindas
                    NotificacoesController::criar(
                        $this->db,
                        (int)$user['id'],
                        'convite',
                        'Bem-vindo ao FutLendas!',
                        "Sua conta foi ativada via Google. Explore suas estatísticas.",
                        ['jogador_id' => (int)$convite['jogador_id']]
                    );

                    $this->db->commit();
                } catch (\Exception $e) {
                    $this->db->rollBack();
                    // Não bloqueia o login — apenas loga o erro
                    error_log('Erro ao vincular convite no Google OAuth: ' . $e->getMessage());
                }
            }
        }

        // Busca jogador vinculado
        $jogadorRowG = $this->db->fetchOne(
            'SELECT id FROM jogadores WHERE usuario_id = ? LIMIT 1',
            [$user['id']]
        );
        $jogadorIdG = $jogadorRowG ? (int)$jogadorRowG['id'] : null;

        $token = JWT::generate([
            'userId'    => (int)$user['id'],
            'username'  => $user['username'],
            'role'      => $user['role'],
            'jogadorId' => $jogadorIdG,
        ], 86400);

        // Redireciona para o front com o token na URL
        // O frontend deve capturar o token do hash e armazenar
        header('Location: ' . $this->frontendUrl . '/auth/callback#token=' . urlencode($token));
        exit;
    }

    // =========================================================
    // POST /auth/forgot-password
    // Envia email com link de recuperação de senha
    // =========================================================
    public function forgotPassword(): void
    {
        $input = $this->getJsonInput();

        if (empty($input['email'])) {
            throw new HttpError('Email é obrigatório.', 400);
        }

        $email = trim(strtolower($input['email']));

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new HttpError('Email inválido.', 400);
        }

        $user = $this->db->fetchOne(
            'SELECT * FROM usuarios WHERE email = ? LIMIT 1',
            [$email]
        );

        // Resposta genérica — não revela se o email existe ou não
        $response = ['message' => 'Se este email estiver cadastrado, você receberá as instruções em breve.'];

        if (!$user) {
            http_response_code(200);
            echo json_encode($response);
            return;
        }

        // Usuário que só usa Google não pode redefinir senha por aqui
        if (empty($user['password_hash']) && !empty($user['google_id'])) {
            http_response_code(200);
            echo json_encode($response);
            return;
        }

        // Gera token seguro com validade de 1 hora
        $token   = bin2hex(random_bytes(32));
        $expires = date('Y-m-d H:i:s', strtotime('+1 hour'));

        $this->db->execute(
            'UPDATE usuarios SET reset_token = ?, reset_expires = ? WHERE id = ?',
            [$token, $expires, $user['id']]
        );

        $resetLink = $this->frontendUrl . '/auth/reset-password?token=' . $token;

        $subject = 'Redefinição de senha — Futlendas';
        $body    = $this->buildResetEmailHtml($user['username'], $resetLink);

        $this->sendEmail($email, $user['username'], $subject, $body);

        http_response_code(200);
        echo json_encode($response);
    }

    // =========================================================
    // POST /auth/reset-password
    // Redefine a senha usando o token recebido por email
    // =========================================================
    public function resetPassword(): void
    {
        $input = $this->getJsonInput();

        if (empty($input['token'])) {
            throw new HttpError('Token é obrigatório.', 400);
        }

        if (empty($input['password'])) {
            throw new HttpError('Nova senha é obrigatória.', 400);
        }

        if (strlen($input['password']) < 6) {
            throw new HttpError('A senha deve ter pelo menos 6 caracteres.', 400);
        }

        if (isset($input['confirmPassword']) && $input['password'] !== $input['confirmPassword']) {
            throw new HttpError('As senhas não coincidem.', 400);
        }

        $token = trim($input['token']);

        $user = $this->db->fetchOne(
            'SELECT * FROM usuarios WHERE reset_token = ? AND reset_expires > NOW() LIMIT 1',
            [$token]
        );

        if (!$user) {
            throw new HttpError('Token inválido ou expirado.', 400);
        }

        $newHash = password_hash($input['password'], PASSWORD_BCRYPT, ['cost' => 12]);

        // Atualiza senha e limpa o token de reset
        $this->db->execute(
            'UPDATE usuarios SET password_hash = ?, reset_token = NULL, reset_expires = NULL WHERE id = ?',
            [$newHash, $user['id']]
        );

        http_response_code(200);
        echo json_encode(['message' => 'Senha redefinida com sucesso! Faça login.']);
    }

    // =========================================================
    // POST /auth/register
    // Registro via link de convite (token único)
    // =========================================================
    public function register(): void
    {
        $input = $this->getJsonInput();

        if (empty($input['token'])) {
            throw new HttpError('Token de convite é obrigatório.', 400);
        }

        if (empty($input['username'])) {
            throw new HttpError('Username é obrigatório.', 400);
        }

        if (empty($input['password'])) {
            throw new HttpError('Senha é obrigatória.', 400);
        }

        if (strlen($input['password']) < 6) {
            throw new HttpError('A senha deve ter pelo menos 6 caracteres.', 400);
        }

        $token    = trim($input['token']);
        $username = trim($input['username']);
        $password = $input['password'];

        // Valida o convite
        $convite = $this->db->fetchOne(
            'SELECT * FROM convites WHERE token = ? AND usado = 0 AND expira_em > NOW() LIMIT 1',
            [$token]
        );

        if (!$convite) {
            throw new HttpError('Convite inválido ou expirado.', 400);
        }

        // Verifica se username já existe
        $existing = $this->db->fetchOne(
            'SELECT id FROM usuarios WHERE username = ? LIMIT 1',
            [$username]
        );

        if ($existing) {
            throw new HttpError('Este username já está em uso.', 409);
        }

        $passwordHash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
        $role         = $convite['role'] ?? 'user';

        // Email opcional no registro
        $email = !empty($input['email']) ? trim($input['email']) : null;

        // Transaction para garantir atomicidade
        $this->db->beginTransaction();

        try {
            // Cria o usuário
            $this->db->execute(
                'INSERT INTO usuarios (username, password_hash, role, email) VALUES (?, ?, ?, ?)',
                [$username, $passwordHash, $role, $email]
            );

            $userId = $this->db->lastInsertId();

            // Marca o convite como usado
            $this->db->execute(
                'UPDATE convites SET usado = 1, usado_em = NOW() WHERE token = ?',
                [$token]
            );

            // Vincula usuário ao jogador, se o convite tiver jogador_id
            if (!empty($convite['jogador_id'])) {
                $this->db->execute(
                    'UPDATE jogadores SET usuario_id = ? WHERE id = ? AND usuario_id IS NULL',
                    [$userId, $convite['jogador_id']]
                );
            }

            $this->db->commit();
        } catch (\Exception $e) {
            $this->db->rollBack();
            throw $e;
        }

        http_response_code(201);
        echo json_encode([
            'message'  => 'Conta criada com sucesso! Faça login.',
            'userId'   => (int)$userId,
            'username' => $username,
            'role'     => $role,
        ]);
    }

    // =========================================================
    // GET /auth/me  (rota protegida — requer JWT no header)
    // =========================================================
    public function me(): void
    {
        // O AuthMiddleware já injetou os dados do token em $_REQUEST['authUser']
        $authUser = $_REQUEST['authUser'] ?? null;

        if (!$authUser) {
            throw new HttpError('Não autorizado.', 401);
        }

        $user = $this->db->fetchOne(
            'SELECT id, username, email, role, foto_url FROM usuarios WHERE id = ? LIMIT 1',
            [$authUser['userId']]
        );

        if (!$user) {
            throw new HttpError('Usuário não encontrado.', 404);
        }

        $jogadorRow = $this->db->fetchOne(
            'SELECT id FROM jogadores WHERE usuario_id = ? LIMIT 1',
            [$user['id']]
        );

        http_response_code(200);
        echo json_encode([
            'id'        => (int)$user['id'],
            'name'      => $user['username'],
            'email'     => $user['email'],
            'role'      => $user['role'],
            'fotoUrl'   => $user['foto_url'],
            'jogadorId' => $jogadorRow ? (int)$jogadorRow['id'] : null,
        ]);
    }

    // =========================================================
    // MÉTODOS PRIVADOS — Helpers internos
    // =========================================================

    /**
     * Lê e valida o body da requisição como JSON
     */
    private function getJsonInput(): array
    {
        $raw   = file_get_contents('php://input');
        $input = json_decode($raw, true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new HttpError('Body da requisição inválido (JSON esperado).', 400);
        }

        return $input ?? [];
    }

    /**
     * Monta o payload JWT e responde com token + dados do usuário
     */
    private function respondWithToken(array $user, int $statusCode, string $message): void
    {
        // Busca o jogador vinculado a este usuário (se houver)
        $jogadorRow = $this->db->fetchOne(
            'SELECT id FROM jogadores WHERE usuario_id = ? LIMIT 1',
            [$user['id']]
        );
        $jogadorId = $jogadorRow ? (int)$jogadorRow['id'] : null;

        $token = JWT::generate([
            'userId'    => (int)$user['id'],
            'username'  => $user['username'],
            'role'      => $user['role'],
            'jogadorId' => $jogadorId,
        ], 86400); // 24 horas

        http_response_code($statusCode);
        echo json_encode([
            'message' => $message,
            'token'   => $token,
            'user'    => [
                'id'        => (int)$user['id'],
                'name'      => $user['username'],
                'email'     => $user['email'] ?? null,
                'role'      => $user['role'],
                'fotoUrl'   => $user['foto_url'] ?? null,
                'jogadorId' => $jogadorId,
            ],
        ]);
    }

    /**
     * Troca o authorization code do Google por um access_token
     */
    private function fetchGoogleToken(string $code): array
    {
        $params = [
            'code'          => $code,
            'client_id'     => $this->googleClientId,
            'client_secret' => $this->googleClientSecret,
            'redirect_uri'  => $this->googleRedirectUri,
            'grant_type'    => 'authorization_code',
        ];

        $ch = curl_init($this->googleTokenUrl);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => http_build_query($params),
            CURLOPT_HTTPHEADER     => ['Content-Type: application/x-www-form-urlencoded'],
            CURLOPT_TIMEOUT        => 10,
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($response === false || $httpCode !== 200) {
            throw new HttpError('Falha na comunicação com o Google.', 502);
        }

        return json_decode($response, true) ?? [];
    }

    /**
     * Busca os dados do perfil do usuário no Google
     */
    private function fetchGoogleUser(string $accessToken): array
    {
        $ch = curl_init($this->googleUserUrl);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER     => ['Authorization: Bearer ' . $accessToken],
            CURLOPT_TIMEOUT        => 10,
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($response === false || $httpCode !== 200) {
            throw new HttpError('Falha ao buscar dados do Google.', 502);
        }

        return json_decode($response, true) ?? [];
    }

    /**
     * Gera um username único baseado no nome do Google
     * Ex: "João Silva" → "joaosilva" → "joaosilva_3" se já existir
     */
    private function generateUniqueUsername(string $name): string
    {
        // Normaliza: remove acentos, caracteres especiais e espaços
        $base = strtolower(trim($name));
        $base = iconv('UTF-8', 'ASCII//TRANSLIT', $base);
        $base = preg_replace('/[^a-z0-9]/', '', $base);
        $base = substr($base, 0, 20);

        if (empty($base)) {
            $base = 'user';
        }

        $username = $base;
        $counter  = 1;

        while ($this->db->fetchOne('SELECT id FROM usuarios WHERE username = ? LIMIT 1', [$username])) {
            $username = $base . '_' . $counter;
            $counter++;
        }

        return $username;
    }

    /**
     * Envia email via SMTP da Hostinger usando socket nativo
     * Suporta SSL (porta 465) e TLS/STARTTLS (porta 587)
     */
    private function sendEmail(string $toEmail, string $toName, string $subject, string $htmlBody): void
    {
        if (empty($this->smtpUser) || empty($this->smtpPass)) {
            error_log('[Auth] SMTP não configurado — email não enviado para ' . $toEmail);
            return;
        }

        // Usa PHPMailer via Composer se disponível, senão usa mail() como fallback
        $composerAutoload = __DIR__ . '/../../vendor/autoload.php';

        if (file_exists($composerAutoload)) {
            require_once $composerAutoload;
            $this->sendEmailPHPMailer($toEmail, $toName, $subject, $htmlBody);
        } else {
            $this->sendEmailNative($toEmail, $toName, $subject, $htmlBody);
        }
    }

    /**
     * Envio via PHPMailer (recomendado)
     * Instalar com: composer require phpmailer/phpmailer
     */
    private function sendEmailPHPMailer(string $toEmail, string $toName, string $subject, string $htmlBody): void
    {
        $mail = new PHPMailer\PHPMailer\PHPMailer(true);

        try {
            $mail->isSMTP();
            $mail->Host       = $this->smtpHost;
            $mail->SMTPAuth   = true;
            $mail->Username   = $this->smtpUser;
            $mail->Password   = $this->smtpPass;
            $mail->SMTPSecure = $this->smtpPort === 465
                ? PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_SMTPS
                : PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_STARTTLS;
            $mail->Port       = $this->smtpPort;
            $mail->CharSet    = 'UTF-8';

            $mail->setFrom($this->smtpUser, $this->smtpFromName);
            $mail->addAddress($toEmail, $toName);

            $mail->isHTML(true);
            $mail->Subject = $subject;
            $mail->Body    = $htmlBody;
            $mail->AltBody = strip_tags(str_replace(['<br>', '<br/>'], "\n", $htmlBody));

            $mail->send();
        } catch (\Exception $e) {
            error_log('[Auth] Erro ao enviar email (PHPMailer): ' . $e->getMessage());
        }
    }

    /**
     * Fallback: usa mail() nativo do PHP
     * Funciona apenas se o servidor tiver sendmail configurado
     */
    private function sendEmailNative(string $toEmail, string $toName, string $subject, string $htmlBody): void
    {
        $headers  = "MIME-Version: 1.0\r\n";
        $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
        $headers .= "From: {$this->smtpFromName} <{$this->smtpUser}>\r\n";
        $headers .= "Reply-To: {$this->smtpUser}\r\n";

        $sent = mail($toEmail, $subject, $htmlBody, $headers);

        if (!$sent) {
            error_log('[Auth] Erro ao enviar email (mail nativo) para ' . $toEmail);
        }
    }

    /**
     * Template HTML do email de recuperação de senha
     */
    private function buildResetEmailHtml(string $username, string $resetLink): string
    {
        return <<<HTML
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin:0;padding:0;background:#0f0f0f;font-family:Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f0f;padding:40px 0;">
            <tr>
              <td align="center">
                <table width="520" cellpadding="0" cellspacing="0" style="background:#1a1a1a;border-radius:12px;overflow:hidden;border:1px solid #2a2a2a;">
                  
                  <!-- Header -->
                  <tr>
                    <td align="center" style="padding:32px 40px 24px;background:#111;">
                      <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:1px;">
                        ⚽ FUTLENDAS
                      </h1>
                    </td>
                  </tr>

                  <!-- Body -->
                  <tr>
                    <td style="padding:36px 40px;">
                      <p style="margin:0 0 12px;color:#cccccc;font-size:15px;">
                        Olá, <strong style="color:#ffffff;">{$username}</strong>
                      </p>
                      <p style="margin:0 0 24px;color:#999;font-size:14px;line-height:1.6;">
                        Recebemos uma solicitação para redefinir a senha da sua conta.<br>
                        Clique no botão abaixo para criar uma nova senha.<br>
                        Este link é válido por <strong style="color:#ffffff;">1 hora</strong>.
                      </p>

                      <!-- Botão -->
                      <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
                        <tr>
                          <td align="center" style="background:#22c55e;border-radius:8px;">
                            <a href="{$resetLink}"
                               style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;letter-spacing:0.5px;">
                              Redefinir Senha
                            </a>
                          </td>
                        </tr>
                      </table>

                      <p style="margin:28px 0 0;color:#666;font-size:12px;line-height:1.6;">
                        Se você não solicitou a redefinição de senha, ignore este email.<br>
                        Sua senha permanece a mesma.
                      </p>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="padding:20px 40px;background:#111;border-top:1px solid #2a2a2a;">
                      <p style="margin:0;color:#555;font-size:12px;text-align:center;">
                        © Futlendas — suporte@futlendas.com.br
                      </p>
                    </td>
                  </tr>

                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
        HTML;
    }
}