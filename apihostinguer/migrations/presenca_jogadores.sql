-- ============================================================
-- Migração: tabelas de jogadores e config dinâmica do bot
-- Execute via: https://futlendas.com.br/api/presenca/setup2
-- OU cole no phpMyAdmin do Hostinger
-- ============================================================

-- Tabela de jogadores gerenciáveis pelo painel
CREATE TABLE IF NOT EXISTS bot_jogadores (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nome          VARCHAR(100) NOT NULL,
    numero        VARCHAR(20)  NOT NULL COMMENT 'Só dígitos, sem +',
    tipo          ENUM('linha','goleiro') NOT NULL DEFAULT 'linha',
    ativo         TINYINT(1)   NOT NULL DEFAULT 1,
    criado_em     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY idx_numero (numero)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de configurações editáveis pelo painel
CREATE TABLE IF NOT EXISTS bot_config (
    chave VARCHAR(50)  NOT NULL PRIMARY KEY,
    valor VARCHAR(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Valores padrão de config (não sobrescreve se já existirem)
INSERT IGNORE INTO bot_config (chave, valor) VALUES
    ('dia_racha',                'Terça'),
    ('horario_racha',            '21:00'),
    ('local_racha',              'Arena Litoral'),
    ('intervalo_lembrete_horas', '2');

-- Jogadores de linha (seed inicial — só insere se tabela estiver vazia)
INSERT IGNORE INTO bot_jogadores (nome, numero, tipo) VALUES
    ('Lani',      '5512978131357', 'linha'),
    ('Dieguinho', '5512992007083', 'linha'),
    ('Wagner',    '5512992041217', 'linha'),
    ('Michel',    '5511967030587', 'linha'),
    ('Alan',      '5512981049423', 'linha'),
    ('Higor',     '5512997973738', 'linha'),
    ('Luis',      '5512981355075', 'linha'),
    ('Andre B.',  '5511967404461', 'linha'),
    ('Andrei',    '5512991919135', 'linha'),
    ('Zé',        '5512983033719', 'linha'),
    ('Xan',       '5512982976972', 'linha'),
    ('Maranhao',  '5512991665602', 'linha'),
    ('Marcelo',   '5512996872459', 'linha'),
    ('Rafael',    '5511995426912', 'linha'),
    ('Diones',    '5512996497136', 'linha'),
    ('Neco',      '5511971489454', 'linha'),
    ('Guedes',    '5511942012960', 'linha'),
    ('Caio',      '5512992354882', 'linha'),
    ('Iago',      '5512987002938', 'linha'),
    ('Matheus',   '5512997387576', 'linha'),
    ('Santana',   '5512997248860', 'linha'),
    ('Mike',      '5512981707675', 'linha'),
    ('Bigode',    '5512981789469', 'linha'),
    ('Victor',    '5512982673775', 'linha'),
    -- Goleiros
    ('Alex',      '5512981481214', 'goleiro'),
    ('Gogo',      '5512982454554', 'goleiro');
