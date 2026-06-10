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
