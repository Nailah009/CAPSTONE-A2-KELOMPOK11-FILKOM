import cv2
import time
import os
import threading
import queue
import requests
import numpy as np
from queue import Queue
from datetime import datetime
from flask import Flask, Response
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

# Multi-camera support
CAMERAS_CONFIG = {}  # { camera_id: {source, area_name, rules, config} }
ACTIVE_CAMERAS = {}  # { camera_id: {frame_queue, latest_frame, locks} }

BACKEND_REPORT_URL = "http://localhost:5000/api/reports"
BACKEND_CONFIG_URL = "http://localhost:5000/api/admin/ai-config"

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
# AI Rules Configuration (Updated by fetch_camera_config)
# ==========================================
# These are now per-camera, stored in CAMERAS_CONFIG

# ==========================================
# Shared State
# ==========================================
config_update_interval = 30  # Update config setiap 30 detik
last_config_update = 0

BACKEND_UPLOAD_DIR = os.path.abspath(
    os.path.join(os.getcwd(), "..", "backend", "uploads", "violations")
)

if not os.path.exists(BACKEND_UPLOAD_DIR):
    os.makedirs(BACKEND_UPLOAD_DIR)

# ==========================================
# Fetch Configuration from Backend (Multi-Camera)
# ==========================================
def fetch_all_cameras_config():
    """
    Fetch ALL cameras from backend and update CAMERAS_CONFIG.
    Each area automatically activates when camera has valid RTSP URL.
    """
    global CAMERAS_CONFIG, last_config_update
    
    try:
        response = requests.get(BACKEND_CONFIG_URL, timeout=5)
        if response.status_code == 200:
            config = response.json()
            cameras = config.get('cameras', [])
            
            new_config = {}
            for cam in cameras:
                cam_id = cam.get('id')
                rtsp_url = cam.get('rtsp_url', '0')
                
                # Determine camera source
                camera_source = 0  # Default to laptop
                if rtsp_url and rtsp_url != '0' and rtsp_url.strip():
                    camera_source = rtsp_url
                
                rules = cam.get('rules', {})
                
                new_config[cam_id] = {
                    'source': camera_source,
                    'area_name': cam.get('location', 'Unknown Area'),
                    'name': cam.get('name', 'Unknown Camera'),
                    'rtsp_url': rtsp_url,
                    'enforce_helmet': bool(rules.get('enforce_helmet', True)),
                    'enforce_vest': bool(rules.get('enforce_vest', True)),
                    'enforce_gloves': bool(rules.get('enforce_gloves', False)),
                    'enforce_shoes': bool(rules.get('enforce_shoes', True)),
                    'is_active': camera_source != 0 or cam_id == "CAM-LAPTOP"  # Active if RTSP or laptop
                }
            
            CAMERAS_CONFIG = new_config
            last_config_update = time.time()
            
            print("[CONFIG] ✅ Multi-camera config berhasil diambil")
            for cam_id, config in CAMERAS_CONFIG.items():
                status = "ACTIVE" if config['is_active'] else "INACTIVE"
                print(f"  - {cam_id} ({config['name']}) @ {config['area_name']}: {status}")
            
            return True
    except Exception as e:
        print(f"[CONFIG] ❌ Gagal mengambil konfigurasi: {e}")
    
    return False

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
# Helper: Kirim report ke Backend Express (Per-Camera)
# ==========================================
def send_violation_to_backend(camera_id, area_name, report_type, missing_items, image_path):
    """
    Send violation report to backend.
    Supports multi-camera with per-camera cooldown.
    """
    global ACTIVE_CAMERAS
    
    if camera_id not in ACTIVE_CAMERAS:
        return
    
    cam_state = ACTIVE_CAMERAS[camera_id]
    now = time.time()
    
    # Per-camera cooldown
    if now - cam_state.get('last_sent_time', 0) < SEND_COOLDOWN_SECONDS:
        return

    payload = {
        "area": area_name,
        "cameraId": camera_id,
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
            print(f"Area          : {area_name}")
            print(f"Camera        : {camera_id}")
            print(f"Type          : {report_type}")
            print(f"Missing Items : {missing_items}")
            print(f"Image Path    : {image_path}")
            print("==================================================")
            ACTIVE_CAMERAS[camera_id]['last_sent_time'] = now
        else:
            print(f"[API] Gagal kirim: {response.status_code} {response.text}")

    except Exception as error:
        print(f"[API] Error kirim report: {error}")

# ==========================================
# Producer: Multi-Camera Stream Ingestion
# ==========================================
def ingest_camera_stream(camera_id):
    """
    Continuously read frames from camera (RTSP or laptop).
    Each camera gets its own thread.
    """
    global CAMERAS_CONFIG, ACTIVE_CAMERAS
    
    while True:
        if camera_id not in CAMERAS_CONFIG:
            time.sleep(1)
            continue
        
        config = CAMERAS_CONFIG[camera_id]
        camera_source = config['source']
        
        print(f"[INGEST-{camera_id}] Mencoba membuka kamera: {config['name']} @ {config['area_name']}...")
        
        # Initialize camera state if not exists
        if camera_id not in ACTIVE_CAMERAS:
            ACTIVE_CAMERAS[camera_id] = {
                'frame_queue': Queue(maxsize=FRAME_QUEUE_SIZE),
                'latest_frame': None,
                'frame_lock': threading.Lock(),
                'last_sent_time': 0,
                'notification_sent': False,
                'violation_start_time': None,
                'violation_history': []
            }

        frame_queue = ACTIVE_CAMERAS[camera_id]['frame_queue']

        if isinstance(camera_source, int):
            cap = cv2.VideoCapture(camera_source)
        else:
            cap = cv2.VideoCapture(camera_source, cv2.CAP_FFMPEG)

        if not cap.isOpened():
            print(f"[INGEST-{camera_id}] ❌ Kamera gagal dibuka. Mencoba lagi dalam 5 detik...")
            time.sleep(5)
            continue

        print(f"[INGEST-{camera_id}] ✅ Kamera berhasil dibuka!")

        while True:
            # Check if config updated
            if camera_id not in CAMERAS_CONFIG:
                print(f"[INGEST-{camera_id}] Kamera dihapus dari config, berhenti.")
                break
            
            ret, frame = cap.read()

            if not ret:
                print(f"[INGEST-{camera_id}] ⚠️ Stream terputus. Mencoba reconnect...")
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
# Worker: Multi-Camera YOLO + Logic APD
# ==========================================
def yolo_worker_multi():
    """
    Process frames from ALL cameras simultaneously.
    Each camera gets its own detection pipeline.
    """
    global CAMERAS_CONFIG, ACTIVE_CAMERAS, config_update_interval, last_config_update

    print(f"[YOLO] Memuat model AI dari {MODEL_FILE}...")
    model = YOLO(MODEL_FILE)
    print(f"[YOLO] Class model: {model.names}")

    prev_time = time.time()

    while True:
        # Periodically refresh camera config
        now = time.time()
        if now - last_config_update > config_update_interval:
            fetch_all_cameras_config()

        # Process each active camera
        for camera_id, config in list(CAMERAS_CONFIG.items()):
            if camera_id not in ACTIVE_CAMERAS:
                continue
            
            cam_state = ACTIVE_CAMERAS[camera_id]
            frame_queue = cam_state['frame_queue']
            current_time = time.time()
            
            try:
                frame = frame_queue.get(timeout=0.1)
            except queue.Empty:
                # Show reconnecting message
                with cam_state['frame_lock']:
                    if cam_state['latest_frame'] is not None:
                        reconnect_frame = cam_state['latest_frame'].copy()
                        cv2.putText(
                            reconnect_frame,
                            f"{camera_id}: RECONNECTING...",
                            (20, 60),
                            cv2.FONT_HERSHEY_SIMPLEX,
                            0.9,
                            (0, 0, 255),
                            2
                        )
                        cam_state['latest_frame'] = reconnect_frame
                continue

            # Get camera rules
            enforce_helmet = config.get('enforce_helmet', True)
            enforce_vest = config.get('enforce_vest', True)
            enforce_gloves = config.get('enforce_gloves', False)
            enforce_shoes = config.get('enforce_shoes', True)

            # YOLO inference
            results = model(frame, imgsz=480, verbose=False, conf=0.50)

            persons = []
            ppes = {'helmet': [], 'vest': [], 'shoes': [], 'gloves': []}

            for box in results[0].boxes:
                class_id = int(box.cls[0])
                class_name = model.names[class_id].lower()
                coords = box.xyxy[0].cpu().numpy()

                if class_name == 'person':
                    persons.append(coords)
                elif class_name in ppes:
                    ppes[class_name].append(coords)

            any_violation = False
            frame_report_type = None
            frame_missing_items = ""

            # ==========================================
            # Loop setiap person
            # ==========================================
            for p_coords in persons:
                px1, py1, px2, py2 = p_coords
                
                margin_w = (px2 - px1) * 0.15
                margin_h = (py2 - py1) * 0.15
                epx1, epy1 = px1 - margin_w, py1 - margin_h
                epx2, epy2 = px2 + margin_w, py2 + margin_h

                # Initialize status for PPE items detected by model
                status_apd = {'helmet': False, 'vest': False, 'shoes': False, 'gloves': False}

                # Check which PPE items are detected
                for ppe_name, ppe_boxes in ppes.items():
                    for hx1, hy1, hx2, hy2 in ppe_boxes:
                        if (epx1 < hx2 and epx2 > hx1 and epy1 < hy2 and epy2 > hy1):
                            status_apd[ppe_name] = True
                            break 

                # Only check items that admin has enforced in rules
                missing_apd = []
                if enforce_helmet and not status_apd['helmet']:
                    missing_apd.append("helmet")
                if enforce_vest and not status_apd['vest']:
                    missing_apd.append("vest")
                if enforce_gloves and not status_apd['gloves']:
                    missing_apd.append("gloves")
                if enforce_shoes and not status_apd['shoes']:
                    missing_apd.append("shoes")

                if len(missing_apd) > 0:
                    any_violation = True
                    frame_missing_items = ", ".join(missing_apd)
                    # Get proper label based on missing items & enforced count
                    enforced_count = sum([enforce_helmet, enforce_vest, enforce_gloves, enforce_shoes])
                    if len(missing_apd) == enforced_count:
                        teks_status = "MISSING ALL PPE"
                        box_color = (0, 0, 255)
                        frame_report_type = "missing all ppe"
                    else:
                        label_parts = []
                        for item in missing_apd:
                            if item == "helmet":
                                label_parts.append("no helmet")
                            elif item == "vest":
                                label_parts.append("no vest")
                            elif item == "gloves":
                                label_parts.append("no gloves")
                            elif item == "shoes":
                                label_parts.append("no shoes")
                        teks_status = "MISSING: " + ", ".join(label_parts).upper()
                        box_color = (0, 165, 255)
                        frame_report_type = ", ".join(label_parts)
                else:
                    teks_status = "AMAN"
                    box_color = (0, 255, 0)

                px1, py1, px2, py2 = map(int, [px1, py1, px2, py2])

                # Bounding box person
                cv2.rectangle(frame, (px1, py1), (px2, py2), box_color, 2)

                # Background label
                cv2.rectangle(frame, (px1, py1 - 25), (px2, py1), box_color, -1)

                cv2.putText(
                    frame,
                    teks_status,
                    (px1 + 5, py1 - 8),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.45,
                    (255, 255, 255),
                    2
                )

            # ==========================================
            # Violation Stability Filter (Per-Camera)
            # ==========================================
            violation_history = cam_state.get('violation_history', [])
            violation_history.append(1 if any_violation else 0)

            if len(violation_history) > WINDOW_SIZE:
                violation_history.pop(0)
            
            cam_state['violation_history'] = violation_history
            violation_ratio = sum(violation_history) / len(violation_history) if violation_history else 0

            if any_violation and violation_ratio > RATIO_THRESHOLD:
                if cam_state.get('violation_start_time') is None:
                    cam_state['violation_start_time'] = current_time

                duration = current_time - cam_state['violation_start_time']

                if duration >= VIOLATION_THRESHOLD and not cam_state.get('notification_sent', False):
                    cam_state['notification_sent'] = True

                    if frame_report_type is not None:
                        image_path = save_violation_capture(frame)

                        print("==================================================")
                        print(f"[TRIGGER-{camera_id}] PELANGGARAN STABIL TERDETEKSI")
                        print(f"Area          : {config['area_name']}")
                        print(f"Type          : {frame_report_type}")
                        print(f"Missing Items : {frame_missing_items}")
                        print(f"Image Path    : {image_path}")
                        print("==================================================")

                        send_violation_to_backend(
                            camera_id=camera_id,
                            area_name=config['area_name'],
                            report_type=frame_report_type,
                            missing_items=frame_missing_items,
                            image_path=image_path
                        )
            else:
                cam_state['violation_start_time'] = None

            # Reset supaya bisa kirim lagi setelah kondisi benar-benar aman
            if violation_ratio == 0:
                cam_state['notification_sent'] = False

            # ==========================================
            # FPS & Camera Info
            # ==========================================
            fps = 1 / (current_time - prev_time) if (current_time - prev_time) > 0 else 0

            cv2.putText(
                frame,
                f"FPS: {int(fps)}",
                (20, 40),
                cv2.FONT_HERSHEY_SIMPLEX,
                1,
                (255, 255, 0),
                2
            )

            cv2.putText(
                frame,
                f"{camera_id} - {config['area_name']}",
                (20, 70),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.7,
                (200, 200, 200),
                1
            )

            # Store latest frame untuk Flask stream
            with cam_state['frame_lock']:
                cam_state['latest_frame'] = frame.copy()

        prev_time = current_time
        time.sleep(0.01)

# ==========================================
# Flask Stream Generators (Multi-Camera)
# ==========================================
def generate_frames(camera_id=None):
    """
    Generate video frames for specific camera or first active camera.
    """
    global ACTIVE_CAMERAS, CAMERAS_CONFIG
    
    target_camera = camera_id
    
    while True:
        # If no specific camera, use first active
        if target_camera is None or target_camera not in ACTIVE_CAMERAS:
            if CAMERAS_CONFIG:
                target_camera = list(CAMERAS_CONFIG.keys())[0]
            else:
                time.sleep(0.1)
                continue
        
        if target_camera not in ACTIVE_CAMERAS:
            time.sleep(0.1)
            continue
        
        cam_state = ACTIVE_CAMERAS[target_camera]
        
        with cam_state['frame_lock']:
            if cam_state['latest_frame'] is None:
                frame = None
            else:
                frame = cam_state['latest_frame'].copy()

        if frame is None:
            placeholder = np.zeros((720, 1280, 3), dtype=np.uint8)
            placeholder[:] = (15, 23, 42)

            cv2.putText(
                placeholder,
                f"Loading Stream for {target_camera}...",
                (350, 360),
                cv2.FONT_HERSHEY_SIMPLEX,
                1.0,
                (255, 255, 255),
                2
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
# Flask Routes (Multi-Camera Support)
# ==========================================
@app.route("/")
def index():
    cameras = list(CAMERAS_CONFIG.keys()) if CAMERAS_CONFIG else []
    return {
        "status": "ok",
        "message": "Smart K3 Vision AI Stream - Multi-Camera Support",
        "active_cameras": cameras,
        "video_feed": f"http://{AI_HOST}:{AI_PORT}/video-feed",
        "camera_feed": f"http://{AI_HOST}:{AI_PORT}/video-feed/<camera_id>"
    }

@app.route("/video-feed")
def video_feed():
    """Stream first active camera"""
    return Response(
        generate_frames(),
        mimetype="multipart/x-mixed-replace; boundary=frame"
    )

@app.route("/video-feed/<camera_id>")
def video_feed_camera(camera_id):
    """Stream specific camera by ID"""
    if camera_id not in CAMERAS_CONFIG:
        return {"error": f"Camera {camera_id} not found"}, 404
    
    return Response(
        generate_frames(camera_id),
        mimetype="multipart/x-mixed-replace; boundary=frame"
    )

@app.route("/api/cameras")
def get_cameras():
    """Get list of all available cameras with status"""
    result = []
    for cam_id, config in CAMERAS_CONFIG.items():
        result.append({
            "id": cam_id,
            "name": config['name'],
            "area": config['area_name'],
            "rtsp_url": config['rtsp_url'],
            "is_active": cam_id in ACTIVE_CAMERAS,
            "stream_url": f"http://{AI_HOST}:{AI_PORT}/video-feed/{cam_id}"
        })
    return {"cameras": result}

# ==========================================
# Main - Multi-Camera Manager
# ==========================================
if __name__ == "__main__":
    print("[STARTUP] Memulai Smart K3 Vision - Multi-Camera System...")
    
    # Fetch initial configuration from backend
    fetch_all_cameras_config()
    
    # Start YOLO worker (processes all cameras)
    worker_thread = threading.Thread(
        target=yolo_worker_multi,
        daemon=True
    )
    worker_thread.start()
    print("[STARTUP] ✅ YOLO Worker started")
    
    # Start ingestion threads for each camera
    ingest_threads = []
    def monitor_cameras():
        """Monitor and maintain camera threads"""
        active_threads = {}
        
        while True:
            # Check if we need to start new camera threads
            for camera_id in CAMERAS_CONFIG.keys():
                if camera_id not in active_threads:
                    print(f"[MONITOR] Starting ingest thread for {camera_id}...")
                    thread = threading.Thread(
                        target=ingest_camera_stream,
                        args=(camera_id,),
                        daemon=True
                    )
                    thread.start()
                    active_threads[camera_id] = thread
            
            # Check for removed cameras
            removed = [cid for cid in active_threads if cid not in CAMERAS_CONFIG]
            for cid in removed:
                print(f"[MONITOR] Camera {cid} removed from config")
                del active_threads[cid]
            
            time.sleep(5)
    
    monitor_thread = threading.Thread(
        target=monitor_cameras,
        daemon=True
    )
    monitor_thread.start()
    print("[STARTUP] ✅ Camera Monitor started")

    print(f"[AI STREAM] 🚀 Running on http://{AI_HOST}:{AI_PORT}")
    print(f"[AI STREAM] Main feed: http://{AI_HOST}:{AI_PORT}/video-feed")
    print(f"[AI STREAM] Cameras: http://{AI_HOST}:{AI_PORT}/api/cameras")

    app.run(
        host=AI_HOST,
        port=AI_PORT,
        debug=False,
        threaded=True,
        use_reloader=False
    )
