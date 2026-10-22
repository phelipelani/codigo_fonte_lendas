-- =============================================================================
-- MIGRATION 003: SESSÕES E PRESENÇAS
-- Arquivo: 003_create_sessoes_e_presencas.sql
-- =============================================================================

CREATE TABLE IF NOT EXISTS `racha_sessoes` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `racha_id` INT UNSIGNED NOT NULL,
  `data_racha` DATE NOT NULL,
  `horario_abertura` DATETIME NULL,
  `horario_fechamento` DATETIME NULL,
  `status` ENUM('agendada','aberta','em_andamento','concluida','cancelada') NOT NULL DEFAULT 'agendada',
  `motivo_cancelamento` VARCHAR(255) NULL,
  `apuracao_presenca` ENUM('nao_iniciada','em_andamento','homologada','legada_sem_sumula') NOT NULL DEFAULT 'nao_iniciada',
  `homologado_por_usuario_id` INT(11) NULL,
  `homologado_em` DATETIME NULL,
  `lista_legada_id` INT(10) UNSIGNED NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_rs_id_racha` (`id`, `racha_id`),
  UNIQUE KEY `uk_rs_racha_data` (`racha_id`, `data_racha`),
  CONSTRAINT `fk_rs_racha` FOREIGN KEY (`racha_id`) REFERENCES `rachas` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_rs_homologador` FOREIGN KEY (`homologado_por_usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `racha_sessao_presencas` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `sessao_id` INT UNSIGNED NOT NULL,
  `racha_id` INT UNSIGNED NOT NULL,
  `jogador_id` INT(11) NOT NULL,
  `categoria` ENUM('mensalista','avulso') NOT NULL,
  `status_presenca` ENUM(
      'presente',
      'cancelado_no_prazo',
      'falta_justificada',
      'falta_injustificada',
      'pendente_apuracao',
      'historico_legado_intencao'
  ) NOT NULL DEFAULT 'pendente_apuracao',
  `intencao_original_bot` VARCHAR(50) NULL,
  `motivo_falta_justificada` VARCHAR(255) NULL,
  `substituiu_jogador_id` INT(11) NULL,
  `hora_confirmacao` DATETIME NULL,
  `confirmado_por` ENUM('whatsapp_bot','organizador_manual','jogador_app','legado') NOT NULL DEFAULT 'organizador_manual',
  `alterado_por_usuario_id` INT(11) NULL,
  `alterado_em` DATETIME NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_rsp_sessao_jogador` (`sessao_id`, `jogador_id`),
  CONSTRAINT `fk_rsp_sessao_racha` FOREIGN KEY (`sessao_id`, `racha_id`) REFERENCES `racha_sessoes` (`id`, `racha_id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_rsp_participante` FOREIGN KEY (`racha_id`, `jogador_id`) REFERENCES `racha_participantes` (`racha_id`, `jogador_id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_rsp_substituido` FOREIGN KEY (`substituiu_jogador_id`) REFERENCES `jogadores` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_rsp_alterador` FOREIGN KEY (`alterado_por_usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
