-- =============================================================================
-- ROLLBACK 008: REVERTE CONVOCAÇÕES, FILA DE ESPERA E CAMPOS WHATSAPP EM JOGADORES
-- Arquivo: down/008_drop_convocacoes_e_fila_espera.sql
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
  ) NOT NULL;

DROP TABLE IF EXISTS `racha_sessao_respostas_idempotencia`;

DROP TABLE IF EXISTS `racha_sessao_convocacoes`;

DROP TABLE IF EXISTS `racha_sessao_fila_contadores`;

ALTER TABLE `jogadores`
  DROP INDEX `idx_jogadores_whatsapp`,
  DROP COLUMN `apelido_bot`,
  DROP COLUMN `whatsapp`;
