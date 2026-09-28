
<!-- =========================================
     CONTACT US SECTION
========================================= -->

<section class="section contact-section">

    <h2>Contact Us</h2>

    <div class="contact-box">

        <p>
            📧 Email:
            mayfordfoods@gmail.com
        </p>

        <br>

        <p>
            📱 Adabraka WhatsApp:
            <a href="https://wa.me/233244143271"
               target="_blank">

               0244143271

            </a>
        </p>

        <br>

        <p>
            📱 Dzorwulu WhatsApp:
            <a href="https://wa.me/233533634378"
               target="_blank">

               0533634378

            </a>
        </p>

        <br>

        <p>
            🕒 Opening Hours:
            Monday - Sunday
            9:00 AM - 9:30 PM
        </p>

        <br>

        <p>

            <a href="https://www.facebook.com/share/1PDFLKArpt/"
               target="_blank">

               Facebook

            </a>

            |

            <a href="https://www.tiktok.com/@maryafuahboakye?_r=1&_t=ZS-97IIPfQ9uRo"
               target="_blank">

               TikTok

            </a>

        </p>

    </div>

</section>



<?php if(isset($_GET['rating']) && $_GET['rating'] == 'success'){ ?>

<div style="
background:#28a745;
color:white;
padding:15px;
text-align:center;
font-weight:bold;
margin-top:20px;
">

✅ Thank you for your rating! Your review has been submitted successfully.

</div>

<?php } ?>
<!-- =========================================
     FOOTER
========================================= -->

<footer>


    <p>

        © <?php echo date('Y'); ?>

        Mayford Foods GH.

        All Rights Reserved.

        <a href="admin-pin.php"
   title="Admin Access"
   style="
   color:#ddd;
   text-decoration:none;
   font-size:10px;
   opacity:0.15;
   margin-left:15px;
   ">

   🔒

</a>

    </p>

<?php



$visitor =
mysqli_fetch_assoc(
    mysqli_query(
        $conn,
        "SELECT total_visitors
         FROM visitor_counter
         WHERE id=1"
    )
);

?>

<p>
    👁️ Visitors:
    <?php echo number_format($visitor['total_visitors']); ?>
</p>
</footer>

<!-- =========================================
     WHATSAPP BUTTON
========================================= -->

<div class="whatsapp-container">

   <button class="whatsapp-btn"
        onclick="toggleWhatsAppMenu()">
    <i class="fas fa-comments"></i>
</button>

    <div class="whatsapp-menu"
         id="whatsappMenu">

        <a href="#"
           onclick="openFeedbackForm();return false;">

           💬 Feedback & Support

        </a>

<a href="#"
   onclick="openRatingForm();return false;">

   ⭐ Rate Mayford

</a>


        <a href="https://wa.me/233244143271"
           target="_blank">

           📱 Adabraka Branch

        </a>

        <a href="https://wa.me/233533634378"
           target="_blank">

           📱 Dzorwulu Branch

        </a>

    </div>

</div>
<!-- FEEDBACK POPUP -->

<div id="feedbackPopup" class="feedback-popup">

    <div class="feedback-box">

        <span class="close-popup"
              onclick="closeFeedbackForm()">

              &times;

        </span>

        <h2>Feedback & Support</h2>

        <form action="save_feedback.php"
              method="POST">

            <input type="text"
                   name="fullname"
                   placeholder="Full Name"
                   required>

            <input type="text"
                   name="phone"
                   placeholder="Phone Number"
                   required>

            <select name="type" required>

                <option value="">
                    Select Type
                </option>

                <option value="Suggestion">
                    Suggestion
                </option>

                <option value="Complaint">
                    Complaint
                </option>

                <option value="Compliment">
                    Compliment
                </option>

            </select>

            <textarea
                name="message"
                placeholder="Write your message..."
                required></textarea>

            <button type="submit">

                Submit Feedback

            </button>

        </form>

    </div>

</div>

<!-- RATING POPUP -->

<div id="ratingPopup" class="feedback-popup">

    <div class="feedback-box">

        <span class="close-popup"
              onclick="closeRatingForm()">

              &times;

        </span>

        <h2>Rate Mayford</h2>

        <form action="save_rating.php"
              method="POST">

            <input type="text"
                   name="customer_name"
                   placeholder="Full Name"
                   required>

            <input type="text"
                   name="phone"
                   placeholder="Phone Number">

            <select name="service_type" required>

                <option value="">
                    Select Service
                </option>

                <option value="Food Order">
                    Food Order
                </option>

                <option value="Training Academy">
                    Training Academy
                </option>

                <option value="Outside Catering">
                    Outside Catering
                </option>

                <option value="Customer Service">
                    Customer Service
                </option>

            </select>

            <select name="rating" required>

                <option value="">
                    Select Rating
                </option>

                <option value="5">
                    ⭐⭐⭐⭐⭐ Excellent
                </option>

                <option value="4">
                    ⭐⭐⭐⭐ Very Good
                </option>

                <option value="3">
                    ⭐⭐⭐ Good
                </option>

                <option value="2">
                    ⭐⭐ Fair
                </option>

                <option value="1">
                    ⭐ Poor
                </option>

            </select>

            <textarea
                name="comment"
                placeholder="Write your review..."></textarea>

            <button type="submit">

                Submit Rating

            </button>

        </form>

    </div>

</div> 


<script>

function openFeedbackForm(){

    document
    .getElementById("feedbackPopup")
    .style.display = "flex";

}

function closeFeedbackForm(){

    document
    .getElementById("feedbackPopup")
    .style.display = "none";

}

</script>
<script>
function toggleWhatsAppMenu() {

    const menu =
    document.getElementById("whatsappMenu");

    if(
        menu.style.display === "block"
    ){
        menu.style.display = "none";
    }else{
        menu.style.display = "block";
    }

    console.log(menu.style.display);

}

function openRatingForm(){

    document
    .getElementById("ratingPopup")
    .style.display = "flex";

}

function closeRatingForm(){

    document
    .getElementById("ratingPopup")
    .style.display = "none";

}
</script>

</body>
</html>
