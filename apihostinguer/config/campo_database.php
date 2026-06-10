<?php
/**
 * Conexao com o banco do modulo /campo
 * Arquivo: config/campo_database.php
 *
 * Banco SEPARADO do Futlendas. Le credenciais proprias (CAMPO_DB_*) do .env.
 * Conexao preguicosa: so abre quando uma rota /campo a chama, entao se as
 * credenciais nao estiverem setadas, o Futlendas continua funcionando normal.
 *
 * API identica a config/database.php (Database), so muda o destino.
 */

class CampoDatabase
{
    private static $instance = null;
    private $connection;

    private function __construct()
    {
        $host     = $_ENV['CAMPO_DB_HOST']     ?? ($_ENV['DB_HOST'] ?? 'localhost');
        $user     = $_ENV['CAMPO_DB_USER']     ?? '';
        $password = $_ENV['CAMPO_DB_PASSWORD'] ?? '';
        $database = $_ENV['CAMPO_DB_NAME']     ?? '';
        $port     = $_ENV['CAMPO_DB_PORT']     ?? 3306;

        if ($database === '' || $user === '') {
            throw new Exception('Banco do /campo não configurado. Defina CAMPO_DB_NAME, CAMPO_DB_USER e CAMPO_DB_PASSWORD no .env.');
        }

        try {
            $dsn     = "mysql:host={$host};port={$port};dbname={$database};charset=utf8mb4";
            $options = [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
                // Conexao ao banco campo e local (localhost): reconectar custa ~ms.
                // Nao-persistente evita acumular conexoes e estourar o limite do
                // plano compartilhado (causa de picos de latencia).
                PDO::ATTR_PERSISTENT         => false,
                PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4",
            ];
            $this->connection = new PDO($dsn, $user, $password, $options);
        } catch (PDOException $e) {
            error_log("❌ Erro ao conectar ao MySQL do /campo: " . $e->getMessage());
            throw $e;
        }
    }

    public static function getInstance(): self
    {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    public function getConnection()
    {
        return $this->connection;
    }

    public function query($sql, $params = [])
    {
        $stmt = $this->connection->prepare($sql);
        $stmt->execute($params);
        return $stmt;
    }

    public function fetchAll($sql, $params = [])
    {
        return $this->query($sql, $params)->fetchAll();
    }

    public function fetchOne($sql, $params = [])
    {
        return $this->query($sql, $params)->fetch();
    }

    public function execute($sql, $params = [])
    {
        return $this->query($sql, $params)->rowCount();
    }

    public function lastInsertId()
    {
        return $this->connection->lastInsertId();
    }

    public function beginTransaction(): void
    {
        $this->connection->beginTransaction();
    }

    public function commit(): void
    {
        $this->connection->commit();
    }

    public function rollBack(): void
    {
        $this->connection->rollBack();
    }
}
