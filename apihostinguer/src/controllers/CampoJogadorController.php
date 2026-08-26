<?php
/**
 * Elenco do modulo /campo
 * Arquivo: src/controllers/CampoJogadorController.php
 *
 * CRUD de jogadores, sempre escopado pelo clube do token (CampoMiddleware::clubeId()).
 * Upload de foto reaproveita o S3Client do Futlendas.
 */

require_once __DIR__ . '/../utils/HttpError.php';
require_once __DIR__ . '/../../config/campo_database.php';

class CampoJogadorController
{
    private $db;

    public function __construct()
    {
        $this->db = CampoDatabase::getInstance();
    }

    // GET /campo/jogadores
    public function index(): void
    {
        $clubeId = CampoMiddleware::clubeId();
        $rows = $this->db->fetchAll(
            'SELECT id, nome, numero, posicao, tipo, pe, foto_url, titular_padrao, ativo
             FROM campo_jogadores
             WHERE clube_id = ?
             ORDER BY ativo DESC, FIELD(tipo, "gk","def","mid","atk"), numero IS NULL, numero',
            [$clubeId]
        );
        $this->json(array_map([$this, 'shape'], $rows));
    }

    // POST /campo/jogadores
    public function store(): void
    {
        $clubeId = CampoMiddleware::clubeId();
        $in = $this->input();

        $nome = trim($in['nome'] ?? '');
        if ($nome === '') {
            throw new HttpError('Nome é obrigatório.', 400);
        }

        $posicao = strtoupper(trim($in['posicao'] ?? ''));
        if ($posicao === '') {
            throw new HttpError('Posição é obrigatória.', 400);
        }

        $tipo   = $this->tipoFromPosicao($posicao);
        $numero = isset($in['numero']) && $in['numero'] !== '' ? (int) $in['numero'] : null;
        $pe     = $this->validaPe($in['pe'] ?? null);

        $this->db->execute(
            'INSERT INTO campo_jogadores (clube_id, nome, numero, posicao, tipo, pe, foto_url, titular_padrao, ativo)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)',
            [
                $clubeId,
                $nome,
                $numero,
                $posicao,
                $tipo,
                $pe,
                $this->str($in['foto_url'] ?? null),
                !empty($in['titular_padrao']) ? 1 : 0,
            ]
        );

        $id = (int) $this->db->lastInsertId();
        $this->json($this->findOrFail($id, $clubeId), 201);
    }

    // PUT /campo/jogadores/{id}
    public function update(int $id): void
    {
        $clubeId = CampoMiddleware::clubeId();
        $this->findOrFail($id, $clubeId); // garante que pertence ao clube

        $in = $this->input();
        $nome = trim($in['nome'] ?? '');
        if ($nome === '') {
            throw new HttpError('Nome é obrigatório.', 400);
        }
        $posicao = strtoupper(trim($in['posicao'] ?? ''));
        if ($posicao === '') {
            throw new HttpError('Posição é obrigatória.', 400);
        }

        $tipo   = $this->tipoFromPosicao($posicao);
        $numero = isset($in['numero']) && $in['numero'] !== '' ? (int) $in['numero'] : null;
        $pe     = $this->validaPe($in['pe'] ?? null);

        $this->db->execute(
            'UPDATE campo_jogadores
             SET nome = ?, numero = ?, posicao = ?, tipo = ?, pe = ?, foto_url = ?, titular_padrao = ?, ativo = ?
             WHERE id = ? AND clube_id = ?',
            [
                $nome,
                $numero,
                $posicao,
                $tipo,
                $pe,
                $this->str($in['foto_url'] ?? null),
                !empty($in['titular_padrao']) ? 1 : 0,
                isset($in['ativo']) ? (!empty($in['ativo']) ? 1 : 0) : 1,
                $id,
                $clubeId,
            ]
        );

        $this->json($this->findOrFail($id, $clubeId));
    }

    // DELETE /campo/jogadores/{id}
    public function destroy(int $id): void
    {
        $clubeId = CampoMiddleware::clubeId();
        $this->findOrFail($id, $clubeId);
        $this->db->execute('DELETE FROM campo_jogadores WHERE id = ? AND clube_id = ?', [$id, $clubeId]);
        $this->json(['success' => true]);
    }

    // POST /campo/upload (multipart: campo "foto")
    // Salva localmente em public_html/campo-uploads/ (sem S3/AWS) e redimensiona p/ avatar.
    public function uploadFoto(): void
    {
        if (empty($_FILES['foto'])) {
            throw new HttpError('Nenhum arquivo enviado. Use o campo "foto".', 400);
        }
        $file = $_FILES['foto'];
        if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
            throw new HttpError('Falha no upload do arquivo.', 400);
        }

        $extByType = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
        $type = (string) $file['type'];
        if (!isset($extByType[$type])) {
            throw new HttpError('Tipo não permitido. Use JPEG, PNG ou WEBP.', 400);
        }
        if ($file['size'] > 15 * 1024 * 1024) {
            throw new HttpError('Máximo 15MB.', 400);
        }

        // Pasta de uploads na raiz do site (fora do rewrite da /api), servida estaticamente
        $root = rtrim((string) ($_SERVER['DOCUMENT_ROOT'] ?? ''), '/');
        if ($root === '') {
            $root = realpath(__DIR__ . '/../../..') ?: __DIR__ . '/../../..';
        }
        $dir = $root . '/campo-uploads';
        if (!is_dir($dir) && !mkdir($dir, 0755, true) && !is_dir($dir)) {
            throw new HttpError('Não foi possível criar a pasta de uploads.', 500);
        }

        $name = 'jog_' . CampoMiddleware::clubeId() . '_' . bin2hex(random_bytes(6)) . '.' . $extByType[$type];
        $dest = $dir . '/' . $name;

        // Tenta redimensionar (GD); se não houver GD, salva o original
        if (!$this->resizeImagem($file['tmp_name'], $dest, $type, 400)) {
            if (!move_uploaded_file($file['tmp_name'], $dest)) {
                throw new HttpError('Erro ao salvar a foto.', 500);
            }
        }

        // URL absoluta (funciona na web e depois no APK)
        $scheme = $_SERVER['REQUEST_SCHEME'] ?? 'https';
        $host   = $_SERVER['HTTP_HOST'] ?? 'futlendas.com.br';
        $this->json(['url' => "{$scheme}://{$host}/campo-uploads/{$name}"]);
    }

    /** Redimensiona mantendo proporção até `max` px no maior lado. false se GD indisponível/erro. */
    private function resizeImagem(string $src, string $dest, string $type, int $max): bool
    {
        if (!function_exists('imagecreatetruecolor')) {
            return false;
        }
        try {
            switch ($type) {
                case 'image/jpeg': $img = imagecreatefromjpeg($src); break;
                case 'image/png':  $img = imagecreatefrompng($src); break;
                case 'image/webp': $img = function_exists('imagecreatefromwebp') ? imagecreatefromwebp($src) : false; break;
                default:           return false;
            }
            if (!$img) {
                return false;
            }
            $w = imagesx($img);
            $h = imagesy($img);
            $scale = min(1, $max / max($w, $h));
            $nw = max(1, (int) round($w * $scale));
            $nh = max(1, (int) round($h * $scale));

            $out = imagecreatetruecolor($nw, $nh);
            imagealphablending($out, false);
            imagesavealpha($out, true);
            imagecopyresampled($out, $img, 0, 0, 0, 0, $nw, $nh, $w, $h);

            $ok = false;
            switch ($type) {
                case 'image/jpeg': $ok = imagejpeg($out, $dest, 85); break;
                case 'image/png':  $ok = imagepng($out, $dest, 6); break;
                case 'image/webp': $ok = imagewebp($out, $dest, 85); break;
            }
            imagedestroy($img);
            imagedestroy($out);
            return $ok;
        } catch (Throwable $e) {
            return false;
        }
    }

    // ---------- helpers ----------

    private function findOrFail(int $id, int $clubeId): array
    {
        $row = $this->db->fetchOne(
            'SELECT id, nome, numero, posicao, tipo, pe, foto_url, titular_padrao, ativo
             FROM campo_jogadores WHERE id = ? AND clube_id = ? LIMIT 1',
            [$id, $clubeId]
        );
        if (!$row) {
            throw new HttpError('Jogador não encontrado.', 404);
        }
        return $this->shape($row);
    }

    private function shape(array $r): array
    {
        return [
            'id'            => (int) $r['id'],
            'nome'          => $r['nome'],
            'numero'        => $r['numero'] !== null ? (int) $r['numero'] : null,
            'posicao'       => $r['posicao'],
            'tipo'          => $r['tipo'],
            'pe'            => $r['pe'],
            'fotoUrl'       => $r['foto_url'],
            'titularPadrao' => (bool) $r['titular_padrao'],
            'ativo'         => (bool) $r['ativo'],
        ];
    }

    private function tipoFromPosicao(string $pos): string
    {
        $pos = strtoupper(trim($pos));
        if (in_array($pos, ['GOL', 'GK'], true)) {
            return 'gk';
        }
        if (in_array($pos, ['ZAG', 'ZC', 'LD', 'LE', 'LAT', 'ALA'], true)) {
            return 'def';
        }
        if (in_array($pos, ['VOL', 'MEI', 'MC', 'MD', 'ME', 'MEIA'], true)) {
            return 'mid';
        }
        return 'atk'; // ATA, CA, PD, PE, SA...
    }

    private function validaPe($pe): ?string
    {
        if ($pe === null || $pe === '') {
            return null;
        }
        $pe = (string) $pe;
        return in_array($pe, ['D', 'E', 'Ambi'], true) ? $pe : null;
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
        $raw  = file_get_contents('php://input');
        $data = json_decode($raw, true);
        return is_array($data) ? $data : [];
    }

    private function json($data, int $code = 200): void
    {
        http_response_code($code);
        echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }
}
