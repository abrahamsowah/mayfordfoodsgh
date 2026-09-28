<?php

session_start();

if(!isset($_SESSION['admin_id'])){

    header("Location: login.php");
    exit();

}

include '../config/database.php';


$role = $_SESSION['role'];

if($role == 'super_admin'){

    $total_orders = mysqli_num_rows(
        mysqli_query($conn,"SELECT * FROM orders")
    );

    $pending_orders = mysqli_num_rows(
        mysqli_query($conn,"SELECT * FROM orders WHERE status='Pending'")
    );

    $completed_orders = mysqli_num_rows(
        mysqli_query($conn,"SELECT * FROM orders WHERE status='Completed'")
    );

    $revenue = mysqli_fetch_assoc(
        mysqli_query(
            $conn,
            "SELECT SUM(total) AS total_revenue FROM orders"
        )
    );

    $catering_bookings = mysqli_num_rows(
        mysqli_query(
            $conn,
            "SELECT * FROM catering_bookings"
        )
    );

    $contact_messages = mysqli_num_rows(
        mysqli_query(
            $conn,
            "SELECT * FROM contact_messages"
        )
    );
     $training_applications = mysqli_num_rows(
         mysqli_query(
             $conn,
              "SELECT * FROM training_applications"
    )
);
}
elseif($role == 'adabraka_admin'){

    $total_orders = mysqli_num_rows(
        mysqli_query(
            $conn,
            "SELECT * FROM orders WHERE outlet='Adabraka'"
        )
    );

    $pending_orders = mysqli_num_rows(
        mysqli_query(
            $conn,
            "SELECT * FROM orders
             WHERE outlet='Adabraka'
             AND status='Pending'"
        )
    );

    $completed_orders = mysqli_num_rows(
        mysqli_query(
            $conn,
            "SELECT * FROM orders
             WHERE outlet='Adabraka'
             AND status='Completed'"
        )
    );

    $revenue = mysqli_fetch_assoc(
        mysqli_query(
            $conn,
            "SELECT SUM(total) AS total_revenue
             FROM orders
             WHERE outlet='Adabraka'"
        )
    );

}
elseif($role == 'dzorwulu_admin'){

    $total_orders = mysqli_num_rows(
        mysqli_query(
            $conn,
            "SELECT * FROM orders WHERE outlet='Dzorwulu'"
        )
    );

    $pending_orders = mysqli_num_rows(
        mysqli_query(
            $conn,
            "SELECT * FROM orders
             WHERE outlet='Dzorwulu'
             AND status='Pending'"
        )
    );

    $completed_orders = mysqli_num_rows(
        mysqli_query(
            $conn,
            "SELECT * FROM orders
             WHERE outlet='Dzorwulu'
             AND status='Completed'"
        )
    );

    $revenue = mysqli_fetch_assoc(
        mysqli_query(
            $conn,
            "SELECT SUM(total) AS total_revenue
             FROM orders
             WHERE outlet='Dzorwulu'"
        )
    );

}

?>

<!DOCTYPE html>
<html>

<head>

<title>Mayford Foods Admin</title>

<style>
#notificationBox{
    position:fixed;
    top:20px;
    right:20px;
    z-index:9999;
}

.notification{
    background:#28a745;
    color:white;
    padding:15px 20px;
    margin-bottom:10px;
    border-radius:8px;
    box-shadow:0 4px 10px rgba(0,0,0,.2);
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
</style>

</head>

<body>

<?php include 'includes/sidebar.php'; ?>

<div class="main-content">
<div id="notificationBox"></div>
<div class="top-bar">

<div style="
background:white;
padding:20px;
border-radius:15px;
width:100%;
box-shadow:0 4px 15px rgba(0,0,0,.08);
">
    <div>

        <h1>Mayford Foods Admin Dashboard</h1>

        <p>
            Welcome,
            <?php echo $_SESSION['admin_name']; ?>
        </p>
<br>

<span style="
background:#ff9800;
padding:6px 12px;
border-radius:20px;
color:white;
font-weight:bold;
">

<?php echo ucwords(str_replace('_',' ',$_SESSION['role'])); ?>

</span>
    </div>
</div>

</div>


<div class="cards">

<a href="#" class="card">

    <h2 style="color:#28a745;">
        GH₵ <?php echo $revenue['total_revenue'] ?? 0; ?>
    </h2>

    <p>Total Revenue</p>

<?php if($role == 'super_admin'){ ?>

<br>

<a href="reset-revenue.php"
onclick="return confirm('Reset all orders and revenue?')"
style="
background:red;
color:white;
padding:8px 15px;
text-decoration:none;
border-radius:5px;
display:inline-block;
margin-top:10px;
">
Reset Revenue
</a>

<?php } ?>

</a>

<a href="view-orders.php" class="card">
<h2><?php echo $pending_orders; ?></h2>
<p>Pending Orders</p>
</a>

<a href="view-orders.php" class="card">
<h2><?php echo $completed_orders; ?></h2>
<p>Completed Orders</p>
</a>



<a href="view-orders.php" class="card">
    <h2>Orders</h2>
    <p>View Customer Orders</p>
</a>

<?php if($_SESSION['role'] == 'super_admin'){ ?>

<a href="view-menu-items.php" class="card">
<h2>Menu</h2>
<p>Manage Menu Items</p>
</a>

<a href="view-categories.php" class="card">
<h2>Categories</h2>
<p>Manage Categories</p>
</a>

<a href="view-training-applications.php" class="card">
    <h2><?php echo $training_applications; ?></h2>
    <p>Training Applications</p>
</a>



<?php if($role == 'super_admin'){ ?>

<a href="view-contact-messages.php" class="card">
    <h2><?php echo $contact_messages; ?></h2>
    <p>Contact Messages</p>
</a>


<?php




$visitor =
mysqli_fetch_assoc(
    mysqli_query(
        $conn,
        "SELECT total_visitors
         FROM visitor_counter
         WHERE id=1"
    )
);

?>

<a href="#" class="card">
    <h2><?php echo $visitor['total_visitors']; ?></h2>
    <p>Total Visitors</p>
</a>
<?php } ?>
<?php } ?>

</div>
</div>








<script>

const sound = new Audio(
'../assets/sounds/notification.wav'
);

let notifiedOrders = false;
let notifiedApplications = false;
let notifiedMessages = false;

function showNotification(message){

    const div = document.createElement('div');

    div.className = 'notification';

    div.innerHTML = message;

    document
    .getElementById('notificationBox')
    .appendChild(div);

    setTimeout(() => {

        div.remove();

    }, 5000);

}

function checkNotifications(){

    fetch('check-notifications.php')

    .then(response => response.json())

    .then(data => {

        // Orders
        if(data.orders > 0 && !notifiedOrders){

            showNotification(
                '🔔 New Order Received'
            );

            sound.currentTime = 0;

            sound.play().catch(error => {
                console.log(error);
            });

            notifiedOrders = true;
        }

        // Training Applications
        if(data.applications > 0 && !notifiedApplications){

            showNotification(
                '🎓 New Training Application Received'
            );

            sound.currentTime = 0;

            sound.play().catch(error => {
                console.log(error);
            });

            notifiedApplications = true;
        }

        // Contact Messages
        if(data.messages > 0 && !notifiedMessages){

            showNotification(
                '📩 New Contact Message Received'
            );

            sound.currentTime = 0;

            sound.play().catch(error => {
                console.log(error);
            });

            notifiedMessages = true;
        }

        // Reset flags when admin has viewed them
        if(data.orders == 0){
            notifiedOrders = false;
        }

        if(data.applications == 0){
            notifiedApplications = false;
        }

        if(data.messages == 0){
            notifiedMessages = false;
        }

    })

    .catch(error => {
        console.log(error);
    });

}

setInterval(
    checkNotifications,
    5000
);

checkNotifications();

</script>

</body>

</html>