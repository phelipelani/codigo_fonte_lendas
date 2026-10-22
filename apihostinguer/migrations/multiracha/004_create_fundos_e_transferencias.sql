-- =============================================================================
-- MIGRATION 004: FUNDOS E TRANSFERÊNCIAS
-- Arquivo: 004_create_fundos_e_transferencias.sql
-- =============================================================================

CREATE TABLE IF NOT EXISTS `financeiro_fundos` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `racha_id` INT UNSIGNED NOT NULL,
  `nome` VARCHAR(50) NOT NULL,
  `tipo` ENUM('geral','bola','confraternizacao','outro') NOT NULL DEFAULT 'geral',
  `descricao` VARCHAR(200) NULL,
  `ativo` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_ff_id_racha` (`id`, `racha_id`),
  UNIQUE KEY `uk_ff_racha_nome` (`racha_id`, `nome`),
  CONSTRAINT `fk_ff_racha` FOREIGN KEY (`racha_id`) REFERENCES `rachas` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `financeiro_transferencias` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `racha_id` INT UNSIGNED NOT NULL,
  `fundo_origem_id` INT UNSIGNED NOT NULL,
  `fundo_destino_id` INT UNSIGNED NOT NULL,
  `valor` DECIMAL(10,2) NOT NULL,
  `data_transferencia` DATE NOT NULL,
  `motivo` VARCHAR(255) NOT NULL,
  `chave_idempotencia` VARCHAR(64) NOT NULL,
  `criado_por_usuario_id` INT(11) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_ft_id_racha` (`id`, `racha_id`),
  UNIQUE KEY `uk_ft_idempotencia` (`chave_idempotencia`),
  CONSTRAINT `chk_ft_valor_positivo` CHECK (`valor` > 0.00),
  CONSTRAINT `chk_ft_fundos_distintos` CHECK (`fundo_origem_id` <> `fundo_destino_id`),
  CONSTRAINT `fk_ft_racha` FOREIGN KEY (`racha_id`) REFERENCES `rachas` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_ft_origem_racha` FOREIGN KEY (`fundo_origem_id`, `racha_id`) REFERENCES `financeiro_fundos` (`id`, `racha_id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_ft_destino_racha` FOREIGN KEY (`fundo_destino_id`, `racha_id`) REFERENCES `financeiro_fundos` (`id`, `racha_id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_ft_usuario` FOREIGN KEY (`criado_por_usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
