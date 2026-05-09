import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Download } from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import api from '../services/api'

export default function ReportsPage() {
  const [reports, setReports] = useState([])
  const [currentPage, setCurrentPage] = useState(1)
  const reportsPerPage = 10

  const [typeFilter, setTypeFilter] = useState('All')
  const [areaFilter, setAreaFilter] = useState('All')

  useEffect(() => {
    api.get('/reports').then((res) => setReports(res.data))
  }, [])

  const areas = ['All', ...new Set(reports.map((item) => item.area))]
  const types = ['All', ...new Set(reports.map((item) => item.type))]

  const filteredReports = useMemo(() => {
    return reports.filter((item) => {
      const areaOk = areaFilter === 'All' || item.area === areaFilter
      const typeOk = typeFilter === 'All' || item.type === typeFilter
      return areaOk && typeOk
    })
  }, [reports, typeFilter, areaFilter])

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
    doc.setFontSize(18)
    doc.text('Laporan Pelanggaran K3 - Smart K3 Vision', 14, 16)
    doc.setFontSize(11)
    doc.text(`Area: ${areaFilter} | Type: ${typeFilter}`, 14, 24)

    autoTable(doc, {
      startY: 30,
      head: [['ID', 'Area', 'Camera', 'Type', 'Timestamp', 'Status']],
      body: filteredReports.map((report) => [
        report.id,
        report.area,
        report.cameraId,
        report.type,
        report.timestamp,
        report.reportStatus
      ])
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
        <div className="toolbar-right">
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
              {paginatedReports.map((report) => (
                <tr key={report.id}>
                  <td>{report.id}</td>
                  <td>{report.area}</td>
                  <td>{report.cameraId}</td>
                  <td>{report.type}</td>
                  <td>{report.timestamp}</td>
                  <td>
                    <span
                      className={`status-pill ${report.reportStatus
                        .toLowerCase()
                        .replace(/\s/g, '-')}`}
                    >
                      {report.reportStatus}
                    </span>
                  </td>
                  <td>
                    <Link className="link-btn left-link" to={`/reports/${report.id}`}>
                      Lihat Detail
                    </Link>
                  </td>
                </tr>
              ))}
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
