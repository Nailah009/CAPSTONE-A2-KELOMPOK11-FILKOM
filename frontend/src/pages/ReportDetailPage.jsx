import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AlertCircle, CheckCircle, XCircle, User, FileText } from 'lucide-react'
import api from '../services/api'
import { getCurrentUser } from '../utils/auth'

export default function ReportDetailPage() {
  const { reportId } = useParams()
  const [report, setReport] = useState(null)
  const [isValidating, setIsValidating] = useState(false)
  const [validationMessage, setValidationMessage] = useState('')
  
  const [inputViolatorName, setInputViolatorName] = useState('')
  const [inputNotes, setInputNotes] = useState('')
  
  const user = getCurrentUser()

  useEffect(() => {
    api.get(`/reports/${reportId}`)
      .then((res) => {
        setReport(res.data)
        setInputViolatorName(res.data.violatorName || '')
        setInputNotes(res.data.notes || '')
      })
      .catch((error) => console.error('Gagal mengambil detail report:', error))
  }, [reportId])

  const handleValidate = async (status) => {
    if (!user?.id) {
      alert('User tidak ditemukan')
      return
    }

    if (status === 'invalid' && !inputNotes.trim()) {
      setValidationMessage('✗ Wajib mengisi catatan jika laporan dinyatakan Tidak Valid (Salah Deteksi).')
      setTimeout(() => setValidationMessage(''), 3000)
      return
    }

    setIsValidating(true)
    try {
      await api.put(`/reports/${reportId}/validate`, {
        validationStatus: status,
        validatedBy: user.id,
        violatorName: inputViolatorName,
        notes: inputNotes
      })
      
      setValidationMessage(`✓ Report berhasil divalidasi sebagai ${status}`)
      setReport({ 
        ...report, 
        validationStatus: status,
        violatorName: inputViolatorName,
        notes: inputNotes
      })
      
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

      {/* Kontainer utama diset memiliki properti alignItems: 'start' agar kolom tidak saling memanjangkan diri */}
      <div className="report-detail-layout" style={{ alignItems: 'flex-start' }}>
        
        {/* KOLOM KIRI: INTERNAL SCROLL */}
        <section 
          className="report-info-card" 
          style={{ 
            maxHeight: 'calc(100vh - 140px)', // Membatasi tinggi maksimum layar
            overflowY: 'auto',                // Mengaktifkan scroll internal
            paddingRight: '1rem',             // Memberi ruang agar scrollbar tidak menabrak teks
          }}
        >
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

          {!isReportPending && (report.violatorName || report.notes) && (
            <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #e5e7eb' }}>
              <h3 style={{ marginBottom: '1rem', fontSize: '0.95rem', fontWeight: '600' }}>Catatan Pengawas</h3>
              
              {report.violatorName && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: '#374151' }}>
                  <User size={16} style={{ color: '#6b7280' }}/>
                  <strong style={{ fontSize: '0.875rem' }}>Nama Pelanggar:</strong>
                  <span style={{ fontSize: '0.875rem' }}>{report.violatorName}</span>
                </div>
              )}
              
              {report.notes && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', color: '#374151' }}>
                  <FileText size={16} style={{ color: '#6b7280', marginTop: '0.1rem' }}/>
                  <div>
                    <strong style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Keterangan / Tindak Lanjut:</strong>
                    <p style={{ fontSize: '0.875rem', margin: 0, backgroundColor: '#f3f4f6', padding: '0.75rem', borderRadius: '0.375rem' }}>
                      {report.notes}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {isReportPending && user?.role === 'supervisor' && (
            <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #e5e7eb' }}>
              <h3 style={{ marginBottom: '1rem', fontSize: '0.95rem', fontWeight: '600' }}>Validasi Pelanggaran</h3>
              
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', color: '#4b5563' }}>
                  Nama Pelanggar <span style={{ color: '#9ca3af' }}>(Opsional)</span>
                </label>
                <input 
                  type="text" 
                  value={inputViolatorName}
                  onChange={(e) => setInputViolatorName(e.target.value)}
                  placeholder="Contoh: Budi Santoso / Pekerja Subkon" 
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '0.375rem', border: '1px solid #d1d5db', fontSize: '0.875rem' }}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', color: '#4b5563' }}>
                  Catatan / Keterangan <span style={{ color: '#9ca3af' }}>(Wajib jika Invalid)</span>
                </label>
                <textarea 
                  value={inputNotes}
                  onChange={(e) => setInputNotes(e.target.value)}
                  placeholder="Contoh: Sudah diberikan teguran lisan. / Salah deteksi AI, benda tersebut adalah tumpukan barang." 
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '0.375rem', border: '1px solid #d1d5db', minHeight: '80px', fontSize: '0.875rem', fontFamily: 'inherit' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  onClick={() => handleValidate('valid')}
                  disabled={isValidating}
                  style={{
                    flex: 1, padding: '0.75rem 1rem', backgroundColor: '#10b981', color: 'white',
                    border: 'none', borderRadius: '0.375rem', cursor: isValidating ? 'not-allowed' : 'pointer',
                    fontSize: '0.875rem', fontWeight: '500', opacity: isValidating ? 0.7 : 1
                  }}
                >
                  ✓ Valid
                </button>
                <button
                  onClick={() => handleValidate('invalid')}
                  disabled={isValidating}
                  style={{
                    flex: 1, padding: '0.75rem 1rem', backgroundColor: '#ef4444', color: 'white',
                    border: 'none', borderRadius: '0.375rem', cursor: isValidating ? 'not-allowed' : 'pointer',
                    fontSize: '0.875rem', fontWeight: '500', opacity: isValidating ? 0.7 : 1
                  }}
                >
                  ✗ Not Valid
                </button>
              </div>
            </div>
          )}

          {validationMessage && (
            <div style={{
              marginTop: '1rem', padding: '0.75rem 1rem',
              backgroundColor: validationMessage.startsWith('✓') ? '#d1fae5' : '#fee2e2',
              color: validationMessage.startsWith('✓') ? '#047857' : '#b91c1c',
              borderRadius: '0.375rem', fontSize: '0.875rem'
            }}>
              {validationMessage}
            </div>
          )}
        </section>

        {/* KOLOM KANAN: STICKY POSITIONING */}
        <section 
          className="report-evidence-card" 
          style={{ 
            position: 'sticky', // Kolom kanan akan menempel di atas
            top: '2rem',
            height: 'fit-content' 
          }}
        >
          <div className="evidence-header">
            <h2>Bukti Pelanggaran</h2>
            <p>Bukti tangkapan pelanggaran dari sistem deteksi.</p>
          </div>

          {/* KUNCI PROPORSI GAMBAR: HEIGHT FIXED & OBJECT FIT */}
          <div 
            className="evidence-frame" 
            style={{ 
              
              aspectRatio: '4/3', 
              width: '100%', 
              backgroundColor: '#1e293b', 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center',
              borderRadius: '0.5rem',
              overflow: 'hidden'
            }}
          >
            {evidenceImage ? (
              <img
                src={evidenceImage}
                alt="Bukti Pelanggaran"
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  objectFit: 'contain' // Menjaga rasio foto asli tanpa melar
                }}
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