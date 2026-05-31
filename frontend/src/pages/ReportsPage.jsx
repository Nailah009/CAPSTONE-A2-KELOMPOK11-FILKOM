import { useEffect, useState } from 'react'
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
  const [trends, setTrends] = useState({ time: [], location: [], type: [] })

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

  const fetchAllAreas = async () => {
    try {
      const response = await api.get('/admin/areas')
      setAllAreas(['All', ...response.data.map(a => a.name)])
    } catch {
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
      setTrends({ time: timeRes.data, location: locationRes.data, type: typeRes.data })
    })
  }, [])

  useEffect(() => { fetchReports() }, [typeFilter, areaFilter, validationStatusFilter, startDate, endDate])

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

  useEffect(() => { setCurrentPage(1) }, [typeFilter, areaFilter, validationStatusFilter, startDate, endDate])

  const handleClearFilters = () => {
    setTypeFilter('All')
    setAreaFilter('All')
    setValidationStatusFilter('All')
    setStartDate('')
    setEndDate('')
  }

  const hasActiveFilters = typeFilter !== 'All' || areaFilter !== 'All' || validationStatusFilter !== 'All' || startDate || endDate

  const handleExportPdf = async () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 14

    const BLUE = [37, 99, 235]
    const BLUE_LIGHT = [239, 246, 255]
    const BLUE_BORDER = [191, 219, 254]

    const exportTime = new Date().toLocaleString('id-ID', {
      day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
    })

    const typeCounts = {}
    reports.forEach((r) => { typeCounts[r.type] = (typeCounts[r.type] || 0) + 1 })
    const mostFrequent = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]

    const validCount = reports.filter(r => r.validationStatus === 'valid').length
    const invalidCount = reports.filter(r => r.validationStatus === 'invalid').length
    const pendingCount = reports.filter(r => r.validationStatus === 'pending').length

    let dateRange = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })
    if (reports.length > 0) {
      const dates = reports.map((r) => new Date(r.timestamp))
      const minDate = new Date(Math.min(...dates)).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })
      const maxDate = new Date(Math.max(...dates)).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })
      dateRange = minDate === maxDate ? minDate : `${minDate} - ${maxDate}`
    } else if (startDate || endDate) {
      const from = startDate ? new Date(startDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : '-'
      const to = endDate ? new Date(endDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : '-'
      dateRange = startDate && endDate ? `${from} - ${to}` : (startDate ? from : to)
    }

    const filterParts = [
      `Area: ${areaFilter}`,
      `Tipe: ${typeFilter}`,
      validationStatusFilter !== 'All' ? `Status: ${validationStatusFilter}` : '',
      startDate ? `Dari: ${startDate}` : '',
      endDate ? `Sampai: ${endDate}` : ''
    ].filter(Boolean)
    const filterText = filterParts.join('  |  ')

    // ════════════════════════════════
    // HALAMAN 1 — RINGKASAN & TABEL
    // ════════════════════════════════

    // Header biru
    doc.setFillColor(...BLUE)
    doc.rect(0, 0, pageWidth, 32, 'F')
    doc.setFillColor(99, 139, 255)
    doc.rect(0, 30, pageWidth, 2, 'F')

    // Ikon K3
    doc.setFillColor(255, 255, 255)
    doc.roundedRect(margin, 7, 8, 8, 1, 1, 'F')
    doc.setTextColor(37, 99, 235)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.text('K3', margin + 1.5, 13)

    doc.setTextColor(255, 255, 255)
    doc.setFontSize(15)
    doc.setFont('helvetica', 'bold')
    doc.text('Smart K3 Vision - Laporan Pelanggaran APD', margin + 12, 13)
    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'normal')
    doc.text(`Dicetak: ${exportTime}`, margin + 12, 22)
    doc.text('PT. Indonesia Epson Industry', pageWidth - margin, 22, { align: 'right' })

    // Info bar
    doc.setFillColor(248, 250, 252)
    doc.rect(0, 32, pageWidth, 14, 'F')
    doc.setDrawColor(226, 232, 240)
    doc.line(0, 46, pageWidth, 46)
    doc.setTextColor(71, 85, 105)
    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'bold')
    doc.text('Periode:', margin, 40)
    doc.setFont('helvetica', 'normal')
    doc.text(dateRange, margin + 16, 40)
    doc.setFont('helvetica', 'bold')
    doc.text('Filter:', margin + 80, 40)
    doc.setFont('helvetica', 'normal')
    doc.text(filterText, margin + 93, 40)

    // 3 Kotak statistik
    const statBoxY = 52
    const statBoxH = 24
    const statBoxW = (pageWidth - margin * 2 - 6) / 3
    const statItems = [
      { label: 'Total Pelanggaran', value: String(reports.length), sub: 'laporan tercatat' },
      { label: 'Tipe Terbanyak', value: mostFrequent ? mostFrequent[0] : 'Tidak ada', sub: mostFrequent ? `${mostFrequent[1]} kasus` : '-' },
      { label: 'Jumlah Terbanyak', value: mostFrequent ? `${mostFrequent[1]} kasus` : '0 kasus', sub: mostFrequent ? `${((mostFrequent[1] / Math.max(reports.length, 1)) * 100).toFixed(1)}% dari total` : '-' }
    ]
    statItems.forEach((stat, i) => {
      const x = margin + i * (statBoxW + 3)
      doc.setFillColor(255, 255, 255)
      doc.setDrawColor(...BLUE_BORDER)
      doc.roundedRect(x, statBoxY, statBoxW, statBoxH, 2, 2, 'FD')
      doc.setFillColor(...BLUE)
      doc.roundedRect(x, statBoxY, 2.5, statBoxH, 1, 1, 'F')
      doc.setTextColor(...BLUE)
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.text(stat.value, x + statBoxW / 2 + 1, statBoxY + 11, { align: 'center' })
      doc.setTextColor(71, 85, 105)
      doc.setFontSize(7)
      doc.setFont('helvetica', 'bold')
      doc.text(stat.label, x + statBoxW / 2 + 1, statBoxY + 17, { align: 'center' })
      doc.setTextColor(148, 163, 184)
      doc.setFontSize(6.5)
      doc.setFont('helvetica', 'normal')
      doc.text(stat.sub, x + statBoxW / 2 + 1, statBoxY + 21, { align: 'center' })
    })

    // Judul tabel
    const tableHeaderY = statBoxY + statBoxH + 10
    doc.setTextColor(15, 23, 42)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('Daftar Pelanggaran', margin, tableHeaderY)
    doc.setDrawColor(...BLUE)
    doc.setLineWidth(0.8)
    doc.line(margin, tableHeaderY + 2, margin + 42, tableHeaderY + 2)
    doc.setLineWidth(0.2)

    // Badge jumlah data
    doc.setFillColor(...BLUE_LIGHT)
    doc.setDrawColor(...BLUE_BORDER)
    doc.roundedRect(pageWidth - margin - 28, tableHeaderY - 5, 28, 8, 2, 2, 'FD')
    doc.setTextColor(...BLUE)
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'bold')
    doc.text(`${reports.length} data`, pageWidth - margin - 14, tableHeaderY, { align: 'center' })

    if (reports.length > 0) {
      autoTable(doc, {
        startY: tableHeaderY + 6,
        margin: { left: margin, right: margin },
        head: [['No', 'ID Laporan', 'Area', 'Kamera', 'Tipe Pelanggaran', 'Timestamp']],
        body: reports.map((report, i) => [
          i + 1,
          report.id,
          report.area,
          report.cameraId,
          report.type,
          report.timestamp
        ]),
        headStyles: { fillColor: BLUE, textColor: 255, fontStyle: 'bold', fontSize: 8, cellPadding: 3 },
        bodyStyles: { fontSize: 7.5, textColor: [40, 40, 40], cellPadding: 2.5 },
        alternateRowStyles: { fillColor: BLUE_LIGHT },
        columnStyles: {
          0: { cellWidth: 8, halign: 'center' },
          1: { cellWidth: 38 },
          2: { cellWidth: 28 },
          3: { cellWidth: 22 },
          4: { cellWidth: 38 },
          5: { cellWidth: 28 }
        }
      })
    } else {
      const emptyY = tableHeaderY + 6
      doc.setFillColor(240, 253, 244)
      doc.setDrawColor(134, 239, 172)
      doc.roundedRect(margin, emptyY, pageWidth - margin * 2, 28, 3, 3, 'FD')
      doc.setTextColor(21, 128, 61)
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.text('✓ Tidak ada pelanggaran APD pada periode ini', pageWidth / 2, emptyY + 12, { align: 'center' })
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.text('Tingkat kepatuhan penggunaan APD: 100%', pageWidth / 2, emptyY + 20, { align: 'center' })
    }

    // Footer halaman 1
    doc.setFillColor(248, 250, 252)
    doc.rect(0, pageHeight - 16, pageWidth, 16, 'F')
    doc.setDrawColor(226, 232, 240)
    doc.line(0, pageHeight - 16, pageWidth, pageHeight - 16)
    doc.setTextColor(148, 163, 184)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.text('Halaman 1  |  Smart K3 Vision Dashboard  |  PT. Indonesia Epson Industry', pageWidth / 2, pageHeight - 7, { align: 'center' })

    // ════════════════════════════════
    // HALAMAN 2 — KESIMPULAN
    // ════════════════════════════════
    doc.addPage()

    doc.setFillColor(...BLUE)
    doc.rect(0, 0, pageWidth, 32, 'F')
    doc.setFillColor(99, 139, 255)
    doc.rect(0, 30, pageWidth, 2, 'F')

    doc.setFillColor(255, 255, 255)
    doc.roundedRect(margin, 7, 8, 8, 1, 1, 'F')
    doc.setTextColor(37, 99, 235)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.text('K3', margin + 1.5, 13)

    doc.setTextColor(255, 255, 255)
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('Kesimpulan & Catatan Laporan', margin + 12, 13)
    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'normal')
    doc.text(`Periode: ${dateRange}`, margin + 12, 22)
    doc.text('PT. Indonesia Epson Industry', pageWidth - margin, 22, { align: 'right' })

    let noteY = 42

    // Ringkasan statistik
    doc.setTextColor(15, 23, 42)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('Ringkasan Statistik', margin, noteY)
    doc.setDrawColor(...BLUE)
    doc.setLineWidth(0.8)
    doc.line(margin, noteY + 2, margin + 40, noteY + 2)
    doc.setLineWidth(0.2)
    noteY += 8

    const summaryRows = [
      ['Periode Laporan', dateRange],
      ['Total Pelanggaran', String(reports.length)],
      ['Area', areaFilter],
      ['Tipe', typeFilter],
      ['Tipe Pelanggaran Terbanyak', mostFrequent ? `${mostFrequent[0]} (${mostFrequent[1]} kasus)` : 'Tidak ada pelanggaran'],
      ['Laporan Valid', `${validCount} kasus`],
      ['Laporan Invalid', `${invalidCount} kasus`],
      ['Laporan Pending', `${pendingCount} kasus`],
    ]

    if (Object.entries(typeCounts).length > 0) {
      summaryRows.push(['--- Rincian per Tipe ---', ''])
      Object.entries(typeCounts).forEach(([type, count]) => {
        summaryRows.push([`  * ${type}`, `${count} kasus (${((count / reports.length) * 100).toFixed(1)}%)`])
      })
    }

    autoTable(doc, {
      startY: noteY,
      margin: { left: margin, right: margin },
      head: [['Keterangan', 'Nilai']],
      body: summaryRows,
      headStyles: { fillColor: BLUE, textColor: 255, fontStyle: 'bold', fontSize: 9, cellPadding: 3 },
      bodyStyles: { fontSize: 9, textColor: [40, 40, 40], cellPadding: 2.5 },
      alternateRowStyles: { fillColor: BLUE_LIGHT },
      columnStyles: { 0: { cellWidth: 80 }, 1: { cellWidth: 'auto' } }
    })

    noteY = doc.lastAutoTable.finalY + 12

    // Catatan otomatis
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(15, 23, 42)
    doc.text('Catatan Otomatis Sistem', margin, noteY)
    doc.setDrawColor(...BLUE)
    doc.setLineWidth(0.8)
    doc.line(margin, noteY + 2, margin + 50, noteY + 2)
    doc.setLineWidth(0.2)
    noteY += 7

    let autoNote = ''
    if (reports.length === 0) {
      autoNote = `Tidak ada pelanggaran APD tercatat pada periode ${dateRange}. Tingkat kepatuhan penggunaan APD mencapai 100%. Pertahankan kondisi ini dan tetap lakukan pengawasan secara berkala.`
    } else if (reports.length <= 5) {
      autoNote = `Terdapat ${reports.length} pelanggaran APD pada periode ${dateRange}. Tingkat pelanggaran tergolong rendah.${mostFrequent ? ` Jenis pelanggaran terbanyak adalah "${mostFrequent[0]}" dengan ${mostFrequent[1]} kasus.` : ''} Harap lakukan pembinaan kepada pekerja yang bersangkutan.`
    } else if (reports.length <= 15) {
      autoNote = `Terdapat ${reports.length} pelanggaran APD pada periode ${dateRange}. Tingkat pelanggaran tergolong sedang.${mostFrequent ? ` Jenis terbanyak: "${mostFrequent[0]}" (${mostFrequent[1]} kasus).` : ''} Diperlukan evaluasi dan peningkatan kesadaran K3 bagi seluruh pekerja.`
    } else {
      autoNote = `Terdapat ${reports.length} pelanggaran APD pada periode ${dateRange}. Jumlah pelanggaran tergolong tinggi.${mostFrequent ? ` Jenis terbanyak: "${mostFrequent[0]}" (${mostFrequent[1]} kasus).` : ''} Diperlukan tindakan korektif segera, evaluasi menyeluruh, serta peningkatan pengawasan untuk memastikan kepatuhan standar K3.`
    }
    if (pendingCount > 0) autoNote += ` Masih terdapat ${pendingCount} laporan yang menunggu validasi supervisor.`

    const splitNote = doc.splitTextToSize(autoNote, pageWidth - margin * 2 - 10)
    const noteBoxH = splitNote.length * 6 + 14

    const noteColor = reports.length === 0 ? [240, 253, 244] : reports.length <= 5 ? [255, 251, 235] : reports.length <= 15 ? [255, 247, 237] : [254, 242, 242]
    const noteBorder = reports.length === 0 ? [134, 239, 172] : reports.length <= 5 ? [251, 191, 36] : reports.length <= 15 ? [251, 146, 60] : [252, 165, 165]
    const noteTextColor = reports.length === 0 ? [21, 128, 61] : reports.length <= 5 ? [92, 60, 0] : reports.length <= 15 ? [124, 45, 18] : [127, 29, 29]

    doc.setFillColor(...noteColor)
    doc.setDrawColor(...noteBorder)
    doc.roundedRect(margin, noteY, pageWidth - margin * 2, noteBoxH, 3, 3, 'FD')
    doc.setTextColor(...noteTextColor)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text(splitNote, margin + 5, noteY + 9)
    noteY += noteBoxH + 12

    // Kotak catatan tambahan
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(15, 23, 42)
    doc.text('Catatan Tambahan', margin, noteY)
    doc.setDrawColor(...BLUE)
    doc.setLineWidth(0.8)
    doc.line(margin, noteY + 2, margin + 38, noteY + 2)
    doc.setLineWidth(0.2)
    noteY += 7

    doc.setFillColor(248, 250, 252)
    doc.setDrawColor(203, 213, 225)
    doc.roundedRect(margin, noteY, pageWidth - margin * 2, 40, 3, 3, 'FD')
    doc.setDrawColor(226, 232, 240)
    doc.setLineWidth(0.2)
    for (let l = 0; l < 3; l++) {
      doc.line(margin + 5, noteY + 12 + l * 10, pageWidth - margin - 5, noteY + 12 + l * 10)
    }
    doc.setTextColor(203, 213, 225)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'italic')
    noteY += 50

    // Tanda tangan
    const ttdW = 60
    doc.setFillColor(248, 250, 252)
    doc.setDrawColor(203, 213, 225)
    doc.roundedRect(margin, noteY, ttdW, 35, 2, 2, 'FD')
    doc.setTextColor(71, 85, 105)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.text('Dibuat oleh,', margin + ttdW / 2, noteY + 7, { align: 'center' })
    doc.setDrawColor(...BLUE)
    doc.line(margin + 5, noteY + 25, margin + ttdW - 5, noteY + 25)
    doc.setTextColor(100, 116, 139)
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'normal')
    doc.text('Supervisor K3', margin + ttdW / 2, noteY + 31, { align: 'center' })

    doc.setFillColor(248, 250, 252)
    doc.setDrawColor(203, 213, 225)
    doc.roundedRect(pageWidth - margin - ttdW, noteY, ttdW, 35, 2, 2, 'FD')
    doc.setTextColor(71, 85, 105)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.text('Diketahui oleh,', pageWidth - margin - ttdW / 2, noteY + 7, { align: 'center' })
    doc.setDrawColor(...BLUE)
    doc.line(pageWidth - margin - ttdW + 5, noteY + 25, pageWidth - margin - 5, noteY + 25)
    doc.setTextColor(100, 116, 139)
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'normal')
    doc.text('General Manager', pageWidth - margin - ttdW / 2, noteY + 31, { align: 'center' })

    // Footer halaman 2
    doc.setFillColor(248, 250, 252)
    doc.rect(0, pageHeight - 16, pageWidth, 16, 'F')
    doc.setDrawColor(226, 232, 240)
    doc.line(0, pageHeight - 16, pageWidth, pageHeight - 16)
    doc.setTextColor(148, 163, 184)
    doc.setFontSize(7)
    doc.text(`Smart K3 Vision Dashboard  |  ${exportTime}  |  PT. Indonesia Epson Industry`, pageWidth / 2, pageHeight - 7, { align: 'center' })

    doc.save(`laporan-k3-${new Date().toISOString().slice(0, 10)}.pdf`)
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
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.5rem 0.75rem', backgroundColor: '#fef2f2',
              border: '1px solid #fee2e2', borderRadius: '0.375rem',
              color: '#991b1b', fontSize: '0.875rem'
            }}>
              <AlertCircle size={16} style={{ color: '#dc2626' }} />
              <span>{pendingReportsCount} reports pending</span>
            </div>
          )}
          <button className="primary-btn" onClick={handleExportPdf}>
            <Download size={16} /> Export PDF
          </button>
        </div>
      </div>

      <div style={{
        backgroundColor: '#f8fafc', border: '1px solid #e2e8f0',
        borderRadius: '0.5rem', padding: '1rem', marginBottom: '1.5rem'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: '0', fontSize: '0.95rem', fontWeight: '600', color: '#0f172a' }}>Filter Laporan</h3>
          {hasActiveFilters && (
            <button onClick={handleClearFilters} style={{
              display: 'flex', alignItems: 'center', gap: '0.25rem',
              padding: '0.25rem 0.75rem', fontSize: '0.875rem',
              backgroundColor: 'transparent', border: '1px solid #cbd5e1',
              borderRadius: '0.375rem', color: '#64748b', cursor: 'pointer'
            }}>
              <X size={14} /> Clear Filters
            </button>
          )}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem', color: '#475569' }}>Area</label>
            <select className="select-box" value={areaFilter} onChange={(e) => setAreaFilter(e.target.value)} style={{ width: '100%' }}>
              {allAreas.map((area) => <option key={area}>{area}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem', color: '#475569' }}>Jenis Pelanggaran</label>
            <select className="select-box" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={{ width: '100%' }}>
              {typeOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem', color: '#475569' }}>Status Validasi</label>
            <select className="select-box" value={validationStatusFilter} onChange={(e) => setValidationStatusFilter(e.target.value)} style={{ width: '100%' }}>
              {validationStatuses.map((s) => (
                <option key={s} value={s}>{s === 'All' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem', color: '#475569' }}>Tanggal Mulai</label>
            <input type="date" className="select-box" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ width: '100%' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem', color: '#475569' }}>Tanggal Akhir</label>
            <input type="date" className="select-box" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ width: '100%' }} />
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '1rem', fontSize: '0.875rem', color: '#64748b' }}>
        Menampilkan <strong>{totalReports > 0 ? startIndex + 1 : 0}</strong> - <strong>{Math.min(endIndex, totalReports)}</strong> dari <strong>{totalReports}</strong> laporan
      </div>

      <div id="reports-table" className="reports-table-card fixed-reports-card">
        <div className="reports-table-body">
          <table>
            <thead>
              <tr>
                <th>ID</th><th>Area</th><th>Camera</th>
                <th>Jenis Pelanggaran</th><th>Waktu</th>
                <th>Status Validasi</th><th>Action</th>
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
                        padding: '0.25rem 0.5rem', borderRadius: '0.25rem',
                        fontSize: '0.75rem', fontWeight: '600',
                        backgroundColor:
                          report.validationStatus === 'valid' ? '#d1fae5' :
                          report.validationStatus === 'invalid' ? '#fee2e2' : '#fef3c7',
                        color:
                          report.validationStatus === 'valid' ? '#065f46' :
                          report.validationStatus === 'invalid' ? '#991b1b' : '#92400e'
                      }}>
                        {report.validationStatus === 'valid' ? '✓ Valid' :
                         report.validationStatus === 'invalid' ? '✗ Invalid' : '⏳ Pending'}
                      </span>
                    </td>
                    <td><Link className="link-btn left-link" to={`/reports/${report.id}`}>Lihat Detail</Link></td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="7" className="empty-table-text">Tidak ada laporan untuk filter ini.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="reports-pagination">
            <button type="button" className="pagination-nav-btn" disabled={currentPage === 1} onClick={() => handlePageChange(currentPage - 1)}>← Previous</button>
            {Array.from({ length: totalPages }, (_, index) => {
              const page = index + 1
              if (page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1) {
                return <button key={page} type="button" className={`clean-page-btn ${currentPage === page ? 'active' : ''}`} onClick={() => handlePageChange(page)}>{page}</button>
              }
              if (page === currentPage - 2 || page === currentPage + 2) {
                return <span key={page} className="pagination-dots">...</span>
              }
              return null
            })}
            <button type="button" className="pagination-nav-btn" disabled={currentPage === totalPages} onClick={() => handlePageChange(currentPage + 1)}>Next →</button>
          </div>
        )}
      </div>
    </div>
  )
}
