import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import api from '../services/api'

export default function ReportDetailPage() {
  const { reportId } = useParams()
  const [report, setReport] = useState(null)

  useEffect(() => {
    api.get(`/reports/${reportId}`)
      .then((res) => setReport(res.data))
      .catch((error) => console.error('Gagal mengambil detail report:', error))
  }, [reportId])

  if (!report) {
    return <div className="loading-box">Loading report...</div>
  }

  const evidenceImage = report.imagePath || report.image

  return (
    <div className="report-detail-page">
      <Link to="/reports" className="report-back-link">
        ← Kembali
      </Link>

      <div className="report-detail-header">
        <h1>Detail Report</h1>
        <p>Informasi detail pelanggaran dari sistem monitoring K3.</p>
      </div>

      <div className="report-detail-layout">
        <section className="report-info-card">
          <h2>Informasi Pelanggaran</h2>

          <div className="report-info-list">
            <div className="report-info-item">
              <span>ID</span>
              <strong>{report.id}</strong>
            </div>

            <div className="report-info-item">
              <span>Area</span>
              <strong>{report.area}</strong>
            </div>

            <div className="report-info-item">
              <span>Camera</span>
              <strong>{report.cameraId}</strong>
            </div>

            <div className="report-info-item">
              <span>Type</span>
              <strong>{report.type}</strong>
            </div>

            <div className="report-info-item">
              <span>Timestamp</span>
              <strong>{report.timestamp}</strong>
            </div>
          </div>
        </section>

        <section className="report-evidence-card">
          <div className="evidence-header">
            <h2>Bukti Pelanggaran</h2>
            <p>Bukti tangkapan pelanggaran dari sistem deteksi.</p>
          </div>

          <div className="evidence-frame">
            {evidenceImage ? (
              <img
                src={evidenceImage}
                alt="Bukti Pelanggaran"
                className="report-evidence-image"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                }}
              />
            ) : (
              <div className="report-evidence-placeholder">
                Evidence belum tersedia
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}