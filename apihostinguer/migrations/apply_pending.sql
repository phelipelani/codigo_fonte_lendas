-- ============================================================================
-- SCRIPT: Aplica todas as migrations pendentes (002 a 006)
-- Execute uma vez no banco de produção/dev.
-- Todas as operações usam IF NOT EXISTS / IF EXISTS para ser idempotentes.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 002: Renomeia dados_json → meta em notificacoes
-- (NotificacoesController usa 'meta', mas a tabela tinha 'dados_json')
-- ----------------------------------------------------------------------------
ALTER TABLE notificacoes CHANGE COLUMN dados_json meta TEXT NULL DEFAULT NULL;

-- ----------------------------------------------------------------------------
-- 003: Adiciona coluna whatsapp em usuarios
-- ----------------------------------------------------------------------------
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS whatsapp VARCHAR(20) NULL DEFAULT NULL AFTER email;

-- ----------------------------------------------------------------------------
-- 004: Album de Figurinhas — 5 tabelas
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS album_paginas (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    numero          INT NOT NULL,
    tipo            VARCHAR(30) NOT NULL,
    titulo          VARCHAR(150) NULL,
    subtitulo       VARCHAR(150) NULL,
    subtitulo_cor   VARCHAR(20) NULL,
    tag             VARCHAR(80) NULL,
    data_referencia VARCHAR(80) NULL,
    texto           MEDIUMTEXT NULL,
    meta_json       JSON NULL,
    ativa           TINYINT(1) NOT NULL DEFAULT 1,
    criado_em       DATETIME DEFAULT CURRENT_TIMESTAMP,
    atualizado_em   DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_numero (numero)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS album_figurinhas (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    numero      INT NOT NULL,
    nome        VARCHAR(150) NOT NULL,
    descricao   VARCHAR(255) NULL,
    categoria   VARCHAR(30) NOT NULL DEFAULT 'jogador',
    raridade    VARCHAR(20) NOT NULL DEFAULT 'comum',
    imagem_url  VARCHAR(500) NULL,
    pagina_id   INT NULL,
    slot        INT NULL,
    ativa       TINYINT(1) NOT NULL DEFAULT 1,
    criado_em   DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_numero (numero),
    KEY idx_pagina (pagina_id),
    KEY idx_raridade (raridade),
    CONSTRAINT fk_fig_pagina FOREIGN KEY (pagina_id)
        REFERENCES album_paginas(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS album_pacotes (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id  INT NOT NULL,
    tipo        VARCHAR(30) NOT NULL DEFAULT 'racha',
    motivo      VARCHAR(200) NULL,
    status      VARCHAR(20) NOT NULL DEFAULT 'fechado',
    criado_em   DATETIME DEFAULT CURRENT_TIMESTAMP,
    aberto_em   DATETIME NULL,
    KEY idx_usuario (usuario_id),
    KEY idx_status (usuario_id, status),
    CONSTRAINT fk_pac_usuario FOREIGN KEY (usuario_id)
        REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS album_inventario (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id   INT NOT NULL,
    figurinha_id INT NOT NULL,
    quantidade   INT NOT NULL DEFAULT 1,
    obtida_em    DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_user_fig (usuario_id, figurinha_id),
    KEY idx_usuario (usuario_id),
    CONSTRAINT fk_inv_usuario FOREIGN KEY (usuario_id)
        REFERENCES usuarios(id) ON DELETE CASCADE,
    CONSTRAINT fk_inv_figurinha FOREIGN KEY (figurinha_id)
        REFERENCES album_figurinhas(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS album_pacote_figurinhas (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    pacote_id    INT NOT NULL,
    figurinha_id INT NOT NULL,
    era_repetida TINYINT(1) NOT NULL DEFAULT 0,
    KEY idx_pacote (pacote_id),
    CONSTRAINT fk_pf_pacote FOREIGN KEY (pacote_id)
        REFERENCES album_pacotes(id) ON DELETE CASCADE,
    CONSTRAINT fk_pf_figurinha FOREIGN KEY (figurinha_id)
        REFERENCES album_figurinhas(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 005: Permite NULL em timeA_id / timeB_id (mata-mata com slots vazios)
-- ----------------------------------------------------------------------------
ALTER TABLE campeonato_partidas
  MODIFY COLUMN timeA_id INT(11) DEFAULT NULL,
  MODIFY COLUMN timeB_id INT(11) DEFAULT NULL;

-- ----------------------------------------------------------------------------
-- 006: Adiciona time_id e posicao em campeonato_vencedores
-- ----------------------------------------------------------------------------
ALTER TABLE campeonato_vencedores
  ADD COLUMN IF NOT EXISTS time_id INT(11) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS posicao INT(11) DEFAULT 1;
