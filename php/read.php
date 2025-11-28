<?php
/**
 * Read Handler
 * Displays all records from users or transaction tables
 */
require_once 'db.php';

// Get table name from command line argument
$table = isset($argv[1]) ? $argv[1] : '';

if (empty($table)) {
    sendResponse('error', 'Table name is required');
}

$pdo = getDbConnection();
if (!$pdo) {
    sendResponse('error', 'Database connection failed');
}

try {
    if ($table === 'users') {
        // Read all users (excluding password for security)
        $stmt = $pdo->prepare("SELECT id, username, email, created_at FROM users ORDER BY id DESC");
        $stmt->execute();
        $users = $stmt->fetchAll();
        
        sendResponse('success', 'Users retrieved successfully', $users);
        
    } elseif ($table === 'transaction') {
        // Read all transactions
        $stmt = $pdo->prepare("SELECT id, date, name, room, movie, sits, amount, barcode FROM transaction ORDER BY id DESC");
        $stmt->execute();
        $transactions = $stmt->fetchAll();
        
        sendResponse('success', 'Transactions retrieved successfully', $transactions);
        
    } else {
        sendResponse('error', 'Invalid table name. Use "users" or "transaction"');
    }
    
} catch (PDOException $e) {
    sendResponse('error', 'Database error: ' . $e->getMessage());
}
?>
