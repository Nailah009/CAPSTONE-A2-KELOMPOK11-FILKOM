import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
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
          <img
            src="http://localhost:8000/video-feed"
            alt="Live Detection Stream"
            className="sk3-live-stream"
          />

          <div className="sk3-video-badge">
            Live Detection - {camera.name}
          </div>
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
            <strong>{camera.status}</strong>
          </div>
        </aside>
      </div>
    </div>
  )
}