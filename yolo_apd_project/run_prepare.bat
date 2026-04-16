@echo off
setlocal

REM Ubah path input sesuai lokasi dataset hasil export Roboflow
set INPUT_DATASET=D:\dataset\site_construction_safety_raw

REM Ubah path output sesuai folder yang kamu mau
set OUTPUT_DATASET=D:\dataset\site_construction_safety_apd

python prepare_dataset.py --input "%INPUT_DATASET%" --output "%OUTPUT_DATASET%" --classes helmet vest shoes gloves --overwrite
pause
