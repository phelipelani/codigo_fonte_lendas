<?php
/**
 * Relatorios / estatisticas do modulo /campo
 * Arquivo: src/controllers/CampoRelatorioController.php
 *
 * Agrega o que foi capturado (campo_estatisticas_partida) das partidas finalizadas.
 */

require_once __DIR__ . '/../utils/HttpError.php';
require_once __DIR__ . '/../../config/campo_database.php';

class CampoRelatorioController
{
    private $db;

    public function __construct()
    {
        $this->db = CampoDatabase::getInstance();
    }

    // GET /campo/relatorios
    public function geral(): void
    {
        $clubeId = CampoMiddleware::clubeId();

        $partidas = $this->db->fetchAll(
            'SELECT p.id, p.data_hora, p.placar_nos, p.placar_eles, a.nome AS adversario_nome, a.escudo_url
             FROM campo_partidas p
             LEFT JOIN campo_adversarios a ON a.id = p.adversario_id
             WHERE p.clube_id = ? AND p.status = "finalizada"
             ORDER BY p.data_hora DESC, p.id DESC',
            [$clubeId]
        );

        $estat = $this->db->fetchAll(
            'SELECT e.*
             FROM campo_estatisticas_partida e
             JOIN campo_partidas p ON p.id = e.partida_id
             WHERE p.clube_id = ? AND p.status = "finalizada"',
            [$clubeId]
        );

        $campos = [
            'passe_certo', 'passe_errado', 'chute_certo', 'chute_errado', 'gols', 'assist',
            'desarme_ganho', 'desarme_perdido', 'interceptacao', 'corte', 'retomada',
            'defesa', 'gol_sofrido', 'amarelo', 'vermelho', 'falta',
        ];
        $tot = array_fill_keys($campos, 0);
        $porPartida = [];
        foreach ($estat as $r) {
            $pid = (int) $r['partida_id'];
            foreach ($campos as $c) {
                $tot[$c] += (int) $r[$c];
                $porPartida[$pid][$c] = ($porPartida[$pid][$c] ?? 0) + (int) $r[$c];
            }
        }

        $v = 0; $e = 0; $d = 0; $gm = 0; $gs = 0;
        $listaPartidas = [];
        foreach ($partidas as $p) {
            $pid = (int) $p['id'];
            $n = (int) $p['placar_nos'];
            $x = (int) $p['placar_eles'];
            $gm += $n; $gs += $x;
            $res = $n > $x ? 'V' : ($n === $x ? 'E' : 'D');
            if ($res === 'V') $v++; elseif ($res === 'E') $e++; else $d++;

            $ep = $porPartida[$pid] ?? [];
            $pc = (int) ($ep['passe_certo'] ?? 0);
            $pe = (int) ($ep['passe_errado'] ?? 0);
            $fin = (int) ($ep['chute_certo'] ?? 0) + (int) ($ep['chute_errado'] ?? 0);
            $listaPartidas[] = [
                'partidaId'    => $pid,
                'data'         => $p['data_hora'],
                'adversario'   => $p['adversario_nome'],
                'escudoUrl'    => $p['escudo_url'],
                'placarNos'    => $n,
                'placarEles'   => $x,
                'resultado'    => $res,
                'finalizacoes' => $fin,
                'precisaoPasse' => $pc + $pe ? round(($pc / ($pc + $pe)) * 100) : 0,
            ];
        }

        $np = count($partidas);
        $pcTot = $tot['passe_certo'];
        $peTot = $tot['passe_errado'];

        $this->json([
            'resumo' => [
                'partidas'      => $np,
                'vitorias'      => $v,
                'empates'       => $e,
                'derrotas'      => $d,
                'golsMarcados'  => $gm,
                'golsSofridos'  => $gs,
            ],
            'totais'        => $tot,
            'precisaoPasse' => $pcTot + $peTot ? round(($pcTot / ($pcTot + $peTot)) * 100) : 0,
            'medias'        => [
                'finalizacoes'  => $np ? round(($tot['chute_certo'] + $tot['chute_errado']) / $np, 1) : 0,
                'desarmes'      => $np ? round(($tot['desarme_ganho'] + $tot['desarme_perdido']) / $np, 1) : 0,
                'interceptacoes' => $np ? round($tot['interceptacao'] / $np, 1) : 0,
                'faltas'        => $np ? round($tot['falta'] / $np, 1) : 0,
                'golsPro'       => $np ? round($gm / $np, 2) : 0,
                'golsContra'    => $np ? round($gs / $np, 2) : 0,
            ],
            'partidas' => $listaPartidas,
        ]);
    }

    private function json($data, int $code = 200): void
    {
        http_response_code($code);
        echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }
}
