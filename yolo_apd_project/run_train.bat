@echo off
setlocal

REM Ubah path dataset ke folder output hasil prepare_dataset.py
set DATASET=D:\dataset\site_construction_safety_apd

REM Ganti model kalau mau, misalnya yolo11n.pt atau yolo26n.pt
set MODEL=yolov8n.pt

python train_yolo.py --dataset "%DATASET%" --model %MODEL% --epochs 100 --imgsz 640 --batch 8 --device 0 --workers 4 --patience 20 --project runs_apd --name site_construction_4class
pause
