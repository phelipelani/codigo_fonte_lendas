-- =============================================================================
-- MIGRATION 006: TABELA DE AUDITORIA E EVENTOS DE SESSÕES
-- Arquivo: 006_create_sessao_eventos.sql
-- =============================================================================

CREATE TABLE IF NOT EXISTS `racha_sessao_eventos` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `sessao_id` INT UNSIGNED NOT NULL,
  `racha_id` INT UNSIGNED NOT NULL,
  `tipo_evento` ENUM('criacao','homologacao','reabertura','conclusao','cancelamento') NOT NULL,
  `usuario_id` INT(11) NOT NULL,
  `motivo` VARCHAR(255) NULL,
  `detalhes` JSON NULL,
  `criado_em` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_rse_sessao` (`sessao_id`, `criado_em`),
  CONSTRAINT `fk_rse_sessao_racha` FOREIGN KEY (`sessao_id`, `racha_id`) REFERENCES `racha_sessoes` (`id`, `racha_id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_rse_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
