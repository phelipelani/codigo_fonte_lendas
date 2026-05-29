-- ============================================================
-- FASE 3 — Migração de dados das tabelas antigas → novas
--
-- ⚠️  As tabelas ANTIGAS não são removidas. Só copiamos os dados.
-- ⚠️  Execute por bloco. Verifique a contagem após cada bloco.
-- ⚠️  Se algo der errado: TRUNCATE na tabela nova e re-execute.
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================
-- BLOCO 1 — competicoes ← campeonatos + ligas
-- ============================================================

-- 1a. Migrar campeonatos
INSERT INTO `competicoes` (
  `id`, `grupo_id`, `nome`, `tipo`, `formato`,
  `num_times`, `tem_fase_grupos`, `fase_grupos_ida_volta`,
  `tem_repescagem`, `tem_terceiro_lugar`, `modo_selecao_times`,
  `fase_atual`, `status`, `time_campeao_id`, `foto_campiao_url`,
  `data_inicio`, `data_fim`, `criado_em`, `origem`, `origem_id`
)
SELECT
  c.id,
  COALESCE(c.grupo_id, 1),
  c.nome,
  -- Inferir tipo pelo formato
  CASE
    WHEN c.formato LIKE '%copa%'   THEN 'copa'
    WHEN c.formato LIKE '%liga%'   THEN 'liga'
    ELSE 'campeonato'
  END,
  c.formato,
  c.num_times,
  c.tem_fase_grupos,
  c.fase_grupos_ida_volta,
  c.tem_repescagem,
  c.tem_terceiro_lugar,
  c.modo_selecao_times,
  c.fase_atual,
  CASE
    WHEN c.status = 'finalizado' THEN 'finalizada'
    WHEN c.status = 'ativo'      THEN 'ativa'
    ELSE c.status
  END,
  c.time_campeao_id,
  c.foto_campiao_url,
  c.data,   -- data_inicio
  NULL,     -- data_fim (não existia)
  c.criado_em,
  'campeonato',
  c.id
FROM `campeonatos` c
ON DUPLICATE KEY UPDATE `nome` = c.nome; -- idempotente

-- 1b. Migrar ligas (com id deslocado para não colidir com campeonatos)
-- Ligas usarão IDs a partir de 10000 para não colidir
INSERT INTO `competicoes` (
  `grupo_id`, `nome`, `tipo`, `formato`,
  `fase_atual`, `status`, `data_inicio`, `data_fim`,
  `criado_em`, `origem`, `origem_id`
)
SELECT
  COALESCE(l.grupo_id, 1),
  l.nome,
  'liga',
  'pontos_corridos',
  'finalizada',
  CASE WHEN l.finalizada_em IS NOT NULL THEN 'finalizada' ELSE 'ativa' END,
  l.data_inicio,
  l.data_fim,
  COALESCE(l.data_inicio, NOW()),
  'liga',
  l.id
FROM `ligas` l
WHERE NOT EXISTS (
  SELECT 1 FROM `competicoes` co WHERE co.origem = 'liga' AND co.origem_id = l.id
);

-- ============================================================
-- BLOCO 2 — Atualizar rodadas.competicao_id
--           (rodadas têm liga_id OU campeonato_id — normalizar)
-- ============================================================

-- Adicionar coluna competicao_id em rodadas se ainda não existir
ALTER TABLE `rodadas`
  ADD COLUMN IF NOT EXISTS `competicao_id` int(11) DEFAULT NULL
    COMMENT 'Substitui liga_id e campeonato_id' AFTER `grupo_id`;

-- Preencher competicao_id a partir de campeonato_id (direto, mesmo ID)
UPDATE `rodadas` r
SET r.competicao_id = r.campeonato_id
WHERE r.campeonato_id IS NOT NULL AND r.competicao_id IS NULL;

-- Preencher competicao_id a partir de liga_id (busca ID novo em competicoes)
UPDATE `rodadas` r
INNER JOIN `competicoes` co ON co.origem = 'liga' AND co.origem_id = r.liga_id
SET r.competicao_id = co.id
WHERE r.liga_id IS NOT NULL AND r.competicao_id IS NULL;

-- ============================================================
-- BLOCO 3 — elencos ← campeonato_elencos (principal)
-- ============================================================

INSERT INTO `elencos` (
  `competicao_id`, `time_id`, `jogador_id`,
  `is_capitao`, `is_pe_de_rato`, `criado_em`
)
SELECT
  ce.campeonato_id,
  ce.time_id,
  ce.jogador_id,
  ce.is_capitao,
  ce.is_pe_de_rato,
  NOW()
FROM `campeonato_elencos` ce
ON DUPLICATE KEY UPDATE `is_capitao` = ce.is_capitao;

-- Adicionar elencos de rodadas que tenham substituições
-- (campeonato_rodada_elencos — apenas registros com jogador_original_id, que são substituições)
INSERT INTO `elencos` (
  `competicao_id`, `time_id`, `jogador_id`,
  `is_capitao`, `jogador_original_id`, `criado_em`
)
SELECT
  r.competicao_id,
  cre.time_id,
  cre.jogador_id,
  cre.is_capitao,
  cre.jogador_original_id,
  NOW()
FROM `campeonato_rodada_elencos` cre
INNER JOIN `rodadas` r ON r.id = cre.rodada_id
WHERE cre.jogador_original_id IS NOT NULL -- só substituições reais
ON DUPLICATE KEY UPDATE `jogador_original_id` = cre.jogador_original_id;

-- ============================================================
-- BLOCO 4 — partidas ← campeonato_partidas
--           Cria rodadas para partidas de copa que não tinham rodada_id
-- ============================================================

-- 4a. Para partidas de copa sem rodada_id: criar rodadas automáticas por fase
INSERT INTO `rodadas` (`competicao_id`, `grupo_id`, `nome`, `tipo`, `data`, `status`)
SELECT DISTINCT
  cp.campeonato_id,
  1,
  CASE
    WHEN cp.fase_mata_mata = 'final'     THEN 'Final'
    WHEN cp.fase_mata_mata = 'semifinal' THEN 'Semifinal'
    WHEN cp.fase_mata_mata = 'quartas'   THEN 'Quartas de Final'
    WHEN cp.fase = 'fase_de_grupos'      THEN 'Fase de Grupos'
    ELSE COALESCE(cp.fase, 'Rodada Única')
  END,
  CASE
    WHEN cp.fase_mata_mata = 'final'     THEN 'final'
    WHEN cp.fase_mata_mata = 'semifinal' THEN 'semi'
    WHEN cp.fase_mata_mata = 'quartas'   THEN 'quartas'
    ELSE 'grupo'
  END,
  COALESCE(DATE(cp.fim_em), CURDATE()),
  'finalizada'
FROM `campeonato_partidas` cp
WHERE cp.rodada_id IS NULL
AND NOT EXISTS (
  SELECT 1 FROM `rodadas` r2
  WHERE r2.competicao_id = cp.campeonato_id
  AND r2.nome = CASE
    WHEN cp.fase_mata_mata = 'final'     THEN 'Final'
    WHEN cp.fase_mata_mata = 'semifinal' THEN 'Semifinal'
    WHEN cp.fase_mata_mata = 'quartas'   THEN 'Quartas de Final'
    WHEN cp.fase = 'fase_de_grupos'      THEN 'Fase de Grupos'
    ELSE COALESCE(cp.fase, 'Rodada Única')
  END
);

-- 4b. Migrar partidas — usando rodada_id existente ou a rodada criada acima
INSERT INTO `partidas` (
  `competicao_id`, `rodada_id`,
  `timeA_id`, `timeB_id`,
  `placar_timeA`, `placar_timeB`,
  `placar_penaltis_timeA`, `placar_penaltis_timeB`,
  `duracao_segundos`,
  `goleiro_timeA_id`, `goleiro_timeB_id`,
  `fase`, `fase_mata_mata`, `bracket`,
  `ordem_confronto`, `ordem_jogo`,
  `status`, `fim_em`, `origem_id`
)
SELECT
  cp.campeonato_id,
  -- Usa rodada_id original ou busca a rodada criada acima
  COALESCE(cp.rodada_id, (
    SELECT r2.id FROM `rodadas` r2
    WHERE r2.competicao_id = cp.campeonato_id
    AND r2.nome = CASE
      WHEN cp.fase_mata_mata = 'final'     THEN 'Final'
      WHEN cp.fase_mata_mata = 'semifinal' THEN 'Semifinal'
      WHEN cp.fase_mata_mata = 'quartas'   THEN 'Quartas de Final'
      WHEN cp.fase = 'fase_de_grupos'      THEN 'Fase de Grupos'
      ELSE COALESCE(cp.fase, 'Rodada Única')
    END
    LIMIT 1
  )),
  cp.timeA_id,
  cp.timeB_id,
  COALESCE(cp.placar_timeA, 0),
  COALESCE(cp.placar_timeB, 0),
  COALESCE(cp.placar_penaltis_timeA, 0),
  COALESCE(cp.placar_penaltis_timeB, 0),
  COALESCE(cp.duracao_segundos, 0),
  cp.goleiro_timeA_id,
  cp.goleiro_timeB_id,
  cp.fase,
  cp.fase_mata_mata,
  cp.bracket,
  cp.ordem_confronto,
  cp.ordem_jogo,
  CASE cp.status
    WHEN 'finalizada'    THEN 'finalizada'
    WHEN 'em_andamento'  THEN 'em_andamento'
    ELSE 'pendente'
  END,
  cp.fim_em,
  cp.id
FROM `campeonato_partidas` cp
ON DUPLICATE KEY UPDATE `origem_id` = cp.id;

-- ============================================================
-- BLOCO 5 — partida_stats ← campeonato_estatisticas_partida
-- ============================================================

INSERT INTO `partida_stats` (
  `partida_id`, `competicao_id`, `jogador_id`, `time_id`,
  `gols`, `assistencias`, `clean_sheet`, `gols_contra`
)
SELECT
  -- Busca o novo ID da partida via origem_id
  p.id,
  p.competicao_id,
  ep.jogador_id,
  ep.time_id,
  ep.gols,
  ep.assistencias,
  COALESCE(ep.clean_sheet, 0),
  ep.gols_contra
FROM `campeonato_estatisticas_partida` ep
INNER JOIN `partidas` p ON p.origem_id = ep.partida_id
ON DUPLICATE KEY UPDATE
  `gols`         = ep.gols,
  `assistencias` = ep.assistencias,
  `clean_sheet`  = COALESCE(ep.clean_sheet, 0),
  `gols_contra`  = ep.gols_contra;

-- ============================================================
-- BLOCO 6 — partida_eventos ← campeonato_eventos_partida
-- ============================================================

INSERT INTO `partida_eventos` (
  `partida_id`, `competicao_id`, `jogador_id`, `time_id`,
  `tipo`, `minuto`, `assist_por_jogador_id`, `criado_em`
)
SELECT
  p.id,
  p.competicao_id,
  ev.jogador_id,
  ev.time_id,
  CASE ev.tipo
    WHEN 'gol'         THEN 'gol'
    WHEN 'gol_contra'  THEN 'gol_contra'
    WHEN 'assist'      THEN 'assist'
    ELSE 'gol'
  END,
  ev.minuto,
  ev.assist_por_jogador_id,
  ev.criado_em
FROM `campeonato_eventos_partida` ev
INNER JOIN `partidas` p ON p.origem_id = ev.partida_id
ON DUPLICATE KEY UPDATE `minuto` = ev.minuto;

-- ============================================================
-- BLOCO 7 — premios ← campeonato_premios + premios_rodada
-- ============================================================

-- 7a. premios de campeonato (escopo = 'competicao')
INSERT INTO `premios` (
  `competicao_id`, `rodada_id`, `jogador_id`,
  `tipo`, `escopo`, `valor`, `criado_em`
)
SELECT
  cp2.campeonato_id,
  NULL,
  cp2.jogador_id,
  cp2.tipo_premio,
  'competicao',
  CASE WHEN cp2.valor REGEXP '^[0-9]+$' THEN CAST(cp2.valor AS DECIMAL(10,2)) ELSE NULL END,
  NOW()
FROM `campeonato_premios` cp2
ON DUPLICATE KEY UPDATE `tipo` = cp2.tipo_premio;

-- 7b. premios de rodada (escopo = 'rodada')
-- Busca competicao_id via rodada
INSERT INTO `premios` (
  `competicao_id`, `rodada_id`, `jogador_id`,
  `tipo`, `escopo`, `valor`, `criado_em`
)
SELECT
  COALESCE(r.competicao_id, r.campeonato_id),
  pr.rodada_id,
  pr.jogador_id,
  pr.tipo_premio,
  'rodada',
  pr.pontuacao,
  NOW()
FROM `premios_rodada` pr
INNER JOIN `rodadas` r ON r.id = pr.rodada_id
ON DUPLICATE KEY UPDATE `valor` = pr.pontuacao;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- VALIDAÇÃO — execute após a fase 3
-- ============================================================
-- Compare contagens: antigas vs novas devem ser iguais (ou maiores nas novas)

-- SELECT 'campeonatos' AS tabela, COUNT(*) AS total FROM campeonatos
-- UNION ALL
-- SELECT 'ligas',       COUNT(*) FROM ligas
-- UNION ALL
-- SELECT 'competicoes', COUNT(*) FROM competicoes;

-- SELECT 'campeonato_elencos' AS tabela, COUNT(*) AS total FROM campeonato_elencos
-- UNION ALL
-- SELECT 'elencos', COUNT(*) FROM elencos;

-- SELECT 'campeonato_partidas' AS tabela, COUNT(*) AS total FROM campeonato_partidas
-- UNION ALL
-- SELECT 'partidas', COUNT(*) FROM partidas;

-- SELECT 'campeonato_estatisticas_partida', COUNT(*) FROM campeonato_estatisticas_partida
-- UNION ALL
-- SELECT 'partida_stats', COUNT(*) FROM partida_stats;

-- SELECT 'campeonato_eventos_partida', COUNT(*) FROM campeonato_eventos_partida
-- UNION ALL
-- SELECT 'partida_eventos', COUNT(*) FROM partida_eventos;

-- SELECT 'campeonato_premios + premios_rodada', COUNT(*) FROM campeonato_premios + (SELECT COUNT(*) FROM premios_rodada)
-- UNION ALL
-- SELECT 'premios', COUNT(*) FROM premios;

-- Verificar que nenhum partida_stats ficou órfão (competicao_id = 0)
-- SELECT COUNT(*) AS stats_sem_competicao FROM partida_stats WHERE competicao_id IS NULL OR competicao_id = 0;
-- Deve retornar 0
