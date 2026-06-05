-- Migration 007: Índices de performance
-- Seguro rodar múltiplas vezes (IF NOT EXISTS / IF EXISTS)

-- campeonato_partidas: composite (rodada_id, status) para salvarPremiosRodada e getPartidas
ALTER TABLE campeonato_partidas
  ADD INDEX IF NOT EXISTS idx_cp_rodada_status    (rodada_id, status),
  ADD INDEX IF NOT EXISTS idx_cp_fase_mata_status  (fase, fase_mata_mata, status),
  ADD INDEX IF NOT EXISTS idx_cp_fim_em            (fim_em);

-- campeonato_eventos_partida: remove índices duplicados
ALTER TABLE campeonato_eventos_partida
  DROP INDEX IF EXISTS idx_partida,
  DROP INDEX IF EXISTS idx_jogador;

-- campeonato_vencedores: índice em time_id para registrar-vencedores
ALTER TABLE campeonato_vencedores
  ADD INDEX IF NOT EXISTS idx_cv_time (time_id);
