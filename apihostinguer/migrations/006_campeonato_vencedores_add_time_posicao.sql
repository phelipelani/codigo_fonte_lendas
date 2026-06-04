-- ============================================================================
-- Migration 006: Adiciona time_id e posicao em campeonato_vencedores
-- O PHP tenta inserir esses campos mas a tabela só tinha campeonato_id e jogador_id
-- ============================================================================

ALTER TABLE campeonato_vencedores
  ADD COLUMN IF NOT EXISTS `time_id`  INT(11) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `posicao`  INT(11) DEFAULT 1;

-- Adiciona FK se ainda não existir
-- (só roda se a coluna não tinha FK antes)
-- ALTER TABLE campeonato_vencedores
--   ADD CONSTRAINT fk_cv_time FOREIGN KEY (time_id) REFERENCES times(id) ON DELETE SET NULL;
