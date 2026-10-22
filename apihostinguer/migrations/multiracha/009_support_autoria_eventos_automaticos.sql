-- =============================================================================
-- MIGRATION 009: MODELO DE AUTORIA PARA EVENTOS AUTOMÁTICOS (WHATSAPP E SISTEMA)
-- Arquivo: 009_support_autoria_eventos_automaticos.sql
-- =============================================================================

-- Distingue explicitamente:
-- 1. 'usuario': ação humana executada por usuário autenticado (exige usuario_id NOT NULL).
-- 2. 'jogador_whatsapp': resposta automática identificada de um jogador via WhatsApp (exige usuario_id IS NULL e jogador_id NOT NULL).
-- 3. 'sistema': operação automática executada pelo motor backend, como promoção automática da fila (exige usuario_id IS NULL).
-- Preserva a FK fk_rse_usuario e as triggers append-only trg_rse_prevent_update e trg_rse_prevent_delete.

ALTER TABLE `racha_sessao_eventos`
  MODIFY COLUMN `usuario_id` INT(11) NULL,
  ADD COLUMN `tipo_ator` ENUM('usuario','jogador_whatsapp','sistema') NOT NULL DEFAULT 'usuario' AFTER `tipo_evento`,
  ADD COLUMN `mensagem_externa_id` VARCHAR(120) NULL AFTER `substituiu_jogador_id`,
  ADD KEY `idx_rse_sessao_msg_ext` (`sessao_id`, `mensagem_externa_id`),
  ADD CONSTRAINT `chk_rse_autoria_coerente` CHECK (
      (`tipo_ator` = 'usuario' AND `usuario_id` IS NOT NULL)
      OR (`tipo_ator` = 'jogador_whatsapp' AND `usuario_id` IS NULL AND `jogador_id` IS NOT NULL)
      OR (`tipo_ator` = 'sistema' AND `usuario_id` IS NULL)
  );
