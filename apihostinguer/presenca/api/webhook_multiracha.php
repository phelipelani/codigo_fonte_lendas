<?php
/**
 * Endpoint Autenticado de Webhook Multi-Racha para a Evolution API (WhatsApp)
 * Arquivo: apihostinguer/presenca/api/webhook_multiracha.php
 * Rota: POST /presenca/multiracha/webhook
 *
 * Preserva integralmente o webhook legado (`apihostinguer/presenca/api/webhook.php`) e
 * implementa validação criptográfica por instância (`webhook_secret_hash` via `hash_equals`),
 * isolamento por racha, filtro de `fromMe` e grupos (`@g.us`) e encaminhamento transacional
 * ao `RachaQueueService`.
 */

require_once __DIR__ . '/../../src/utils/HttpError.php';
require_once __DIR__ . '/../../src/middleware/RachaScopeMiddleware.php';
require_once __DIR__ . '/../../src/services/RachaQueueService.php';
require_once __DIR__ . '/../../src/services/WhatsAppEvolutionService.php';

if (!function_exists('processMultiRachaWebhookHttpRequest')) {
    /**
     * Processa uma requisição HTTP de webhook multi-racha e retorna `['http_code' => int, 'body' => array]`.
     */
    function processMultiRachaWebhookHttpRequest(
        ?string $rawInput = null,
        ?array $headers = null,
        ?array $queryParams = null,
        ?WhatsAppEvolutionService $customService = null
    ): array {
        $raw = $rawInput !== null ? $rawInput : (string)file_get_contents('php://input');
        $payload = json_decode($raw, true);

        if (!is_array($payload) || empty($payload)) {
            return [
                'http_code' => 400,
                'body'      => [
                    'ok'      => false,
                    'error'   => true,
                    'message' => 'Payload do webhook vazio ou JSON inválido.'
                ]
            ];
        }

        $reqHeaders = $headers ?? (function_exists('getallheaders') ? getallheaders() : $_SERVER);
        $reqQuery = $queryParams ?? $_GET;
        $service = $customService ?? new WhatsAppEvolutionService();

        try {
            $result = $service->handleIncomingWebhook($payload, $reqHeaders, $reqQuery);
            return [
                'http_code' => 200,
                'body'      => $result
            ];
        } catch (HttpError $e) {
            return [
                'http_code' => $e->getStatusCode(),
                'body'      => [
                    'ok'      => false,
                    'error'   => true,
                    'message' => $service->sanitizeSensitiveText($e->getMessage()) ?? 'Requisição de webhook rejeitada.'
                ]
            ];
        } catch (Throwable $e) {
            return [
                'http_code' => 500,
                'body'      => [
                    'ok'      => false,
                    'error'   => true,
                    'message' => 'Erro interno ao processar webhook multi-racha.'
                ]
            ];
        }
    }
}

// Executa automaticamente apenas quando chamado como endpoint HTTP direto (não durante importação em suíte de testes CLI)
if (php_sapi_name() !== 'cli' && realpath($_SERVER['SCRIPT_FILENAME'] ?? '') === __FILE__) {
    header('Content-Type: application/json; charset=utf-8');

    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
        http_response_code(405);
        echo json_encode(['ok' => false, 'error' => true, 'message' => 'Método HTTP não permitido. Utilize POST.'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $response = processMultiRachaWebhookHttpRequest();
    http_response_code($response['http_code']);
    echo json_encode($response['body'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}
