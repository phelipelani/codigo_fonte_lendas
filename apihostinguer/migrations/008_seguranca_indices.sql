-- Migration 008: segurança + índices
-- (também incluída no migrations/run.php — rode por lá OU por aqui, não os dois)
--
-- ANTES de rodar, confira se há emails duplicados:
--   SELECT email, COUNT(*) c FROM usuarios
--   WHERE email IS NOT NULL AND email <> ''
--   GROUP BY email HAVING c > 1;
-- Se retornar linhas, resolva manualmente (decida qual conta fica com o email)
-- e só então rode o ALTER abaixo.

-- Email único — impede duas contas com o mesmo email
-- (fecha o vetor de sequestro de conta via login Google por email)
ALTER TABLE usuarios
  ADD UNIQUE INDEX uk_usuarios_email (email);

-- Índice para o lookup do login Google
ALTER TABLE usuarios
  ADD INDEX idx_usuarios_google_id (google_id);

-- Índice para validação/limpeza de convites por validade
ALTER TABLE convites
  ADD INDEX idx_convites_expira (expira_em);
