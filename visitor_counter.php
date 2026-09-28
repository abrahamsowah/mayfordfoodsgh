<?php

if (!isset($_SESSION)) {
    session_start();
}

if (!isset($_SESSION['visitor_counted'])) {

    mysqli_query(
        $conn,
        "UPDATE visitor_counter
         SET total_visitors = total_visitors + 1
         WHERE id = 1"
    );

    $_SESSION['visitor_counted'] = true;
}
?>