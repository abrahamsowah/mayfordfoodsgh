<?php

session_start();

include '../config/database.php';

$result = mysqli_query(
    $conn,
    "SELECT * FROM community_media
     ORDER BY id DESC"
);

?>

<!DOCTYPE html>
<html>

<head>

<title>Community Impact</title>

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

img{
    width:120px;
    border-radius:8px;
}

.delete-btn{
    background:red;
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

<h1>Community Impact Media</h1>

<table>

<tr>

<th>ID</th>
<th>Type</th>
<th>Preview</th>
<th>Action</th>

</tr>

<?php while($row=mysqli_fetch_assoc($result)){ ?>

<tr>

<td><?php echo $row['id']; ?></td>

<td><?php echo $row['media_type']; ?></td>

<td>

<?php if($row['media_type']=="image"){ ?>

<img src="../assets/community/<?php echo $row['file_name']; ?>">

<?php } else { ?>

<video width="150" controls>

<source
src="../assets/community/<?php echo $row['file_name']; ?>">

</video>

<?php } ?>

</td>

<td>

<a
href="delete-community.php?id=<?php echo $row['id']; ?>"
class="delete-btn">

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