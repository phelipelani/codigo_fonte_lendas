<?php
// ====================================================
// BOOTSTRAP — ponto de entrada do módulo de presença
// Integrado com a estrutura existente do Hostinger
// ====================================================

// Raiz do projeto (api_extraido/)
define('ROOT_PATH', dirname(__DIR__));

// Carrega variáveis do .env usando o loader existente do projeto
require_once ROOT_PATH . '/config/env.php';

// Carrega a classe Database existente do projeto
require_once ROOT_PATH . '/config/database.php';

// Timezone Brasil
date_default_timezone_set('America/Sao_Paulo');

// ── Configurações do bot lidas do .env ──────────────
define('EVOLUTION_URL',      $_ENV['EVOLUTION_URL']      ?? '');
define('EVOLUTION_INSTANCE', $_ENV['EVOLUTION_INSTANCE'] ?? '');
define('EVOLUTION_APIKEY',   $_ENV['EVOLUTION_APIKEY']   ?? '');
define('ID_GRUPO',           $_ENV['WHATSAPP_GRUPO']     ?? '');
define('MEU_NUMERO',         $_ENV['ADMIN_NUMERO']       ?? '');

define('DIA_RACHA',     $_ENV['DIA_RACHA']     ?? 'Terça');
define('HORARIO_RACHA', $_ENV['HORARIO_RACHA'] ?? '21:00');
define('LOCAL_RACHA',   $_ENV['LOCAL_RACHA']   ?? 'Arena Litoral');

define('INTERVALO_LEMBRETE_HORAS', (int)($_ENV['INTERVALO_LEMBRETE_HORAS'] ?? 2));

// ── Jogadores e apelidos (fixos em PHP) ─────────────
require_once __DIR__ . '/config.php';
