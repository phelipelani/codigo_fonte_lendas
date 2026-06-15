-- Migration 006: marca se o ofertante ja viu que sua figurinha foi trocada.
-- Usado para abrir o modal de "novidades de troca" so uma vez.

ALTER TABLE album_trocas
    ADD COLUMN ofertante_visto TINYINT(1) NOT NULL DEFAULT 0
    COMMENT 'Ofertante ja viu o aviso de que a troca foi concluida';
