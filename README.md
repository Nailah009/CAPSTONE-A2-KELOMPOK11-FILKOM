# 🦺 Smart K3 Vision Dashboard

<p align="center">
  <b>Sistem Monitoring K3 Smart-Factory Berbasis Computer Vision</b><br/>
  untuk Meningkatkan Standar Keselamatan dan Disiplin Kerja di PT. Indonesia Epson Industry
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Status-Prototype%20%2F%20PoC-blue?style=for-the-badge" />
  <img src="https://img.shields.io/badge/AI-YOLOv8-yellow?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Computer%20Vision-OpenCV-green?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Notification-Telegram-229ED9?style=for-the-badge" />
</p>

---

## 📌 Overview

**Smart K3 Vision** adalah sistem monitoring K3 berbasis **AI dan Computer Vision** yang digunakan untuk mendeteksi kepatuhan penggunaan **Alat Pelindung Diri (APD)** pekerja secara real-time.

Sistem ini membaca input dari kamera laptop/webcam atau CCTV, memproses frame menggunakan **OpenCV** dan **YOLOv8**, lalu mencatat pelanggaran APD secara otomatis ke database. Hasil monitoring ditampilkan melalui dashboard, laporan pelanggaran, bukti visual, export PDF, dan notifikasi Telegram.

---

## 🎯 Tujuan Project

Project ini dikembangkan untuk membantu:

- ✅ Meningkatkan efektivitas monitoring K3 di area produksi.
- ✅ Mengurangi ketergantungan pada pemantauan CCTV manual.
- ✅ Mendeteksi pelanggaran APD secara otomatis dan real-time.
- ✅ Mencatat laporan pelanggaran secara terstruktur.
- ✅ Menyediakan data analitik untuk evaluasi manajemen.
- ✅ Mengirimkan ringkasan atau alert pelanggaran melalui Telegram.

---

## 🧠 Fokus Deteksi APD

Model AI pada sistem ini difokuskan untuk mendeteksi:

| Class | Keterangan |
|---|---|
| `person` | Pekerja yang terdeteksi oleh kamera |
| `helmet` | Helm keselamatan |
| `vest` | Rompi keselamatan |
| `gloves` | Sarung tangan keselamatan |
| `shoes` | Sepatu safety |

---

## 🚨 Jenis Pelanggaran

Sistem akan mencatat report apabila terdapat APD yang tidak terdeteksi pada pekerja.

| Kondisi | Label Live Camera | Type Report | Missing Items |
|---|---|---|---|
| APD lengkap | `AMAN / COMPLETED` | Tidak masuk report | - |
| Tidak memakai helm | `MISSING: HELMET` | `Missing helmet` | `helmet` |
| Tidak memakai rompi | `MISSING: VEST` | `Missing vest` | `vest` |
| Tidak memakai sarung tangan | `MISSING: GLOVES` | `Missing gloves` | `gloves` |
| Tidak memakai sepatu safety | `MISSING: SHOES` | `Missing shoes` | `shoes` |
| Beberapa APD tidak lengkap | `MISSING PPE` | `Missing All PPE` | Sesuai hasil deteksi |

---

## ✨ Fitur Utama

### 🧩 1. Dashboard Monitoring

Dashboard menampilkan ringkasan kondisi monitoring K3, seperti:

- Total violations
- Most frequent violation
- Monitoring coverage
- Compliance rate
- Daily violations chart
- Violation types overview
- Recent reports
- Filter tanggal
- Refresh data dashboard

---

### 📹 2. Live Camera Monitoring

Halaman **Live Camera** digunakan untuk menampilkan hasil pemantauan kamera secara langsung.

Fitur yang tersedia:

- Daftar kamera
- Status kamera `Active` / `Inactive`
- Lokasi kamera
- Live stream kamera
- Bounding box hasil deteksi YOLOv8
- Label status APD
- Warna bounding box berdasarkan kondisi deteksi

| Warna | Status | Keterangan |
|---|---|---|
| 🟢 Hijau | Aman | APD lengkap |
| 🟡 Kuning | Warning | Sebagian APD tidak lengkap |
| 🔴 Merah | Pelanggaran | APD wajib tidak terpenuhi |

AI stream berjalan di:

```text
http://127.0.0.1:5055/video-feed
```

---

### 📝 3. Reports / Histori Pelanggaran

Halaman **Reports** menampilkan daftar pelanggaran yang telah tercatat oleh sistem.

Kolom data:

```text
ID
Area
Camera
Type
Timestamp
Status
Action
```

Filter laporan:

```text
All
Missing All PPE
Missing helmet
Missing vest
Missing gloves
Missing shoes
```

---

### 🔎 4. Detail Report

Halaman **Detail Report** menampilkan informasi lengkap dari satu pelanggaran, termasuk:

- ID report
- Area
- Camera
- Type
- Missing items
- Timestamp
- Status validasi
- Violation evidence

Bukti pelanggaran disimpan pada folder backend:

```text
backend/uploads/violations/
```

Contoh URL evidence:

```text
http://localhost:5000/uploads/violations/VIO-xxxx.jpg
```

---

### 📄 5. Export PDF

Sistem mendukung export laporan pelanggaran ke format PDF berdasarkan filter data yang dipilih. Fitur ini digunakan untuk kebutuhan dokumentasi dan evaluasi K3 oleh pengawas maupun manajemen.

---

### 📲 6. Notifikasi Telegram

Sistem menyediakan fitur notifikasi Telegram untuk mengirimkan informasi pelanggaran atau ringkasan monitoring.

Notifikasi dapat digunakan untuk:

- Mengirim alert ketika terdapat pelanggaran APD.
- Mengirim ringkasan monitoring harian.
- Memberikan update tanpa perlu membuka dashboard.
- Mendukung penyampaian informasi secara lebih cepat.

Contoh alert:

```text
🚨 Smart K3 Vision Alert

Pelanggaran APD terdeteksi
Area: Production Line
Camera: CAM-LAPTOP
Jenis Pelanggaran: Missing helmet
Waktu: 2026-06-04 10:24:35
```

Contoh ringkasan:

```text
📊 Ringkasan Monitoring Harian

Total pelanggaran: 17
Pelanggaran terbanyak: Missing helmet
Compliance rate: 86%
Area aktif dipantau: 6
```

---

### 👥 7. Login dan Role-Based Access

Sistem menggunakan login berbasis username dan password dengan pembagian role.

| Role | Akses |
|---|---|
| Admin | Dashboard, User Management, Camera Management, Area Management, AI Rules, Reports |
| Supervisor | Dashboard, Live Camera, Reports, Detail Report, Validasi Pelanggaran |
| General Manager | Dashboard, Reports, Analytics, Export PDF |

---

## 🔄 Alur Sistem

```text
Kamera Laptop / Webcam / CCTV
        ↓
AI Service Python
        ↓
OpenCV + YOLOv8 Detection
        ↓
Deteksi Person dan Kelengkapan APD
        ↓
Cek Kepatuhan APD
        ↓
Capture Bukti Pelanggaran
        ↓
Kirim Data ke Backend API
        ↓
Simpan Data dan Evidence ke MySQL
        ↓
Dashboard, Reports, Detail Report, Export PDF
        ↓
Notifikasi Telegram
```

---

## 🛠️ Tech Stack

### 🎨 Frontend

| Teknologi | Fungsi |
|---|---|
| React.js | Membangun antarmuka dashboard |
| Vite | Development server dan build tool |
| React Router DOM | Routing halaman |
| Axios | Komunikasi API |
| Recharts | Grafik dashboard |
| Lucide React | Icon UI |
| jsPDF + jspdf-autotable | Export laporan PDF |
| CSS Custom | Styling antarmuka |

---

### ⚙️ Backend

| Teknologi | Fungsi |
|---|---|
| Node.js | Runtime backend |
| Express.js | REST API |
| MySQL2 | Koneksi database |
| CORS | Mengatur akses frontend-backend |
| Dotenv | Konfigurasi environment |
| Multer | Upload evidence image |
| Static file serving | Menampilkan bukti pelanggaran |

---

### 🤖 AI & Computer Vision

| Teknologi | Fungsi |
|---|---|
| Python | Bahasa utama AI service |
| OpenCV | Pemrosesan video dan frame |
| YOLOv8 | Model deteksi objek |
| Flask | AI service API |
| Flask-CORS | Akses lintas service |
| Requests | Mengirim data ke backend |
| NumPy | Pemrosesan array/image |

---

### 🗄️ Database & Notification

| Teknologi | Fungsi |
|---|---|
| MySQL | Menyimpan data sistem |
| Telegram Bot API | Mengirim notifikasi |
| Telegram Chat ID | Tujuan penerima notifikasi |

---

## 📁 Struktur Project

```text
CAPSTONE-A2-KELOMPOK11-FILKOM/
│
├── backend/
│   ├── db.js
│   ├── database.sql
│   ├── package.json
│   ├── package-lock.json
│   ├── server.js
│   └── uploads/
│       └── violations/
│
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── package-lock.json
│   ├── vite.config.js
│   └── src/
│       ├── components/
│       ├── pages/
│       ├── services/
│       ├── utils/
│       ├── App.jsx
│       ├── main.jsx
│       └── styles.css
│
├── model-ai/
│   ├── best.pt
│   └── opencv.py
│
├── .gitignore
└── README.md
```

---

## 🗄️ Persiapan Database

Pastikan MySQL sudah berjalan. Jika menggunakan XAMPP, nyalakan:

```text
MySQL
```

Buat database dan tabel dengan menjalankan file:

```text
backend/database.sql
```

Database yang digunakan:

```text
smart_k3_vision
```

Tabel utama:

```text
cameras
reports
users
```

---

## 📊 Struktur Tabel Reports

Kolom utama:

```text
id
area
camera_id
type
missing_items
image_path
timestamp
status
created_at
```

Contoh data:

| id | area | camera_id | type | missing_items | image_path | timestamp |
|---|---|---|---|---|---|---|
| RPT-xxxx | Webcam Test Area | CAM-LAPTOP | Missing helmet | helmet | /uploads/violations/VIO-xxxx.jpg | 2026-06-04 10:24:35 |

---

## 👤 Struktur Tabel Users

Kolom utama:

```text
id
name
username
password
role
status
created_at
```

Contoh akun demo:

```text
username: wahyu
password: wahyu123
role: supervisor
```

```text
username: manager
password: manager123
role: general_manager
```

---

## 🔐 Konfigurasi Environment

Buat file `.env` di folder backend:

```text
backend/.env
```

Isi konfigurasi:

```env
PORT=5000

DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=smart_k3_vision

UPLOAD_DIR=uploads/violations

TELEGRAM_BOT_TOKEN=isi_token_bot_telegram
TELEGRAM_CHAT_ID=isi_chat_id_telegram
```

> ⚠️ Jangan push file `.env` ke GitHub. Token Telegram wajib disimpan secara privat.

---

## ▶️ Cara Menjalankan Project

Project dijalankan menggunakan beberapa komponen:

```text
1. MySQL
2. Backend
3. Frontend
4. AI Service
5. Telegram Bot
```

Gunakan terminal terpisah untuk backend, frontend, dan AI service.

---

### 1. Menjalankan Backend

```bash
cd backend
npm install
npm run dev
```

Backend berjalan di:

```text
http://localhost:5000
```

Cek koneksi backend:

```text
http://localhost:5000/api/health
```

Jika berhasil:

```json
{
  "status": "ok",
  "database": "connected"
}
```

---

### 2. Menjalankan Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend berjalan di:

```text
http://localhost:5173
```

Halaman utama:

```text
http://localhost:5173/login
http://localhost:5173/dashboard
http://localhost:5173/live-camera
http://localhost:5173/reports
```

---

### 3. Menjalankan AI Service

```bash
cd model-ai
python -m venv venv
venv\Scripts\activate
python -m pip install ultralytics opencv-python requests flask flask-cors numpy
python opencv.py
```

AI service berjalan di:

```text
http://127.0.0.1:5055
```

Video feed:

```text
http://127.0.0.1:5055/video-feed
```

---

### 4. Konfigurasi Telegram

Langkah konfigurasi:

1. Buat bot melalui BotFather.
2. Simpan token bot pada `.env`.
3. Dapatkan Chat ID Telegram.
4. Masukkan `TELEGRAM_BOT_TOKEN` dan `TELEGRAM_CHAT_ID`.
5. Jalankan backend dan pastikan notifikasi berhasil terkirim.

Contoh:

```env
TELEGRAM_BOT_TOKEN=123456789:ABCDEF_your_bot_token
TELEGRAM_CHAT_ID=123456789
```

---

## 🧪 Status Pengujian

| Fitur | Status |
|---|---|
| Login dan role access | ✅ Berhasil |
| Dashboard monitoring | ✅ Berhasil |
| Live camera monitoring | ✅ Berhasil |
| Deteksi APD | ✅ Berhasil |
| Pencatatan pelanggaran otomatis | ✅ Berhasil |
| Evidence image | ✅ Berhasil |
| Reports dan Detail Report | ✅ Berhasil |
| Export PDF | ✅ Berhasil |
| Telegram Notification | ✅ Berhasil |
| Integrasi CCTV penuh | 🔄 Pengembangan lanjutan |

---

## 🚧 Catatan Pengembangan Lanjutan

Beberapa hal yang masih dapat dikembangkan:

- Optimasi akurasi model pada kondisi pencahayaan berbeda.
- Pengujian lebih lanjut pada CCTV pabrik.
- Peningkatan stabilitas koneksi RTSP.
- Pencatatan multiple violation dalam satu frame secara lebih optimal.
- Penguatan keamanan sistem dan audit log.
- Penyempurnaan dashboard analytics.
- Penyesuaian format notifikasi Telegram sesuai kebutuhan pengguna.

---

## 📍 Status Project

Project saat ini berada pada tahap **prototipe / proof of concept**. Sistem sudah dapat digunakan untuk demonstrasi fitur utama, yaitu:

- Live monitoring
- Deteksi APD
- Pencatatan pelanggaran otomatis
- Penyimpanan bukti visual
- Dashboard monitoring
- Reports dan Detail Report
- Export PDF
- Role-based access
- Notifikasi Telegram

---

## 👥 Kelompok 11 — Topik A.2

**Sistem Monitoring K3 & Disiplin Kerja Berbasis Computer Vision**

Dikembangkan untuk kebutuhan Capstone Project FILKOM UB 2026.
