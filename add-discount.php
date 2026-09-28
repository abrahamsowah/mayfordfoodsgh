<?php

session_start();

include '../config/database.php';



$id = $_GET['id'];

$result = mysqli_query(
    $conn,
    "SELECT * FROM menu_items WHERE id='$id'"
);

$food = mysqli_fetch_assoc($result);

if(isset($_POST['save'])){

    $discount = $_POST['discount_percent'];

    mysqli_query(
        $conn,
        "UPDATE menu_items
         SET discount_percent='$discount'
         WHERE id='$id'"
    );

    header("Location: view-discounts.php");
    exit();
}

?>

<!DOCTYPE html>
<html>

<head>

<title>Edit Discount</title>

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


body{
    font-family:Arial;
    background:#f4f4f4;
}

.main-content{
    margin-left:270px;
    padding:20px;
}

.container{
    max-width:600px;
    margin:auto;
    background:white;
    padding:20px;
    border-radius:10px;
}

h1{
    color:#b22222;
    text-align:center;
}

input{
    width:100%;
    padding:12px;
    margin:10px 0;
}

button{
    background:#b22222;
    color:white;
    border:none;
    padding:12px 20px;
    cursor:pointer;
    border-radius:5px;
}




</style>

</head>

<body>

<?php include 'includes/sidebar.php'; ?>

<div class="main-content">

<div class="container">

<h1>Edit Discount</h1>

<p>

Food:

<strong>

<?php echo $food['food_name']; ?>

</strong>

</p>

<form method="POST">

<label>Discount Percentage (%)</label>

<input
type="number"
name="discount_percent"
value="<?php echo $food['discount_percent']; ?>"
min="0"
max="100"
required
>

<button type="submit" name="save">

Save Discount

</button>

</form>

</div>

</div>

</body>

</html>