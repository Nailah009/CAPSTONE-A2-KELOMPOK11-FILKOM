

## ￿ Smart K3 Vision Dashboard
Smart K3 Vision Dashboardadalah sistem monitoring K3 Smart-Factory
berbasisComputer Visionyang digunakan untuk membantu pemantauan
kepatuhan penggunaan APD pekerja secara realtime, terstruktur, dan terdoku-
mentasi.
Project ini dikembangkan untuk mendukung:
Sistem Monitoring K3 Smart-Factory Berbasis Computer
Vision untuk Meningkatkan Standar Keselamatan dan Disi-
plin Kerja di PT. Indonesia Epson Industry
## ￿ Deskripsi Singkat
Sistem ini membaca input kamera laptop/webcam, kemudian memproses frame
video menggunakan modelYOLOuntuk mendeteksi pekerja dan APD utama.
Model AI pada versi saat ini menggunakan3 class deteksi:
person
helmet
vest
Jika sistem mendeteksi pekerja yang tidak menggunakan APD sesuai ketentuan,
maka data pelanggaran akan dikirim ke backend, disimpan ke database MySQL,
dan ditampilkan pada dashboard monitoring.
Jenis pelanggaran yang digunakan pada sistem:
Missing All PPE
Missing helmet
Missing vest
Pada dashboard, pelanggaran tersebut diringkas ke dalam kategori:
## No Helmet
## No Vest
Multiple PPE
## Keterangan:
•No Helmetberarti pekerja terdeteksi tidak menggunakan helmet.
•No Vestberarti pekerja terdeteksi tidak menggunakan vest.
•Multiple PPEberarti pekerja tidak menggunakan lebih dari satu APD.
Dalam sistem ini, artinya helmet dan vest sama-sama tidak terdeteksi.
## 1

## ￿ Alur Sistem
## Kamera Laptop / Webcam
## ↓
AI Service Python
## ↓
OpenCV + YOLO Detection
## ↓
## Deteksi Person, Helmet, Vest
## ↓
Cek Kelengkapan APD
## ↓
Kirim Data Pelanggaran ke Backend
## ↓
Backend Express Menyimpan Data ke MySQL
## ↓
Frontend React Menampilkan Dashboard, Live Camera, dan Reports
## ￿ Fitur Utama
## ￿ Dashboard Monitoring
Dashboard utama menampilkan ringkasan kondisi monitoring K3, seperti:
•Total Violations
•Most Frequent Violation
•Monitoring Coverage
•Compliance Rate
•Daily Violations Chart
•Violation Types Overview
•Recent Reports
•Pagination pada Recent Reports
•Filter tanggal
•Refresh data dashboard
## ￿ Live Camera
Halaman Live Camera menampilkan daftar kamera monitoring.
Fitur ini mencakup:
•daftar kamera,
•status kameraActiveatauInactive,
•lokasi kamera,
•halaman detail kamera,
•tampilan live stream kamera,
## 2

•tampilan hasil deteksi YOLO beserta bounding box pada halaman detail
kamera.
Pada versi saat ini, kamera utama yang digunakan untuk demo adalah:
## CAM-LAPTOP
## Laptop Webcam
Live stream deteksi YOLO ditampilkan melalui endpoint AI service:
http://localhost:8000/video-feed
## ￿ Reports
Halaman Reports menampilkan daftar laporan pelanggaran yang masuk dari
AI service.
Data report berisi:
•ID laporan,
## •area,
•ID kamera,
•tipe pelanggaran,
## •timestamp,
•status laporan,
•tombol detail report.
Reports juga sudah menggunakan pagination agar tampilan tidak terlalu pan-
jang ke bawah.
## ￿ Report Detail
Halaman detail report digunakan untuk melihat informasi detail dari laporan
pelanggaran tertentu.
￿ Export PDF
Sistem menyediakan fitur export laporan ke PDF untuk kebutuhan dokumentasi
atau pelaporan.
￿ AI Detection Service
AI service berjalan menggunakan Python, OpenCV, Flask, dan Ultralytics
## YOLO.
Terdapat dua file utama:
opencv.py
stream.py
## Keterangan:
## 3

•opencv.pydigunakan untuk menjalankan deteksi melalui OpenCV.
•stream.pydigunakan untuk menjalankan AI stream agar hasil kamera
dan bounding box dapat tampil di halaman Live Camera dashboard.
## ￿ Login Page
Project juga memiliki tampilan Login Page berbasis frontend.
Pada versi saat ini, login masih berupa implementasi frontend/local demo.
Pengembangan selanjutnya dapat diarahkan ke autentikasi backend berbasis
database user.
Rencana role access:
## Supervisor:
## - Dashboard
## - Live Camera
## - Reports
## - Analytics
## - Settings
## General Manager:
## - Dashboard
## - Reports
Role tidak dipilih manual oleh user, tetapi sebaiknya ditentukan berdasarkan
akun yang terdaftar pada database user.
## ￿ Tech Stack
## Frontend
•React.js
•Vite
•React Router DOM
•Axios
•Recharts
•Lucide React
•jsPDF
## •jspdf-autotable
•CSS Custom
## Backend
•Node.js
•Express.js
•MySQL2
## 4

## •CORS
•Dotenv
•Multer
## •REST API
## Database
•MySQL
Database name:
smart_k3_vision
Tabel utama:
cameras
reports
AI Service
•Python
•OpenCV
•Flask
•Flask-CORS
•Ultralytics YOLO
•Requests
## ￿ Struktur Project
## CAPSTONE-A2-KELOMPOK11-FILKOM/
## ￿
￿￿￿ backend/
￿   ￿￿￿ db.js
￿   ￿￿￿ database.sql
￿   ￿￿￿ package.json
￿   ￿￿￿ package-lock.json
￿   ￿￿￿ server.js
## ￿
￿￿￿ frontend/
￿   ￿￿￿ index.html
￿   ￿￿￿ package.json
￿   ￿￿￿ package-lock.json
￿   ￿￿￿ vite.config.js
￿   ￿￿￿ src/
￿￿￿￿ components/
## ￿￿   ￿￿￿ Layout.jsx
￿￿￿￿ pages/
## 5

￿￿   ￿￿￿ CameraDetailPage.jsx
￿￿   ￿￿￿ DashboardPage.jsx
￿￿   ￿￿￿ LiveCameraPage.jsx
￿￿   ￿￿￿ LoginPage.jsx
￿￿   ￿￿￿ ReportsPage.jsx
￿￿   ￿￿￿ ReportDetailPage.jsx
￿￿￿￿ services/
￿￿   ￿￿￿ api.js
￿￿￿￿ utils/
￿￿   ￿￿￿ auth.js
## ￿￿￿￿ App.jsx
￿￿￿￿ main.jsx
￿￿￿￿ styles.css
## ￿
￿￿￿ model-ai/
￿   ￿￿￿ best.pt
￿   ￿￿￿ opencv.py
￿   ￿￿￿ stream.py
## ￿
## ￿￿￿ .gitignore
￿￿￿ README.md
￿ Persiapan Database MySQL
Pastikan MySQL sudah berjalan. Jika menggunakan XAMPP, nyalakan:
MySQL
Jika menggunakan port MySQL3307, pastikan konfigurasi.envbackend juga
menggunakan port tersebut.
Buat database dan tabel dengan menjalankan file:
backend/database.sql
Atau jalankan SQL manual melalui database extension di VS Code.
Database yang digunakan:
smart_k3_vision
Tabel utama:
cameras
reports
## 6

## ￿ Konfigurasi Backend.env
Buat file.envdi folderbackend:
backend/.env
## Isi:
## PORT=5000
## DB_HOST=127.0.0.1
## DB_PORT=3307
DB_USER=root
## DB_PASSWORD=
DB_NAME=smart_k3_vision
Jika MySQL menggunakan port3306, ubah menjadi:
## DB_PORT=3306
File.envtidak perlu di-push ke GitHub.
## ￿ Cara Menjalankan Project
Project ini dijalankan menggunakan4 komponen utama:
- MySQL
## 2. Backend
## 3. Frontend
- AI Service
Gunakan terminal terpisah untuk backend, frontend, dan AI service.
1￿ Menjalankan MySQL
Jika menggunakan XAMPP:
Start MySQL
Pastikan databasesmart_k3_visionsudah tersedia dan tabel sudah dibuat.
Cek koneksi database melalui backend:
http://localhost:5000/api/health
## 7

## 2￿ Menjalankan Backend
Masuk ke folder backend:
cdbackend
Install dependency:
npm install
Jalankan backend:
npm run dev
Backend berjalan di:
http://localhost:5000
Cek health endpoint:
http://localhost:5000/api/health
Jika berhasil, akan muncul:
## {
## "status":"ok",
## "database":"connected"
## }
## 3￿ Menjalankan Frontend
Buka terminal baru, lalu masuk ke folder frontend:
cdfrontend
Install dependency:
npm install
Jalankan frontend:
npm run dev
Frontend berjalan di:
http://localhost:5173
Halaman utama dashboard:
http://localhost:5173/dashboard
Halaman live camera:
http://localhost:5173/live-camera
Detail laptop webcam:
## 8

http://localhost:5173/live-camera/CAM-LAPTOP
4￿ Menjalankan AI Service
Masuk ke folder model AI:
cdmodel-ai
Aktifkan virtual environment:
.\.venv\Scripts\Activate.ps1
Jika PowerShell memblokir script:
Set-ExecutionPolicy-ScopeProcess-ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
Install library Python jika belum:
python-mpip install ultralytics opencv-python requests flask flask-cors
Untuk menjalankan deteksi OpenCV biasa:
python opencv.py
Untuk menjalankan stream agar tampil di dashboard Live Camera:
python stream.py
AI stream berjalan di:
http://localhost:8000
Cek stream kamera:
http://localhost:8000/video-feed
Jika berhasil, browser akan menampilkan live camera dengan bounding box
hasil deteksi YOLO.
￿ Endpoint API Backend
## Health Check
GET /api/health
Digunakan untuk mengecek apakah backend dan database berjalan.
## 9

## Dashboard Data
GET /api/dashboard
Dengan filter tanggal:
GET /api/dashboard?date=2026-05-10
Digunakan frontend untuk mengambil data statistik dashboard.
## Cameras
GET /api/cameras
GET /api/cameras/:id
Digunakan untuk mengambil data kamera dan detail kamera.
## Reports
GET /api/reports
GET /api/reports/:id
POST /api/reports
EndpointPOST /api/reportsdigunakan oleh AI service untuk mengirim data
pelanggaran ke backend.
Contoh payload:
## {
"area":"Webcam Test Area",
"cameraId":"CAM-LAPTOP",
"type":"Missing All PPE",
"reportStatus":"New",
## "image":""
## }
## Violation Ingest
POST /api/violations/ingest
Endpoint ini disiapkan untuk menerima data pelanggaran dari AI service, ter-
masuk kemungkinan upload evidence image.
￿ Cara Kerja Deteksi APD
Model YOLO mendeteksi 3 class utama:
## Class   Keterangan
person  Pekerja / manusia
## 10

## Class   Keterangan
helmet  Helm keselamatan
vest    Rompi keselamatan
Sistem akan mengecek apakah helmet dan vest terdeteksi pada area pekerja.
Contoh hasil deteksi:
## SAFE
Jika pekerja menggunakan helmet dan vest.
Missing helmet
Jika helmet tidak terdeteksi.
Missing vest
Jika vest tidak terdeteksi.
Missing All PPE
Jika helmet dan vest sama-sama tidak terdeteksi.
## ￿ Mapping Tipe Pelanggaran Dashboard
Data report asli yang tersimpan di database dapat berupa:
Missing helmet
Missing vest
Missing All PPE
Sedangkan pada Violation Types Overview, data diringkas menjadi:
## No Helmet
## No Vest
Multiple PPE
## Mapping:
Report TypeDashboard Category
Missing helmet   No Helmet
Missing vestNo Vest
Missing All PPE  Multiple PPE
## 11

## ￿ Contoh Output Report
Ketika AI service mendeteksi pelanggaran, data akan otomatis masuk ke back-
end dan disimpan ke MySQL.
IDAreaCamera    TypeTimestamp  Status
## RPT-
## 1777939851484
## Webcam
## Test Area
## CAM-
## LAPTOP
## Missing
All PPE
## 2026-05-10
## 07:10:51
## New
## ￿ Status Project Saat Ini
KomponenStatus
## Frontend Dashboard￿ Berjalan
Backend API￿ Berjalan
Database MySQL￿ Berjalan
AI Service YOLO 3 Class￿ Berjalan
## Kamera Laptop￿ Berhasil
Live Camera Stream ke Dashboard  ￿ Berhasil
Realtime Report ke MySQL￿ Berhasil
## Reports Pagination￿ Berhasil
Export PDF￿ Tersedia
Login Page UI￿ Tersedia
Role Access Backend￿ Pengembangan lanjutan
Google OAuth￿ Belum diimplementasikan
RTSP CCTV Asli￿ Menyesuaikan akses kamera
## ￿ Catatan Penting
•Sistem deteksi saat ini menggunakan 3 class:person,helmet, danvest.
•Classshoesdanglovestidak digunakan pada versi saat ini.
•Data report sudah tersimpan di MySQL, sehingga tidak hilang saat back-
end direstart.
•Untuk demo lokal, kamera laptop dapat digunakan sebagai sumber input.
•Jika ingin menggunakan CCTV/IP Camera, pastikan RTSP URL benar
dan perangkat berada pada jaringan yang sama.
•File.env,node_modules, dan.venvtidak perlu di-push ke GitHub.
•Jika setelah clone project foldernode_modulestidak ada, jalankannpm
installpada folderbackenddanfrontend.
## 12

￿ Urutan Demo yang Disarankan
- Start MySQL
- Jalankan backend
- Cek http://localhost:5000/api/health
- Jalankan frontend
- Buka http://localhost:5173/dashboard
- Jalankan AI stream dengan python stream.py
- Buka http://localhost:5173/live-camera/CAM-LAPTOP
- Tunjukkan kamera live dengan bounding box
- Tunjukkan report masuk ke dashboard dan halaman reports
- Tunjukkan data tersimpan di MySQL
## ￿ Pengembangan Selanjutnya
Beberapa fitur yang dapat dikembangkan:
•autentikasi backend berbasis database user,
•role access untuk Supervisor dan General Manager,
•approval akun baru,
•Google OAuth,
•halaman user management,
•upload dan penyimpanan gambar bukti pelanggaran,
•notifikasi realtime saat pelanggaran terdeteksi,
•integrasi RTSP CCTV asli,
•deployment backend dan frontend.
## ￿ Tim Pengembang
Project ini dikembangkan sebagai bagian dari project capstone dengan fokus
pada penerapan:
•Computer Vision,
•Smart Factory,
•Monitoring K3,
•Dashboard Analytics,
•integrasi sistem berbasis API,
•penyimpanan data menggunakan database MySQL.
## ￿ Kesimpulan
Smart K3 Vision Dashboard berhasil mengintegrasikan model computer vi-
sion dengan sistem dashboard monitoring K3. Kamera diproses menggunakan
## 13

OpenCV dan YOLO untuk mendeteksi pekerja serta penggunaan APD berupa
helmet dan vest. Jika ditemukan pelanggaran, data dikirim ke backend, dis-
impan ke MySQL, dan ditampilkan pada dashboard secara realtime sehingga
proses pemantauan keselamatan kerja dapat dilakukan dengan lebih cepat, rapi,
dan terdokumentasi.
## 14
