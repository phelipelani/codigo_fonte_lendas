-- Migration 003: Adiciona coluna whatsapp em usuarios
-- Usada para vincular a conta do app (usuarios) ao bot do racha
-- (bot_jogadores.numero) e ao Album de Figurinhas.

ALTER TABLE usuarios
  ADD COLUMN whatsapp VARCHAR(20) NULL DEFAULT NULL AFTER email;
