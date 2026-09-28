<?php

session_start();

if(!isset($_SESSION['admin_id'])){
    header("Location: login.php");
    exit();
}

include '../config/database.php';

$message = "";

if(isset($_POST['update'])){

    $email = $_POST['email'];
    $adabraka_phone = $_POST['adabraka_phone'];
    $dzorwulu_phone = $_POST['dzorwulu_phone'];
    $facebook_link = $_POST['facebook_link'];
    $tiktok_link = $_POST['tiktok_link'];
    $opening_hours = $_POST['opening_hours'];

    mysqli_query(
        $conn,
        "UPDATE website_settings SET
        email='$email',
        adabraka_phone='$adabraka_phone',
        dzorwulu_phone='$dzorwulu_phone',
        facebook_link='$facebook_link',
        tiktok_link='$tiktok_link',
        opening_hours='$opening_hours'
        WHERE id=1"
    );

    $message = "Settings Updated Successfully";
}

$result = mysqli_query(
    $conn,
    "SELECT * FROM website_settings WHERE id=1"
);

$settings = mysqli_fetch_assoc($result);

?>

<!DOCTYPE html>
<html>

<head>

<title>Website Settings</title>

<style>

    .sidebar{
    width:250px;
    height:100vh;
    background:#b22222;
    position:fixed;
    left:0;
    top:0;
    padding-top:20px;
    overflow-y:auto;
}

.sidebar h2{
    color:white;
    text-align:center;
    margin-bottom:30px;
}

.sidebar a{
    display:block;
    color:white;
    text-decoration:none;
    padding:15px 20px;
    font-weight:bold;
    transition:0.3s;
}

.sidebar a:hover{
    background:#8b1a1a;
    padding-left:30px;
}

.main-content{
    margin-left:270px;
    padding:20px;
}

body{
    font-family:Arial;
    background:#f4f4f4;
    padding:20px;
}

h1{
    text-align:center;
    color:#b22222;
}

.cards{
    display:grid;
    grid-template-columns:repeat(auto-fit,minmax(250px,1fr));
    gap:20px;
    margin-top:30px;
}

.card{
    background:white;
    padding:25px;
    border-radius:15px;
    text-align:center;
    text-decoration:none;
    color:black;
    box-shadow:0 4px 15px rgba(0,0,0,.1);
    transition:0.3s;
}

.card:hover{
    transform:translateY(-5px);
    box-shadow:0 8px 20px rgba(0,0,0,.15);
}

.card h2{
    color:#b22222;
    font-size:36px;
    margin-bottom:10px;
}

.top-bar{
    display:flex;
    justify-content:space-between;
    align-items:center;
    margin-bottom:30px;
}


body{
    font-family:Arial;
    background:#f4f4f4;
}

.container{
    width:60%;
    margin:30px auto;
    background:white;
    padding:30px;
    border-radius:15px;
}

h1{
    text-align:center;
    color:#b22222;
}

input{
    width:100%;
    padding:12px;
    margin:10px 0;
}

button{
    width:100%;
    padding:15px;
    background:#b22222;
    color:white;
    border:none;
    border-radius:5px;
    font-size:18px;
}

.success{
    background:#d4edda;
    color:green;
    padding:10px;
    margin-bottom:15px;
}
@media screen and (max-width:768px){

    .sidebar{
        width:150px;
    }

    .content,
    .main-content{
        margin-left:160px;
        padding:15px;
    }

    .dashboard-cards{
        grid-template-columns:1fr;
    }

    table{
        font-size:12px;
    }

    h1{
        font-size:28px;
    }

}
</style>

</head>

<body>

<?php include 'includes/sidebar.php'; ?>

<div class="main-content">

<div class="container">

<h1>Website Settings</h1>

<?php if($message!=""){ ?>

<div class="success">
    <?php echo $message; ?>
</div>

<?php } ?>

<form method="POST">

<label>Email</label>
<input type="email"
       name="email"
       value="<?php echo $settings['email']; ?>">

<label>Adabraka Phone</label>
<input type="text"
       name="adabraka_phone"
       value="<?php echo $settings['adabraka_phone']; ?>">

<label>Dzorwulu Phone</label>
<input type="text"
       name="dzorwulu_phone"
       value="<?php echo $settings['dzorwulu_phone']; ?>">

<label>Facebook Link</label>
<input type="text"
       name="facebook_link"
       value="<?php echo $settings['facebook_link']; ?>">

<label>TikTok Link</label>
<input type="text"
       name="tiktok_link"
       value="<?php echo $settings['tiktok_link']; ?>">

<label>Opening Hours</label>
<input type="text"
       name="opening_hours"
       value="<?php echo $settings['opening_hours']; ?>">

<button name="update">
    Update Settings
</button>

</form>

</div>

</div>

</body>
</html>