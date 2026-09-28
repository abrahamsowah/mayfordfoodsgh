<?php

include '../config/database.php';


$id = $_GET['id'];

$result = mysqli_query(
    $conn,
    "SELECT * FROM menu_items WHERE id='$id'"
);

$row = mysqli_fetch_assoc($result);

if(isset($_POST['update'])){

    $food_name = $_POST['food_name'];
    $category = $_POST['category'];
    $description = $_POST['description'];
    $price = $_POST['price'];
    $status = $_POST['status'];

    mysqli_query(
        $conn,
        "UPDATE menu_items SET
        food_name='$food_name',
        category='$category',
        description='$description',
        price='$price',
        status='$status'
        WHERE id='$id'"
    );

    echo "<script>
            alert('Food Item Updated Successfully');
            window.location='view-menu-items.php';
          </script>";
}

?>

<!DOCTYPE html>
<html>

<head>

<title>Edit Menu Item</title>

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
    font-family:Arial,sans-serif;
    background:#f4f4f4;
}

.container{
    width:700px;
    margin:30px auto;
    background:white;
    padding:25px;
    border-radius:10px;
}

h2{
    text-align:center;
    color:#b22222;
}

input,
textarea,
select{
    width:100%;
    padding:12px;
    margin-bottom:15px;
}

button{
    background:#ff9800;
    color:white;
    border:none;
    padding:12px 25px;
    cursor:pointer;
}

button:hover{
    background:#e68900;
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

<h2>Edit Menu Item</h2>

<form method="POST">

<label>Food Name</label>

<input type="text"
       name="food_name"
       value="<?php echo $row['food_name']; ?>">

<label>Category</label>

<input type="text"
       name="category"
       value="<?php echo $row['category']; ?>">

<label>Description</label>

<textarea name="description"><?php echo $row['description']; ?></textarea>

<label>Price</label>

<input type="number"
       step="0.01"
       name="price"
       value="<?php echo $row['price']; ?>">

<label>Status</label>

<select name="status">

<option value="available"
<?php if($row['status']=='available') echo 'selected'; ?>>
Available
</option>

<option value="unavailable"
<?php if($row['status']=='unavailable') echo 'selected'; ?>>
Unavailable
</option>

</select>

<button type="submit"
        name="update">

Update Food Item

</button>

</form>

</div>
</div>
</body>

</html>