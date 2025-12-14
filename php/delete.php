<?php
/**
 * Delete Handler
 * Deletes records from users or transaction tables after confirmation
 */
require_once 'db.php';

// Get table and ID from command line arguments
$table = isset($argv[1]) ? $argv[1] : '';
$id = isset($argv[2]) ? $argv[2] : '';

if (empty($table)) {
    sendResponse('error', 'Table name is required');
}

if (empty($id)) {
    sendResponse('error', 'Record ID is required');
}

$pdo = getDbConnection();
if (!$pdo) {
    sendResponse('error', 'Database connection failed');
}

try {
    if ($table === 'users') {
        // Check if user exists
        $stmt = $pdo->prepare("SELECT id, username, email, created_at FROM users WHERE id = ?");
        $stmt->execute([$id]);
        $user = $stmt->fetch();
        
        if (!$user) {
            sendResponse('error', 'User not found');
        }
        
        // Move user to archive_users table
        $insertStmt = $pdo->prepare("INSERT INTO archive_users (id, username, email, created_at) VALUES (?, ?, ?, ?)");
        $insertStmt->execute([
            $user['id'],
            $user['username'],
            $user['email'],
            $user['created_at']
        ]);
        
        // Delete from users table
        $stmt = $pdo->prepare("DELETE FROM users WHERE id = ?");
        $stmt->execute([$id]);
        
        sendResponse('success', 'User "' . $user['username'] . '" archived successfully');
        
    } elseif ($table === 'transaction') {
        // Check if transaction exists
        $stmt = $pdo->prepare("SELECT id, date, name, room, movie, sits, amount, barcode, remarks FROM transaction WHERE id = ?");
        $stmt->execute([$id]);
        $transaction = $stmt->fetch();
        
        if (!$transaction) {
            sendResponse('error', 'Transaction not found');
        }
        
        // Move transaction to archive table with "Archived" status
        $insertStmt = $pdo->prepare("INSERT INTO archive (id, date, name, room, movie, sits, amount, barcode, remarks) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $insertStmt->execute([
            $transaction['id'],
            $transaction['date'],
            $transaction['name'],
            $transaction['room'],
            $transaction['movie'],
            $transaction['sits'],
            $transaction['amount'],
            $transaction['barcode'],
            'Archived'
        ]);
        
        // Delete from transaction table
        $stmt = $pdo->prepare("DELETE FROM transaction WHERE id = ?");
        $stmt->execute([$id]);
        
        sendResponse('success', 'Transaction #' . $id . ' archived successfully');
        
    } else {
        sendResponse('error', 'Invalid table name. Use "users" or "transaction"');
    }
    
} catch (PDOException $e) {
    sendResponse('error', 'Database error: ' . $e->getMessage());
}
?>
