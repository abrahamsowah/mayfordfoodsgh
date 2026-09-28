<?php

include '../config/database.php';

$result = mysqli_query(
    $conn,
    "SELECT * FROM menu_items ORDER BY id DESC"
);

?>

<!DOCTYPE html>
<html lang="en">

<head>

<meta charset="UTF-8">

<meta name="viewport"
      content="width=device-width, initial-scale=1.0">

<title>View Menu Items</title>

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
    margin:0;
    padding:20px;
}

.container{
    max-width:1200px;
    margin:auto;
    background:white;
    padding:20px;
    border-radius:10px;
}

h1{
    text-align:center;
    color:#b22222;
}

table{
    width:100%;
    border-collapse:collapse;
    margin-top:20px;
}

table th{
    background:#b22222;
    color:white;
    padding:12px;
}

table td{
    border:1px solid #ddd;
    padding:10px;
    text-align:center;
}

img{
    width:120px;
    height:90px;
    object-fit:cover;
    border-radius:8px;
}

.edit-btn{
    background:#28a745;
    color:white;
    padding:8px 12px;
    text-decoration:none;
    border-radius:5px;
}

.delete-btn{
    background:#dc3545;
    color:white;
    padding:8px 12px;
    text-decoration:none;
    border-radius:5px;
}

.add-btn{
    display:inline-block;
    margin-bottom:15px;
    background:#ff9800;
    color:white;
    padding:10px 20px;
    text-decoration:none;
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

<div class="container" style="overflow-x:auto;">

<h1>Menu Items</h1>

<a href="add-menu-item.php"
   class="add-btn">

   + Add New Food

</a>

<table>

<tr>

<th>ID</th>

<th>Image</th>

<th>Food Name</th>

<th>Category</th>

<th>Price</th>

<th>Status</th>

<th>Action</th>

</tr>

<?php while($row = mysqli_fetch_assoc($result)) { ?>

<tr>

<td><?php echo $row['id']; ?></td>

<td>

<img src="../assets/images/<?php echo $row['image']; ?>">

</td>

<td><?php echo $row['food_name']; ?></td>

<td><?php echo $row['category']; ?></td>

<td>GH₵ <?php echo $row['price']; ?></td>

<td><?php echo $row['status']; ?></td>

<td>

<a href="edit-menu-item.php?id=<?php echo $row['id']; ?>"
   class="edit-btn">
   Edit
</a>

<a href="delete-menu-item.php?id=<?php echo $row['id']; ?>"
   class="delete-btn"
   onclick="return confirm('Are you sure you want to delete this item?');">

   Delete

</a>

</td>

</tr>

<?php } ?>

</table>

</div>
</div>

</body>

</html>