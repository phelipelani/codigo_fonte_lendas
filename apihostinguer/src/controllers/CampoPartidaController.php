<?php
/**
 * Partidas do modulo /campo
 * Arquivo: src/controllers/CampoPartidaController.php
 *
 * Cria/lista partidas do clube. Adversario e opcional (caixa-preta).
 * Eventos/captura ao vivo entram em fase posterior.
 */

require_once __DIR__ . '/../utils/HttpError.php';
require_once __DIR__ . '/../../config/campo_database.php';

class CampoPartidaController
{
    private $db;

    public function __construct()
    {
        $this->db = CampoDatabase::getInstance();
    }

    // GET /campo/partidas
    public function index(): void
    {
        $clubeId = CampoMiddleware::clubeId();
        $rows = $this->db->fetchAll(
            'SELECT p.id, p.data_hora, p.local, p.local_nome, p.local_bairro, p.competicao, p.formacao, p.status,
                    p.placar_nos, p.placar_eles, p.adversario_id, a.nome AS adversario_nome
             FROM campo_partidas p
             LEFT JOIN campo_adversarios a ON a.id = p.adversario_id
             WHERE p.clube_id = ?
             ORDER BY p.data_hora IS NULL, p.data_hora DESC, p.id DESC',
            [$clubeId]
        );
        $this->json(array_map([$this, 'shape'], $rows));
    }

    // GET /campo/partidas/{id}
    public function show(int $id): void
    {
        $this->json($this->findOrFail($id, CampoMiddleware::clubeId()));
    }

    // POST /campo/partidas
    public function store(): void
    {
        $clubeId = CampoMiddleware::clubeId();
        $in = $this->input();

        $adversarioId = $this->adversarioOrNull($in['adversario_id'] ?? null, $clubeId);
        $local = $this->validaLocal($in['local'] ?? 'casa');

        $this->db->execute(
            'INSERT INTO campo_partidas (clube_id, adversario_id, data_hora, local, local_nome, local_bairro, competicao, formacao, status, criado_por)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, "agendada", ?)',
            [
                $clubeId,
                $adversarioId,
                $this->datetime($in['data_hora'] ?? null),
                $local,
                $this->str($in['local_nome'] ?? null),
                $this->str($in['local_bairro'] ?? null),
                $this->str($in['competicao'] ?? null),
                $this->str($in['formacao'] ?? null),
                (int) ($_REQUEST['campoUser']['userId'] ?? 0) ?: null,
            ]
        );
        $this->json($this->findOrFail((int) $this->db->lastInsertId(), $clubeId), 201);
    }

    // PUT /campo/partidas/{id}
    public function update(int $id): void
    {
        $clubeId = CampoMiddleware::clubeId();
        $this->findOrFail($id, $clubeId);
        $in = $this->input();

        $adversarioId = $this->adversarioOrNull($in['adversario_id'] ?? null, $clubeId);
        $local  = $this->validaLocal($in['local'] ?? 'casa');
        $status = $this->validaStatus($in['status'] ?? null);

        $base = [
            $adversarioId,
            $this->datetime($in['data_hora'] ?? null),
            $local,
            $this->str($in['local_nome'] ?? null),
            $this->str($in['local_bairro'] ?? null),
            $this->str($in['competicao'] ?? null),
            $this->str($in['formacao'] ?? null),
        ];
        $this->db->execute(
            'UPDATE campo_partidas
             SET adversario_id = ?, data_hora = ?, local = ?, local_nome = ?, local_bairro = ?, competicao = ?, formacao = ?'
             . ($status ? ', status = ?' : '') .
            ' WHERE id = ? AND clube_id = ?',
            $status
                ? array_merge($base, [$status, $id, $clubeId])
                : array_merge($base, [$id, $clubeId])
        );
        $this->json($this->findOrFail($id, $clubeId));
    }

    // DELETE /campo/partidas/{id}
    public function destroy(int $id): void
    {
        $clubeId = CampoMiddleware::clubeId();
        $this->findOrFail($id, $clubeId);
        $this->db->execute('DELETE FROM campo_partidas WHERE id = ? AND clube_id = ?', [$id, $clubeId]);
        $this->json(['success' => true]);
    }

    // GET /campo/partidas/{id}/escalacao
    public function escalacaoGet(int $id): void
    {
        $clubeId = CampoMiddleware::clubeId();
        $this->findOrFail($id, $clubeId);
        $rows = $this->db->fetchAll(
            'SELECT e.jogador_id, e.posicao, e.titular, j.nome, j.numero, j.tipo, j.foto_url
             FROM campo_escalacoes e
             JOIN campo_jogadores j ON j.id = e.jogador_id
             WHERE e.partida_id = ?
             ORDER BY e.titular DESC, FIELD(j.tipo,"gk","def","mid","atk"), j.numero',
            [$id]
        );
        $this->json(array_map(fn(array $r) => [
            'jogadorId' => (int) $r['jogador_id'],
            'nome'      => $r['nome'],
            'numero'    => $r['numero'] !== null ? (int) $r['numero'] : null,
            'posicao'   => $r['posicao'],
            'tipo'      => $r['tipo'],
            'fotoUrl'   => $r['foto_url'],
            'titular'   => (bool) $r['titular'],
        ], $rows));
    }

    // POST /campo/partidas/{id}/escalacao  body: { formacao, titulares: [jogador_id...] }
    public function escalacaoSave(int $id): void
    {
        $clubeId = CampoMiddleware::clubeId();
        $this->findOrFail($id, $clubeId);
        $in = $this->input();

        $titulares = is_array($in['titulares'] ?? null) ? $in['titulares'] : [];
        $formacao  = $this->str($in['formacao'] ?? null);

        // mapa jogador_id => posicao (somente jogadores do clube)
        $jogs = $this->db->fetchAll(
            'SELECT id, posicao FROM campo_jogadores WHERE clube_id = ?',
            [$clubeId]
        );
        $posDe = [];
        foreach ($jogs as $j) {
            $posDe[(int) $j['id']] = $j['posicao'];
        }

        $this->db->beginTransaction();
        try {
            $this->db->execute('DELETE FROM campo_escalacoes WHERE partida_id = ?', [$id]);
            foreach ($titulares as $t) {
                $jid = (int) (is_array($t) ? ($t['jogador_id'] ?? 0) : $t);
                if (!isset($posDe[$jid])) {
                    continue; // ignora jogador que nao e do clube
                }
                $this->db->execute(
                    'INSERT INTO campo_escalacoes (partida_id, jogador_id, posicao, titular) VALUES (?, ?, ?, 1)',
                    [$id, $jid, $posDe[$jid]]
                );
            }
            $this->db->execute(
                'UPDATE campo_partidas SET formacao = ?, status = "ao_vivo" WHERE id = ? AND clube_id = ?',
                [$formacao, $id, $clubeId]
            );
            $this->db->commit();
        } catch (\Throwable $e) {
            $this->db->rollBack();
            throw new HttpError('Erro ao salvar escalação: ' . $e->getMessage(), 500);
        }

        $this->escalacaoGet($id);
    }

    // POST /campo/partidas/{id}/finalizar
    // body: { placar_nos, placar_eles, jogadores: [{jogador_id, passe_certo, ...}], eventos: [{jogador_id, tipo, minuto, tempo}] }
    public function finalizar(int $id): void
    {
        $clubeId = CampoMiddleware::clubeId();
        $this->findOrFail($id, $clubeId);
        $in = $this->input();

        $placarNos  = (int) ($in['placar_nos'] ?? 0);
        $placarEles = (int) ($in['placar_eles'] ?? 0);
        $jogadores  = is_array($in['jogadores'] ?? null) ? $in['jogadores'] : [];
        $eventos    = is_array($in['eventos'] ?? null) ? $in['eventos'] : [];

        // ids validos do clube
        $rows = $this->db->fetchAll('SELECT id FROM campo_jogadores WHERE clube_id = ?', [$clubeId]);
        $validos = [];
        foreach ($rows as $r) {
            $validos[(int) $r['id']] = true;
        }

        $cols = [
            'passe_certo', 'passe_errado', 'chute_certo', 'chute_errado', 'gols', 'assist',
            'desarme_ganho', 'desarme_perdido', 'interceptacao', 'corte', 'retomada',
            'defesa', 'gol_sofrido', 'amarelo', 'vermelho', 'falta', 'min_jogados',
        ];

        $this->db->beginTransaction();
        try {
            $this->db->execute(
                'UPDATE campo_partidas SET placar_nos = ?, placar_eles = ?, status = "finalizada" WHERE id = ? AND clube_id = ?',
                [$placarNos, $placarEles, $id, $clubeId]
            );

            $this->db->execute('DELETE FROM campo_estatisticas_partida WHERE partida_id = ?', [$id]);
            foreach ($jogadores as $j) {
                $jid = (int) ($j['jogador_id'] ?? 0);
                if (!isset($validos[$jid])) {
                    continue;
                }
                $vals = [$id, $jid];
                foreach ($cols as $c) {
                    $vals[] = (int) ($j[$c] ?? 0);
                }
                $ph = implode(', ', array_fill(0, count($cols) + 2, '?'));
                $this->db->execute(
                    'INSERT INTO campo_estatisticas_partida (partida_id, jogador_id, ' . implode(', ', $cols) . ") VALUES ($ph)",
                    $vals
                );
            }

            $this->db->execute('DELETE FROM campo_eventos WHERE partida_id = ?', [$id]);
            foreach ($eventos as $e) {
                $jid = isset($e['jogador_id']) ? (int) $e['jogador_id'] : null;
                if ($jid !== null && !isset($validos[$jid])) {
                    $jid = null;
                }
                $this->db->execute(
                    'INSERT INTO campo_eventos (partida_id, jogador_id, tipo, minuto, tempo) VALUES (?, ?, ?, ?, ?)',
                    [$id, $jid, substr((string) ($e['tipo'] ?? 'evento'), 0, 24),
                     isset($e['minuto']) ? (int) $e['minuto'] : null, (int) ($e['tempo'] ?? 1)]
                );
            }

            $this->db->commit();
        } catch (\Throwable $ex) {
            $this->db->rollBack();
            throw new HttpError('Erro ao finalizar: ' . $ex->getMessage(), 500);
        }

        $this->json($this->findOrFail($id, $clubeId));
    }

    // GET /campo/partidas/{id}/relatorio
    public function relatorio(int $id): void
    {
        $clubeId = CampoMiddleware::clubeId();
        $partida = $this->findOrFail($id, $clubeId);

        $rows = $this->db->fetchAll(
            'SELECT e.jogador_id, e.passe_certo, e.passe_errado, e.chute_certo, e.chute_errado,
                    e.gols, e.assist, e.desarme_ganho, e.desarme_perdido, e.interceptacao, e.corte,
                    e.retomada, e.defesa, e.gol_sofrido, e.amarelo, e.vermelho, e.falta, e.min_jogados,
                    j.nome, j.numero, j.posicao, j.tipo, j.foto_url
             FROM campo_estatisticas_partida e
             JOIN campo_jogadores j ON j.id = e.jogador_id
             WHERE e.partida_id = ?
             ORDER BY FIELD(j.tipo, "gk", "def", "mid", "atk"), j.numero',
            [$id]
        );

        $jogadores = array_map(fn(array $r) => [
            'jogadorId'      => (int) $r['jogador_id'],
            'nome'           => $r['nome'],
            'numero'         => $r['numero'] !== null ? (int) $r['numero'] : null,
            'posicao'        => $r['posicao'],
            'tipo'           => $r['tipo'],
            'fotoUrl'        => $r['foto_url'],
            'passeCerto'     => (int) $r['passe_certo'],
            'passeErrado'    => (int) $r['passe_errado'],
            'chuteCerto'     => (int) $r['chute_certo'],
            'chuteErrado'    => (int) $r['chute_errado'],
            'gols'           => (int) $r['gols'],
            'assist'         => (int) $r['assist'],
            'desarmeGanho'   => (int) $r['desarme_ganho'],
            'desarmePerdido' => (int) $r['desarme_perdido'],
            'interceptacao'  => (int) $r['interceptacao'],
            'corte'          => (int) $r['corte'],
            'retomada'       => (int) $r['retomada'],
            'defesa'         => (int) $r['defesa'],
            'golSofrido'     => (int) $r['gol_sofrido'],
            'amarelo'        => (int) $r['amarelo'],
            'vermelho'       => (int) $r['vermelho'],
            'falta'          => (int) $r['falta'],
            'minJogados'     => (int) $r['min_jogados'],
        ], $rows);

        $evs = $this->db->fetchAll(
            'SELECT ev.tipo, ev.minuto, ev.tempo, ev.jogador_id, j.nome
             FROM campo_eventos ev
             LEFT JOIN campo_jogadores j ON j.id = ev.jogador_id
             WHERE ev.partida_id = ?
             ORDER BY ev.tempo, ev.minuto, ev.id',
            [$id]
        );
        $eventos = array_map(fn(array $e) => [
            'tipo'      => $e['tipo'],
            'minuto'    => $e['minuto'] !== null ? (int) $e['minuto'] : null,
            'tempo'     => (int) $e['tempo'],
            'jogadorId' => $e['jogador_id'] !== null ? (int) $e['jogador_id'] : null,
            'nome'      => $e['nome'],
        ], $evs);

        $tot = ['chuteCerto' => 0, 'chuteErrado' => 0, 'passeCerto' => 0, 'passeErrado' => 0, 'defesas' => 0, 'gols' => 0, 'assist' => 0];
        foreach ($jogadores as $j) {
            $tot['chuteCerto']  += $j['chuteCerto'];
            $tot['chuteErrado'] += $j['chuteErrado'];
            $tot['passeCerto']  += $j['passeCerto'];
            $tot['passeErrado'] += $j['passeErrado'];
            $tot['defesas']     += $j['defesa'];
            $tot['gols']        += $j['gols'];
            $tot['assist']      += $j['assist'];
        }

        $this->json(['partida' => $partida, 'jogadores' => $jogadores, 'eventos' => $eventos, 'totais' => $tot]);
    }

    // ---------- helpers ----------

    private function findOrFail(int $id, int $clubeId): array
    {
        $row = $this->db->fetchOne(
            'SELECT p.id, p.data_hora, p.local, p.local_nome, p.local_bairro, p.competicao, p.formacao, p.status,
                    p.placar_nos, p.placar_eles, p.adversario_id, a.nome AS adversario_nome
             FROM campo_partidas p
             LEFT JOIN campo_adversarios a ON a.id = p.adversario_id
             WHERE p.id = ? AND p.clube_id = ? LIMIT 1',
            [$id, $clubeId]
        );
        if (!$row) {
            throw new HttpError('Partida não encontrada.', 404);
        }
        return $this->shape($row);
    }

    private function shape(array $r): array
    {
        return [
            'id'             => (int) $r['id'],
            'dataHora'       => $r['data_hora'],
            'local'          => $r['local'],
            'localNome'      => $r['local_nome'],
            'localBairro'    => $r['local_bairro'],
            'competicao'     => $r['competicao'],
            'formacao'       => $r['formacao'],
            'status'         => $r['status'],
            'placarNos'      => (int) $r['placar_nos'],
            'placarEles'     => (int) $r['placar_eles'],
            'adversarioId'   => $r['adversario_id'] !== null ? (int) $r['adversario_id'] : null,
            'adversarioNome' => $r['adversario_nome'],
        ];
    }

    private function adversarioOrNull($v, int $clubeId): ?int
    {
        if ($v === null || $v === '' || (int) $v === 0) {
            return null;
        }
        $id = (int) $v;
        $ok = $this->db->fetchOne(
            'SELECT id FROM campo_adversarios WHERE id = ? AND clube_id = ? LIMIT 1',
            [$id, $clubeId]
        );
        if (!$ok) {
            throw new HttpError('Adversário inválido.', 400);
        }
        return $id;
    }

    private function validaLocal($v): string
    {
        $v = (string) $v;
        return in_array($v, ['casa', 'fora', 'neutro'], true) ? $v : 'casa';
    }

    private function validaStatus($v): ?string
    {
        if ($v === null || $v === '') {
            return null;
        }
        $v = (string) $v;
        return in_array($v, ['agendada', 'ao_vivo', 'finalizada'], true) ? $v : null;
    }

    private function datetime($v): ?string
    {
        if ($v === null || trim((string) $v) === '') {
            return null;
        }
        $v = trim((string) $v);
        // aceita "2026-06-15T20:00" (datetime-local) ou "2026-06-15 20:00[:00]"
        $v = str_replace('T', ' ', $v);
        if (preg_match('/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/', $v)) {
            $v .= ':00';
        }
        if (!preg_match('/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/', $v)) {
            throw new HttpError('Data/hora inválida.', 400);
        }
        return $v;
    }

    private function str($v): ?string
    {
        if ($v === null) {
            return null;
        }
        $v = trim((string) $v);
        return $v === '' ? null : $v;
    }

    private function input(): array
    {
        $data = json_decode(file_get_contents('php://input'), true);
        return is_array($data) ? $data : [];
    }

    private function json($data, int $code = 200): void
    {
        http_response_code($code);
        echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }
}
