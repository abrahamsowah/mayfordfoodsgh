<?php

include '../config/database.php';



$id = $_GET['id'];

mysqli_query(
    $conn,
    "DELETE FROM menu_items WHERE id='$id'"
);

header("Location: view-menu-items.php");

exit();

?>