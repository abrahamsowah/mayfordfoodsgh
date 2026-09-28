<?php

include 'config/database.php';

if($_SERVER['REQUEST_METHOD'] == 'POST'){

    $customer_name =
    mysqli_real_escape_string(
        $conn,
        $_POST['customer_name']
    );

    $phone =
    mysqli_real_escape_string(
        $conn,
        $_POST['phone']
    );

    $service_type =
    mysqli_real_escape_string(
        $conn,
        $_POST['service_type']
    );

    $rating =
    (int)$_POST['rating'];

    $comment =
    mysqli_real_escape_string(
        $conn,
        $_POST['comment']
    );

    $sql = "

        INSERT INTO ratings(

            customer_name,
            phone,
            service_type,
            rating,
            comment

        )

        VALUES(

            '$customer_name',
            '$phone',
            '$service_type',
            '$rating',
            '$comment'

        )

    ";

    if(mysqli_query($conn, $sql)){

        header(
            'Location: index.php?rating=success'
        );

        exit();

    }else{

        echo 'Error: '
        . mysqli_error($conn);

    }

}

?>