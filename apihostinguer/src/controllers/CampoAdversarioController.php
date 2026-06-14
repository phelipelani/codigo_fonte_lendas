<?php
/**
 * Adversarios do modulo /campo (caixa-preta: nome + escudo + competicao)
 * Arquivo: src/controllers/CampoAdversarioController.php
 *
 * O index() agrega o historico de confrontos (a partir de campo_partidas finalizadas):
 * confrontos, GF, GS, vitorias/empates/derrotas e os ultimos 5 resultados.
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
            'SELECT id, nome, competicao, escudo_url FROM campo_adversarios WHERE clube_id = ? ORDER BY nome',
            [$clubeId]
        );

        // Partidas finalizadas (com adversario) — uma query, agrupa em PHP
        $partidas = $this->db->fetchAll(
            'SELECT adversario_id, placar_nos, placar_eles
             FROM campo_partidas
             WHERE clube_id = ? AND status = "finalizada" AND adversario_id IS NOT NULL
             ORDER BY data_hora DESC, id DESC',
            [$clubeId]
        );
        $porAdv = [];
        foreach ($partidas as $p) {
            $porAdv[(int) $p['adversario_id']][] = $p;
        }

        $out = array_map(function (array $a) use ($porAdv) {
            $id   = (int) $a['id'];
            $jogos = $porAdv[$id] ?? [];
            $gf = 0; $gs = 0; $v = 0; $e = 0; $d = 0; $ultimos = [];
            foreach ($jogos as $j) {
                $n = (int) $j['placar_nos'];
                $x = (int) $j['placar_eles'];
                $gf += $n; $gs += $x;
                if ($n > $x)      { $v++; $r = 'V'; }
                elseif ($n === $x){ $e++; $r = 'E'; }
                else              { $d++; $r = 'D'; }
                if (count($ultimos) < 5) $ultimos[] = $r;
            }
            return [
                'id'         => $id,
                'nome'       => $a['nome'],
                'competicao' => $a['competicao'],
                'escudoUrl'  => $a['escudo_url'],
                'confrontos' => count($jogos),
                'gf'         => $gf,
                'gs'         => $gs,
                'vitorias'   => $v,
                'empates'    => $e,
                'derrotas'   => $d,
                'ultimos'    => $ultimos,
            ];
        }, $rows);

        $this->json($out);
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
            'INSERT INTO campo_adversarios (clube_id, nome, competicao, escudo_url) VALUES (?, ?, ?, ?)',
            [$clubeId, $nome, $this->str($in['competicao'] ?? null), $this->str($in['escudo_url'] ?? null)]
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
            'UPDATE campo_adversarios SET nome = ?, competicao = ?, escudo_url = ? WHERE id = ? AND clube_id = ?',
            [$nome, $this->str($in['competicao'] ?? null), $this->str($in['escudo_url'] ?? null), $id, $clubeId]
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
            'SELECT id, nome, competicao, escudo_url FROM campo_adversarios WHERE id = ? AND clube_id = ? LIMIT 1',
            [$id, $clubeId]
        );
        if (!$row) {
            throw new HttpError('Adversário não encontrado.', 404);
        }
        return [
            'id'         => (int) $row['id'],
            'nome'       => $row['nome'],
            'competicao' => $row['competicao'],
            'escudoUrl'  => $row['escudo_url'],
            'confrontos' => 0,
            'gf'         => 0,
            'gs'         => 0,
            'vitorias'   => 0,
            'empates'    => 0,
            'derrotas'   => 0,
            'ultimos'    => [],
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
