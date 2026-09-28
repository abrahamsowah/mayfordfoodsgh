<?php

include '../config/database.php';



$id = $_GET['id'];

mysqli_query(
    $conn,
    "DELETE FROM community_media
     WHERE id='$id'"
);

header("Location:view-community.php");
exit();