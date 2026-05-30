-- ============================================
-- DATABASE SETUP & INITIALIZATION
-- ============================================

CREATE DATABASE IF NOT EXISTS `smart_k3_vision` DEFAULT CHARACTER SET utf8mb4;
USE `smart_k3_vision`;

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

-- --------------------------------------------------------
-- 1. Table structure for table `users`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `users`;
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `username` VARCHAR(50) NOT NULL,
  `password` VARCHAR(100) NOT NULL,
  `role` ENUM('admin', 'supervisor', 'general_manager') NOT NULL,
  `status` ENUM('active', 'inactive') DEFAULT 'active',
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4;

-- Dumping data for table `users`
INSERT INTO `users` (`id`, `name`, `username`, `password`, `role`, `status`, `created_at`) VALUES
(1, 'Wahyu Hidayat', 'wahyu', 'wahyu123', 'supervisor', 'active', '2026-05-23 06:11:12'),
(2, 'General Manager', 'manager', 'manager123', 'general_manager', 'active', '2026-05-23 06:11:12');


-- --------------------------------------------------------
-- 2. Table structure for table `cameras`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `cameras`;
CREATE TABLE IF NOT EXISTS `cameras` (
  `id` VARCHAR(50) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `location` VARCHAR(100) NOT NULL,
  `status` ENUM('Active', 'Inactive') DEFAULT 'Active',
  `rtsp_url` VARCHAR(255) DEFAULT NULL,
  `preview` TEXT,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Dumping data for table `cameras`
INSERT INTO `cameras` (`id`, `name`, `location`, `status`, `rtsp_url`, `preview`, `created_at`) VALUES
('CAM-01', 'Camera 1', 'Main Gate', 'Inactive', '', 'https://placehold.co/1200x700/eaf2ff/2563eb?text=Camera+1', '2026-05-23 06:11:12'),
('CAM-02', 'Camera 2', 'Workshop Area', 'Inactive', '', 'https://placehold.co/1200x700/eaf2ff/2563eb?text=Camera+2', '2026-05-23 06:11:12'),
('CAM-03', 'Camera 3', 'Warehouse', 'Inactive', '', 'https://placehold.co/1200x700/eaf2ff/2563eb?text=Camera+3', '2026-05-23 06:11:12'),
('CAM-04', 'Camera 4', 'Parking Area', 'Inactive', '', 'https://placehold.co/1200x700/eaf2ff/2563eb?text=Camera+4', '2026-05-23 06:11:12'),
('CAM-05', 'Camera 5', 'Loading Bay', 'Inactive', '', 'https://placehold.co/1200x700/eaf2ff/2563eb?text=Camera+5', '2026-05-23 06:11:12'),
('CAM-LAPTOP', 'Laptop Webcam', 'Webcam Test Area', 'Inactive', NULL, 'https://placehold.co/1200x700/eaf2ff/2563eb?text=Laptop+Webcam', '2026-05-23 06:11:12');

-- --------------------------------------------------------
-- 3. Table structure for table `areas`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `areas`;
CREATE TABLE IF NOT EXISTS `areas` (
  `id` VARCHAR(50) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Dumping data for table `areas`
INSERT INTO `areas` (`id`, `name`, `created_at`) VALUES
('AREA-01', 'Main Gate', '2026-05-23 06:11:12'),
('AREA-02', 'Workshop Area', '2026-05-23 06:11:12'),
('AREA-03', 'Warehouse', '2026-05-23 06:11:12'),
('AREA-04', 'Parking Area', '2026-05-23 06:11:12'),
('AREA-05', 'Loading Bay', '2026-05-23 06:11:12'),
('AREA-06', 'Webcam Test Area', '2026-05-23 06:11:12');

-- --------------------------------------------------------
-- 4. Table structure for table `ai_rules`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `ai_rules`;
CREATE TABLE IF NOT EXISTS `ai_rules` (
  `id` VARCHAR(50) NOT NULL,
  `camera_id` VARCHAR(50) NOT NULL,
  `enforce_helmet` TINYINT(1) DEFAULT '1',
  `enforce_vest` TINYINT(1) DEFAULT '1',
  `enforce_gloves` TINYINT(1) DEFAULT '0',
  `enforce_shoes` TINYINT(1) DEFAULT '1',
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_camera_id` (`camera_id`),
  CONSTRAINT `ai_rules_ibfk_1` FOREIGN KEY (`camera_id`) REFERENCES `cameras` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Dumping data for table `ai_rules`
INSERT INTO `ai_rules` (`id`, `camera_id`, `enforce_helmet`, `enforce_vest`, `enforce_gloves`, `enforce_shoes`, `created_at`) VALUES
('RULE-CAM-01', 'CAM-01', 1, 1, 0, 1, '2026-05-23 06:11:12'),
('RULE-CAM-02', 'CAM-02', 1, 1, 0, 1, '2026-05-23 06:11:12'),
('RULE-CAM-03', 'CAM-03', 1, 1, 0, 1, '2026-05-23 06:11:12'),
('RULE-CAM-04', 'CAM-04', 1, 1, 0, 1, '2026-05-23 06:11:12'),
('RULE-CAM-05', 'CAM-05', 1, 1, 0, 1, '2026-05-23 06:11:12'),
('RULE-CAM-LAPTOP', 'CAM-LAPTOP', 1, 1, 1, 0, '2026-05-23 06:11:12');

-- --------------------------------------------------------
-- 5. Table structure for table `reports`
-- --------------------------------------------------------
DROP TABLE IF EXISTS `reports`;
CREATE TABLE IF NOT EXISTS `reports` (
  `id` VARCHAR(60) NOT NULL,
  `area` VARCHAR(100) NOT NULL,
  `camera_id` VARCHAR(50) NOT NULL,
  `type` VARCHAR(100) NOT NULL,
  `missing_items` VARCHAR(150) NOT NULL,
  `image_path` TEXT,
  `timestamp` DATETIME NOT NULL,
  `validation_status` ENUM('pending','valid','invalid') DEFAULT 'pending',
  `validated_at` DATETIME DEFAULT NULL,
  `validated_by` INT DEFAULT NULL,
  `violator_name` VARCHAR(100) DEFAULT NULL,
  `notes` TEXT,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `camera_id` (`camera_id`),
  KEY `validated_by` (`validated_by`),
  CONSTRAINT `reports_ibfk_1` FOREIGN KEY (`camera_id`) REFERENCES `cameras` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `reports_ibfk_2` FOREIGN KEY (`validated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

COMMIT;