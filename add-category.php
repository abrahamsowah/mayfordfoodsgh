<?php

include '../config/database.php';



$message = '';

if(isset($_POST['add_category'])){

    $category_name = $_POST['category_name'];

    $check = mysqli_query(
        $conn,
        "SELECT * FROM menu_categories
         WHERE category_name='$category_name'"
    );

    if(mysqli_num_rows($check) > 0){

        $message = "Category Already Exists";

    }else{

        mysqli_query(
            $conn,
            "INSERT INTO menu_categories(category_name)
             VALUES('$category_name')"
        );

        $message = "Category Added Successfully";
    }
}

?>

<!DOCTYPE html>
<html>
<head>

<title>Add Category</title>

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
}

.sidebar a:hover{
    background:#8b1a1a;
}

.main-content{
    margin-left:270px;
    padding:20px;
}

body{
    font-family:Arial;
    background:#f4f4f4;
}

.container{
    width:600px;
    margin:40px auto;
    background:white;
    padding:30px;
    border-radius:10px;
}

h2{
    text-align:center;
    color:#b22222;
}

input{
    width:100%;
    padding:12px;
    margin-bottom:15px;
}

button{
    background:#ff9800;
    color:white;
    border:none;
    padding:12px 20px;
    cursor:pointer;
}

.message{
    margin-bottom:15px;
    color:green;
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

<h2>Add Category</h2>

<?php if($message != ''){ ?>
<p class="message">
    <?php echo $message; ?>
</p>
<?php } ?>

<form method="POST">

<input type="text"
       name="category_name"
       placeholder="Enter Category Name"
       required>

<button type="submit"
        name="add_category">

    Add Category

</button>

</form>

</div>
</div>
</body>
</html>