<?php
/**
 * Middleware de autenticacao do modulo /campo
 * Arquivo: src/middleware/CampoMiddleware.php
 *
 * Valida o JWT, exige escopo 'campo', restringe por papel (diretor/tecnico/jogador)
 * e disponibiliza o usuario decodificado em $_REQUEST['campoUser'].
 * O isolamento multi-tenant e feito sempre pelo clubeId do token.
 */

require_once __DIR__ . '/../utils/JWT.php';
require_once __DIR__ . '/../utils/HttpError.php';

class CampoMiddleware
{
    /**
     * @param array $papeis Lista de papeis permitidos. Vazio = qualquer logado do campo.
     */
    public static function auth(array $papeis = []): array
    {
        $headers    = getallheaders();
        $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? null;

        if (!$authHeader || strpos($authHeader, 'Bearer ') !== 0) {
            throw new HttpError('Acesso negado. Nenhum token fornecido.', 401);
        }

        $token = substr($authHeader, 7);

        try {
            $decoded = JWT::verify($token);
        } catch (Exception $e) {
            $expirado = strpos($e->getMessage(), 'expirado') !== false;
            throw new HttpError($expirado ? 'Token expirado. Faça login novamente.' : 'Token inválido.', 401);
        }

        if (($decoded['escopo'] ?? null) !== 'campo') {
            throw new HttpError('Token não pertence ao módulo Campo.', 403);
        }

        if (!empty($papeis) && !in_array($decoded['papel'] ?? '', $papeis, true)) {
            throw new HttpError('Acesso negado para o seu perfil.', 403);
        }

        $_REQUEST['campoUser'] = $decoded;
        return $decoded;
    }

    /** Id do clube do usuario logado (isolamento multi-tenant). */
    public static function clubeId(): int
    {
        return (int) ($_REQUEST['campoUser']['clubeId'] ?? 0);
    }

    /** Papel do usuario logado. */
    public static function papel(): string
    {
        return (string) ($_REQUEST['campoUser']['papel'] ?? '');
    }

    /** Id do jogador vinculado (quando papel = jogador), ou null. */
    public static function jogadorId(): ?int
    {
        $j = $_REQUEST['campoUser']['jogadorId'] ?? null;
        return $j !== null ? (int) $j : null;
    }
}
