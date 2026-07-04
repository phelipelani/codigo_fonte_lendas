<?php
/**
 * RateLimiter — limita tentativas por IP em janelas de tempo.
 * Usa APCu se disponível (recomendado em produção), senão arquivo em /tmp.
 * Sem dependências externas, zero overhead de banco.
 *
 * Uso:
 *   RateLimiter::check('login', $_SERVER['REMOTE_ADDR'], 5, 60);
 *   // máximo 5 tentativas por IP em 60 segundos
 */
class RateLimiter
{
    /**
     * Verifica e registra uma tentativa.
     * Lança HttpError 429 se o limite for excedido.
     *
     * @param string $action   Identificador da ação ('login', 'forgot_password')
     * @param string $key      Chave única (ex: IP, email)
     * @param int    $maxHits  Máximo de tentativas na janela
     * @param int    $window   Tamanho da janela em segundos
     */
    public static function check(string $action, string $key, int $maxHits, int $window): void
    {
        $cacheKey = "rl_{$action}_" . md5($key);
        $now      = time();

        if (function_exists('apcu_fetch')) {
            self::checkApcu($cacheKey, $now, $maxHits, $window);
        } else {
            self::checkFile($cacheKey, $now, $maxHits, $window);
        }
    }

    // ── APCu (recomendado em produção) ────────────────────────────────────────
    private static function checkApcu(string $key, int $now, int $maxHits, int $window): void
    {
        $data = apcu_fetch($key, $success);

        if (!$success || ($now - $data['start']) >= $window) {
            // Janela nova
            apcu_store($key, ['hits' => 1, 'start' => $now], $window + 5);
            return;
        }

        if ($data['hits'] >= $maxHits) {
            $retry = $window - ($now - $data['start']);
            self::throwTooManyRequests($retry);
        }

        $data['hits']++;
        apcu_store($key, $data, $window - ($now - $data['start']) + 5);
    }

    // ── File-based (fallback para XAMPP/dev sem APCu) ─────────────────────────
    private static function checkFile(string $key, int $now, int $maxHits, int $window): void
    {
        $dir  = sys_get_temp_dir() . '/futlendas_rl';
        if (!is_dir($dir)) {
            @mkdir($dir, 0700, true);
        }
        $file = $dir . '/' . $key . '.json';

        $data = ['hits' => 0, 'start' => $now];
        if (file_exists($file)) {
            $raw = @json_decode(file_get_contents($file), true);
            if ($raw && ($now - $raw['start']) < $window) {
                $data = $raw;
            }
        }

        if ($data['hits'] >= $maxHits) {
            $retry = $window - ($now - $data['start']);
            self::throwTooManyRequests($retry);
        }

        $data['hits']++;
        @file_put_contents($file, json_encode($data), LOCK_EX);
    }

    private static function throwTooManyRequests(int $retryAfter): void
    {
        if (!headers_sent()) {
            header("Retry-After: {$retryAfter}");
        }
        throw new HttpError(
            "Muitas tentativas. Aguarde {$retryAfter} segundos antes de tentar novamente.",
            429
        );
    }
}
