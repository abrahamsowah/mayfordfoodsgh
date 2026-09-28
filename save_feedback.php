<?php

include 'config/database.php';

$fullname = mysqli_real_escape_string(
    $conn,
    $_POST['fullname']
);

$phone = mysqli_real_escape_string(
    $conn,
    $_POST['phone']
);

$type = mysqli_real_escape_string(
    $conn,
    $_POST['type']
);

$message = mysqli_real_escape_string(
    $conn,
    $_POST['message']
);

mysqli_query(
    $conn,
    "INSERT INTO contact_messages
    (
        full_name,
        email,
        subject,
        message
    )
    VALUES
    (
        '$fullname',
        '$phone',
        '$type',
        '$message'
    )"
);

header("Location: index.php?feedback=success");
exit();

?>