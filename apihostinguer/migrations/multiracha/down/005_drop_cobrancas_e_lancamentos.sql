-- =============================================================================
-- ROLLBACK 005: DROP COBRANÇAS E LANÇAMENTOS
-- Arquivo: down/005_drop_cobrancas_e_lancamentos.sql
-- =============================================================================

DROP TABLE IF EXISTS `financeiro_lancamentos`;
DROP TABLE IF EXISTS `financeiro_cobrancas`;
