-- =============================================================================
-- ROLLBACK 011: REVERTE FECHAMENTO DE CONVOCAÇÃO E RENOVAÇÃO MENSAL
-- Arquivo: down/011_drop_fechamento_convocacao_e_renovacao_mensal.sql
-- =============================================================================

DROP TABLE IF EXISTS `racha_mensalistas_renovacoes`;

ALTER TABLE `racha_sessoes`
  DROP FOREIGN KEY `fk_rs_fechamento_convocacao_user`,
  DROP COLUMN `fechamento_convocacao_por_usuario_id`,
  DROP COLUMN `fechamento_convocacao_em`,
  DROP COLUMN `status_convocacao`;

ALTER TABLE `rachas`
  DROP COLUMN `instrucoes_pagamento`,
  DROP COLUMN `chave_pix`;

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
      'substituicao_participante',
      'preparacao_convocacao',
      'intencao_recebida',
      'entrada_fila_espera',
      'recusa_convocacao',
      'promocao_fila_espera'
  ) NOT NULL;
