<?php
/**
 * Utilitário para Gerenciamento de JWT
 * Arquivo: src/utils/JWT.php
 */

class JWT {
    private static $secret;
    
    public static function init() {
        if (empty($_ENV['JWT_SECRET'])) {
            throw new Exception('JWT_SECRET não está configurado no .env');
        }
        self::$secret = $_ENV['JWT_SECRET'];
    }
    
    /**
     * Gera um token JWT
     */
    public static function generate($payload, $expiresIn = 86400) {
        self::init();
        
        $header = [
            'typ' => 'JWT',
            'alg' => 'HS256'
        ];
        
        $payload['iat'] = time();
        $payload['exp'] = time() + $expiresIn;
        
        $headerEncoded = self::base64UrlEncode(json_encode($header));
        $payloadEncoded = self::base64UrlEncode(json_encode($payload));
        
        $signature = hash_hmac('sha256', "{$headerEncoded}.{$payloadEncoded}", self::$secret, true);
        $signatureEncoded = self::base64UrlEncode($signature);
        
        return "{$headerEncoded}.{$payloadEncoded}.{$signatureEncoded}";
    }
    
    /**
     * Verifica e decodifica um token JWT
     */
    public static function verify($token) {
        self::init();
        
        $parts = explode('.', $token);
        
        if (count($parts) !== 3) {
            throw new Exception('Token inválido.');
        }
        
        list($headerEncoded, $payloadEncoded, $signatureEncoded) = $parts;
        
        $signature = self::base64UrlDecode($signatureEncoded);
        $expectedSignature = hash_hmac('sha256', "{$headerEncoded}.{$payloadEncoded}", self::$secret, true);
        
        if (!hash_equals($expectedSignature, $signature)) {
            throw new Exception('Token inválido.');
        }
        
        $payload = json_decode(self::base64UrlDecode($payloadEncoded), true);
        
        if (isset($payload['exp']) && $payload['exp'] < time()) {
            throw new Exception('Token expirado.');
        }
        
        return $payload;
    }
    
    private static function base64UrlEncode($data) {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }
    
    private static function base64UrlDecode($data) {
        return base64_decode(strtr($data, '-_', '+/'));
    }
}
