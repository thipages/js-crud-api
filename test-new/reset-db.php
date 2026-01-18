<?php
/**
 * Reset de la base de données SQLite pour les tests
 */

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: text/plain');

// Gérer les requêtes OPTIONS (CORS preflight)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$dbPath = __DIR__ . '/var/php-crud-api.sqlite';
$fixturePath = __DIR__ . '/php-crud-tests/fixtures/blog_sqlite.sql';

try {
    // Supprimer la base existante
    if (file_exists($dbPath)) {
        unlink($dbPath);
    }

    // Créer le dossier var si nécessaire
    $varDir = dirname($dbPath);
    if (!is_dir($varDir)) {
        mkdir($varDir, 0777, true);
    }

    // Vérifier que la fixture existe
    if (!file_exists($fixturePath)) {
        throw new Exception("Fixture SQL introuvable: $fixturePath");
    }

    // Lire le SQL de la fixture
    $sql = file_get_contents($fixturePath);
    if ($sql === false) {
        throw new Exception("Impossible de lire la fixture SQL");
    }

    // Exécuter le SQL avec sqlite3
    $command = sprintf('sqlite3 %s', escapeshellarg($dbPath));
    $descriptors = [
        0 => ['pipe', 'r'],  // stdin
        1 => ['pipe', 'w'],  // stdout
        2 => ['pipe', 'w'],  // stderr
    ];

    $process = proc_open($command, $descriptors, $pipes);
    if (!is_resource($process)) {
        throw new Exception("Impossible de démarrer sqlite3");
    }

    // Envoyer le SQL
    fwrite($pipes[0], $sql);
    fclose($pipes[0]);

    // Lire la sortie
    $stdout = stream_get_contents($pipes[1]);
    $stderr = stream_get_contents($pipes[2]);
    fclose($pipes[1]);
    fclose($pipes[2]);

    $exitCode = proc_close($process);

    if ($exitCode !== 0) {
        throw new Exception("Erreur sqlite3 (code $exitCode): $stderr");
    }

    // Vérifier que la base a été créée
    if (!file_exists($dbPath)) {
        throw new Exception("La base n'a pas été créée");
    }

    echo "✅ Base de données réinitialisée avec succès\n";
    echo "📁 Fichier: $dbPath\n";
    echo "📊 Taille: " . filesize($dbPath) . " octets\n";

} catch (Exception $e) {
    http_response_code(500);
    echo "❌ Erreur: " . $e->getMessage() . "\n";
}
