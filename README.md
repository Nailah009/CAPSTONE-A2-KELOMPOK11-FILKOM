# 🛡️ Smart K3 Vision Dashboard

**Smart K3 Vision Dashboard** adalah sistem monitoring K3 Smart-Factory berbasis **Computer Vision** yang digunakan untuk membantu pemantauan kepatuhan penggunaan APD pekerja secara lebih cepat, terstruktur, dan terdokumentasi.

Project ini dikembangkan untuk mendukung:

> **Sistem Monitoring K3 Smart-Factory Berbasis Computer Vision untuk Meningkatkan Standar Keselamatan dan Disiplin Kerja di PT. Indonesia Epson Industry**

---

## 📌 Deskripsi Singkat

Sistem ini membaca input kamera, kemudian memproses frame video menggunakan model **YOLO** untuk mendeteksi objek pekerja dan atribut APD seperti **helmet, vest, shoes, dan gloves**.

Jika sistem mendeteksi pekerja yang tidak menggunakan APD lengkap, maka data pelanggaran akan dikirim ke backend dan ditampilkan secara realtime pada dashboard monitoring.

Dashboard ini membantu supervisor untuk melihat:

- jumlah pelanggaran K3,
- jenis pelanggaran paling sering,
- status kamera,
- laporan pelanggaran,
- detail pelanggaran,
- serta export laporan ke PDF.

---

## 🧠 Alur Sistem

```text
Kamera / Webcam / CCTV
        ↓
OpenCV Video Processing
        ↓
YOLO Object Detection
        ↓
Deteksi Person + APD
        ↓
Cek Kelengkapan APD
        ↓
Kirim Data Pelanggaran ke Backend
        ↓
Dashboard Menampilkan Data Realtime
```

---

## 🧩 Fitur Utama

### 📊 Dashboard Monitoring

Menampilkan ringkasan kondisi monitoring K3, seperti:

- Total Violations
- Most Frequent Violation
- Monitoring Coverage
- Compliance Rate
- Daily Violations Chart
- Violation Types Overview
- Recent Reports

### 🎥 Live Camera

Menampilkan daftar kamera yang digunakan untuk monitoring area kerja.

Fitur ini mencakup daftar kamera, status kamera aktif/tidak aktif, lokasi kamera, dan halaman detail kamera.

### 🚨 Reports

Menampilkan daftar pelanggaran yang terdeteksi oleh sistem.

Data report berisi ID pelanggaran, area, ID kamera, tipe pelanggaran, timestamp, dan status laporan.

### 📄 Export PDF

Sistem menyediakan fitur export laporan ke PDF untuk kebutuhan dokumentasi atau pelaporan.

### 🤖 AI Detection Service

AI service berjalan menggunakan Python, OpenCV, dan YOLO.

Model mendeteksi class berikut:

```text
person
helmet
vesT
```

Jika APD tidak lengkap, sistem akan mengirimkan report seperti:

```text
Missing All PPE
Missing helmet
Missing vest
```

---

## 🛠️ Tech Stack

### Frontend

- React.js
- Vite
- Recharts
- Lucide React
- jsPDF
- jspdf-autotable
- CSS Custom

### Backend

- Node.js
- Express.js
- REST API
- CORS

### AI Service

- Python
- OpenCV
- Ultralytics YOLO
- Requests

### Database

Saat ini sistem **belum menggunakan database permanen**. Data report masih disimpan sementara di memory backend.

Untuk pengembangan berikutnya, sistem dapat menggunakan PostgreSQL, MySQL, atau MongoDB.

---

## 📁 Struktur Project

```text
smart-k3-vision-dashboard/
│
├── backend/
│   ├── server.js
│   ├── package.json
│   └── node_modules/
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── App.jsx
│   │   └── styles.css
│   ├── package.json
│   └── vite.config.js
│
└── ai-service/
    ├── opencv.py
    ├── test.py
    ├── best.pt
    └── .venv/
```

---

## 🚀 Cara Menjalankan Project

Project ini dijalankan menggunakan **3 terminal berbeda**:

```text
Terminal 1 → Backend
Terminal 2 → Frontend
Terminal 3 → AI Service
```

---

## 1️⃣ Menjalankan Backend

Masuk ke folder backend:

```bash
cd backend
```

Install dependency:

```bash
npm install
```

Jalankan server:

```bash
npm run dev
```

Backend akan berjalan di:

```text
http://localhost:5000
```

Untuk mengecek backend:

```text
http://localhost:5000/api/health
```

Jika berhasil, akan muncul:

```json
{
  "status": "ok"
}
```

---

## 2️⃣ Menjalankan Frontend

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

Frontend akan berjalan di:

```text
http://localhost:5173
```

Buka dashboard melalui browser:

```text
http://localhost:5173/dashboard
```

---

## 3️⃣ Menjalankan AI Service

Masuk ke folder AI service:

```bash
cd ai-service
```

Aktifkan virtual environment:

```powershell
.\.venv\Scripts\Activate.ps1
```

Jika PowerShell memblokir script, jalankan:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
```

Install library Python jika belum:

```bash
python -m pip install ultralytics opencv-python requests
```

Jalankan AI service:

```bash
python opencv.py
```

Jika berhasil, terminal akan menampilkan log seperti:

```text
[INGEST] Kamera berhasil dibuka!
[YOLO] Class model: {0: 'person', 1: 'helmet', 2: 'vest', 3: 'shoes', 4: 'gloves'}
[API] Pelanggaran terkirim: Missing All PPE
```

---

## 🔗 Endpoint API

### Health Check

```http
GET /api/health
```

Digunakan untuk mengecek apakah backend berjalan.

### Dashboard Data

```http
GET /api/dashboard
```

Digunakan frontend untuk mengambil data statistik dashboard.

### Cameras

```http
GET /api/cameras
GET /api/cameras/:id
```

Digunakan untuk mengambil data kamera dan detail kamera.

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
  "timestamp": "2026-05-05 07:10:51",
  "reportStatus": "New",
  "image": ""
}
```

---

## 🧪 Cara Kerja Deteksi APD

Model YOLO mendeteksi beberapa objek utama:

| Class | Keterangan |
|---|---|
| person | Pekerja / manusia |
| helmet | Helm keselamatan |
| vest | Rompi keselamatan |
| shoes | Sepatu keselamatan |
| gloves | Sarung tangan |

Sistem akan mengecek apakah APD berada pada area bounding box pekerja. Jika ada APD yang tidak terdeteksi, maka sistem akan menandai kondisi tersebut sebagai pelanggaran.

Contoh hasil:

```text
AMAN
```

Jika APD lengkap.

```text
Missing helmet
```

Jika helm tidak terdeteksi.

```text
Missing All PPE
```

Jika semua APD tidak terdeteksi.

---

## 📊 Contoh Output di Dashboard

Ketika AI service mendeteksi pelanggaran, data akan otomatis masuk ke dashboard.

| ID | Area | Camera | Type | Timestamp | Status |
|---|---|---|---|---|---|
| RPT-1777939851484 | Webcam Test Area | CAM-LAPTOP | Missing All PPE | 2026-05-05 07:10:51 | New |

---

## ⚠️ Catatan Penting

- Dashboard sudah bisa menerima data realtime dari AI service.
- Untuk demo lokal, kamera laptop dapat digunakan sebagai sumber input.
- Jika ingin menggunakan CCTV/IP Camera, pastikan RTSP URL benar dan laptop berada di jaringan yang sama.
- Data report saat ini masih tersimpan sementara di backend memory.
- Jika backend direstart, data report yang masuk akan hilang.
- Untuk versi production, sistem sebaiknya menggunakan database seperti PostgreSQL atau MySQL.

---

## 🧭 Status Project Saat Ini

| Komponen | Status |
|---|---|
| Frontend Dashboard | ✅ Berjalan |
| Backend API | ✅ Berjalan |
| AI Service YOLO | ✅ Berjalan |
| Kamera Laptop | ✅ Berhasil |
| Realtime Report ke Dashboard | ✅ Berhasil |
| Export PDF | ✅ Tersedia |
| Database Permanen | ⏳ Belum |
| RTSP CCTV Asli | ⏳ Menyesuaikan akses kamera |

---

## 🔮 Pengembangan Selanjutnya

Beberapa fitur yang dapat dikembangkan:

- integrasi database PostgreSQL/MySQL,
- upload dan penyimpanan gambar bukti pelanggaran,
- autentikasi login supervisor/admin,
- filter laporan berdasarkan tanggal, kamera, dan tipe pelanggaran,
- status penanganan laporan seperti New, In Review, Resolved,
- notifikasi realtime saat pelanggaran terdeteksi,
- penggunaan CCTV/IP Camera melalui RTSP,
- deployment backend dan frontend.

---

## 👥 Tim Pengembang

Project ini dikembangkan sebagai bagian dari project capstone dengan fokus pada penerapan:

- Computer Vision,
- Smart Factory,
- Monitoring K3,
- Dashboard Analytics,
- integrasi sistem berbasis API.

---

## 📌 Kesimpulan

Smart K3 Vision Dashboard berhasil mengintegrasikan modul computer vision dengan sistem dashboard monitoring. Kamera diproses menggunakan OpenCV dan YOLO untuk mendeteksi kelengkapan APD pekerja. Jika ditemukan pelanggaran, data dikirim ke backend dan ditampilkan secara realtime pada dashboard sehingga supervisor dapat memantau kondisi keselamatan kerja secara lebih cepat, rapi, dan terdokumentasi.
