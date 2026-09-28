<?php

include 'config/database.php';

$full_name = $_POST['full_name'];
$phone = $_POST['phone'];
$email = $_POST['email'];
$training_school = $_POST['training_school'];
$program = $_POST['program'];
$message = $_POST['message'];

mysqli_query(
    $conn,
    "INSERT INTO training_applications
    (
        full_name,
        phone,
        email,
        training_school,
        program,
        message
    )
    VALUES
    (
        '$full_name',
        '$phone',
        '$email',
        '$training_school',
        '$program',
        '$message'
    )"
);

header("Location: training.php?success=1");
exit();

?>