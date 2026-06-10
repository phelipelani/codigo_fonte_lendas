-- =====================================================================
-- /campo  Fase 2.1 — local do jogo (nome do campo + bairro) na partida
-- =====================================================================

ALTER TABLE campo_partidas
  ADD COLUMN local_nome   VARCHAR(160) NULL AFTER local,
  ADD COLUMN local_bairro VARCHAR(120) NULL AFTER local_nome;
