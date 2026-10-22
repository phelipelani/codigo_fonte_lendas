<?php
/**
 * BATERIA DE TESTES AUTOMATIZADOS EM SANDBOX (FASE 4.0 - ETAPA 3B.3)
 * Arquivo: apihostinguer/scripts/test_sandbox.php
 *
 * Executa testes rigorosos sobre as migrations, rollback seguro, triggers append-only
 * e privilégios mínimos do usuário de runtime em db_futlendas_sandbox, SEM apagar
 * registros de auditoria (racha_sessao_eventos).
 */

putenv('ENVIRONMENT=sandbox');
$_ENV['ENVIRONMENT'] = 'sandbox';

require_once __DIR__ . '/../config/database_sandbox.php';
require_once __DIR__ . '/migrate_sandbox.php';

class SandboxTestSuite
{
    private PDO $adminPdo;
    private PDO $appPdo;
    private SandboxMigrationRunner $runner;
    private int $passed = 0;
    private int $failed = 0;

    public function __construct()
    {
        // Prepara um schema descartável limpo no sandbox (sem executar DELETE em eventos)
        SandboxDatabase::resetDisposableSandboxSchema(false);
        $this->adminPdo = SandboxDatabase::getAdminConnection();
        $this->runner = new SandboxMigrationRunner($this->adminPdo);
        $this->runner->up();
        $this->appPdo = SandboxDatabase::getConnection(true);
    }

    private function assertTest(string $name, callable $fn): void
    {
        echo "TESTANDO: {$name}... ";
        try {
            $fn($this->appPdo, $this->adminPdo, $this->runner);
            echo "APROVADO (PASS)\n";
            $this->passed++;
        } catch (Throwable $e) {
            echo "FALHOU (FAIL): " . $e->getMessage() . "\n";
            $this->failed++;
        }
    }

    public function runAll(): void
    {
        echo "====================================================================\n";
        echo " INICIANDO SUÍTE DE TESTES NO SANDBOX (db_futlendas_sandbox)\n";
        echo "====================================================================\n\n";

        // =====================================================================
        // TESTE 1: Verificação do schema completo (UP das 10 migrations)
        // =====================================================================
        $this->assertTest("1. Execução limpa das migrations (UP)", function (PDO $appPdo, PDO $adminPdo, SandboxMigrationRunner $runner) {
            $tables = [
                'schema_migrations', 'usuarios', 'jogadores', 'rachas', 'racha_organizadores',
                'racha_participantes', 'racha_mensalistas', 'racha_sessoes',
                'racha_sessao_presencas', 'racha_sessao_eventos',
                'racha_sessao_fila_contadores', 'racha_sessao_convocacoes', 'racha_sessao_respostas_idempotencia',
                'racha_whatsapp_instancias', 'racha_whatsapp_mensagens',
                'financeiro_fundos', 'financeiro_transferencias', 'financeiro_cobrancas', 'financeiro_lancamentos'
            ];
            foreach ($tables as $t) {
                $chk = $adminPdo->query("SHOW TABLES LIKE '{$t}'")->fetch();
                if (!$chk) {
                    throw new Exception("Tabela esperada '{$t}' não foi encontrada após UP!");
                }
            }
        });

        // =====================================================================
        // TESTE 2: Reexecução idempotente de migrations
        // =====================================================================
        $this->assertTest("2. Reexecução idempotente (nenhuma migration repetida)", function (PDO $appPdo, PDO $adminPdo, SandboxMigrationRunner $runner) {
            $appliedCount = $runner->up();
            if ($appliedCount !== 0) {
                throw new Exception("Esperado 0 migrations aplicadas na reexecução, mas foram aplicadas {$appliedCount}!");
            }
        });

        // =====================================================================
        // TESTE 3: Rollback Seguro (DOWN completo) enquanto tabelas estão vazias
        // (Executado antes de inserir dados operacionais para não apagar auditoria)
        // =====================================================================
        $this->assertTest("3. Rollback Seguro (DOWN completo de todas as migrations) com tabelas vazias", function (PDO $appPdo, PDO $adminPdo, SandboxMigrationRunner $runner) {
            $appliedCount = (int)$adminPdo->query("SELECT COUNT(*) FROM `schema_migrations` WHERE `version` != '000'")->fetchColumn();
            $reverted = $runner->down($appliedCount);
            if ($reverted !== $appliedCount) {
                throw new Exception("Esperado {$appliedCount} migrations revertidas, mas foram {$reverted}!");
            }

            $chk = $adminPdo->query("SHOW TABLES LIKE 'rachas'")->fetch();
            if ($chk) {
                throw new Exception("Tabela 'rachas' ainda existe após rollback completo!");
            }
        });

        // =====================================================================
        // TESTE 4: Reaplicação pós-rollback (Ciclo completo validado)
        // =====================================================================
        $this->assertTest("4. Reaplicação das migrations pós-rollback", function (PDO $appPdo, PDO $adminPdo, SandboxMigrationRunner $runner) {
            $count = $runner->up();
            if ($count < 10) {
                throw new Exception("Esperado reaplicar pelo menos 10 migrations, mas foram {$count}!");
            }
        });

        // =====================================================================
        // TESTE 5: Integridade referencial composta (Racha x Fundo)
        // =====================================================================
        $this->assertTest("5. Bloqueio de Fundo pertencente a outro Racha em Cobrança", function (PDO $appPdo) {
            $appPdo->exec("INSERT INTO rachas (id, nome, dia_semana, horario_inicio, local_nome) VALUES (1, 'Racha Terça Teste', 'terca', '20:00', 'Arena Caiçara') ON DUPLICATE KEY UPDATE id=1");
            $appPdo->exec("INSERT INTO rachas (id, nome, dia_semana, horario_inicio, local_nome) VALUES (2, 'Racha Quinta Teste', 'quinta', '19:00', 'Arena Caiçara') ON DUPLICATE KEY UPDATE id=2");

            $appPdo->exec("INSERT INTO financeiro_fundos (id, racha_id, nome, tipo) VALUES (10, 1, 'Caixa Geral R1', 'geral') ON DUPLICATE KEY UPDATE id=10");
            $appPdo->exec("INSERT INTO financeiro_fundos (id, racha_id, nome, tipo) VALUES (20, 2, 'Caixa Geral R2', 'geral') ON DUPLICATE KEY UPDATE id=20");

            $appPdo->exec("INSERT INTO racha_participantes (racha_id, jogador_id, tipo_participacao) VALUES (1, 1, 'mensalista') ON DUPLICATE KEY UPDATE id=id");

            try {
                $appPdo->exec("
                    INSERT INTO financeiro_cobrancas (racha_id, jogador_id, fundo_id, tipo, competencia_mes, competencia_ano, valor_original, valor_desconto, valor_final, data_vencimento)
                    VALUES (1, 1, 20, 'mensalidade', 10, 2026, 60.00, 0.00, 60.00, '2026-10-10')
                ");
                throw new Exception("FALHA: O banco permitiu vincular cobrança do Racha 1 a um fundo do Racha 2!");
            } catch (PDOException $e) {
                if (strpos($e->getMessage(), 'fk_fc_fundo_racha') === false && $e->getCode() != '23000') {
                    throw $e;
                }
            }
        });

        // =====================================================================
        // TESTE 6: Tentativa de vincular jogador não matriculado no racha (Presença)
        // =====================================================================
        $this->assertTest("6. Bloqueio de Jogador de outro racha em Presenças", function (PDO $appPdo) {
            $appPdo->exec("INSERT INTO racha_sessoes (id, racha_id, data_racha, status) VALUES (100, 1, '2026-10-20', 'agendada') ON DUPLICATE KEY UPDATE id=100");

            try {
                $appPdo->exec("
                    INSERT INTO racha_sessao_presencas (sessao_id, racha_id, jogador_id, categoria, status_presenca)
                    VALUES (100, 1, 2, 'avulso', 'presente')
                ");
                throw new Exception("FALHA: O banco permitiu registrar presença de jogador não matriculado no Racha 1!");
            } catch (PDOException $e) {
                if ($e->getCode() != '23000') {
                    throw $e;
                }
            }
        });

        // =====================================================================
        // TESTE 7: Consistência matemática das cobranças (CHECK constraint)
        // =====================================================================
        $this->assertTest("7. Consistência matemática obrigatória em Cobranças", function (PDO $appPdo) {
            try {
                $appPdo->exec("
                    INSERT INTO financeiro_cobrancas (racha_id, jogador_id, fundo_id, tipo, competencia_mes, competencia_ano, valor_original, valor_desconto, valor_final, data_vencimento)
                    VALUES (1, 1, 10, 'mensalidade', 10, 2026, 60.00, 10.00, 55.00, '2026-10-10')
                ");
                throw new Exception("FALHA: O banco aceitou cobrança com matemática inconsistente!");
            } catch (PDOException $e) {
                // Sucesso
            }

            try {
                $appPdo->exec("
                    INSERT INTO financeiro_cobrancas (racha_id, jogador_id, fundo_id, tipo, competencia_mes, competencia_ano, valor_original, valor_desconto, valor_final, data_vencimento)
                    VALUES (1, 1, 10, 'mensalidade', 10, 2026, 60.00, 70.00, -10.00, '2026-10-10')
                ");
                throw new Exception("FALHA: O banco aceitou desconto maior que valor original!");
            } catch (PDOException $e) {
                // Sucesso
            }

            $appPdo->exec("
                INSERT INTO financeiro_cobrancas (id, racha_id, jogador_id, fundo_id, tipo, competencia_mes, competencia_ano, valor_original, valor_desconto, valor_final, data_vencimento)
                VALUES (500, 1, 1, 10, 'mensalidade', 10, 2026, 60.00, 10.00, 50.00, '2026-10-10')
                ON DUPLICATE KEY UPDATE valor_final=50.00
            ");
        });

        // =====================================================================
        // TESTE 8: Histórico de mensalistas (reentrância, suspensão e unicidade de ativos)
        // =====================================================================
        $this->assertTest("8. Histórico de Mensalistas (Vínculo Aberto Único e Reentrância)", function (PDO $appPdo) {
            $appPdo->exec("INSERT INTO racha_participantes (racha_id, jogador_id, tipo_participacao) VALUES (1, 3, 'mensalista') ON DUPLICATE KEY UPDATE id=id");
            $appPdo->exec("INSERT INTO racha_mensalistas (racha_id, jogador_id, data_inicio, data_fim, status) VALUES (1, 3, '2026-01-01', NULL, 'ativo')");

            try {
                $appPdo->exec("INSERT INTO racha_mensalistas (racha_id, jogador_id, data_inicio, data_fim, status) VALUES (1, 3, '2026-05-01', NULL, 'ativo')");
                throw new Exception("FALHA: Permitiu dois contratos ATIVOS simultâneos!");
            } catch (PDOException $e) {
                // Sucesso
            }

            $appPdo->exec("UPDATE racha_mensalistas SET status = 'inativo', data_fim = '2026-06-30' WHERE racha_id = 1 AND jogador_id = 3 AND status = 'ativo'");
            $appPdo->exec("INSERT INTO racha_mensalistas (racha_id, jogador_id, data_inicio, data_fim, status) VALUES (1, 3, '2026-08-01', NULL, 'ativo')");
            $appPdo->exec("UPDATE racha_mensalistas SET status = 'suspenso' WHERE racha_id = 1 AND jogador_id = 3 AND status = 'ativo'");

            try {
                $appPdo->exec("INSERT INTO racha_mensalistas (racha_id, jogador_id, data_inicio, data_fim, status) VALUES (1, 3, '2026-09-01', NULL, 'ativo')");
                throw new Exception("FALHA: Permitiu criar contrato ativo enquanto havia um vínculo SUSPENSO!");
            } catch (PDOException $e) {
                // Sucesso
            }
        });

        // =====================================================================
        // TESTE 9: Unicidade das pernas de transferência inter-fundos
        // =====================================================================
        $this->assertTest("9. Unicidade das Pernas de Transferência (uk_fl_transf_perna)", function (PDO $appPdo) {
            $appPdo->exec("INSERT INTO financeiro_fundos (id, racha_id, nome, tipo) VALUES (11, 1, 'Fundo Bola', 'bola') ON DUPLICATE KEY UPDATE id=11");

            $appPdo->exec("
                INSERT INTO financeiro_transferencias (id, racha_id, fundo_origem_id, fundo_destino_id, valor, data_transferencia, motivo, chave_idempotencia, criado_por_usuario_id)
                VALUES (700, 1, 10, 11, 100.00, '2026-10-20', 'Repasse Bola', 'idemp_transf_test_01', 1)
                ON DUPLICATE KEY UPDATE id=700
            ");

            $appPdo->exec("
                INSERT INTO financeiro_lancamentos (racha_id, fundo_id, transferencia_id, tipo, categoria, valor, data_movimento, descricao, chave_idempotencia, criado_por_usuario_id)
                VALUES (1, 10, 700, 'transferencia_saida', 'Transferência', 100.00, '2026-10-20', 'Saída Fundo Geral', 'idemp_fl_saida_01', 1)
            ");

            try {
                $appPdo->exec("
                    INSERT INTO financeiro_lancamentos (racha_id, fundo_id, transferencia_id, tipo, categoria, valor, data_movimento, descricao, chave_idempotencia, criado_por_usuario_id)
                    VALUES (1, 10, 700, 'transferencia_saida', 'Transferência', 100.00, '2026-10-20', 'Segunda Saída Indevida', 'idemp_fl_saida_02', 1)
                ");
                throw new Exception("FALHA: O banco permitiu duas saídas para a mesma transferência!");
            } catch (PDOException $e) {
                // Sucesso
            }

            $appPdo->exec("
                INSERT INTO financeiro_lancamentos (racha_id, fundo_id, transferencia_id, tipo, categoria, valor, data_movimento, descricao, chave_idempotencia, criado_por_usuario_id)
                VALUES (1, 11, 700, 'transferencia_entrada', 'Transferência', 100.00, '2026-10-20', 'Entrada Fundo Bola', 'idemp_fl_entrada_01', 1)
            ");
        });

        // =====================================================================
        // TESTE 10: Trava de Rollback Seguro com Dados Presentes
        // =====================================================================
        $this->assertTest("10. Bloqueio automático de Rollback diante de tabelas com dados", function (PDO $appPdo, PDO $adminPdo, SandboxMigrationRunner $runner) {
            $appPdo->exec("
                INSERT INTO racha_sessao_eventos (sessao_id, racha_id, tipo_evento, usuario_id, motivo)
                VALUES (100, 1, 'criacao', 1, 'Evento teste de segurança append-only')
            ");
            $appPdo->exec("
                INSERT INTO racha_whatsapp_instancias (racha_id, instance_name, status_conexao, webhook_secret_hash)
                VALUES (1, 'futlendas_racha_1', 'desconectado', '" . hash('sha256', 'segredo') . "')
            ");
            $appPdo->exec("
                INSERT INTO racha_mensalistas_renovacoes (racha_id, jogador_id, competencia_ano, competencia_mes, valor_cobrado, status_envio)
                VALUES (1, 1, 2026, 10, 50.00, 'enviado')
            ");

            try {
                $runner->down(1);
                throw new Exception("FALHA: O rollback reverteu migration mesmo contendo dados operacionais!");
            } catch (RuntimeException $e) {
                if (strpos($e->getMessage(), 'ROLLBACK ABORTADO POR SEGURANÇA') === false) {
                    throw $e;
                }
            }
        });

        // =====================================================================
        // TESTE 11: Proteção Append-Only (Triggers + Privilégios Restritos de Runtime)
        // =====================================================================
        $this->assertTest("11. Rejeição de UPDATE e DELETE em racha_sessao_eventos (Privilégios e Triggers)", function (PDO $appPdo, PDO $adminPdo) {
            // 11a. Confirma que a aplicação NÃO está conectada como root
            $currentUser = (string)$appPdo->query("SELECT CURRENT_USER()")->fetchColumn();
            if (stripos($currentUser, 'root@') === 0) {
                throw new Exception("FALHA DE SEGURANÇA: Conexão de runtime conectada como root ({$currentUser})!");
            }
            if (stripos($currentUser, 'futlendas_app_sandbox@') !== 0) {
                throw new Exception("Usuário de runtime inesperado: {$currentUser}");
            }

            // 11b. Tentativa de UPDATE pelo usuário de runtime -> DEVE FALHAR (sem privilégio UPDATE e bloqueado por trigger)
            $updateBlockedApp = false;
            try {
                $appPdo->exec("UPDATE racha_sessao_eventos SET motivo = 'Adulterado' WHERE sessao_id = 100");
            } catch (PDOException $e) {
                $updateBlockedApp = true;
            }
            if (!$updateBlockedApp) {
                throw new Exception("FALHA: O usuário de runtime conseguiu executar UPDATE em racha_sessao_eventos!");
            }

            // 11c. Tentativa de DELETE pelo usuário de runtime -> DEVE FALHAR (sem privilégio DELETE e bloqueado por trigger)
            $deleteBlockedApp = false;
            try {
                $appPdo->exec("DELETE FROM racha_sessao_eventos WHERE sessao_id = 100");
            } catch (PDOException $e) {
                $deleteBlockedApp = true;
            }
            if (!$deleteBlockedApp) {
                throw new Exception("FALHA: O usuário de runtime conseguiu executar DELETE em racha_sessao_eventos!");
            }

            // 11d. Tentativa de UPDATE mesmo pela conexão administrativa -> DEVE FALHAR pela trigger trg_rse_prevent_update (SQLSTATE 45000)
            $updateBlockedTrigger = false;
            try {
                $adminPdo->exec("UPDATE racha_sessao_eventos SET motivo = 'Adulterado por admin' WHERE sessao_id = 100");
            } catch (PDOException $e) {
                if ($e->getCode() === '45000' || strpos($e->getMessage(), 'AUDITORIA PROTEGIDA') !== false) {
                    $updateBlockedTrigger = true;
                }
            }
            if (!$updateBlockedTrigger) {
                throw new Exception("FALHA: A trigger trg_rse_prevent_update não bloqueou UPDATE na tabela de eventos!");
            }

            // 11e. Tentativa de DELETE mesmo pela conexão administrativa -> DEVE FALHAR pela trigger trg_rse_prevent_delete (SQLSTATE 45000)
            $deleteBlockedTrigger = false;
            try {
                $adminPdo->exec("DELETE FROM racha_sessao_eventos WHERE sessao_id = 100");
            } catch (PDOException $e) {
                if ($e->getCode() === '45000' || strpos($e->getMessage(), 'AUDITORIA PROTEGIDA') !== false) {
                    $deleteBlockedTrigger = true;
                }
            }
            if (!$deleteBlockedTrigger) {
                throw new Exception("FALHA: A trigger trg_rse_prevent_delete não bloqueou DELETE na tabela de eventos!");
            }

            // Confirma que o evento permanece intacto no banco
            $cnt = (int)$appPdo->query("SELECT COUNT(*) FROM racha_sessao_eventos WHERE sessao_id = 100 AND motivo = 'Evento teste de segurança append-only'")->fetchColumn();
            if ($cnt !== 1) {
                throw new Exception("O evento de auditoria não foi preservado intacto!");
            }
        });

        echo "\n====================================================================\n";
        echo " RESULTADO FINAL DOS TESTES NO SANDBOX:\n";
        echo " APROVADOS: {$this->passed} | FALHAS: {$this->failed}\n";
        echo "====================================================================\n";

        if ($this->failed > 0) {
            exit(1);
        }
    }
}

// Execução
$suite = new SandboxTestSuite();
$suite->runAll();
