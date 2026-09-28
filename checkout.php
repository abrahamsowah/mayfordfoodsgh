<?php

session_start();

include 'config/database.php';

if(!isset($_SESSION['cart']) || empty($_SESSION['cart'])){

    header("Location: menu.php");
    exit();

}

if(isset($_POST['submit'])){

    $customer_name = $_POST['customer_name'];
    $phone = $_POST['phone'];
    $outlet = $_POST['outlet'];
    $order_type = $_POST['order_type'];
    $address = $_POST['address'];

    $order_details = "";
    $grand_total = 0;

    foreach($_SESSION['cart'] as $item){

        $subtotal = $item['price'] * $item['quantity'];

        $grand_total += $subtotal;

        $order_details .=
            $item['food_name'] .
            " x " .
            $item['quantity'] .
            " = GH₵" .
            number_format($subtotal,2) .
            "\n";

    }

    mysqli_query(
        $conn,
        "INSERT INTO orders(

            customer_name,
            phone,
            food_item,
            quantity,
            outlet,
            order_type,
            address,
            order_details,
            total

        )

        VALUES(

            '$customer_name',
            '$phone',
            'Multiple Foods',
            '0',
            '$outlet',
            '$order_type',
            '$address',
            '$order_details',
            '$grand_total'

        )"
    );

    if($outlet == "Adabraka"){
        $whatsapp = "233244143271";
    }else{
        $whatsapp = "233533634378";
    }

    $message =

"🍽 NEW MAYFORD FOODS ORDER

Customer: $customer_name

Phone: $phone

Items:

$order_details

Outlet: $outlet

Order Type: $order_type

Address: $address

TOTAL: GH₵$grand_total";

    $message = urlencode($message);

    unset($_SESSION['cart']);

    header(
        "Location:https://wa.me/$whatsapp?text=$message"
    );

    exit();

}

?>

<!DOCTYPE html>
<html>

<head>

<title>Checkout</title>

<link rel="stylesheet"
      href="assets/css/style.css">

</head>

<body>

<?php include 'includes/header.php'; ?>

<section class="section">

<div class="card"
     style="max-width:700px;margin:auto;">

<div class="card-body">

<h2>Checkout</h2>

<form method="POST">

<input type="text"
       name="customer_name"
       placeholder="Your Name"
       required
       style="width:100%;padding:12px;margin:10px 0;">

<input type="text"
       name="phone"
       placeholder="Phone Number"
       required
       style="width:100%;padding:12px;margin:10px 0;">

<select name="outlet"
        required
        style="width:100%;padding:12px;margin:10px 0;">

<option value="">Select Outlet</option>

<option value="Adabraka">
Adabraka
</option>

<option value="Dzorwulu">
Dzorwulu
</option>

</select>

<select name="order_type"
        required
        style="width:100%;padding:12px;margin:10px 0;">

<option value="">Order Type</option>

<option value="Pickup">
Pickup
</option>

<option value="Delivery">
Delivery
</option>

</select>

<textarea
name="address"
placeholder="Delivery Address (if delivery)"
style="width:100%;height:120px;padding:12px;margin:10px 0;">
</textarea>

<button type="submit"
        name="submit"
        class="btn">

Place Order

</button>

</form>

</div>

</div>

</section>

</body>

</html>