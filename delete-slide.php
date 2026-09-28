<?php

include '../config/database.php';


$id = $_GET['id'];

mysqli_query(
    $conn,
    "DELETE FROM slider_images
     WHERE id='$id'"
);

header("Location:view-slides.php");