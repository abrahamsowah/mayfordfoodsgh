<?php

include 'config/database.php';

$id = $_GET['id'];

$result = mysqli_query(
    $conn,
    "SELECT * FROM menu_items WHERE id='$id'"
);

$food = mysqli_fetch_assoc($result);

if(isset($_POST['submit'])){

    $customer_name = $_POST['customer_name'];
    $phone = $_POST['phone'];
    $quantity = $_POST['quantity'];
    $outlet = $_POST['outlet'];
    $order_type = $_POST['order_type'];
    $address = $_POST['address'];

    $food_item = $food['food_name'];

    $total = $food['price'] * $quantity;

    $order_details =
        $food_item .
        " x " .
        $quantity;

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
            '$food_item',
            '$quantity',
            '$outlet',
            '$order_type',
            '$address',
            '$order_details',
            '$total'
        )"
    );

    if($outlet == "Adabraka"){
        $whatsapp = "233244143271";
    }else{
        $whatsapp = "233533634378";
    }

    $message =
"NEW MAYFORD FOODS ORDER

Customer: $customer_name

Phone: $phone

Food: $food_item

Quantity: $quantity

Outlet: $outlet

Order Type: $order_type

Address: $address

Total: GH₵$total";

    $message = urlencode($message);

    header(
        "Location:https://wa.me/$whatsapp?text=$message"
    );

    exit();

}

?>

<!DOCTYPE html>
<html>

<head>

<title>Place Order</title>

<link rel="stylesheet"
      href="assets/css/style.css">

</head>

<body>

<section class="section">

<div class="card"
     style="max-width:700px;margin:auto;">

<div class="card-body">

<h2>Place Order</h2>

<img src="assets/images/<?php echo $food['image']; ?>"
     style="width:200px;height:200px;object-fit:cover;">

<h3>

<?php echo $food['food_name']; ?>

</h3>

<p>

GH₵ <?php echo $food['price']; ?>

</p>

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

<input type="number"
       name="quantity"
       value="1"
       min="1"
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