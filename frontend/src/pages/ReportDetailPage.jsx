import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AlertCircle, CheckCircle, XCircle } from 'lucide-react'
import api from '../services/api'
import { getCurrentUser } from '../utils/auth'

export default function ReportDetailPage() {
  const { reportId } = useParams()
  const [report, setReport] = useState(null)
  const [isValidating, setIsValidating] = useState(false)
  const [validationMessage, setValidationMessage] = useState('')
  const user = getCurrentUser()

  useEffect(() => {
    api.get(`/reports/${reportId}`)
      .then((res) => setReport(res.data))
      .catch((error) => console.error('Gagal mengambil detail report:', error))
  }, [reportId])

  const handleValidate = async (status) => {
    if (!user?.id) {
      alert('User tidak ditemukan')
      return
    }

    setIsValidating(true)
    try {
      await api.put(`/reports/${reportId}/validate`, {
        validationStatus: status,
        validatedBy: user.id
      })
      
      setValidationMessage(`✓ Report berhasil divalidasi sebagai ${status}`)
      setReport({ ...report, validationStatus: status })
      
      setTimeout(() => {
        setValidationMessage('')
      }, 3000)
    } catch (error) {
      console.error('Gagal memvalidasi report:', error)
      setValidationMessage('✗ Gagal memvalidasi report')
      setTimeout(() => {
        setValidationMessage('')
      }, 3000)
    } finally {
      setIsValidating(false)
    }
  }

  if (!report) {
    return <div className="loading-box">Loading report...</div>
  }

  const evidenceImage = report.imagePath || report.image
  const isReportPending = report.validationStatus === 'pending'

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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2>Informasi Pelanggaran</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {report.validationStatus === 'valid' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#10b981', fontSize: '0.875rem' }}>
                  <CheckCircle size={16} />
                  <span>Valid</span>
                </div>
              )}
              {report.validationStatus === 'invalid' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#ef4444', fontSize: '0.875rem' }}>
                  <XCircle size={16} />
                  <span>Invalid</span>
                </div>
              )}
              {report.validationStatus === 'pending' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#f59e0b', fontSize: '0.875rem' }}>
                  <AlertCircle size={16} />
                  <span>Pending</span>
                </div>
              )}
            </div>
          </div>

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

          {isReportPending && (user?.role === 'supervisor' || user?.role === 'general_manager') && (
            <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #e5e7eb' }}>
              <h3 style={{ marginBottom: '1rem', fontSize: '0.95rem', fontWeight: '600' }}>Validasi Pelanggaran</h3>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  onClick={() => handleValidate('valid')}
                  disabled={isValidating}
                  style={{
                    flex: 1,
                    padding: '0.75rem 1rem',
                    backgroundColor: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.375rem',
                    cursor: isValidating ? 'not-allowed' : 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    opacity: isValidating ? 0.7 : 1
                  }}
                >
                  ✓ Valid
                </button>
                <button
                  onClick={() => handleValidate('invalid')}
                  disabled={isValidating}
                  style={{
                    flex: 1,
                    padding: '0.75rem 1rem',
                    backgroundColor: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.375rem',
                    cursor: isValidating ? 'not-allowed' : 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    opacity: isValidating ? 0.7 : 1
                  }}
                >
                  ✗ Not Valid
                </button>
              </div>
            </div>
          )}

          {validationMessage && (
            <div style={{
              marginTop: '1rem',
              padding: '0.75rem 1rem',
              backgroundColor: validationMessage.startsWith('✓') ? '#d1fae5' : '#fee2e2',
              color: validationMessage.startsWith('✓') ? '#047857' : '#b91c1c',
              borderRadius: '0.375rem',
              fontSize: '0.875rem'
            }}>
              {validationMessage}
            </div>
          )}
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