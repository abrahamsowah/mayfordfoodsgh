<?php

include '../config/database.php';


$id = $_GET['id'];

$result = mysqli_query(
    $conn,
    "SELECT * FROM menu_categories WHERE id='$id'"
);

$row = mysqli_fetch_assoc($result);

if(isset($_POST['update_category'])){

    $category_name = $_POST['category_name'];

    mysqli_query(
        $conn,
        "UPDATE menu_categories
         SET category_name='$category_name'
         WHERE id='$id'"
    );

    header("Location: view-categories.php");
    exit();
}

?>

<!DOCTYPE html>
<html>

<head>

<title>Edit Category</title>

<style>

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

<div class="container">

<h2>Edit Category</h2>

<form method="POST">

<input type="text"
       name="category_name"
       value="<?php echo $row['category_name']; ?>"
       required>

<button type="submit"
        name="update_category">

    Update Category

</button>

</form>

</div>

</body>

</html>