-- =====================================================================
-- /campo  Fase 2.2 — convites (criacao de conta por convite do diretor)
-- =====================================================================

CREATE TABLE IF NOT EXISTS campo_convites (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  clube_id    INT UNSIGNED NOT NULL,
  token       VARCHAR(64)  NOT NULL,
  email       VARCHAR(160) NULL,                                -- opcional (pre-preenche)
  papel       ENUM('diretor','tecnico','jogador') NOT NULL,
  jogador_id  INT UNSIGNED NULL,                                -- quando papel = jogador
  criado_por  INT UNSIGNED NULL,
  usado       TINYINT(1)   NOT NULL DEFAULT 0,
  usado_em    DATETIME     NULL,
  expira_em   DATETIME     NOT NULL,
  criado_em   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_campo_convite_token (token),
  KEY idx_campo_convite_clube (clube_id),
  CONSTRAINT fk_campo_convite_clube FOREIGN KEY (clube_id)   REFERENCES campo_clubes(id)    ON DELETE CASCADE,
  CONSTRAINT fk_campo_convite_jog   FOREIGN KEY (jogador_id) REFERENCES campo_jogadores(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
