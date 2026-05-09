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

CREATE TABLE IF NOT EXISTS reports (
  id VARCHAR(60) PRIMARY KEY,
  area VARCHAR(100) NOT NULL,
  camera_id VARCHAR(50) NOT NULL,
  type VARCHAR(150) NOT NULL,
  timestamp DATETIME NOT NULL,
  report_status VARCHAR(50) DEFAULT 'New',
  image TEXT,
  color VARCHAR(20) DEFAULT '#ef4444',
  missing_helmet BOOLEAN DEFAULT FALSE,
  missing_vest BOOLEAN DEFAULT FALSE,
  missing_shoes BOOLEAN DEFAULT FALSE,
  missing_gloves BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (camera_id) REFERENCES cameras(id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
);

INSERT IGNORE INTO cameras (id, name, location, status, rtsp_url, preview) VALUES
('CAM-01', 'Camera 1', 'Main Gate', 'Active', '', 'https://placehold.co/1200x700/eaf2ff/2563eb?text=Camera+1'),
('CAM-02', 'Camera 2', 'Workshop Area', 'Active', '', 'https://placehold.co/1200x700/eaf2ff/2563eb?text=Camera+2'),
('CAM-03', 'Camera 3', 'Warehouse', 'Active', '', 'https://placehold.co/1200x700/eaf2ff/2563eb?text=Camera+3'),
('CAM-04', 'Camera 4', 'Parking Area', 'Inactive', '', 'https://placehold.co/1200x700/eaf2ff/2563eb?text=Camera+4'),
('CAM-05', 'Camera 5', 'Loading Bay', 'Inactive', '', 'https://placehold.co/1200x700/eaf2ff/2563eb?text=Camera+5'),
('CAM-LAPTOP', 'Laptop Webcam', 'Webcam Test Area', 'Active', '', 'https://placehold.co/1200x700/eaf2ff/2563eb?text=Laptop+Webcam');
