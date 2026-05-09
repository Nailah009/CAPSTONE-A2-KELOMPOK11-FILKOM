import cv2
import time
import requests
from flask import Flask, Response
from flask_cors import CORS
from ultralytics import YOLO

app = Flask(__name__)
CORS(app)

MODEL_FILE = "best.pt"
CAMERA_SOURCE = 0

BACKEND_REPORT_URL = "http://localhost:5000/api/reports"

model = YOLO(MODEL_FILE)

print("[YOLO] Class model:", model.names)

last_sent_time = 0
cooldown_seconds = 10


def send_violation_to_backend(violation_type):
    global last_sent_time

    now = time.time()
    if now - last_sent_time < cooldown_seconds:
        return

    payload = {
        "area": "Webcam Test Area",
        "cameraId": "CAM-LAPTOP",
        "type": violation_type,
        "reportStatus": "New"
    }

    try:
        response = requests.post(BACKEND_REPORT_URL, json=payload, timeout=5)

        if response.status_code in [200, 201]:
            print(f"[API] Pelanggaran terkirim: {violation_type}")
            last_sent_time = now
        else:
            print(f"[API] Gagal kirim: {response.status_code} {response.text}")

    except Exception as error:
        print("[API] Error kirim report:", error)


def detect_ppe(frame):
    results = model(frame, conf=0.45, verbose=False)

    persons = []
    helmets = []
    vests = []

    for result in results:
        for box in result.boxes:
            cls_id = int(box.cls[0])
            class_name = model.names[cls_id].lower()
            conf = float(box.conf[0])

            x1, y1, x2, y2 = map(int, box.xyxy[0])

            detected_item = {
                "box": (x1, y1, x2, y2),
                "conf": conf
            }

            if class_name == "person":
                persons.append(detected_item)
            elif class_name == "helmet":
                helmets.append(detected_item)
            elif class_name == "vest":
                vests.append(detected_item)

    violation_type = None

    for person in persons:
        px1, py1, px2, py2 = person["box"]

        has_helmet = False
        has_vest = False

        for helmet in helmets:
            hx1, hy1, hx2, hy2 = helmet["box"]
            helmet_center_x = (hx1 + hx2) // 2
            helmet_center_y = (hy1 + hy2) // 2

            if px1 <= helmet_center_x <= px2 and py1 <= helmet_center_y <= py2:
                has_helmet = True
                break

        for vest in vests:
            vx1, vy1, vx2, vy2 = vest["box"]
            vest_center_x = (vx1 + vx2) // 2
            vest_center_y = (vy1 + vy2) // 2

            if px1 <= vest_center_x <= px2 and py1 <= vest_center_y <= py2:
                has_vest = True
                break

        missing = []

        if not has_helmet:
            missing.append("helmet")

        if not has_vest:
            missing.append("vest")

        if len(missing) == 0:
            label = "SAFE"
            color = (0, 255, 0)
        elif len(missing) == 2:
            label = "MISSING ALL PPE"
            color = (0, 0, 255)
            violation_type = "Missing All PPE"
        elif "helmet" in missing:
            label = "MISSING HELMET"
            color = (0, 165, 255)
            violation_type = "Missing helmet"
        elif "vest" in missing:
            label = "MISSING VEST"
            color = (0, 165, 255)
            violation_type = "Missing vest"

        cv2.rectangle(frame, (px1, py1), (px2, py2), color, 3)

        cv2.rectangle(frame, (px1, py1 - 36), (px2, py1), color, -1)

        cv2.putText(
            frame,
            label,
            (px1 + 8, py1 - 10),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.75,
            (255, 255, 255),
            2
        )

    for helmet in helmets:
        x1, y1, x2, y2 = helmet["box"]
        cv2.rectangle(frame, (x1, y1), (x2, y2), (37, 99, 235), 2)
        cv2.putText(frame, "Helmet", (x1, y1 - 8), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (37, 99, 235), 2)

    for vest in vests:
        x1, y1, x2, y2 = vest["box"]
        cv2.rectangle(frame, (x1, y1), (x2, y2), (239, 68, 68), 2)
        cv2.putText(frame, "Vest", (x1, y1 - 8), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (239, 68, 68), 2)

    if violation_type:
        send_violation_to_backend(violation_type)

    return frame


def generate_frames():
    cap = cv2.VideoCapture(CAMERA_SOURCE)

    if not cap.isOpened():
        print("[STREAM] Kamera gagal dibuka")
        return

    print("[STREAM] Kamera berhasil dibuka")

    while True:
        success, frame = cap.read()

        if not success:
            print("[STREAM] Gagal membaca frame")
            break

        frame = detect_ppe(frame)

        ret, buffer = cv2.imencode(".jpg", frame)

        if not ret:
            continue

        frame_bytes = buffer.tobytes()

        yield (
            b"--frame\r\n"
            b"Content-Type: image/jpeg\r\n\r\n" + frame_bytes + b"\r\n"
        )

    cap.release()


@app.route("/")
def index():
    return {
        "status": "ok",
        "message": "Smart K3 Vision AI Stream is running"
    }


@app.route("/video-feed")
def video_feed():
    return Response(
        generate_frames(),
        mimetype="multipart/x-mixed-replace; boundary=frame"
    )


if __name__ == "__main__":
    print("[AI STREAM] Running on http://localhost:8000")
    app.run(host="0.0.0.0", port=8000, debug=False)