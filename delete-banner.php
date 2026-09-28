<?php

session_start();

if(!isset($_SESSION['admin_id'])){
    header("Location: login.php");
    exit();
}

include '../config/database.php';


$id = (int)$_GET['id'];

mysqli_query(
    $conn,
    "DELETE FROM banners
     WHERE id=$id"
);

header("Location: view-banners.php");
exit();

?>