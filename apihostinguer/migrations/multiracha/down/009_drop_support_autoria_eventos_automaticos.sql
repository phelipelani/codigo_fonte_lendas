-- =============================================================================
-- ROLLBACK 009: REVERTE SUPORTE A AUTORIA AUTOMÁTICA EM RACHA_SESSAO_EVENTOS
-- Arquivo: down/009_drop_support_autoria_eventos_automaticos.sql
-- =============================================================================

ALTER TABLE `racha_sessao_eventos`
  DROP CONSTRAINT `chk_rse_autoria_coerente`,
  DROP INDEX `idx_rse_sessao_msg_ext`,
  DROP COLUMN `mensagem_externa_id`,
  DROP COLUMN `tipo_ator`,
  MODIFY COLUMN `usuario_id` INT(11) NOT NULL;
