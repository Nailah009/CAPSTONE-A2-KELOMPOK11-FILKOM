import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AlertCircle } from 'lucide-react'
import api from '../services/api'

export default function CameraDetailPage() {
  const { cameraId } = useParams()
  const [camera, setCamera] = useState(null)

  useEffect(() => {
    api.get(`/cameras/${cameraId}`)
      .then((res) => setCamera(res.data))
      .catch((error) => console.error('Gagal ambil detail camera:', error))
  }, [cameraId])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = 'auto'
      document.documentElement.style.overflow = 'auto'
    }
  }, [])

  if (!camera) {
    return <div className="loading-box">Loading camera...</div>
  }

  const isActive = camera.status === 'Active'

  return (
    <div className="sk3-camera-page">
      <div className="sk3-camera-top">
        <Link to="/live-camera" className="sk3-back-link">
          ← Kembali
        </Link>

        <h1>{camera.name}</h1>
        <p>Monitoring area: {camera.location}</p>
      </div>

      <div className="sk3-camera-grid">
        <section className="sk3-video-card">
          {isActive ? (
            <>
              <img
                src={`http://localhost:5055/video-feed/${cameraId}`}
                alt={`Live Detection Stream - ${camera.name}`}
                className="sk3-live-stream"
                onError={(e) => {
                  e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect fill="%23f0f0f0" width="400" height="300"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="%23999" font-size="16">Kamera sedang memproses...</text></svg>'
                }}
              />

              <div className="sk3-video-badge">
                Live Detection - {camera.name}
              </div>
            </>
          ) : (
            <div className="sk3-inactive-stream">
              <AlertCircle size={64} color="#ef4444" />
              <h3>Kamera Tidak Aktif</h3>
              <p>Kamera ini belum dikonfigurasi dengan RTSP URL atau alamat device.</p>
              <p className="text-muted">Status: {camera.status}</p>
            </div>
          )}
        </section>

        <aside className="sk3-info-card">
          <h2>Informasi Kamera</h2>

          <div className="sk3-info-row">
            <span>ID Kamera</span>
            <strong>{camera.id}</strong>
          </div>

          <div className="sk3-info-row">
            <span>Nama Kamera</span>
            <strong>{camera.name}</strong>
          </div>

          <div className="sk3-info-row">
            <span>Lokasi</span>
            <strong>{camera.location}</strong>
          </div>

          <div className="sk3-info-row">
            <span>Status</span>
            <strong className={isActive ? 'text-success' : 'text-danger'}>
              {camera.status}
            </strong>
          </div>

          {camera.rtsp_url && (
            <div className="sk3-info-row">
              <span>RTSP URL</span>
              <strong className="rtsp-url">
                {camera.rtsp_url === '0' ? 'Laptop Webcam (0)' : camera.rtsp_url}
              </strong>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}