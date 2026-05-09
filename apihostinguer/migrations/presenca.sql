-- ============================================================
-- Migração: tabelas do bot de presença FutLendas
-- Execute via: https://seusite.com.br/presenca/setup
-- OU cole direto no phpMyAdmin do Hostinger
-- ============================================================

CREATE TABLE IF NOT EXISTS lista_presenca (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    data_racha    VARCHAR(10)  NOT NULL COMMENT 'DD/MM/YYYY',
    semana        TINYINT      NOT NULL COMMENT 'Semana ISO do ano',
    ano           SMALLINT     NOT NULL,
    disparado     TINYINT(1)   NOT NULL DEFAULT 0,
    fechado       TINYINT(1)   NOT NULL DEFAULT 0,
    criado_em     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_semana_ano (semana, ano)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS jogadores_presenca (
    id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    lista_id          INT UNSIGNED NOT NULL,
    nome              VARCHAR(100) NOT NULL,
    numero            VARCHAR(20)  NOT NULL COMMENT 'Só dígitos',
    tipo              ENUM('linha','goleiro') NOT NULL DEFAULT 'linha',
    apelido           VARCHAR(100) DEFAULT NULL,
    status            ENUM('aguardando','confirmado','ausente','a_confirmar') NOT NULL DEFAULT 'aguardando',
    horario_resposta  VARCHAR(20)  DEFAULT NULL COMMENT 'DD/MM/YYYY HH:MM',
    ordem             SMALLINT     DEFAULT NULL COMMENT 'Ordem de confirmação',
    disparado_em      DATETIME     DEFAULT NULL,
    ultimo_lembrete   DATETIME     DEFAULT NULL,
    FOREIGN KEY (lista_id) REFERENCES lista_presenca(id) ON DELETE CASCADE,
    INDEX idx_lista_numero (lista_id, numero),
    INDEX idx_lista_status (lista_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
