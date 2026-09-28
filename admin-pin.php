<?php

session_start();

if(isset($_POST['pin'])){

    $pin = $_POST['pin'];

    if($pin == "mayford2026"){

        $_SESSION['admin_access'] = true;

        header("Location: admin/login.php");
        exit();

    }else{

        $error = "Invalid PIN";

    }

}

?>

<!DOCTYPE html>
<html>

<head>

<title>Admin Access</title>

<style>

body{
    font-family:Arial;
    background:#f4f4f4;
    display:flex;
    justify-content:center;
    align-items:center;
    height:100vh;
}

.box{
    background:white;
    padding:30px;
    border-radius:10px;
    width:350px;
    text-align:center;
    box-shadow:0 4px 10px rgba(0,0,0,.1);
}

input{
    width:100%;
    padding:12px;
    margin:15px 0;
}

button{
    background:#b22222;
    color:white;
    border:none;
    padding:12px 20px;
    cursor:pointer;
}

.error{
    color:red;
}

</style>

</head>

<body>

<div class="box">

<h2>Admin Access</h2>

<?php if(isset($error)){ ?>
<p class="error"><?php echo $error; ?></p>
<?php } ?>

<form method="POST">

<input
    type="password"
    name="pin"
    placeholder="Enter Admin PIN"
    required
>

<button type="submit">
    Continue
</button>

</form>

</div>

</body>

</html>