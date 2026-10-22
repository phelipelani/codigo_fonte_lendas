-- =============================================================================
-- MIGRATION 002: PARTICIPANTES E MENSALISTAS
-- Arquivo: 002_create_participantes_e_mensalistas.sql
-- =============================================================================

CREATE TABLE IF NOT EXISTS `racha_participantes` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `racha_id` INT UNSIGNED NOT NULL,
  `jogador_id` INT(11) NOT NULL,
  `tipo_participacao` ENUM('mensalista','avulso_recorrente','avulso_convidado') NOT NULL DEFAULT 'avulso_convidado',
  `ativo` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_rp_racha_jogador` (`racha_id`, `jogador_id`),
  CONSTRAINT `fk_rp_racha` FOREIGN KEY (`racha_id`) REFERENCES `rachas` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_rp_jogador` FOREIGN KEY (`jogador_id`) REFERENCES `jogadores` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `racha_mensalistas` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `racha_id` INT UNSIGNED NOT NULL,
  `jogador_id` INT(11) NOT NULL,
  `valor_individual` DECIMAL(10,2) NULL,
  `isento` TINYINT(1) NOT NULL DEFAULT 0,
  `motivo_isencao` VARCHAR(150) NULL,
  `isencao_valida_ate` DATE NULL,
  `dia_vencimento` TINYINT UNSIGNED NULL,
  `data_inicio` DATE NOT NULL,
  `data_fim` DATE NULL,
  `status` ENUM('ativo','inativo','suspenso') NOT NULL DEFAULT 'ativo',
  `vinculo_aberto_idx` INT(11) GENERATED ALWAYS AS (IF(`status` IN ('ativo','suspenso'), `jogador_id`, NULL)) VIRTUAL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_rm_racha_jogador_aberto` (`racha_id`, `vinculo_aberto_idx`),
  UNIQUE KEY `uk_rm_id_racha` (`id`, `racha_id`),
  CONSTRAINT `chk_rm_datas` CHECK (`data_fim` IS NULL OR `data_fim` >= `data_inicio`),
  CONSTRAINT `chk_rm_valor_indiv` CHECK (`valor_individual` IS NULL OR `valor_individual` >= 0),
  CONSTRAINT `fk_rm_racha` FOREIGN KEY (`racha_id`) REFERENCES `rachas` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_rm_participante` FOREIGN KEY (`racha_id`, `jogador_id`) REFERENCES `racha_participantes` (`racha_id`, `jogador_id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
