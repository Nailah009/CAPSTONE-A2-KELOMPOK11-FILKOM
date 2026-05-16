CREATE DATABASE IF NOT EXISTS smart_k3_vision;

USE smart_k3_vision;

CREATE TABLE IF NOT EXISTS cameras (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  location VARCHAR(100) NOT NULL,
  status ENUM('Active', 'Inactive') DEFAULT 'Active',
  rtsp_url VARCHAR(255),
  preview TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(100) NOT NULL,
  role ENUM('admin', 'supervisor', 'general_manager') NOT NULL,
  status ENUM('active', 'inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reports (
  id VARCHAR(60) PRIMARY KEY,
  area VARCHAR(100) NOT NULL,
  camera_id VARCHAR(50) NOT NULL,
  type VARCHAR(100) NOT NULL,
  missing_items VARCHAR(150) NOT NULL,
  image_path TEXT,
  timestamp DATETIME NOT NULL,
  validation_status ENUM('pending', 'valid', 'invalid') DEFAULT 'pending',
  validated_at DATETIME,
  validated_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (camera_id) REFERENCES cameras(id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  FOREIGN KEY (validated_by) REFERENCES users(id)
    ON UPDATE CASCADE
    ON DELETE SET NULL
);

-- ============================================
-- ADMIN FEATURES - NEW TABLES
-- ============================================

-- Table untuk menyimpan AI detection rules per camera
CREATE TABLE IF NOT EXISTS ai_rules (
  id VARCHAR(50) PRIMARY KEY,
  camera_id VARCHAR(50) NOT NULL,
  enforce_helmet BOOLEAN DEFAULT TRUE,
  enforce_vest BOOLEAN DEFAULT TRUE,
  enforce_gloves BOOLEAN DEFAULT FALSE,
  enforce_shoes BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (camera_id) REFERENCES cameras(id) ON DELETE CASCADE,
  INDEX idx_camera_id (camera_id)
);

-- Table untuk menyimpan area/lokasi kerja
CREATE TABLE IF NOT EXISTS areas (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- INITIAL DATA
-- ============================================

INSERT IGNORE INTO cameras (id, name, location, status, rtsp_url, preview) VALUES
('CAM-01', 'Camera 1', 'Main Gate', 'Inactive', '', 'https://placehold.co/1200x700/eaf2ff/2563eb?text=Camera+1'),
('CAM-02', 'Camera 2', 'Workshop Area', 'Inactive', '', 'https://placehold.co/1200x700/eaf2ff/2563eb?text=Camera+2'),
('CAM-03', 'Camera 3', 'Warehouse', 'Inactive', '', 'https://placehold.co/1200x700/eaf2ff/2563eb?text=Camera+3'),
('CAM-04', 'Camera 4', 'Parking Area', 'Inactive', '', 'https://placehold.co/1200x700/eaf2ff/2563eb?text=Camera+4'),
('CAM-05', 'Camera 5', 'Loading Bay', 'Inactive', '', 'https://placehold.co/1200x700/eaf2ff/2563eb?text=Camera+5'),
('CAM-LAPTOP', 'Laptop Webcam', 'Webcam Test Area', 'Inactive', '0', 'https://placehold.co/1200x700/eaf2ff/2563eb?text=Laptop+Webcam');

INSERT IGNORE INTO users (name, username, password, role, status) VALUES
('Wahyu Hidayat', 'wahyu', 'wahyu123', 'supervisor', 'active'),
('General Manager', 'manager', 'manager123', 'general_manager', 'active');

-- ============================================
-- DEFAULT AI RULES FOR EACH CAMERA
-- ============================================

INSERT IGNORE INTO ai_rules (id, camera_id, enforce_helmet, enforce_vest, enforce_gloves, enforce_shoes) VALUES
('RULE-CAM-01', 'CAM-01', TRUE, TRUE, FALSE, TRUE),
('RULE-CAM-02', 'CAM-02', TRUE, TRUE, FALSE, TRUE),
('RULE-CAM-03', 'CAM-03', TRUE, TRUE, FALSE, TRUE),
('RULE-CAM-04', 'CAM-04', TRUE, TRUE, FALSE, TRUE),
('RULE-CAM-05', 'CAM-05', TRUE, TRUE, FALSE, TRUE),
('RULE-CAM-LAPTOP', 'CAM-LAPTOP', TRUE, TRUE, FALSE, TRUE);

INSERT IGNORE INTO areas (id, name) VALUES
('AREA-01', 'Main Gate'),
('AREA-02', 'Workshop Area'),
('AREA-03', 'Warehouse'),
('AREA-04', 'Parking Area'),
('AREA-05', 'Loading Bay'),
('AREA-06', 'Webcam Test Area');
