@echo off
setlocal

REM Ubah ke lokasi hasil training kamu
set WEIGHTS=runs_apd\site_construction_4class\weights\best.pt
set DATASET=D:\dataset\site_construction_safety_apd

python validate_model.py --weights "%WEIGHTS%" --dataset "%DATASET%" --split val --imgsz 640 --batch 8 --device 0
pause
