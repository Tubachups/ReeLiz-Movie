<?php
header('Content-Type: application/json');

// Database configuration
$host = 'localhost';
$dbname = 'reeliz_db';
$username = 'root';
$password = ''; // Default XAMPP password is empty

try {
    // Create PDO connection
    $pdo = new PDO("mysql:host=$host;dbname=$dbname", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Get data from command line arguments
    $email = isset($argv[1]) ? $argv[1] : '';
    $pass = isset($argv[2]) ? $argv[2] : '';
    
    // Validate inputs
    if (empty($email) || empty($pass)) {
        echo json_encode([
            'status' => 'error',
            'message' => 'Email and password are required'
        ]);
        exit;
    }
    
    // Get user by email
    $stmt = $pdo->prepare("SELECT id, username, email, password FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$user) {
        echo json_encode([
            'status' => 'error',
            'message' => 'Invalid credentials'
        ]);
        exit;
    }
    
    // Verify password
    if (password_verify($pass, $user['password'])) {
        echo json_encode([
            'status' => 'success',
            'message' => 'Login successful',
            'user' => [
                'id' => $user['id'],
                'username' => $user['username'],
                'email' => $user['email']
            ]
        ]);
    } else {
        echo json_encode([
            'status' => 'error',
            'message' => 'Invalid credentials'
        ]);
    }
    
} catch (PDOException $e) {
    echo json_encode([
        'status' => 'error',
        'message' => 'Database error: ' . $e->getMessage()
    ]);
}
?>