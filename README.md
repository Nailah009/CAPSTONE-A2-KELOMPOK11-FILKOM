# 🛡️ Smart K3 Vision Dashboard

**Smart K3 Vision Dashboard** adalah sistem monitoring K3 Smart-Factory berbasis **Computer Vision** untuk membantu pemantauan kepatuhan penggunaan APD pekerja secara realtime, terstruktur, dan terdokumentasi.

Project ini dikembangkan untuk mendukung:

> **Sistem Monitoring K3 Smart-Factory Berbasis Computer Vision untuk Meningkatkan Standar Keselamatan dan Disiplin Kerja di PT. Indonesia Epson Industry**

---

## 📌 Deskripsi Singkat

Sistem membaca input kamera laptop/webcam atau CCTV, lalu memproses frame menggunakan **YOLO** untuk mendeteksi pekerja dan APD utama.

Model AI versi saat ini menggunakan **3 class**:

```text
person
helmet
vest
```

Jika pekerja tidak menggunakan APD sesuai ketentuan, sistem akan membuat report pelanggaran, menyimpan bukti gambar, mengirim data ke backend, menyimpan data ke MySQL, lalu menampilkan laporan pada dashboard.

Jenis pelanggaran yang digunakan:

```text
Missing All PPE
Missing helmet
Missing vest
```

Mapping deteksi:

| Kondisi | Label Live Camera | Type Reports | Missing Items |
|---|---|---|---|
| Helmet dan vest lengkap | COMPLETED / AMAN | Tidak masuk report | - |
| Helmet tidak terdeteksi | MISSING: HELMET | Missing helmet | helmet |
| Vest tidak terdeteksi | MISSING: VEST | Missing vest | vest |
| Helmet dan vest tidak terdeteksi | MISSING ALL PPE | Missing All PPE | helmet, vest |

Data aman tidak disimpan ke reports, karena reports hanya mencatat pelanggaran.

---

## 🧠 Alur Sistem

```text
Kamera Laptop / Webcam / CCTV
        ↓
AI Service Python
        ↓
OpenCV + YOLO Detection
        ↓
Deteksi Person, Helmet, Vest
        ↓
Cek Kelengkapan APD
        ↓
Capture Bukti Pelanggaran
        ↓
Simpan Gambar ke Backend Uploads
        ↓
Kirim Data Pelanggaran ke Backend API
        ↓
Backend Express Menyimpan Data ke MySQL
        ↓
Frontend React Menampilkan Dashboard, Live Camera, Reports, dan Detail Report
```

---

## 🧩 Fitur Utama

### 📊 Dashboard Monitoring

Dashboard utama menampilkan:

- Total Violations
- Most Frequent Violation
- Monitoring Coverage
- Compliance Rate
- Daily Violations Chart
- Violation Types Overview
- Recent Reports
- Filter tanggal
- Refresh data dashboard
- Pagination Recent Reports
- Tombol Lihat Detail pada report terbaru

### 🎥 Live Camera

Halaman **Live Camera** menampilkan daftar kamera monitoring.

Fitur Live Camera:

- daftar kamera,
- status `Active` atau `Inactive`,
- lokasi kamera,
- halaman detail kamera,
- live stream kamera,
- hasil deteksi YOLO dengan bounding box,
- warna bounding box berdasarkan status APD.

Mapping warna bounding box:

| Warna | Kondisi | Label |
|---|---|---|
| Hijau | APD lengkap | COMPLETED / AMAN |
| Kuning | Salah satu APD tidak terdeteksi | MISSING: HELMET / MISSING: VEST |
| Merah | Helmet dan vest tidak terdeteksi | MISSING ALL PPE |

Kamera utama demo lokal:

```text
CAM-LAPTOP
Laptop Webcam
```

AI stream berjalan di:

```text
http://127.0.0.1:5055/video-feed
```

### 🚨 Reports

Halaman Reports menampilkan daftar laporan pelanggaran.

Kolom tabel:

```text
ID
Area
Camera
Type
Timestamp
Action
```

Filter type selalu menyediakan:

```text
All
Missing All PPE
Missing helmet
Missing vest
```

Jika filter dipilih tetapi data belum tersedia, tabel akan kosong. Ini normal karena filter digunakan untuk memilih jenis laporan yang ingin dilihat atau dicetak.

### 📄 Detail Report

Halaman Detail Report menampilkan:

- ID
- Area
- Camera
- Type
- Timestamp
- Violation Evidence

Bukti pelanggaran diambil dari kolom `image_path` pada database. File gambar aslinya disimpan di backend:

```text
backend/uploads/violations/
```

Contoh URL gambar yang tersimpan di database:

```text
http://localhost:5000/uploads/violations/VIO-20260512015230.jpg
```

Dengan alur ini, gambar bukti tetap dapat diakses selama backend berjalan, meskipun AI service sedang tidak dijalankan.

### 📄 Export PDF

Sistem menyediakan fitur export laporan ke PDF berdasarkan filter area dan type.

### 🔐 Login

Login menggunakan:

```text
username
password
```

Tidak ada register user dari frontend. Akun dikelola melalui database oleh admin/pengelola sistem.

Role:

| Role | Akses |
|---|---|
| Supervisor | Dashboard, Live Camera, Reports, Analytics, Settings |
| General Manager | Dashboard, Reports |

---

## 🛠️ Tech Stack

### Frontend

- React.js
- Vite
- React Router DOM
- Axios
- Recharts
- Lucide React
- jsPDF
- jspdf-autotable
- CSS Custom

### Backend

- Node.js
- Express.js
- MySQL2
- CORS
- Dotenv
- Multer
- REST API
- Static file serving untuk evidence images

### Database

- MySQL

Database name:

```text
smart_k3_vision
```

Tabel utama:

```text
cameras
reports
users
```

### AI Service

- Python
- OpenCV
- Flask
- Flask-CORS
- Ultralytics YOLO
- Requests
- NumPy

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
│       │   └── Layout.jsx
│       ├── pages/
│       │   ├── CameraDetailPage.jsx
│       │   ├── DashboardPage.jsx
│       │   ├── LiveCameraPage.jsx
│       │   ├── LoginPage.jsx
│       │   ├── ReportsPage.jsx
│       │   └── ReportDetailPage.jsx
│       ├── services/
│       │   └── api.js
│       ├── utils/
│       │   ├── auth.js
│       │   └── timeStatus.js
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

## ⚙️ Persiapan Database MySQL

Pastikan MySQL sudah berjalan. Jika menggunakan XAMPP, nyalakan:

```text
MySQL
```

Buat database dan tabel dengan menjalankan:

```text
backend/database.sql
```

Database:

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

## 🗃️ Struktur Tabel Reports

Kolom utama:

```text
id
area
camera_id
type
missing_items
image_path
timestamp
created_at
```

Contoh data:

| id | area | camera_id | type | missing_items | image_path | timestamp |
|---|---|---|---|---|---|---|
| RPT-1777939851484 | Webcam Test Area | CAM-LAPTOP | Missing All PPE | helmet, vest | http://localhost:5000/uploads/violations/VIO-xxxx.jpg | 2026-05-12 07:10:51 |

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

## 🔐 Konfigurasi Backend `.env`

Buat file `.env` di folder `backend`:

```text
backend/.env
```

Isi:

```env
PORT=5000

DB_HOST=127.0.0.1
DB_PORT=3307
DB_USER=root
DB_PASSWORD=
DB_NAME=smart_k3_vision

UPLOAD_DIR=uploads/violations
```

Jika MySQL menggunakan port default XAMPP:

```env
DB_PORT=3306
```

File `.env` tidak perlu di-push ke GitHub.

---

## 🚀 Cara Menjalankan Project

Project dijalankan menggunakan 4 komponen:

```text
1. MySQL
2. Backend
3. Frontend
4. AI Service
```

Gunakan terminal terpisah untuk backend, frontend, dan AI service.

---

## 1️⃣ Menjalankan MySQL

Jika menggunakan XAMPP:

```text
Start MySQL
```

Pastikan database `smart_k3_vision` sudah tersedia dan tabel sudah dibuat dari `backend/database.sql`.

---

## 2️⃣ Menjalankan Backend

Masuk ke folder backend:

```bash
cd backend
```

Install dependency:

```bash
npm install
```

Jalankan backend:

```bash
npm run dev
```

Backend berjalan di:

```text
http://localhost:5000
```

Cek health endpoint:

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

Backend juga menyajikan evidence image:

```text
http://localhost:5000/uploads/violations/NAMA_FILE.jpg
```

---

## 3️⃣ Menjalankan Frontend

Masuk ke folder frontend:

```bash
cd frontend
```

Install dependency:

```bash
npm install
```

Jalankan frontend:

```bash
npm run dev
```

Frontend berjalan di:

```text
http://localhost:5173
```

Halaman penting:

```text
http://localhost:5173/login
http://localhost:5173/dashboard
http://localhost:5173/live-camera
http://localhost:5173/live-camera/CAM-LAPTOP
http://localhost:5173/reports
```

---

## 4️⃣ Menjalankan AI Service

Masuk ke folder model AI:

```bash
cd model-ai
```

Aktifkan virtual environment:

```powershell
.\.venv\Scripts\Activate.ps1
```

Jika PowerShell memblokir script:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
```

Install library Python:

```bash
python -m pip install ultralytics opencv-python requests flask flask-cors numpy
```

Jalankan AI service:

```bash
python opencv.py
```

AI stream berjalan di:

```text
http://127.0.0.1:5055
```

Cek stream:

```text
http://127.0.0.1:5055/video-feed
```

---

## 🔗 Endpoint API Backend

### Health Check

```http
GET /api/health
```

### Auth Login

```http
POST /api/auth/login
```

Contoh payload:

```json
{
  "username": "wahyu",
  "password": "wahyu123"
}
```

### Dashboard Data

```http
GET /api/dashboard
```

Dengan filter tanggal:

```http
GET /api/dashboard?date=2026-05-12
```

### Cameras

```http
GET /api/cameras
GET /api/cameras/:id
```

### Reports

```http
GET /api/reports
GET /api/reports/:id
POST /api/reports
```

Contoh payload dari AI service:

```json
{
  "area": "Webcam Test Area",
  "cameraId": "CAM-LAPTOP",
  "type": "Missing All PPE",
  "missingItems": "helmet, vest",
  "imagePath": "http://localhost:5000/uploads/violations/VIO-20260512015230.jpg",
  "timestamp": "2026-05-12 07:10:51"
}
```

---

## 🧪 Cara Kerja Deteksi APD

Model YOLO mendeteksi 3 class utama:

| Class | Keterangan |
|---|---|
| person | Pekerja / manusia |
| helmet | Helm keselamatan |
| vest | Rompi keselamatan |

Contoh hasil live camera:

```text
COMPLETED
```

Jika pekerja menggunakan helmet dan vest.

```text
MISSING: HELMET
```

Jika helmet tidak terdeteksi.

```text
MISSING: VEST
```

Jika vest tidak terdeteksi.

```text
MISSING ALL PPE
```

Jika helmet dan vest sama-sama tidak terdeteksi.

---

## 📊 Mapping Tipe Pelanggaran Dashboard

Data report di database:

```text
Missing helmet
Missing vest
Missing All PPE
```

Pada Violation Types Overview, data diringkas menjadi:

```text
No Helmet
No Vest
Multiple PPE
```

Mapping:

| Report Type | Dashboard Category |
|---|---|
| Missing helmet | No Helmet |
| Missing vest | No Vest |
| Missing All PPE | Multiple PPE |

---

## 🧭 Urutan Demo yang Disarankan

```text
1. Start MySQL
2. Jalankan backend
3. Cek http://localhost:5000/api/health
4. Jalankan frontend
5. Login sebagai supervisor
6. Buka dashboard
7. Jalankan AI service dengan python opencv.py
8. Buka Live Camera Detail CAM-LAPTOP
9. Tunjukkan bounding box hijau/kuning/merah
10. Tunjukkan report masuk ke database dan halaman Reports
11. Buka Detail Report untuk melihat evidence image
12. Matikan AI service, lalu buka kembali Detail Report untuk membuktikan evidence tetap muncul selama backend berjalan
13. Export PDF dari halaman Reports
```

---

## 🧭 Status Project Saat Ini

| Komponen | Status |
|---|---|
| Frontend Dashboard | ✅ Berjalan |
| Backend API | ✅ Berjalan |
| Database MySQL | ✅ Berjalan |
| Login username/password | ✅ Berjalan |
| Role access Supervisor / General Manager | ✅ Tersedia |
| AI Service YOLO 3 Class | ✅ Berjalan |
| Kamera Laptop | ✅ Berhasil |
| Live Camera Stream ke Dashboard | ✅ Berhasil |
| Realtime Report ke MySQL | ✅ Berhasil |
| Evidence Image dari Backend Uploads | ✅ Berhasil |
| Reports Filter | ✅ Berhasil |
| Reports Pagination | ✅ Berhasil |
| Detail Report | ✅ Berhasil |
| Export PDF | ✅ Tersedia |
| Google OAuth / SSO | ❌ Tidak digunakan |
| Register User | ❌ Tidak digunakan |
| RTSP CCTV Asli | ⏳ Menyesuaikan akses kamera |

---

## ⚠️ Catatan Penting

- Sistem deteksi saat ini hanya menggunakan 3 class: `person`, `helmet`, dan `vest`.
- Class `shoes` dan `gloves` tidak digunakan pada versi saat ini.
- Data report tersimpan di MySQL, sehingga tidak hilang saat backend direstart.
- Evidence image disimpan pada `backend/uploads/violations`.
- Database menyimpan URL gambar pada kolom `image_path`.
- Evidence image dapat diakses selama backend berjalan.
- File `.env`, `node_modules`, `.venv`, dan hasil capture evidence tidak perlu di-push ke GitHub.
- Jika ingin menggunakan CCTV/IP Camera, pastikan RTSP URL benar dan perangkat berada pada jaringan yang sama.
- Password pada versi demo masih sederhana. Untuk production, gunakan hashing seperti bcrypt.

---

## 🔮 Pengembangan Selanjutnya

- user management untuk admin,
- hashing password menggunakan bcrypt,
- audit log perubahan user,
- notifikasi realtime saat pelanggaran terdeteksi,
- integrasi RTSP CCTV asli,
- dashboard analytics lanjutan,
- deployment backend dan frontend.

---

## 👥 Tim Pengembang

Project ini dikembangkan sebagai bagian dari project capstone dengan fokus pada:

- Computer Vision,
- Smart Factory,
- Monitoring K3,
- Dashboard Analytics,
- integrasi sistem berbasis API,
- penyimpanan data menggunakan database MySQL.

---

## 📌 Kesimpulan

Smart K3 Vision Dashboard berhasil mengintegrasikan model computer vision dengan sistem dashboard monitoring K3. Kamera diproses menggunakan OpenCV dan YOLO untuk mendeteksi pekerja serta penggunaan APD berupa helmet dan vest. Jika ditemukan pelanggaran, sistem menyimpan bukti gambar, mengirim data ke backend, menyimpan laporan ke MySQL, dan menampilkan hasilnya pada dashboard secara realtime.
