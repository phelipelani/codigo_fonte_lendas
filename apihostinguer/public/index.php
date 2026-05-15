<?php
/**
 * API FutLendas
 * Arquivo: public/index.php
 */

error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

// Headers CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

// Não força JSON em rotas OAuth (que fazem redirect: Google e Mercado Pago)
$requestUri    = $_SERVER['REQUEST_URI'] ?? '';
$isOAuthRoute  = strpos($requestUri, '/auth/google') !== false
              || strpos($requestUri, '/mp/callback')  !== false;
if (!$isOAuthRoute) {
    header('Content-Type: application/json; charset=utf-8');
}

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Imports
require_once __DIR__ . '/../config/env.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../src/utils/HttpError.php';
require_once __DIR__ . '/../src/utils/JWT.php';
require_once __DIR__ . '/../src/middleware/AuthMiddleware.php';
require_once __DIR__ . '/../src/controllers/AuthController.php';
require_once __DIR__ . '/../src/controllers/JogadorController.php';
require_once __DIR__ . '/../src/controllers/TimeController.php';
require_once __DIR__ . '/../src/controllers/ConviteController.php';
require_once __DIR__ . '/../src/controllers/CampeonatoController.php';
require_once __DIR__ . '/../src/controllers/RodadaController.php';
require_once __DIR__ . '/../src/utils/Pontos.php';
require_once __DIR__ . '/../src/services/StatsService.php';
require_once __DIR__ . '/../src/controllers/AnalyticsController.php';
require_once __DIR__ . '/../src/controllers/NotificacoesController.php';
require_once __DIR__ . '/../src/controllers/StatsController.php';
require_once __DIR__ . '/../src/controllers/LigaController.php';
require_once __DIR__ . '/../src/controllers/AlbumController.php';

// Tratamento de erros
function sendApiError(Throwable $e): void
{
    if (!headers_sent()) {
        header('Content-Type: application/json; charset=utf-8');
    }

    $code = 500;
    $data = ['error' => true, 'message' => 'Erro interno do servidor.'];

    if ($e instanceof HttpError) {
        $code = $e->getStatusCode();
        $data = $e->toArray();
    } else {
        // PDOException.getCode() retorna SQLSTATE string (ex: '42S22') — nunca usar como HTTP code
        $numericCode = is_numeric($e->getCode()) ? (int) $e->getCode() : 0;
        if ($numericCode >= 100 && $numericCode <= 599) {
            $code = $numericCode;
        }

        if ($e instanceof PDOException) {
            $sqlState = (string) $e->getCode();
            if (str_starts_with($sqlState, '42S22')) {
                $data['message'] = 'Coluna nao encontrada no banco. Verifique as migrations. Detalhe: ' . $e->getMessage();
            } elseif (str_starts_with($sqlState, '42S02')) {
                $data['message'] = 'Tabela nao encontrada no banco. Verifique as migrations.';
            } elseif (str_starts_with($sqlState, '23000')) {
                $data['message'] = 'Registro duplicado ou violacao de chave.';
            } else {
                $data['message'] = 'Erro no banco: ' . $e->getMessage();
            }
            $data['sqlstate'] = $sqlState;
        } else {
            $data['message'] = $e->getMessage();
        }
    }

    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function jsonResponse(mixed $data, int $code = 200): void
{
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

try {
    $db     = Database::getInstance();
    $method = $_SERVER['REQUEST_METHOD'];
    $uri    = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

    // Remove base path
    $baseDir = dirname($_SERVER['SCRIPT_NAME']);
    $path    = $uri;
    if ($baseDir !== '/' && strpos($path, $baseDir) === 0) {
        $path = substr($path, strlen($baseDir));
    }

    $path = preg_replace('#^/public#', '', $path);
    $path = preg_replace('#^/api#', '', $path);

    if ($path !== '/' && str_ends_with($path, '/')) {
        $path = rtrim($path, '/');
    }

    error_log("[ROUTE] {$method} {$path}");

    // =========================================================
    // HEALTH CHECK
    // =========================================================
    if ($path === '/' && $method === 'GET') {
        jsonResponse(['status' => 'ok', 'message' => 'FutLendas API On!']);
    }


    // =========================================================
    // AUTH — Públicas
    // =========================================================
    if ($path === '/auth/login' && $method === 'POST') {
        (new AuthController())->login(); exit;
    }

    if ($path === '/auth/google' && $method === 'GET') {
        (new AuthController())->googleRedirect(); exit;
    }

    if ($path === '/auth/google/callback' && $method === 'GET') {
        (new AuthController())->googleCallback(); exit;
    }

    if ($path === '/auth/forgot-password' && $method === 'POST') {
        (new AuthController())->forgotPassword(); exit;
    }

    if ($path === '/auth/reset-password' && $method === 'POST') {
        (new AuthController())->resetPassword(); exit;
    }

    if ($path === '/auth/register' && $method === 'POST') {
        (new AuthController())->register(); exit;
    }

    // =========================================================
    // AUTH — Protegidas
    // =========================================================
    if ($path === '/auth/me' && $method === 'GET') {
        AuthMiddleware::handle();
        (new AuthController())->me(); exit;
    }

    // =========================================================
    // CONVITES — Públicas
    // =========================================================

    // GET /auth/convite/validar/{token}  — alias front
    if (preg_match('#^/auth/convite/validar/([a-f0-9-]+)$#', $path, $m) && $method === 'GET') {
        (new ConviteController())->validate($m[1]); exit;
    }

    // GET /convites/{token}
    if (preg_match('#^/convites/([a-f0-9-]+)$#', $path, $m) && $method === 'GET') {
        (new ConviteController())->validate($m[1]); exit;
    }

    // POST /auth/convite/ativar  — alias front (AtivarContaPage)
    if ($path === '/auth/convite/ativar' && $method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $token = $input['token'] ?? '';
        if (empty($token)) {
            throw new HttpError('Token é obrigatório.', 400);
        }
        (new ConviteController())->aceitar($token); exit;
    }

    // POST /convites/{token}/aceitar
    if (preg_match('#^/convites/([a-f0-9-]+)/aceitar$#', $path, $m) && $method === 'POST') {
        (new ConviteController())->aceitar($m[1]); exit;
    }

    // =========================================================
    // CONVITES — Protegidas (admin)
    // =========================================================

    // POST /convites — gerar convite (admin)
    if ($path === '/convites' && $method === 'POST') {
        AuthMiddleware::isAdmin();
        (new ConviteController())->store(); exit;
    }

    // POST /auth/convite/gerar  — alias front (JogadorCard) — admin
    if ($path === '/auth/convite/gerar' && $method === 'POST') {
        AuthMiddleware::isAdmin();
        (new ConviteController())->store(); exit;
    }

    // =========================================================
    // JOGADORES
    // =========================================================
    if ($path === '/jogadores' && $method === 'GET') {
        AuthMiddleware::handle();
        (new JogadorController())->index(); exit;
    }

    if ($path === '/jogadores' && $method === 'POST') {
        AuthMiddleware::isAdmin();
        (new JogadorController())->store(); exit;
    }

    if (preg_match('#^/jogadores/(\d+)/perfil-completo$#', $path, $m) && $method === 'GET') {
        AuthMiddleware::handle();
        (new JogadorController())->perfilCompleto((int)$m[1]); exit;
    }

    if (preg_match('#^/jogadores/(\d+)$#', $path, $m) && $method === 'GET') {
        AuthMiddleware::handle();
        (new JogadorController())->show((int)$m[1]); exit;
    }

    if (preg_match('#^/jogadores/(\d+)$#', $path, $m) && $method === 'PUT') {
        AuthMiddleware::isAdmin();
        (new JogadorController())->update((int)$m[1]); exit;
    }

    // PUT /jogadores/{id}/details — usado pelo useUpdateJogador e useUpdateJogadoresBatch
    if (preg_match('#^/jogadores/(\d+)/details$#', $path, $m) && $method === 'PUT') {
        AuthMiddleware::isAdmin();
        (new JogadorController())->updateDetails((int)$m[1]); exit;
    }

    if (preg_match('#^/jogadores/(\d+)$#', $path, $m) && $method === 'DELETE') {
        AuthMiddleware::isAdmin();
        (new JogadorController())->destroy((int)$m[1]); exit;
    }

    // =========================================================
    // TIMES
    // =========================================================
    if ($path === '/times' && $method === 'GET') {
        AuthMiddleware::handle();
        (new TimeController())->index(); exit;
    }

    if ($path === '/times' && $method === 'POST') {
        AuthMiddleware::isAdmin();
        (new TimeController())->store(); exit;
    }

    if (preg_match('#^/times/(\d+)$#', $path, $m) && $method === 'GET') {
        AuthMiddleware::handle();
        (new TimeController())->show((int)$m[1]); exit;
    }

    if (preg_match('#^/times/(\d+)$#', $path, $m) && $method === 'PUT') {
        AuthMiddleware::isAdmin();
        (new TimeController())->update((int)$m[1]); exit;
    }

    if (preg_match('#^/times/(\d+)$#', $path, $m) && $method === 'DELETE') {
        AuthMiddleware::isAdmin();
        (new TimeController())->destroy((int)$m[1]); exit;
    }

    // GET /times/{id}/jogadores
    if (preg_match('#^/times/(\d+)/jogadores$#', $path, $m) && $method === 'GET') {
        AuthMiddleware::handle();
        (new TimeController())->jogadores((int)$m[1]); exit;
    }

    // POST /times/{id}/jogadores — adicionar jogador ao time (admin)
    if (preg_match('#^/times/(\d+)/jogadores$#', $path, $m) && $method === 'POST') {
        AuthMiddleware::isAdmin();
        (new TimeController())->addJogador((int)$m[1]); exit;
    }

    // PUT /times/{id}/jogadores/{jogadorId}/role — alterar role no time (admin)
    if (preg_match('#^/times/(\d+)/jogadores/(\d+)/role$#', $path, $m) && $method === 'PUT') {
        AuthMiddleware::isAdmin();
        (new TimeController())->updateRole((int)$m[1], (int)$m[2]); exit;
    }

    // DELETE /times/{id}/jogadores/{jogadorId} — remover jogador do time (admin)
    if (preg_match('#^/times/(\d+)/jogadores/(\d+)$#', $path, $m) && $method === 'DELETE') {
        AuthMiddleware::isAdmin();
        (new TimeController())->removeJogador((int)$m[1], (int)$m[2]); exit;
    }

    // =========================================================
    // LIGAS — delegado ao LigaController
    // =========================================================
    if ($path === '/ligas' && $method === 'GET') {
        AuthMiddleware::handle();
        (new LigaController())->index(); exit;
    }
    if ($path === '/ligas' && $method === 'POST') {
        AuthMiddleware::isAdmin();
        (new LigaController())->store(); exit;
    }
    if (preg_match('#^/ligas/(\d+)$#', $path, $m) && $method === 'GET') {
        AuthMiddleware::handle();
        (new LigaController())->show((int)$m[1]); exit;
    }
    if (preg_match('#^/ligas/(\d+)$#', $path, $m) && $method === 'PUT') {
        AuthMiddleware::isAdmin();
        (new LigaController())->update((int)$m[1]); exit;
    }
    if (preg_match('#^/ligas/(\d+)$#', $path, $m) && $method === 'DELETE') {
        AuthMiddleware::isAdmin();
        (new LigaController())->destroy((int)$m[1]); exit;
    }
    if (preg_match('#^/ligas/(\d+)/finalizar$#', $path, $m) && $method === 'POST') {
        AuthMiddleware::isAdmin();
        (new LigaController())->finalizar((int)$m[1]); exit;
    }

    // =========================================================
    // RODADAS — delegado ao RodadaController
    // =========================================================

    // Criar rodada (admin)
    if (preg_match('#^/rodadas/liga/(\d+)$#', $path, $m) && $method === 'POST') {
        AuthMiddleware::isAdmin();
        (new RodadaController())->createForLiga((int)$m[1]); exit;
    }
    if (preg_match('#^/rodadas/campeonato/(\d+)$#', $path, $m) && $method === 'POST') {
        AuthMiddleware::isAdmin();
        (new RodadaController())->createForCampeonato((int)$m[1]); exit;
    }

    // Listar rodadas
    if (preg_match('#^/rodadas/liga/(\d+)$#', $path, $m) && $method === 'GET') {
        AuthMiddleware::handle();
        (new RodadaController())->listByLiga((int)$m[1]); exit;
    }
    if (preg_match('#^/rodadas/campeonato/(\d+)$#', $path, $m) && $method === 'GET') {
        AuthMiddleware::handle();
        (new RodadaController())->listByCampeonato((int)$m[1]); exit;
    }

    // Rodada: show / update / delete / finalizar
    if (preg_match('#^/rodadas/(\d+)$#', $path, $m) && $method === 'GET') {
        AuthMiddleware::handle();
        (new RodadaController())->show((int)$m[1]); exit;
    }
    if (preg_match('#^/rodadas/(\d+)$#', $path, $m) && $method === 'PUT') {
        AuthMiddleware::isAdmin();
        (new RodadaController())->update((int)$m[1]); exit;
    }
    if (preg_match('#^/rodadas/(\d+)$#', $path, $m) && $method === 'DELETE') {
        AuthMiddleware::isAdmin();
        (new RodadaController())->destroy((int)$m[1]); exit;
    }
    if (preg_match('#^/rodadas/(\d+)/finalizar$#', $path, $m) && $method === 'POST') {
        AuthMiddleware::isAdmin();
        (new RodadaController())->finalizar((int)$m[1]); exit;
    }

    // Recalcular prêmios de uma rodada já finalizada (corrige dados errados) — admin
    if (preg_match('#^/rodadas/(\d+)/recalcular-premios$#', $path, $m) && $method === 'POST') {
        AuthMiddleware::isAdmin();
        $rc = new RodadaController();
        $rodadaId = (int)$m[1];
        try {
            $ref = new ReflectionMethod($rc, 'salvarPremiosRodada');
            $ref->setAccessible(true);
            $ref->invoke($rc, $rodadaId);
            jsonResponse(['success' => true, 'message' => "Prêmios da rodada {$rodadaId} recalculados com sucesso."]);
        } catch (Throwable $e) {
            jsonResponse(['error' => true, 'message' => $e->getMessage()], 500);
        }
    }

    // Recalcular prêmios de TODAS as rodadas finalizadas (fix geral) — admin
    if ($path === '/rodadas/recalcular-todos-premios' && $method === 'POST') {
        AuthMiddleware::isAdmin();
        try {
            $pdo = Database::getInstance()->getConnection();
            $rodadas = $pdo->query("SELECT id, data FROM rodadas WHERE status = 'finalizada' ORDER BY data ASC")->fetchAll(PDO::FETCH_ASSOC);
            $rc = new RodadaController();
            $ref = new ReflectionMethod($rc, 'salvarPremiosRodada');
            $ref->setAccessible(true);
            $resultados = [];
            foreach ($rodadas as $r) {
                try {
                    $ref->invoke($rc, (int)$r['id']);
                    $resultados[] = ['rodada_id' => (int)$r['id'], 'data' => $r['data'], 'status' => 'ok'];
                } catch (Throwable $ex) {
                    $resultados[] = ['rodada_id' => (int)$r['id'], 'data' => $r['data'], 'status' => 'erro', 'message' => $ex->getMessage()];
                }
            }
            jsonResponse(['success' => true, 'total' => count($rodadas), 'resultados' => $resultados]);
        } catch (Throwable $e) {
            jsonResponse(['error' => true, 'message' => $e->getMessage()], 500);
        }
    }

    // Recalcular Cartolendas completo (pontos, preços, patrimônio) — admin
    if ($path === '/cartolendas/recalcular' && $method === 'POST') {
        AuthMiddleware::isAdmin();
        $rc = new RodadaController();
        $result = $rc->recalcularCartolendas();
        jsonResponse($result);
        exit;
    }

    // Rodada: jogadores / sync / elenco
    if (preg_match('#^/rodadas/(\d+)/jogadores$#', $path, $m) && $method === 'GET') {
        AuthMiddleware::handle();
        (new RodadaController())->jogadores((int)$m[1]); exit;
    }
    if (preg_match('#^/rodadas/(\d+)/sync-jogadores$#', $path, $m) && $method === 'POST') {
        AuthMiddleware::isAdmin();
        (new RodadaController())->syncJogadores((int)$m[1]); exit;
    }
    if (preg_match('#^/rodadas/(\d+)/elenco$#', $path, $m) && $method === 'GET') {
        AuthMiddleware::handle();
        (new RodadaController())->elenco((int)$m[1]); exit;
    }

    // Rodada: times / substituição
    if (preg_match('#^/rodadas/(\d+)/times$#', $path, $m) && $method === 'GET') {
        AuthMiddleware::handle();
        (new RodadaController())->getTimes((int)$m[1]); exit;
    }
    if (preg_match('#^/rodadas/(\d+)/times$#', $path, $m) && $method === 'POST') {
        AuthMiddleware::isAdmin();
        (new RodadaController())->saveTimes((int)$m[1]); exit;
    }
    if (preg_match('#^/rodadas/(\d+)/substituicao$#', $path, $m) && $method === 'POST') {
        AuthMiddleware::isAdmin();
        (new RodadaController())->substituicao((int)$m[1]); exit;
    }

    // =========================================================
    // PARTIDAS — delegado ao RodadaController
    // =========================================================

    // Globais — deve vir ANTES do match /partidas/{id}
    if ($path === '/partidas/globais' && $method === 'GET') {
        AuthMiddleware::handle();
        (new RodadaController())->partidasGlobais(); exit;
    }

    // Criar partida vazia na rodada (admin)
    if (preg_match('#^/rodadas/(\d+)/partidas$#', $path, $m) && $method === 'POST') {
        AuthMiddleware::isAdmin();
        (new RodadaController())->createPartida((int)$m[1]); exit;
    }

    // Listar partidas de uma rodada (qualquer usuário logado)
    if (preg_match('#^/campeonatos/rodada/(\d+)/partidas$#', $path, $m) && $method === 'GET') {
        AuthMiddleware::handle();
        (new RodadaController())->getPartidas((int)$m[1]); exit;
    }
    // Salvar partida (admin)
    if (preg_match('#^/campeonatos/rodada/(\d+)/partida$#', $path, $m) && $method === 'POST') {
        AuthMiddleware::isAdmin();
        (new RodadaController())->salvarPartida((int)$m[1]); exit;
    }

    // Partida: finalizar / detalhes / editar / deletar
    if (preg_match('#^/partidas/(\d+)/finalizar$#', $path, $m) && $method === 'PUT') {
        AuthMiddleware::isAdmin();
        (new RodadaController())->finalizarPartida((int)$m[1]); exit;
    }
    if (preg_match('#^/partidas/(\d+)/detalhes$#', $path, $m) && $method === 'GET') {
        AuthMiddleware::handle();
        (new RodadaController())->detalhesPartida((int)$m[1]); exit;
    }
    if (preg_match('#^/partidas/(\d+)$#', $path, $m) && $method === 'PUT') {
        AuthMiddleware::isAdmin();
        (new RodadaController())->editarPartida((int)$m[1]); exit;
    }
    if (preg_match('#^/partidas/(\d+)$#', $path, $m) && $method === 'DELETE') {
        AuthMiddleware::isAdmin();
        (new RodadaController())->deletarPartida((int)$m[1]); exit;
    }

    // Batch update jogadores (notas/recuado) — admin
    if ($path === '/jogadores/batch' && $method === 'PUT') {
        AuthMiddleware::isAdmin();
        (new RodadaController())->updateJogadoresBatch(); exit;
    }

    // =========================================================
    // ANALYTICS
    // =========================================================
    if ($path === '/analytics/panoramica' && $method === 'GET') {
        AuthMiddleware::handle();
        (new AnalyticsController())->panoramica(); exit;
    }

    // GET /analytics/geral
    if ($path === '/analytics/geral' && $method === 'GET') {
        AuthMiddleware::handle();
        (new AnalyticsController())->geral(); exit;
    }

    // GET /analytics/jogador/:id
    if (preg_match('#^/analytics/jogador/(\d+)$#', $path, $m) && $method === 'GET') {
        AuthMiddleware::handle();
        (new AnalyticsController())->jogador((int)$m[1]); exit;
    }

    // GET /analytics/time/:id
    if (preg_match('#^/analytics/time/(\d+)$#', $path, $m) && $method === 'GET') {
        AuthMiddleware::handle();
        (new AnalyticsController())->time((int)$m[1]); exit;
    }

    // GET /analytics/sinergia
    if ($path === '/analytics/sinergia' && $method === 'GET') {
        AuthMiddleware::handle();
        (new AnalyticsController())->sinergia(); exit;
    }

    // GET /analytics/confronto/:idA/:idB
    if (preg_match('#^/analytics/confronto/(\d+)/(\d+)$#', $path, $m) && $method === 'GET') {
        AuthMiddleware::handle();
        (new AnalyticsController())->confronto((int)$m[1], (int)$m[2]); exit;
    }

    // =========================================================
    // NOTIFICAÇÕES
    // =========================================================
    if ($path === '/notificacoes' && $method === 'GET') {
        AuthMiddleware::handle();
        (new NotificacoesController())->index(); exit;
    }
    if ($path === '/notificacoes/count' && $method === 'GET') {
        AuthMiddleware::handle();
        (new NotificacoesController())->count(); exit;
    }
    if (preg_match('#^/notificacoes/(\d+)/ler$#', $path, $m) && $method === 'PUT') {
        AuthMiddleware::handle();
        (new NotificacoesController())->marcarLida((int)$m[1]); exit;
    }
    if ($path === '/notificacoes/ler-todas' && $method === 'PUT') {
        AuthMiddleware::handle();
        (new NotificacoesController())->marcarTodasLidas(); exit;
    }

    // =========================================================
    // CAMPEONATOS — CRUD
    // =========================================================
    if ($path === '/campeonatos' && $method === 'GET') {
        AuthMiddleware::handle();
        (new CampeonatoController())->index();
        exit;
    }
    if ($path === '/campeonatos' && $method === 'POST') {
        AuthMiddleware::isAdmin();
        (new CampeonatoController())->store();
        exit;
    }
    if (preg_match('#^/campeonatos/(\d+)$#', $path, $m) && $method === 'GET') {
        AuthMiddleware::handle();
        (new CampeonatoController())->show((int)$m[1]);
        exit;
    }
    if (preg_match('#^/campeonatos/(\d+)$#', $path, $m) && $method === 'PUT') {
        AuthMiddleware::isAdmin();
        (new CampeonatoController())->update((int)$m[1]);
        exit;
    }
    if (preg_match('#^/campeonatos/(\d+)$#', $path, $m) && $method === 'DELETE') {
        AuthMiddleware::isAdmin();
        (new CampeonatoController())->destroy((int)$m[1]);
        exit;
    }

    // =========================================================
    // CAMPEONATOS — TIMES
    // =========================================================
    if (preg_match('#^/campeonatos/(\d+)/times$#', $path, $m) && $method === 'GET') {
        AuthMiddleware::handle();
        (new CampeonatoController())->times((int)$m[1]);
        exit;
    }
    if (preg_match('#^/campeonatos/(\d+)/times$#', $path, $m) && $method === 'POST') {
        AuthMiddleware::isAdmin();
        (new CampeonatoController())->addTime((int)$m[1]);
        exit;
    }
    if (preg_match('#^/campeonatos/(\d+)/times/(\d+)$#', $path, $m) && $method === 'DELETE') {
        AuthMiddleware::isAdmin();
        (new CampeonatoController())->removeTime((int)$m[1], (int)$m[2]);
        exit;
    }

    // =========================================================
    // CAMPEONATOS — ELENCO (gerenciamento mid-season)
    // =========================================================
    if (preg_match('#^/campeonatos/(\d+)/elenco$#', $path, $m) && $method === 'GET') {
        AuthMiddleware::handle();
        (new CampeonatoController())->elencoCompleto((int)$m[1]);
        exit;
    }
    if (preg_match('#^/campeonatos/(\d+)/elenco/adicionar$#', $path, $m) && $method === 'POST') {
        AuthMiddleware::isAdmin();
        (new CampeonatoController())->adicionarJogadorElenco((int)$m[1]);
        exit;
    }
    if (preg_match('#^/campeonatos/(\d+)/elenco/(\d+)$#', $path, $m) && $method === 'DELETE') {
        AuthMiddleware::isAdmin();
        (new CampeonatoController())->removerJogadorElenco((int)$m[1], (int)$m[2]);
        exit;
    }

    // =========================================================
    // CAMPEONATOS — AÇÕES
    // =========================================================
    if (preg_match('#^/campeonatos/(\d+)/iniciar$#', $path, $m) && $method === 'POST') {
        AuthMiddleware::isAdmin();
        (new CampeonatoController())->iniciar((int)$m[1]);
        exit;
    }
    if (preg_match('#^/campeonatos/(\d+)/finalizar$#', $path, $m) && $method === 'POST') {
        AuthMiddleware::isAdmin();
        (new CampeonatoController())->finalizar((int)$m[1]);
        exit;
    }
    if (preg_match('#^/campeonatos/(\d+)/foto-campeao$#', $path, $m) && $method === 'POST') {
        AuthMiddleware::isAdmin();
        (new CampeonatoController())->fotoCampeao((int)$m[1]);
        exit;
    }

    // =========================================================
    // CAMPEONATOS — CLASSIFICAÇÃO E STATS
    // =========================================================
    if (preg_match('#^/campeonatos/(\d+)/classificacao$#', $path, $m) && $method === 'GET') {
        AuthMiddleware::handle();
        (new CampeonatoController())->classificacao((int)$m[1]);
        exit;
    }
    if (preg_match('#^/campeonatos/(\d+)/rivalidades$#', $path, $m) && $method === 'GET') {
        AuthMiddleware::handle();
        (new CampeonatoController())->rivalidades((int)$m[1]);
        exit;
    }
    if (preg_match('#^/campeonatos/(\d+)/estatisticas-jogadores$#', $path, $m) && $method === 'GET') {
        AuthMiddleware::handle();
        (new CampeonatoController())->estatisticasJogadores((int)$m[1]);
        exit;
    }
    if (preg_match('#^/campeonatos/(\d+)/stats-avancadas$#', $path, $m) && $method === 'GET') {
        AuthMiddleware::handle();
        (new CampeonatoController())->statsAvancadas((int)$m[1]);
        exit;
    }

    // =========================================================
    // CAMPEONATOS — FASE DE GRUPOS
    // =========================================================
    if (preg_match('#^/campeonatos/(\d+)/fase-grupos/partidas$#', $path, $m) && $method === 'GET') {
        AuthMiddleware::handle();
        (new CampeonatoController())->faseGruposPartidas((int)$m[1]);
        exit;
    }
    if (preg_match('#^/campeonatos/(\d+)/fase-grupos/iniciar$#', $path, $m) && $method === 'POST') {
        AuthMiddleware::isAdmin();
        (new CampeonatoController())->faseGruposIniciar((int)$m[1]);
        exit;
    }
    if (preg_match('#^/campeonatos/(\d+)/fase-grupos/classificacao$#', $path, $m) && $method === 'GET') {
        AuthMiddleware::handle();
        (new CampeonatoController())->faseGruposClassificacao((int)$m[1]);
        exit;
    }
    if (preg_match('#^/campeonatos/(\d+)/fase-grupos/finalizar$#', $path, $m) && $method === 'POST') {
        AuthMiddleware::isAdmin();
        (new CampeonatoController())->faseGruposFinalizar((int)$m[1]);
        exit;
    }

    // =========================================================
    // CAMPEONATOS — MATA-MATA BRACKET
    // =========================================================
    if (preg_match('#^/campeonatos/(\d+)/mata-mata/bracket$#', $path, $m) && $method === 'GET') {
        AuthMiddleware::handle();
        (new CampeonatoController())->mataMatabracket((int)$m[1]);
        exit;
    }

    // =========================================================
    // CAMPEONATOS — SORTEIO
    // =========================================================
    if (preg_match('#^/campeonatos/(\d+)/criar-times-sorteio$#', $path, $m) && $method === 'POST') {
        AuthMiddleware::isAdmin();
        (new CampeonatoController())->criarTimesSorteio((int)$m[1]);
        exit;
    }
    if ($path === '/jogadores/sync-por-nomes' && $method === 'POST') {
        AuthMiddleware::isAdmin();
        (new CampeonatoController())->syncJogadoresPorNomes();
        exit;
    }

    // =========================================================
    // UPLOAD DE FOTO — AWS S3
    // =========================================================
    if ($path === '/upload/foto' && $method === 'POST') {
        AuthMiddleware::handle();

        if (empty($_FILES['foto'])) {
            throw new HttpError('Nenhum arquivo enviado. Use o campo "foto".', 400);
        }

        $file = $_FILES['foto'];
        $allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (!in_array($file['type'], $allowedTypes)) {
            throw new HttpError('Tipo nao permitido. Use JPEG, PNG ou WEBP.', 400);
        }
        if ($file['size'] > 5 * 1024 * 1024) {
            throw new HttpError('Maximo 5MB.', 400);
        }

        $pasta = preg_replace('/[^a-z0-9_-]/', '', strtolower($_GET['pasta'] ?? 'uploads'));

        require_once __DIR__ . '/../src/utils/S3Client.php';

        try {
            $url = S3Client::upload($file, $pasta);
            jsonResponse(['url' => $url]);
        } catch (Exception $ex) {
            throw new HttpError('Erro ao fazer upload: ' . $ex->getMessage(), 500);
        }
    }

    // =========================================================
    // ESTATÍSTICAS — Dashboard
    // =========================================================
    if ($path === '/estatisticas/dashboard' && $method === 'GET') {
        AuthMiddleware::handle();
        try {
            $pdo = Database::getInstance()->getConnection();
            $gols      = (int) $pdo->query("SELECT COALESCE(SUM(gols),0) FROM campeonato_estatisticas_partida")->fetchColumn();
            $assists   = (int) $pdo->query("SELECT COALESCE(SUM(assistencias),0) FROM campeonato_estatisticas_partida")->fetchColumn();
            $jogadores = (int) $pdo->query("SELECT COUNT(*) FROM jogadores")->fetchColumn();
            $jogos     = (int) $pdo->query("SELECT COUNT(*) FROM campeonato_partidas WHERE status = 'finalizada'")->fetchColumn();
            jsonResponse([
                'total_gols'         => $gols,
                'total_assistencias' => $assists,
                'total_jogadores'    => $jogadores,
                'total_jogos'        => $jogos,
            ]);
        } catch (Exception $e) {
            jsonResponse(['total_gols' => 0, 'total_assistencias' => 0, 'total_jogadores' => 0, 'total_jogos' => 0, 'debug' => $e->getMessage()]);
        }
    }

    // =========================================================
    // STATS — Destaques da Rodada (MVP + Pé de Rato)
    // =========================================================
    if ($path === '/stats/destaques-rodada' && $method === 'GET') {
        AuthMiddleware::handle();
        try {
            $pdo = Database::getInstance()->getConnection();

            // Primeira: descobre a rodada mais recente que tem prêmios
            $ultimaRodada = $pdo->query("
                SELECT r.id, r.data, r.status, r.campeonato_id
                FROM rodadas r
                WHERE r.id IN (SELECT DISTINCT rodada_id FROM premios_rodada)
                ORDER BY r.data DESC, r.id DESC
                LIMIT 1
            ")->fetch(PDO::FETCH_ASSOC) ?: null;

            $rid = $ultimaRodada['id'] ?? 0;

            // MVP: busca TODOS os empatados (pode haver mais de 1)
            $stmt = $pdo->prepare("
                SELECT j.nome, j.foto_url, pr.pontuacao AS total, pr.tipo_premio,
                       r.data AS rodada_data, r.id AS rodada_id
                FROM premios_rodada pr
                JOIN jogadores j ON j.id = pr.jogador_id
                JOIN rodadas r ON r.id = pr.rodada_id
                WHERE pr.tipo_premio = 'mvp_rodada'
                  AND pr.rodada_id = ?
            ");
            $stmt->execute([$rid]);
            $mvpAll = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Pé de Rato: busca TODOS os empatados
            $stmt2 = $pdo->prepare("
                SELECT j.nome, j.foto_url, pr.pontuacao AS total, pr.tipo_premio,
                       r.data AS rodada_data, r.id AS rodada_id
                FROM premios_rodada pr
                JOIN jogadores j ON j.id = pr.jogador_id
                JOIN rodadas r ON r.id = pr.rodada_id
                WHERE pr.tipo_premio = 'pe_de_rato_rodada'
                  AND pr.rodada_id = ?
            ");
            $stmt2->execute([$rid]);
            $peDeRatoAll = $stmt2->fetchAll(PDO::FETCH_ASSOC);

            // Retorna arrays (frontend já suporta via mvpList/peDeRatoList)
            jsonResponse([
                'mvp'      => $mvpAll ?: null,
                'peDeRato' => $peDeRatoAll ?: null,
            ]);
        } catch (Exception $e) {
            jsonResponse(['mvp' => null, 'peDeRato' => null, '_debug_error' => $e->getMessage()]);
        }
    }

    // =========================================================
    // STATS — Debug temporário (REMOVER DEPOIS)
    // =========================================================
    if ($path === '/stats/debug-db' && $method === 'GET') {
        AuthMiddleware::isAdmin();
        try {
            $pdo = Database::getInstance()->getConnection();
            $tables = [];
            $checkTables = [
                'campeonato_estatisticas_partida',
                'campeonato_partidas',
                'campeonato_vencedores',
                'campeonato_premios',
                'campeonato_eventos_partida',
                'premios_rodada',
                'rodadas',
                'jogadores',
                'times',
                'campeonatos'
            ];
            foreach ($checkTables as $tbl) {
                try {
                    $cnt = $pdo->query("SELECT COUNT(*) AS n FROM `{$tbl}`")->fetch(PDO::FETCH_ASSOC);
                    $tables[$tbl] = (int)($cnt['n'] ?? 0);
                } catch (Exception $ex) {
                    $tables[$tbl] = 'TABELA NÃO EXISTE: ' . $ex->getMessage();
                }
            }
            // Partidas finalizadas
            try {
                $fin = $pdo->query("SELECT COUNT(*) AS n FROM campeonato_partidas WHERE status = 'finalizada'")->fetch(PDO::FETCH_ASSOC);
                $tables['partidas_finalizadas'] = (int)($fin['n'] ?? 0);
            } catch (Exception $ex) {
                $tables['partidas_finalizadas'] = $ex->getMessage();
            }
            // Últimas rodadas
            try {
                $ult = $pdo->query("SELECT id, data, status FROM rodadas ORDER BY data DESC, id DESC LIMIT 5")->fetchAll(PDO::FETCH_ASSOC);
                $tables['ultimas_rodadas'] = $ult;
            } catch (Exception $ex) {
                $tables['ultimas_rodadas'] = $ex->getMessage();
            }
            // Últimos premios
            try {
                $prm = $pdo->query("
                    SELECT pr.id, pr.rodada_id, pr.tipo_premio, pr.pontuacao, j.nome, r.data AS rodada_data, r.status AS rodada_status
                    FROM premios_rodada pr
                    JOIN jogadores j ON j.id = pr.jogador_id
                    JOIN rodadas r ON r.id = pr.rodada_id
                    ORDER BY r.data DESC, pr.id DESC
                    LIMIT 10
                ")->fetchAll(PDO::FETCH_ASSOC);
                $tables['ultimos_premios'] = $prm;
            } catch (Exception $ex) {
                $tables['ultimos_premios'] = $ex->getMessage();
            }
            // Cartolendas ligas existentes
            try {
                $ligas = $pdo->query("SELECT id, nome, criador_id, campeonato_id, tipo, ativa, codigo_convite FROM cartolendas_ligas ORDER BY id DESC LIMIT 10")->fetchAll(PDO::FETCH_ASSOC);
                $tables['cartolendas_ligas'] = $ligas;
            } catch (Exception $ex) {
                $tables['cartolendas_ligas'] = 'ERRO: ' . $ex->getMessage();
            }

            // Indexes/constraints da tabela cartolendas_ligas
            try {
                $indexes = $pdo->query("SHOW INDEX FROM cartolendas_ligas")->fetchAll(PDO::FETCH_ASSOC);
                $tables['cartolendas_ligas_indexes'] = $indexes;
            } catch (Exception $ex) {
                $tables['cartolendas_ligas_indexes'] = $ex->getMessage();
            }

            // === VERIFICAÇÃO DE VERSÃO DOS ARQUIVOS ===
            $statsFile = __DIR__ . '/../src/controllers/StatsController.php';
            $cartoFile = __DIR__ . '/../src/controllers/CartolendaLigaController.php';
            $campFile  = __DIR__ . '/../src/controllers/CampeonatoController.php';
            $pontosFile = __DIR__ . '/../src/utils/Pontos.php';

            $tables['_versao_arquivos'] = [
                'index.php' => 'v2-debug-cartolendas ✅',
                'StatsController.php' => [
                    'existe' => file_exists($statsFile),
                    'tamanho' => file_exists($statsFile) ? filesize($statsFile) : 0,
                    'modificado' => file_exists($statsFile) ? date('Y-m-d H:i:s', filemtime($statsFile)) : null,
                    'tem_GOL_HISTORICO' => file_exists($statsFile) && strpos(file_get_contents($statsFile), 'GOL_HISTORICO') !== false,
                ],
                'CartolendaLigaController.php' => [
                    'existe' => file_exists($cartoFile),
                    'tamanho' => file_exists($cartoFile) ? filesize($cartoFile) : 0,
                    'modificado' => file_exists($cartoFile) ? date('Y-m-d H:i:s', filemtime($cartoFile)) : null,
                    'tem_validacao_campeonato' => file_exists($cartoFile) && strpos(file_get_contents($cartoFile), 'Campeonato ID') !== false,
                ],
                'CampeonatoController.php' => [
                    'existe' => file_exists($campFile),
                    'tamanho' => file_exists($campFile) ? filesize($campFile) : 0,
                    'tem_Pontos_require' => file_exists($campFile) && strpos(file_get_contents($campFile), 'Pontos.php') !== false,
                ],
                'Pontos.php' => [
                    'existe' => file_exists($pontosFile),
                    'tamanho' => file_exists($pontosFile) ? filesize($pontosFile) : 0,
                ],
            ];

            jsonResponse($tables);
        } catch (Exception $e) {
            jsonResponse(['error' => $e->getMessage()]);
        }
    }

    // =========================================================
    // DEBUG — Teste direto de criação de liga (REMOVER DEPOIS)
    // =========================================================
    if ($path === '/stats/debug-criar-liga' && $method === 'GET') {
        AuthMiddleware::isAdmin();
        // Limpa OPCache para garantir código atualizado
        if (function_exists('opcache_reset')) {
            opcache_reset();
        }

        $result = ['opcache_reset' => function_exists('opcache_reset') ? 'executado' : 'não disponível'];

        try {
            $pdo = Database::getInstance()->getConnection();

            // 1. Verifica se tabela existe e colunas
            $cols = $pdo->query("DESCRIBE cartolendas_ligas")->fetchAll(PDO::FETCH_ASSOC);
            $result['colunas_cartolendas_ligas'] = array_column($cols, 'Field');

            // 2. Verifica FKs
            $fks = $pdo->query("
                SELECT CONSTRAINT_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
                FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
                WHERE TABLE_NAME = 'cartolendas_ligas'
                  AND REFERENCED_TABLE_NAME IS NOT NULL
                  AND TABLE_SCHEMA = DATABASE()
            ")->fetchAll(PDO::FETCH_ASSOC);
            $result['foreign_keys'] = $fks;

            // 3. Tenta INSERT de teste com dados válidos e depois faz rollback
            $pdo->beginTransaction();
            try {
                // Pega um campeonato e um usuario que existem
                $camp = $pdo->query("SELECT id, nome FROM campeonatos LIMIT 1")->fetch(PDO::FETCH_ASSOC);
                $user = $pdo->query("SELECT id, username FROM usuarios LIMIT 1")->fetch(PDO::FETCH_ASSOC);

                $result['campeonato_teste'] = $camp;
                $result['usuario_teste'] = $user;

                if ($camp && $user) {
                    $st = $pdo->prepare("
                        INSERT INTO cartolendas_ligas (nome, descricao, tipo, codigo_convite, criador_id, campeonato_id, max_membros)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    ");
                    $st->execute(['__TESTE_DEBUG__', '', 'privada', 'ZZZZTEST', (int)$user['id'], (int)$camp['id'], 20]);
                    $result['insert_teste'] = 'SUCESSO — liga seria criada com user=' . $user['id'] . ' camp=' . $camp['id'];
                }
            } catch (Throwable $ex) {
                $result['insert_teste'] = 'FALHOU: [' . $ex->getCode() . '] ' . $ex->getMessage();
            }
            $pdo->rollBack(); // Sempre desfaz o teste
            $result['rollback'] = 'feito — nada foi criado no banco';

            // 4. Verifica TODAS as tabelas do Cartolendas
            $cartolendaTables = [
                'cartolendas_ligas',
                'cartolendas_liga_membros',
                'cartolendas_ranking',
                'cartolendas_times',
                'cartolendas_escalacao',
                'cartolendas_precos',
                'cartolendas_capitao',
                'cartolendas_draft',
                'cartolendas_chat',
                'cartolendas_transferencias',
            ];
            $result['tabelas_cartolendas'] = [];
            foreach ($cartolendaTables as $tbl) {
                try {
                    $colsT = $pdo->query("DESCRIBE {$tbl}")->fetchAll(PDO::FETCH_ASSOC);
                    $result['tabelas_cartolendas'][$tbl] = [
                        'existe' => true,
                        'colunas' => array_column($colsT, 'Field'),
                    ];
                } catch (Throwable $ex) {
                    $result['tabelas_cartolendas'][$tbl] = [
                        'existe' => false,
                        'erro' => $ex->getMessage(),
                    ];
                }
            }

        } catch (Throwable $e) {
            $result['erro_geral'] = $e->getMessage();
        }

        jsonResponse($result);
    }

    // =========================================================
    // STATS — Hall da Fama (delegado ao StatsController completo)
    // =========================================================
    if ($path === '/stats/hall-da-fama' && $method === 'GET') {
        AuthMiddleware::handle();
        (new StatsController())->hallDaFama();
    }
    // =========================================================
    // CARTOLENDAS — ligas, transferências, capitão, draft, chat
    // =========================================================
    if (str_starts_with($path, '/cartolendas')) {
        require_once __DIR__ . '/../src/controllers/CartolendaLigaController.php';
        CartolendaLigaController::route($method, $path);
        exit;
    }

    // =========================================================
    // MERCADO PAGO — OAuth + Financeiro
    // (em desenvolvimento, mantido para evolucao da feature)
    // =========================================================
    if (str_starts_with($path, '/mp')) {
        $mpRoot = __DIR__ . '/../mp';

        // GET /mp/setup — cria tabela mp_contas (rodar 1x, remover depois)
        if ($path === '/mp/setup' && $method === 'GET') {
            AuthMiddleware::isAdmin();
            require $mpRoot . '/setup.php'; exit;
        }

        // GET /mp/oauth/start — retorna URL de autorizacao MP
        if ($path === '/mp/oauth/start' && $method === 'GET') {
            AuthMiddleware::isAdmin();
            require $mpRoot . '/oauth_start.php'; exit;
        }

        // GET /mp/callback — callback do OAuth (browser redirect, sem JWT)
        if ($path === '/mp/callback' && $method === 'GET') {
            // Nao tem JWT aqui — o state carrega o user_id assinado
            header('Content-Type: text/html; charset=utf-8');
            require $mpRoot . '/oauth_callback.php'; exit;
        }

        // GET /mp/status — verifica se conta MP esta conectada
        if ($path === '/mp/status' && $method === 'GET') {
            AuthMiddleware::isAdmin();
            require $mpRoot . '/status.php'; exit;
        }

        // POST /mp/disconnect — desconecta conta MP
        if ($path === '/mp/disconnect' && $method === 'POST') {
            AuthMiddleware::isAdmin();
            require $mpRoot . '/disconnect.php'; exit;
        }

        // GET /mp/balance — saldo da conta MP
        if ($path === '/mp/balance' && $method === 'GET') {
            AuthMiddleware::isAdmin();
            require $mpRoot . '/balance.php'; exit;
        }

        // GET /mp/transacoes — pagamentos recentes
        if ($path === '/mp/transacoes' && $method === 'GET') {
            AuthMiddleware::isAdmin();
            require $mpRoot . '/transacoes.php'; exit;
        }

        // POST /mp/pix — cria cobranca PIX
        if ($path === '/mp/pix' && $method === 'POST') {
            AuthMiddleware::isAdmin();
            require $mpRoot . '/criar_pix.php'; exit;
        }
    }

    // =========================================================
    // PRESENCA — Bot de convocacao do racha (WhatsApp via Evolution API)
    // =========================================================
    if (str_starts_with($path, '/presenca')) {
        $presencaRoot = __DIR__ . '/../presenca';

        require_once $presencaRoot . '/bootstrap.php';
        require_once $presencaRoot . '/db.php';
        require_once $presencaRoot . '/whatsapp.php';
        require_once $presencaRoot . '/bot.php';

        // POST /presenca/webhook — recebe mensagens da Evolution API (sem auth)
        if ($path === '/presenca/webhook' && $method === 'POST') {
            require $presencaRoot . '/api/webhook.php'; exit;
        }

        // GET /presenca/dados — estado atual da lista (sem auth para o painel)
        if ($path === '/presenca/dados' && $method === 'GET') {
            require $presencaRoot . '/api/dados.php'; exit;
        }

        // POST /presenca/acao — confirmar/ausente/lembrete manual
        if ($path === '/presenca/acao' && $method === 'POST') {
            require $presencaRoot . '/api/acao.php'; exit;
        }

        // POST /presenca/recarregar — forca reenvio do relatorio
        if ($path === '/presenca/recarregar' && $method === 'POST') {
            require $presencaRoot . '/recarregar.php'; exit;
        }

        // POST /presenca/mensagem — mensagem avulsa para jogador ou grupo
        if ($path === '/presenca/mensagem' && $method === 'POST') {
            require $presencaRoot . '/api/mensagem.php'; exit;
        }

        // POST /presenca/mensagem-massa — comunicado para varios jogadores (admin)
        if ($path === '/presenca/mensagem-massa' && $method === 'POST') {
            AuthMiddleware::isAdmin();
            require $presencaRoot . '/api/mensagem_massa.php'; exit;
        }

        // GET /presenca/setup — cria as tabelas (rodar uma vez, apagar depois)
        if ($path === '/presenca/setup' && $method === 'GET') {
            header('Content-Type: text/html; charset=utf-8');
            require $presencaRoot . '/setup.php'; exit;
        }

        // GET|PUT /presenca/configuracoes — configuracoes do bot
        if ($path === '/presenca/configuracoes') {
            require $presencaRoot . '/api/configuracoes.php'; exit;
        }

        // GET /presenca/jogadores — lista jogadores
        if ($path === '/presenca/jogadores' && ($method === 'GET' || $method === 'POST')) {
            require $presencaRoot . '/api/jogadores.php'; exit;
        }

        // PUT|DELETE /presenca/jogadores/{id} — editar ou remover
        if (preg_match('#^/presenca/jogadores/(\d+)$#', $path, $m)) {
            $jogadorId = (int)$m[1];
            require $presencaRoot . '/api/jogadores.php'; exit;
        }

        // POST /presenca/jogadores/{id}/toggle — ativar/desativar
        if (preg_match('#^/presenca/jogadores/(\d+)/toggle$#', $path, $m) && $method === 'POST') {
            $jogadorId = (int)$m[1];
            require $presencaRoot . '/api/jogadores.php'; exit;
        }

        // POST /presenca/disparar — disparo manual (admin)
        if ($path === '/presenca/disparar' && $method === 'POST') {
            AuthMiddleware::isAdmin();
            require $presencaRoot . '/api/disparo_manual.php'; exit;
        }

        // POST /presenca/fechar — fechar/reabrir lista (admin)
        if ($path === '/presenca/fechar' && $method === 'POST') {
            AuthMiddleware::isAdmin();
            require $presencaRoot . '/api/fechar_lista.php'; exit;
        }

        // POST /presenca/teste-mensagem — mensagem de teste para numero (admin)
        if ($path === '/presenca/teste-mensagem' && $method === 'POST') {
            AuthMiddleware::isAdmin();
            require $presencaRoot . '/api/teste_mensagem.php'; exit;
        }

        // GET /presenca/logs — ultimas linhas do bot.log (admin)
        if ($path === '/presenca/logs' && $method === 'GET') {
            AuthMiddleware::isAdmin();
            require $presencaRoot . '/api/logs.php'; exit;
        }
    }

    // =========================================================
    // ALBUM DE FIGURINHAS
    // =========================================================

    // --- Catálogo de figurinhas (admin) ---
    if ($path === '/album/figurinhas' && $method === 'GET') {
        AuthMiddleware::handle();
        (new AlbumController())->listarFigurinhas(); exit;
    }
    if ($path === '/album/figurinhas' && $method === 'POST') {
        AuthMiddleware::isAdmin();
        (new AlbumController())->criarFigurinha(); exit;
    }
    if (preg_match('#^/album/figurinhas/(\d+)$#', $path, $m) && $method === 'PUT') {
        AuthMiddleware::isAdmin();
        (new AlbumController())->atualizarFigurinha((int)$m[1]); exit;
    }
    if (preg_match('#^/album/figurinhas/(\d+)$#', $path, $m) && $method === 'DELETE') {
        AuthMiddleware::isAdmin();
        (new AlbumController())->deletarFigurinha((int)$m[1]); exit;
    }

    // --- Páginas do álbum ---
    if ($path === '/album/paginas' && $method === 'GET') {
        AuthMiddleware::handle();
        (new AlbumController())->listarPaginas(); exit;
    }
    if ($path === '/album/paginas' && $method === 'POST') {
        AuthMiddleware::isAdmin();
        (new AlbumController())->criarPagina(); exit;
    }
    if (preg_match('#^/album/paginas/(\d+)$#', $path, $m) && $method === 'PUT') {
        AuthMiddleware::isAdmin();
        (new AlbumController())->atualizarPagina((int)$m[1]); exit;
    }

    // --- Álbum do usuário ---
    if ($path === '/album/meu' && $method === 'GET') {
        AuthMiddleware::handle();
        (new AlbumController())->meuAlbum(); exit;
    }

    // --- Pacotes ---
    if ($path === '/album/pacotes' && $method === 'GET') {
        AuthMiddleware::handle();
        (new AlbumController())->meusPacotes(); exit;
    }
    if (preg_match('#^/album/pacotes/(\d+)/abrir$#', $path, $m) && $method === 'POST') {
        AuthMiddleware::handle();
        (new AlbumController())->abrirPacote((int)$m[1]); exit;
    }

    // --- WhatsApp (vínculo) ---
    if ($path === '/album/whatsapp' && $method === 'GET') {
        AuthMiddleware::handle();
        (new AlbumController())->getWhatsapp(); exit;
    }
    if ($path === '/album/whatsapp' && $method === 'PUT') {
        AuthMiddleware::handle();
        (new AlbumController())->setWhatsapp(); exit;
    }

    // --- Admin: distribuir pacotes ---
    if ($path === '/album/admin/distribuir' && $method === 'POST') {
        AuthMiddleware::isAdmin();
        (new AlbumController())->distribuirPacotes(); exit;
    }

    // =========================================================
    // ROTA NÃO ENCONTRADA
    // =========================================================
    throw new HttpError("Rota não encontrada: [{$method}] {$path}", 404);

} catch (Throwable $e) {
    sendApiError($e);
}