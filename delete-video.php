<?php

session_start();

include '../config/database.php';


$id = $_GET['id'];

$result = mysqli_query(
    $conn,
    "SELECT * FROM advertisement_videos
     WHERE id='$id'"
);

$row = mysqli_fetch_assoc($result);

if($row){

    $file = "../assets/videos/" . $row['video_name'];

    if(file_exists($file)){
        unlink($file);
    }

    mysqli_query(
        $conn,
        "DELETE FROM advertisement_videos
         WHERE id='$id'"
    );
}

header("Location: view-videos.php");
exit();

?>