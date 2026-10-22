-- =============================================================================
-- MIGRATION 008: DADOS DE PARTICIPANTES (WHATSAPP), CONVOCAÇÃO E FILA DE ESPERA FIFO
-- Arquivo: 008_create_convocacoes_e_fila_espera.sql
-- =============================================================================

-- 1. Suporte a telefone WhatsApp normalizado e apelido no cadastro global de jogadores
--    (sem exigir conta em `usuarios` e sem UNIQUE global para evitar fusão indevida em telefones compartilhados)
ALTER TABLE `jogadores`
  ADD COLUMN `whatsapp` VARCHAR(20) NULL AFTER `posicao`,
  ADD COLUMN `apelido_bot` VARCHAR(60) NULL AFTER `whatsapp`,
  ADD KEY `idx_jogadores_whatsapp` (`whatsapp`);

-- 2. Contador transacional monotônico por sessão para ordenação FIFO estrita da fila de espera
CREATE TABLE IF NOT EXISTS `racha_sessao_fila_contadores` (
  `sessao_id` INT UNSIGNED NOT NULL PRIMARY KEY,
  `racha_id` INT UNSIGNED NOT NULL,
  `ultimo_sequencial_fila` INT UNSIGNED NOT NULL DEFAULT 0,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_rsfc_sessao_racha` (`sessao_id`, `racha_id`),
  CONSTRAINT `fk_rsfc_sessao_racha` FOREIGN KEY (`sessao_id`, `racha_id`) REFERENCES `racha_sessoes` (`id`, `racha_id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Convocação planejada, intenção de participação e fila de espera da sessão
--    (separada estritamente de `racha_sessao_presencas`, que registra apenas a apuração oficial de comparecimento)
CREATE TABLE IF NOT EXISTS `racha_sessao_convocacoes` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `racha_id` INT UNSIGNED NOT NULL,
  `sessao_id` INT UNSIGNED NOT NULL,
  `jogador_id` INT(11) NOT NULL,
  `tipo_participacao_convocacao` ENUM('mensalista','avulso_recorrente','avulso_convidado') NOT NULL,
  `telefone_destino` VARCHAR(20) NULL,
  `status_envio` ENUM('pendente_envio','enviado','falha_envio','dispensado') NOT NULL DEFAULT 'pendente_envio',
  `enviado_em` DATETIME NULL,
  `intencao_atual` ENUM('sem_resposta','sim','nao','depois') NOT NULL DEFAULT 'sem_resposta',
  `primeira_resposta_em` DATETIME(6) NULL,
  `ultima_resposta_em` DATETIME(6) NULL,
  `ultima_mensagem_id` VARCHAR(120) NULL,
  `situacao_vaga` ENUM(
      'aguardando_resposta',
      'aguardando_confirmacao_tardia',
      'vaga_reservada',
      'fila_espera',
      'promovido_titular',
      'vaga_liberada',
      'recusou_sem_vaga'
  ) NOT NULL DEFAULT 'aguardando_resposta',
  `ordem_fila` INT UNSIGNED NULL,
  `entrada_fila_em` DATETIME(6) NULL,
  `promovido_em` DATETIME(6) NULL,
  `promovido_por_vaga_de_jogador_id` INT(11) NULL,
  `notificacao_promocao_pendente` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_rsc_sessao_jogador` (`sessao_id`, `jogador_id`),
  UNIQUE KEY `uk_rsc_sessao_ordem_fila` (`sessao_id`, `ordem_fila`),
  KEY `idx_rsc_sessao_fila_elegivel` (`sessao_id`, `situacao_vaga`, `ordem_fila`),
  KEY `idx_rsc_racha_sessao` (`racha_id`, `sessao_id`),
  KEY `idx_rsc_sessao_telefone` (`sessao_id`, `telefone_destino`),
  CONSTRAINT `chk_rsc_ordem_positiva` CHECK (`ordem_fila` IS NULL OR `ordem_fila` > 0),
  CONSTRAINT `chk_rsc_fila_exige_ordem` CHECK (`situacao_vaga` NOT IN ('fila_espera', 'promovido_titular') OR `ordem_fila` IS NOT NULL),
  CONSTRAINT `chk_rsc_mensalista_sem_fila` CHECK (`tipo_participacao_convocacao` != 'mensalista' OR (`situacao_vaga` NOT IN ('fila_espera', 'promovido_titular') AND `ordem_fila` IS NULL)),
  CONSTRAINT `chk_rsc_respostas_cronologicas` CHECK (`primeira_resposta_em` IS NULL OR `ultima_resposta_em` IS NULL OR `ultima_resposta_em` >= `primeira_resposta_em`),
  CONSTRAINT `fk_rsc_sessao_racha` FOREIGN KEY (`sessao_id`, `racha_id`) REFERENCES `racha_sessoes` (`id`, `racha_id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_rsc_participante` FOREIGN KEY (`racha_id`, `jogador_id`) REFERENCES `racha_participantes` (`racha_id`, `jogador_id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_rsc_promovido_vaga_de` FOREIGN KEY (`promovido_por_vaga_de_jogador_id`) REFERENCES `jogadores` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Controle de idempotência de mensagens/eventos de resposta por sessão
CREATE TABLE IF NOT EXISTS `racha_sessao_respostas_idempotencia` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `racha_id` INT UNSIGNED NOT NULL,
  `sessao_id` INT UNSIGNED NOT NULL,
  `jogador_id` INT(11) NOT NULL,
  `chave_idempotencia` VARCHAR(120) NOT NULL,
  `intencao_processada` ENUM('sim','nao','depois') NOT NULL,
  `resultado_resumo` JSON NULL,
  `processado_em` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  UNIQUE KEY `uk_rsri_racha_sessao_chave` (`racha_id`, `sessao_id`, `chave_idempotencia`),
  CONSTRAINT `fk_rsri_sessao_racha` FOREIGN KEY (`sessao_id`, `racha_id`) REFERENCES `racha_sessoes` (`id`, `racha_id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_rsri_participante` FOREIGN KEY (`racha_id`, `jogador_id`) REFERENCES `racha_participantes` (`racha_id`, `jogador_id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Expansão dos tipos de evento em `racha_sessao_eventos` preservando triggers append-only da Migration 007
ALTER TABLE `racha_sessao_eventos`
  MODIFY COLUMN `tipo_evento` ENUM(
      'criacao',
      'homologacao',
      'reabertura',
      'conclusao',
      'cancelamento',
      'alteracao_status_sessao',
      'confirmacao_presenca',
      'alteracao_presenca',
      'cancelamento_participacao',
      'substituicao_participante',
      'preparacao_convocacao',
      'intencao_recebida',
      'entrada_fila_espera',
      'recusa_convocacao',
      'promocao_fila_espera'
  ) NOT NULL;
