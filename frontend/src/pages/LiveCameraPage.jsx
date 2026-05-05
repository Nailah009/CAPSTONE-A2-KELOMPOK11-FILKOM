import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'

export default function LiveCameraPage() {
  const [cameras, setCameras] = useState([])

  useEffect(() => {
    api.get('/cameras').then((res) => setCameras(res.data))
  }, [])

  return (
    <div>
      <div className="page-topbar">
        <div>
          <h1 className="page-title">Live Camera Monitoring</h1>
          <p className="page-subtitle">Daftar kamera aktif dan status pemantauan area produksi.</p>
        </div>
      </div>

      <div className="camera-grid-page">
        {cameras.map((cam) => (
          <div className="panel card camera-card-page" key={cam.id}>
            <div className="camera-card-head">
              <span className={`status-pill ${cam.status.toLowerCase()}`}>{cam.status}</span>
            </div>
            <h3>{cam.name}</h3>
            <p>{cam.location}</p>
            <Link className="link-btn left-link" to={`/live-camera/${cam.id}`}>Lihat Detail</Link>
          </div>
        ))}
      </div>
    </div>
  )
}
