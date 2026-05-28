-- Migration 005: Mural de Trocas do Album de Figurinhas
-- Tabela onde os usuarios disponibilizam figurinhas repetidas para troca.
--
-- Fluxo:
--   1. Usuario coloca uma figurinha repetida (quantidade >= 2) no mural  -> status 'disponivel'
--   2. Outro usuario escolhe uma repetida sua que o dono nao tem e troca -> status 'concluida'
--   3. O dono pode retirar a oferta antes de ser trocada                -> status 'cancelada'
--
-- A troca em si e atomica e mexe direto na album_inventario.

CREATE TABLE IF NOT EXISTS album_trocas (
    id                    INT AUTO_INCREMENT PRIMARY KEY,
    figurinha_id          INT NOT NULL          COMMENT 'Figurinha repetida oferecida no mural',
    ofertante_id          INT NOT NULL          COMMENT 'Dono que disponibilizou a figurinha',
    status                VARCHAR(20) NOT NULL DEFAULT 'disponivel'
                          COMMENT 'disponivel|concluida|cancelada',
    recebedor_id          INT NULL              COMMENT 'Quem efetuou a troca (pegou a figurinha)',
    figurinha_recebida_id INT NULL              COMMENT 'Figurinha que o ofertante recebeu em troca',
    criado_em             DATETIME DEFAULT CURRENT_TIMESTAMP,
    concluido_em          DATETIME NULL,
    KEY idx_status (status),
    KEY idx_ofertante (ofertante_id),
    KEY idx_figurinha (figurinha_id),
    CONSTRAINT fk_troca_fig FOREIGN KEY (figurinha_id)
        REFERENCES album_figurinhas(id) ON DELETE CASCADE,
    CONSTRAINT fk_troca_ofertante FOREIGN KEY (ofertante_id)
        REFERENCES usuarios(id) ON DELETE CASCADE,
    CONSTRAINT fk_troca_recebedor FOREIGN KEY (recebedor_id)
        REFERENCES usuarios(id) ON DELETE SET NULL,
    CONSTRAINT fk_troca_fig_rec FOREIGN KEY (figurinha_recebida_id)
        REFERENCES album_figurinhas(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
