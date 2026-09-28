<?php

session_start();

if(!isset($_SESSION['cart'])){
    $_SESSION['cart'] = [];
}

?>

<!DOCTYPE html>
<html>

<head>

<title>Your Cart | Mayford Foods</title>

<link rel="stylesheet"
      href="assets/css/style.css">

<style>

table{
    width:100%;
    border-collapse:collapse;
    background:white;
}

table th,
table td{
    padding:15px;
    border:1px solid #ddd;
    text-align:center;
}

.cart-img{
    width:80px;
    height:80px;
    object-fit:cover;
    border-radius:10px;
}

.remove-btn{
    background:red;
    color:white;
    padding:8px 15px;
    text-decoration:none;
    border-radius:5px;
}

.total-box{
    margin-top:30px;
    text-align:right;
    font-size:22px;
    font-weight:bold;
}

</style>

</head>

<body>

<?php include 'includes/header.php'; ?>

<section class="section">

<h2>Your Cart</h2>

<?php

if(empty($_SESSION['cart'])){

    echo "<p style='text-align:center;'>
            Your cart is empty.
          </p>";

}else{

?>

<table>

<tr>

    <th>Image</th>
    <th>Food</th>
    <th>Price</th>
    <th>Quantity</th>
    <th>Subtotal</th>
    <th>Action</th>

</tr>

<?php

$total = 0;

foreach($_SESSION['cart'] as $item){

$subtotal = $item['price'] * $item['quantity'];

$total += $subtotal;

?>

<tr>

<td>

<img src="assets/images/<?php echo $item['image']; ?>"
     class="cart-img">

</td>

<td>

<?php echo $item['food_name']; ?>

</td>

<td>

GH₵ <?php echo number_format($item['price'],2); ?>

</td>

<td>

<?php echo $item['quantity']; ?>

</td>

<td>

GH₵ <?php echo number_format($subtotal,2); ?>

</td>

<td>

<a href="remove-from-cart.php?id=<?php echo $item['id']; ?>"
   class="remove-btn">

   Remove

</a>

</td>

</tr>

<?php } ?>

</table>

<div class="total-box">

Total: GH₵ <?php echo number_format($total,2); ?>

</div>

<br><br>

<div style="text-align:center;">

<a href="checkout.php"
   class="btn">

   Proceed To Checkout

</a>

</div>

<?php } ?>

</section>

</body>

</html>