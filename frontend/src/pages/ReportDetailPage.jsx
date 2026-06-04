import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AlertCircle, CheckCircle, XCircle, User, FileText, Info } from 'lucide-react'
import api from '../services/api'
import { getCurrentUser } from '../utils/auth'

export default function ReportDetailPage() {
  const { reportId } = useParams()
  const [report, setReport] = useState(null)
  
  // State untuk Data Input
  const [inputViolatorName, setInputViolatorName] = useState('')
  const [inputNotes, setInputNotes] = useState('')
  
  // State untuk Kontrol UI (Modal & Toast)
  const [showValidationModal, setShowValidationModal] = useState(false)
  const [pendingValidationStatus, setPendingValidationStatus] = useState(null)
  const [modalError, setModalError] = useState('')
  const [isValidating, setIsValidating] = useState(false)
  const [validationMessage, setValidationMessage] = useState('')
  
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

  // Fungsi Pemicu Pop-up Modal
  const openValidationModal = (status) => {
    setPendingValidationStatus(status)
    setModalError('')
    setShowValidationModal(true)
  }

  const closeValidationModal = () => {
    setShowValidationModal(false)
    setPendingValidationStatus(null)
    setModalError('')
  }

  // Fungsi Eksekusi API saat tombol Simpan di Modal ditekan
  const submitValidation = async () => {
    if (!user?.id) {
      alert('User tidak ditemukan')
      return
    }

    // Validasi wajib isi khusus untuk status Invalid
    if (pendingValidationStatus === 'invalid' && !inputNotes.trim()) {
      setModalError('Keterangan / Catatan wajib diisi jika menolak laporan (Invalid).')
      return
    }

    setIsValidating(true)
    setModalError('')
    
    try {
      await api.put(`/reports/${reportId}/validate`, {
        validationStatus: pendingValidationStatus,
        validatedBy: user.id,
        violatorName: inputViolatorName,
        notes: inputNotes
      })
      
      // Update UI dan Tampilkan Toast Sukses
      setValidationMessage(`✓ Laporan berhasil divalidasi sebagai ${pendingValidationStatus.toUpperCase()}`)
      setReport({ 
        ...report, 
        validationStatus: pendingValidationStatus,
        violatorName: inputViolatorName,
        notes: inputNotes
      })
      
      closeValidationModal()
      
      // Toast menghilang otomatis dalam 5 detik
      setTimeout(() => {
        setValidationMessage('')
      }, 5000)
      
    } catch (error) {
      console.error('Gagal memvalidasi report:', error)
      setValidationMessage('✗ Terjadi kesalahan. Gagal memvalidasi laporan.')
      closeValidationModal()
      
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
    <div className="report-detail-page" style={{ position: 'relative' }}>
      <Link to="/reports" className="report-back-link">
        ← Kembali
      </Link>

      <div className="report-detail-header">
        <h1>Detail Report</h1>
        <p>Informasi detail pelanggaran dari sistem monitoring K3.</p>
      </div>

      <div className="report-detail-layout" style={{ alignItems: 'flex-start' }}>
        
        {/* KOLOM KIRI: INFO & TOMBOL AKSI */}
        <section 
          className="report-info-card" 
          style={{ 
            maxHeight: 'calc(100vh - 140px)',
            overflowY: 'auto',
            paddingRight: '1rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2>Informasi Pelanggaran</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {report.validationStatus === 'valid' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#10b981', fontSize: '0.875rem', fontWeight: 'bold' }}>
                  <CheckCircle size={16} /><span>VALID</span>
                </div>
              )}
              {report.validationStatus === 'invalid' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#ef4444', fontSize: '0.875rem', fontWeight: 'bold' }}>
                  <XCircle size={16} /><span>INVALID</span>
                </div>
              )}
              {report.validationStatus === 'pending' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#f59e0b', fontSize: '0.875rem', fontWeight: 'bold' }}>
                  <AlertCircle size={16} /><span>PENDING</span>
                </div>
              )}
            </div>
          </div>

          <div className="report-info-list">
            <div className="report-info-item"><span>ID</span><strong>{report.id}</strong></div>
            <div className="report-info-item"><span>Area</span><strong>{report.area}</strong></div>
            <div className="report-info-item"><span>Camera</span><strong>{report.cameraId}</strong></div>
            <div className="report-info-item"><span>Type</span><strong>{report.type}</strong></div>
            <div className="report-info-item"><span>Timestamp</span><strong>{report.timestamp}</strong></div>
          </div>

          {/* MENAMPILKAN CATATAN JIKA SUDAH DIVALIDASI */}
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

          {/* TOMBOL AKSI UNTUK SUPERVISOR (JIKA PENDING) */}
          {isReportPending && user?.role === 'supervisor' && (
            <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #e5e7eb' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <Info size={18} color="#64748b"/>
                <span style={{ fontSize: '0.875rem', color: '#64748b' }}>Mohon verifikasi temuan AI pada foto di samping.</span>
              </div>
              
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  onClick={() => openValidationModal('valid')}
                  style={{
                    flex: 1, padding: '0.75rem 1rem', backgroundColor: '#10b981', color: 'white',
                    border: 'none', borderRadius: '0.375rem', cursor: 'pointer',
                    fontSize: '0.875rem', fontWeight: 'bold'
                  }}
                >
                  ✓ Valid
                </button>
                <button
                  onClick={() => openValidationModal('invalid')}
                  style={{
                    flex: 1, padding: '0.75rem 1rem', backgroundColor: '#ef4444', color: 'white',
                    border: 'none', borderRadius: '0.375rem', cursor: 'pointer',
                    fontSize: '0.875rem', fontWeight: 'bold'
                  }}
                >
                  ✗ Invalid
                </button>
              </div>
            </div>
          )}
        </section>

        {/* KOLOM KANAN: BUKTI FOTO */}
        <section 
          className="report-evidence-card" 
          style={{ 
            position: 'sticky',
            top: '2rem',
            height: 'fit-content' 
          }}
        >
          <div className="evidence-header">
            <h2>Bukti Pelanggaran</h2>
            <p>Bukti tangkapan pelanggaran dari sistem deteksi.</p>
          </div>

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
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                onError={(e) => { e.currentTarget.style.display = 'none' }}
              />
            ) : (
              <div className="report-evidence-placeholder">Evidence belum tersedia</div>
            )}
          </div>
        </section>
      </div>

      {/* CUSTOM MODAL (POP-UP) FORMULIR VALIDASI */}
      {showValidationModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white', width: '90%', maxWidth: '450px',
            borderRadius: '0.75rem', padding: '1.5rem',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '0.5rem', fontSize: '1.25rem', color: '#0f172a' }}>
              Konfirmasi Laporan {pendingValidationStatus === 'valid' ? 'Valid' : 'Invalid'}
            </h3>
            <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1.5rem' }}>
              Silakan lengkapi informasi berikut sebelum menyimpan.
            </p>

            {modalError && (
              <div style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '0.75rem', borderRadius: '0.375rem', fontSize: '0.875rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertCircle size={16} /> {modalError}
              </div>
            )}

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem', color: '#334155' }}>
                Nama Pelanggar <span style={{ color: '#94a3b8', fontWeight: 'normal' }}>(Opsional)</span>
              </label>
              <input 
                type="text" 
                value={inputViolatorName}
                onChange={(e) => setInputViolatorName(e.target.value)}
                placeholder="Contoh: Budi Santoso / Pekerja Subkon" 
                style={{ width: '100%', padding: '0.6rem', borderRadius: '0.375rem', border: '1px solid #cbd5e1', fontSize: '0.875rem', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem', color: '#334155' }}>
                Catatan / Keterangan {pendingValidationStatus === 'invalid' && <span style={{ color: '#ef4444' }}>*</span>}
              </label>
              <textarea 
                value={inputNotes}
                onChange={(e) => setInputNotes(e.target.value)}
                placeholder="Contoh: Sudah diberikan teguran. / Benda tersebut adalah barang." 
                style={{ width: '100%', padding: '0.6rem', borderRadius: '0.375rem', border: `1px solid ${pendingValidationStatus === 'invalid' && !inputNotes ? '#ef4444' : '#cbd5e1'}`, minHeight: '80px', fontSize: '0.875rem', fontFamily: 'inherit', resize: 'none', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button 
                onClick={closeValidationModal}
                disabled={isValidating}
                style={{ padding: '0.6rem 1rem', backgroundColor: 'transparent', color: '#64748b', border: '1px solid #cbd5e1', borderRadius: '0.375rem', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '500' }}
              >
                Batal
              </button>
              <button 
                onClick={submitValidation}
                disabled={isValidating}
                style={{ 
                  padding: '0.6rem 1.5rem', 
                  backgroundColor: pendingValidationStatus === 'valid' ? '#10b981' : '#ef4444', 
                  color: 'white', border: 'none', borderRadius: '0.375rem', 
                  cursor: isValidating ? 'not-allowed' : 'pointer', fontSize: '0.875rem', fontWeight: '500',
                  opacity: isValidating ? 0.7 : 1
                }}
              >
                {isValidating ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM FLOATING TOAST NOTIFICATION */}
      {validationMessage && (
        <div style={{
          position: 'fixed',
          bottom: '2rem',
          right: '2rem',
          padding: '1rem 1.5rem',
          backgroundColor: validationMessage.startsWith('✓') ? '#10b981' : '#ef4444',
          color: 'white',
          borderRadius: '0.5rem',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          fontSize: '0.9rem',
          fontWeight: '500',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          animation: 'slideUp 0.3s ease-out forwards'
        }}>
          {validationMessage.startsWith('✓') ? <CheckCircle size={20} /> : <XCircle size={20} />}
          <span>{validationMessage.substring(2)}</span>
          
          <style>{`
            @keyframes slideUp {
              from { transform: translateY(100%); opacity: 0; }
              to { transform: translateY(0); opacity: 1; }
            }
          `}</style>
        </div>
      )}
    </div>
  )
}