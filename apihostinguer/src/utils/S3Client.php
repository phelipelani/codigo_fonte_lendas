<?php
/**
 * Cliente AWS S3 para Upload de Arquivos
 * Arquivo: src/utils/S3Client.php
 *
 * Requer: composer require aws/aws-sdk-php
 */

require_once __DIR__ . '/../../vendor/autoload.php';

use Aws\S3\S3Client as AwsS3Client;
use Aws\Exception\AwsException;

class S3Client
{
    private static ?AwsS3Client $client = null;
    private static string $bucketName;
    private static string $region;

    private static function init(): void
    {
        if (self::$client !== null) return;

        // Aceita AWS_BUCKET ou AWS_BUCKET_NAME
        self::$bucketName = $_ENV['AWS_BUCKET'] ?? $_ENV['AWS_BUCKET_NAME'] ?? '';
        self::$region     = $_ENV['AWS_REGION'] ?? 'sa-east-1';

        $key    = $_ENV['AWS_ACCESS_KEY_ID']     ?? '';
        $secret = $_ENV['AWS_SECRET_ACCESS_KEY'] ?? '';

        if (empty(self::$bucketName) || empty($key) || empty($secret)) {
            throw new Exception('Credenciais AWS não configuradas no .env.');
        }

        self::$client = new AwsS3Client([
            'version'     => 'latest',
            'region'      => self::$region,
            'credentials' => [
                'key'    => $key,
                'secret' => $secret,
            ],
        ]);
    }

    /**
     * Faz upload de um arquivo vindo de $_FILES para o S3
     *
     * @param array  $file      Item de $_FILES
     * @param string $keyPrefix Pasta no bucket (ex: 'fotos', 'logos')
     * @return string URL pública do arquivo
     */
    public static function upload(array $file, string $keyPrefix = 'uploads'): string
    {
        self::init();

        if ($file['error'] !== UPLOAD_ERR_OK) {
            throw new Exception('Erro no upload do arquivo: código ' . $file['error']);
        }

        $ext  = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        $key  = $keyPrefix . '/' . uniqid('', true) . '.' . $ext;
        $body = file_get_contents($file['tmp_name']);

        return self::putToS3($key, $body, $file['type']);
    }

    /**
     * Faz upload de conteúdo binário direto para o S3
     *
     * @param string $content   Conteúdo binário
     * @param string $filename  Nome original do arquivo (para pegar extensão)
     * @param string $mimeType  Tipo MIME
     * @param string $keyPrefix Pasta no bucket
     * @return string URL pública do arquivo
     */
    public static function uploadContent(string $content, string $filename, string $mimeType, string $keyPrefix = 'uploads'): string
    {
        self::init();

        $ext = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
        $key = $keyPrefix . '/' . uniqid('', true) . '.' . $ext;

        return self::putToS3($key, $content, $mimeType);
    }

    /**
     * Envia os bytes para o S3 e retorna a URL pública
     */
    private static function putToS3(string $key, string $body, string $contentType): string
    {
        try {
            self::$client->putObject([
                'Bucket'      => self::$bucketName,
                'Key'         => $key,
                'Body'        => $body,
                'ContentType' => $contentType,
                // 'ACL' => 'public-read', // Descomente se o bucket não usar Block Public Access
            ]);

            return self::getPublicUrl($key);
        } catch (AwsException $e) {
            error_log('[S3] Erro ao fazer upload: ' . $e->getMessage());
            throw new Exception('Erro ao fazer upload do arquivo para o S3.');
        }
    }

    /**
     * Retorna a URL pública de um objeto no S3
     */
    public static function getPublicUrl(string $key): string
    {
        self::init();
        return 'https://' . self::$bucketName . '.s3.' . self::$region . '.amazonaws.com/' . $key;
    }
}