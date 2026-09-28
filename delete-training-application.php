<?php

include '../config/database.php';

$id = (int)$_GET['id'];

mysqli_query(
    $conn,
    "DELETE FROM training_applications
     WHERE id = $id"
);

header("Location: view-training-applications.php");
exit();