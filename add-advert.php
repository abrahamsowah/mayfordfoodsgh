<?php

session_start();

if(!isset($_SESSION['admin_id'])){
    header("Location: login.php");
    exit();
}

include '../config/database.php';



if(isset($_POST['add_advert'])){

    $title = mysqli_real_escape_string(
        $conn,
        $_POST['title']
    );

    $description = mysqli_real_escape_string(
        $conn,
        $_POST['description']
    );

    $button_text = mysqli_real_escape_string(
        $conn,
        $_POST['button_text']
    );

    $button_link = mysqli_real_escape_string(
        $conn,
        $_POST['button_link']
    );

    $status = $_POST['status'];

    $image_name = $_FILES['banner_image']['name'];
    $temp_name = $_FILES['banner_image']['tmp_name'];

    move_uploaded_file(
        $temp_name,
        "../assets/adverts/" . $image_name
    );

    mysqli_query(
        $conn,
        "INSERT INTO advertisement_banners
        (
            banner_image,
            title,
            description,
            button_text,
            button_link,
            status
        )
        VALUES
        (
            '$image_name',
            '$title',
            '$description',
            '$button_text',
            '$button_link',
            '$status'
        )"
    );

    header("Location: view-adverts.php");
    exit();
}

?>

<!DOCTYPE html>
<html>

<head>

<title>Add Advertisement</title>

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
select,
textarea{
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

<div class="form-box">

<h2>Add Advertisement Banner</h2>

<form
method="POST"
enctype="multipart/form-data">

<label>Banner Image</label>
<input
type="file"
name="banner_image"
required>

<label>Title</label>
<input
type="text"
name="title"
required>


<label>Description</label>

<textarea
name="description"
rows="4"
required>
</textarea>

<label>Button Text</label>
<input
type="text"
name="button_text"
required>

<label>Button Link</label>
<input
type="text"
name="button_link"
required>

<label>Status</label>
<select name="status">

<option value="Active">
Active
</option>

<option value="Inactive">
Inactive
</option>

</select>

<button
type="submit"
name="add_advert">

Add Advertisement

</button>

</form>

</div>

</div>

</body>

</html>