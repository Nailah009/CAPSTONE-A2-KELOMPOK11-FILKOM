import cv2
import time
import os
import threading
import requests
from datetime import datetime
from queue import Queue
from ultralytics import YOLO

# Untuk RTSP boleh tetap ada, tapi kalau webcam laptop tidak terlalu berpengaruh
os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "rtsp_transport;tcp"


# ==========================================
# KIRIM HASIL PELANGGARAN KE BACKEND
# ==========================================
def send_violation_to_backend(area, camera_id, violation_type, image_url=None):
    payload = {
        "area": area,
        "cameraId": camera_id,
        "type": violation_type,
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "reportStatus": "New",
        "image": image_url or ""
    }

    try:
        response = requests.post(
            "http://localhost:5000/api/reports",
            json=payload,
            timeout=5
        )

        if response.status_code in [200, 201]:
            print(f"[API] Pelanggaran terkirim: {violation_type}")
        else:
            print("[API] Gagal kirim:", response.status_code, response.text)

    except Exception as e:
        print("[API] Error kirim ke backend:", e)


# ==========================================
# KOMPONEN 1: PRODUCER / INGEST CAMERA
# Bisa pakai webcam laptop atau RTSP
# ==========================================
def ingest_camera_stream(camera_source, frame_queue):
    while True:
        print(f"[INGEST] Mencoba membuka sumber kamera: {camera_source}...")

        # Kalau camera_source = 0 / 1 / 2, ini akan buka webcam laptop
        # Kalau camera_source = "rtsp://...", ini akan buka IP Camera / CCTV
        cap = cv2.VideoCapture(camera_source)

        if not cap.isOpened():
            print("[INGEST] Kamera gagal dibuka. Mencoba ulang 5 detik lagi...")
            time.sleep(5)
            continue

        print("[INGEST] Kamera berhasil dibuka!")

        while True:
            ret, frame = cap.read()

            if not ret:
                print("[INGEST] Gagal membaca frame. Reconnect...")
                break

            # Buang frame lama kalau queue penuh supaya tetap real-time
            if frame_queue.full():
                try:
                    frame_queue.get_nowait()
                except:
                    pass

            frame_queue.put(frame)

        cap.release()
        time.sleep(2)


# ==========================================
# KOMPONEN 2: YOLO WORKER + LOGIKA APD
# ==========================================
def yolo_worker(frame_queue, model_path):
    print(f"[YOLO] Memuat model AI dari {model_path}...")
    model = YOLO(model_path)

    # Validasi class model
    print("[YOLO] Class model:", model.names)

    prev_time = time.time()

    # Cooldown supaya tidak spam kirim report setiap frame
    last_sent_time = 0
    cooldown_seconds = 10

    while True:
        frame = frame_queue.get()

        results = model(frame, imgsz=480, verbose=False, conf=0.50)

        persons = []
        ppes = {
            "helmet": [],
            "vest": [],
            "shoes": [],
            "gloves": []
        }

        # Ambil hasil deteksi YOLO
        for box in results[0].boxes:
            class_id = int(box.cls[0])
            class_name = model.names[class_id].lower()
            coords = box.xyxy[0].cpu().numpy()
            conf = float(box.conf[0])

            x1, y1, x2, y2 = coords

            # Simpan person dan APD
            if class_name == "person":
                persons.append(coords)
            elif class_name in ppes:
                ppes[class_name].append(coords)

            # Gambar semua object yang terdeteksi
            if class_name == "person":
                color = (255, 180, 0)
            else:
                color = (0, 200, 255)

            label = f"{class_name} {conf:.2f}"
            cv2.rectangle(
                frame,
                (int(x1), int(y1)),
                (int(x2), int(y2)),
                color,
                2
            )
            cv2.putText(
                frame,
                label,
                (int(x1), max(20, int(y1) - 8)),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.45,
                color,
                2
            )

        # Cek APD untuk setiap person
        for p_coords in persons:
            px1, py1, px2, py2 = p_coords

            # Padding area person agar APD yang agak keluar tetap kebaca
            margin_w = (px2 - px1) * 0.15
            margin_h = (py2 - py1) * 0.15

            epx1 = px1 - margin_w
            epy1 = py1 - margin_h
            epx2 = px2 + margin_w
            epy2 = py2 + margin_h

            status_apd = {
                "helmet": False,
                "vest": False,
                "shoes": False,
                "gloves": False
            }

            # Cek apakah box APD overlap dengan box person
            for ppe_name, ppe_boxes in ppes.items():
                for hx1, hy1, hx2, hy2 in ppe_boxes:
                    is_overlap = (
                        epx1 < hx2 and
                        epx2 > hx1 and
                        epy1 < hy2 and
                        epy2 > hy1
                    )

                    if is_overlap:
                        status_apd[ppe_name] = True
                        break

            missing_apd = [k for k, v in status_apd.items() if not v]

            if len(missing_apd) == 0:
                box_color = (0, 255, 0)
                teks_status = "AMAN"

            else:
                if len(missing_apd) == 4:
                    box_color = (0, 0, 255)
                    teks_status = "PELANGGARAN TOTAL!"
                    violation_type = "Missing All PPE"
                else:
                    box_color = (0, 165, 255)
                    teks_status = f"KURANG: {', '.join(missing_apd).upper()}"
                    violation_type = "Missing " + ", ".join(missing_apd)

                current_api_time = time.time()

                if current_api_time - last_sent_time >= cooldown_seconds:
                    send_violation_to_backend(
                        area="Webcam Test Area",
                        camera_id="CAM-LAPTOP",
                        violation_type=violation_type
                    )
                    last_sent_time = current_api_time

            # Gambar ulang box person dengan status AMAN / PELANGGARAN
            cv2.rectangle(
                frame,
                (int(px1), int(py1)),
                (int(px2), int(py2)),
                box_color,
                3
            )

            cv2.rectangle(
                frame,
                (int(px1), int(py1) - 30),
                (int(px2), int(py1)),
                box_color,
                -1
            )

            cv2.putText(
                frame,
                teks_status,
                (int(px1) + 5, int(py1) - 10),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.55,
                (255, 255, 255),
                2
            )

        # Kalau tidak ada person terdeteksi
        if len(persons) == 0:
            cv2.putText(
                frame,
                "NO PERSON DETECTED",
                (20, 80),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.8,
                (0, 0, 255),
                2
            )

        # Hitung FPS
        current_time = time.time()
        fps = 1 / (current_time - prev_time) if (current_time - prev_time) > 0 else 0
        prev_time = current_time

        cv2.putText(
            frame,
            f"FPS: {int(fps)}",
            (20, 40),
            cv2.FONT_HERSHEY_SIMPLEX,
            1,
            (255, 255, 0),
            2
        )

        cv2.imshow("Smart K3 Vision - Webcam Test", frame)

        if cv2.waitKey(1) & 0xFF == ord("q"):
            break

    cv2.destroyAllWindows()


# ==========================================
# MAIN PROGRAM
# ==========================================
if __name__ == "__main__":
    # Untuk kamera laptop biasanya 0
    # Kalau tidak muncul, coba ganti 1 atau 2
    CAMERA_SOURCE = 0

    # Kalau nanti mau balik ke RTSP, ganti jadi:
    # CAMERA_SOURCE = "rtsp://username:password@IP_KAMERA/live/ch00_0"

    MODEL_FILE = "best.pt"

    shared_queue = Queue(maxsize=5)

    ingest_thread = threading.Thread(
        target=ingest_camera_stream,
        args=(CAMERA_SOURCE, shared_queue),
        daemon=True
    )

    ingest_thread.start()

    yolo_worker(shared_queue, MODEL_FILE)