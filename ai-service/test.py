from ultralytics import YOLO

# 1. Masukkan nama file modelmu
model_path = "best.pt" 

print(f"Sedang membedah isi model {model_path}...\n")

# 2. Load model
model = YOLO(model_path)

# 3. Tarik data nama-nama class yang ada di dalamnya
daftar_class = model.names

# 4. Tampilkan ke terminal
print("-" * 40)
print("DAFTAR OBJEK YANG BISA DIDETEKSI:")
print("-" * 40)

for class_id, class_name in daftar_class.items():
    print(f"ID {class_id} : {class_name}")

print("-" * 40)