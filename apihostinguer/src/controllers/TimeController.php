<?php
/**
 * Controller de Times
 * Arquivo: src/controllers/TimeController.php
 */

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../utils/HttpError.php';

class TimeController
{
    private $db;

    public function __construct()
    {
        $this->db = Database::getInstance();
    }

    public function index(): void
    {
        $times = $this->db->fetchAll("
            SELECT t.id, t.nome, t.logo_url AS logoUrl, t.criado_em AS criadoEm,
                   (SELECT j.nome FROM time_jogadores tj
                    JOIN jogadores j ON j.id = tj.jogador_id
                    WHERE tj.time_id = t.id AND tj.is_capitao = 1
                    LIMIT 1) AS nome_capitao
            FROM times t
            ORDER BY t.nome ASC
        ");
        $result = array_map(fn($t) => [
            'id' => (int)$t['id'],
            'nome' => $t['nome'],
            'logoUrl' => $t['logoUrl'],
            'logo_url' => $t['logoUrl'],
            'criadoEm' => $t['criadoEm'],
            'nome_capitao' => $t['nome_capitao'] ?? null,
        ], $times);
        http_response_code(200);
        echo json_encode($result, JSON_UNESCAPED_UNICODE);
    }

    public function show(int $id): void
    {
        $time = $this->db->fetchOne("SELECT id, nome, logo_url AS logoUrl, criado_em AS criadoEm FROM times WHERE id = ?", [$id]);
        if (!$time) throw new HttpError('Time não encontrado.', 404);
        http_response_code(200);
        echo json_encode(['id' => (int)$time['id'], 'nome' => $time['nome'], 'logoUrl' => $time['logoUrl'], 'logo_url' => $time['logoUrl'], 'criadoEm' => $time['criadoEm'], 'jogadores' => $this->getJogadoresDoTime($id)], JSON_UNESCAPED_UNICODE);
    }

    public function store(): void
    {
        $input = $this->getJsonInput();
        if (empty($input['nome'])) throw new HttpError('Nome é obrigatório.', 400);
        $logoUrl = $input['logoUrl'] ?? $input['logo_url'] ?? null;
        $this->db->execute('INSERT INTO times (nome, logo_url) VALUES (?, ?)', [$input['nome'], $logoUrl]);
        $newId = (int)$this->db->lastInsertId();
        $created = $this->db->fetchOne('SELECT criado_em AS criadoEm FROM times WHERE id = ?', [$newId]);
        http_response_code(201);
        echo json_encode(['id' => $newId, 'nome' => $input['nome'], 'logoUrl' => $logoUrl, 'logo_url' => $logoUrl, 'criadoEm' => $created['criadoEm'] ?? null], JSON_UNESCAPED_UNICODE);
    }

    public function update(int $id): void
    {
        $time = $this->db->fetchOne('SELECT id FROM times WHERE id = ?', [$id]);
        if (!$time) throw new HttpError('Time não encontrado.', 404);
        $input = $this->getJsonInput();
        $fields = []; $params = [];
        if (isset($input['nome'])) { $fields[] = 'nome = ?'; $params[] = $input['nome']; }
        if (isset($input['logoUrl']) || isset($input['logo_url'])) { $fields[] = 'logo_url = ?'; $params[] = $input['logoUrl'] ?? $input['logo_url']; }
        if (isset($input['criado_em']) || isset($input['criadoEm'])) { $fields[] = 'criado_em = ?'; $params[] = $input['criado_em'] ?? $input['criadoEm']; }
        if (empty($fields)) throw new HttpError('Nenhum campo para atualizar.', 400);
        $params[] = $id;
        $this->db->execute('UPDATE times SET ' . implode(', ', $fields) . ' WHERE id = ?', $params);
        $updated = $this->db->fetchOne('SELECT id, nome, logo_url AS logoUrl, criado_em AS criadoEm FROM times WHERE id = ?', [$id]);
        http_response_code(200);
        echo json_encode(['id' => (int)$updated['id'], 'nome' => $updated['nome'], 'logoUrl' => $updated['logoUrl'], 'logo_url' => $updated['logoUrl'], 'criadoEm' => $updated['criadoEm']], JSON_UNESCAPED_UNICODE);
    }

    public function destroy(int $id): void
    {
        $time = $this->db->fetchOne('SELECT id, nome FROM times WHERE id = ?', [$id]);
        if (!$time) throw new HttpError('Time não encontrado.', 404);

        // Verifica se o time está em algum campeonato
        $emCampeonato = $this->db->fetchOne(
            'SELECT COUNT(*) AS total FROM campeonato_partidas WHERE timeA_id = ? OR timeB_id = ?',
            [$id, $id]
        );
        if ($emCampeonato && (int)$emCampeonato['total'] > 0) {
            throw new HttpError('Este time não pode ser excluído porque possui partidas em campeonatos. Remova-o dos campeonatos primeiro.', 409);
        }

        $this->db->beginTransaction();
        try {
            $this->db->execute('DELETE FROM time_jogadores WHERE time_id = ?', [$id]);
            $this->db->execute('DELETE FROM times WHERE id = ?', [$id]);
            $this->db->commit();
        } catch (\Exception $e) {
            $this->db->rollBack();
            throw $e;
        }

        http_response_code(200);
        echo json_encode(['success' => true, 'nome' => $time['nome']], JSON_UNESCAPED_UNICODE);
    }

    public function jogadores(int $id): void
    {
        $time = $this->db->fetchOne('SELECT id FROM times WHERE id = ?', [$id]);
        if (!$time) throw new HttpError('Time não encontrado.', 404);
        http_response_code(200);
        echo json_encode($this->getJogadoresDoTime($id), JSON_UNESCAPED_UNICODE);
    }

    public function addJogador(int $timeId): void
    {
        $time = $this->db->fetchOne('SELECT id FROM times WHERE id = ?', [$timeId]);
        if (!$time) throw new HttpError('Time não encontrado.', 404);

        $input = $this->getJsonInput();

        if (!empty($input['jogador_ids']) && is_array($input['jogador_ids'])) {
            $jogadorIds = array_map('intval', $input['jogador_ids']);
        } elseif (!empty($input['jogadorId'])) {
            $jogadorIds = [(int)$input['jogadorId']];
        } elseif (!empty($input['jogador_id'])) {
            $jogadorIds = [(int)$input['jogador_id']];
        } else {
            throw new HttpError('Informe jogadorId ou jogador_ids.', 400);
        }

        $isCapitao  = !empty($input['isCapitao'])  || !empty($input['is_capitao']);
        $isPeDeRato = !empty($input['isPeDeRato']) || !empty($input['is_pe_de_rato']);
        $adicionados = 0;

        foreach ($jogadorIds as $jogadorId) {
            if ($jogadorId <= 0) continue;
            $jogador = $this->db->fetchOne('SELECT id FROM jogadores WHERE id = ?', [$jogadorId]);
            if (!$jogador) { error_log("[TimeController] Jogador ID {$jogadorId} não encontrado."); continue; }
            $existing = $this->db->fetchOne('SELECT time_id FROM time_jogadores WHERE time_id = ? AND jogador_id = ?', [$timeId, $jogadorId]);
            if (!$existing) {
                $this->db->execute('INSERT INTO time_jogadores (time_id, jogador_id, is_capitao, is_pe_de_rato) VALUES (?, ?, ?, ?)', [$timeId, $jogadorId, $isCapitao ? 1 : 0, $isPeDeRato ? 1 : 0]);
                $adicionados++;
            }
        }

        http_response_code(201);
        echo json_encode(['success' => true, 'adicionados' => $adicionados, 'jogadores' => $this->getJogadoresDoTime($timeId)], JSON_UNESCAPED_UNICODE);
    }

    public function updateRole(int $timeId, int $jogadorId): void
    {
        $vinculo = $this->db->fetchOne('SELECT time_id FROM time_jogadores WHERE time_id = ? AND jogador_id = ?', [$timeId, $jogadorId]);
        if (!$vinculo) throw new HttpError('Jogador não pertence a este time.', 404);
        $input = $this->getJsonInput();
        $fields = []; $params = [];

        $settingCapitao = false;
        if (array_key_exists('is_capitao', $input) || array_key_exists('isCapitao', $input)) {
            $val = ($input['is_capitao'] ?? $input['isCapitao']) ? 1 : 0;
            $fields[] = 'is_capitao = ?'; $params[] = $val;
            if ($val) $settingCapitao = true;
        }
        if (array_key_exists('is_pe_de_rato', $input) || array_key_exists('isPeDeRato', $input)) { $fields[] = 'is_pe_de_rato = ?'; $params[] = ($input['is_pe_de_rato'] ?? $input['isPeDeRato']) ? 1 : 0; }
        if (empty($fields)) throw new HttpError('Nenhum campo de role informado.', 400);

        // Se está setando capitão, remove o anterior primeiro (só 1 capitão por time)
        if ($settingCapitao) {
            $this->db->execute('UPDATE time_jogadores SET is_capitao = 0 WHERE time_id = ? AND is_capitao = 1', [$timeId]);
        }

        $params[] = $timeId; $params[] = $jogadorId;
        $this->db->execute('UPDATE time_jogadores SET ' . implode(', ', $fields) . ' WHERE time_id = ? AND jogador_id = ?', $params);
        http_response_code(200);
        echo json_encode(['success' => true], JSON_UNESCAPED_UNICODE);
    }

    public function removeJogador(int $timeId, int $jogadorId): void
    {
        $vinculo = $this->db->fetchOne('SELECT time_id FROM time_jogadores WHERE time_id = ? AND jogador_id = ?', [$timeId, $jogadorId]);
        if (!$vinculo) throw new HttpError('Jogador não pertence a este time.', 404);
        $this->db->execute('DELETE FROM time_jogadores WHERE time_id = ? AND jogador_id = ?', [$timeId, $jogadorId]);
        http_response_code(200);
        echo json_encode(['success' => true], JSON_UNESCAPED_UNICODE);
    }

    public function uploadFoto(): void
    {
        if (empty($_FILES['foto'])) throw new HttpError('Nenhum arquivo enviado. Use o campo "foto".', 400);
        $file = $_FILES['foto'];
        $allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (!in_array($file['type'], $allowedTypes)) throw new HttpError('Tipo não permitido. Use JPEG, PNG ou WEBP.', 400);
        if ($file['size'] > 5 * 1024 * 1024) throw new HttpError('Máximo 5MB.', 400);
        $pasta = preg_replace('/[^a-z0-9_-]/', '', strtolower($_GET['pasta'] ?? 'uploads'));
        require_once __DIR__ . '/../utils/S3Client.php';
        $url = S3Client::upload($file, $pasta);
        http_response_code(200);
        echo json_encode(['url' => $url], JSON_UNESCAPED_UNICODE);
    }

    private function getJogadoresDoTime(int $timeId): array
    {
        $rows = $this->db->fetchAll("
            SELECT j.id, j.nome, j.posicao, j.nivel,
                   j.joga_recuado AS jogarRecuado, j.foto_url AS fotoUrl, j.avatar_url AS avatarUrl,
                   tj.is_capitao AS isCapitao, tj.is_pe_de_rato AS isPeDeRato
            FROM time_jogadores tj
            JOIN jogadores j ON j.id = tj.jogador_id
            WHERE tj.time_id = ?
            ORDER BY j.nome ASC
        ", [$timeId]);

        return array_map(fn($j) => [
            'id' => (int)$j['id'], 'nome' => $j['nome'], 'posicao' => $j['posicao'], 'nivel' => (int)$j['nivel'],
            'jogarRecuado' => (bool)$j['jogarRecuado'], 'joga_recuado' => (bool)$j['jogarRecuado'],
            'fotoUrl' => $j['fotoUrl'], 'foto_url' => $j['fotoUrl'], 'avatarUrl' => $j['avatarUrl'],
            'isCapitao' => (bool)$j['isCapitao'], 'is_capitao' => (bool)$j['isCapitao'],
            'isPeDeRato' => (bool)$j['isPeDeRato'], 'is_pe_de_rato' => (bool)$j['isPeDeRato'],
        ], $rows);
    }

    private function getJsonInput(): array
    {
        return json_decode(file_get_contents('php://input'), true) ?? [];
    }
}