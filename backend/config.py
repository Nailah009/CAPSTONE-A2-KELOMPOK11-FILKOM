import os

class Config:
    # Konfigurasi MySQL
    SQLALCHEMY_DATABASE_URI = 'mysql+pymysql://root:@localhost/epson_k3_monitoring'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Path untuk menyimpan foto pelanggaran
    BASE_DIR = os.path.abspath(os.path.dirname(__name__))
    UPLOAD_FOLDER = os.path.join(BASE_DIR, 'static', 'uploads', 'violations')