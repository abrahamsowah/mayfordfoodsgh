<?php

session_start();

if(!isset($_SESSION['admin_id'])){
    header("Location: login.php");
    exit();
}

include '../config/database.php';



if(isset($_POST['add_banner'])){

    $banner_text = mysqli_real_escape_string(
        $conn,
        $_POST['banner_text']
    );

    mysqli_query(
        $conn,
        "INSERT INTO banners (banner_text)
         VALUES ('$banner_text')"
    );

    header("Location: view-banners.php");
    exit();
}

?>

<!DOCTYPE html>
<html>

<head>

<title>Add Banner</title>

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

.main-content{
    margin-left:270px;
    padding:20px;
}

.form-box{
    background:white;
    padding:25px;
    border-radius:10px;
    max-width:700px;
}

textarea{
    width:100%;
    padding:12px;
    height:120px;
}

button{
    background:#b22222;
    color:white;
    border:none;
    padding:12px 20px;
    cursor:pointer;
    border-radius:5px;
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

<div class="form-box">

<h2>Add Banner Message</h2>

<form method="POST">

<textarea
name="banner_text"
placeholder="Enter banner message"
required></textarea>

<br><br>

<button
type="submit"
name="add_banner">

Add Banner

</button>

</form>

</div>

</div>

</body>

</html>