-- phpMyAdmin SQL Dump
-- version 5.2.3
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: May 26, 2026 at 11:05 AM
-- Server version: 8.0.30
-- PHP Version: 8.3.27

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `smart_k3_vision`
--
CREATE DATABASE IF NOT EXISTS `smart_k3_vision` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE `smart_k3_vision`;

-- --------------------------------------------------------

--
-- Table structure for table `ai_rules`
--

DROP TABLE IF EXISTS `ai_rules`;
CREATE TABLE IF NOT EXISTS `ai_rules` (
  `id` varchar(50) NOT NULL,
  `camera_id` varchar(50) NOT NULL,
  `enforce_helmet` tinyint(1) DEFAULT '1',
  `enforce_vest` tinyint(1) DEFAULT '1',
  `enforce_gloves` tinyint(1) DEFAULT '0',
  `enforce_shoes` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_camera_id` (`camera_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `ai_rules`
--

INSERT INTO `ai_rules` (`id`, `camera_id`, `enforce_helmet`, `enforce_vest`, `enforce_gloves`, `enforce_shoes`, `created_at`) VALUES
('RULE-CAM-01', 'CAM-01', 1, 1, 0, 1, '2026-05-23 06:11:12'),
('RULE-CAM-02', 'CAM-02', 1, 1, 0, 1, '2026-05-23 06:11:12'),
('RULE-CAM-03', 'CAM-03', 1, 1, 0, 1, '2026-05-23 06:11:12'),
('RULE-CAM-04', 'CAM-04', 1, 1, 0, 1, '2026-05-23 06:11:12'),
('RULE-CAM-05', 'CAM-05', 1, 1, 0, 1, '2026-05-23 06:11:12'),
('RULE-CAM-LAPTOP', 'CAM-LAPTOP', 1, 1, 1, 0, '2026-05-23 06:11:12');

-- --------------------------------------------------------

--
-- Table structure for table `areas`
--

DROP TABLE IF EXISTS `areas`;
CREATE TABLE IF NOT EXISTS `areas` (
  `id` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `areas`
--

INSERT INTO `areas` (`id`, `name`, `created_at`) VALUES
('AREA-01', 'Main Gate', '2026-05-23 06:11:12'),
('AREA-02', 'Workshop Area', '2026-05-23 06:11:12'),
('AREA-03', 'Warehouse', '2026-05-23 06:11:12'),
('AREA-04', 'Parking Area', '2026-05-23 06:11:12'),
('AREA-05', 'Loading Bay', '2026-05-23 06:11:12'),
('AREA-06', 'Webcam Test Area', '2026-05-23 06:11:12');

-- --------------------------------------------------------

--
-- Table structure for table `cameras`
--

DROP TABLE IF EXISTS `cameras`;
CREATE TABLE IF NOT EXISTS `cameras` (
  `id` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `location` varchar(100) NOT NULL,
  `status` enum('Active','Inactive') DEFAULT 'Active',
  `rtsp_url` varchar(255) DEFAULT NULL,
  `preview` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `cameras`
--

INSERT INTO `cameras` (`id`, `name`, `location`, `status`, `rtsp_url`, `preview`, `created_at`) VALUES
('CAM-01', 'Camera 1', 'Main Gate', 'Inactive', '', 'https://placehold.co/1200x700/eaf2ff/2563eb?text=Camera+1', '2026-05-23 06:11:12'),
('CAM-02', 'Camera 2', 'Workshop Area', 'Inactive', '', 'https://placehold.co/1200x700/eaf2ff/2563eb?text=Camera+2', '2026-05-23 06:11:12'),
('CAM-03', 'Camera 3', 'Warehouse', 'Inactive', '', 'https://placehold.co/1200x700/eaf2ff/2563eb?text=Camera+3', '2026-05-23 06:11:12'),
('CAM-04', 'Camera 4', 'Parking Area', 'Inactive', '', 'https://placehold.co/1200x700/eaf2ff/2563eb?text=Camera+4', '2026-05-23 06:11:12'),
('CAM-05', 'Camera 5', 'Loading Bay', 'Inactive', '', 'https://placehold.co/1200x700/eaf2ff/2563eb?text=Camera+5', '2026-05-23 06:11:12'),
('CAM-LAPTOP', 'Laptop Webcam', 'Webcam Test Area', 'Inactive', NULL, 'https://placehold.co/1200x700/eaf2ff/2563eb?text=Laptop+Webcam', '2026-05-23 06:11:12');

-- --------------------------------------------------------

--
-- Table structure for table `reports`
--

DROP TABLE IF EXISTS `reports`;
CREATE TABLE IF NOT EXISTS `reports` (
  `id` varchar(60) NOT NULL,
  `area` varchar(100) NOT NULL,
  `camera_id` varchar(50) NOT NULL,
  `type` varchar(100) NOT NULL,
  `missing_items` varchar(150) NOT NULL,
  `image_path` text,
  `timestamp` datetime NOT NULL,
  `validation_status` enum('pending','valid','invalid') DEFAULT 'pending',
  `validated_at` datetime DEFAULT NULL,
  `validated_by` int DEFAULT NULL,
  `violator_name` varchar(100) DEFAULT NULL,
  `notes` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `camera_id` (`camera_id`),
  KEY `validated_by` (`validated_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `reports`
--

INSERT INTO `reports` (`id`, `area`, `camera_id`, `type`, `missing_items`, `image_path`, `timestamp`, `validation_status`, `validated_at`, `validated_by`, `violator_name`, `notes`, `created_at`) VALUES
('RPT-1779702463245', 'Webcam Test Area', 'CAM-LAPTOP', 'missing all ppe', 'helmet, vest, shoes', 'http://localhost:5000/uploads/violations/VIO-20260525164743.jpg', '2026-05-25 16:47:43', 'valid', '2026-05-25 17:06:03', 1, NULL, NULL, '2026-05-25 09:47:43'),
('RPT-1779702541284', 'Webcam Test Area', 'CAM-LAPTOP', 'missing all ppe', 'helmet, vest, shoes', 'http://localhost:5000/uploads/violations/VIO-20260525164901.jpg', '2026-05-25 16:49:01', 'valid', '2026-05-25 17:05:52', 1, NULL, NULL, '2026-05-25 09:49:01'),
('RPT-1779706184689', 'Webcam Test Area', 'CAM-LAPTOP', 'missing all ppe', 'helmet, vest, gloves, shoes', 'http://localhost:5000/uploads/violations/VIO-20260525174944.jpg', '2026-05-25 17:49:44', 'valid', '2026-05-25 17:51:15', 1, NULL, NULL, '2026-05-25 10:49:44'),
('RPT-1779706616078', 'Webcam Test Area', 'CAM-LAPTOP', 'no vest, no gloves, no shoes', 'vest, gloves, shoes', 'http://localhost:5000/uploads/violations/VIO-20260525175656.jpg', '2026-05-25 17:56:56', 'valid', '2026-05-25 17:59:25', 1, NULL, NULL, '2026-05-25 10:56:56'),
('RPT-1779709577221', 'Webcam Test Area', 'CAM-LAPTOP', 'missing all ppe', 'helmet, vest, gloves, shoes', 'http://localhost:5000/uploads/violations/VIO-20260525184617.jpg', '2026-05-25 18:46:17', 'valid', '2026-05-25 18:48:51', 1, NULL, NULL, '2026-05-25 11:46:17'),
('RPT-1779709592959', 'Webcam Test Area', 'CAM-LAPTOP', 'no vest, no gloves, no shoes', 'vest, gloves, shoes', 'http://localhost:5000/uploads/violations/VIO-20260525184632.jpg', '2026-05-25 18:46:32', 'valid', '2026-05-25 18:48:48', 1, NULL, NULL, '2026-05-25 11:46:32'),
('RPT-1779711089310', 'Webcam Test Area', 'CAM-LAPTOP', 'missing all ppe', 'helmet, vest, gloves, shoes', 'http://localhost:5000/uploads/violations/VIO-20260525191129.jpg', '2026-05-25 19:11:29', 'valid', '2026-05-25 19:13:14', 1, NULL, NULL, '2026-05-25 12:11:29'),
('RPT-1779711099951', 'Webcam Test Area', 'CAM-LAPTOP', 'no vest, no gloves, no shoes', 'vest, gloves, shoes', 'http://localhost:5000/uploads/violations/VIO-20260525191139.jpg', '2026-05-25 19:11:39', 'valid', '2026-05-25 19:19:58', 1, NULL, NULL, '2026-05-25 12:11:39'),
('RPT-1779713241028', 'Webcam Test Area', 'CAM-LAPTOP', 'no vest, no gloves, no shoes', 'vest, gloves, shoes', 'http://localhost:5000/uploads/violations/VIO-20260525194721.jpg', '2026-05-25 19:47:21', 'invalid', '2026-05-25 20:11:58', 1, 'Heru / Mandor', 'kelepasan', '2026-05-25 12:47:21'),
('RPT-1779714296645', 'Webcam Test Area', 'CAM-LAPTOP', 'no vest, no gloves, no shoes', 'vest, gloves, shoes', 'http://localhost:5000/uploads/violations/VIO-20260525200456.jpg', '2026-05-25 20:04:56', 'valid', '2026-05-25 20:10:55', 1, 'Andre / Pekerja Kontruksi', NULL, '2026-05-25 13:04:56'),
('RPT-1779714529483', 'Webcam Test Area', 'CAM-LAPTOP', 'no vest, no gloves, no shoes', 'vest, gloves, shoes', 'http://localhost:5000/uploads/violations/VIO-20260525200849.jpg', '2026-05-25 20:08:49', 'valid', '2026-05-25 20:10:27', 1, NULL, NULL, '2026-05-25 13:08:49'),
('RPT-1779718755498', 'Webcam Test Area', 'CAM-LAPTOP', 'missing all ppe', 'helmet, vest, gloves, shoes', 'http://localhost:5000/uploads/violations/VIO-20260525211915.jpg', '2026-05-25 21:19:15', 'valid', '2026-05-26 13:40:42', 1, NULL, NULL, '2026-05-25 14:19:15'),
('RPT-1779777405466', 'Webcam Test Area', 'CAM-LAPTOP', 'missing all ppe', 'helmet, vest, gloves, shoes', 'http://localhost:5000/uploads/violations/VIO-20260526133645.jpg', '2026-05-26 13:36:45', 'valid', '2026-05-26 13:40:46', 1, NULL, NULL, '2026-05-26 06:36:45'),
('RPT-1779777466983', 'Webcam Test Area', 'CAM-LAPTOP', 'no vest, no gloves, no shoes', 'vest, gloves, shoes', 'http://localhost:5000/uploads/violations/VIO-20260526133746.jpg', '2026-05-26 13:37:46', 'valid', '2026-05-26 13:40:49', 1, NULL, NULL, '2026-05-26 06:37:46'),
('RPT-1779778204165', 'Webcam Test Area', 'CAM-LAPTOP', 'missing all ppe', 'helmet, vest, gloves, shoes', 'http://localhost:5000/uploads/violations/VIO-20260526135004.jpg', '2026-05-26 13:50:04', 'invalid', '2026-05-26 14:04:37', 1, NULL, 'anomali', '2026-05-26 06:50:04'),
('RPT-1779779878580', 'Webcam Test Area', 'CAM-LAPTOP', 'no vest, no gloves', 'vest, gloves', 'http://localhost:5000/uploads/violations/VIO-20260526141758.jpg', '2026-05-26 14:17:58', 'invalid', '2026-05-26 16:30:35', 1, NULL, 'salah baca', '2026-05-26 07:17:58');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
CREATE TABLE IF NOT EXISTS `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `username` varchar(50) NOT NULL,
  `password` varchar(100) NOT NULL,
  `role` enum('admin','supervisor','general_manager') NOT NULL,
  `status` enum('active','inactive') DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `name`, `username`, `password`, `role`, `status`, `created_at`) VALUES
(1, 'Wahyu Hidayat', 'wahyu', 'wahyu123', 'supervisor', 'active', '2026-05-23 06:11:12'),
(2, 'General Manager', 'manager', 'manager123', 'general_manager', 'active', '2026-05-23 06:11:12'),
(3, 'Ade Setiawan', 'Admin', 'admin123', 'admin', 'active', '2026-05-23 10:23:47');

--
-- Constraints for dumped tables
--

--
-- Constraints for table `ai_rules`
--
ALTER TABLE `ai_rules`
  ADD CONSTRAINT `ai_rules_ibfk_1` FOREIGN KEY (`camera_id`) REFERENCES `cameras` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `reports`
--
ALTER TABLE `reports`
  ADD CONSTRAINT `reports_ibfk_1` FOREIGN KEY (`camera_id`) REFERENCES `cameras` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `reports_ibfk_2` FOREIGN KEY (`validated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
