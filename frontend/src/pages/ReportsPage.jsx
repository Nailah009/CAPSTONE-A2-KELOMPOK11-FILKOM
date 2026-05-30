import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Download, AlertCircle, X } from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import api from '../services/api'

export default function ReportsPage() {
  const [reports, setReports] = useState([])
  const [currentPage, setCurrentPage] = useState(1)
  const reportsPerPage = 10

  const [typeFilter, setTypeFilter] = useState('All')
  const [areaFilter, setAreaFilter] = useState('All')
  const [validationStatusFilter, setValidationStatusFilter] = useState('All')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [stats, setStats] = useState(null)
  const [allAreas, setAllAreas] = useState([])
  const [trends, setTrends] = useState({
    time: [],
    location: [],
    type: []
  })

  // Fetch data with filters
  const fetchReports = async () => {
    try {
      const params = new URLSearchParams()
      if (areaFilter !== 'All') params.append('area', areaFilter)
      if (typeFilter !== 'All') params.append('type', typeFilter)
      if (validationStatusFilter !== 'All') params.append('validationStatus', validationStatusFilter)
      if (startDate) params.append('startDate', startDate)
      if (endDate) params.append('endDate', endDate)

      const response = await api.get(`/reports?${params.toString()}`)
      setReports(response.data)
    } catch (error) {
      console.error('Error fetching reports:', error)
    }
  }

  // Fetch all areas from the API
  const fetchAllAreas = async () => {
    try {
      const response = await api.get('/admin/areas')
      const areaNames = response.data.map(area => area.name)
      setAllAreas(['All', ...areaNames])
    } catch (error) {
      console.error('Error fetching areas:', error)
      setAllAreas(['All'])
    }
  }

  useEffect(() => {
    fetchReports()
    fetchAllAreas()
    api.get('/reports/stats/summary').then((res) => setStats(res.data))
    
    Promise.all([
      api.get('/reports/stats/trends-by-time'),
      api.get('/reports/stats/trends-by-location'),
      api.get('/reports/stats/trends-by-type')
    ]).then(([timeRes, locationRes, typeRes]) => {
      setTrends({
        time: timeRes.data,
        location: locationRes.data,
        type: typeRes.data
      })
    })
  }, [])

  // Re-fetch when filters change
  useEffect(() => {
    fetchReports()
  }, [typeFilter, areaFilter, validationStatusFilter, startDate, endDate])

  const areas = allAreas
  const typeOptions = [
    { value: 'All', label: 'All' },
    { value: 'missing all ppe', label: 'Missing All PPE' },
    { value: 'no helmet', label: 'No Helmet' },
    { value: 'no vest', label: 'No Vest' },
    { value: 'no gloves', label: 'No Gloves' },
    { value: 'no shoes', label: 'No Shoes' }
  ]
  const validationStatuses = ['All', 'pending', 'valid', 'invalid']

  const pendingReportsCount = reports.filter(r => r.validationStatus === 'pending').length

  const totalReports = reports.length
  const totalPages = Math.ceil(totalReports / reportsPerPage)

  const startIndex = (currentPage - 1) * reportsPerPage
  const endIndex = startIndex + reportsPerPage

  const paginatedReports = reports.slice(startIndex, endIndex)
  
  useEffect(() => {
    setCurrentPage(1)
  }, [typeFilter, areaFilter, validationStatusFilter, startDate, endDate])

  const handleClearFilters = () => {
    setTypeFilter('All')
    setAreaFilter('All')
    setValidationStatusFilter('All')
    setStartDate('')
    setEndDate('')
  }

  const hasActiveFilters = typeFilter !== 'All' || areaFilter !== 'All' || validationStatusFilter !== 'All' || startDate || endDate

  const handleExportPdf = () => {
    const doc = new jsPDF()
    let yPosition = 16

    doc.setFontSize(18)
    doc.text('Laporan Pelanggaran K3 - Smart K3 Vision', 14, yPosition)
    yPosition += 8
    
    doc.setFontSize(11)
    const filterText = [
      areaFilter !== 'All' ? `Area: ${areaFilter}` : '',
      typeFilter !== 'All' ? `Type: ${typeFilter}` : '',
      startDate ? `From: ${startDate}` : '',
      endDate ? `To: ${endDate}` : ''
    ].filter(Boolean).join(' | ')
    if (filterText) {
      doc.text(filterText, 14, yPosition)
      yPosition += 10
    } else {
      yPosition += 5
    }

    // Total violations summary
    doc.setFontSize(12)
    doc.text('Ringkasan Pelanggaran', 14, yPosition)
    yPosition += 6

    doc.setFontSize(10)
    if (stats) {
      const summaryText = [
        `Total Pelanggaran: ${stats.totalReports}`,
        `Sudah Divalidasi: ${stats.validatedReports}`,
        `Masih Tertunda: ${stats.pendingReports}`,
        `Valid: ${stats.validReports} | Invalid: ${stats.invalidReports}`
      ]
      
      summaryText.forEach((text) => {
        doc.text(text, 14, yPosition)
        yPosition += 5
      })
    }
    
    yPosition += 4

    // Violation type trends
    if (trends.type && trends.type.length > 0) {
      doc.setFontSize(12)
      doc.text('Tren Jenis Pelanggaran', 14, yPosition)
      yPosition += 6

      const typeData = trends.type.map(t => [t.type, t.violations.toString()])
      autoTable(doc, {
        startY: yPosition,
        head: [['Jenis Pelanggaran', 'Jumlah']],
        body: typeData,
        margin: { left: 14, right: 14 },
        didDrawPage: () => {
          yPosition = doc.lastAutoTable.finalY + 4
        }
      })
      yPosition = doc.lastAutoTable.finalY + 4
    }

    // Location trends
    if (trends.location && trends.location.length > 0) {
      doc.setFontSize(12)
      doc.text('Tren Lokasi Pelanggaran', 14, yPosition)
      yPosition += 6

      const locationData = trends.location.map(l => [l.area, l.violations.toString()])
      autoTable(doc, {
        startY: yPosition,
        head: [['Lokasi', 'Jumlah']],
        body: locationData,
        margin: { left: 14, right: 14 },
        didDrawPage: () => {
          yPosition = doc.lastAutoTable.finalY + 4
        }
      })
      yPosition = doc.lastAutoTable.finalY + 4
    }

    // Time trends (hourly)
    if (trends.time && trends.time.length > 0) {
      doc.setFontSize(12)
      doc.text('Tren Waktu Pelanggaran (Jam)', 14, yPosition)
      yPosition += 6

      const timeData = trends.time
        .filter(t => t.violations > 0)
        .map(t => [t.hour, t.violations.toString()])
      
      if (timeData.length > 0) {
        autoTable(doc, {
          startY: yPosition,
          head: [['Waktu', 'Jumlah']],
          body: timeData,
          margin: { left: 14, right: 14 },
          didDrawPage: () => {
            yPosition = doc.lastAutoTable.finalY + 4
          }
        })
        yPosition = doc.lastAutoTable.finalY + 4
      }
    }

    // =========================================================================
    // MODIFIKASI TABEL DETAIL LAPORAN BULANAN
    // =========================================================================
    doc.addPage()
    doc.setFontSize(12)
    doc.text('Detail Seluruh Laporan Pemantauan', 14, 16)

    autoTable(doc, {
      startY: 22,
      // 1. Menambahkan kolom 'Pelanggar' dan 'Catatan Pengawas' pada Header
      head: [['ID', 'Area', 'Kamera', 'Jenis Pelanggaran', 'Status', 'Pelanggar', 'Catatan Pengawas', 'Waktu']],
      
      // 2. Menggunakan 'reports' agar seluruh data hasil filter terekspor
      body: reports.map((report) => [
        report.id.substring(0, 8),
        report.area,
        report.cameraId,
        report.type,
        report.validationStatus.toUpperCase(),
        report.violatorName || '-', // Mengambil data nama pelanggar
        report.notes || '-',        // Mengambil data keterangan tindak lanjut
        report.timestamp
      ]),
      margin: { left: 14, right: 14 },
      
      // 3. Optimalisasi struktur agar fit
      styles: { 
        fontSize: 8,       // Memperkecil font sedikit ke ukuran 8 agar muat 8 kolom
        cellPadding: 2 
      },
      columnStyles: {
        0: { cellWidth: 15 }, // ID singkat
        1: { cellWidth: 22 }, // Area
        2: { cellWidth: 15 }, // Kamera
        3: { cellWidth: 28 }, // Jenis Pelanggaran
        4: { cellWidth: 18 }, // Status
        5: { cellWidth: 25 }, // Nama Pelanggar
        6: { cellWidth: 35 }, // Catatan (Diberikan porsi lebih lebar)
        7: { cellWidth: 26 }  // Waktu
      }
    })

    // Conclusions
    doc.addPage()
    doc.setFontSize(12)
    doc.text('Kesimpulan dan Rekomendasi', 14, 16)
    
    doc.setFontSize(10)
    let conclusionY = 24
    
    const conclusions = []
    if (stats) {
      if (stats.totalReports > 0) {
        conclusions.push(`• Total pelanggaran yang terdeteksi: ${stats.totalReports} kasus`)
      }
      if (stats.pendingReports > 0) {
        conclusions.push(`• Masih ada ${stats.pendingReports} laporan yang menunggu validasi supervisor`)
      }
      if (stats.validReports > stats.invalidReports) {
        conclusions.push(`• Sebagian besar pelanggaran tervalidasi (${stats.validReports} kasus)`)
      }
      if (trends.type && trends.type[0]) {
        conclusions.push(`• Jenis pelanggaran paling sering: ${trends.type[0].type}`)
      }
      if (trends.location && trends.location[0]) {
        conclusions.push(`• Lokasi dengan pelanggaran terbanyak: ${trends.location[0].area}`)
      }
      conclusions.push('• Diperlukan intensifikasi pengawasan dan pelatihan HSE untuk karyawan')
      conclusions.push('• Implementasi sistem monitoring real-time harus terus ditingkatkan')
    }

    const pageHeight = doc.internal.pageSize.height
    conclusions.forEach((conclusion) => {
      if (conclusionY > pageHeight - 20) {
        doc.addPage()
        conclusionY = 16
      }
      const splitText = doc.splitTextToSize(conclusion, 170)
      doc.text(splitText, 14, conclusionY)
      conclusionY += splitText.length * 5 + 3
    })

    doc.save('smart-k3-reports.pdf')
  }

  const handlePageChange = (page) => {
    if (page < 1 || page > totalPages) return
    setCurrentPage(page)
  }
  
  return (
    <div>
      <div className="page-topbar">
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="page-subtitle">Daftar laporan pelanggaran yang ditangkap sistem computer vision.</p>
        </div>
        <div className="toolbar-right" style={{ position: 'relative', gap: '0.5rem' }}>
          {pendingReportsCount > 0 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 0.75rem',
              backgroundColor: '#fef2f2',
              border: '1px solid #fee2e2',
              borderRadius: '0.375rem',
              color: '#991b1b',
              fontSize: '0.875rem'
            }}>
              <AlertCircle size={16} style={{ color: '#dc2626' }} />
              <span>{pendingReportsCount} reports pending</span>
            </div>
          )}
          <button className="primary-btn" onClick={handleExportPdf}><Download size={16} /> Export PDF</button>
        </div>
      </div>

      {/* Filter Section */}
      <div style={{
        backgroundColor: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '0.5rem',
        padding: '1rem',
        marginBottom: '1.5rem'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem'
        }}>
          <h3 style={{ margin: '0', fontSize: '0.95rem', fontWeight: '600', color: '#0f172a' }}>
            Filter Laporan
          </h3>
          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                padding: '0.25rem 0.75rem',
                fontSize: '0.875rem',
                backgroundColor: 'transparent',
                border: '1px solid #cbd5e1',
                borderRadius: '0.375rem',
                color: '#64748b',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => {
                e.target.style.backgroundColor = '#f1f5f9'
                e.target.style.borderColor = '#94a3b8'
              }}
              onMouseOut={(e) => {
                e.target.style.backgroundColor = 'transparent'
                e.target.style.borderColor = '#cbd5e1'
              }}
            >
              <X size={14} /> Clear Filters
            </button>
          )}
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '1rem'
        }}>
          {/* Area Filter */}
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem', color: '#475569' }}>
              Area
            </label>
            <select
              className="select-box"
              value={areaFilter}
              onChange={(e) => setAreaFilter(e.target.value)}
              style={{ width: '100%' }}
            >
              {areas.map((area) => <option key={area}>{area}</option>)}
            </select>
          </div>

          {/* Type Filter */}
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem', color: '#475569' }}>
              Jenis Pelanggaran
            </label>
            <select
              className="select-box"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              style={{ width: '100%' }}
            >
              {typeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>

          {/* Validation Status Filter */}
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem', color: '#475569' }}>
              Status Validasi
            </label>
            <select
              className="select-box"
              value={validationStatusFilter}
              onChange={(e) => setValidationStatusFilter(e.target.value)}
              style={{ width: '100%' }}
            >
              {validationStatuses.map((status) => (
                <option key={status} value={status}>
                  {status === 'All' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Start Date Filter */}
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem', color: '#475569' }}>
              Tanggal Mulai
            </label>
            <input
              type="date"
              className="select-box"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>

          {/* End Date Filter */}
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem', color: '#475569' }}>
              Tanggal Akhir
            </label>
            <input
              type="date"
              className="select-box"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div style={{
        marginBottom: '1rem',
        fontSize: '0.875rem',
        color: '#64748b'
      }}>
        Menampilkan <strong>{totalReports > 0 ? startIndex + 1 : 0}</strong> - <strong>{Math.min(endIndex, totalReports)}</strong> dari <strong>{totalReports}</strong> laporan
      </div>

      <div id="reports-table" className="reports-table-card fixed-reports-card">
        <div className="reports-table-body">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Area</th>
                <th>Camera</th>
                <th>Jenis Pelanggaran</th>
                <th>Waktu</th>
                <th>Status Validasi</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {paginatedReports.length > 0 ? (
                paginatedReports.map((report) => (
                  <tr key={report.id}>
                    <td>{report.id.substring(0, 12)}</td>
                    <td>{report.area}</td>
                    <td>{report.cameraId}</td>
                    <td>{report.type}</td>
                    <td>{report.timestamp}</td>
                    <td>
                      <span style={{
                        padding: '0.25rem 0.5rem',
                        borderRadius: '0.25rem',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        backgroundColor: 
                          report.validationStatus === 'valid' ? '#d1fae5' :
                          report.validationStatus === 'invalid' ? '#fee2e2' :
                          '#fef3c7',
                        color: 
                          report.validationStatus === 'valid' ? '#065f46' :
                          report.validationStatus === 'invalid' ? '#991b1b' :
                          '#92400e'
                      }}>
                        {report.validationStatus === 'valid' ? '✓ Valid' :
                         report.validationStatus === 'invalid' ? '✗ Invalid' :
                         '⏳ Pending'}
                      </span>
                    </td>
                    <td>
                      <Link className="link-btn left-link" to={`/reports/${report.id}`}>
                        Lihat Detail
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="empty-table-text">
                    Tidak ada laporan untuk filter ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="reports-pagination">
            <button
              type="button"
              className="pagination-nav-btn"
              disabled={currentPage === 1}
              onClick={() => handlePageChange(currentPage - 1)}
            >
              ← Previous
            </button>

            {Array.from({ length: totalPages }, (_, index) => {
              const page = index + 1

              if (
                page === 1 ||
                page === totalPages ||
                Math.abs(page - currentPage) <= 1
              ) {
                return (
                  <button
                    key={page}
                    type="button"
                    className={`clean-page-btn ${currentPage === page ? 'active' : ''}`}
                    onClick={() => handlePageChange(page)}
                  >
                    {page}
                  </button>
                )
              }

              if (page === currentPage - 2 || page === currentPage + 2) {
                return (
                  <span key={page} className="pagination-dots">
                    ...
                  </span>
                )
              }

              return null
            })}

            <button
              type="button"
              className="pagination-nav-btn"
              disabled={currentPage === totalPages}
              onClick={() => handlePageChange(currentPage + 1)}
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}