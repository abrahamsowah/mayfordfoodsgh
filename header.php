
<!DOCTYPE html>
<html lang="en">

<head>

    <meta charset="UTF-8">

    <meta name="viewport"
          content="width=device-width, initial-scale=1.0">

    <title>Mayford Foods GH</title>

    <link rel="stylesheet"
          href="assets/css/style.css">
<link rel="stylesheet"
href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
</head>

<body>

<header>

    <div class="logo">

        <img src="assets/images/logo.png"
             alt="Mayford Foods Logo">

        <h2>Mayford Foods GH</h2>
</div>

<div class="menu-toggle">
    <i class="fas fa-bars"></i>
</div>

<nav>

        <ul>

           <li><a href="index.php">Home</a></li>

<li>
    <a href="outlets.php">
        Mayford Fast Food Outlets
    </a>
</li>

<li>
    <a href="outlets.php">
        Mayford Locals
    </a>
</li>

<li>
    <a href="about.php">
        About Us
    </a>
</li>

        </ul>

    </nav>

</header>

<div class="marquee">

    <marquee scrollamount="3">

        <?php

        include_once 'config/database.php';
        include 'includes/visitor_counter.php';

        $result = mysqli_query(
            $conn,
            "SELECT * FROM banners ORDER BY id DESC"
        );

        while($row = mysqli_fetch_assoc($result)){

            echo "★ "
                 . $row['banner_text']
                 . " &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ";

        }

        ?>

    </marquee>

</div>


<script>

const menuBtn=document.querySelector(".menu-toggle");
const nav=document.querySelector("nav");

menuBtn.onclick=function(){

    nav.classList.toggle("show");

}

</script>