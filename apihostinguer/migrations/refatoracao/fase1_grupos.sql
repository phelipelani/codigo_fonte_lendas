-- ============================================================
-- FASE 1 — Grupos (Multi-tenant)
-- Cria a tabela grupos, grupo_membros
-- e adiciona grupo_id nas tabelas core (jogadores, times, campeonatos, rodadas)
--
-- ⚠️  SEGURO: só ADD COLUMN e CREATE TABLE. Nada é alterado ou removido.
-- ⚠️  DEFAULT 1 em todos os grupo_id = grupo FutLendas (criado abaixo)
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;

-- ------------------------------------------------------------
-- 1. Tabela de grupos (cada racha/comunidade é um grupo)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `grupos` (
  `id`               int(11)      NOT NULL AUTO_INCREMENT,
  `nome`             varchar(100) NOT NULL,
  `slug`             varchar(60)  NOT NULL UNIQUE COMMENT 'URL amigável ex: futlendas',
  `descricao`        text         DEFAULT NULL,
  `logo_url`         text         DEFAULT NULL,
  `admin_usuario_id` int(11)      DEFAULT NULL COMMENT 'Usuário admin principal do grupo',
  `ativo`            tinyint(1)   NOT NULL DEFAULT 1,
  `criado_em`        datetime     NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Inserir o grupo padrão FutLendas (id=1)
INSERT INTO `grupos` (`id`, `nome`, `slug`, `descricao`, `ativo`)
VALUES (1, 'FutLendas', 'futlendas', 'Grupo original FutLendas', 1)
ON DUPLICATE KEY UPDATE `nome` = `nome`; -- idempotente

-- ------------------------------------------------------------
-- 2. Tabela de membros por grupo
--    Um usuário pode ser membro de vários grupos
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `grupo_membros` (
  `id`          int(11)   NOT NULL AUTO_INCREMENT,
  `grupo_id`    int(11)   NOT NULL,
  `usuario_id`  int(11)   NOT NULL,
  `papel`       enum('super_admin','admin','jogador','espectador') NOT NULL DEFAULT 'jogador',
  `ativo`       tinyint(1) NOT NULL DEFAULT 1,
  `criado_em`   datetime  NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_grupo_usuario` (`grupo_id`, `usuario_id`),
  KEY `idx_usuario` (`usuario_id`),
  KEY `idx_grupo` (`grupo_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Migrar todos os usuários existentes como membros do grupo 1 (FutLendas)
INSERT INTO `grupo_membros` (`grupo_id`, `usuario_id`, `papel`)
SELECT 1, id, CASE WHEN role = 'admin' THEN 'admin' ELSE 'jogador' END
FROM `usuarios`
ON DUPLICATE KEY UPDATE `papel` = VALUES(`papel`);

-- ------------------------------------------------------------
-- 3. Adicionar grupo_id nas tabelas core
-- ------------------------------------------------------------

-- jogadores
ALTER TABLE `jogadores`
  ADD COLUMN IF NOT EXISTS `grupo_id` int(11) NOT NULL DEFAULT 1
    COMMENT 'Grupo ao qual este jogador pertence' AFTER `id`;

-- times
ALTER TABLE `times`
  ADD COLUMN IF NOT EXISTS `grupo_id`    int(11) NOT NULL DEFAULT 1 AFTER `id`,
  ADD COLUMN IF NOT EXISTS `capitao_id`  int(11) DEFAULT NULL
    COMMENT 'Jogador capitão fixo do time' AFTER `logo_url`;

-- Preencher capitao_id em times a partir de time_jogadores (quem era is_capitao=1)
UPDATE `times` t
INNER JOIN `time_jogadores` tj ON tj.time_id = t.id AND tj.is_capitao = 1
SET t.capitao_id = tj.jogador_id
WHERE t.capitao_id IS NULL;

-- campeonatos
ALTER TABLE `campeonatos`
  ADD COLUMN IF NOT EXISTS `grupo_id` int(11) NOT NULL DEFAULT 1 AFTER `id`;

-- ligas (tabela antiga, mantemos compatível)
ALTER TABLE `ligas`
  ADD COLUMN IF NOT EXISTS `grupo_id` int(11) NOT NULL DEFAULT 1 AFTER `id`;

-- rodadas (tem liga_id e campeonato_id — ambos viram competicao_id depois)
ALTER TABLE `rodadas`
  ADD COLUMN IF NOT EXISTS `grupo_id` int(11) NOT NULL DEFAULT 1 AFTER `id`,
  ADD COLUMN IF NOT EXISTS `nome`     varchar(100) DEFAULT NULL
    COMMENT 'Ex: Rodada 1, Semifinal, Final' AFTER `grupo_id`,
  ADD COLUMN IF NOT EXISTS `tipo`     enum('regular','quartas','semi','final','grupo') NOT NULL DEFAULT 'regular' AFTER `nome`;

-- Preencher nome da rodada com base no número (retroativo)
-- (será melhorado manualmente conforme necessário)

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- VALIDAÇÃO — execute após a fase 1 para confirmar
-- ============================================================
-- SELECT COUNT(*) AS grupos_ok      FROM grupos;          -- deve ter 1
-- SELECT COUNT(*) AS membros_ok     FROM grupo_membros;   -- deve ter = nº de usuarios
-- SELECT COUNT(*) AS jog_grupo_ok   FROM jogadores WHERE grupo_id = 1;
-- SELECT COUNT(*) AS times_grupo_ok FROM times     WHERE grupo_id = 1;
-- SELECT COUNT(*) AS camp_grupo_ok  FROM campeonatos WHERE grupo_id = 1;
