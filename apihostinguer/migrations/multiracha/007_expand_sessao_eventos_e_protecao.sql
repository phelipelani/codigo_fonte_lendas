-- =============================================================================
-- MIGRATION 007: AUDITORIA COMPLETA DE PRESENÇAS/SUBSTITUIÇÕES E PROTEÇÃO APPEND-ONLY
-- Arquivo: 007_expand_sessao_eventos_e_protecao.sql
-- =============================================================================

ALTER TABLE `racha_sessao_eventos`
  MODIFY COLUMN `tipo_evento` ENUM(
      'criacao',
      'homologacao',
      'reabertura',
      'conclusao',
      'cancelamento',
      'alteracao_status_sessao',
      'confirmacao_presenca',
      'alteracao_presenca',
      'cancelamento_participacao',
      'substituicao_participante'
  ) NOT NULL,
  ADD COLUMN `jogador_id` INT(11) NULL AFTER `usuario_id`,
  ADD COLUMN `substituiu_jogador_id` INT(11) NULL AFTER `jogador_id`,
  ADD COLUMN `status_anterior` VARCHAR(50) NULL AFTER `substituiu_jogador_id`,
  ADD COLUMN `status_novo` VARCHAR(50) NULL AFTER `status_anterior`,
  ADD KEY `idx_rse_sessao_jogador` (`sessao_id`, `jogador_id`, `id`),
  ADD CONSTRAINT `fk_rse_jogador` FOREIGN KEY (`jogador_id`) REFERENCES `jogadores` (`id`) ON DELETE RESTRICT,
  ADD CONSTRAINT `fk_rse_substituido` FOREIGN KEY (`substituiu_jogador_id`) REFERENCES `jogadores` (`id`) ON DELETE RESTRICT;

DROP TRIGGER IF EXISTS `trg_rse_prevent_update`;

CREATE TRIGGER `trg_rse_prevent_update`
BEFORE UPDATE ON `racha_sessao_eventos`
FOR EACH ROW
SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'AUDITORIA PROTEGIDA: Registros em racha_sessao_eventos sao append-only e nao podem ser alterados.';

DROP TRIGGER IF EXISTS `trg_rse_prevent_delete`;

CREATE TRIGGER `trg_rse_prevent_delete`
BEFORE DELETE ON `racha_sessao_eventos`
FOR EACH ROW
SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'AUDITORIA PROTEGIDA: Registros em racha_sessao_eventos sao append-only e nao podem ser excluidos.';
