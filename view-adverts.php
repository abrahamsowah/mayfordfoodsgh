<?php

session_start();

if(!isset($_SESSION['admin_id'])){
    header("Location: login.php");
    exit();
}

include '../config/database.php';

$result = mysqli_query(
    $conn,
    "SELECT * FROM advertisement_banners
     ORDER BY id DESC"
);

?>

<!DOCTYPE html>
<html>

<head>

<title>Advertisements</title>

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

.form-box{
    background:white;
    padding:25px;
    border-radius:10px;
    max-width:700px;
}

input,
select{
    width:100%;
    padding:12px;
    margin-bottom:15px;
}

button{
    background:#b22222;
    color:white;
    border:none;
    padding:12px 20px;
    border-radius:5px;
    cursor:pointer;
}
.container{
    background:white;
    padding:20px;
    border-radius:10px;
}

h1{
    color:#b22222;
    text-align:center;
    margin-bottom:20px;
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
    vertical-align:middle;
}

.advert-image{
    width:120px;
    height:80px;
    object-fit:cover;
    border-radius:8px;
}

.delete-btn{
    background:red;
    color:white;
    padding:8px 12px;
    text-decoration:none;
    border-radius:5px;
}

.description-cell{
    max-width:300px;
    text-align:left;
}

@media screen and (max-width:768px){

    .sidebar{
        width:150px;
    }

    .main-content{
        margin-left:160px;
    }

}

</style>

</head>

<body>

<?php include 'includes/sidebar.php'; ?>

<div class="main-content">

<div class="container">

<h1>Advertisement Banners</h1>

<table>

<tr>

<th>Image</th>
<th>Title</th>
<th>Description</th>
<th>Status</th>
<th>Action</th>

</tr>

<?php while($row = mysqli_fetch_assoc($result)){ ?>

<tr>

<td>

<img
class="advert-image"
src="../assets/adverts/<?php echo $row['banner_image']; ?>">

</td>

<td>

<?php echo $row['title']; ?>

</td>

<td class="description-cell">

<?php echo $row['description']; ?>

</td>

<td>

<?php echo $row['status']; ?>

</td>

<td>

<a
href="delete-advert.php?id=<?php echo $row['id']; ?>"
class="delete-btn"
onclick="return confirm('Delete advert?')">

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