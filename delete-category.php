<?php

include '../config/database.php';


$id = $_GET['id'];

mysqli_query(
    $conn,
    "DELETE FROM menu_categories
     WHERE id='$id'"
);

header("Location: view-categories.php");

exit();

?>