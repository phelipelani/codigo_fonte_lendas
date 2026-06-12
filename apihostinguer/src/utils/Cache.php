<?php
/**
 * Cache simples para respostas de endpoints pesados (Hall da Fama, Analytics).
 * Usa APCu se disponível, senão arquivos em /tmp (mesmo padrão do RateLimiter).
 *
 * Uso:
 *   $json = Cache::get('hall_da_fama');
 *   Cache::set('hall_da_fama', $json, 300);
 *   Cache::clear(); // invalida tudo (chamado em requests de escrita)
 */
class Cache
{
    private const PREFIX = 'flc_';

    public static function get(string $key): ?string
    {
        $k = self::PREFIX . md5($key);

        if (function_exists('apcu_fetch')) {
            $val = apcu_fetch($k, $ok);
            return $ok && is_string($val) ? $val : null;
        }

        $file = self::dir() . '/' . $k . '.cache';
        if (!is_file($file)) {
            return null;
        }
        $raw = @file_get_contents($file);
        if ($raw === false) {
            return null;
        }
        $data = @json_decode($raw, true);
        if (!is_array($data) || !isset($data['exp'], $data['val']) || $data['exp'] < time()) {
            @unlink($file);
            return null;
        }
        return $data['val'];
    }

    public static function set(string $key, string $value, int $ttl = 300): void
    {
        $k = self::PREFIX . md5($key);

        if (function_exists('apcu_store')) {
            apcu_store($k, $value, $ttl);
            return;
        }

        @file_put_contents(
            self::dir() . '/' . $k . '.cache',
            json_encode(['exp' => time() + $ttl, 'val' => $value]),
            LOCK_EX
        );
    }

    /** Invalida todo o cache (chamado quando algo é gravado no banco). */
    public static function clear(): void
    {
        if (function_exists('apcu_delete') && class_exists('APCUIterator')) {
            apcu_delete(new APCUIterator('/^' . self::PREFIX . '/'));
            return;
        }

        foreach (glob(self::dir() . '/' . self::PREFIX . '*.cache') ?: [] as $file) {
            @unlink($file);
        }
    }

    private static function dir(): string
    {
        $dir = sys_get_temp_dir() . '/futlendas_cache';
        if (!is_dir($dir)) {
            @mkdir($dir, 0700, true);
        }
        return $dir;
    }
}
