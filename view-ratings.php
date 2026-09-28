<?php

include '../config/database.php';


$total_reviews = mysqli_num_rows(
    mysqli_query(
        $conn,
        "SELECT * FROM ratings"
    )
);

$avg_rating = mysqli_fetch_assoc(
    mysqli_query(
        $conn,
        "SELECT AVG(rating) AS avg_rating
         FROM ratings"
    )
);

$highest_rating = mysqli_fetch_assoc(
    mysqli_query(
        $conn,
        "SELECT MAX(rating) AS highest_rating
         FROM ratings"
    )
);
?>

<!DOCTYPE html>
<html>
<head>

<title>Customer Ratings</title>

<link rel="stylesheet"
      href="../assets/css/admin.css">
<style>

.cards{
    display:grid;
    grid-template-columns:repeat(auto-fit,minmax(250px,1fr));
    gap:20px;
    margin-bottom:25px;
}

.card{
    background:white;
    padding:25px;
    border-radius:15px;
    text-align:center;
    box-shadow:0 4px 15px rgba(0,0,0,.1);
}

.card h2{
    color:#b22222;
    margin-bottom:10px;
    font-size:35px;
}

.table-container{
    background:white;
    padding:25px;
    border-radius:15px;
    box-shadow:0 4px 15px rgba(0,0,0,.1);
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


.table-container{
    background:white;
    padding:30px;
    border-radius:15px;
    box-shadow:0 4px 15px rgba(0,0,0,.1);
}

table{
    width:100%;
    border-collapse:collapse;
    margin-top:20px;
    background:white;
}

table th{
    background:#b22222;
    color:white;
    padding:15px;
    text-align:left;
}

table td{
    padding:12px;
    border-bottom:1px solid #ddd;
}

table tr:nth-child(even){
    background:#f9f9f9;
}

table tr:hover{
    background:#f1f1f1;
}

.rating-stars{
    color:#ff9800;
    font-size:18px;
}
</style>


</head>

<body>

<?php include 'includes/sidebar.php'; ?>

<div class="main-content">


<div class="cards">

    <div class="card">
        <h2><?php echo $total_reviews; ?></h2>
        <p>Total Reviews</p>
    </div>

    <div class="card">
        <h2>
            <?php echo number_format($avg_rating['avg_rating'],1); ?>
            ⭐
        </h2>
        <p>Average Rating</p>
    </div>

    <div class="card">
        <h2>
            <?php echo $highest_rating['highest_rating']; ?>
            ⭐
        </h2>
        <p>Highest Rating</p>
    </div>

</div>


    <div class="table-container">

        <h1>Customer Ratings</h1>

        <table>

            <thead>

                <tr>

                    <th>ID</th>
                    <th>Name</th>
                    <th>Phone</th>
                    <th>Service</th>
                    <th>Rating</th>
                    <th>Comment</th>
                    <th>Date</th>
                    <th>Action</th>

                </tr>

            </thead>

            <tbody>

            <?php

            $query =
            mysqli_query(
                $conn,
                "SELECT * FROM ratings
                 ORDER BY id DESC"
            );

            while(
                $row =
                mysqli_fetch_assoc($query)
            ){

            ?>

            <tr>

                <td><?php echo $row['id']; ?></td>

                <td>
                    <?php echo $row['customer_name']; ?>
                </td>

                <td>
                    <?php echo $row['phone']; ?>
                </td>

                <td>
                    <?php echo $row['service_type']; ?>
                </td>

                <td class="rating-stars">
    <?php echo str_repeat('⭐',$row['rating']); ?>
</td>

                <td>
                    <?php echo $row['comment']; ?>
                </td>

                <td>
                    <?php echo $row['created_at']; ?>
                </td>
                 <td>

                <a href="delete-rating.php?id=<?php echo $row['id']; ?>"
                    onclick="return confirm('Delete this rating?')"
                                              style="
                            background:red;
                            color:white;
                             padding:6px 12px;
                            text-decoration:none;
                            border-radius:5px;">Delete
                </a>

                 </td>
            </tr>

            <?php } ?>

            </tbody>

        </table>

    </div>

</div>

</body>
</html>