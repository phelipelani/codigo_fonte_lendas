-- ============================================================
-- FASE 2 — Criar novas tabelas unificadas
--
-- Cria as tabelas novas SEM remover as antigas.
-- Os dados serão copiados na Fase 3.
--
-- Novas tabelas criadas:
--   competicoes      → unifica campeonatos + ligas
--   elencos          → unifica 4 tabelas de elenco
--   partidas         → nova versão com rodada sempre presente
--   partida_stats    → campeonato_estatisticas_partida + competicao_id indexado
--   partida_eventos  → campeonato_eventos_partida + competicao_id indexado
--   premios          → unifica campeonato_premios + premios_rodada
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;

-- ------------------------------------------------------------
-- 1. competicoes — unifica campeonatos + ligas
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `competicoes` (
  `id`                    int(11)       NOT NULL AUTO_INCREMENT,
  `grupo_id`              int(11)       NOT NULL DEFAULT 1,
  `nome`                  varchar(255)  NOT NULL,
  `tipo`                  enum('racha','liga','copa','campeonato') NOT NULL DEFAULT 'campeonato',
  `formato`               varchar(50)   DEFAULT NULL
    COMMENT 'pontos_corridos | mata_mata | misto | copa_4 | copa_8 | copa_16',

  -- Configurações de copa/campeonato
  `num_times`             int(11)       DEFAULT 4,
  `tem_fase_grupos`       tinyint(1)    DEFAULT 1,
  `fase_grupos_ida_volta` tinyint(1)    DEFAULT 0,
  `tem_repescagem`        tinyint(1)    DEFAULT 0,
  `tem_terceiro_lugar`    tinyint(1)    DEFAULT 0,
  `modo_selecao_times`    varchar(50)   DEFAULT 'fixo',

  -- Estado atual
  `fase_atual`            varchar(50)   NOT NULL DEFAULT 'inscricao',
  `status`                enum('aguardando','ativa','finalizada','pausada') NOT NULL DEFAULT 'aguardando',

  -- Resultado
  `time_campeao_id`       int(11)       DEFAULT NULL,
  `foto_campiao_url`      text          DEFAULT NULL,

  -- Datas
  `data_inicio`           date          DEFAULT NULL,
  `data_fim`              date          DEFAULT NULL,
  `criado_em`             datetime      NOT NULL DEFAULT current_timestamp(),

  -- Referência original (para rastrear de onde veio na migração)
  `origem`                enum('campeonato','liga','novo') NOT NULL DEFAULT 'novo',
  `origem_id`             int(11)       DEFAULT NULL COMMENT 'ID original na tabela de origem',

  PRIMARY KEY (`id`),
  KEY `idx_grupo`  (`grupo_id`),
  KEY `idx_status` (`status`),
  KEY `idx_tipo`   (`tipo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 2. elencos — une time_jogadores, campeonato_elencos,
--              campeonato_rodada_elencos, rodada_jogadores, rodada_times
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `elencos` (
  `id`                  int(11)    NOT NULL AUTO_INCREMENT,
  `competicao_id`       int(11)    NOT NULL,
  `time_id`             int(11)    DEFAULT NULL
    COMMENT 'NULL para racha (jogador sem time fixo)',
  `jogador_id`          int(11)    NOT NULL,
  `is_capitao`          tinyint(1) NOT NULL DEFAULT 0,
  `is_pe_de_rato`       tinyint(1) NOT NULL DEFAULT 0,
  `jogador_original_id` int(11)    DEFAULT NULL
    COMMENT 'Para substituições: qual jogador foi substituído',
  `criado_em`           datetime   NOT NULL DEFAULT current_timestamp(),

  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_comp_time_jog` (`competicao_id`, `time_id`, `jogador_id`),
  KEY `idx_competicao` (`competicao_id`),
  KEY `idx_jogador`    (`jogador_id`),
  KEY `idx_time`       (`time_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 3. partidas — unifica campeonato_partidas (copa sem rodada_id vira
--              rodada de tipo 'final'/'semi' etc.)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `partidas` (
  `id`                    int(11)    NOT NULL AUTO_INCREMENT,
  `competicao_id`         int(11)    NOT NULL,
  `rodada_id`             int(11)    NOT NULL COMMENT 'Sempre obrigatório agora',
  `timeA_id`              int(11)    DEFAULT NULL COMMENT 'NULL em rachas informais',
  `timeB_id`              int(11)    DEFAULT NULL,
  `placar_timeA`          int(11)    DEFAULT 0,
  `placar_timeB`          int(11)    DEFAULT 0,
  `placar_penaltis_timeA` int(11)    DEFAULT 0,
  `placar_penaltis_timeB` int(11)    DEFAULT 0,
  `duracao_segundos`      int(11)    DEFAULT 0,
  `goleiro_timeA_id`      int(11)    DEFAULT NULL,
  `goleiro_timeB_id`      int(11)    DEFAULT NULL,

  -- Fase (copa): grupo | quartas | semi | final | NULL para liga/racha
  `fase`                  varchar(50) DEFAULT NULL,
  `fase_mata_mata`        varchar(50) DEFAULT NULL,
  `bracket`               varchar(50) DEFAULT NULL,
  `ordem_confronto`       int(11)    DEFAULT NULL,
  `ordem_jogo`            int(11)    DEFAULT NULL,

  `status`                enum('pendente','em_andamento','finalizada') NOT NULL DEFAULT 'pendente',
  `fim_em`                datetime   DEFAULT NULL,

  -- Referência original
  `origem_id`             int(11)    DEFAULT NULL COMMENT 'ID na campeonato_partidas original',

  PRIMARY KEY (`id`),
  KEY `idx_competicao` (`competicao_id`),
  KEY `idx_rodada`     (`rodada_id`),
  KEY `idx_status`     (`status`),
  KEY `idx_timeA`      (`timeA_id`),
  KEY `idx_timeB`      (`timeB_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 4. partida_stats — campeonato_estatisticas_partida + competicao_id
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `partida_stats` (
  `id`            int(11)    NOT NULL AUTO_INCREMENT,
  `partida_id`    int(11)    NOT NULL,
  `competicao_id` int(11)    NOT NULL COMMENT 'Índice direto — sem JOIN para analytics',
  `jogador_id`    int(11)    NOT NULL,
  `time_id`       int(11)    NOT NULL,
  `gols`          int(11)    NOT NULL DEFAULT 0,
  `assistencias`  int(11)    NOT NULL DEFAULT 0,
  `clean_sheet`   tinyint(1) NOT NULL DEFAULT 0,
  `gols_contra`   int(11)    NOT NULL DEFAULT 0,

  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_partida_jogador` (`partida_id`, `jogador_id`),
  KEY `idx_competicao` (`competicao_id`),
  KEY `idx_jogador`    (`jogador_id`),
  KEY `idx_time`       (`time_id`),
  -- Índice composto para queries de analytics (jogador + competição)
  KEY `idx_jog_comp`   (`jogador_id`, `competicao_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 5. partida_eventos — campeonato_eventos_partida + competicao_id
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `partida_eventos` (
  `id`                    int(11)    NOT NULL AUTO_INCREMENT,
  `partida_id`            int(11)    NOT NULL,
  `competicao_id`         int(11)    NOT NULL COMMENT 'Índice direto',
  `jogador_id`            int(11)    NOT NULL,
  `time_id`               int(11)    DEFAULT NULL,
  `tipo`                  enum('gol','gol_contra','assist','penalti_perdido') NOT NULL DEFAULT 'gol',
  `minuto`                int(11)    NOT NULL DEFAULT 0,
  `assist_por_jogador_id` int(11)    DEFAULT NULL,
  `criado_em`             datetime   NOT NULL DEFAULT current_timestamp(),

  PRIMARY KEY (`id`),
  KEY `idx_partida`    (`partida_id`),
  KEY `idx_competicao` (`competicao_id`),
  KEY `idx_jogador`    (`jogador_id`),
  -- Para queries de dupla gol+assist
  KEY `idx_assist`     (`assist_por_jogador_id`),
  KEY `idx_jog_comp`   (`jogador_id`, `competicao_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 6. premios — une campeonato_premios + premios_rodada
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `premios` (
  `id`            int(11)          NOT NULL AUTO_INCREMENT,
  `competicao_id` int(11)          NOT NULL,
  `rodada_id`     int(11)          DEFAULT NULL COMMENT 'NULL para prêmio de competição inteira',
  `jogador_id`    int(11)          NOT NULL,
  `tipo`          varchar(100)     NOT NULL
    COMMENT 'artilheiro | garcom | mvp | pe_de_rato | goleiro | zagueiro',
  `escopo`        enum('rodada','competicao') NOT NULL DEFAULT 'rodada',
  `valor`         decimal(10,2)    DEFAULT NULL COMMENT 'Pontuação ou quantidade (gols, etc)',
  `criado_em`     datetime         NOT NULL DEFAULT current_timestamp(),

  PRIMARY KEY (`id`),
  KEY `idx_competicao` (`competicao_id`),
  KEY `idx_rodada`     (`rodada_id`),
  KEY `idx_jogador`    (`jogador_id`),
  KEY `idx_tipo`       (`tipo`),
  KEY `idx_escopo`     (`escopo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- VALIDAÇÃO — execute após a fase 2
-- ============================================================
-- SHOW TABLES LIKE 'competicoes';     -- deve existir
-- SHOW TABLES LIKE 'elencos';         -- deve existir
-- SHOW TABLES LIKE 'partidas';        -- deve existir
-- SHOW TABLES LIKE 'partida_stats';   -- deve existir
-- SHOW TABLES LIKE 'partida_eventos'; -- deve existir
-- SHOW TABLES LIKE 'premios';         -- deve existir
-- SELECT COUNT(*) FROM competicoes;   -- deve ser 0 (ainda vazio)
