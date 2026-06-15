-- Migration 007: adiciona coluna `time` em album_figurinhas
-- (a coluna foi adicionada em dev depois que a 004 ja tinha rodado em
--  producao, entao precisa de uma migration separada para producao).

ALTER TABLE album_figurinhas
    ADD COLUMN `time` VARCHAR(100) NULL
    COMMENT 'Time do jogador/figurinha'
    AFTER nome;
