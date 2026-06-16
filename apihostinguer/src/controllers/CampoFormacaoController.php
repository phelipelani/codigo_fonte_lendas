<?php
/**
 * Formacoes / taticas salvas do modulo /campo (board de Estrategia)
 * Arquivo: src/controllers/CampoFormacaoController.php
 *
 * Guarda esquema + mentalidade + estilo + instrucoes (JSON) e a posicao de
 * cada jogador no campo (JSON [{jogadorId, x, y}]). Tudo escopado por clube.
 */

require_once __DIR__ . '/../utils/HttpError.php';
require_once __DIR__ . '/../../config/campo_database.php';

class CampoFormacaoController
{
    private $db;

    public function __construct()
    {
        $this->db = CampoDatabase::getInstance();
    }

    // GET /campo/formacoes
    public function index(): void
    {
        $clubeId = CampoMiddleware::clubeId();
        $rows = $this->db->fetchAll(
            'SELECT id, nome, esquema, mentalidade, estilo, instrucoes, posicoes, favorita, atualizado_em
             FROM campo_formacoes WHERE clube_id = ? ORDER BY favorita DESC, atualizado_em DESC, id DESC',
            [$clubeId]
        );
        $this->json(array_map([$this, 'shape'], $rows));
    }

    // GET /campo/formacoes/{id}
    public function show(int $id): void
    {
        $this->json($this->findOrFail($id, CampoMiddleware::clubeId()));
    }

    // POST /campo/formacoes
    public function store(): void
    {
        $clubeId = CampoMiddleware::clubeId();
        $in = $this->input();

        $nome = trim($in['nome'] ?? '');
        if ($nome === '') {
            throw new HttpError('Dê um nome para a formação.', 400);
        }

        $this->db->execute(
            'INSERT INTO campo_formacoes
                (clube_id, nome, esquema, mentalidade, estilo, instrucoes, posicoes, favorita, criado_por)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
                $clubeId,
                $nome,
                $this->str($in['esquema'] ?? null),
                $this->str($in['mentalidade'] ?? null),
                $this->str($in['estilo'] ?? null),
                $this->jsonOrNull($in['instrucoes'] ?? null),
                $this->jsonOrNull($in['posicoes'] ?? null),
                !empty($in['favorita']) ? 1 : 0,
                (int) ($_REQUEST['campoUser']['userId'] ?? 0) ?: null,
            ]
        );
        $this->json($this->findOrFail((int) $this->db->lastInsertId(), $clubeId), 201);
    }

    // PUT /campo/formacoes/{id}
    public function update(int $id): void
    {
        $clubeId = CampoMiddleware::clubeId();
        $this->findOrFail($id, $clubeId);
        $in = $this->input();

        $nome = trim($in['nome'] ?? '');
        if ($nome === '') {
            throw new HttpError('Dê um nome para a formação.', 400);
        }

        $this->db->execute(
            'UPDATE campo_formacoes
                SET nome = ?, esquema = ?, mentalidade = ?, estilo = ?, instrucoes = ?, posicoes = ?, favorita = ?
             WHERE id = ? AND clube_id = ?',
            [
                $nome,
                $this->str($in['esquema'] ?? null),
                $this->str($in['mentalidade'] ?? null),
                $this->str($in['estilo'] ?? null),
                $this->jsonOrNull($in['instrucoes'] ?? null),
                $this->jsonOrNull($in['posicoes'] ?? null),
                !empty($in['favorita']) ? 1 : 0,
                $id,
                $clubeId,
            ]
        );
        $this->json($this->findOrFail($id, $clubeId));
    }

    // DELETE /campo/formacoes/{id}
    public function destroy(int $id): void
    {
        $clubeId = CampoMiddleware::clubeId();
        $this->findOrFail($id, $clubeId);
        $this->db->execute('DELETE FROM campo_formacoes WHERE id = ? AND clube_id = ?', [$id, $clubeId]);
        $this->json(['success' => true]);
    }

    // ---------- helpers ----------

    private function findOrFail(int $id, int $clubeId): array
    {
        $row = $this->db->fetchOne(
            'SELECT id, nome, esquema, mentalidade, estilo, instrucoes, posicoes, favorita, atualizado_em
             FROM campo_formacoes WHERE id = ? AND clube_id = ? LIMIT 1',
            [$id, $clubeId]
        );
        if (!$row) {
            throw new HttpError('Formação não encontrada.', 404);
        }
        return $this->shape($row);
    }

    private function shape(array $r): array
    {
        return [
            'id'          => (int) $r['id'],
            'nome'        => $r['nome'],
            'esquema'     => $r['esquema'],
            'mentalidade' => $r['mentalidade'],
            'estilo'      => $r['estilo'],
            'instrucoes'  => $this->decode($r['instrucoes'] ?? null),
            'posicoes'    => $this->decode($r['posicoes'] ?? null) ?? [],
            'favorita'    => (bool) $r['favorita'],
            'atualizadoEm' => $r['atualizado_em'] ?? null,
        ];
    }

    private function decode($v)
    {
        if ($v === null || $v === '') {
            return null;
        }
        $d = json_decode($v, true);
        return json_last_error() === JSON_ERROR_NONE ? $d : null;
    }

    private function jsonOrNull($v): ?string
    {
        if ($v === null || $v === '' || $v === []) {
            return null;
        }
        return json_encode($v, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
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
