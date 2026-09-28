<?php

include 'config/database.php';

$settings_query = mysqli_query(
    $conn,
    "SELECT * FROM website_settings LIMIT 1"
);

$settings = mysqli_fetch_assoc(
    $settings_query
);


if(!isset($_COOKIE['mayford_visitor'])){

    mysqli_query(
        $conn,
        "UPDATE visitor_counter
         SET total_visitors = total_visitors + 1
         WHERE id = 1"
    );

    setcookie(
        'mayford_visitor',
        'counted',
        time() + (60 * 60 * 24),
        '/'
    );
}
include 'includes/header.php';

?>

<?php

$adverts = mysqli_query(
    $conn,
    "SELECT * FROM advertisement_banners
     WHERE status='Active'
     ORDER BY id DESC"
);

?>
<!-- =========================================
     HERO SECTION
========================================= -->

<section class="hero">

<!-- Background Slider -->
<div class="hero-slider">

    <?php

    $result = mysqli_query(
        $conn,
        "SELECT * FROM slider_images
         ORDER BY id DESC"
    );

    $first = true;

    while($row = mysqli_fetch_assoc($result)){

    ?>

    <img
        src="assets/images/<?php echo $row['image']; ?>"
        class="slide <?php echo $first ? 'active' : ''; ?>"
        alt="Mayford Foods">

    <?php

        $first = false;

    }

    ?>

</div>


<!-- HERO CONTENT + ADVERTISEMENT -->

<div class="hero-layout">


    <!-- WELCOME CONTENT -->

    <div class="hero-content">

        <h1>
            Welcome To Mayford Foods GH
        </h1>

        <p>
            Delicious Ghanaian & Continental Meals,
            Outside Catering Services,
            Community Outreach and Professional Training.
        </p>

        <div class="hero-buttons">

            <a href="menu-access.php" class="btn">
                🍽️ View Menu
            </a>

            <a href="outlets.php" class="btn">
                🏪 Our Outlets
            </a>

            <a href="training.php" class="btn btn-training">
                🎓 Training Academy
            </a>

            <a href="community.php" class="btn btn-community">
                ❤️ Community Impact
            </a>

            <a href="catering.php" class="btn btn-catering">
                🍲 Outside Catering
            </a>

        </div>

    </div>


    <!-- ADVERTISEMENT -->

    <div class="hero-advert">

        <?php

        $adverts = mysqli_query(
            $conn,
            "SELECT * FROM advertisement_banners
             WHERE status='Active'
             ORDER BY id DESC"
        );

        $firstAdvert = true;

        while($advert = mysqli_fetch_assoc($adverts)){

        ?>

        <div class="advert-slide <?php echo $firstAdvert ? 'active-slide' : ''; ?>">


            <!-- ADVERTISEMENT TEXT -->

            <div class="advert-text-card">

                <span class="offer-badge">
                    SPECIAL OFFER
                </span>

                <h2>
                    <?php echo htmlspecialchars($advert['title']); ?>
                </h2>

                <p>
                    <?php echo htmlspecialchars($advert['description']); ?>
                </p>

                <a
                    href="<?php echo htmlspecialchars($advert['button_link']); ?>"
                    class="advert-btn">

                    <?php echo htmlspecialchars($advert['button_text']); ?>

                </a>

            </div>


            <!-- ADVERTISEMENT IMAGE -->

            <div class="advert-image">

                <img
                    src="assets/adverts/<?php echo htmlspecialchars($advert['banner_image']); ?>"
                    alt="Mayford Foods Advertisement">

            </div>


        </div>

        <?php

            $firstAdvert = false;

        }

        ?>

    </div>


</div>
```

</section>
<!-- =========================================
     END HERO SECTION
========================================= -->


<!-- =========================================
     FEATURED MEALS
========================================= -->

<section class="section">

    <h2>Featured Meals</h2>

    <div class="cards">

        <div class="card">
            <img src="assets/images/jollof.png" alt="Jollof Rice">
            <div class="card-body">
                <h3>Jollof Rice</h3>
                <p>Freshly prepared and served daily.</p>
            </div>
        </div>

        <div class="card">
            <img src="assets/images/fufu.jpeg" alt="Fufu">
            <div class="card-body">
                <h3>Fufu & Soup</h3>
                <p>Traditional Ghanaian delicacy.</p>
            </div>
        </div>

        <div class="card">
            <img src="assets/images/friedyam.jpg" alt="Fried Yam">
            <div class="card-body">
                <h3>Fried Yam</h3>
                <p>Crispy fried yam with pepper sauce.</p>
            </div>
        </div>

    </div>

</section>


<?php

$videos = mysqli_query(
    $conn,
    "SELECT * FROM advertisement_videos
     ORDER BY id DESC"
);

?>

<section class="section">

    <h2>Latest Advertisements</h2>

    <div class="advert-container">

        <?php while($video = mysqli_fetch_assoc($videos)){ ?>

        <div class="advert-card">

            <video class="advert-video" controls>

                <source
                    src="assets/videos/<?php echo $video['video_name']; ?>"
                    type="video/mp4">

            </video>

        </div>

        <?php } ?>

    </div>

</section>
<!-- =========================================
     OUTSIDE CATERING
========================================= -->

<section class="section">

    <h2>Outside Catering Services</h2>


<div class="cards">

    <div class="card">
        <img src="assets/images/outsidecater1.jpeg" alt="">
    </div>

    <div class="card">
        <img src="assets/images/outsidecater4.jpeg" alt="">
    </div>

    <div class="card">
        <img src="assets/images/outsidecater7.jpeg" alt="">
    </div>

</div>

<div style="text-align:center;margin-top:20px;">

    <p>
        Professional catering services for weddings,
        funerals, birthdays and corporate events.
    </p>

    <a href="catering.php" class="btn">
        View More
    </a>

</div>


        

    </div>

</section>

<!-- =========================================
     COMMUNITY IMPACT
========================================= -->

<section class="section">

    <h2>Community Impact</h2>

    <p style="text-align:center;margin-bottom:30px;">

        Mayford Foods believes in giving back to society through
        food donations, outreach programs and community support.

    </p>

    <div class="cards">

        <div class="card">

            <video controls>

                <source src="assets/videos/needyvideo1.mp4"
                        type="video/mp4">

            </video>

        </div>

        <div class="card">

            <video controls>

                <source src="assets/videos/needyvideo2.mp4"
                        type="video/mp4">

            </video>

        </div>

        <div class="card">

            <video controls>

                <source src="assets/videos/needyvideo3.mp4"
                        type="video/mp4">

            </video>

        </div>

    </div>

    <div style="text-align:center;margin-top:25px;">

        <a href="community.php"
           class="btn">

           View Community Activities

        </a>

    </div>

</section>

<!-- =========================================
     OUR OUTLETS
========================================= -->

<section class="section">

    <h2>Our Outlets</h2>

    <div class="cards">

        <div class="card">

            <img src="assets/images/adabraka.webp"
                 alt="Adabraka Outlet">

            <div class="card-body">

                <h3>Adabraka Outlet</h3>

               <p>
    Open Daily |
    <?php echo $settings['opening_hours']; ?>
</p>

<p>
    <?php echo $settings['adabraka_phone']; ?>
</p>

            </div>
            
<a href="https://maps.app.goo.gl/2ppyyaRxGfyJE4CM7"
   target="_blank"
   class="btn">

   Get Directions

</a>



        </div>

        <div class="card">

            <img src="assets/images/dzorwulu.jpeg"
                 alt="Dzorwulu outlet">

            <div class="card-body">

                <h3>Dzorwulu Outlet</h3>

                <p>
                  Open Daily |
                   <?php echo $settings['opening_hours']; ?>
                 </p>

                <p>
                <?php echo $settings['dzorwulu_phone']; ?>
                </p>

            </div>

<a href="https://maps.app.goo.gl/gmKTiQe96npfgTDN7"
   target="_blank"
   class="btn">

   Get Directions

</a>


        </div>

    </div>

</section>

<!-- =========================================
     TRAINING PROGRAM
========================================= -->

<section class="section">

    <h2>Training Program</h2>

    <div class="community-box">

            <p>

                Mayford Foods offers practical food preparation
                and catering training opportunities.

            </p>

            <a href="training.php"
               class="btn">

               Learn More

            </a>

    

    </div>

</section>

<!-- =========================================
     OWNERS SECTION
========================================= -->

<section class="section">

    <h2>Meet The Owners</h2>

    <div class="owners-card">

        <img src="assets/images/ownersofmayford.jpeg"
             alt="Owners"
             class="owners-img">

        <div class="card-body">

            <p>

                Dedicated to serving quality meals and supporting
                communities through food and training initiatives.

            </p>

        </div>

    </div>

</section>


<script>

const adverts =
document.querySelectorAll('.homepage-advert');

let advertIndex = 0;

setInterval(() => {

    adverts[advertIndex]
    .classList.remove('active-advert');

    advertIndex++;

    if(advertIndex >= adverts.length){

        advertIndex = 0;

    }

    adverts[advertIndex]
    .classList.add('active-advert');

}, 7000);

</script>
<script>

const advertSlides =
document.querySelectorAll('.advert-slide');

let currentAdvert = 0;

setInterval(() => {

    advertSlides[currentAdvert]
    .classList.remove('active-slide');

    currentAdvert++;

    if(currentAdvert >= advertSlides.length){
        currentAdvert = 0;
    }

    advertSlides[currentAdvert]
    .classList.add('active-slide');

}, 7000);

</script>

<script>

const slides = document.querySelectorAll('.slide');

let currentSlide = 0;

setInterval(() => {

    slides[currentSlide].classList.remove('active');

    currentSlide++;

    if(currentSlide >= slides.length){
        currentSlide = 0;
    }

    slides[currentSlide].classList.add('active');

}, 5000);

</script>
<?php include 'includes/footer.php'; ?>
