import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Camera } from 'lucide-react'
import api from '../services/api'

export default function LiveCameraPage() {
  const [cameras, setCameras] = useState([])

  useEffect(() => {
    api.get('/cameras')
      .then((res) => setCameras(res.data))
      .catch((error) => console.error('Gagal mengambil data kamera:', error))
  }, [])

  return (
    <div className="live-camera-page">
      <div className="live-camera-page-header">
        <h1>Live Camera Monitoring</h1>
        <p>Daftar kamera aktif dan status pemantauan area produksi.</p>
      </div>

      <div className="live-camera-grid">
        {cameras.map((camera) => (
          <div className="live-camera-card" key={camera.id}>
            <div className="live-camera-card-top">
              <span
                className={`status-pill ${camera.status
                  .toLowerCase()
                  .replace(/\s/g, '-')}`}
              >
                {camera.status}
              </span>

              <div className="live-camera-icon">
                <Camera size={20} />
              </div>
            </div>

            <div className="live-camera-info">
              <h3>{camera.name}</h3>
              <p>{camera.location}</p>
            </div>

            <Link to={`/live-camera/${camera.id}`} className="live-camera-link">
              Lihat Detail
            </Link>
          </div>
        ))}
      </div>
    </div>
  )
}