-- =============================================================================
-- MIGRATION 001: RACHAS E ORGANIZADORES (RBAC)
-- Arquivo: 001_create_rachas_e_organizadores.sql
-- =============================================================================

CREATE TABLE IF NOT EXISTS `rachas` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `nome` VARCHAR(100) NOT NULL,
  `dia_semana` ENUM('segunda','terca','quarta','quinta','sexta','sabado','domingo') NOT NULL,
  `horario_inicio` TIME NOT NULL,
  `horario_fim` TIME NULL,
  `local_nome` VARCHAR(120) NOT NULL,
  `valor_mensalidade_padrao` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `valor_avulso_padrao` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `dia_vencimento_padrao` TINYINT UNSIGNED NOT NULL DEFAULT 10,
  `limite_vagas` TINYINT UNSIGNED NOT NULL DEFAULT 20,
  `ativo` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `chk_racha_valores` CHECK (`valor_mensalidade_padrao` >= 0 AND `valor_avulso_padrao` >= 0),
  CONSTRAINT `chk_racha_vencimento` CHECK (`dia_vencimento_padrao` BETWEEN 1 AND 31)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `racha_organizadores` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `racha_id` INT UNSIGNED NOT NULL,
  `usuario_id` INT(11) NOT NULL,
  `papel` ENUM('dono','financeiro','auxiliar') NOT NULL DEFAULT 'auxiliar',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_ro_racha_usuario` (`racha_id`, `usuario_id`),
  CONSTRAINT `fk_ro_racha` FOREIGN KEY (`racha_id`) REFERENCES `rachas` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_ro_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
