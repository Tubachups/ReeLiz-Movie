<?php
// Get command line arguments
$args = array_slice($argv, 1);

// Return JSON response
$response = [
    'status' => 'success',
    'message' => 'Hello from PHP!',
    'args' => $args,
    'timestamp' => date('Y-m-d H:i:s')
];

echo json_encode($response);
?>
