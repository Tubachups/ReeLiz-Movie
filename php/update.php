<?php
/**
 * Update Handler
 * Updates existing records in users or transaction tables
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
        // Update user
        $id = isset($data['id']) ? $data['id'] : '';
        $username = isset($data['username']) ? $data['username'] : '';
        $email = isset($data['email']) ? $data['email'] : '';
        $password = isset($data['password']) ? $data['password'] : '';
        
        if (empty($id)) {
            sendResponse('error', 'User ID is required');
        }
        
        if (empty($username) || empty($email)) {
            sendResponse('error', 'Username and email are required');
        }
        
        // Check if username is taken by another user
        $stmt = $pdo->prepare("SELECT id FROM users WHERE username = ? AND id != ?");
        $stmt->execute([$username, $id]);
        if ($stmt->fetch()) {
            sendResponse('error', 'Username already taken by another user');
        }
        
        // Check if email is taken by another user
        $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ? AND id != ?");
        $stmt->execute([$email, $id]);
        if ($stmt->fetch()) {
            sendResponse('error', 'Email already used by another user');
        }
        
        // Update with or without password
        if (!empty($password)) {
            $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
            $stmt = $pdo->prepare("UPDATE users SET username = ?, email = ?, password = ? WHERE id = ?");
            $stmt->execute([$username, $email, $hashedPassword, $id]);
        } else {
            $stmt = $pdo->prepare("UPDATE users SET username = ?, email = ? WHERE id = ?");
            $stmt->execute([$username, $email, $id]);
        }
        
        if ($stmt->rowCount() > 0) {
            sendResponse('success', 'User updated successfully');
        } else {
            sendResponse('error', 'User not found or no changes made');
        }
        
    } elseif ($table === 'transaction') {
        // Update transaction
        $id = isset($data['id']) ? $data['id'] : '';
        $date = isset($data['date']) ? $data['date'] : '';
        $name = isset($data['name']) ? $data['name'] : '';
        $room = isset($data['room']) ? $data['room'] : '';
        $movie = isset($data['movie']) ? $data['movie'] : '';
        $sits = isset($data['sits']) ? $data['sits'] : '';
        $amount = isset($data['amount']) ? $data['amount'] : 0;
        $barcode = isset($data['barcode']) ? $data['barcode'] : '';
        
        if (empty($id)) {
            sendResponse('error', 'Transaction ID is required');
        }
        
        $stmt = $pdo->prepare("UPDATE transaction SET date = ?, name = ?, room = ?, movie = ?, sits = ?, amount = ?, barcode = ? WHERE id = ?");
        $stmt->execute([$date, $name, $room, $movie, $sits, $amount, $barcode, $id]);
        
        if ($stmt->rowCount() > 0) {
            sendResponse('success', 'Transaction updated successfully');
        } else {
            sendResponse('error', 'Transaction not found or no changes made');
        }
        
    } else {
        sendResponse('error', 'Invalid table name');
    }
    
} catch (PDOException $e) {
    sendResponse('error', 'Database error: ' . $e->getMessage());
}
?>
