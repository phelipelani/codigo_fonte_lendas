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
$envPath = __DIR__ . '/../.env';
loadEnv($envPath);
