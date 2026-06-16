-- =====================================================================
-- /campo  Fase 3.1 — categoria detalhada nos compromissos da Agenda
-- O ENUM `tipo` (treino/jogo/reuniao/outro) continua pra compatibilidade;
-- `categoria` guarda o tipo fino usado na UI (treino_tecnico, treino_tatico,
-- treino_fisico, analise, amistoso, jogo_oficial).
-- =====================================================================

ALTER TABLE campo_agenda
  ADD COLUMN categoria VARCHAR(40) NULL AFTER tipo;
