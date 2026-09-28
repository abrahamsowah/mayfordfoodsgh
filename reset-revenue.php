<?php

session_start();

include '../config/database.php';


if($_SESSION['role'] != 'super_admin'){
    die("Access Denied");
}

mysqli_query($conn, "TRUNCATE TABLE orders");

header("Location: dashboard.php");
exit();

?>