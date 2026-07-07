-- =====================================================================
-- /campo  Fase 3 — Estrategia: formacoes/taticas salvas (board tatico)
-- Guarda esquema + mentalidade + estilo + instrucoes (JSON) e a posicao
-- de cada jogador no campo (JSON: [{jogadorId, x, y}], x/y de 0 a 100).
-- =====================================================================

CREATE TABLE IF NOT EXISTS campo_formacoes (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  clube_id      INT UNSIGNED NOT NULL,
  nome          VARCHAR(120) NOT NULL,
  esquema       VARCHAR(20)  NULL,                 -- 4-3-3, 4-4-2, 4-2-3-1...
  mentalidade   VARCHAR(40)  NULL,                 -- Defensiva, Equilibrada, Ofensiva...
  estilo        VARCHAR(40)  NULL,                 -- Posse de Bola, Contra-ataque...
  instrucoes    JSON         NULL,                 -- {amplitude, linhas, ritmo, pressao, marcacao}
  posicoes      JSON         NULL,                 -- [{jogadorId, x, y}]
  favorita      TINYINT(1)   NOT NULL DEFAULT 0,
  criado_por    INT UNSIGNED NULL,
  criado_em     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_form_clube (clube_id),
  CONSTRAINT fk_form_clube FOREIGN KEY (clube_id) REFERENCES campo_clubes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
