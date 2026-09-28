<?php

include 'config/database.php';


$settings = mysqli_fetch_assoc(
    mysqli_query(
        $conn,
        "SELECT * FROM website_settings WHERE id=1"
    )
);

?>

<!DOCTYPE html>
<html lang="en">

<head>

    <meta charset="UTF-8">

    <meta name="viewport"
          content="width=device-width, initial-scale=1.0">

    <title>Our Outlets | Mayford Foods GH</title>

    <link rel="stylesheet"
          href="assets/css/style.css">

</head>

<body>

<!-- =========================================
     HEADER SECTION
========================================= -->

<header>

    <div class="logo">

        <img src="assets/images/logo.png"
             alt="Mayford Foods Logo">

        <h2>Mayford Foods</h2>

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

<!-- =========================================
     PAGE HEADING
========================================= -->

<section class="hero-small">

    <img src="assets/images/hero.png"
         alt="Mayford Foods">

    <div class="hero-small-content">

        <h1>Our Outlets</h1>

        <p>
            Visit any Mayford Foods branch near you
            for fresh and delicious meals.
        </p>

    </div>

</section>

<!-- =========================================
     OUTLETS SECTION
========================================= -->

<section class="section">

    <div class="cards">

        <!-- ADABRAKA BRANCH -->

        <div class="card">

            <img src="assets/images/adabraka.webp"
                 alt="Mayford Foods Adabraka">

            <div class="card-body">

                <h3>Mayford Locals </h3>
                     <h3>Adabraka</h3>
                <p>Open Daily</p>

                <p>
                    <?php echo $settings['opening_hours']; ?>
                </p>

                <p>
                    WhatsApp:
                    <?php echo $settings['adabraka_phone']; ?>
                </p>

                <a href="https://maps.app.goo.gl/2ppyyaRxGfyJE4CM7"
                   target="_blank"
                   class="btn">

                   Get Directions

                </a>

                <a href="https://food.bolt.eu/en/137-accra/p/13427-mayford-restaurant-adabraka/"
                   target="_blank"
                   class="btn">

                   Bolt Food

                </a>

            </div>

        </div>

        <!-- DZORWULU BRANCH -->

        <div class="card">

            <img src="assets/images/dzorwulu.jpeg"
                 alt="Mayford Foods Dzorwulu">

            <div class="card-body">

                <h3>Mayford Fast Food Outlet</h3>
                  <h3>Dzorwulu</h3>

                <p>Open Daily</p>

                <p>
                    <?php echo $settings['opening_hours']; ?>
                </p>

                <p>
                    WhatsApp:
                    <?php echo $settings['dzorwulu_phone']; ?>
                </p>

                <a href="https://maps.app.goo.gl/gmKTiQe96npfgTDN7"
                   target="_blank"
                   class="btn">

                   Get Directions

                </a>

                <a href="https://food.bolt.eu/en/137-accra/p/13426-mayford-fast-food-dzorwulu/"
                   target="_blank"
                   class="btn">

                   Bolt Food

                </a>

            </div>

        </div>

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