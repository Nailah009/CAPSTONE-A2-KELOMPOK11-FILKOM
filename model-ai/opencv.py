import cv2
import time
import os
import threading
import queue
import requests
import numpy as np
from queue import Queue
from datetime import datetime
from flask import Flask, Response, send_from_directory
from flask_cors import CORS
from ultralytics import YOLO

# ==========================================
# OpenCV RTSP Timeout
# ==========================================
os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "rtsp_transport;tcp;stimeout;5000000"

# ==========================================
# Flask App
# ==========================================
app = Flask(__name__)
CORS(app)

# ==========================================
# Konfigurasi Utama
# ==========================================
MODEL_FILE = "best.pt"

# Webcam laptop = 0
# Kalau nanti pakai CCTV, ganti ke RTSP URL
CAMERA_SOURCE = 0

CAMERA_ID = "CAM-LAPTOP"
AREA_NAME = "Webcam Test Area"

BACKEND_REPORT_URL = "http://localhost:5000/api/reports"

# Port AI stream. Kalau bentrok, boleh ganti.
AI_HOST = "127.0.0.1"
AI_PORT = 5055

# ==========================================
# Konfigurasi Stabilitas Deteksi
# ==========================================
FRAME_QUEUE_SIZE = 5

# Pelanggaran harus stabil 2 detik baru dikirim ke reports
VIOLATION_THRESHOLD = 2

# Jumlah history frame untuk cek kestabilan
WINDOW_SIZE = 20

# Minimal 60% frame dalam history harus violation
RATIO_THRESHOLD = 0.6

# Anti spam kirim report
SEND_COOLDOWN_SECONDS = 10

# ==========================================
# Shared State
# ==========================================
frame_queue = Queue(maxsize=FRAME_QUEUE_SIZE)

latest_frame = None
latest_frame_lock = threading.Lock()

last_sent_time = 0
notification_sent = False
violation_start_time = None
violation_history = []

BACKEND_UPLOAD_DIR = os.path.abspath(
    os.path.join(os.getcwd(), "..", "backend", "uploads", "violations")
)

if not os.path.exists(BACKEND_UPLOAD_DIR):
    os.makedirs(BACKEND_UPLOAD_DIR)

# ==========================================
# Helper: Status APD untuk label, warna, report
# ==========================================
def get_violation_status(has_helmet, has_vest):
    """
    Return:
    - label_text untuk tampilan live stream
    - box_color OpenCV BGR
    - report_type untuk database/dashboard
    - missing_items untuk database
    """

    # AMAN: helmet dan vest lengkap
    if has_helmet and has_vest:
        return "COMPLETED", (0, 255, 0), None, ""

    # PELANGGARAN TOTAL: helmet dan vest sama-sama tidak ada
    if (not has_helmet) and (not has_vest):
        return "MISSING ALL PPE!!!", (0, 0, 255), "Missing All PPE", "helmet, vest"

    # PARSIAL: salah satu APD tidak ada
    if not has_helmet:
        return "MISSING: HELMET", (0, 255, 255), "Missing helmet", "helmet"

    if not has_vest:
        return "MISSING: VEST", (0, 255, 255), "Missing vest", "vest"

    return "UNKNOWN", (255, 255, 255), "Unknown Violation", "-"


# ==========================================
# Helper: Cek intersection PPE dengan person
# ==========================================
def is_intersect(person_box, item_box):
    px1, py1, px2, py2 = person_box
    ix1, iy1, ix2, iy2 = item_box

    # Area person diperbesar sedikit supaya deteksi tidak terlalu kaku
    margin_w = (px2 - px1) * 0.15
    margin_h = (py2 - py1) * 0.15

    epx1 = px1 - margin_w
    epy1 = py1 - margin_h
    epx2 = px2 + margin_w
    epy2 = py2 + margin_h

    return (
        epx1 < ix2 and
        epx2 > ix1 and
        epy1 < iy2 and
        epy2 > iy1
    )


# ==========================================
# Helper: Simpan capture pelanggaran
# ==========================================
def save_violation_capture(frame):
    now = datetime.now()
    capture_id = f"VIO-{now.strftime('%Y%m%d%H%M%S')}"
    file_name = f"{capture_id}.jpg"

    local_path = os.path.join(BACKEND_UPLOAD_DIR, file_name)

    success = cv2.imwrite(local_path, frame)

    if not success:
        print(f"[CAPTURE] Gagal menyimpan gambar ke: {local_path}")
        return ""

    image_url = f"http://localhost:5000/uploads/violations/{file_name}"

    print(f"[CAPTURE] File tersimpan di: {local_path}")
    print(f"[CAPTURE] URL backend: {image_url}")

    return image_url

# ==========================================
# Helper: Kirim report ke Backend Express
# ==========================================
def send_violation_to_backend(report_type, missing_items, image_path):
    global last_sent_time

    now = time.time()

    if now - last_sent_time < SEND_COOLDOWN_SECONDS:
        return

    payload = {
        "area": AREA_NAME,
        "cameraId": CAMERA_ID,
        "type": report_type,
        "missingItems": missing_items,
        "imagePath": image_path,
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }

    try:
        response = requests.post(BACKEND_REPORT_URL, json=payload, timeout=5)

        if response.status_code in [200, 201]:
            print("==================================================")
            print("[API] REPORT PELANGGARAN TERKIRIM")
            print(f"Area          : {AREA_NAME}")
            print(f"Camera        : {CAMERA_ID}")
            print(f"Type          : {report_type}")
            print(f"Missing Items : {missing_items}")
            print(f"Image Path    : {image_path}")
            print("==================================================")
            last_sent_time = now
        else:
            print(f"[API] Gagal kirim: {response.status_code} {response.text}")

    except Exception as error:
        print(f"[API] Error kirim report: {error}")


# ==========================================
# Producer: Baca Webcam / RTSP
# ==========================================
def ingest_camera_stream(camera_source, frame_queue):
    while True:
        print(f"[INGEST] Mencoba membuka sumber kamera: {camera_source}...")

        if isinstance(camera_source, int):
            cap = cv2.VideoCapture(camera_source)
        else:
            cap = cv2.VideoCapture(camera_source, cv2.CAP_FFMPEG)

        if not cap.isOpened():
            print("[INGEST] Kamera gagal dibuka. Mencoba lagi dalam 5 detik...")
            time.sleep(5)
            continue

        print("[INGEST] Kamera berhasil dibuka!")

        while True:
            ret, frame = cap.read()

            if not ret:
                print("[INGEST] Stream terputus. Mencoba reconnect...")
                break

            if frame_queue.full():
                try:
                    frame_queue.get_nowait()
                except queue.Empty:
                    pass

            frame_queue.put(frame)

        cap.release()
        time.sleep(2)


# ==========================================
# Worker: YOLO + Logic APD + Bounding Box
# ==========================================
def yolo_worker():
    global latest_frame
    global notification_sent
    global violation_start_time
    global violation_history

    print(f"[YOLO] Memuat model AI dari {MODEL_FILE}...")
    model = YOLO(MODEL_FILE)
    print(f"[YOLO] Class model: {model.names}")

    prev_time = time.time()

    last_report_type = None
    last_missing_items = ""

    while True:
        try:
            frame = frame_queue.get(timeout=0.5)
        except queue.Empty:
            with latest_frame_lock:
                if latest_frame is not None:
                    reconnect_frame = latest_frame.copy()
                    cv2.putText(
                        reconnect_frame,
                        "WARNING: CAMERA RECONNECTING...",
                        (20, 60),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        0.9,
                        (0, 0, 255),
                        2
                    )
                    latest_frame = reconnect_frame
            continue

        current_time = time.time()

        # YOLO inference
        results = model(frame, imgsz=480, verbose=False, conf=0.50)

        persons = []
        helmets = []
        vests = []

        for box in results[0].boxes:
            class_id = int(box.cls[0])
            class_name = model.names[class_id].lower()
            coords = box.xyxy[0].cpu().numpy()
            conf = float(box.conf[0])

            item = {
                "box": coords,
                "conf": conf
            }

            if class_name == "person":
                persons.append(item)
            elif class_name == "helmet":
                helmets.append(item)
            elif class_name == "vest":
                vests.append(item)

        any_violation = False
        frame_report_type = None
        frame_missing_items = ""

        # ==========================================
        # Loop setiap person
        # ==========================================
        for person in persons:
            px1, py1, px2, py2 = person["box"]
            person_box = person["box"]

            has_helmet = False
            has_vest = False

            # Cek helmet yang intersect dengan person
            for helmet in helmets:
                if is_intersect(person_box, helmet["box"]):
                    has_helmet = True
                    break

            # Cek vest yang intersect dengan person
            for vest in vests:
                if is_intersect(person_box, vest["box"]):
                    has_vest = True
                    break

            label_text, box_color, report_type, missing_items = get_violation_status(
                has_helmet,
                has_vest
            )

            if report_type is not None:
                any_violation = True
                frame_report_type = report_type
                frame_missing_items = missing_items

            px1, py1, px2, py2 = map(int, [px1, py1, px2, py2])

            # Bounding box person
            cv2.rectangle(
                frame,
                (px1, py1),
                (px2, py2),
                box_color,
                3
            )

            # Background label
            label_height = 32
            label_y1 = max(py1 - label_height, 0)
            label_y2 = py1

            # Lebar label mengikuti teks
            text_size, _ = cv2.getTextSize(
                label_text,
                cv2.FONT_HERSHEY_SIMPLEX,
                0.58,
                2
            )

            label_width = max(text_size[0] + 18, 140)

            cv2.rectangle(
                frame,
                (px1, label_y1),
                (min(px1 + label_width, frame.shape[1] - 1), label_y2),
                box_color,
                -1
            )

            cv2.putText(
                frame,
                label_text,
                (px1 + 8, max(py1 - 10, 20)),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.58,
                (255, 255, 255),
                2
            )

        # ==========================================
        # Optional: tampilkan box helmet dan vest kecil
        # ==========================================
        for helmet in helmets:
            x1, y1, x2, y2 = map(int, helmet["box"])
            cv2.rectangle(frame, (x1, y1), (x2, y2), (255, 180, 0), 2)
            cv2.putText(
                frame,
                f"helmet {helmet['conf']:.2f}",
                (x1, max(y1 - 8, 20)),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.45,
                (255, 180, 0),
                2
            )

        for vest in vests:
            x1, y1, x2, y2 = map(int, vest["box"])
            cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 180, 255), 2)
            cv2.putText(
                frame,
                f"vest {vest['conf']:.2f}",
                (x1, max(y1 - 8, 20)),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.45,
                (0, 180, 255),
                2
            )

        # ==========================================
        # Violation Stability Filter
        # ==========================================
        violation_history.append(1 if any_violation else 0)

        if len(violation_history) > WINDOW_SIZE:
            violation_history.pop(0)

        violation_ratio = sum(violation_history) / len(violation_history)

        if any_violation and violation_ratio > RATIO_THRESHOLD:
            if violation_start_time is None:
                violation_start_time = current_time

            duration = current_time - violation_start_time

            if duration >= VIOLATION_THRESHOLD and not notification_sent:
                notification_sent = True

                if frame_report_type is not None:
                    image_path = save_violation_capture(frame)

                    print("==================================================")
                    print("[TRIGGER] PELANGGARAN STABIL TERDETEKSI")
                    print(f"Type          : {frame_report_type}")
                    print(f"Missing Items : {frame_missing_items}")
                    print(f"Image Path    : {image_path}")
                    print("==================================================")

                    send_violation_to_backend(
                        report_type=frame_report_type,
                        missing_items=frame_missing_items,
                        image_path=image_path
                    )

                    last_report_type = frame_report_type
                    last_missing_items = frame_missing_items
        else:
            violation_start_time = None

        # Reset supaya bisa kirim lagi setelah kondisi benar-benar aman
        if violation_ratio == 0:
            notification_sent = False
            last_report_type = None
            last_missing_items = ""

        # ==========================================
        # FPS
        # ==========================================
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

        # Simpan frame terbaru untuk Flask stream
        with latest_frame_lock:
            latest_frame = frame.copy()


# ==========================================
# Flask Stream Generator
# ==========================================
def generate_frames():
    while True:
        with latest_frame_lock:
            if latest_frame is None:
                frame = None
            else:
                frame = latest_frame.copy()

        if frame is None:
            placeholder = np.zeros((720, 1280, 3), dtype=np.uint8)
            placeholder[:] = (15, 23, 42)

            cv2.putText(
                placeholder,
                "Loading AI Stream...",
                (420, 360),
                cv2.FONT_HERSHEY_SIMPLEX,
                1.3,
                (255, 255, 255),
                3
            )

            frame = placeholder

        ret, buffer = cv2.imencode(".jpg", frame)

        if not ret:
            continue

        frame_bytes = buffer.tobytes()

        yield (
            b"--frame\r\n"
            b"Content-Type: image/jpeg\r\n\r\n" + frame_bytes + b"\r\n"
        )

        time.sleep(0.03)


# ==========================================
# Flask Routes
# ==========================================
@app.route("/")
def index():
    return {
        "status": "ok",
        "message": "Smart K3 Vision AI Stream is running",
        "video_feed": f"http://{AI_HOST}:{AI_PORT}/video-feed"
    }


@app.route("/video-feed")
def video_feed():
    return Response(
        generate_frames(),
        mimetype="multipart/x-mixed-replace; boundary=frame"
    )

# ==========================================
# Main
# ==========================================
if __name__ == "__main__":
    ingest_thread = threading.Thread(
        target=ingest_camera_stream,
        args=(CAMERA_SOURCE, frame_queue),
        daemon=True
    )

    worker_thread = threading.Thread(
        target=yolo_worker,
        daemon=True
    )

    ingest_thread.start()
    worker_thread.start()

    print(f"[AI STREAM] Running on http://{AI_HOST}:{AI_PORT}")
    print(f"[AI STREAM] Video feed: http://{AI_HOST}:{AI_PORT}/video-feed")

    app.run(
        host=AI_HOST,
        port=AI_PORT,
        debug=False,
        threaded=True,
        use_reloader=False
    )