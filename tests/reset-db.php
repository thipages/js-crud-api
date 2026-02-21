<?php
/**
 * Reset de la base de données SQLite pour les tests
 */

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: text/plain');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$dbPath = __DIR__ . '/var/php-crud-api.sqlite';
$fixturePath = __DIR__ . '/php-crud-tests/fixtures/blog_sqlite.sql';

try {
    if (!file_exists($fixturePath)) {
        throw new Exception("Fixture introuvable: $fixturePath");
    }

    // Supprimer les fichiers de verrouillage orphelins (Windows)
    foreach (['-wal', '-shm', '-journal'] as $suffix) {
        $lockFile = $dbPath . $suffix;
        if (file_exists($lockFile)) {
            @unlink($lockFile);
        }
    }

    // Supprimer et recréer la base
    if (file_exists($dbPath)) {
        // Fermer toute connexion PDO résiduelle
        if (function_exists('gc_collect_cycles')) {
            gc_collect_cycles();
        }
        if (!@unlink($dbPath)) {
            // Si unlink échoue, essayer via PDO en place
            $pdo = new PDO("sqlite:$dbPath");
            $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $pdo->exec('PRAGMA busy_timeout = 5000');
            $pdo->exec('PRAGMA foreign_keys = OFF');

            $sql = file_get_contents($fixturePath);
            $pdo->exec($sql);
            $pdo->exec('PRAGMA foreign_keys = ON');
            $pdo = null;

            echo "OK - Reset en place (" . filesize($dbPath) . " octets)\n";
            exit;
        }
    }

    // Créer le dossier var si nécessaire
    $varDir = dirname($dbPath);
    if (!is_dir($varDir)) {
        mkdir($varDir, 0777, true);
    }

    // Créer la base depuis zéro
    $pdo = new PDO("sqlite:$dbPath");
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $sql = file_get_contents($fixturePath);
    $pdo->exec($sql);
    $pdo = null;

    echo "OK - Base créée (" . filesize($dbPath) . " octets)\n";

} catch (Exception $e) {
    http_response_code(500);
    echo "Erreur: " . $e->getMessage() . "\n";
}
