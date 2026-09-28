<?php

session_start();

include '../config/database.php';



if(isset($_POST['upload'])){

    $media_type = $_POST['media_type'];

    $file_name = $_FILES['media']['name'];

    $tmp_name = $_FILES['media']['tmp_name'];

    move_uploaded_file(
        $tmp_name,
        "../assets/community/" . $file_name
    );

    mysqli_query(
        $conn,
        "INSERT INTO community_media
        (media_type,file_name)
        VALUES
        ('$media_type','$file_name')"
    );

    header("Location:view-community.php");
    exit();
}

?>

<!DOCTYPE html>
<html>

<head>

<title>Add Community Media</title>

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
    max-width:700px;
    margin:auto;
    background:white;
    padding:20px;
    border-radius:10px;
}

input,select{
    width:100%;
    padding:12px;
    margin:10px 0;
}

button{
    background:#b22222;
    color:white;
    border:none;
    padding:12px 20px;
    border-radius:5px;
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

<?php include 'includes/sidebar.php'; ?>

<div class="main-content">

<div class="container">

<h1>Add Community Media</h1>

<form method="POST" enctype="multipart/form-data">

<label>Media Type</label>

<select name="media_type">

<option value="image">Image</option>

<option value="video">Video</option>

</select>

<label>Select File</label>

<input
type="file"
name="media"
required
>

<button type="submit" name="upload">

Upload Media

</button>

</form>

</div>

</div>

</body>

</html>