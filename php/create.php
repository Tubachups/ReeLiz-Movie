<?php
/**
 * Create Handler
 * Handles creating new records for users and transactions
 */
require_once 'db.php';

// Get table and data from command line arguments
$table = isset($argv[1]) ? $argv[1] : '';
$jsonData = isset($argv[2]) ? $argv[2] : '{}';

$data = json_decode($jsonData, true);

if (empty($table)) {
    sendResponse('error', 'Table name is required');
}

$pdo = getDbConnection();
if (!$pdo) {
    sendResponse('error', 'Database connection failed');
}

try {
    if ($table === 'users') {
        // Create new user
        $username = isset($data['username']) ? $data['username'] : '';
        $email = isset($data['email']) ? $data['email'] : '';
        $password = isset($data['password']) ? $data['password'] : '';
        
        if (empty($username) || empty($email) || empty($password)) {
            sendResponse('error', 'Username, email, and password are required');
        }
        
        // Check if email already exists
        $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
        $stmt->execute([$email]);
        if ($stmt->fetch()) {
            sendResponse('error', 'Email already registered');
        }
        
        // Check if username already exists
        $stmt = $pdo->prepare("SELECT id FROM users WHERE username = ?");
        $stmt->execute([$username]);
        if ($stmt->fetch()) {
            sendResponse('error', 'Username already taken');
        }
        
        // Hash password and insert
        $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
        $stmt = $pdo->prepare("INSERT INTO users (username, email, password, created_at) VALUES (?, ?, ?, NOW())");
        $stmt->execute([$username, $email, $hashedPassword]);
        
        sendResponse('success', 'User created successfully', ['id' => $pdo->lastInsertId()]);
        
    } elseif ($table === 'transaction') {
        // Create new transaction
        $date = isset($data['date']) ? $data['date'] : '';
        $name = isset($data['name']) ? $data['name'] : '';
        $room = isset($data['room']) ? $data['room'] : '';
        $movie = isset($data['movie']) ? $data['movie'] : '';
        $sits = isset($data['sits']) ? $data['sits'] : '';
        $amount = isset($data['amount']) ? $data['amount'] : 0;
        $barcode = isset($data['barcode']) ? $data['barcode'] : '';
        
        if (empty($name) || empty($movie)) {
            sendResponse('error', 'Name and movie are required');
        }
        
        $stmt = $pdo->prepare("INSERT INTO transaction (date, name, room, movie, sits, amount, barcode) VALUES (?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([$date, $name, $room, $movie, $sits, $amount, $barcode]);
        
        sendResponse('success', 'Transaction created successfully', ['id' => $pdo->lastInsertId()]);
        
    } else {
        sendResponse('error', 'Invalid table name');
    }
    
} catch (PDOException $e) {
    sendResponse('error', 'Database error: ' . $e->getMessage());
}
?>
