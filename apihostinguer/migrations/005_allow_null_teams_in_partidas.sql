-- ============================================================================
-- Migration 005: Permite NULL em timeA_id e timeB_id
-- Necessário para criar partidas de mata-mata com slots vazios (Final, 3º Lugar)
-- que serão preenchidos depois conforme os vencedores avançam.
-- ============================================================================

ALTER TABLE campeonato_partidas
  MODIFY COLUMN timeA_id INT(11) DEFAULT NULL,
  MODIFY COLUMN timeB_id INT(11) DEFAULT NULL;
