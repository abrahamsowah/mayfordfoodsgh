-- =====================================================================
--  MAYFORD FOODS GH — COMPLETE DATABASE SCHEMA + SEED DATA
--  MySQL / MariaDB (phpMyAdmin or mysql CLI)
--
--  HOW TO USE:
--    1. Open phpMyAdmin -> "Import" (or: mysql -u root -p < mayfordfoodsgh.sql)
--    2. This file creates the database `mayfordfoodsgh` and every table
--       the website + admin dashboard need, with starter data included.
-- =====================================================================

CREATE DATABASE IF NOT EXISTS `mayfordfoodsgh`
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_general_ci;

USE `mayfordfoodsgh`;

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

-- --------------------------------------------------------
--  Admins (admin dashboard users / roles)
-- --------------------------------------------------------
DROP TABLE IF EXISTS `admins`;
CREATE TABLE `admins` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `admin_name` varchar(100) NOT NULL,
  `username` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` varchar(50) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `admins` (`id`, `admin_name`, `username`, `password`, `role`, `created_at`) VALUES
(1, 'Mayford Main Admin', 'mainadmin', '123456', 'super_admin', '2026-06-19 16:40:05'),
(2, 'Adabraka Admin', 'adabraka', '123456', 'adabraka_admin', '2026-06-19 16:40:05'),
(3, 'Dzorwulu Admin', 'dzorwulu', '123456', 'dzorwulu_admin', '2026-06-19 16:40:05');

-- --------------------------------------------------------
--  Banners (orange marquee messages at the top of every page)
-- --------------------------------------------------------
DROP TABLE IF EXISTS `banners`;
CREATE TABLE `banners` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `banner_text` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `banners` (`id`, `banner_text`, `created_at`) VALUES
(1, 'Available on Bolt Food', '2026-06-19 16:56:31'),
(2, 'Outside Catering Available', '2026-06-19 16:56:31'),
(3, 'Open Monday - Sunday 9:00 AM - 9:30 PM', '2026-06-19 16:56:31'),
(4, 'Community Outreach Programs', '2026-06-19 16:56:31'),
(5, 'Training Program Available', '2026-06-19 16:56:31');

-- --------------------------------------------------------
--  Catering bookings (catering page form)
-- --------------------------------------------------------
DROP TABLE IF EXISTS `catering_bookings`;
CREATE TABLE `catering_bookings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `customer_name` varchar(255) NOT NULL,
  `phone` varchar(50) NOT NULL,
  `event_type` varchar(255) NOT NULL,
  `event_date` date NOT NULL,
  `guest_count` int(11) NOT NULL,
  `message` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------
--  Community media (images / videos shown on the Community page)
-- --------------------------------------------------------
DROP TABLE IF EXISTS `community_media`;
CREATE TABLE `community_media` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `media_type` varchar(20) NOT NULL,
  `file_name` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------
--  Contact messages (contact page form + Feedback popup)
-- --------------------------------------------------------
DROP TABLE IF EXISTS `contact_messages`;
CREATE TABLE `contact_messages` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `full_name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `subject` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `notification_status` varchar(20) NOT NULL DEFAULT 'new',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------
--  Menu categories
-- --------------------------------------------------------
DROP TABLE IF EXISTS `menu_categories`;
CREATE TABLE `menu_categories` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `category_name` varchar(150) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `menu_categories` (`id`, `category_name`, `created_at`) VALUES
(1, 'Rice Dishes', '2026-06-19 16:44:44'),
(2, 'Local Dishes', '2026-06-19 16:44:44'),
(3, 'Soups', '2026-06-19 16:44:44'),
(4, 'Drinks', '2026-06-19 16:44:44'),
(5, 'Snacks', '2026-06-19 16:44:44'),
(6, 'Breakfast', '2026-06-19 16:44:44');

-- --------------------------------------------------------
--  Menu items (the digital menu)
-- --------------------------------------------------------
DROP TABLE IF EXISTS `menu_items`;
CREATE TABLE `menu_items` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `food_name` varchar(255) NOT NULL,
  `category` varchar(100) NOT NULL,
  `description` text NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `image` varchar(255) NOT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'available',
  `discount_percent` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `menu_items` (`id`, `food_name`, `category`, `description`, `price`, `image`, `status`, `discount_percent`, `created_at`) VALUES
(1, 'Jollof', 'Rice Dishes', 'Jollof with Chicken', 80.00, 'Jollof.png', 'available', 0, '2026-06-19 17:25:52'),
(2, 'Banku', 'Local Dishes', 'Banku with Okro', 45.00, 'bankuokro.jpeg', 'available', 0, '2026-06-19 17:26:49');

-- --------------------------------------------------------
--  Orders (checkout + single-item orders)
-- --------------------------------------------------------
DROP TABLE IF EXISTS `orders`;
CREATE TABLE `orders` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `customer_name` varchar(255) NOT NULL,
  `phone` varchar(50) NOT NULL,
  `food_item` varchar(255) NOT NULL,
  `quantity` int(11) NOT NULL,
  `outlet` varchar(100) NOT NULL,
  `order_type` varchar(100) NOT NULL,
  `address` text DEFAULT NULL,
  `order_details` text DEFAULT NULL,
  `total` decimal(10,2) NOT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'Pending',
  `notification_status` varchar(20) NOT NULL DEFAULT 'new',
  `order_date` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `orders` (`id`, `customer_name`, `phone`, `food_item`, `quantity`, `outlet`, `order_type`, `address`, `order_details`, `total`, `status`, `notification_status`, `order_date`) VALUES
(1, 'Sowh', '055760526', 'Jollof', 3, 'Dzorwulu', 'Delivery', 'accra', 'Jollof x 3', 240.00, 'Pending', 'new', '2026-06-19 17:28:56'),
(2, 'abbbb', '567', 'Multiple Foods', 0, 'Adabraka', 'Delivery', 'centrrs', 'Jollof x 1 = GH₵80.00\nBanku x 1 = GH₵45.00\n', 125.00, 'Pending', 'new', '2026-06-19 19:10:52');

-- --------------------------------------------------------
--  Ratings (Rate Mayford popup)
-- --------------------------------------------------------
DROP TABLE IF EXISTS `ratings`;
CREATE TABLE `ratings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `customer_name` varchar(255) NOT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `service_type` varchar(100) NOT NULL,
  `rating` int(11) NOT NULL,
  `comment` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------
--  Slider images (hero background slider on the home page)
-- --------------------------------------------------------
DROP TABLE IF EXISTS `slider_images`;
CREATE TABLE `slider_images` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `image` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `slider_images` (`id`, `image`, `created_at`) VALUES
(1, 'hero.png', '2026-06-19 17:20:25'),
(2, 'hero2.png', '2026-06-19 17:20:44'),
(3, 'community1.png', '2026-06-19 17:21:14'),
(4, 'hero3.png', '2026-06-19 17:21:39'),
(5, 'outsidecater4.jpeg', '2026-06-19 17:22:03');

-- --------------------------------------------------------
--  Training applications (training page form)
-- --------------------------------------------------------
DROP TABLE IF EXISTS `training_applications`;
CREATE TABLE `training_applications` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `full_name` varchar(255) NOT NULL,
  `phone` varchar(50) NOT NULL,
  `email` varchar(255) NOT NULL,
  `training_school` varchar(255) NOT NULL,
  `program` varchar(255) NOT NULL,
  `message` text DEFAULT NULL,
  `notification_status` varchar(20) NOT NULL DEFAULT 'new',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------
--  Advertisement banners (rotating ad cards in the hero section)
-- --------------------------------------------------------
DROP TABLE IF EXISTS `advertisement_banners`;
CREATE TABLE `advertisement_banners` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `banner_image` varchar(255) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text NOT NULL,
  `button_text` varchar(255) NOT NULL,
  `button_link` varchar(255) NOT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'Active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `advertisement_banners` (`id`, `banner_image`, `title`, `description`, `button_text`, `button_link`, `status`, `created_at`) VALUES
(1, 'Jollof.png', 'Fresh Jollof Special', 'Enjoy our signature smoky party jollof served with grilled chicken. Order today!', 'Order Now', '/menu', 'Active', '2026-06-19 18:00:00'),
(2, 'riceball.jpg', 'Riceball Deal', 'Quick, tasty and affordable riceballs prepared fresh every day.', 'View Menu', '/menu', 'Active', '2026-06-19 18:05:00');

-- --------------------------------------------------------
--  Advertisement videos (Latest Advertisements section on home)
-- --------------------------------------------------------
DROP TABLE IF EXISTS `advertisement_videos`;
CREATE TABLE `advertisement_videos` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `video_name` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `advertisement_videos` (`id`, `video_name`, `created_at`) VALUES
(1, 'video.mp4', '2026-06-19 18:10:00');

-- --------------------------------------------------------
--  Visitor counter (shown in the footer + admin dashboard)
-- --------------------------------------------------------
DROP TABLE IF EXISTS `visitor_counter`;
CREATE TABLE `visitor_counter` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `total_visitors` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `visitor_counter` (`id`, `total_visitors`) VALUES
(1, 1000);

-- --------------------------------------------------------
--  Website settings (contact info, phones, social links, hours)
-- --------------------------------------------------------
DROP TABLE IF EXISTS `website_settings`;
CREATE TABLE `website_settings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `email` varchar(255) NOT NULL,
  `adabraka_phone` varchar(20) NOT NULL,
  `dzorwulu_phone` varchar(20) NOT NULL,
  `facebook_link` text NOT NULL,
  `tiktok_link` text NOT NULL,
  `opening_hours` varchar(255) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `website_settings` (`id`, `email`, `adabraka_phone`, `dzorwulu_phone`, `facebook_link`, `tiktok_link`, `opening_hours`) VALUES
(1, 'mayfordfoods@gmail.com', '0244143271', '0533634378', 'https://www.facebook.com/share/1PDFLKArpt/', 'https://www.tiktok.com/@maryafuahboakye?_r=1&_t=ZS-97IIPfQ9uRo', 'Monday - Sunday 9:00 AM - 9:30 PM');

-- =====================================================================
--  BUSINESS LAYER  (v2 — payments, accounts, tracking, analytics, audit)
--  Safe to run on an existing installation: every statement is
--  CREATE ... IF NOT EXISTS / guarded ALTER, so nothing is dropped.
-- =====================================================================

-- Extra columns on the original tables ---------------------------------
ALTER TABLE `orders`
  ADD COLUMN IF NOT EXISTS `order_code` varchar(40) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `customer_id` int(11) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `email` varchar(190) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `subtotal` decimal(10,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS `delivery_fee` decimal(10,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS `payment_method` varchar(30) NOT NULL DEFAULT 'cash',
  ADD COLUMN IF NOT EXISTS `payment_status` varchar(20) NOT NULL DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS `payment_reference` varchar(120) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `paid_at` datetime DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `cancel_reason` varchar(255) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `courier_name` varchar(120) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `courier_phone` varchar(30) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `eta_minutes` int(11) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `updated_at` datetime DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `tracking_token` varchar(64) DEFAULT NULL,
  ADD INDEX `idx_orders_code` (`order_code`),
  ADD INDEX `idx_orders_customer` (`customer_id`),
  ADD INDEX `idx_orders_date` (`order_date`),
  ADD INDEX `idx_orders_tracking` (`tracking_token`);

ALTER TABLE `website_settings`
  ADD COLUMN IF NOT EXISTS `delivery_fee` decimal(10,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS `free_delivery_over` decimal(10,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS `paystack_enabled` tinyint(1) NOT NULL DEFAULT 1;

ALTER TABLE `ratings` ADD COLUMN IF NOT EXISTS `reply` text DEFAULT NULL;
ALTER TABLE `contact_messages` ADD COLUMN IF NOT EXISTS `status` varchar(30) NOT NULL DEFAULT 'New';
ALTER TABLE `catering_bookings` ADD COLUMN IF NOT EXISTS `status` varchar(30) NOT NULL DEFAULT 'New';
ALTER TABLE `training_applications` ADD COLUMN IF NOT EXISTS `status` varchar(30) NOT NULL DEFAULT 'New';

-- New tables -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `order_items` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `order_id` int(11) NOT NULL,
  `menu_item_id` int(11) DEFAULT NULL,
  `food_name` varchar(190) NOT NULL,
  `unit_price` decimal(10,2) NOT NULL,
  `quantity` int(11) NOT NULL,
  `line_total` decimal(10,2) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_order_items_order` (`order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `order_events` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `order_id` int(11) NOT NULL,
  `status` varchar(40) NOT NULL,
  `note` text DEFAULT NULL,
  `actor` varchar(60) NOT NULL DEFAULT 'system',
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_order_events_order` (`order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `payments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `order_id` int(11) DEFAULT NULL,
  `provider` varchar(30) NOT NULL DEFAULT 'paystack',
  `reference` varchar(120) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `currency` varchar(8) NOT NULL DEFAULT 'GHS',
  `channel` varchar(40) DEFAULT NULL,
  `status` varchar(30) NOT NULL DEFAULT 'pending',
  `provider_payload` longtext DEFAULT NULL,
  `paid_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_payments_reference` (`reference`),
  KEY `idx_payments_order` (`order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `customers` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `full_name` varchar(190) NOT NULL,
  `email` varchar(190) NOT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `password_hash` varchar(255) NOT NULL,
  `marketing_opt_in` tinyint(1) NOT NULL DEFAULT 0,
  `status` varchar(20) NOT NULL DEFAULT 'active',
  `created_at` datetime NOT NULL,
  `last_login_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_customers_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `customer_addresses` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `customer_id` int(11) NOT NULL,
  `label` varchar(60) NOT NULL DEFAULT 'Home',
  `address` varchar(255) NOT NULL,
  `landmark` varchar(190) DEFAULT NULL,
  `is_default` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_addresses_customer` (`customer_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `password_resets` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `customer_id` int(11) NOT NULL,
  `token_hash` varchar(128) NOT NULL,
  `expires_at` datetime NOT NULL,
  `used_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_resets_token` (`token_hash`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `actor_type` varchar(20) NOT NULL,
  `actor_id` int(11) DEFAULT NULL,
  `actor_name` varchar(190) DEFAULT NULL,
  `action` varchar(80) NOT NULL,
  `entity` varchar(60) DEFAULT NULL,
  `entity_id` varchar(60) DEFAULT NULL,
  `meta` text DEFAULT NULL,
  `ip` varchar(60) DEFAULT NULL,
  `user_agent` varchar(300) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_audit_created` (`created_at`),
  KEY `idx_audit_action` (`action`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `login_attempts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `scope` varchar(30) NOT NULL,
  `identifier` varchar(190) DEFAULT NULL,
  `ip` varchar(60) DEFAULT NULL,
  `success` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_login_attempts` (`scope`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `notifications` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `channel` varchar(20) NOT NULL DEFAULT 'email',
  `recipient` varchar(190) NOT NULL,
  `subject` varchar(255) NOT NULL,
  `body` text NOT NULL,
  `related_type` varchar(40) DEFAULT NULL,
  `related_id` varchar(60) DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'queued',
  `attempts` int(11) NOT NULL DEFAULT 0,
  `error` varchar(400) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `sent_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_notifications_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `page_views` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `path` varchar(190) NOT NULL,
  `referrer` varchar(400) DEFAULT NULL,
  `source` varchar(60) DEFAULT NULL,
  `device` varchar(20) DEFAULT NULL,
  `session_key` varchar(64) DEFAULT NULL,
  `customer_id` int(11) DEFAULT NULL,
  `ip_hash` varchar(64) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_page_views_created` (`created_at`),
  KEY `idx_page_views_path` (`path`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `sessions` (
  `sid` varchar(128) NOT NULL,
  `sess` text NOT NULL,
  `expires_at` datetime NOT NULL,
  PRIMARY KEY (`sid`),
  KEY `idx_sessions_expiry` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;

-- =====================================================================
--  DONE.
--  Admin accounts (username / password):
--    mainadmin / 123456   (super_admin     - full dashboard)
--    adabraka  / 123456   (adabraka_admin  - Adabraka orders only)
--    dzorwulu  / 123456   (dzorwulu_admin  - Dzorwulu orders only)
--  Passwords are hashed automatically (scrypt) the first time the API
--  boots against this database. Change them after the first login.
--
--  Payments (Paystack): set in server/.env
--    PAYSTACK_SECRET_KEY=sk_live_xxx
--    PAYSTACK_PUBLIC_KEY=pk_live_xxx
--    APP_URL=https://your-domain
--  Webhook URL to register in the Paystack dashboard:
--    https://your-domain/api/payments/webhook/paystack
-- =====================================================================
