<?php
/**
 * Database Connection Handler
 * Connects to the reeliz_db database
 */
header('Content-Type: application/json');

// Database configuration
$host = 'localhost';
$dbname = 'reeliz_db';
$username = 'root';
$password = ''; // Default XAMPP password is empty

/**
 * Get PDO database connection
 * @return PDO|null
 */
function getDbConnection() {
    global $host, $dbname, $username, $password;
    
    try {
        $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
        return $pdo;
    } catch (PDOException $e) {
        return null;
    }
}

/**
 * Send JSON response
 * @param string $status 'success' or 'error'
 * @param string $message Response message
 * @param array|null $data Optional data array
 */
function sendResponse($status, $message, $data = null) {
    $response = [
        'status' => $status,
        'message' => $message
    ];
    
    if ($data !== null) {
        $response['data'] = $data;
    }
    
    echo json_encode($response);
    exit;
}

// Test connection if called directly
if (basename(__FILE__) == basename($_SERVER['SCRIPT_FILENAME'])) {
    $pdo = getDbConnection();
    if ($pdo) {
        sendResponse('success', 'Database connection successful');
    } else {
        sendResponse('error', 'Database connection failed');
    }
}
?>
