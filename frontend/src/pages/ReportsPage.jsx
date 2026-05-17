import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Download, AlertCircle } from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import api from '../services/api'

export default function ReportsPage() {
  const [reports, setReports] = useState([])
  const [currentPage, setCurrentPage] = useState(1)
  const reportsPerPage = 10

  const [typeFilter, setTypeFilter] = useState('All')
  const [areaFilter, setAreaFilter] = useState('All')
  const [stats, setStats] = useState(null)
  const [trends, setTrends] = useState({
    time: [],
    location: [],
    type: []
  })

  useEffect(() => {
    api.get('/reports').then((res) => setReports(res.data))
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

  const areas = ['All', ...new Set(reports.map((item) => item.area))]
  const types = [
    'All',
    'Missing All PPE',
    'Missing helmet',
    'Missing vest'
  ]

  const filteredReports = useMemo(() => {
    return reports.filter((item) => {
      const areaOk = areaFilter === 'All' || item.area === areaFilter
      const typeOk = typeFilter === 'All' || item.type === typeFilter
      return areaOk && typeOk
    })
  }, [reports, typeFilter, areaFilter])

  const pendingReportsCount = reports.filter(r => r.validationStatus === 'pending').length

  const totalReports = filteredReports.length
  const totalPages = Math.ceil(totalReports / reportsPerPage)

  const startIndex = (currentPage - 1) * reportsPerPage
  const endIndex = startIndex + reportsPerPage

  const paginatedReports = filteredReports.slice(startIndex, endIndex)
  
  useEffect(() => {
    setCurrentPage(1)
  }, [typeFilter, areaFilter])

  const handleExportPdf = () => {
    const doc = new jsPDF()
    let yPosition = 16

    doc.setFontSize(18)
    doc.text('Laporan Pelanggaran K3 - Smart K3 Vision', 14, yPosition)
    yPosition += 8
    
    doc.setFontSize(11)
    doc.text(`Area: ${areaFilter} | Type: ${typeFilter}`, 14, yPosition)
    yPosition += 10

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

    // Detailed reports table
    doc.addPage()
    doc.setFontSize(12)
    doc.text('Detail Laporan', 14, 16)

    autoTable(doc, {
      startY: 22,
      head: [['ID', 'Area', 'Camera', 'Type', 'Timestamp']],
      body: filteredReports.map((report) => [
        report.id.substring(0, 10),
        report.area,
        report.cameraId,
        report.type,
        report.timestamp
      ]),
      margin: { left: 14, right: 14 }
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
        <div className="toolbar-right" style={{ position: 'relative' }}>
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
          <select className="select-box" value={areaFilter} onChange={(e) => setAreaFilter(e.target.value)}>
            {areas.map((area) => <option key={area}>{area}</option>)}
          </select>
          <select className="select-box" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            {types.map((type) => <option key={type}>{type}</option>)}
          </select>
          <button className="primary-btn" onClick={handleExportPdf}><Download size={16} /> Export PDF</button>
        </div>
      </div>

      <div id="reports-table" className="reports-table-card fixed-reports-card">
        <div className="reports-table-body">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Area</th>
                <th>Camera</th>
                <th>Type</th>
                <th>Timestamp</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {paginatedReports.length > 0 ? (
                paginatedReports.map((report) => (
                  <tr key={report.id}>
                    <td>{report.id}</td>
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
