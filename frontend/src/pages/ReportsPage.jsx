import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Download } from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import api from '../services/api'

export default function ReportsPage() {
  const [reports, setReports] = useState([])
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

      <div className="panel card reports-panel">
        <div className="table-wrap">
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
              {filteredReports.map((report) => (
                <tr key={report.id}>
                  <td>{report.id}</td>
                  <td>{report.area}</td>
                  <td>{report.cameraId}</td>
                  <td>{report.type}</td>
                  <td>{report.timestamp}</td>
                  <td><span className={`status-pill ${report.reportStatus.toLowerCase().replace(/\s/g, '-')}`}>{report.reportStatus}</span></td>
                  <td><Link className="link-btn left-link" to={`/reports/${report.id}`}>Lihat Detail</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
