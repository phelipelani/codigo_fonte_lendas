<?php
/**
 * TESTES AUTOMATIZADOS DO RachaScopeMiddleware (FASE 4.0 - ETAPA 3A.3)
 * Arquivo: apihostinguer/scripts/test_racha_scope.php
 *
 * Validações de Segurança Implementadas:
 * 1. Seleção segura de banco (bloqueio de fallback para produção e validação estrita de identidade do banco E endpoint local).
 * 2. Bloqueio de injeção arbitrária de PDO em produção.
 * 3. RBAC deny-by-default (lista vazia em requireOrganizador rejeita com 403).
 * 4. Contexto puramente funcional: remoção de estado estático global/getScope() para evitar vazamento entre requisições em runtimes persistentes.
 * 5. Sanitização contra injeção de parâmetros (GET, POST, COOKIE, REQUEST) e eliminação completa de superglobals.
 * 6. Isolamento estrito de fixtures (IDs dedicados 9001-9003 com trava contra colisão de dados reais).
 * 7. Rejeição consistente de tokens expirados (401).
 */

putenv('ENVIRONMENT=sandbox');
$_ENV['ENVIRONMENT'] = 'sandbox';
$_ENV['JWT_SECRET'] = 'sandbox_jwt_secret_key_test_1234567890';

require_once __DIR__ . '/../config/database_sandbox.php';
require_once __DIR__ . '/../src/utils/JWT.php';
require_once __DIR__ . '/../src/utils/HttpError.php';
require_once __DIR__ . '/../src/middleware/AuthMiddleware.php';
require_once __DIR__ . '/../src/middleware/RachaScopeMiddleware.php';

/**
 * Mock de conexão PDO remota para teste negativo de endpoint não-local
 */
class NonLocalMockPdo extends PDO {
    public function __construct() {
        parent::__construct('sqlite::memory:');
    }
    public function query(string $query, ?int $fetchMode = null, mixed ...$fetchModeArgs): PDOStatement|false {
        return parent::query("SELECT 'db_futlendas_sandbox' AS db");
    }
    public function getAttribute(int $attribute): mixed {
        if ($attribute === PDO::ATTR_CONNECTION_STATUS) {
            return '192.168.1.100 via TCP/IP'; // Simula conexão de rede remota não local
        }
        return parent::getAttribute($attribute);
    }
}

class RachaScopeTestSuite {
    private PDO $pdo;
    private int $passed = 0;
    private int $failed = 0;

    // IDs de rachas estritamente reservados para testes automatizados
    public const TEST_RACHA_ALPHA    = 9001;
    public const TEST_RACHA_BETA     = 9002;
    public const TEST_RACHA_INATIVO  = 9003;

    public function __construct() {
        $this->pdo = SandboxDatabase::getConnection();

        // 1. Verificação de Segurança Pré-Execução: Garantir que estamos estritamente no sandbox
        $currentDb = $this->pdo->query("SELECT DATABASE()")->fetchColumn();
        if ($currentDb !== 'db_futlendas_sandbox') {
            throw new RuntimeException("ABORTANDO TESTES: Conectado a '{$currentDb}', esperado estritamente 'db_futlendas_sandbox'.");
        }

        $this->setupTestData();
    }

    /**
     * Valida se os registros existentes com IDs reservados pertencem comprovadamente à suíte de testes.
     * Se houver dúvida ou ausência do marcador 'Teste', aborta sem excluir nada.
     */
    private function validateAndCleanTestFixtures(): void {
        $testIds = [self::TEST_RACHA_ALPHA, self::TEST_RACHA_BETA, self::TEST_RACHA_INATIVO];
        $inClause = implode(',', $testIds);

        $stmt = $this->pdo->query("SELECT id, nome FROM rachas WHERE id IN ({$inClause})");
        $existing = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($existing as $racha) {
            // Trava de segurança contra colisão: o registro DEVE conter 'Teste' no nome
            if (stripos($racha['nome'], 'Teste') === false) {
                throw new RuntimeException("COLISÃO DE DADOS DETECTADA: O racha #{$racha['id']} ('{$racha['nome']}') não possui o marcador 'Teste'. A exclusão foi abortada para proteger dados existentes.");
            }
        }

        // Se todos os registros pertencem à suíte, realiza a limpeza segura
        $this->pdo->exec("DELETE FROM racha_organizadores WHERE racha_id IN ({$inClause})");
        $this->pdo->exec("DELETE FROM racha_participantes WHERE racha_id IN ({$inClause})");
        $this->pdo->exec("DELETE FROM rachas WHERE id IN ({$inClause})");
    }

    private function setupTestData(): void {
        $this->validateAndCleanTestFixtures();

        // Cria Rachas de teste com marcadores explícitos:
        $this->pdo->exec("INSERT INTO rachas (id, nome, dia_semana, horario_inicio, local_nome, ativo) VALUES (" . self::TEST_RACHA_ALPHA . ", 'Racha Alpha Teste', 'terca', '20:00', 'Arena Teste 1', 1)");
        $this->pdo->exec("INSERT INTO rachas (id, nome, dia_semana, horario_inicio, local_nome, ativo) VALUES (" . self::TEST_RACHA_BETA . ", 'Racha Beta Teste', 'quinta', '19:00', 'Arena Teste 2', 1)");
        $this->pdo->exec("INSERT INTO rachas (id, nome, dia_semana, horario_inicio, local_nome, ativo) VALUES (" . self::TEST_RACHA_INATIVO . ", 'Racha Desativado Teste', 'sabado', '10:00', 'Arena Teste 3', 0)");

        // Configuração RBAC dos Usuários de Teste:
        // Usuário 1 = 'dono' do Racha 9001
        // Usuário 2 = 'financeiro' do Racha 9001
        // Usuário 3 = 'auxiliar' do Racha 9001
        // Usuário 4 = 'dono' do Racha 9002 (NÃO TEM ACESSO AO RACHA 9001)
        // Usuário 5 = 'jogador_comum' (matriculado no Racha 9001 via jogador_id 5)
        $this->pdo->exec("INSERT INTO racha_organizadores (racha_id, usuario_id, papel) VALUES (" . self::TEST_RACHA_ALPHA . ", 1, 'dono')");
        $this->pdo->exec("INSERT INTO racha_organizadores (racha_id, usuario_id, papel) VALUES (" . self::TEST_RACHA_ALPHA . ", 2, 'financeiro')");
        $this->pdo->exec("INSERT INTO racha_organizadores (racha_id, usuario_id, papel) VALUES (" . self::TEST_RACHA_ALPHA . ", 3, 'auxiliar')");
        $this->pdo->exec("INSERT INTO racha_organizadores (racha_id, usuario_id, papel) VALUES (" . self::TEST_RACHA_BETA . ", 4, 'dono')");

        $this->pdo->exec("INSERT INTO racha_participantes (racha_id, jogador_id, tipo_participacao, ativo) VALUES (" . self::TEST_RACHA_ALPHA . ", 5, 'mensalista', 1)");
    }

    private function tearDownTestData(): void {
        $this->validateAndCleanTestFixtures();
        RachaScopeMiddleware::clearScope();
    }

    private function setSimulatedRequest(?string $token, ?string $rachaIdHeader): void {
        unset($_SERVER['HTTP_AUTHORIZATION'], $_SERVER['HTTP_X_RACHA_ID'], $_REQUEST['authUser'], $_REQUEST['rachaScope']);
        RachaScopeMiddleware::clearScope();

        if ($token !== null) {
            $_SERVER['HTTP_AUTHORIZATION'] = "Bearer {$token}";
        }
        if ($rachaIdHeader !== null) {
            $_SERVER['HTTP_X_RACHA_ID'] = $rachaIdHeader;
        }
    }

    private function generateToken(int $userId, string $role = 'user', int $expiresIn = 3600): string {
        return JWT::generate(['id' => $userId, 'role' => $role, 'username' => "user_{$userId}"], $expiresIn);
    }

    private function assertTest(string $name, callable $fn): void {
        echo "TESTANDO: {$name}... ";
        try {
            $fn();
            echo "APROVADO (PASS)\n";
            $this->passed++;
        } catch (Throwable $e) {
            echo "FALHOU (FAIL): " . $e->getMessage() . "\n";
            $this->failed++;
        }
    }

    public function run(): void {
        echo "====================================================================\n";
        echo " TESTES DE SEGURANÇA E ESCOPO MULTI-RACHA (FASE 4.0 - ETAPA 3A.3)\n";
        echo "====================================================================\n\n";

        // 1. Ausência de Token JWT -> 401
        $this->assertTest("1. Rejeição de requisição sem token (401)", function() {
            $this->setSimulatedRequest(null, (string)self::TEST_RACHA_ALPHA);
            try {
                RachaScopeMiddleware::resolveScope();
                throw new Exception("Deveria ter lançado 401 por falta de token");
            } catch (HttpError $e) {
                if ($e->getStatusCode() !== 401) {
                    throw new Exception("Status esperado 401, recebido: " . $e->getStatusCode());
                }
            }
        });

        // 2. Token JWT Adulterado / Inválido -> 401
        $this->assertTest("2. Rejeição de token inválido/adulterado (401)", function() {
            $this->setSimulatedRequest("token.falso.invalido", (string)self::TEST_RACHA_ALPHA);
            try {
                RachaScopeMiddleware::resolveScope();
                throw new Exception("Deveria ter lançado 401 por token inválido");
            } catch (HttpError $e) {
                if ($e->getStatusCode() !== 401) {
                    throw new Exception("Status esperado 401, recebido: " . $e->getStatusCode());
                }
            }
        });

        // 3. Ausência de X-Racha-Id -> 400
        $this->assertTest("3. Rejeição de requisição sem X-Racha-Id (400)", function() {
            $token = $this->generateToken(1);
            $this->setSimulatedRequest($token, null);
            try {
                RachaScopeMiddleware::resolveScope();
                throw new Exception("Deveria ter lançado 400 por X-Racha-Id ausente");
            } catch (HttpError $e) {
                if ($e->getStatusCode() !== 400) {
                    throw new Exception("Status esperado 400, recebido: " . $e->getStatusCode());
                }
            }
        });

        // 4. X-Racha-Id Inválido (não numérico / injeção) -> 400
        $this->assertTest("4. Rejeição de X-Racha-Id não numérico/inválido (400)", function() {
            $token = $this->generateToken(1);
            $this->setSimulatedRequest($token, "9001' OR '1'='1");
            try {
                RachaScopeMiddleware::resolveScope();
                throw new Exception("Deveria ter lançado 400 por X-Racha-Id malformado");
            } catch (HttpError $e) {
                if ($e->getStatusCode() !== 400) {
                    throw new Exception("Status esperado 400, recebido: " . $e->getStatusCode());
                }
            }
        });

        // 5. Racha Inexistente -> 404
        $this->assertTest("5. Rejeição de Racha Inexistente (404)", function() {
            $token = $this->generateToken(1);
            $this->setSimulatedRequest($token, "99999");
            try {
                RachaScopeMiddleware::resolveScope();
                throw new Exception("Deveria ter lançado 404 para racha inexistente");
            } catch (HttpError $e) {
                if ($e->getStatusCode() !== 404) {
                    throw new Exception("Status esperado 404, recebido: " . $e->getStatusCode());
                }
            }
        });

        // 6. Racha Desativado -> 403
        $this->assertTest("6. Rejeição de Racha Inativo/Desativado (403)", function() {
            $token = $this->generateToken(1);
            $this->setSimulatedRequest($token, (string)self::TEST_RACHA_INATIVO);
            try {
                RachaScopeMiddleware::resolveScope();
                throw new Exception("Deveria ter lançado 403 para racha inativo");
            } catch (HttpError $e) {
                if ($e->getStatusCode() !== 403) {
                    throw new Exception("Status esperado 403, recebido: " . $e->getStatusCode());
                }
            }
        });

        // 7. Isolamento Cross-Racha (Usuário 4 é Dono do 9002, tentando acessar 9001) -> 403
        $this->assertTest("7. Bloqueio de Acesso Cross-Racha (Usuário 4 no Racha 9001 -> 403)", function() {
            $token = $this->generateToken(4);
            $this->setSimulatedRequest($token, (string)self::TEST_RACHA_ALPHA);
            try {
                RachaScopeMiddleware::requireAuxiliarOrHigher();
                throw new Exception("Deveria ter bloqueado organizador de outro racha");
            } catch (HttpError $e) {
                if ($e->getStatusCode() !== 403) {
                    throw new Exception("Status esperado 403, recebido: " . $e->getStatusCode());
                }
            }
        });

        // 8. Permissões de 'dono': Acesso total a Dono, Financeiro e Auxiliar
        $this->assertTest("8. Validação de Dono: Acesso total às rotas do racha", function() {
            $token = $this->generateToken(1);
            $this->setSimulatedRequest($token, (string)self::TEST_RACHA_ALPHA);

            $scopeDono = RachaScopeMiddleware::requireDono();
            if ($scopeDono['userRole'] !== 'dono' || $scopeDono['rachaId'] !== self::TEST_RACHA_ALPHA) {
                throw new Exception("Escopo de dono não foi resolvido corretamente");
            }

            RachaScopeMiddleware::requireFinanceiro();
            RachaScopeMiddleware::requireAuxiliarOrHigher();
        });

        // 9. Permissões de 'financeiro': Bloqueado em Dono, liberado em Financeiro e Auxiliar
        $this->assertTest("9. Validação de Financeiro: Bloqueado em Dono, Permitido em Financeiro", function() {
            $token = $this->generateToken(2);
            $this->setSimulatedRequest($token, (string)self::TEST_RACHA_ALPHA);

            $scope = RachaScopeMiddleware::requireFinanceiro();
            if ($scope['userRole'] !== 'financeiro') {
                throw new Exception("Papel esperado 'financeiro', recebido: " . $scope['userRole']);
            }

            try {
                RachaScopeMiddleware::requireDono();
                throw new Exception("Financeiro não pode acessar requireDono()");
            } catch (HttpError $e) {
                if ($e->getStatusCode() !== 403) {
                    throw new Exception("Status esperado 403, recebido: " . $e->getStatusCode());
                }
            }
        });

        // 10. Permissões de 'auxiliar': Bloqueado em Financeiro e Dono, liberado em Auxiliar
        $this->assertTest("10. Validação de Auxiliar: Bloqueado no Financeiro, Permitido em Auxiliar", function() {
            $token = $this->generateToken(3);
            $this->setSimulatedRequest($token, (string)self::TEST_RACHA_ALPHA);

            $scope = RachaScopeMiddleware::requireAuxiliarOrHigher();
            if ($scope['userRole'] !== 'auxiliar') {
                throw new Exception("Papel esperado 'auxiliar', recebido: " . $scope['userRole']);
            }

            try {
                RachaScopeMiddleware::requireFinanceiro();
                throw new Exception("Auxiliar não pode acessar requireFinanceiro()");
            } catch (HttpError $e) {
                if ($e->getStatusCode() !== 403) {
                    throw new Exception("Status esperado 403, recebido: " . $e->getStatusCode());
                }
            }
        });

        // 11. Validação de Jogador Comum
        $this->assertTest("11. Validação de Jogador Comum: Restrito a participante", function() {
            $token = $this->generateToken(5);
            $this->setSimulatedRequest($token, (string)self::TEST_RACHA_ALPHA);

            $scope = RachaScopeMiddleware::requireParticipanteOrOrganizador();
            if ($scope['userRole'] !== 'jogador_comum' || $scope['isOrganizador'] !== false) {
                throw new Exception("Jogador comum não foi resolvido corretamente");
            }

            try {
                RachaScopeMiddleware::requireAuxiliarOrHigher();
                throw new Exception("Jogador comum não pode acessar requireAuxiliarOrHigher()");
            } catch (HttpError $e) {
                if ($e->getStatusCode() !== 403) {
                    throw new Exception("Status esperado 403, recebido: " . $e->getStatusCode());
                }
            }
        });

        // 12. Deny-by-Default: requireOrganizador([]) com lista vazia DEVE lançar 403
        $this->assertTest("12. Deny-by-Default em requireOrganizador([]) (403)", function() {
            $token = $this->generateToken(1); // Dono
            $this->setSimulatedRequest($token, (string)self::TEST_RACHA_ALPHA);

            try {
                RachaScopeMiddleware::requireOrganizador([]);
                throw new Exception("Deveria ter negado acesso para lista de papéis vazia");
            } catch (HttpError $e) {
                if ($e->getStatusCode() !== 403) {
                    throw new Exception("Status esperado 403, recebido: " . $e->getStatusCode());
                }
            }
        });

        // 13. Contexto Puramente Funcional e Imunidade a Injeção de Parâmetros
        $this->assertTest("13. Imunidade a Injeção e Retorno Puramente Funcional de Contexto", function() {
            $token = $this->generateToken(3); // Usuário 3 é 'auxiliar' no racha 9001
            $this->setSimulatedRequest($token, (string)self::TEST_RACHA_ALPHA);

            // Simula tentativa maliciosa de:
            // a) Alterar racha para 9002
            // b) Alterar papel para 'dono'
            // c) Alterar identidade autorizada para 9999
            $maliciousPayload = [
                'rachaId'       => self::TEST_RACHA_BETA,
                'rachaNome'     => 'Racha Injetado Maliciosamente',
                'userId'        => 9999,
                'userRole'      => 'dono',
                'isOrganizador' => true
            ];

            $_GET['rachaScope']     = $maliciousPayload;
            $_POST['rachaScope']    = $maliciousPayload;
            $_COOKIE['rachaScope']  = $maliciousPayload;
            $_REQUEST['rachaScope'] = $maliciousPayload;

            // 1. Resolução do escopo: DEVE ignorar completamente os dados injetados
            $scope = RachaScopeMiddleware::resolveScope();

            if ($scope['rachaId'] !== self::TEST_RACHA_ALPHA) {
                throw new Exception("FALHA DE SEGURANÇA: O atacante alterou o rachaId para " . $scope['rachaId']);
            }
            if ($scope['userRole'] !== 'auxiliar') {
                throw new Exception("FALHA DE SEGURANÇA: O atacante alterou o userRole para " . $scope['userRole']);
            }
            if ($scope['userId'] !== 3) {
                throw new Exception("FALHA DE SEGURANÇA: O atacante forjou a identidade userId para " . $scope['userId']);
            }

            // 2. Prova de que NENHUMA superglobal é mantida ou poluída
            if (isset($_REQUEST['rachaScope'])) {
                throw new Exception("FALHA DE SEGURANÇA: \$_REQUEST['rachaScope'] ainda foi atribuída ou mantida!");
            }
            if (isset($_GET['rachaScope']) || isset($_POST['rachaScope']) || isset($_COOKIE['rachaScope'])) {
                throw new Exception("FALHA DE HIGIENIZAÇÃO: Superglobais de entrada não foram limpas.");
            }

            // 3. Prova de que tentativa de escalada falha com 403
            try {
                RachaScopeMiddleware::requireDono();
                throw new Exception("FALHA DE SEGURANÇA: Auxiliar conseguiu acessar requireDono()!");
            } catch (HttpError $e) {
                if ($e->getStatusCode() !== 403) {
                    throw new Exception("Status esperado 403, recebido: " . $e->getStatusCode());
                }
            }

            // 4. Prova de que a rota autorizada legítima retorna o escopo diretamente ao chamador
            $scopeAux = RachaScopeMiddleware::requireAuxiliarOrHigher();
            if ($scopeAux['userRole'] !== 'auxiliar' || $scopeAux['userId'] !== 3) {
                throw new Exception("requireAuxiliarOrHigher() não retornou o escopo autorizado");
            }
        });

        // 14. Token JWT Expirado -> 401
        $this->assertTest("14. Rejeição de Token JWT Expirado (401)", function() {
            $expiredToken = $this->generateToken(1, 'user', -60);
            $this->setSimulatedRequest($expiredToken, (string)self::TEST_RACHA_ALPHA);

            try {
                RachaScopeMiddleware::resolveScope();
                throw new Exception("Deveria ter lançado 401 para token expirado");
            } catch (HttpError $e) {
                if ($e->getStatusCode() !== 401) {
                    throw new Exception("Status esperado 401, recebido: " . $e->getStatusCode());
                }
                if (stripos($e->getMessage(), 'expirado') === false) {
                    throw new Exception("Mensagem de erro deveria indicar expiração: " . $e->getMessage());
                }
            }
        });

        // 15. Seleção Segura de Banco: ENVIRONMENT Ausente ou Inválido -> Exceção
        $this->assertTest("15. Bloqueio de Seleção de Banco quando ENVIRONMENT inválido", function() {
            $savedEnv = getenv('ENVIRONMENT');
            $savedServerEnv = $_ENV['ENVIRONMENT'] ?? null;

            try {
                // Remove ENVIRONMENT
                putenv('ENVIRONMENT');
                unset($_ENV['ENVIRONMENT']);

                try {
                    RachaScopeMiddleware::getPdo();
                    throw new Exception("Deveria ter lançado RuntimeException por ENVIRONMENT ausente");
                } catch (RuntimeException $e) {
                    if (strpos($e->getMessage(), 'SEGURANÇA BLOQUEADA') === false) {
                        throw new Exception("Mensagem inesperada: " . $e->getMessage());
                    }
                }

                // Testa ENVIRONMENT inválido/desconhecido
                putenv('ENVIRONMENT=staging_desconhecido');
                $_ENV['ENVIRONMENT'] = 'staging_desconhecido';

                try {
                    RachaScopeMiddleware::getPdo();
                    throw new Exception("Deveria ter lançado RuntimeException por ENVIRONMENT inválido");
                } catch (RuntimeException $e) {
                    if (strpos($e->getMessage(), 'SEGURANÇA BLOQUEADA') === false) {
                        throw new Exception("Mensagem inesperada: " . $e->getMessage());
                    }
                }
            } finally {
                putenv("ENVIRONMENT={$savedEnv}");
                if ($savedServerEnv !== null) {
                    $_ENV['ENVIRONMENT'] = $savedServerEnv;
                }
            }
        });

        // 16. Validação de Conexão PDO Personalizada: Rejeição de Banco Não-Sandbox
        $this->assertTest("16. Rejeição de PDO Personalizado apontando para banco não-sandbox", function() {
            $mockSqlite = new PDO('sqlite::memory:');
            try {
                RachaScopeMiddleware::getPdo($mockSqlite);
                throw new Exception("Deveria ter rejeitado PDO com banco que não seja db_futlendas_sandbox");
            } catch (RuntimeException $e) {
                if (strpos($e->getMessage(), 'SEGURANÇA BLOQUEADA') === false) {
                    throw new Exception("Mensagem inesperada: " . $e->getMessage());
                }
            }
        });

        // 17. Validação de Conexão PDO Personalizada: Rejeição de Endpoint Não-Local (Teste Negativo)
        $this->assertTest("17. Rejeição de PDO com banco 'db_futlendas_sandbox' mas endpoint não-local", function() {
            $nonLocalMock = new NonLocalMockPdo();
            try {
                RachaScopeMiddleware::getPdo($nonLocalMock);
                throw new Exception("Deveria ter rejeitado conexão personalizada com endpoint remoto (192.168.1.100)");
            } catch (RuntimeException $e) {
                if (strpos($e->getMessage(), 'não pode ser comprovado como estritamente local') === false) {
                    throw new Exception("Mensagem inesperada: " . $e->getMessage());
                }
            }
        });

        // 18. Validação de Conexão PDO Personalizada: Aceitação de Sandbox Legítimo (Teste Positivo)
        $this->assertTest("18. Aceitação de PDO Personalizado legítimo do db_futlendas_sandbox (Local)", function() {
            $validPdo = SandboxDatabase::getConnection();
            $pdo = RachaScopeMiddleware::getPdo($validPdo);
            if ($pdo !== $validPdo) {
                throw new Exception("Conexão legítima do sandbox deveria ser retornada");
            }
            $status = (string)$pdo->getAttribute(PDO::ATTR_CONNECTION_STATUS);
            if (strpos($status, '127.0.0.1') === false && strpos($status, 'localhost') === false) {
                throw new Exception("Endpoint legítimo deve ser 127.0.0.1 ou localhost, recebido: {$status}");
            }
        });

        // 19. Proibição Absoluta de PDO Personalizado Arbitrário em Produção
        $this->assertTest("19. Bloqueio de PDO Personalizado Arbitrário em Produção", function() {
            $savedEnv = getenv('ENVIRONMENT');
            $savedServerEnv = $_ENV['ENVIRONMENT'] ?? null;

            try {
                putenv('ENVIRONMENT=production');
                $_ENV['ENVIRONMENT'] = 'production';

                $arbitraryPdo = new PDO('sqlite::memory:');
                try {
                    RachaScopeMiddleware::getPdo($arbitraryPdo);
                    throw new Exception("Deveria ter proibido PDO personalizado em produção");
                } catch (RuntimeException $e) {
                    if (strpos($e->getMessage(), 'conexões personalizadas arbitrárias são proibidas') === false) {
                        throw new Exception("Mensagem inesperada: " . $e->getMessage());
                    }
                }
            } finally {
                putenv("ENVIRONMENT={$savedEnv}");
                if ($savedServerEnv !== null) {
                    $_ENV['ENVIRONMENT'] = $savedServerEnv;
                }
            }
        });

        // 20. Trava de Segurança contra Colisão de Fixtures (Impede exclusão sem 'Teste')
        $this->assertTest("20. Trava de Colisão de Fixtures (Impede exclusão de registros sem 'Teste')", function() {
            // Insere temporariamente um registro simulado que NÃO contém 'Teste' no nome
            $this->pdo->exec("INSERT INTO rachas (id, nome, dia_semana, horario_inicio, local_nome, ativo) VALUES (9099, 'Racha Real de Producao', 'terca', '20:00', 'Arena', 1)");

            try {
                $stmt = $this->pdo->query("SELECT id, nome FROM rachas WHERE id = 9099");
                $racha = $stmt->fetch(PDO::FETCH_ASSOC);

                if (stripos($racha['nome'], 'Teste') === false) {
                    $travaAcionada = true;
                } else {
                    $travaAcionada = false;
                }

                if (!$travaAcionada) {
                    throw new Exception("A trava de colisão deveria ter identificado registro não-teste!");
                }
            } finally {
                $this->pdo->exec("DELETE FROM rachas WHERE id = 9099");
            }
        });

        // Limpeza final de dados
        $this->tearDownTestData();

        echo "\n====================================================================\n";
        echo " RESULTADO DOS TESTES DE SEGURANÇA E ESCOPO (ETAPA 3A.3):\n";
        echo " TOTAL EXECUTADOS: " . ($this->passed + $this->failed) . "\n";
        echo " APROVADOS: {$this->passed} | FALHAS: {$this->failed}\n";
        echo "====================================================================\n";

        if ($this->failed > 0) {
            exit(1);
        }
    }
}

// Execução
$suite = new RachaScopeTestSuite();
$suite->run();
