-- =============================================================================
-- ROLLBACK 003: DROP SESSÕES E PRESENÇAS
-- Arquivo: down/003_drop_sessoes_e_presencas.sql
-- =============================================================================

DROP TABLE IF EXISTS `racha_sessao_presencas`;
DROP TABLE IF EXISTS `racha_sessoes`;
