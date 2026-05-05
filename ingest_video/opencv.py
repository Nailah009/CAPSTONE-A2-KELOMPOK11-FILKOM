import cv2
import time
import os
import threading
import requests
from queue import Queue
from ultralytics import YOLO

os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "rtsp_transport;tcp"

# ==========================================
# KOMPONEN 1: PRODUCER (INGEST RTSP)
# ==========================================
def ingest_rtsp_stream(rtsp_url, frame_queue):
    while True:
        print(f"[INGEST] Mencoba terhubung ke {rtsp_url}...")

        if isinstance(rtsp_url, int) or str(rtsp_url).isdigit():
            # untuk webcam local
            cap = cv2.VideoCapture(int(rtsp_url))
        else:
            # pake webcam rtsp
            cap = cv2.VideoCapture(rtsp_url, cv2.CAP_FFMPEG)

        if not cap.isOpened():
            time.sleep(5)
            continue

        print("[INGEST] Koneksi RTSP Berhasil!")

        while True:
            ret, frame = cap.read()
            if not ret:
                break

            if frame_queue.full():
                frame_queue.get()

            frame_queue.put(frame)

        cap.release()
        time.sleep(2)


# ==========================================
# KOMPONEN 2: LOGIKA SEDERHANA TANPA ID & CONFIDENCE TINGGI
# ==========================================
def yolo_worker(frame_queue, model_path):
    print(f"[YOLO] Memuat model AI dari {model_path}...")
    model = YOLO(model_path)

    prev_time = time.time()

    # MENCEGAH SPAM VIOLATION
    last_sent_time = 0
    cooldown_seconds = 5 
    

    while True:
        frame = frame_queue.get()

        results = model(frame, imgsz=480, verbose=False, conf=0.50)

        persons = []
        ppes = {
            'helmet': [],
            'vest': [],
            'shoes': [],
            'gloves': []
        }

        for box in results[0].boxes:
            class_id = int(box.cls[0])
            class_name = model.names[class_id].lower()
            coords = box.xyxy[0].cpu().numpy()

            if class_name == 'person':
                persons.append(coords)
            elif class_name in ppes:
                ppes[class_name].append(coords)

        for p_coords in persons:
            px1, py1, px2, py2 = p_coords

            # PADDING TETAP DIPERTAHANKAN (15%)
            margin_w = (px2 - px1) * 0.15
            margin_h = (py2 - py1) * 0.15

            epx1, epy1 = px1 - margin_w, py1 - margin_h
            epx2, epy2 = px2 + margin_w, py2 + margin_h

            status_apd = {
                'helmet': False,
                'vest': False,
                'shoes': False,
                'gloves': False
            }

            for ppe_name, ppe_boxes in ppes.items():
                for hx1, hy1, hx2, hy2 in ppe_boxes:
                    if (epx1 < hx2 and epx2 > hx1 and
                        epy1 < hy2 and epy2 > hy1):
                        status_apd[ppe_name] = True
                        break

            missing_apd = [k for k, v in status_apd.items() if not v]

            if len(missing_apd) == 0:
                box_color = (0, 255, 0)
                teks_status = "AMAN"
            elif len(missing_apd) == 4:
                box_color = (0, 0, 255)
                teks_status = "PELANGGARAN TOTAL!"
            else:
                box_color = (0, 165, 255)
                teks_status = f"PARSIAL: KURANG {', '.join(missing_apd).upper()}"

            cv2.rectangle(
                frame,
                (int(px1), int(py1)),
                (int(px2), int(py2)),
                box_color,
                2
            )

            cv2.rectangle(
                frame,
                (int(px1), int(py1) - 25),
                (int(px2), int(py1)),
                box_color,
                -1
            )

            cv2.putText(
                frame,
                teks_status,
                (int(px1) + 5, int(py1) - 8),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.45,
                (255, 255, 255),
                2
            )

            # ==========================================
            # Backend untuk pelaporan pelanggaran ke API Flask
            # ==========================================
            if len(missing_apd) > 0:
                current_time_req = time.time()
                
                # Cek cooldown agar tidak spam API
                if current_time_req - last_sent_time > cooldown_seconds:
                    # Encode frame yang sudah ada kotaknya menjadi .jpg
                    success, buffer = cv2.imencode('.jpg', frame)
                    
                    if success:
                        files = {'image': ('violation.jpg', buffer.tobytes(), 'image/jpeg')}
                        data = {
                            'camera_id': 1, # Pastikan ini sesuai dengan ID di database MySQL kamu
                            'missing_helmet': 'true' if 'helmet' in missing_apd else 'false',
                            'missing_vest': 'true' if 'vest' in missing_apd else 'false',
                            'missing_shoes': 'true' if 'shoes' in missing_apd else 'false'
                        }
                        
                        # Jalankan request di dalam try-except agar jika server mati, video tidak crash
                        try:
                            # Gunakan timeout=1.5 agar video tidak freeze jika server backend agak lambat
                            response = requests.post('http://127.0.0.1:5000/api/violations/ingest', files=files, data=data, timeout=1.5)
                            print(f"[AI] Laporan dikirim! Status API: {response.status_code}")
                            last_sent_time = current_time_req # Reset timer
                        except requests.exceptions.RequestException as e:
                            print(f"[AI] Gagal menghubungi backend: {e}")

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

        cv2.imshow("Monitor K3 Epson - High Confidence", frame)

        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cv2.destroyAllWindows()


if __name__ == "__main__":
    # RTSP_LINK = "rtsp://192.168.10.166/live/ch00_0"
    RTSP_LINK = 0
    MODEL_FILE = "best.pt"

    shared_queue = Queue(maxsize=5)

    ingest_thread = threading.Thread(
        target=ingest_rtsp_stream,
        args=(RTSP_LINK, shared_queue),
        daemon=True
    )

    ingest_thread.start()

    yolo_worker(shared_queue, MODEL_FILE)