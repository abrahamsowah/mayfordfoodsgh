<?php

include '../config/database.php';

if(isset($_GET['id'])){

    $id = (int)$_GET['id'];

    mysqli_query(
        $conn,
        "DELETE FROM ratings
         WHERE id = $id"
    );

}

header(
    "Location: view-ratings.php"
);

exit();

?>