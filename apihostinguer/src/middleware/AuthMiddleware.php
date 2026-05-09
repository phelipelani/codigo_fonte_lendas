<?php
/**
 * Middleware de Autenticação JWT
 * Arquivo: src/middleware/AuthMiddleware.php
 */

require_once __DIR__ . '/../utils/JWT.php';
require_once __DIR__ . '/../utils/HttpError.php';

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
     */
    public static function isAdmin(): array
    {
        try {
            $decoded = self::extractToken();

            if (!isset($decoded['role']) || $decoded['role'] !== 'admin') {
                throw new HttpError('Acesso negado. Requer privilégios de administrador.', 403);
            }

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