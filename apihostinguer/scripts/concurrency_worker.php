<?php
/**
 * Worker de Concorrência Real para Testes Multi-Processo do PresenceEngine (FASE 4.0 - ETAPA 3B.3)
 * Arquivo: apihostinguer/scripts/concurrency_worker.php
 *
 * Executado em processos independentes via proc_open() para testar disputas reais de locks
 * (SELECT ... FOR UPDATE) e constraints de unicidade em conexões paralelas ao MariaDB.
 */

putenv('ENVIRONMENT=sandbox');
$_ENV['ENVIRONMENT'] = 'sandbox';

require_once __DIR__ . '/../config/database_sandbox.php';
require_once __DIR__ . '/../src/utils/HttpError.php';
require_once __DIR__ . '/../src/middleware/RachaScopeMiddleware.php';
require_once __DIR__ . '/../src/services/PresenceEngine.php';
require_once __DIR__ . '/../src/services/RachaQueueService.php';

if ($argc < 2) {
    fwrite(STDERR, "Uso: php concurrency_worker.php <base64_json_payload>\n");
    exit(1);
}

$payloadJson = base64_decode($argv[1], true);
$payload = is_string($payloadJson) ? json_decode($payloadJson, true) : null;

if (!is_array($payload) || empty($payload['action'])) {
    fwrite(STDERR, "Payload inválido para concurrency_worker.\n");
    exit(1);
}

$pdo = SandboxDatabase::getConnection(true);
$connId = (int)$pdo->query("SELECT CONNECTION_ID()")->fetchColumn();
$dbUser = (string)$pdo->query("SELECT CURRENT_USER()")->fetchColumn();
$engine = new PresenceEngine($pdo);
$queueService = new RachaQueueService($pdo);

// Sincronização por sinal de barreira via STDIN após inicialização completa do processo e da conexão PDO
if (!empty($payload['await_stdin_signal'])) {
    fwrite(STDOUT, "READY:{$connId}\n");
    fflush(STDOUT);
    fgets(STDIN);
} elseif (!empty($payload['wait_until_ms'])) {
    $targetMs = (float)$payload['wait_until_ms'];
    while ((microtime(true) * 1000.0) < $targetMs) {
        usleep(500);
    }
}

$startedAtMs = round(microtime(true) * 1000.0, 3);
$action = (string)$payload['action'];
$args = $payload['args'] ?? [];

$response = [
    'pid'           => getmypid(),
    'connection_id' => $connId,
    'db_user'       => $dbUser,
    'action'        => $action,
    'started_at_ms' => $startedAtMs,
    'finished_at_ms'=> null,
    'success'       => false,
    'http_code'     => 200,
    'message'       => 'OK',
    'result'        => null
];

try {
    switch ($action) {
        case 'cancelSession':
            $response['result'] = $engine->cancelSession(
                (int)$args['racha_id'],
                (int)$args['sessao_id'],
                (string)$args['motivo'],
                (int)$args['usuario_id']
            );
            break;

        case 'homologateSession':
            $response['result'] = $engine->homologateSession(
                (int)$args['racha_id'],
                (int)$args['sessao_id'],
                (int)$args['usuario_id'],
                isset($args['motivo']) ? (string)$args['motivo'] : null
            );
            break;

        case 'reopenPresenceList':
            $response['result'] = $engine->reopenPresenceList(
                (int)$args['racha_id'],
                (int)$args['sessao_id'],
                (int)$args['usuario_id'],
                (string)$args['motivo']
            );
            break;

        case 'concludeSession':
            $response['result'] = $engine->concludeSession(
                (int)$args['racha_id'],
                (int)$args['sessao_id'],
                (int)$args['usuario_id'],
                isset($args['motivo']) ? (string)$args['motivo'] : null
            );
            break;

        case 'confirmPresence':
            $response['result'] = $engine->confirmPresence(
                (int)$args['racha_id'],
                (int)$args['sessao_id'],
                (int)$args['jogador_id'],
                (string)($args['status_presenca'] ?? 'presente'),
                (string)($args['confirmado_por'] ?? 'organizador_manual'),
                (int)$args['usuario_id'],
                isset($args['motivo']) ? (string)$args['motivo'] : null,
                isset($args['substituiu_jogador_id']) ? (int)$args['substituiu_jogador_id'] : null
            );
            break;

        case 'updatePresenceStatus':
            $response['result'] = $engine->updatePresenceStatus(
                (int)$args['racha_id'],
                (int)$args['sessao_id'],
                (int)$args['jogador_id'],
                (string)$args['novo_status'],
                (int)$args['usuario_id'],
                isset($args['motivo']) ? (string)$args['motivo'] : null
            );
            break;

        case 'substituteParticipant':
            $response['result'] = $engine->substituteParticipant(
                (int)$args['racha_id'],
                (int)$args['sessao_id'],
                (int)$args['jogador_substituido_id'],
                (int)$args['jogador_substituto_id'],
                (int)$args['usuario_id'],
                (string)$args['motivo'],
                (string)($args['status_saida'] ?? 'cancelado_no_prazo'),
                (string)($args['confirmado_por'] ?? 'organizador_manual')
            );
            break;

        case 'createSession':
            $response['result'] = $engine->createSession(
                (int)$args['racha_id'],
                (string)$args['data_racha'],
                isset($args['horario_abertura']) ? (string)$args['horario_abertura'] : null,
                isset($args['horario_fechamento']) ? (string)$args['horario_fechamento'] : null,
                (int)$args['usuario_id']
            );
            break;

        case 'recordParticipantIntent':
            $response['result'] = $queueService->recordParticipantIntent(
                (int)$args['racha_id'],
                (int)$args['sessao_id'],
                (int)$args['jogador_id'],
                (string)$args['intencao'],
                array_key_exists('usuario_id', $args) && $args['usuario_id'] !== null ? (int)$args['usuario_id'] : null,
                isset($args['chave_idempotencia']) ? (string)$args['chave_idempotencia'] : null,
                isset($args['observacao']) ? (string)$args['observacao'] : null,
                isset($args['tipo_ator']) ? (string)$args['tipo_ator'] : 'usuario'
            );
            break;

        case 'promoteNextEligibleAvulso':
            $response['result'] = $queueService->promoteNextEligibleAvulso(
                (int)$args['racha_id'],
                (int)$args['sessao_id'],
                array_key_exists('usuario_id', $args) && $args['usuario_id'] !== null ? (int)$args['usuario_id'] : null,
                isset($args['vaga_aberta_por_jogador_id']) ? (int)$args['vaga_aberta_por_jogador_id'] : null,
                isset($args['tipo_ator']) ? (string)$args['tipo_ator'] : 'usuario',
                isset($args['mensagem_externa_id']) ? (string)$args['mensagem_externa_id'] : null
            );
            break;

        default:
            throw new RuntimeException("Ação desconhecida no worker: {$action}");
    }

    $response['success'] = true;
    $response['http_code'] = 200;
} catch (HttpError $e) {
    $response['success'] = false;
    $response['http_code'] = (int)$e->getStatusCode();
    $response['message'] = $e->getMessage();
} catch (Throwable $e) {
    $response['success'] = false;
    $response['http_code'] = 500;
    $response['message'] = get_class($e) . ': ' . $e->getMessage();
}

$response['finished_at_ms'] = round(microtime(true) * 1000.0, 3);
echo json_encode($response, JSON_UNESCAPED_UNICODE) . PHP_EOL;
