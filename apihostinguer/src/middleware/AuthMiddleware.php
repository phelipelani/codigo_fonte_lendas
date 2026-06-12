<?php
/**
 * Middleware de Autenticação JWT
 * Arquivo: src/middleware/AuthMiddleware.php
 */

require_once __DIR__ . '/../utils/JWT.php';
require_once __DIR__ . '/../utils/HttpError.php';
require_once __DIR__ . '/../../config/database.php';

class AuthMiddleware
{
    /**
     * Verifica autenticação e injeta dados do usuário em $_REQUEST['authUser']
     * Usado pelo index.php antes de chamar qualquer controller protegido
     */
    public static function handle(): array
    {
        $decoded = self::isAuthenticated();

        // Injeta no $_REQUEST para os controllers acessarem se precisarem
        $_REQUEST['authUser'] = $decoded;

        return $decoded;
    }

    /**
     * Verifica autenticação E exige role admin
     * Lança 403 se o usuário não for admin
     *
     * O role é reconferido no BANCO (não só no token): como o token vive 7 dias,
     * isso garante que rebaixar/desativar um admin tem efeito imediato.
     */
    public static function isAdmin(): array
    {
        try {
            $decoded = self::extractToken();

            $user = Database::getInstance()->fetchOne(
                'SELECT role, ativo FROM usuarios WHERE id = ? LIMIT 1',
                [(int)($decoded['userId'] ?? 0)]
            );

            if (!$user || empty($user['ativo']) || $user['role'] !== 'admin') {
                throw new HttpError('Acesso negado. Requer privilégios de administrador.', 403);
            }

            $decoded['role'] = $user['role'];
            $_REQUEST['authUser'] = $decoded;

            return $decoded;
        } catch (HttpError $e) {
            throw $e;
        } catch (Exception $e) {
            throw new HttpError('Erro na autenticação.', 401);
        }
    }

    /**
     * Verifica se o usuário está autenticado (qualquer role)
     * Lança 401 se não tiver token ou token inválido
     */
    public static function isAuthenticated(): array
    {
        try {
            $decoded = self::extractToken();

            $_REQUEST['authUser'] = $decoded;

            return $decoded;
        } catch (HttpError $e) {
            throw $e;
        } catch (Exception $e) {
            throw new HttpError('Erro na autenticação.', 401);
        }
    }

    /**
     * Extrai e valida o token JWT do header Authorization
     */
    private static function extractToken(): array
    {
        $headers    = getallheaders();
        $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? null;

        if (!$authHeader || strpos($authHeader, 'Bearer ') !== 0) {
            throw new HttpError('Acesso negado. Nenhum token fornecido.', 401);
        }

        $token = substr($authHeader, 7); // Remove "Bearer "

        try {
            return JWT::verify($token);
        } catch (Exception $e) {
            if (strpos($e->getMessage(), 'expirado') !== false) {
                throw new HttpError('Token expirado. Faça login novamente.', 401);
            }
            throw new HttpError('Token inválido.', 401);
        }
    }
}