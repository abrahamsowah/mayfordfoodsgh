<?php

include '../config/database.php';

$orders = mysqli_num_rows(
    mysqli_query(
        $conn,
        "SELECT * FROM orders
         WHERE notification_status='new'"
    )
);

$applications = mysqli_num_rows(
    mysqli_query(
        $conn,
        "SELECT * FROM training_applications
         WHERE notification_status='new'"
    )
);

$messages = mysqli_num_rows(
    mysqli_query(
        $conn,
        "SELECT * FROM contact_messages
         WHERE notification_status='new'"
    )
);

echo json_encode([
    'orders' => $orders,
    'applications' => $applications,
    'messages' => $messages
]);