<?php

session_start();

if(!isset($_SESSION['admin_access'])){

    header("Location: ../index.php");
    exit();

}



include '../config/database.php';

$error = "";

if(isset($_POST['login'])){

    $username = $_POST['username'];
    $password = $_POST['password'];

    $query = mysqli_query(
        $conn,
        "SELECT * FROM admins
         WHERE username='$username'
         AND password='$password'"
    );

    if(mysqli_num_rows($query) > 0){

        $admin = mysqli_fetch_assoc($query);

        $_SESSION['admin_id'] = $admin['id'];
        $_SESSION['admin_name'] = $admin['full_name'];
        $_SESSION['role'] = $admin['role'];

        header("Location: dashboard.php");
        exit();

    }else{

        $error = "Invalid Username or Password";

    }

}
?>

<!DOCTYPE html>
<html>

<head>

<title>Admin Login</title>

<style>
body::before{
    content:"";
    position:fixed;
    top:0;
    left:0;
    width:100%;
    height:100%;
    background:rgba(0,0,0,.45);
} 
body{
    margin:0;
    font-family:Arial, sans-serif;
    background:url('../assets/images/hero.png');
    background-size:cover;
    background-position:center;
    height:100vh;
    display:flex;
    justify-content:center;
    align-items:center;
}
.login-box{
    position:relative;
    z-index:1;
    width:400px;
    background:rgba(255,255,255,.95);
    padding:30px;
    border-radius:15px;
    box-shadow:0 5px 20px rgba(0,0,0,.3);
    margin:100px auto;
    
    
}

h2{
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
    padding:12px;
    background:#b22222;
    color:white;
    border:none;
    border-radius:8px;
    font-size:16px;
    cursor:pointer;
}

button:hover{
    background:#8b1a1a;
}

.error{
    color:red;
    text-align:center;
}

.forgot{
    text-align:center;
    margin-top:15px;
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



<div class="login-box">

<div style="text-align:center;">
    <img src="../assets/images/logo.png" width="90">

    <h2 style="color:#b22222;">
        Mayford Foods Admin
    </h2>
</div>

<?php if($error!=""){ ?>
<p class="error"><?php echo $error; ?></p>
<?php } ?>

<form method="POST">

<input
type="text"
name="username"
placeholder="Username"
required>

<input
type="password"
name="password"
placeholder="Password"
required>

<button
type="submit"
name="login">

Login

</button>

</form>

<div class="forgot">

Forgot Password?<br>

Contact Super Admin<br>

0244143271

</div>

</div>

</body>

</html>