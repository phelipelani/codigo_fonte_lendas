<?php
/**
 * Arquivo: src/controllers/LigaController.php
 * CRUD completo para a tabela `ligas`.
 */

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../utils/HttpError.php';

class LigaController
{
    private $db;

    public function __construct()
    {
        $this->db = Database::getInstance();
    }

    // =========================================================
    // GET /ligas
    // =========================================================
    public function index(): void
    {
        $ligas = $this->db->fetchAll('SELECT * FROM ligas ORDER BY id DESC');
        http_response_code(200);
        echo json_encode($ligas, JSON_UNESCAPED_UNICODE);
    }

    // =========================================================
    // GET /ligas/:id
    // =========================================================
    public function show(int $id): void
    {
        $liga = $this->db->fetchOne('SELECT * FROM ligas WHERE id = ?', [$id]);
        if (!$liga) {
            throw new HttpError('Liga não encontrada.', 404);
        }
        http_response_code(200);
        echo json_encode($liga, JSON_UNESCAPED_UNICODE);
    }

    // =========================================================
    // POST /ligas
    // =========================================================
    public function store(): void
    {
        $input = $this->json();

        $nome        = trim($input['nome'] ?? '');
        $data_inicio = trim($input['data_inicio'] ?? '');
        $data_fim    = trim($input['data_fim'] ?? '');

        if (strlen($nome) < 3) {
            throw new HttpError('Nome deve ter pelo menos 3 caracteres.', 422);
        }
        if (!strtotime($data_inicio) || !strtotime($data_fim)) {
            throw new HttpError('Datas inválidas.', 422);
        }
        if (strtotime($data_fim) < strtotime($data_inicio)) {
            throw new HttpError('Data de término deve ser após a data de início.', 422);
        }

        $this->db->execute(
            'INSERT INTO ligas (nome, data_inicio, data_fim) VALUES (?, ?, ?)',
            [$nome, $data_inicio, $data_fim]
        );

        $id = $this->db->lastInsertId();
        $liga = $this->db->fetchOne('SELECT * FROM ligas WHERE id = ?', [$id]);

        http_response_code(201);
        echo json_encode([
            'message' => 'Liga criada com sucesso!',
            'liga'    => $liga,
        ], JSON_UNESCAPED_UNICODE);
    }

    // =========================================================
    // PUT /ligas/:id
    // =========================================================
    public function update(int $id): void
    {
        $liga = $this->db->fetchOne('SELECT * FROM ligas WHERE id = ?', [$id]);
        if (!$liga) {
            throw new HttpError('Liga não encontrada.', 404);
        }

        $input = $this->json();

        $nome        = trim($input['nome'] ?? $liga['nome']);
        $data_inicio = trim($input['data_inicio'] ?? $liga['data_inicio']);
        $data_fim    = trim($input['data_fim'] ?? $liga['data_fim']);

        if (strlen($nome) < 3) {
            throw new HttpError('Nome deve ter pelo menos 3 caracteres.', 422);
        }

        $this->db->execute(
            'UPDATE ligas SET nome = ?, data_inicio = ?, data_fim = ? WHERE id = ?',
            [$nome, $data_inicio, $data_fim, $id]
        );

        $ligaAtualizada = $this->db->fetchOne('SELECT * FROM ligas WHERE id = ?', [$id]);

        http_response_code(200);
        echo json_encode([
            'message' => 'Liga atualizada com sucesso!',
            'liga'    => $ligaAtualizada,
        ], JSON_UNESCAPED_UNICODE);
    }

    // =========================================================
    // DELETE /ligas/:id
    // =========================================================
    public function destroy(int $id): void
    {
        $liga = $this->db->fetchOne('SELECT * FROM ligas WHERE id = ?', [$id]);
        if (!$liga) {
            throw new HttpError('Liga não encontrada.', 404);
        }

        // Verifica se há rodadas vinculadas
        $rodadas = $this->db->fetchOne(
            'SELECT COUNT(*) as total FROM rodadas WHERE liga_id = ?',
            [$id]
        );

        if ($rodadas && $rodadas['total'] > 0) {
            throw new HttpError(
                'Não é possível deletar uma liga que possui rodadas. Remova as rodadas primeiro.',
                409
            );
        }

        $this->db->execute('DELETE FROM ligas WHERE id = ?', [$id]);

        http_response_code(200);
        echo json_encode([
            'message' => "Liga \"{$liga['nome']}\" deletada com sucesso!",
        ], JSON_UNESCAPED_UNICODE);
    }

    // =========================================================
    // POST /ligas/:id/finalizar
    // =========================================================
    public function finalizar(int $id): void
    {
        $liga = $this->db->fetchOne('SELECT * FROM ligas WHERE id = ?', [$id]);
        if (!$liga) {
            throw new HttpError('Liga não encontrada.', 404);
        }
        if ($liga['finalizada_em']) {
            throw new HttpError('Esta liga já foi finalizada.', 409);
        }

        $this->db->execute(
            'UPDATE ligas SET finalizada_em = NOW() WHERE id = ?',
            [$id]
        );

        http_response_code(200);
        echo json_encode([
            'message' => "Liga \"{$liga['nome']}\" finalizada com sucesso!",
        ], JSON_UNESCAPED_UNICODE);
    }

    // ─── helpers ─────────────────────────────────────────────
    private function json(): array
    {
        return json_decode(file_get_contents('php://input'), true) ?? [];
    }
}
