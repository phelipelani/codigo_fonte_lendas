-- ============================================================
-- FASE 4 — Índices de performance + ajustes finais
--
-- Execute após validar a Fase 3.
-- Índices nas tabelas ANTIGAS para não quebrar queries durante a transição.
-- Índices nas tabelas NOVAS para performance dos novos controllers.
-- ============================================================

-- ------------------------------------------------------------
-- Índices nas tabelas ANTIGAS (melhoram performance imediata)
-- ------------------------------------------------------------

-- campeonato_estatisticas_partida: analytics atual fica mais rápido
ALTER TABLE `campeonato_estatisticas_partida`
  ADD INDEX IF NOT EXISTS `idx_jogador`          (`jogador_id`),
  ADD INDEX IF NOT EXISTS `idx_partida`          (`partida_id`),
  ADD INDEX IF NOT EXISTS `idx_time`             (`time_id`),
  ADD INDEX IF NOT EXISTS `idx_jog_partida`      (`jogador_id`, `partida_id`);

-- campeonato_eventos_partida: sinergia e duplas ficam mais rápidos
ALTER TABLE `campeonato_eventos_partida`
  ADD INDEX IF NOT EXISTS `idx_jogador`          (`jogador_id`),
  ADD INDEX IF NOT EXISTS `idx_partida`          (`partida_id`),
  ADD INDEX IF NOT EXISTS `idx_assist`           (`assist_por_jogador_id`),
  ADD INDEX IF NOT EXISTS `idx_tipo`             (`tipo`);

-- campeonato_partidas: filtro por status é o mais usado
ALTER TABLE `campeonato_partidas`
  ADD INDEX IF NOT EXISTS `idx_status`           (`status`),
  ADD INDEX IF NOT EXISTS `idx_campeonato`       (`campeonato_id`),
  ADD INDEX IF NOT EXISTS `idx_rodada`           (`rodada_id`),
  ADD INDEX IF NOT EXISTS `idx_timeA`            (`timeA_id`),
  ADD INDEX IF NOT EXISTS `idx_timeB`            (`timeB_id`),
  ADD INDEX IF NOT EXISTS `idx_camp_status`      (`campeonato_id`, `status`);

-- rodadas
ALTER TABLE `rodadas`
  ADD INDEX IF NOT EXISTS `idx_competicao`       (`competicao_id`),
  ADD INDEX IF NOT EXISTS `idx_campeonato`       (`campeonato_id`),
  ADD INDEX IF NOT EXISTS `idx_liga`             (`liga_id`);

-- campeonato_elencos
ALTER TABLE `campeonato_elencos`
  ADD INDEX IF NOT EXISTS `idx_campeonato`       (`campeonato_id`),
  ADD INDEX IF NOT EXISTS `idx_time`             (`time_id`),
  ADD INDEX IF NOT EXISTS `idx_jogador`          (`jogador_id`);

-- premios_rodada
ALTER TABLE `premios_rodada`
  ADD INDEX IF NOT EXISTS `idx_rodada`           (`rodada_id`),
  ADD INDEX IF NOT EXISTS `idx_jogador`          (`jogador_id`);

-- campeonato_premios
ALTER TABLE `campeonato_premios`
  ADD INDEX IF NOT EXISTS `idx_campeonato`       (`campeonato_id`),
  ADD INDEX IF NOT EXISTS `idx_jogador`          (`jogador_id`);

-- jogadores
ALTER TABLE `jogadores`
  ADD INDEX IF NOT EXISTS `idx_usuario`          (`usuario_id`),
  ADD INDEX IF NOT EXISTS `idx_grupo`            (`grupo_id`);

-- times
ALTER TABLE `times`
  ADD INDEX IF NOT EXISTS `idx_grupo`            (`grupo_id`);

-- ------------------------------------------------------------
-- Índices nas tabelas NOVAS (já criados na fase2, confirmar)
-- ------------------------------------------------------------

-- competicoes
ALTER TABLE `competicoes`
  ADD INDEX IF NOT EXISTS `idx_grupo_tipo`       (`grupo_id`, `tipo`),
  ADD INDEX IF NOT EXISTS `idx_grupo_status`     (`grupo_id`, `status`);

-- partida_stats — o índice mais importante para analytics
ALTER TABLE `partida_stats`
  ADD INDEX IF NOT EXISTS `idx_comp_jog`         (`competicao_id`, `jogador_id`),
  ADD INDEX IF NOT EXISTS `idx_comp_time`        (`competicao_id`, `time_id`);

-- partida_eventos — duplas e sinergia
ALTER TABLE `partida_eventos`
  ADD INDEX IF NOT EXISTS `idx_comp_jog`         (`competicao_id`, `jogador_id`),
  ADD INDEX IF NOT EXISTS `idx_jog_assist`       (`jogador_id`, `assist_por_jogador_id`);

-- ============================================================
-- VALIDAÇÃO FINAL — queries de checagem de saúde do banco
-- ============================================================

-- 1. Partidas sem rodada_id na nova tabela (não deve haver)
-- SELECT COUNT(*) AS partidas_sem_rodada FROM partidas WHERE rodada_id IS NULL;

-- 2. Stats sem competicao_id (não deve haver)
-- SELECT COUNT(*) AS stats_orfas FROM partida_stats WHERE competicao_id IS NULL;

-- 3. Eventos sem competicao_id (não deve haver)
-- SELECT COUNT(*) AS eventos_orfos FROM partida_eventos WHERE competicao_id IS NULL;

-- 4. Comparar totais de gols (deve ser igual nas duas tabelas)
-- SELECT
--   (SELECT SUM(gols) FROM campeonato_estatisticas_partida) AS gols_antigo,
--   (SELECT SUM(gols) FROM partida_stats)                   AS gols_novo;

-- 5. Comparar totais de eventos
-- SELECT
--   (SELECT COUNT(*) FROM campeonato_eventos_partida) AS eventos_antigo,
--   (SELECT COUNT(*) FROM partida_eventos)            AS eventos_novo;

-- 6. Verificar competicoes criadas por tipo
-- SELECT tipo, COUNT(*) AS total FROM competicoes GROUP BY tipo;

-- ============================================================
-- APÓS VALIDAÇÃO OK — próximo passo (sprint seguinte):
-- Renomear tabelas antigas para _bkp (NÃO execute agora)
-- ============================================================
-- RENAME TABLE campeonatos TO campeonatos_bkp_2026;
-- RENAME TABLE ligas TO ligas_bkp_2026;
-- RENAME TABLE campeonato_partidas TO campeonato_partidas_bkp_2026;
-- RENAME TABLE campeonato_elencos TO campeonato_elencos_bkp_2026;
-- RENAME TABLE campeonato_rodada_elencos TO campeonato_rodada_elencos_bkp_2026;
-- RENAME TABLE campeonato_estatisticas_partida TO campeonato_estatisticas_partida_bkp_2026;
-- RENAME TABLE campeonato_eventos_partida TO campeonato_eventos_partida_bkp_2026;
-- RENAME TABLE campeonato_premios TO campeonato_premios_bkp_2026;
-- RENAME TABLE premios_rodada TO premios_rodada_bkp_2026;
-- RENAME TABLE time_jogadores TO time_jogadores_bkp_2026;
-- RENAME TABLE rodada_jogadores TO rodada_jogadores_bkp_2026;
-- RENAME TABLE rodada_times TO rodada_times_bkp_2026;
