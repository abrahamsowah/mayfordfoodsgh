<?php

include '../config/database.php';


$message = '';

if(isset($_POST['add_food'])){

    $food_name = $_POST['food_name'];
    $category = $_POST['category'];
    $description = $_POST['description'];
    $price = $_POST['price'];
    $status = $_POST['status'];

    $image_name = $_FILES['image']['name'];
    $tmp_name = $_FILES['image']['tmp_name'];

    move_uploaded_file(
        $tmp_name,
        "../assets/images/".$image_name
    );

    $sql = "INSERT INTO menu_items
    (food_name, category, description, price, image, status)
    VALUES
    ('$food_name','$category','$description','$price','$image_name','$status')";

    if(mysqli_query($conn,$sql)){
        $message = "Food Item Added Successfully";
    }else{
        $message = "Error Adding Food";
    }
}

$categories = mysqli_query(
    $conn,
    "SELECT * FROM menu_categories ORDER BY category_name"
);

?>

<!DOCTYPE html>
<html>
<head>

    <title>Add Menu Item</title>

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
            background:#f5f5f5;
            padding:30px;
        }

        .container{
            max-width:700px;
            margin:auto;
            background:white;
            padding:30px;
            border-radius:10px;
            box-shadow:0 0 10px rgba(0,0,0,.1);
        }

        h2{
            color:#b22222;
            text-align:center;
            margin-bottom:20px;
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

        .success{
            background:#d4edda;
            color:#155724;
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
<body>

<?php include 'includes/sidebar.php'; ?>

<div class="main-content">

<div class="container">

    <h2>Add Menu Item</h2>

    <?php if($message != ''){ ?>

        <div class="success">
            <?php echo $message; ?>
        </div>

    <?php } ?>

    <form method="POST"
          enctype="multipart/form-data">

        <label>Food Name</label>

        <input type="text"
               name="food_name"
               required>

        <label>Category</label>

        <select name="category" required>

            <option value="">
                Select Category
            </option>

            <?php
            while($row = mysqli_fetch_assoc($categories)){
            ?>

            <option value="<?php echo $row['category_name']; ?>">

                <?php echo $row['category_name']; ?>

            </option>

            <?php } ?>

        </select>

        <label>Description</label>

        <textarea name="description"
                  rows="4"></textarea>

        <label>Price (GH₵)</label>

        <input type="number"
               step="0.01"
               name="price"
               required>

        <label>Food Image</label>

        <input type="file"
               name="image"
               required>

        <label>Status</label>

        <select name="status">

            <option value="available">
                Available
            </option>

            <option value="unavailable">
                Unavailable
            </option>

        </select>

        <button type="submit"
                name="add_food">

            Add Menu Item

        </button>

    </form>

</div>
</div>
</body>
</html>