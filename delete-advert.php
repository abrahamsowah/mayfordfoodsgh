<?php

session_start();

include '../config/database.php';


$id = $_GET['id'];

mysqli_query(
    $conn,
    "DELETE FROM advertisement_banners
     WHERE id='$id'"
);

header("Location: view-adverts.php");
exit();

?>