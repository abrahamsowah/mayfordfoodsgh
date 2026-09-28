
<!DOCTYPE html>
<html lang="en">

<head>

    <meta charset="UTF-8">

    <meta name="viewport"
          content="width=device-width, initial-scale=1.0">

    <title>Community Impact | Mayford Foods GH</title>

    <link rel="stylesheet" href="assets/css/style.css?v=<?php echo time(); ?>">

</head>

<body>

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
     COMMUNITY HERO
========================================= -->

<section class="hero-small">

    <img src="assets/images/community1.png"
         alt="Community Impact">

    <div class="hero-small-content">

        <h1>Community Impact</h1>

        <p>

            Supporting lives, sharing hope and
            giving back to communities through
            outreach programs and food donations.

        </p>

    </div>

</section>

<!-- =========================================
     COMMUNITY INTRODUCTION
========================================= -->

<section class="section">

    <div class="community-box">

        <h2>Giving Back To Society</h2>

        <p>

            At Mayford Foods, our mission extends beyond
            serving delicious meals. We are committed to
            supporting vulnerable individuals, families
            and communities through food donations,
            outreach programs and acts of kindness.

        </p>

    </div>

</section>


<!-- =========================================
     COMMUNITY MEDIA FROM DATABASE
========================================= -->

<?php

include 'config/database.php';

$result = mysqli_query(
    $conn,
    "SELECT * FROM community_media
     ORDER BY id DESC"
);

?>

<section class="section">

    <h2>Community Activities</h2>

    <div class="cards">

    <?php while($row = mysqli_fetch_assoc($result)){ ?>

        <div class="card">

            <?php if($row['media_type'] == 'image'){ ?>

                <img
                src="assets/community/<?php echo $row['file_name']; ?>"
                alt="Community Impact">

            <?php } else { ?>

                <video controls>

                    <source
                    src="assets/community/<?php echo $row['file_name']; ?>">

                </video>

            <?php } ?>

        </div>

    <?php } ?>

    </div>

</section>
<!-- =========================================
     OUR IMPACT
========================================= -->

<section class="section">

    <div class="community-box">

        <h2>Our Impact</h2>

        <p>

            Through food donations, outreach initiatives
            and community support activities, Mayford Foods
            continues to touch lives and contribute
            positively to society.

        </p>

        <p>

            We believe every act of kindness creates a
            stronger, healthier and more united community.

        </p>

    </div>

</section>

<!-- =========================================
     CONTACT SECTION
========================================= -->

<section class="section">

    <div class="community-box">

        <h2>Partner With Us</h2>

        <p>

            Interested in supporting our community
            outreach activities or partnering with us?

        </p>

        <br>

        <a href="https://wa.me/233244143271"
           target="_blank"
           class="btn">

           Contact Us

        </a>

    </div>

</section>

<footer>

    <p>

        © <?php echo date('Y'); ?>

        Mayford Foods GH.

        All Rights Reserved.

    </p>

</footer>

</body>

</html>
