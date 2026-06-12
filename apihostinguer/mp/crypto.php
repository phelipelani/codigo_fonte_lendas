<?php
// ====================================================
// MP Crypto — criptografa tokens do Mercado Pago no banco
// Chave: MP_CRYPT_KEY no .env (qualquer texto serve; o ideal
// são 32 bytes em base64: php -r "echo base64_encode(random_bytes(32));")
//
// Usa sodium se disponível, senão OpenSSL (AES-256-GCM).
// Nunca dá fatal: sem nenhuma lib, grava em texto puro com aviso no log.
//
// Formatos no banco:
//   enc:v1:<base64>  → sodium secretbox (nonce 24 + cipher)
//   enc:v2:<base64>  → openssl aes-256-gcm (iv 12 + tag 16 + cipher)
//   sem prefixo      → legado em texto puro (aceito na leitura)
// ====================================================

function mp_crypt_key(): ?string
{
    $raw = $_ENV['MP_CRYPT_KEY'] ?? '';
    if ($raw === '') {
        return null;
    }
    // Formato ideal: 32 bytes em base64
    $key = base64_decode($raw, true);
    if ($key !== false && strlen($key) === 32) {
        return $key;
    }
    // Qualquer outro texto: deriva uma chave de 32 bytes via SHA-256
    return hash('sha256', $raw, true);
}

/** Criptografa um token para gravar no banco. Sem chave/lib, grava em texto puro (com aviso no log). */
function mp_encrypt(?string $plain): ?string
{
    if ($plain === null || $plain === '') {
        return $plain;
    }
    $key = mp_crypt_key();
    if ($key === null) {
        error_log('[MP Crypto] MP_CRYPT_KEY ausente — token salvo SEM criptografia. Configure no .env.');
        return $plain;
    }

    if (function_exists('sodium_crypto_secretbox')) {
        $nonce = random_bytes(SODIUM_CRYPTO_SECRETBOX_NONCEBYTES);
        return 'enc:v1:' . base64_encode($nonce . sodium_crypto_secretbox($plain, $nonce, $key));
    }

    if (function_exists('openssl_encrypt')) {
        $iv     = random_bytes(12);
        $tag    = '';
        $cipher = openssl_encrypt($plain, 'aes-256-gcm', $key, OPENSSL_RAW_DATA, $iv, $tag);
        if ($cipher !== false && strlen($tag) === 16) {
            return 'enc:v2:' . base64_encode($iv . $tag . $cipher);
        }
    }

    error_log('[MP Crypto] Nenhuma lib de criptografia disponível (sodium/openssl) — token salvo SEM criptografia.');
    return $plain;
}

/** Descriptografa um token lido do banco. Valores legados (texto puro) passam direto. */
function mp_decrypt(?string $stored): ?string
{
    if ($stored === null || $stored === '') {
        return $stored;
    }

    // sodium secretbox
    if (str_starts_with($stored, 'enc:v1:')) {
        if (!function_exists('sodium_crypto_secretbox_open')) {
            error_log('[MP Crypto] Token salvo com sodium mas a extensão não está disponível.');
            return null;
        }
        $key = mp_crypt_key();
        if ($key === null) {
            return null;
        }
        $raw = base64_decode(substr($stored, 7), true);
        if ($raw === false || strlen($raw) <= SODIUM_CRYPTO_SECRETBOX_NONCEBYTES) {
            return null;
        }
        $nonce  = substr($raw, 0, SODIUM_CRYPTO_SECRETBOX_NONCEBYTES);
        $cipher = substr($raw, SODIUM_CRYPTO_SECRETBOX_NONCEBYTES);
        $plain  = sodium_crypto_secretbox_open($cipher, $nonce, $key);
        return $plain === false ? null : $plain;
    }

    // openssl aes-256-gcm
    if (str_starts_with($stored, 'enc:v2:')) {
        if (!function_exists('openssl_decrypt')) {
            error_log('[MP Crypto] Token salvo com openssl mas a extensão não está disponível.');
            return null;
        }
        $key = mp_crypt_key();
        if ($key === null) {
            return null;
        }
        $raw = base64_decode(substr($stored, 7), true);
        if ($raw === false || strlen($raw) < 29) {
            return null;
        }
        $iv     = substr($raw, 0, 12);
        $tag    = substr($raw, 12, 16);
        $cipher = substr($raw, 28);
        $plain  = openssl_decrypt($cipher, 'aes-256-gcm', $key, OPENSSL_RAW_DATA, $iv, $tag);
        return $plain === false ? null : $plain;
    }

    return $stored; // legado em texto puro
}
