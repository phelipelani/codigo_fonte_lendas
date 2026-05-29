-- Migration 004: Album de Figurinhas — estrutura completa
-- 5 tabelas: paginas, figurinhas, pacotes, inventario, pacote_figurinhas
-- Notificacoes do album reaproveitam a tabela `notificacoes` existente.

-- =============================================================
-- 1. Paginas do album (o "livro" — capa, narrativas, eventos)
-- =============================================================
CREATE TABLE IF NOT EXISTS album_paginas (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    numero          INT NOT NULL                COMMENT 'Ordem da pagina no livro',
    tipo            VARCHAR(30) NOT NULL        COMMENT 'capa|narrativa|rede|numeros|copa|campeonato|escudos|agradecimento',
    titulo          VARCHAR(150) NULL,
    subtitulo       VARCHAR(150) NULL,
    subtitulo_cor   VARCHAR(20) NULL            COMMENT 'Cor hex do subtitulo (cada secao tem a sua)',
    tag             VARCHAR(80) NULL            COMMENT 'Badge: A ORIGEM, BI-CAMPEAO, etc.',
    data_referencia VARCHAR(80) NULL,
    texto           MEDIUMTEXT NULL,
    meta_json       JSON NULL                   COMMENT 'Dados extras do layout (bracket, stats, etc.)',
    ativa           TINYINT(1) NOT NULL DEFAULT 1,
    criado_em       DATETIME DEFAULT CURRENT_TIMESTAMP,
    atualizado_em   DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_numero (numero)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================
-- 2. Catalogo de figurinhas
-- =============================================================
CREATE TABLE IF NOT EXISTS album_figurinhas (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    numero      INT NOT NULL                    COMMENT 'Numero de colecao (#01, #02...)',
    nome        VARCHAR(150) NOT NULL,
    descricao   VARCHAR(255) NULL,
    categoria   VARCHAR(30) NOT NULL DEFAULT 'jogador'  COMMENT 'jogador|etiqueta|escudo|estatistica|foto',
    raridade    VARCHAR(20) NOT NULL DEFAULT 'comum'    COMMENT 'comum|lendaria',
    imagem_url  VARCHAR(500) NULL,
    pagina_id   INT NULL                        COMMENT 'Pagina onde a figurinha fica colada',
    slot        INT NULL                        COMMENT 'Posicao da figurinha dentro da pagina',
    ativa       TINYINT(1) NOT NULL DEFAULT 1,
    criado_em   DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_numero (numero),
    KEY idx_pagina (pagina_id),
    KEY idx_raridade (raridade),
    CONSTRAINT fk_fig_pagina FOREIGN KEY (pagina_id)
        REFERENCES album_paginas(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================
-- 3. Pacotes (fechados ou abertos) de cada usuario
-- =============================================================
CREATE TABLE IF NOT EXISTS album_pacotes (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id  INT NOT NULL,
    tipo        VARCHAR(30) NOT NULL DEFAULT 'racha'   COMMENT 'racha|boas_vindas|bonus|admin',
    motivo      VARCHAR(200) NULL,
    status      VARCHAR(20) NOT NULL DEFAULT 'fechado' COMMENT 'fechado|aberto',
    criado_em   DATETIME DEFAULT CURRENT_TIMESTAMP,
    aberto_em   DATETIME NULL,
    KEY idx_usuario (usuario_id),
    KEY idx_status (usuario_id, status),
    CONSTRAINT fk_pac_usuario FOREIGN KEY (usuario_id)
        REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================
-- 4. Inventario — quantas de cada figurinha o usuario tem
-- =============================================================
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

-- =============================================================
-- 5. Conteudo de cada pacote aberto (historico/auditoria)
-- =============================================================
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
