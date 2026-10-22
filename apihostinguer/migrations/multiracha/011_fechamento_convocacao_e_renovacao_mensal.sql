-- =============================================================================
-- MIGRATION 011: FECHAMENTO PRÉ-JOGO DE CONVOCAÇÃO, AUDITORIA E RENOVAÇÃO MENSAL
-- Arquivo: 011_fechamento_convocacao_e_renovacao_mensal.sql
-- =============================================================================

-- 1. Suporte a Chave PIX e Instruções de Pagamento oficiais no cadastro do Racha
ALTER TABLE `rachas`
  ADD COLUMN `chave_pix` VARCHAR(100) NULL AFTER `dia_vencimento_padrao`,
  ADD COLUMN `instrucoes_pagamento` VARCHAR(255) NULL AFTER `chave_pix`;

-- 2. Separação explícita do ciclo pré-jogo da convocação na tabela de sessões
--    (status_convocacao 'aberta' ou 'fechada', independente de apuracao_presenca)
ALTER TABLE `racha_sessoes`
  ADD COLUMN `status_convocacao` ENUM('aberta','fechada') NOT NULL DEFAULT 'aberta' AFTER `motivo_cancelamento`,
  ADD COLUMN `fechamento_convocacao_em` DATETIME NULL AFTER `status_convocacao`,
  ADD COLUMN `fechamento_convocacao_por_usuario_id` INT(11) NULL AFTER `fechamento_convocacao_em`,
  ADD CONSTRAINT `fk_rs_fechamento_convocacao_user` FOREIGN KEY (`fechamento_convocacao_por_usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE RESTRICT;

-- 3. Expansão dos tipos de evento em racha_sessao_eventos preservando triggers append-only
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
      'promocao_fila_espera',
      'fechamento_convocacao',
      'reabertura_convocacao',
      'resposta_tardia_convocacao'
  ) NOT NULL;

-- 4. Tabela de controle de renovações mensais por competência YYYY-MM
--    (separada da sessão semanal, registrando a intenção do mensalista sem encerrar contrato automaticamente)
CREATE TABLE IF NOT EXISTS `racha_mensalistas_renovacoes` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `racha_id` INT UNSIGNED NOT NULL,
  `jogador_id` INT(11) NOT NULL,
  `competencia_ano` SMALLINT UNSIGNED NOT NULL,
  `competencia_mes` TINYINT UNSIGNED NOT NULL,
  `valor_cobrado` DECIMAL(10,2) NOT NULL,
  `status_envio` ENUM('pendente', 'enviado', 'falha', 'dispensado') NOT NULL DEFAULT 'pendente',
  `enviado_em` DATETIME NULL,
  `intencao_renovacao` ENUM('sem_resposta', 'sim', 'nao') NOT NULL DEFAULT 'sem_resposta',
  `resposta_em` DATETIME(6) NULL,
  `mensagem_externa_id` VARCHAR(120) NULL,
  `observacao_organizador` VARCHAR(255) NULL,
  `disparado_por_usuario_id` INT(11) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_rmr_racha_jogador_comp` (`racha_id`, `jogador_id`, `competencia_ano`, `competencia_mes`),
  KEY `idx_rmr_racha_comp` (`racha_id`, `competencia_ano`, `competencia_mes`),
  CONSTRAINT `chk_rmr_mes` CHECK (`competencia_mes` BETWEEN 1 AND 12),
  CONSTRAINT `chk_rmr_valor` CHECK (`valor_cobrado` >= 0),
  CONSTRAINT `fk_rmr_racha` FOREIGN KEY (`racha_id`) REFERENCES `rachas` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_rmr_participante` FOREIGN KEY (`racha_id`, `jogador_id`) REFERENCES `racha_participantes` (`racha_id`, `jogador_id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_rmr_usuario` FOREIGN KEY (`disparado_por_usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
