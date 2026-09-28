<?php

session_start();

include '../config/database.php';

if(isset($_GET['id'])){

    $id = (int)$_GET['id'];

    mysqli_query(
        $conn,
        "DELETE FROM contact_messages
         WHERE id = $id"
    );
}

header("Location: view-contact-messages.php");
exit();