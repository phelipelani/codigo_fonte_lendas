<?php
/**
 * Agenda do modulo /campo — compromissos/atividades do clube.
 * Arquivo: src/controllers/CampoAgendaController.php
 *
 * Diretor/tecnico criam/editam/excluem; qualquer usuario do campo (incl. jogador) le.
 * `categoria` guarda o tipo fino da UI; `tipo` (ENUM) e derivado pra compatibilidade.
 */

require_once __DIR__ . '/../utils/HttpError.php';
require_once __DIR__ . '/../../config/campo_database.php';

class CampoAgendaController
{
    private $db;

    // categoria fina (UI) -> tipo coarse (ENUM da tabela)
    private const TIPO_DE = [
        'treino_tecnico' => 'treino',
        'treino_tatico'  => 'treino',
        'treino_fisico'  => 'treino',
        'analise'        => 'reuniao',
        'amistoso'       => 'jogo',
        'jogo_oficial'   => 'jogo',
    ];

    public function __construct()
    {
        $this->db = CampoDatabase::getInstance();
    }

    // GET /campo/agenda  (opcional ?de=YYYY-MM-DD&ate=YYYY-MM-DD)
    public function index(): void
    {
        $clubeId = CampoMiddleware::clubeId();
        $sql = 'SELECT id, titulo, tipo, categoria, data_inicio, data_fim, local, descricao
                FROM campo_agenda WHERE clube_id = ?';
        $params = [$clubeId];

        $de  = $this->str($_GET['de'] ?? null);
        $ate = $this->str($_GET['ate'] ?? null);
        if ($de) { $sql .= ' AND data_inicio >= ?'; $params[] = $de . ' 00:00:00'; }
        if ($ate) { $sql .= ' AND data_inicio <= ?'; $params[] = $ate . ' 23:59:59'; }
        $sql .= ' ORDER BY data_inicio ASC, id ASC';

        $rows = $this->db->fetchAll($sql, $params);
        $this->json(array_map([$this, 'shape'], $rows));
    }

    // POST /campo/agenda
    public function store(): void
    {
        $clubeId = CampoMiddleware::clubeId();
        $in = $this->input();

        $titulo = trim($in['titulo'] ?? '');
        if ($titulo === '') {
            throw new HttpError('Informe o título do compromisso.', 400);
        }
        $inicio = $this->datetime($in['data_inicio'] ?? null);
        if ($inicio === null) {
            throw new HttpError('Informe a data e hora do compromisso.', 400);
        }
        $categoria = $this->categoria($in['categoria'] ?? null);

        $this->db->execute(
            'INSERT INTO campo_agenda (clube_id, titulo, tipo, categoria, data_inicio, data_fim, local, descricao, criado_por)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
                $clubeId,
                $titulo,
                self::TIPO_DE[$categoria] ?? 'outro',
                $categoria,
                $inicio,
                $this->datetime($in['data_fim'] ?? null),
                $this->str($in['local'] ?? null),
                $this->str($in['descricao'] ?? null),
                (int) ($_REQUEST['campoUser']['userId'] ?? 0) ?: null,
            ]
        );
        $this->json($this->findOrFail((int) $this->db->lastInsertId(), $clubeId), 201);
    }

    // PUT /campo/agenda/{id}
    public function update(int $id): void
    {
        $clubeId = CampoMiddleware::clubeId();
        $this->findOrFail($id, $clubeId);
        $in = $this->input();

        $titulo = trim($in['titulo'] ?? '');
        if ($titulo === '') {
            throw new HttpError('Informe o título do compromisso.', 400);
        }
        $inicio = $this->datetime($in['data_inicio'] ?? null);
        if ($inicio === null) {
            throw new HttpError('Informe a data e hora do compromisso.', 400);
        }
        $categoria = $this->categoria($in['categoria'] ?? null);

        $this->db->execute(
            'UPDATE campo_agenda
                SET titulo = ?, tipo = ?, categoria = ?, data_inicio = ?, data_fim = ?, local = ?, descricao = ?
             WHERE id = ? AND clube_id = ?',
            [
                $titulo,
                self::TIPO_DE[$categoria] ?? 'outro',
                $categoria,
                $inicio,
                $this->datetime($in['data_fim'] ?? null),
                $this->str($in['local'] ?? null),
                $this->str($in['descricao'] ?? null),
                $id,
                $clubeId,
            ]
        );
        $this->json($this->findOrFail($id, $clubeId));
    }

    // DELETE /campo/agenda/{id}
    public function destroy(int $id): void
    {
        $clubeId = CampoMiddleware::clubeId();
        $this->findOrFail($id, $clubeId);
        $this->db->execute('DELETE FROM campo_agenda WHERE id = ? AND clube_id = ?', [$id, $clubeId]);
        $this->json(['success' => true]);
    }

    // ---------- helpers ----------

    private function findOrFail(int $id, int $clubeId): array
    {
        $row = $this->db->fetchOne(
            'SELECT id, titulo, tipo, categoria, data_inicio, data_fim, local, descricao
             FROM campo_agenda WHERE id = ? AND clube_id = ? LIMIT 1',
            [$id, $clubeId]
        );
        if (!$row) {
            throw new HttpError('Compromisso não encontrado.', 404);
        }
        return $this->shape($row);
    }

    private function shape(array $r): array
    {
        return [
            'id'         => (int) $r['id'],
            'titulo'     => $r['titulo'],
            'categoria'  => $r['categoria'] ?: ($r['tipo'] ?? 'outro'),
            'dataInicio' => $r['data_inicio'],
            'dataFim'    => $r['data_fim'],
            'local'      => $r['local'],
            'descricao'  => $r['descricao'],
        ];
    }

    private function categoria($v): string
    {
        $v = strtolower(trim((string) $v));
        return isset(self::TIPO_DE[$v]) ? $v : 'analise';
    }

    private function datetime($v): ?string
    {
        if ($v === null || trim((string) $v) === '') {
            return null;
        }
        $v = str_replace('T', ' ', trim((string) $v));
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
