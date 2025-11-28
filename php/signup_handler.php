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
    
    // Validate password length
    if (strlen($pass) < 4) {
        echo json_encode([
            'status' => 'error',
            'message' => 'Password must be at least 4 characters'
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
    
    // Find the lowest available ID
    $stmt = $pdo->query("SELECT id FROM users ORDER BY id");
    $existingIds = $stmt->fetchAll(PDO::FETCH_COLUMN);
    $newId = 1;
    foreach ($existingIds as $id) {
        if ($id == $newId) {
            $newId++;
        } else {
            break;
        }
    }
    
    // Insert new user with specific ID
    $stmt = $pdo->prepare("INSERT INTO users (id, username, email, password, created_at) VALUES (?, ?, ?, ?, NOW())");
    $stmt->execute([$newId, $user, $email, $hashedPassword]);
    
    echo json_encode([
        'status' => 'success',
        'message' => 'User registered successfully',
        'user_id' => $newId
    ]);
    
} catch (PDOException $e) {
    echo json_encode([
        'status' => 'error',
        'message' => 'Database error: ' . $e->getMessage()
    ]);
}
?>