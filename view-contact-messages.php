<?php

session_start();

if(!isset($_SESSION['admin_id'])){
    header("Location: login.php");
    exit();
}

if($_SESSION['role'] != 'super_admin'){
    header("Location: dashboard.php");
    exit();
}

include '../config/database.php';

mysqli_query(
    $conn,
    "UPDATE contact_messages
     SET notification_status='seen'
     WHERE notification_status='new'"
);

mysqli_query(
    $conn,
    "UPDATE contact_messages
     SET notification_status='seen'
     WHERE notification_status='new'"
);


$result = mysqli_query(
    $conn,
    "SELECT * FROM contact_messages
     ORDER BY id DESC"
);

?>

<!DOCTYPE html>
<html>

<head>

<title>Contact Messages</title>

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
}

</style>

</head>

<body>

<?php include 'includes/sidebar.php'; ?>

<div class="main-content">

<div class="container">

<h1>Contact Messages</h1>

<table>

<tr>
    <th>ID</th>
    <th>Full Name</th>
    <th>Phone</th>
    <th>Subject</th>
    <th>Message</th>
    <th>Date</th>
    <th>Action</th>
</tr>
<?php while($row = mysqli_fetch_assoc($result)){ ?>

<tr>

<td><?php echo $row['id']; ?></td>

<td><?php echo $row['full_name']; ?></td>

<td><?php echo $row['email']; ?></td>

<td><?php echo $row['subject']; ?></td>

<td><?php echo $row['message']; ?></td>

<td><?php echo $row['created_at']; ?></td>
<td>
    <a href="delete-message.php?id=<?php echo $row['id']; ?>"
       onclick="return confirm('Delete this message?')"
       style="color:red;font-weight:bold;">
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