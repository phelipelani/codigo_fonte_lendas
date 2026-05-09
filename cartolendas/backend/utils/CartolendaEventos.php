<?php
/**
 * Sistema de eventos em tempo real para o Cartolendas.
 *
 * Usa polling leve (tabela cartolendas_eventos) como alternativa
 * a WebSocket, compatível com hosting compartilhado.
 *
 * Eventos são mantidos por 24h e limpos automaticamente.
 */

class CartolendaEventos
{
    /**
     * Dispara um evento que será captado pelos clientes via polling.
     */
    public static function fire(string $tipo, ?array $payload = null): void
    {
        try {
            $db = Database::getInstance();
            $db->execute(
                "INSERT INTO cartolendas_eventos (tipo, payload) VALUES (?, ?)",
                [$tipo, $payload ? json_encode($payload) : null]
            );
        } catch (\Throwable $e) {
            error_log("[CartolendaEventos] Erro ao disparar evento '{$tipo}': " . $e->getMessage());
        }
    }

    /**
     * Retorna eventos desde um timestamp.
     */
    public static function since(string $since): array
    {
        $db = Database::getInstance();
        $events = $db->fetchAll(
            "SELECT id, tipo, payload, created_at FROM cartolendas_eventos
             WHERE created_at > ? ORDER BY created_at ASC LIMIT 50",
            [$since]
        );

        // Decodifica payload JSON
        foreach ($events as &$ev) {
            $ev['payload'] = $ev['payload'] ? json_decode($ev['payload'], true) : null;
        }

        return $events;
    }

    /**
     * Limpeza probabilística — roda ~2% das requisições.
     * Remove eventos com mais de 24h.
     */
    public static function cleanup(): void
    {
        if (random_int(1, 50) !== 1) return;

        try {
            $db = Database::getInstance();
            $db->execute(
                "DELETE FROM cartolendas_eventos WHERE created_at < NOW() - INTERVAL 24 HOUR"
            );
        } catch (\Throwable $e) {
            error_log("[CartolendaEventos] Erro na limpeza: " . $e->getMessage());
        }
    }
}
