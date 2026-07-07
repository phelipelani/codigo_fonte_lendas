-- =============================================================
-- FutLendas — Reset de usuários
-- Mantém: admin (id=1) e lani (id=2)
-- Apaga: todos os outros usuários e seus dados pessoais
-- Preserva: todo o histórico de jogo (campeonatos, rodadas,
--           partidas, estatísticas, times, ligas de futebol)
-- =============================================================
-- Rodar no phpMyAdmin em uma única execução.
-- =============================================================

SET FOREIGN_KEY_CHECKS = 0;

-- ── 1. ÁLBUM — zera inventário de TODOS (incluindo lani) ────────────────────
-- O catálogo (album_figurinhas e album_paginas) é preservado.

TRUNCATE TABLE album_pacote_figurinhas;
TRUNCATE TABLE album_pacotes;
TRUNCATE TABLE album_inventario;
TRUNCATE TABLE album_trocas;

-- ── 2. CARTOLENDAS — remove dados dos outros usuários ────────────────────────

-- 2a. escalações ligadas a times cartolendas de outros usuários
DELETE FROM cartolendas_escalacao
WHERE cartolendas_time_id IN (
    SELECT id FROM cartolendas_times WHERE usuario_id NOT IN (1, 2)
);

-- 2b. times cartolendas de outros usuários
DELETE FROM cartolendas_times
WHERE usuario_id NOT IN (1, 2);

-- 2c. membros de liga que não são admin/lani
DELETE FROM cartolendas_liga_membros
WHERE usuario_id NOT IN (1, 2);

-- 2d. ligas criadas por outros usuários (deixa a liga do lani)
DELETE FROM cartolendas_ligas
WHERE criador_id NOT IN (1, 2);

-- 2e. capitão de outros usuários (sem usuario_id direto — liga via cartolendas_time_id)
DELETE FROM cartolendas_capitao
WHERE cartolendas_time_id IN (
    SELECT id FROM cartolendas_times WHERE usuario_id NOT IN (1, 2)
);

-- 2f. draft de outros usuários
DELETE FROM cartolendas_draft
WHERE usuario_id NOT IN (1, 2);

-- 2g. chat de outros usuários
DELETE FROM cartolendas_chat
WHERE usuario_id NOT IN (1, 2);

-- 2h. ranking de outros usuários
DELETE FROM cartolendas_ranking
WHERE usuario_id NOT IN (1, 2);

-- 2i. transferências de outros usuários
DELETE FROM cartolendas_transferencias
WHERE usuario_id NOT IN (1, 2);

-- ── 3. NOTIFICAÇÕES — limpa de outros usuários ───────────────────────────────

DELETE FROM notificacoes
WHERE usuario_id NOT IN (1, 2);

-- ── 4. CONVITES — apaga todos (admin vai convidar de novo) ───────────────────

TRUNCATE TABLE convites;

-- ── 5. JOGADORES — desvincula conta dos que serão deletados ─────────────────
-- Mantém o perfil do jogador (estatísticas intactas), só remove o login.
-- O jogador poderá se cadastrar de novo e vincular o mesmo perfil.

UPDATE jogadores
SET usuario_id = NULL
WHERE usuario_id NOT IN (1, 2)
  AND usuario_id IS NOT NULL;

-- ── 6. USUARIOS — apaga todos exceto admin e lani ────────────────────────────

DELETE FROM usuarios
WHERE id NOT IN (1, 2);

-- ── 7. RESET de auto_increment para ficar limpo ──────────────────────────────

ALTER TABLE album_inventario      AUTO_INCREMENT = 1;
ALTER TABLE album_pacotes         AUTO_INCREMENT = 1;
ALTER TABLE album_pacote_figurinhas AUTO_INCREMENT = 1;
ALTER TABLE album_trocas          AUTO_INCREMENT = 1;
ALTER TABLE cartolendas_times     AUTO_INCREMENT = 1;
ALTER TABLE cartolendas_escalacao AUTO_INCREMENT = 1;
ALTER TABLE cartolendas_ranking   AUTO_INCREMENT = 1;
ALTER TABLE cartolendas_transferencias AUTO_INCREMENT = 1;
ALTER TABLE notificacoes          AUTO_INCREMENT = 1;
ALTER TABLE convites              AUTO_INCREMENT = 1;

SET FOREIGN_KEY_CHECKS = 1;

-- =============================================================
-- ✅ Resultado esperado:
--   usuarios: 2 registros (admin + lani)
--   jogadores: todos mantidos, mas só lani com usuario_id
--   album_inventario: zerado (todos)
--   album_pacotes: zerado (todos)
--   album_trocas: zerado (todos)
--   cartolendas_times: só os do lani
--   notificacoes: só as do admin/lani
--   convites: zerado
-- =============================================================
-- Verificação rápida após rodar:
-- SELECT id, username, role FROM usuarios;
-- SELECT id, nome, usuario_id FROM jogadores WHERE usuario_id IS NOT NULL;
-- SELECT COUNT(*) FROM album_inventario;
-- =============================================================
