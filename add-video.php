<?php

session_start();
include '../config/database.php';

if(isset($_POST['upload'])){

    $video = $_FILES['video']['name'];
    $tmp = $_FILES['video']['tmp_name'];

    move_uploaded_file(
        $tmp,
        "../assets/videos/".$video
    );

    mysqli_query(
        $conn,
        "INSERT INTO advertisement_videos(video_name)
         VALUES('$video')"
    );

    echo "<script>
            alert('Video Uploaded Successfully');
            window.location='view-videos.php';
          </script>";
}

?>

<!DOCTYPE html>
<html>
<head>
<title>Add Advertisement Video</title>

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
    padding:20px;
}

h1{
    text-align:center;
    color:#b22222;
}

.cards{
    display:grid;
    grid-template-columns:repeat(auto-fit,minmax(250px,1fr));
    gap:20px;
    margin-top:30px;
}

.card{
    background:white;
    padding:25px;
    border-radius:15px;
    text-align:center;
    text-decoration:none;
    color:black;
    box-shadow:0 4px 15px rgba(0,0,0,.1);
    transition:0.3s;
}

.card:hover{
    transform:translateY(-5px);
    box-shadow:0 8px 20px rgba(0,0,0,.15);
}

.card h2{
    color:#b22222;
    font-size:36px;
    margin-bottom:10px;
}

.top-bar{
    display:flex;
    justify-content:space-between;
    align-items:center;
    margin-bottom:30px;
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


body{
    font-family:Arial;
    background:#f4f4f4;
}

.main-content{
    margin-left:270px;
    padding:20px;
}

.container{
    max-width:600px;
    margin:auto;
    background:#fff;
    padding:20px;
    border-radius:10px;
}

h1{
    text-align:center;
    color:#b22222;
}

input,button{
    width:100%;
    padding:12px;
    margin-top:10px;
}

button{
    background:#b22222;
    color:#fff;
    border:none;
}

</style>

</head>

<body>

<?php include 'includes/sidebar.php'; ?>

<div class="main-content">

<div class="container">

<h1>Upload Advertisement Video</h1>

<form method="POST" enctype="multipart/form-data">

<input
type="file"
name="video"
accept="video/*"
required>

<button type="submit" name="upload">
Upload Video
</button>

</form>

</div>

</div>

</body>
</html>