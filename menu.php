<?php

include 'config/database.php';

?>
<!DOCTYPE html>
<html lang="en">

<head>

    <!-- Character Encoding -->
    <meta charset="UTF-8">

    <!-- Mobile Responsive -->
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <!-- Page Title -->
    <title>Mayford Foods Menu</title>

    <!-- CSS File -->
    <link rel="stylesheet" href="assets/css/style.css">

</head>

<body>

<!-- =========================================
     HEADER SECTION
========================================= -->

<header>

    <div class="logo">
        <img src="assets/images/logo.png" alt="Mayford Foods Logo">
        <h2>Mayford Foods</h2>
    </div>

    <nav>
        <ul>

            <li><a href="index.php">Home</a></li>
            <li><a href="menu.php">Menu</a></li>
            <li><a href="outlets.php">Outlets</a></li>
            <li><a href="catering.php">Catering</a></li>
            <li><a href="community.php">Community</a></li>
            <li><a href="training.php">Training</a></li>

        </ul>
    </nav>

</header>

<!-- =========================================
     PAGE TITLE
========================================= -->

<section class="section">
    <h2>Our Menu</h2>
  
<div style="text-align:right; margin-bottom:20px;">

<a href="cart.php" class="btn">

🛒 Cart
(
<?php

session_start();

if(isset($_SESSION['cart'])){
    echo count($_SESSION['cart']);
}else{
    echo 0;
}

?>
)

</a>

</div>


<p style="text-align:center;font-size:18px;">
Fresh Ghanaian & Continental Meals Served Daily
</p>

<h2>Available Foods</h2>

<div class="cards">

<?php

$result = mysqli_query(
    $conn,
    "SELECT * FROM menu_items
     WHERE status='available'
     ORDER BY id DESC"
);

while($row = mysqli_fetch_assoc($result)){

?>

<div class="card">

<img src="assets/images/<?php echo $row['image']; ?>"
     alt="<?php echo $row['food_name']; ?>">

<div class="card-body">

<h3>
<?php echo $row['food_name']; ?>
</h3>

<p>
<?php echo $row['description']; ?>
</p>

<?php

$price = $row['price'];
$discount = $row['discount_percent'];

if($discount > 0){

    $new_price = $price - ($price * $discount / 100);

?>

<p>

<del>
GH₵ <?php echo number_format($price,2); ?>
</del>

<br>

<strong style="color:red;">
GH₵ <?php echo number_format($new_price,2); ?>
</strong>

<br>

<span style="color:green;">
<?php echo $discount; ?>% OFF
</span>

</p>

<?php

}else{

?>

<strong>
GH₵ <?php echo number_format($price,2); ?>
</strong>

<?php } ?>
<a href="add-to-cart.php?id=<?php echo $row['id']; ?>"
   class="btn">

   Add To Cart

</a>

</div>

</div>

<?php } ?>

</div>

</section>

<!-- =========================================
     ORDER NOW SECTION
========================================= -->

<section class="section">

    <h2>Order Now</h2>

    <p style="text-align:center;font-size:18px;">

        Place your order through WhatsApp.

    </p>

    <div style="text-align:center;">

        <a href="https://wa.me/233244143271"
           target="_blank"
           class="btn">

            Order via WhatsApp

        </a>

    </div>

</section>

<!-- =========================================
     FOOTER
========================================= -->

<footer>

    <p>

        © <?php echo date('Y'); ?>
        Mayford Foods GH.
        All Rights Reserved.

    </p>

</footer>

</body>

</html>

