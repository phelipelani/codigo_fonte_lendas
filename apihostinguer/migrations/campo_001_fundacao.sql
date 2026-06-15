-- =====================================================================
-- Modulo /campo  (Analista de Campo)  —  Fase 1: Fundacao
-- Tabelas isoladas com prefixo campo_  (nao tocam no Futlendas)
-- Multi-tenant: tudo escopado por clube_id
-- =====================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ---------- Clube (tenant) ----------
CREATE TABLE IF NOT EXISTS campo_clubes (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nome        VARCHAR(120) NOT NULL,
  escudo_url  VARCHAR(500) NULL,
  ativo       TINYINT(1)   NOT NULL DEFAULT 1,
  criado_em   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- Elenco ----------
CREATE TABLE IF NOT EXISTS campo_jogadores (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  clube_id        INT UNSIGNED NOT NULL,
  nome            VARCHAR(120) NOT NULL,
  numero          SMALLINT     NULL,
  posicao         VARCHAR(10)  NOT NULL,                       -- ATA, MEI, VOL, ZAG, LD, LE, GOL
  tipo            ENUM('atk','mid','def','gk') NOT NULL,        -- grupo de stats do card
  pe              ENUM('D','E','Ambi') NULL,
  foto_url        VARCHAR(500) NULL,
  titular_padrao  TINYINT(1)   NOT NULL DEFAULT 0,
  ativo           TINYINT(1)   NOT NULL DEFAULT 1,
  criado_em       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_campo_jog_clube (clube_id),
  CONSTRAINT fk_campo_jog_clube FOREIGN KEY (clube_id) REFERENCES campo_clubes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- Usuarios / Login (3 papeis) ----------
CREATE TABLE IF NOT EXISTS campo_usuarios (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  clube_id       INT UNSIGNED NOT NULL,
  nome           VARCHAR(120) NOT NULL,
  email          VARCHAR(160) NULL,
  username       VARCHAR(60)  NOT NULL,
  password_hash  VARCHAR(255) NULL,
  papel          ENUM('diretor','tecnico','jogador') NOT NULL,
  jogador_id     INT UNSIGNED NULL,                            -- liga user-jogador a ficha do elenco
  ativo          TINYINT(1)   NOT NULL DEFAULT 1,
  criado_em      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_campo_user_username (username),
  KEY idx_campo_user_clube (clube_id),
  KEY idx_campo_user_jog (jogador_id),
  CONSTRAINT fk_campo_user_clube FOREIGN KEY (clube_id)   REFERENCES campo_clubes(id)    ON DELETE CASCADE,
  CONSTRAINT fk_campo_user_jog   FOREIGN KEY (jogador_id) REFERENCES campo_jogadores(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- Adversarios (caixa preta: so nome/escudo) ----------
CREATE TABLE IF NOT EXISTS campo_adversarios (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  clube_id    INT UNSIGNED NOT NULL,
  nome        VARCHAR(120) NOT NULL,
  escudo_url  VARCHAR(500) NULL,
  criado_em   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_campo_adv_clube (clube_id),
  CONSTRAINT fk_campo_adv_clube FOREIGN KEY (clube_id) REFERENCES campo_clubes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- Partidas ----------
CREATE TABLE IF NOT EXISTS campo_partidas (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  clube_id      INT UNSIGNED NOT NULL,
  adversario_id INT UNSIGNED NULL,
  data_hora     DATETIME     NULL,
  local         ENUM('casa','fora','neutro') NOT NULL DEFAULT 'casa',
  competicao    VARCHAR(120) NULL,
  formacao      VARCHAR(20)  NULL,                             -- 4-3-3, 4-4-2...
  status        ENUM('agendada','ao_vivo','finalizada') NOT NULL DEFAULT 'agendada',
  placar_nos    SMALLINT     NOT NULL DEFAULT 0,
  placar_eles   SMALLINT     NOT NULL DEFAULT 0,
  criado_por    INT UNSIGNED NULL,
  criado_em     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_campo_part_clube (clube_id),
  KEY idx_campo_part_status (clube_id, status),
  CONSTRAINT fk_campo_part_clube FOREIGN KEY (clube_id)      REFERENCES campo_clubes(id)      ON DELETE CASCADE,
  CONSTRAINT fk_campo_part_adv   FOREIGN KEY (adversario_id) REFERENCES campo_adversarios(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- Escalacao da partida ----------
CREATE TABLE IF NOT EXISTS campo_escalacoes (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  partida_id  INT UNSIGNED NOT NULL,
  jogador_id  INT UNSIGNED NOT NULL,
  posicao     VARCHAR(10)  NOT NULL,
  slot_x      TINYINT      NULL,                               -- posicao no campo 0..100
  slot_y      TINYINT      NULL,
  titular     TINYINT(1)   NOT NULL DEFAULT 1,
  entrou_min  SMALLINT     NULL,
  saiu_min    SMALLINT     NULL,
  UNIQUE KEY uq_escal (partida_id, jogador_id),
  KEY idx_escal_part (partida_id),
  CONSTRAINT fk_escal_part FOREIGN KEY (partida_id) REFERENCES campo_partidas(id)  ON DELETE CASCADE,
  CONSTRAINT fk_escal_jog  FOREIGN KEY (jogador_id) REFERENCES campo_jogadores(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- Eventos crus (1 linha por toque) — fonte da verdade ----------
CREATE TABLE IF NOT EXISTS campo_eventos (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  partida_id  INT UNSIGNED NOT NULL,
  jogador_id  INT UNSIGNED NULL,
  tipo        VARCHAR(24)  NOT NULL,                           -- passe_certo, chute_errado, gol, desarme_ganho, amarelo...
  minuto      SMALLINT     NULL,
  tempo       TINYINT      NOT NULL DEFAULT 1,                 -- 1 ou 2
  criado_em   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_ev_part (partida_id),
  KEY idx_ev_jog (jogador_id),
  CONSTRAINT fk_ev_part FOREIGN KEY (partida_id) REFERENCES campo_partidas(id)  ON DELETE CASCADE,
  CONSTRAINT fk_ev_jog  FOREIGN KEY (jogador_id) REFERENCES campo_jogadores(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- Resumo por jogador/partida (gravado ao encerrar) ----------
CREATE TABLE IF NOT EXISTS campo_estatisticas_partida (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  partida_id       INT UNSIGNED NOT NULL,
  jogador_id       INT UNSIGNED NOT NULL,
  passe_certo      SMALLINT NOT NULL DEFAULT 0,
  passe_errado     SMALLINT NOT NULL DEFAULT 0,
  chute_certo      SMALLINT NOT NULL DEFAULT 0,
  chute_errado     SMALLINT NOT NULL DEFAULT 0,
  gols             SMALLINT NOT NULL DEFAULT 0,
  assist           SMALLINT NOT NULL DEFAULT 0,
  desarme_ganho    SMALLINT NOT NULL DEFAULT 0,
  desarme_perdido  SMALLINT NOT NULL DEFAULT 0,
  interceptacao    SMALLINT NOT NULL DEFAULT 0,
  corte            SMALLINT NOT NULL DEFAULT 0,
  retomada         SMALLINT NOT NULL DEFAULT 0,
  defesa           SMALLINT NOT NULL DEFAULT 0,
  gol_sofrido      SMALLINT NOT NULL DEFAULT 0,
  amarelo          TINYINT  NOT NULL DEFAULT 0,
  vermelho         TINYINT  NOT NULL DEFAULT 0,
  falta            SMALLINT NOT NULL DEFAULT 0,
  min_jogados      SMALLINT NOT NULL DEFAULT 0,
  UNIQUE KEY uq_estat (partida_id, jogador_id),
  KEY idx_estat_jog (jogador_id),
  CONSTRAINT fk_estat_part FOREIGN KEY (partida_id) REFERENCES campo_partidas(id)  ON DELETE CASCADE,
  CONSTRAINT fk_estat_jog  FOREIGN KEY (jogador_id) REFERENCES campo_jogadores(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- Simulacoes / Quadro de sugestoes de escalacao ----------
CREATE TABLE IF NOT EXISTS campo_simulacoes (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  clube_id    INT UNSIGNED NOT NULL,
  autor_id    INT UNSIGNED NULL,
  nome        VARCHAR(120) NOT NULL,
  formacao    VARCHAR(20)  NULL,
  status      ENUM('rascunho','sugestao','oficial') NOT NULL DEFAULT 'rascunho',
  comentario  TEXT         NULL,
  criado_em   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_sim_clube (clube_id),
  CONSTRAINT fk_sim_clube FOREIGN KEY (clube_id) REFERENCES campo_clubes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS campo_simulacao_jogadores (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  simulacao_id  INT UNSIGNED NOT NULL,
  jogador_id    INT UNSIGNED NOT NULL,
  posicao       VARCHAR(10)  NULL,
  slot_x        TINYINT      NULL,
  slot_y        TINYINT      NULL,
  titular       TINYINT(1)   NOT NULL DEFAULT 1,
  KEY idx_simj_sim (simulacao_id),
  CONSTRAINT fk_simj_sim FOREIGN KEY (simulacao_id) REFERENCES campo_simulacoes(id) ON DELETE CASCADE,
  CONSTRAINT fk_simj_jog FOREIGN KEY (jogador_id)   REFERENCES campo_jogadores(id)  ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- Agenda do time (diretor edita) ----------
CREATE TABLE IF NOT EXISTS campo_agenda (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  clube_id     INT UNSIGNED NOT NULL,
  titulo       VARCHAR(160) NOT NULL,
  tipo         ENUM('treino','jogo','reuniao','outro') NOT NULL DEFAULT 'outro',
  data_inicio  DATETIME     NOT NULL,
  data_fim     DATETIME     NULL,
  local        VARCHAR(160) NULL,
  descricao    TEXT         NULL,
  criado_por   INT UNSIGNED NULL,
  criado_em    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_ag_clube (clube_id),
  KEY idx_ag_data (clube_id, data_inicio),
  CONSTRAINT fk_ag_clube FOREIGN KEY (clube_id) REFERENCES campo_clubes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;
