<?php
/**
 * Middleware de Escopo e RBAC Multi-Racha
 * Arquivo: src/middleware/RachaScopeMiddleware.php
 *
 * Responsabilidades:
 * 1. Valida o token JWT através de AuthMiddleware::isAuthenticated().
 * 2. Trata o header X-Racha-Id (ou parâmetro de rota) como entrada NÃO confiável.
 * 3. Valida no banco a existência e status ativo do racha.
 * 4. Valida a associação e o papel do usuário no racha (dono, financeiro, auxiliar, jogador_comum).
 * 5. Impede acessos cruzados (cross-tenant) e tentativas de bypass.
 * 6. Retorna o contexto de autorização diretamente ao chamador, sem manter estado estático global ou superglobals (prevenção de vazamento entre requisições em processos persistentes).
 */

// Polyfill para getallheaders() em ambientes CLI / testes
if (!function_exists('getallheaders')) {
    function getallheaders(): array
    {
        $headers = [];
        foreach ($_SERVER as $name => $value) {
            if (substr($name, 0, 5) === 'HTTP_') {
                $headerName = str_replace(' ', '-', ucwords(strtolower(str_replace('_', ' ', substr($name, 5)))));
                $headers[$headerName] = (string)$value;
            } elseif ($name === 'CONTENT_TYPE') {
                $headers['Content-Type'] = (string)$value;
            } elseif ($name === 'CONTENT_LENGTH') {
                $headers['Content-Length'] = (string)$value;
            }
        }
        return $headers;
    }
}

require_once __DIR__ . '/AuthMiddleware.php';
require_once __DIR__ . '/../utils/HttpError.php';

if (file_exists(__DIR__ . '/../../config/database_sandbox.php')) {
    require_once __DIR__ . '/../../config/database_sandbox.php';
}
if (file_exists(__DIR__ . '/../../config/database.php')) {
    require_once __DIR__ . '/../../config/database.php';
}

class RachaScopeMiddleware
{
    /**
     * Higieniza parâmetros de entrada globais para impedir qualquer tentativa de injeção externa em rachaScope
     */
    public static function clearScope(): void
    {
        unset($_GET['rachaScope'], $_POST['rachaScope'], $_COOKIE['rachaScope'], $_REQUEST['rachaScope']);
    }

    /**
     * Obtém a conexão PDO adequada (Sandbox em desenvolvimento/testes ou Database em produção).
     * SEGURANÇA:
     * - Não realiza fallback silencioso caso ENVIRONMENT seja indefinido ou inválido.
     * - Em sandbox/teste, conexões personalizadas devem ter comprovados tanto o nome do banco quanto o endpoint estritamente local (127.0.0.1 ou localhost).
     * - Em produção, não aceita conexões personalizadas arbitrárias; utiliza estritamente Database::getInstance()->getConnection().
     */
    public static function getPdo(?PDO $customPdo = null): PDO
    {
        $env = strtolower(trim((string)(getenv('ENVIRONMENT') ?: ($_ENV['ENVIRONMENT'] ?? ''))));

        if ($env !== 'sandbox' && $env !== 'test' && $env !== 'production') {
            throw new RuntimeException("SEGURANÇA BLOQUEADA: ENVIRONMENT não configurado ou inválido ('{$env}'). Defina explicitamente 'sandbox', 'test' ou 'production'.");
        }

        if ($customPdo !== null) {
            // Em ambiente de teste/sandbox, valida rigorosamente identidade do banco E endpoint local
            if ($env === 'sandbox' || $env === 'test') {
                try {
                    $activeDb = $customPdo->query("SELECT DATABASE()")->fetchColumn();
                } catch (Throwable $e) {
                    throw new RuntimeException("SEGURANÇA BLOQUEADA: Falha ao inspecionar conexão personalizada: " . $e->getMessage());
                }

                if ($activeDb !== 'db_futlendas_sandbox') {
                    throw new RuntimeException("SEGURANÇA BLOQUEADA: Conexão personalizada rejeitada. Em ambiente '{$env}', o banco DEVE ser estritamente 'db_futlendas_sandbox' (detectado: '{$activeDb}').");
                }

                // Validação do endpoint real da conexão (impede conexões remotas mascaradas)
                try {
                    $connStatus = (string)$customPdo->getAttribute(PDO::ATTR_CONNECTION_STATUS);
                } catch (Throwable $e) {
                    throw new RuntimeException("SEGURANÇA BLOQUEADA: Falha ao inspecionar endpoint da conexão personalizada: " . $e->getMessage());
                }

                $isLocal = false;
                if (strpos($connStatus, '127.0.0.1') === 0 || strpos($connStatus, 'localhost') === 0 || strpos($connStatus, '::1') === 0) {
                    $isLocal = true;
                }

                if (!$isLocal) {
                    throw new RuntimeException("SEGURANÇA BLOQUEADA: Conexão personalizada rejeitada. O endpoint ('{$connStatus}') não pode ser comprovado como estritamente local (127.0.0.1 ou localhost).");
                }

                return $customPdo;
            }

            // Em produção, proíbe conexão personalizada arbitrária
            throw new RuntimeException("SEGURANÇA BLOQUEADA: Em produção, conexões personalizadas arbitrárias são proibidas. Utilize exclusivamente o mecanismo Database::getInstance()->getConnection().");
        }

        if ($env === 'sandbox' || $env === 'test') {
            if (class_exists('SandboxDatabase')) {
                return SandboxDatabase::getConnection();
            }
            throw new RuntimeException("Ambiente '{$env}' configurado, mas SandboxDatabase não está disponível.");
        }

        if ($env === 'production') {
            if (class_exists('Database')) {
                return Database::getInstance()->getConnection();
            }
            throw new RuntimeException("Ambiente 'production' configurado, mas Database não está disponível.");
        }

        throw new RuntimeException("SEGURANÇA BLOQUEADA: Configuração de banco inconsistente.");
    }

    /**
     * Extrai e valida o ID do racha a partir do header HTTP ou parâmetro explícito
     */
    public static function resolveRachaId(?int $explicitRachaId = null): int
    {
        if ($explicitRachaId !== null && $explicitRachaId > 0) {
            return $explicitRachaId;
        }

        $headerVal = self::getHeader('X-Racha-Id');
        if ($headerVal !== null && trim($headerVal) !== '') {
            $filtered = filter_var(trim($headerVal), FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
            if ($filtered !== false) {
                return (int)$filtered;
            }
            throw new HttpError('Header X-Racha-Id inválido: deve ser um número inteiro positivo.', 400);
        }

        // Fallback para $_REQUEST ou $_GET se explicitamente fornecido
        $paramVal = $_REQUEST['racha_id'] ?? $_GET['racha_id'] ?? null;
        if ($paramVal !== null && trim((string)$paramVal) !== '') {
            $filtered = filter_var(trim((string)$paramVal), FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
            if ($filtered !== false) {
                return (int)$filtered;
            }
            throw new HttpError('Parâmetro racha_id inválido: deve ser um número inteiro positivo.', 400);
        }

        throw new HttpError('Identificador do racha ausente. Forneça o header X-Racha-Id.', 400);
    }

    /**
     * Resolve o escopo completo do racha validando autenticação e permissões
     */
    public static function resolveScope(?int $explicitRachaId = null, ?PDO $customPdo = null): array
    {
        // 0. Higienização de entrada: elimina qualquer tentativa de injeção externa via GET, POST, COOKIE ou REQUEST
        self::clearScope();

        // 1. Valida autenticação existente no projeto
        $authUser = AuthMiddleware::isAuthenticated();
        $userId = (int)($authUser['id'] ?? $authUser['userId'] ?? 0);

        if ($userId <= 0) {
            throw new HttpError('Usuário autenticado inválido.', 401);
        }

        // 2. Extrai e valida o rachaId
        $rachaId = self::resolveRachaId($explicitRachaId);
        $pdo = self::getPdo($customPdo);

        // 3. Consulta existência e status do racha
        $stmt = $pdo->prepare("SELECT id, nome, ativo FROM rachas WHERE id = :id");
        $stmt->execute([':id' => $rachaId]);
        $racha = $stmt->fetch();

        if (!$racha) {
            throw new HttpError("Racha #{$rachaId} não encontrado.", 404);
        }

        if ((int)$racha['ativo'] !== 1) {
            throw new HttpError("O racha '{$racha['nome']}' está inativo ou desativado.", 403);
        }

        // 4. Consulta papel em racha_organizadores
        $stmtOrg = $pdo->prepare("
            SELECT papel 
            FROM racha_organizadores 
            WHERE racha_id = :racha_id AND usuario_id = :usuario_id
        ");
        $stmtOrg->execute([':racha_id' => $rachaId, ':usuario_id' => $userId]);
        $org = $stmtOrg->fetch();

        $userRole = null;
        $isOrganizador = false;

        if ($org) {
            $userRole = (string)$org['papel']; // 'dono', 'financeiro', 'auxiliar'
            $isOrganizador = true;
        } else {
            // 5. Se não for organizador, verifica se é participante comum cadastrado
            $stmtPart = $pdo->prepare("
                SELECT rp.tipo_participacao, rp.ativo
                FROM racha_participantes rp
                JOIN jogadores j ON j.id = rp.jogador_id
                WHERE rp.racha_id = :racha_id 
                  AND j.usuario_id = :usuario_id
                  AND rp.ativo = 1
                LIMIT 1
            ");
            $stmtPart->execute([':racha_id' => $rachaId, ':usuario_id' => $userId]);
            $part = $stmtPart->fetch();

            if ($part) {
                $userRole = 'jogador_comum';
            }
        }

        $scope = [
            'rachaId'       => (int)$racha['id'],
            'rachaNome'     => (string)$racha['nome'],
            'userId'        => $userId,
            'userRole'      => $userRole,
            'isOrganizador' => $isOrganizador,
            'authUser'      => $authUser
        ];

        // Retorna o contexto de autorização diretamente ao chamador
        return $scope;
    }

    /**
     * Exige que o usuário seja organizador e tenha um dos papéis permitidos.
     * SEGURANÇA (Deny-by-default): Se $allowedRoles estiver vazia, nega o acesso por padrão.
     */
    public static function requireOrganizador(array $allowedRoles = [], ?int $explicitRachaId = null, ?PDO $customPdo = null): array
    {
        if (empty($allowedRoles)) {
            throw new HttpError('Acesso negado. Nenhum papel foi explicitamente autorizado para esta operação.', 403);
        }

        $scope = self::resolveScope($explicitRachaId, $customPdo);

        if (!$scope['isOrganizador'] || empty($scope['userRole'])) {
            throw new HttpError('Acesso negado. Você não é organizador deste racha.', 403);
        }

        if (!in_array($scope['userRole'], $allowedRoles, true)) {
            $papeis = implode(', ', $allowedRoles);
            throw new HttpError("Acesso negado. Esta operação exige papel de: {$papeis}.", 403);
        }

        return $scope;
    }

    /**
     * Exige papel estrito de 'dono' do racha
     */
    public static function requireDono(?int $explicitRachaId = null, ?PDO $customPdo = null): array
    {
        return self::requireOrganizador(['dono'], $explicitRachaId, $customPdo);
    }

    /**
     * Exige papel financeiro ou superior ('dono', 'financeiro')
     */
    public static function requireFinanceiro(?int $explicitRachaId = null, ?PDO $customPdo = null): array
    {
        return self::requireOrganizador(['dono', 'financeiro'], $explicitRachaId, $customPdo);
    }

    /**
     * Exige papel de auxiliar ou superior ('dono', 'financeiro', 'auxiliar')
     */
    public static function requireAuxiliarOrHigher(?int $explicitRachaId = null, ?PDO $customPdo = null): array
    {
        return self::requireOrganizador(['dono', 'financeiro', 'auxiliar'], $explicitRachaId, $customPdo);
    }

    /**
     * Permite acesso a qualquer participante matriculado ou organizador do racha
     */
    public static function requireParticipanteOrOrganizador(?int $explicitRachaId = null, ?PDO $customPdo = null): array
    {
        $scope = self::resolveScope($explicitRachaId, $customPdo);

        if ($scope['userRole'] === null) {
            throw new HttpError('Acesso negado. Você não possui vínculo ou permissão neste racha.', 403);
        }

        return $scope;
    }

    /**
     * Helper para extração insensível a maiúsculas de headers HTTP
     */
    public static function getHeader(string $name): ?string
    {
        if (function_exists('getallheaders')) {
            $headers = getallheaders();
            foreach ($headers as $k => $v) {
                if (strcasecmp($k, $name) === 0) {
                    return (string)$v;
                }
            }
        }

        $serverKey = 'HTTP_' . strtoupper(str_replace('-', '_', $name));
        if (isset($_SERVER[$serverKey])) {
            return (string)$_SERVER[$serverKey];
        }

        return null;
    }
}
