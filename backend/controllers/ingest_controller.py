import os
from datetime import datetime
from flask import Blueprint, request, jsonify, current_app
from models import db
from models.k3_models import Violation

# Membuat Blueprint untuk grup API "ingest"
ingest_bp = Blueprint('ingest_bp', __name__)

@ingest_bp.route('/ingest', methods=['POST'])
def ingest_violation():
    try:
        # A. Validasi File Gambar
        if 'image' not in request.files:
            return jsonify({"status": "error", "message": "Tidak ada file gambar"}), 400

        file = request.files['image']
        if file.filename == '':
            return jsonify({"status": "error", "message": "File tidak valid"}), 400

        # B. Ambil Data dari OpenCV
        camera_id = request.form.get('camera_id', 1)
        missing_helmet = request.form.get('missing_helmet', 'false').lower() == 'true'
        missing_vest = request.form.get('missing_vest', 'false').lower() == 'true'
        missing_shoes = request.form.get('missing_shoes', 'false').lower() == 'true'

        # C. Simpan Gambar secara fisik
        upload_folder = current_app.config['UPLOAD_FOLDER']
        os.makedirs(upload_folder, exist_ok=True)
        
        timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"cam_{camera_id}_{timestamp_str}.jpg"
        filepath = os.path.join(upload_folder, filename)
        
        file.save(filepath)

        # D. Simpan ke Database
        new_violation = Violation(
            camera_id=int(camera_id),
            missing_helmet=missing_helmet,
            missing_vest=missing_vest,
            missing_shoes=missing_shoes,
            snapshot_path=filepath
        )
        
        db.session.add(new_violation)
        db.session.commit()

        print(f"[CONTROLLER] Pelanggaran dicatat untuk Kamera {camera_id}!")
        return jsonify({"status": "success", "message": "Pelanggaran berhasil dicatat"}), 201

    except Exception as e:
        db.session.rollback()
        print(f"[ERROR] {str(e)}")
        return jsonify({"status": "error", "message": "Internal server error"}), 500