-- =============================================================================
-- MIGRATION 010: INSTÂNCIAS WHATSAPP (EVOLUTION API) POR RACHA E LOG DE MENSAGENS
-- Arquivo: 010_create_whatsapp_instancias_e_mensagens.sql
-- =============================================================================

-- 1. Associação controlada 1:1 entre racha e instância da Evolution API
--    - `instance_name` é derivado de forma determinística do `racha_id` ('futlendas_racha_{id}').
--    - `webhook_secret_hash` armazena apenas o hash SHA-256 (64 hex chars) do segredo do webhook,
--      nunca armazenando credenciais, chaves de API, tokens em texto aberto ou QR Codes.
CREATE TABLE IF NOT EXISTS `racha_whatsapp_instancias` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `racha_id` INT UNSIGNED NOT NULL,
  `instance_name` VARCHAR(80) NOT NULL,
  `status_conexao` ENUM('desconectado','aguardando_qr','conectado','erro') NOT NULL DEFAULT 'desconectado',
  `estado_bruto_api` VARCHAR(40) NULL,
  `numero_conectado` VARCHAR(20) NULL,
  `webhook_configurado` TINYINT(1) NOT NULL DEFAULT 0,
  `webhook_secret_hash` CHAR(64) NOT NULL,
  `webhook_configurado_em` DATETIME NULL,
  `configurado_por_usuario_id` INT(11) NULL,
  `ultima_conexao_em` DATETIME NULL,
  `ultima_atualizacao_estado_em` DATETIME NULL,
  `ultimo_erro_codigo` VARCHAR(60) NULL,
  `ultimo_erro_resumo` VARCHAR(255) NULL,
  `diagnostico_metadados` JSON NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_rwi_racha` (`racha_id`),
  UNIQUE KEY `uk_rwi_instance_name` (`instance_name`),
  KEY `idx_rwi_status` (`status_conexao`),
  CONSTRAINT `chk_rwi_instance_prefix` CHECK (`instance_name` REGEXP '^futlendas_racha_[0-9]+$'),
  CONSTRAINT `chk_rwi_secret_hash` CHECK (`webhook_secret_hash` REGEXP '^[a-f0-9]{64}$'),
  CONSTRAINT `fk_rwi_racha` FOREIGN KEY (`racha_id`) REFERENCES `rachas` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_rwi_usuario` FOREIGN KEY (`configurado_por_usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Histórico e controle de idempotência de mensagens WhatsApp por racha
--    - Diferencia explicitamente `pendente`, `enviado`, `falha` e `desconhecido_timeout`.
--    - Protege contra disparos duplicados acidentais via `uk_rwm_racha_idempotencia`.
CREATE TABLE IF NOT EXISTS `racha_whatsapp_mensagens` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `racha_id` INT UNSIGNED NOT NULL,
  `sessao_id` INT UNSIGNED NULL,
  `jogador_id` INT(11) NULL,
  `usuario_id` INT(11) NULL,
  `telefone_destino` VARCHAR(20) NOT NULL,
  `direcao` ENUM('saida','entrada') NOT NULL DEFAULT 'saida',
  `tipo_mensagem` ENUM(
      'convocacao_semanal',
      'lembrete_semanal',
      'promocao_fila',
      'renovacao_mensal',
      'comunicado',
      'resposta_instrucao',
      'resposta_participante'
  ) NOT NULL,
  `competencia_ano` SMALLINT UNSIGNED NULL,
  `competencia_mes` TINYINT UNSIGNED NULL,
  `chave_idempotencia` VARCHAR(140) NOT NULL,
  `status_envio` ENUM(
      'pendente',
      'enviado',
      'falha',
      'desconhecido_timeout',
      'recebida',
      'rejeitada'
  ) NOT NULL DEFAULT 'pendente',
  `mensagem_externa_id` VARCHAR(120) NULL,
  `resumo_conteudo` VARCHAR(160) NULL,
  `tentativa_em` DATETIME(6) NOT NULL,
  `enviado_em` DATETIME(6) NULL,
  `respondido_em` DATETIME(6) NULL,
  `erro_codigo` VARCHAR(60) NULL,
  `erro_resumo` VARCHAR(255) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_rwm_racha_idempotencia` (`racha_id`, `chave_idempotencia`),
  KEY `idx_rwm_racha_sessao` (`racha_id`, `sessao_id`, `tipo_mensagem`),
  KEY `idx_rwm_racha_jogador` (`racha_id`, `jogador_id`),
  KEY `idx_rwm_msg_externa` (`racha_id`, `mensagem_externa_id`),
  CONSTRAINT `chk_rwm_competencia_mes` CHECK (`competencia_mes` IS NULL OR (`competencia_mes` BETWEEN 1 AND 12)),
  CONSTRAINT `chk_rwm_enviado_exige_sucesso` CHECK (`status_envio` != 'enviado' OR `enviado_em` IS NOT NULL),
  CONSTRAINT `fk_rwm_racha` FOREIGN KEY (`racha_id`) REFERENCES `rachas` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_rwm_sessao_racha` FOREIGN KEY (`sessao_id`, `racha_id`) REFERENCES `racha_sessoes` (`id`, `racha_id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_rwm_jogador` FOREIGN KEY (`jogador_id`) REFERENCES `jogadores` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_rwm_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
