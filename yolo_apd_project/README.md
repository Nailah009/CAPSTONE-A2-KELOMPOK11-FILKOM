# YOLO APD Training Pack

Paket ini dibuat untuk training model deteksi APD dari dataset **Site Construction Safety** dengan class yang dipakai:
- helmet
- vest
- shoes
- gloves

Class lain dari dataset asli seperti `Person`, `bare-arms`, dan `Non-Helmet` dibuang saat proses prepare.

## Isi file
- `prepare_dataset.py` → memfilter dataset Roboflow menjadi 4 class
- `train_yolo.py` → menjalankan training YOLO
- `validate_model.py` → validasi model hasil training
- `run_prepare.bat` → shortcut Windows untuk prepare dataset
- `run_train.bat` → shortcut Windows untuk training
- `run_validate.bat` → shortcut Windows untuk validasi
- `requirements.txt` → dependency Python

## 1) Install Python package
Buka Command Prompt di folder ini, lalu jalankan:

```bash
pip install -r requirements.txt
```

## 2) Download dataset dari Roboflow
Download dataset **Site Construction Safety** dalam format **YOLO** lalu extract ke folder lokal.
Contoh:

```text
D:\dataset\site_construction_safety_raw
```

Struktur dataset export Roboflow biasanya seperti ini:

```text
site_construction_safety_raw/
├── data.yaml
├── train/
│   ├── images/
│   └── labels/
├── valid/
│   ├── images/
│   └── labels/
└── test/
    ├── images/
    └── labels/
```

## 3) Filter dataset ke 4 class
Edit dulu `run_prepare.bat` kalau path kamu beda.
Setelah itu jalankan:

```bash
run_prepare.bat
```

Atau lewat command manual:

```bash
python prepare_dataset.py --input "D:\dataset\site_construction_safety_raw" --output "D:\dataset\site_construction_safety_apd" --classes helmet vest shoes gloves --overwrite
```

Hasilnya akan menjadi dataset baru dengan struktur:

```text
site_construction_safety_apd/
├── data.yaml
├── images/
│   ├── train/
│   ├── val/
│   └── test/
└── labels/
    ├── train/
    ├── val/
    └── test/
```

## 4) Training model
Edit `run_train.bat` kalau path dataset atau model mau diganti.
Lalu jalankan:

```bash
run_train.bat
```

Atau manual:

```bash
python train_yolo.py --dataset "D:\dataset\site_construction_safety_apd" --model yolov8n.pt --epochs 100 --imgsz 640 --batch 8 --device 0 --workers 4 --patience 20 --project runs_apd --name site_construction_4class
```

## 5) Validasi model
Setelah training selesai, jalankan:

```bash
run_validate.bat
```

Atau manual:

```bash
python validate_model.py --weights "runs_apd\site_construction_4class\weights\best.pt" --dataset "D:\dataset\site_construction_safety_apd" --split val --imgsz 640 --batch 8 --device 0
```

## Catatan penting
- Kalau laptop tidak punya GPU NVIDIA, ganti `--device 0` menjadi `--device cpu`.
- Kalau VRAM kecil, turunkan batch jadi `4` atau `2`.
- Kamu bisa ganti model awal dari `yolov8n.pt` ke model lain seperti `yolo11n.pt` atau model Ultralytics lain yang kompatibel.
- File ini disiapkan supaya kamu tinggal edit path lalu jalanin.
