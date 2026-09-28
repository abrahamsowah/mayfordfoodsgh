<?php

session_start();

include 'config/database.php';

$id = $_GET['id'];

$result = mysqli_query(
    $conn,
    "SELECT * FROM menu_items WHERE id='$id'"
);

$item = mysqli_fetch_assoc($result);

if(!isset($_SESSION['cart'])){
    $_SESSION['cart'] = [];
}

if(isset($_SESSION['cart'][$id])){

    $_SESSION['cart'][$id]['quantity']++;

}else{

    $_SESSION['cart'][$id] = [

        'id' => $item['id'],
        'food_name' => $item['food_name'],
        'price' => $item['price'],
        'image' => $item['image'],
        'quantity' => 1

    ];

}

header("Location: menu.php");
exit();

?>