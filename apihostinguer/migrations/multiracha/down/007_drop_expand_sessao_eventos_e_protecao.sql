-- =============================================================================
-- ROLLBACK 007: REVERTE EXPANSÃO E TRIGGERS DE AUDITORIA DE SESSÕES
-- Arquivo: down/007_drop_expand_sessao_eventos_e_protecao.sql
-- =============================================================================

DROP TRIGGER IF EXISTS `trg_rse_prevent_update`;

DROP TRIGGER IF EXISTS `trg_rse_prevent_delete`;

ALTER TABLE `racha_sessao_eventos`
  DROP FOREIGN KEY `fk_rse_jogador`,
  DROP FOREIGN KEY `fk_rse_substituido`,
  DROP INDEX `idx_rse_sessao_jogador`,
  DROP COLUMN `jogador_id`,
  DROP COLUMN `substituiu_jogador_id`,
  DROP COLUMN `status_anterior`,
  DROP COLUMN `status_novo`,
  MODIFY COLUMN `tipo_evento` ENUM('criacao','homologacao','reabertura','conclusao','cancelamento') NOT NULL;
