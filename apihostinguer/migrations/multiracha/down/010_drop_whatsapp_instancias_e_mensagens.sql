-- =============================================================================
-- ROLLBACK 010: REMOVE TABELAS DE INSTÂNCIAS WHATSAPP E LOG DE MENSAGENS
-- Arquivo: down/010_drop_whatsapp_instancias_e_mensagens.sql
-- =============================================================================

DROP TABLE IF EXISTS `racha_whatsapp_mensagens`;
DROP TABLE IF EXISTS `racha_whatsapp_instancias`;
