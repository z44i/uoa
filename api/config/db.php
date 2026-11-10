<?php
// api/config/db.php
// Dual-Driver Database Configuration (MySQL + SQLite PDO)

class Database {
    private static $instance = null;
    private $pdo;

    private function __construct() {
        // Read from environment or config file or defaults
        $dbDriver = getenv('DB_DRIVER') ?: 'sqlite'; // 'sqlite' or 'mysql'
        
        // Also check if .env file exists
        $envFile = __DIR__ . '/../../.env';
        $env = [];
        if (file_exists($envFile)) {
            $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            foreach ($lines as $line) {
                if (strpos(trim($line), '#') === 0) continue;
                if (strpos($line, '=') !== false) {
                    list($key, $val) = explode('=', $line, 2);
                    $env[trim($key)] = trim($val);
                }
            }
        }

        $driver = isset($env['DB_DRIVER']) ? strtolower($env['DB_DRIVER']) : $dbDriver;

        try {
            if ($driver === 'mysql') {
                $host = $env['DB_HOST'] ?? 'localhost';
                $port = $env['DB_PORT'] ?? '3306';
                $dbName = $env['DB_NAME'] ?? 'voting_system';
                $user = $env['DB_USER'] ?? 'root';
                $pass = $env['DB_PASSWORD'] ?? '';

                $dsn = "mysql:host={$host};port={$port};dbname={$dbName};charset=utf8mb4";
                $this->pdo = new PDO($dsn, $user, $pass, [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false,
                ]);
            } else {
                // SQLite PDO
                $sqlitePath = __DIR__ . '/../../database/voting_system.sqlite';
                $dbDir = dirname($sqlitePath);
                if (!is_dir($dbDir)) {
                    mkdir($dbDir, 0777, true);
                }
                $dsn = "sqlite:" . $sqlitePath;
                $this->pdo = new PDO($dsn, null, null, [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
                ]);
                $this->pdo->exec('PRAGMA journal_mode = WAL;');
                $this->pdo->exec('PRAGMA busy_timeout = 5000;');
            }
        } catch (PDOException $e) {
            // Fallback to SQLite if MySQL fails
            $sqlitePath = __DIR__ . '/../../database/voting_system.sqlite';
            $this->pdo = new PDO("sqlite:" . $sqlitePath, null, null, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
            ]);
            $this->pdo->exec('PRAGMA journal_mode = WAL;');
        }
    }

    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new Database();
        }
        return self::$instance->pdo;
    }
}

