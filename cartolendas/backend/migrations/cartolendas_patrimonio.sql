-- ================================================================
-- MIGRAÇÃO: Cartolendas - Patrimônio e Valorização
-- Rodar ANTES de fazer upload dos novos controllers
-- ================================================================

-- 1. cartolendas_ranking: adiciona patrimônio (valor total do time em LendaCoins)
ALTER TABLE cartolendas_ranking
  ADD COLUMN IF NOT EXISTS `patrimonio` DECIMAL(10,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS `patrimonio_anterior` DECIMAL(10,2) DEFAULT 0.00;

-- 2. cartolendas_times: snapshot do patrimônio após cada rodada
ALTER TABLE cartolendas_times
  ADD COLUMN IF NOT EXISTS patrimonio_apos DECIMAL(10,2) DEFAULT NULL;

-- 3. cartolendas_escalacao: preço do jogador APÓS a rodada finalizar (para histórico de valorização)
ALTER TABLE cartolendas_escalacao
  ADD COLUMN IF NOT EXISTS preco_apos_rodada DECIMAL(10,2) DEFAULT NULL;
