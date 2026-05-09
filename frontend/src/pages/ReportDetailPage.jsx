import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import api from '../services/api'

export default function ReportDetailPage() {
  const { reportId } = useParams()
  const [report, setReport] = useState(null)

  useEffect(() => {
    api.get(`/reports/${reportId}`).then((res) => setReport(res.data))
  }, [reportId])

  if (!report) return <div className="loading-box">Loading report...</div>

  return (
    <div>
      <div className="page-topbar">
        <div>
          <Link className="back-link" to="/reports">← Kembali</Link>
          <h1 className="page-title">Detail Report</h1>
          <p className="page-subtitle">Informasi detail pelanggaran dari sistem monitoring K3.</p>
        </div>
      </div>

      <div className="camera-detail-layout">
        <div className="panel card detail-side">
          <h3>Informasi Pelanggaran</h3>
          <div className="detail-list">
            <div className="detail-item"><span>ID</span><strong>{report.id}</strong></div>
            <div className="detail-item"><span>Area</span><strong>{report.area}</strong></div>
            <div className="detail-item"><span>Camera</span><strong>{report.cameraId}</strong></div>
            <div className="detail-item"><span>Type</span><strong>{report.type}</strong></div>
            <div className="detail-item"><span>Timestamp</span><strong>{report.timestamp}</strong></div>
            <div className="detail-item"><span>Status</span><strong>{report.reportStatus}</strong></div>
          </div>
        </div>
        <div className="panel card">
          <img className="camera-image" src={report.image} alt={report.type} />
        </div>
      </div>
    </div>
  )
}