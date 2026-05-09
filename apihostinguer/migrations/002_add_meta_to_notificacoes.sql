-- Migration 002: Rename dados_json to meta in notificacoes
-- The code (NotificacoesController::criar) uses 'meta' but the table has 'dados_json'

ALTER TABLE notificacoes CHANGE COLUMN dados_json meta TEXT NULL DEFAULT NULL;
