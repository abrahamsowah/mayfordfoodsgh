<?php

session_start();

if(!isset($_SESSION['admin_id'])){
    header("Location: login.php");
    exit();
}

include '../config/database.php';

$result = mysqli_query(
    $conn,
    "SELECT * FROM catering_bookings ORDER BY id DESC"
);

?>

<!DOCTYPE html>
<html>

<head>

<title>Catering Bookings</title>

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

.main-content{
    margin-left:270px;
    padding:20px;
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
    text-align:center;
    color:#b22222;
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

<h1>Catering Bookings</h1>

<table>

<tr>

<th>ID</th>
<th>Customer</th>
<th>Phone</th>
<th>Event Type</th>
<th>Event Date</th>
<th>Guests</th>
<th>Message</th>
<th>Date Submitted</th>

</tr>

<?php while($row = mysqli_fetch_assoc($result)){ ?>

<tr>

<td><?php echo $row['id']; ?></td>
<td><?php echo $row['customer_name']; ?></td>
<td><?php echo $row['phone']; ?></td>
<td><?php echo $row['event_type']; ?></td>
<td><?php echo $row['event_date']; ?></td>
<td><?php echo $row['guest_count']; ?></td>
<td><?php echo $row['message']; ?></td>
<td><?php echo $row['created_at']; ?></td>

</tr>

<?php } ?>

</table>

</div>

</div>

</body>

</html>