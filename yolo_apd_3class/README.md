# 🦺 YOLOv8 APD Detection — 3 Class Training

Folder ini berisi dokumentasi training model YOLOv8 untuk sistem monitoring K3 berbasis computer vision pada proyek Capstone A2 Kelompok 11 FILKOM.

## 🎯 Class yang Digunakan

Model difokuskan pada 3 class utama:

| No | Class |
|---|---|
| 0 | person |
| 1 | helmet |
| 2 | vest |

Class `person` digunakan untuk mendeteksi keberadaan pekerja, sedangkan `helmet` dan `vest` digunakan sebagai indikator utama kepatuhan penggunaan APD.

## 📌 Tujuan Training

Training dilakukan untuk menghasilkan model deteksi APD yang dapat digunakan pada sistem monitoring K3 secara real-time. Model ini menjadi dasar untuk pengembangan violation logic, yaitu logika yang menentukan apakah pekerja sudah memenuhi standar penggunaan APD atau belum.

## 📁 Struktur Folder

- `notebooks/` berisi notebook Google Colab untuk proses training.
- `data/` berisi konfigurasi dataset `data.yaml`.
- `results/` berisi hasil evaluasi training seperti grafik, confusion matrix, dan kurva evaluasi.
- `src/` disiapkan untuk script inference atau integrasi OpenCV.
- `model_link.txt` berisi link model `best.pt` yang disimpan di Google Drive.

## 🚀 Output Training

Output utama dari training adalah file `best.pt`. Karena ukuran model cukup besar, file model disimpan di Google Drive dan link-nya dicantumkan pada `model_link.txt`.
