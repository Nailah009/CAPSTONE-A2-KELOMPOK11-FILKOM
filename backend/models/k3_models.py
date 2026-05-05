from . import db
from datetime import datetime

class Camera(db.Model):
    __tablename__ = 'cameras'
    id = db.Column(db.Integer, primary_key=True)
    zone_id = db.Column(db.Integer, nullable=False)
    name = db.Column(db.String(100), nullable=False)
    rtsp_url = db.Column(db.String(255), nullable=False)
    is_active = db.Column(db.Boolean, default=True)

class Violation(db.Model):
    __tablename__ = 'violations'
    id = db.Column(db.BigInteger, primary_key=True)
    camera_id = db.Column(db.Integer, db.ForeignKey('cameras.id'), nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    missing_helmet = db.Column(db.Boolean, default=False)
    missing_vest = db.Column(db.Boolean, default=False)
    missing_shoes = db.Column(db.Boolean, default=False)
    snapshot_path = db.Column(db.String(255), nullable=False)
    status = db.Column(db.Enum('pending', 'valid', 'false_positive'), default='pending')