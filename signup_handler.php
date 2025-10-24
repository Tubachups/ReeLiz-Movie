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
    $user = isset($argv[1]) ? $argv[1] : '';
    $email = isset($argv[2]) ? $argv[2] : '';
    $pass = isset($argv[3]) ? $argv[3] : '';
    
    // Validate inputs
    if (empty($user) || empty($email) || empty($pass)) {
        echo json_encode([
            'status' => 'error',
            'message' => 'All fields are required'
        ]);
        exit;
    }
    
    // Check if email already exists
    $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
    $stmt->execute([$email]);
    
    if ($stmt->fetch()) {
        echo json_encode([
            'status' => 'error',
            'message' => 'Email already registered'
        ]);
        exit;
    }
    
    // Check if username already exists
    $stmt = $pdo->prepare("SELECT id FROM users WHERE username = ?");
    $stmt->execute([$user]);
    
    if ($stmt->fetch()) {
        echo json_encode([
            'status' => 'error',
            'message' => 'Username already taken'
        ]);
        exit;
    }
    
    // Hash password
    $hashedPassword = password_hash($pass, PASSWORD_DEFAULT);
    
    // Insert new user
    $stmt = $pdo->prepare("INSERT INTO users (username, email, password, created_at) VALUES (?, ?, ?, NOW())");
    $stmt->execute([$user, $email, $hashedPassword]);
    
    echo json_encode([
        'status' => 'success',
        'message' => 'User registered successfully',
        'user_id' => $pdo->lastInsertId()
    ]);
    
} catch (PDOException $e) {
    echo json_encode([
        'status' => 'error',
        'message' => 'Database error: ' . $e->getMessage()
    ]);
}
?>