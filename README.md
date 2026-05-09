# 🛡️ Smart K3 Vision Dashboard

**Smart K3 Vision Dashboard** adalah sistem monitoring K3 Smart-Factory berbasis **Computer Vision** untuk membantu pemantauan kepatuhan penggunaan APD pekerja secara realtime, terstruktur, dan terdokumentasi.

Project ini dikembangkan untuk mendukung:

> **Sistem Monitoring K3 Smart-Factory Berbasis Computer Vision untuk Meningkatkan Standar Keselamatan dan Disiplin Kerja di PT. Indonesia Epson Industry**

---

## 📌 Deskripsi Singkat

Sistem ini membaca input kamera laptop/webcam, kemudian memproses frame video menggunakan model **YOLO** untuk mendeteksi pekerja dan APD utama.

Model AI pada versi saat ini menggunakan **3 class deteksi**:

```text
person
helmet
vest
```

Jika sistem mendeteksi pekerja yang tidak menggunakan APD sesuai ketentuan, maka data pelanggaran akan dikirim ke backend, disimpan ke database **MySQL**, dan ditampilkan pada dashboard monitoring.

Jenis pelanggaran yang digunakan pada sistem:

```text
Missing All PPE
Missing helmet
Missing vest
```

Pada dashboard, pelanggaran tersebut diringkas ke dalam kategori:

```text
No Helmet
No Vest
Multiple PPE
```

Keterangan:

- `No Helmet` berarti pekerja terdeteksi tidak menggunakan helmet.
- `No Vest` berarti pekerja terdeteksi tidak menggunakan vest.
- `Multiple PPE` berarti pekerja tidak menggunakan lebih dari satu APD. Pada versi 3 class ini, artinya helmet dan vest sama-sama tidak terdeteksi.

---

## 🧠 Alur Sistem

```text
Kamera Laptop / Webcam
        ↓
AI Service Python
        ↓
OpenCV + YOLO Detection
        ↓
Deteksi Person, Helmet, Vest
        ↓
Cek Kelengkapan APD
        ↓
Kirim Data Pelanggaran ke Backend
        ↓
Backend Express Menyimpan Data ke MySQL
        ↓
Frontend React Menampilkan Dashboard, Live Camera, dan Reports
```

---

## 🧩 Fitur Utama

### 📊 Dashboard Monitoring

Dashboard utama menampilkan ringkasan kondisi monitoring K3, seperti:

- Total Violations
- Most Frequent Violation
- Monitoring Coverage
- Compliance Rate
- Daily Violations Chart
- Violation Types Overview
- Recent Reports
- Pagination pada Recent Reports
- Filter tanggal
- Refresh data dashboard

---

### 🎥 Live Camera

Halaman **Live Camera** menampilkan daftar kamera monitoring.

Fitur ini mencakup:

- daftar kamera,
- status kamera `Active` atau `Inactive`,
- lokasi kamera,
- halaman detail kamera,
- tampilan live stream kamera,
- tampilan hasil deteksi YOLO beserta bounding box pada halaman detail kamera.

Pada versi saat ini, kamera utama yang digunakan untuk demo adalah:

```text
CAM-LAPTOP
Laptop Webcam
```

Live stream deteksi YOLO ditampilkan melalui endpoint AI service:

```text
http://localhost:8000/video-feed
```

---

### 🚨 Reports

Halaman **Reports** menampilkan daftar laporan pelanggaran yang masuk dari AI service.

Data report berisi:

- ID laporan,
- area,
- ID kamera,
- tipe pelanggaran,
- timestamp,
- status laporan,
- tombol detail report.

Reports juga sudah menggunakan pagination agar tampilan tidak terlalu panjang ke bawah.

---

### 📄 Report Detail

Halaman detail report digunakan untuk melihat informasi detail dari laporan pelanggaran tertentu.

---

### 📄 Export PDF

Sistem menyediakan fitur export laporan ke PDF untuk kebutuhan dokumentasi atau pelaporan.

---

### 🤖 AI Detection Service

AI service berjalan menggunakan Python, OpenCV, Flask, dan Ultralytics YOLO.

Terdapat dua file utama pada folder `model-ai`:

```text
opencv.py
stream.py
```

Keterangan:

- `opencv.py` digunakan untuk menjalankan deteksi melalui OpenCV.
- `stream.py` digunakan untuk menjalankan AI stream agar hasil kamera + bounding box dapat tampil di halaman Live Camera dashboard.

---

### 🔐 Login Page

Project juga memiliki tampilan Login Page berbasis frontend.

Pada versi saat ini, login masih berupa implementasi frontend/local demo. Pengembangan selanjutnya dapat diarahkan ke autentikasi backend berbasis database user.

Rencana role access:

```text
Supervisor:
- Dashboard
- Live Camera
- Reports
- Analytics
- Settings

General Manager:
- Dashboard
- Reports
```

Role tidak dipilih manual oleh user, tetapi sebaiknya ditentukan berdasarkan akun yang terdaftar pada database user.

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
```

### AI Service

- Python
- OpenCV
- Flask
- Flask-CORS
- Ultralytics YOLO
- Requests

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
│   └── server.js
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
│       │   └── auth.js
│       ├── App.jsx
│       ├── main.jsx
│       └── styles.css
│
├── model-ai/
│   ├── best.pt
│   ├── opencv.py
│   └── stream.py
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

Jika menggunakan port MySQL `3307`, pastikan konfigurasi `.env` backend juga menggunakan port tersebut.

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
```

Jika MySQL menggunakan port `3306`, ubah menjadi:

```env
DB_PORT=3306
```

File `.env` tidak perlu di-push ke GitHub.

---

## 🚀 Cara Menjalankan Project

Project ini dijalankan menggunakan **4 komponen utama**:

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

Pastikan database `smart_k3_vision` sudah tersedia dan tabel sudah dibuat.

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

Jika berhasil, akan muncul:

```json
{
  "status": "ok",
  "database": "connected"
}
```

---

## 3️⃣ Menjalankan Frontend

Buka terminal baru, lalu masuk ke folder frontend:

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

Halaman utama dashboard:

```text
http://localhost:5173/dashboard
```

Halaman live camera:

```text
http://localhost:5173/live-camera
```

Detail laptop webcam:

```text
http://localhost:5173/live-camera/CAM-LAPTOP
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

Install library Python jika belum:

```bash
python -m pip install ultralytics opencv-python requests flask flask-cors
```

Untuk menjalankan deteksi OpenCV biasa:

```bash
python opencv.py
```

Untuk menjalankan stream agar tampil di dashboard Live Camera:

```bash
python stream.py
```

AI stream berjalan di:

```text
http://localhost:8000
```

Cek stream kamera:

```text
http://localhost:8000/video-feed
```

Jika berhasil, browser akan menampilkan live camera dengan bounding box hasil deteksi YOLO.

---

## 🔗 Endpoint API Backend

### Health Check

```http
GET /api/health
```

Digunakan untuk mengecek apakah backend dan database berjalan.

---

### Dashboard Data

```http
GET /api/dashboard
```

Dengan filter tanggal:

```http
GET /api/dashboard?date=2026-05-10
```

Digunakan frontend untuk mengambil data statistik dashboard.

---

### Cameras

```http
GET /api/cameras
GET /api/cameras/:id
```

Digunakan untuk mengambil data kamera dan detail kamera.

---

### Reports

```http
GET /api/reports
GET /api/reports/:id
POST /api/reports
```

Endpoint `POST /api/reports` digunakan oleh AI service untuk mengirim data pelanggaran ke backend.

Contoh payload:

```json
{
  "area": "Webcam Test Area",
  "cameraId": "CAM-LAPTOP",
  "type": "Missing All PPE",
  "reportStatus": "New",
  "image": ""
}
```

---

### Violation Ingest

```http
POST /api/violations/ingest
```

Endpoint ini disiapkan untuk menerima data pelanggaran dari AI service, termasuk kemungkinan upload evidence image.

---

## 🧪 Cara Kerja Deteksi APD

Model YOLO mendeteksi 3 class utama:

| Class | Keterangan |
|---|---|
| person | Pekerja / manusia |
| helmet | Helm keselamatan |
| vest | Rompi keselamatan |

Sistem akan mengecek apakah helmet dan vest terdeteksi pada area pekerja.

Contoh hasil deteksi:

```text
SAFE
```

Jika pekerja menggunakan helmet dan vest.

```text
Missing helmet
```

Jika helmet tidak terdeteksi.

```text
Missing vest
```

Jika vest tidak terdeteksi.

```text
Missing All PPE
```

Jika helmet dan vest sama-sama tidak terdeteksi.

---

## 📊 Mapping Tipe Pelanggaran Dashboard

Data report asli yang tersimpan di database dapat berupa:

```text
Missing helmet
Missing vest
Missing All PPE
```

Sedangkan pada Violation Types Overview, data diringkas menjadi:

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

## 📊 Contoh Output Report

Ketika AI service mendeteksi pelanggaran, data akan otomatis masuk ke backend dan disimpan ke MySQL.

| ID | Area | Camera | Type | Timestamp | Status |
|---|---|---|---|---|---|
| RPT-1777939851484 | Webcam Test Area | CAM-LAPTOP | Missing All PPE | 2026-05-10 07:10:51 | New |

---

## 🧭 Status Project Saat Ini

| Komponen | Status |
|---|---|
| Frontend Dashboard | ✅ Berjalan |
| Backend API | ✅ Berjalan |
| Database MySQL | ✅ Berjalan |
| AI Service YOLO 3 Class | ✅ Berjalan |
| Kamera Laptop | ✅ Berhasil |
| Live Camera Stream ke Dashboard | ✅ Berhasil |
| Realtime Report ke MySQL | ✅ Berhasil |
| Reports Pagination | ✅ Berhasil |
| Export PDF | ✅ Tersedia |
| Login Page UI | ✅ Tersedia |
| Role Access Backend | ⏳ Pengembangan lanjutan |
| Google OAuth | ⏳ Belum diimplementasikan |
| RTSP CCTV Asli | ⏳ Menyesuaikan akses kamera |

---

## ⚠️ Catatan Penting

- Sistem deteksi saat ini menggunakan 3 class: `person`, `helmet`, dan `vest`.
- Class `shoes` dan `gloves` tidak digunakan pada versi saat ini.
- Data report sudah tersimpan di MySQL, sehingga tidak hilang saat backend direstart.
- Untuk demo lokal, kamera laptop dapat digunakan sebagai sumber input.
- Jika ingin menggunakan CCTV/IP Camera, pastikan RTSP URL benar dan perangkat berada pada jaringan yang sama.
- File `.env`, `node_modules`, dan `.venv` tidak perlu di-push ke GitHub.
- Jika setelah clone project folder `node_modules` tidak ada, jalankan `npm install` pada folder `backend` dan `frontend`.

---

## 🧪 Urutan Demo yang Disarankan

```text
1. Start MySQL
2. Jalankan backend
3. Cek http://localhost:5000/api/health
4. Jalankan frontend
5. Buka http://localhost:5173/dashboard
6. Jalankan AI stream dengan python stream.py
7. Buka http://localhost:5173/live-camera/CAM-LAPTOP
8. Tunjukkan kamera live dengan bounding box
9. Tunjukkan report masuk ke dashboard dan halaman reports
10. Tunjukkan data tersimpan di MySQL
```

---

## 🔮 Pengembangan Selanjutnya

Beberapa fitur yang dapat dikembangkan:

- autentikasi backend berbasis database user,
- role access untuk Supervisor dan General Manager,
- approval akun baru,
- Google OAuth,
- halaman user management,
- upload dan penyimpanan gambar bukti pelanggaran,
- notifikasi realtime saat pelanggaran terdeteksi,
- integrasi RTSP CCTV asli,
- deployment backend dan frontend.

---

## 👥 Tim Pengembang

Project ini dikembangkan sebagai bagian dari project capstone dengan fokus pada penerapan:

- Computer Vision,
- Smart Factory,
- Monitoring K3,
- Dashboard Analytics,
- integrasi sistem berbasis API,
- penyimpanan data menggunakan database MySQL.

---

## 📌 Kesimpulan

Smart K3 Vision Dashboard berhasil mengintegrasikan model computer vision dengan sistem dashboard monitoring K3. Kamera diproses menggunakan OpenCV dan YOLO untuk mendeteksi pekerja serta penggunaan APD berupa helmet dan vest. Jika ditemukan pelanggaran, data dikirim ke backend, disimpan ke MySQL, dan ditampilkan pada dashboard secara realtime sehingga proses pemantauan keselamatan kerja dapat dilakukan dengan lebih cepat, rapi, dan terdokumentasi.
