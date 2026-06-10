<?php
/**
 * Adversarios do modulo /campo (caixa-preta: so nome + escudo)
 * Arquivo: src/controllers/CampoAdversarioController.php
 */

require_once __DIR__ . '/../utils/HttpError.php';
require_once __DIR__ . '/../../config/campo_database.php';

class CampoAdversarioController
{
    private $db;

    public function __construct()
    {
        $this->db = CampoDatabase::getInstance();
    }

    // GET /campo/adversarios
    public function index(): void
    {
        $clubeId = CampoMiddleware::clubeId();
        $rows = $this->db->fetchAll(
            'SELECT id, nome, escudo_url FROM campo_adversarios WHERE clube_id = ? ORDER BY nome',
            [$clubeId]
        );
        $this->json(array_map([$this, 'shape'], $rows));
    }

    // POST /campo/adversarios
    public function store(): void
    {
        $clubeId = CampoMiddleware::clubeId();
        $in = $this->input();
        $nome = trim($in['nome'] ?? '');
        if ($nome === '') {
            throw new HttpError('Nome do adversário é obrigatório.', 400);
        }
        $this->db->execute(
            'INSERT INTO campo_adversarios (clube_id, nome, escudo_url) VALUES (?, ?, ?)',
            [$clubeId, $nome, $this->str($in['escudo_url'] ?? null)]
        );
        $this->json($this->findOrFail((int) $this->db->lastInsertId(), $clubeId), 201);
    }

    // PUT /campo/adversarios/{id}
    public function update(int $id): void
    {
        $clubeId = CampoMiddleware::clubeId();
        $this->findOrFail($id, $clubeId);
        $in = $this->input();
        $nome = trim($in['nome'] ?? '');
        if ($nome === '') {
            throw new HttpError('Nome do adversário é obrigatório.', 400);
        }
        $this->db->execute(
            'UPDATE campo_adversarios SET nome = ?, escudo_url = ? WHERE id = ? AND clube_id = ?',
            [$nome, $this->str($in['escudo_url'] ?? null), $id, $clubeId]
        );
        $this->json($this->findOrFail($id, $clubeId));
    }

    // DELETE /campo/adversarios/{id}
    public function destroy(int $id): void
    {
        $clubeId = CampoMiddleware::clubeId();
        $this->findOrFail($id, $clubeId);
        $this->db->execute('DELETE FROM campo_adversarios WHERE id = ? AND clube_id = ?', [$id, $clubeId]);
        $this->json(['success' => true]);
    }

    // ---------- helpers ----------

    private function findOrFail(int $id, int $clubeId): array
    {
        $row = $this->db->fetchOne(
            'SELECT id, nome, escudo_url FROM campo_adversarios WHERE id = ? AND clube_id = ? LIMIT 1',
            [$id, $clubeId]
        );
        if (!$row) {
            throw new HttpError('Adversário não encontrado.', 404);
        }
        return $this->shape($row);
    }

    private function shape(array $r): array
    {
        return [
            'id'        => (int) $r['id'],
            'nome'      => $r['nome'],
            'escudoUrl' => $r['escudo_url'],
        ];
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
