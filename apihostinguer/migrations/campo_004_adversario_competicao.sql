-- =====================================================================
-- /campo  Fase 2.3 — competicao no adversario
-- =====================================================================

ALTER TABLE campo_adversarios
  ADD COLUMN competicao VARCHAR(80) NULL AFTER nome;
