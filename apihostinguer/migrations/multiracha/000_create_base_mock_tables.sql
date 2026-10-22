-- =============================================================================
-- MIGRATION BASE: ESTRUTURAS BÁSICAS MOCK PARA SANDBOX (USUÁRIOS E JOGADORES)
-- Arquivo: 000_create_base_mock_tables.sql
-- Tipos rigorosamente idênticos a db_futlendas_clone.sql:
-- usuarios.id: INT(11) | jogadores.id: INT(11)
-- =============================================================================

CREATE TABLE IF NOT EXISTS `usuarios` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `username` VARCHAR(255) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL DEFAULT '',
  `role` VARCHAR(50) NOT NULL DEFAULT 'user',
  `email` VARCHAR(255) DEFAULT NULL,
  `whatsapp` VARCHAR(20) DEFAULT NULL,
  `google_id` VARCHAR(255) DEFAULT NULL,
  `ativo` TINYINT(1) NOT NULL DEFAULT 1,
  `criado_em` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_sandbox_username` (`username`),
  UNIQUE KEY `uk_sandbox_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `jogadores` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `nome` VARCHAR(255) NOT NULL,
  `role` VARCHAR(50) NOT NULL DEFAULT 'player',
  `posicao` VARCHAR(50) NOT NULL DEFAULT 'linha',
  `usuario_id` INT(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_sandbox_jogador_nome` (`nome`),
  KEY `idx_sandbox_jogadores_usuario` (`usuario_id`),
  CONSTRAINT `fk_sandbox_jogadores_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Carga inicial controlada com DADOS FICTÍCIOS para testes em Sandbox
INSERT IGNORE INTO `usuarios` (`id`, `username`, `password_hash`, `role`, `email`, `whatsapp`) VALUES
(1, 'dev_admin', '', 'admin', 'admin@sandbox.local', '5512900000001'),
(2, 'dev_organizador', '', 'admin', 'organizador@sandbox.local', '5512900000002'),
(3, 'dev_financeiro', '', 'user', 'financeiro@sandbox.local', '5512900000003'),
(4, 'dev_auxiliar', '', 'user', 'auxiliar@sandbox.local', '5512900000004'),
(5, 'dev_jogador', '', 'user', 'jogador@sandbox.local', '5512900000005'),
(6, 'lani', '$2b$10$bZ1QLbMYk6XxF9qTNLXAw.1N1Yxyi55TBbqMATkLu0NUBlixN0L.O', 'admin', 'lani@futlendas.com.br', '5512978131357');

INSERT IGNORE INTO `jogadores` (`id`, `nome`, `posicao`, `usuario_id`) VALUES
(1, 'Atleta Teste 1', 'linha', 1),
(2, 'Atleta Teste 2', 'linha', 2),
(3, 'Atleta Teste 3', 'goleiro', 3),
(4, 'Atleta Teste 4', 'linha', 4),
(5, 'Atleta Teste 5', 'linha', 5),
(6, 'Atleta Teste 6', 'linha', NULL),
(7, 'Atleta Teste 7', 'linha', NULL),
(8, 'Atleta Teste 8', 'goleiro', NULL),
(9, 'Atleta Teste 9', 'linha', NULL),
(10, 'Atleta Teste 10', 'linha', NULL);
