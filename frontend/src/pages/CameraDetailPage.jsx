import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import api from '../services/api'

export default function CameraDetailPage() {
  const { cameraId } = useParams()
  const [camera, setCamera] = useState(null)

  useEffect(() => {
    api.get(`/cameras/${cameraId}`).then((res) => setCamera(res.data))
  }, [cameraId])

  if (!camera) return <div className="loading-box">Loading camera...</div>

  return (
    <div>
      <div className="page-topbar">
        <div>
          <Link className="back-link" to="/live-camera">← Kembali</Link>
          <h1 className="page-title">{camera.name}</h1>
          <p className="page-subtitle">Monitoring area: {camera.location}</p>
        </div>
      </div>

      <div className="camera-detail-layout">
        <div className="panel card">
          <img className="camera-image" src={camera.preview} alt={camera.name} />
        </div>
        <div className="panel card detail-side">
          <h3>Informasi Kamera</h3>
          <div className="detail-list">
            <div className="detail-item"><span>ID Kamera</span><strong>{camera.id}</strong></div>
            <div className="detail-item"><span>Nama Kamera</span><strong>{camera.name}</strong></div>
            <div className="detail-item"><span>Lokasi</span><strong>{camera.location}</strong></div>
            <div className="detail-item"><span>Status</span><strong>{camera.status}</strong></div>
          </div>
        </div>
      </div>
    </div>
  )
}
