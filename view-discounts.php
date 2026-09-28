<?php

session_start();

include '../config/database.php';

$result = mysqli_query(
    $conn,
    "SELECT * FROM menu_items ORDER BY food_name ASC"
);

?>

<!DOCTYPE html>
<html>

<head>

<title>Discounts</title>

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
    background:white;
    padding:20px;
    border-radius:10px;
}

h1{
    color:#b22222;
    text-align:center;
}

table{
    width:100%;
    border-collapse:collapse;
}

th{
    background:#b22222;
    color:white;
    padding:12px;
}

td{
    border:1px solid #ddd;
    padding:10px;
    text-align:center;
}

.edit-btn{
    background:#ff9800;
    color:white;
    padding:8px 12px;
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

<div class="container">

<h1>Food Discounts</h1>

<table>

<tr>

<th>Food</th>
<th>Price</th>
<th>Discount %</th>
<th>Action</th>

</tr>

<?php while($row = mysqli_fetch_assoc($result)){ ?>

<tr>

<td><?php echo $row['food_name']; ?></td>

<td>GH₵ <?php echo $row['price']; ?></td>

<td><?php echo $row['discount_percent']; ?>%</td>

<td>

<a
href="add-discount.php?id=<?php echo $row['id']; ?>"
class="edit-btn">

Edit Discount

</a>

</td>

</tr>

<?php } ?>

</table>

</div>

</div>

</body>

</html>