<?php
/**
 * Carregador de Variáveis de Ambiente (.env)
 * Arquivo: config/env.php
 */

function loadEnv($path) {
    if (!file_exists($path)) {
        throw new Exception("Arquivo .env não encontrado: {$path}");
    }
    
    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    
    foreach ($lines as $line) {
        // Ignora comentários
        if (strpos(trim($line), '#') === 0) {
            continue;
        }
        
        // Separa chave=valor
        if (strpos($line, '=') !== false) {
            list($key, $value) = explode('=', $line, 2);
            $key = trim($key);
            $value = trim($value);
            
            // Remove aspas se existirem
            $value = trim($value, '"\'');
            
            // Define a variável de ambiente
            $_ENV[$key] = $value;
            putenv("{$key}={$value}");
        }
    }
}

// Carrega o arquivo .env automaticamente
$envPath      = __DIR__ . '/../.env';
$sandboxLocal = __DIR__ . '/../../.env.sandbox.local';
$sandboxBase  = __DIR__ . '/../../.env.sandbox';

if (file_exists($envPath)) {
    loadEnv($envPath);
} elseif (file_exists($sandboxLocal) || file_exists($sandboxBase)) {
    if (file_exists($sandboxBase)) {
        loadEnv($sandboxBase);
    }
    if (file_exists($sandboxLocal)) {
        loadEnv($sandboxLocal);
    }

    // Mapeamentos de conveniência para o runtime local em sandbox
    if (isset($_ENV['DB_APP_USER']) && !isset($_ENV['DB_USER'])) {
        $_ENV['DB_USER'] = $_ENV['DB_APP_USER'];
        putenv("DB_USER={$_ENV['DB_APP_USER']}");
    }
    if (isset($_ENV['DB_APP_PASSWORD']) && !isset($_ENV['DB_PASSWORD'])) {
        $_ENV['DB_PASSWORD'] = $_ENV['DB_APP_PASSWORD'];
        putenv("DB_PASSWORD={$_ENV['DB_APP_PASSWORD']}");
    }
    if (empty($_ENV['JWT_SECRET'])) {
        $_ENV['JWT_SECRET'] = 'sandbox_jwt_secret_dev_key_only';
        putenv('JWT_SECRET=sandbox_jwt_secret_dev_key_only');
    }
    if (empty($_ENV['FRONTEND_URL'])) {
        $_ENV['FRONTEND_URL'] = 'http://localhost:5173';
        putenv('FRONTEND_URL=http://localhost:5173');
    }
    if (empty($_ENV['ENVIRONMENT'])) {
        $_ENV['ENVIRONMENT'] = 'sandbox';
        putenv('ENVIRONMENT=sandbox');
    }
    if (!isset($_ENV['EVOLUTION_SIMULADA'])) {
        $_ENV['EVOLUTION_SIMULADA'] = 'true';
        putenv('EVOLUTION_SIMULADA=true');
    }
} else {
    throw new Exception("Arquivo .env não encontrado: {$envPath}");
}
