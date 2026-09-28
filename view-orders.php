<?php

session_start();

include '../config/database.php';

mysqli_query(
    $conn,
    "UPDATE orders
     SET notification_status='seen'
     WHERE notification_status='new'"
);


mysqli_query(
    $conn,
    "UPDATE orders
     SET notification_status='seen'
     WHERE notification_status='new'"
);


if(!isset($_SESSION['admin_id'])){
    header("Location: login.php");
    exit();
}

$role = $_SESSION['role'];

$search = "";

$status = "";

if(isset($_GET['status'])){
    $status = $_GET['status'];
}
echo $status;

if(isset($_GET['search'])){
    $search = mysqli_real_escape_string(
        $conn,
        $_GET['search']
    );
}

if($role == 'super_admin'){

    $sql = "SELECT * FROM orders
            WHERE (
                customer_name LIKE '%$search%'
                OR phone LIKE '%$search%'
            )";

    if($status != ""){
        $sql .= " AND status='$status'";
    }

    $sql .= " ORDER BY id DESC";

    $result = mysqli_query($conn, $sql);

}
elseif($role == 'adabraka_admin'){

    $sql = "SELECT * FROM orders
            WHERE outlet='Adabraka'
            AND (
                customer_name LIKE '%$search%'
                OR phone LIKE '%$search%'
            )";

    if($status != ""){
        $sql .= " AND status='$status'";
    }

    $sql .= " ORDER BY id DESC";

    $result = mysqli_query($conn, $sql);

}
elseif($role == 'dzorwulu_admin'){

    $sql = "SELECT * FROM orders
            WHERE outlet='Dzorwulu'
            AND (
                customer_name LIKE '%$search%'
                OR phone LIKE '%$search%'
            )";

    if($status != ""){
        $sql .= " AND status='$status'";
    }

    $sql .= " ORDER BY id DESC";

    $result = mysqli_query($conn, $sql);

}

?>

<!DOCTYPE html>
<html>

<head>

<title>View Orders</title>

<style>

    .filter-btn{
    background:#b22222;
    color:white;
    text-decoration:none;
    padding:8px 15px;
    border-radius:5px;
    margin-right:5px;
}

.filter-btn:hover{
    background:#8b1a1a;
}
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
    padding:20px;
}

.container{
    max-width:1300px;
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

<h1>Customer Orders</h1>

<form method="GET">

    <input
        type="text"
        name="search"
        placeholder="Search customer or phone"
        style="
            padding:10px;
            width:300px;
        "
    >

    <button
        type="submit"
        style="
            padding:10px 15px;
            background:#b22222;
            color:white;
            border:none;
            cursor:pointer;
        "
    >
        Search
    </button>

    <div style="margin:15px 0;">

    <a href="view-orders.php" class="filter-btn">All</a>

    <a href="view-orders.php?status=Pending" class="filter-btn">Pending</a>

    <a href="view-orders.php?status=Preparing" class="filter-btn">Preparing</a>

    <a href="view-orders.php?status=Ready" class="filter-btn">Ready</a>

    <a href="view-orders.php?status=Completed" class="filter-btn">Completed</a>

     </div>

</form>

<br>

<table>

<tr>

<th>ID</th>
<th>Customer</th>
<th>Phone</th>
<th>Outlet</th>
<th>Order Type</th>
<th>Address</th>
<th>Order Details</th>
<th>Status</th>
<th>Actions</th>
<th>Total</th>
<th>Date</th>

</tr>

<?php while($row = mysqli_fetch_assoc($result)){ ?>

<tr>

<td><?php echo $row['id']; ?></td>

<td><?php echo $row['customer_name']; ?></td>

<td><?php echo $row['phone']; ?></td>

<td><?php echo $row['outlet']; ?></td>

<td><?php echo $row['order_type']; ?></td>

<td><?php echo $row['address']; ?></td>

<td><?php echo $row['order_details']; ?></td>

<td><?php echo $row['status']; ?></td>

<td>

<a href="update-status.php?id=<?php echo $row['id']; ?>&status=Preparing">
Preparing
</a>

|

<a href="update-status.php?id=<?php echo $row['id']; ?>&status=Ready">
Ready
</a>

|

<a href="update-status.php?id=<?php echo $row['id']; ?>&status=Completed">
Completed
</a>

</td>

<td>GH₵ <?php echo $row['total']; ?></td>

<td><?php echo $row['order_date']; ?></td>

</tr>

<?php } ?>

</table>

</div>

</div>
</body>

</html>