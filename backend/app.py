from flask import Flask
from config import Config
from models import db
from controllers.ingest_controller import ingest_bp

def create_app():
    # 1. Inisialisasi Flask
    app = Flask(__name__)
    
    # 2. Muat Konfigurasi dari config.py
    app.config.from_object(Config)

    # 3. Hubungkan Database SQLAlchemy ke aplikasi Flask
    db.init_app(app)

    # 4. Daftarkan Blueprint (Controller)
    # Semua rute di ingest_bp akan otomatis diawali dengan /api/violations
    app.register_blueprint(ingest_bp, url_prefix='/api/violations')

    return app

if __name__ == '__main__':
    app = create_app()
    # Jalankan server di port 5000
    app.run(debug=True, port=5000)