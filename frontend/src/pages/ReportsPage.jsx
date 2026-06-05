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

  const addPageHeader = (doc, pageWidth, exportTime) => {
    const BLUE = [37, 99, 235]
    doc.setFillColor(...BLUE)
    doc.rect(0, 0, pageWidth, 28, 'F')
    doc.setFillColor(255, 255, 255)
    doc.roundedRect(14, 7, 8, 8, 1, 1, 'F')
    doc.setTextColor(37, 99, 235)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.text('K3', 15.5, 13)
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.text('Smart K3 Vision', 26, 11)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text('Laporan Harian Pelanggaran APD', 26, 18)
    doc.setFontSize(8)
    doc.text('PT. Indonesia Epson Industry', pageWidth - 14, 10, { align: 'right' })
    doc.text(`Dicetak: ${exportTime}`, pageWidth - 14, 16, { align: 'right' })
    doc.text('WIB', pageWidth - 14, 22, { align: 'right' })
  }

  const addPageFooter = (doc, pageWidth, pageHeight, pageNum) => {
    doc.setDrawColor(220, 220, 220)
    doc.setLineWidth(0.3)
    doc.line(14, pageHeight - 12, pageWidth - 14, pageHeight - 12)
    doc.setTextColor(160, 160, 160)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.text(
      `Smart K3 Vision Dashboard  |  PT. Indonesia Epson Industry  |  Halaman ${pageNum}`,
      pageWidth / 2, pageHeight - 7, { align: 'center' }
    )
  }

  const handleExportPdf = async () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 14

    const BLUE = [37, 99, 235]
    const BLUE_LIGHT = [239, 246, 255]
    const BLUE_BORDER = [191, 219, 254]
    const GRAY_LIGHT = [248, 249, 250]
    const GRAY_BORDER = [222, 226, 230]

    const exportTime = new Date().toLocaleString('id-ID', {
      day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
    })

    const typeCounts = {}
    reports.forEach((r) => { typeCounts[r.type] = (typeCounts[r.type] || 0) + 1 })
    const mostFrequent = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]

    const areaCounts = {}
    reports.forEach((r) => { areaCounts[r.area] = (areaCounts[r.area] || 0) + 1 })
    const mostFrequentArea = Object.entries(areaCounts).sort((a, b) => b[1] - a[1])[0]

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

    const filterText = [
      `Area: ${areaFilter === 'All' ? 'Semua' : areaFilter}`,
      `Tipe: ${typeFilter === 'All' ? 'Semua' : typeFilter}`,
      `Status: ${validationStatusFilter === 'All' ? 'Semua' : validationStatusFilter}`,
    ].join(' | ')

    let pageNum = 1

    // ════════════════════════════════
    // HALAMAN 1 — RINGKASAN & TABEL
    // ════════════════════════════════

    addPageHeader(doc, pageWidth, exportTime)

    let curY = 34
    doc.setTextColor(80, 80, 80)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text(`Periode: ${dateRange}`, margin, curY)
    doc.text(`Filter: ${filterText}`, margin, curY + 5)
    curY += 14

    const statBoxH = 22
    const statBoxW = (pageWidth - margin * 2 - 9) / 4
    const statConfigs = [
      {
        label: 'Total Pelanggaran',
        value: String(reports.length),
        sub: 'laporan tercatat',
        bg: [239, 246, 255], border: [191, 219, 254],
        valColor: [37, 99, 235]
      },
      {
        label: 'Validasi',
        value: `${validCount} valid`,
        sub: `${invalidCount} invalid | ${pendingCount} pending`,
        bg: [240, 253, 244], border: [134, 239, 172],
        valColor: [21, 128, 61]
      },
      {
        label: 'Tipe Terbanyak',
        value: mostFrequent ? mostFrequent[0] : 'Tidak ada',
        sub: mostFrequent ? `${mostFrequent[1]} kasus - ${((mostFrequent[1] / Math.max(reports.length, 1)) * 100).toFixed(1)}%` : '-',
        bg: [255, 247, 237], border: [251, 191, 36],
        valColor: [180, 83, 9]
      },
      {
        label: 'Area Terbanyak',
        value: mostFrequentArea ? mostFrequentArea[0] : 'Tidak ada',
        sub: mostFrequentArea ? `${mostFrequentArea[1]} kasus` : '-',
        bg: [253, 242, 248], border: [249, 168, 212],
        valColor: [157, 23, 77]
      }
    ]

    statConfigs.forEach((stat, i) => {
      const x = margin + i * (statBoxW + 3)
      doc.setFillColor(...stat.bg)
      doc.setDrawColor(...stat.border)
      doc.roundedRect(x, curY, statBoxW, statBoxH, 2, 2, 'FD')
      doc.setTextColor(...stat.valColor)
      doc.setFontSize(i === 0 ? 15 : 11)
      doc.setFont('helvetica', 'bold')
      const valueLines = doc.splitTextToSize(stat.value, statBoxW - 4)
      doc.text(valueLines, x + statBoxW / 2, curY + (i === 0 ? 10 : 9), { align: 'center' })
      doc.setTextColor(70, 70, 70)
      doc.setFontSize(6.5)
      doc.setFont('helvetica', 'bold')
      doc.text(stat.label, x + statBoxW / 2, curY + 16, { align: 'center' })
      doc.setTextColor(130, 130, 130)
      doc.setFontSize(5.8)
      doc.setFont('helvetica', 'normal')
      const subLines = doc.splitTextToSize(stat.sub, statBoxW - 4)
      doc.text(subLines, x + statBoxW / 2, curY + 20, { align: 'center' })
    })

    curY += statBoxH + 8

    doc.setTextColor(15, 23, 42)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('Daftar Pelanggaran dan Hasil Validasi Supervisor', margin, curY)
    doc.setDrawColor(...BLUE)
    doc.setLineWidth(0.8)
    doc.line(margin, curY + 2, margin + 82, curY + 2)
    doc.setLineWidth(0.2)
    doc.setTextColor(120, 120, 120)
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'italic')
    doc.text('Format laporan memuat status validasi, nama pelanggar, dan catatan supervisor.', margin, curY + 7)
    curY += 11

    if (reports.length > 0) {
      autoTable(doc, {
        startY: curY,
        margin: { left: margin, right: margin },
        tableWidth: pageWidth - margin * 2,
        head: [['No', 'ID Laporan', 'Waktu', 'Area', 'Kamera', 'Pelanggaran APD\nTidak Lengkap', 'Status', 'Nama Pelanggar', 'Catatan Supervisor']],
        body: reports.map((report, i) => [
          i + 1,
          report.id.substring(0, 20),
          report.timestamp,
          report.area,
          report.cameraId,
          report.type,
          // ── PERUBAHAN 1: warna teks status ──
          report.validationStatus === 'valid'
            ? { content: 'Valid', styles: { textColor: [34, 197, 94], fontStyle: 'bold' } }
            : report.validationStatus === 'invalid'
            ? { content: 'Invalid', styles: { textColor: [185, 28, 28], fontStyle: 'bold' } }
            : { content: 'Pending', styles: { textColor: [234, 179, 8], fontStyle: 'bold' } },
          report.violatorName || '-',
          report.notes || (report.validationStatus === 'pending' ? 'Menunggu validasi supervisor.' : '-')
        ]),
        headStyles: {
          fillColor: [50, 50, 50],
          textColor: 255,
          fontStyle: 'bold',
          fontSize: 7,
          cellPadding: 2.5,
          valign: 'middle',
          overflow: 'linebreak',
        },
        bodyStyles: {
          fontSize: 6.5,
          textColor: [40, 40, 40],
          cellPadding: 2,
          valign: 'top',
          overflow: 'linebreak',
        },
        alternateRowStyles: { fillColor: [250, 250, 250] },
        columnStyles: {
          0: { cellWidth: 9, halign: 'center' },
          1: { cellWidth: 28 },
          2: { cellWidth: 22 },
          3: { cellWidth: 18 },
          4: { cellWidth: 16 },
          5: { cellWidth: 22 },
          6: { cellWidth: 13 },
          7: { cellWidth: 22 },
          8: { cellWidth: 'auto' }
        },
        showHead: 'everyPage',
        didDrawPage: (data) => {
          addPageFooter(doc, pageWidth, pageHeight, pageNum)
          if (data.pageNumber > pageNum) {
            pageNum = data.pageNumber
            addPageHeader(doc, pageWidth, exportTime)
          }
        }
      })

      const afterTableY = doc.lastAutoTable.finalY + 4
      doc.setFontSize(7.5)
      doc.setFont('helvetica', 'italic')
      doc.setTextColor(130, 130, 130)
      doc.text('* Laporan berstatus Pending belum divalidasi oleh Supervisor.', margin, afterTableY)

    } else {
      doc.setFillColor(240, 253, 244)
      doc.setDrawColor(134, 239, 172)
      doc.roundedRect(margin, curY, pageWidth - margin * 2, 28, 3, 3, 'FD')
      doc.setTextColor(21, 128, 61)
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.text('✓ Tidak ada pelanggaran APD pada periode ini', pageWidth / 2, curY + 12, { align: 'center' })
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.text('Tingkat kepatuhan penggunaan APD: 100%', pageWidth / 2, curY + 20, { align: 'center' })
      addPageFooter(doc, pageWidth, pageHeight, pageNum)
    }

    // ════════════════════════════════════════
    // HALAMAN 2 — RINGKASAN & KESIMPULAN
    // ════════════════════════════════════════
    pageNum++
    doc.addPage()
    addPageHeader(doc, pageWidth, exportTime)

    let noteY = 36

    doc.setTextColor(15, 23, 42)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('Ringkasan Statistik dan Catatan Tindak Lanjut', margin, noteY)
    doc.setDrawColor(...BLUE)
    doc.setLineWidth(0.8)
    doc.line(margin, noteY + 2, margin + 76, noteY + 2)
    doc.setLineWidth(0.2)
    noteY += 7

    const summaryRows = [
      ['Periode Laporan', dateRange],
      ['Total Pelanggaran', `${reports.length} laporan`],
      ['Laporan Valid', `${validCount} laporan`],
      ['Laporan Invalid', `${invalidCount} laporan`],
      ['Laporan Pending', `${pendingCount} laporan`],
      ['Tipe Pelanggaran Terbanyak', mostFrequent ? `${mostFrequent[0]} - ${mostFrequent[1]} kasus` : 'Tidak ada'],
      ['Area Pelanggaran Terbanyak', mostFrequentArea ? mostFrequentArea[0] : 'Tidak ada'],
    ]

    autoTable(doc, {
      startY: noteY,
      margin: { left: margin, right: margin },
      head: [['Keterangan', 'Nilai']],
      body: summaryRows,
      headStyles: { fillColor: [50, 50, 50], textColor: 255, fontStyle: 'bold', fontSize: 9, cellPadding: 2.5 },
      bodyStyles: { fontSize: 8.5, textColor: [40, 40, 40], cellPadding: 2.5 },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      columnStyles: { 0: { cellWidth: 80 }, 1: { cellWidth: 'auto' } }
    })

    noteY = doc.lastAutoTable.finalY + 8

    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(15, 23, 42)
    doc.text('Rincian Per Tipe Pelanggaran', margin, noteY)
    doc.setDrawColor(...BLUE)
    doc.setLineWidth(0.8)
    doc.line(margin, noteY + 2, margin + 56, noteY + 2)
    doc.setLineWidth(0.2)
    noteY += 6

    if (Object.entries(typeCounts).length > 0) {
      autoTable(doc, {
        startY: noteY,
        margin: { left: margin, right: margin },
        head: [['Tipe Pelanggaran', 'Jumlah', 'Persentase']],
        body: Object.entries(typeCounts).map(([type, count]) => [
          type,
          `${count} kasus`,
          `${((count / Math.max(reports.length, 1)) * 100).toFixed(1)}%`
        ]),
        // ── PERUBAHAN 2: header tabel Rincian jadi hitam ──
        headStyles: { fillColor: [50, 50, 50], textColor: 255, fontStyle: 'bold', fontSize: 9, cellPadding: 2.5 },
        bodyStyles: { fontSize: 8.5, textColor: [40, 40, 40], cellPadding: 2.5 },
        alternateRowStyles: { fillColor: [250, 250, 250] },
        columnStyles: {
          0: { cellWidth: 'auto' },
          1: { cellWidth: 30 },
          2: { cellWidth: 30 }
        }
      })
      noteY = doc.lastAutoTable.finalY + 8
    } else {
      doc.setFontSize(8.5)
      doc.setFont('helvetica', 'italic')
      doc.setTextColor(148, 163, 184)
      doc.text('Tidak ada data tipe pelanggaran.', margin, noteY + 5)
      noteY += 12
    }

    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(15, 23, 42)
    doc.text('Catatan Otomatis Sistem', margin, noteY)
    doc.setDrawColor(...BLUE)
    doc.setLineWidth(0.8)
    doc.line(margin, noteY + 2, margin + 50, noteY + 2)
    doc.setLineWidth(0.2)
    noteY += 6

    const autoNoteLines = []
    if (reports.length === 0) {
      autoNoteLines.push('Tidak ada pelanggaran APD tercatat pada periode ini.')
      autoNoteLines.push('Tingkat kepatuhan penggunaan APD mencapai 100%.')
      autoNoteLines.push('Pertahankan kondisi ini dan tetap lakukan pengawasan secara berkala.')
    } else {
      autoNoteLines.push(`Terdapat ${reports.length} pelanggaran APD pada periode ${dateRange}.`)
      if (reports.length <= 5) autoNoteLines.push('Jumlah pelanggaran tergolong rendah.')
      else if (reports.length <= 15) autoNoteLines.push('Jumlah pelanggaran tergolong sedang.')
      else autoNoteLines.push(`Jumlah pelanggaran tergolong tinggi karena mayoritas laporan berada pada tipe ${mostFrequent ? mostFrequent[0] : 'tidak diketahui'}.`)
      if (mostFrequent) autoNoteLines.push(`Jenis pelanggaran terbanyak berupa ${mostFrequent[0]} dengan ${mostFrequent[1]} kasus.`)
      if (mostFrequentArea) autoNoteLines.push(`Area dengan pelanggaran terbanyak adalah ${mostFrequentArea[0]} dengan ${mostFrequentArea[1]} kasus.`)
      if (pendingCount > 0) {
        autoNoteLines.push(`Masih terdapat ${pendingCount} laporan pending yang perlu segera divalidasi oleh Supervisor K3.`)
        autoNoteLines.push('Laporan pending perlu divalidasi sebelum digunakan sebagai dasar evaluasi dan tindak lanjut.')
      }
    }

    const lineH = 5
    const noteBoxH = autoNoteLines.length * lineH + 8
    const noteColor = reports.length === 0 ? [240, 253, 244] : reports.length <= 5 ? [255, 251, 235] : reports.length <= 15 ? [255, 247, 237] : [254, 242, 242]
    const noteBorder = reports.length === 0 ? [134, 239, 172] : reports.length <= 5 ? [251, 191, 36] : reports.length <= 15 ? [251, 146, 60] : [252, 165, 165]
    const noteTextColor = reports.length === 0 ? [21, 128, 61] : reports.length <= 5 ? [92, 60, 0] : reports.length <= 15 ? [124, 45, 18] : [127, 29, 29]

    doc.setFillColor(...noteColor)
    doc.setDrawColor(...noteBorder)
    doc.roundedRect(margin, noteY, pageWidth - margin * 2, noteBoxH, 3, 3, 'FD')
    doc.setTextColor(...noteTextColor)
    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'normal')
    autoNoteLines.forEach((line, idx) => {
      const wrapped = doc.splitTextToSize(line, pageWidth - margin * 2 - 10)
      wrapped.forEach((wl, wi) => {
        doc.text(wl, margin + 5, noteY + 6 + idx * lineH + wi * lineH)
      })
    })
    noteY += noteBoxH + 8

    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(15, 23, 42)
    doc.text('Rekomendasi Tindak Lanjut', margin, noteY)
    doc.setDrawColor(...BLUE)
    doc.setLineWidth(0.8)
    doc.line(margin, noteY + 2, margin + 52, noteY + 2)
    doc.setLineWidth(0.2)
    noteY += 7

    const rekomendasiList = [
      'Supervisor melakukan validasi terhadap seluruh laporan pending sebelum laporan akhir disahkan.',
      'Area dengan jumlah pelanggaran tertinggi perlu diberikan pengawasan tambahan pada shift berikutnya.',
      'Pekerja yang teridentifikasi melanggar perlu diberikan pembinaan, teguran, atau tindakan sesuai prosedur K3 perusahaan.',
      'Hasil laporan harian akan dikirim otomatis ke Telegram kepada Supervisor K3 dan General Manager setiap pukul 19.00 WIB.'
    ]

    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(40, 40, 40)
    rekomendasiList.forEach((item) => {
      const wrapped = doc.splitTextToSize(`• ${item}`, pageWidth - margin * 2)
      wrapped.forEach((line, wi) => {
        doc.text(line, margin, noteY + wi * 4.5)
      })
      noteY += wrapped.length * 4.5 + 2
    })

    addPageFooter(doc, pageWidth, pageHeight, pageNum)

    // ════════════════════════════════
    // HALAMAN TERAKHIR — PENGESAHAN
    // ════════════════════════════════
    pageNum++
    doc.addPage()
    addPageHeader(doc, pageWidth, exportTime)

    let signY = 46

    doc.setTextColor(15, 23, 42)
    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.text('Pengesahan Laporan', margin, signY)
    doc.setDrawColor(...BLUE)
    doc.setLineWidth(0.8)
    doc.line(margin, signY + 2, margin + 44, signY + 2)
    doc.setLineWidth(0.2)
    signY += 10

    doc.setTextColor(80, 80, 80)
    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'normal')
    const descText = 'Laporan ini dihasilkan secara otomatis oleh Smart K3 Vision Dashboard berdasarkan data pelanggaran APD yang tersimpan pada sistem. Validasi, catatan pelanggar, dan tindak lanjut diisi oleh Supervisor K3 melalui halaman Detail Report.'
    const descLines = doc.splitTextToSize(descText, pageWidth - margin * 2)
    doc.text(descLines, margin, signY)
    signY += descLines.length * 5 + 12

    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(15, 23, 42)
    doc.text('Catatan Tambahan', margin, signY)
    doc.setDrawColor(...BLUE)
    doc.setLineWidth(0.8)
    doc.line(margin, signY + 2, margin + 38, signY + 2)
    doc.setLineWidth(0.2)
    signY += 7

    doc.setFillColor(250, 250, 252)
    doc.setDrawColor(210, 215, 225)
    doc.roundedRect(margin, signY, pageWidth - margin * 2, 35, 2, 2, 'FD')
    doc.setDrawColor(220, 225, 235)
    doc.setLineWidth(0.2)
    for (let l = 0; l < 3; l++) {
      doc.line(margin + 5, signY + 10 + l * 9, pageWidth - margin - 5, signY + 10 + l * 9)
    }
    doc.setTextColor(200, 200, 200)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'italic')
    signY += 45

    // ── PERUBAHAN 3: tanda tangan lebih besar (signY += 35 dari 20) ──
    const ttdW = 70
    const leftX = margin + 10
    const rightX = pageWidth - margin - ttdW - 10

    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(50, 50, 50)

    doc.text('Dibuat oleh,', leftX, signY)
    doc.text('Diketahui oleh,', rightX, signY)
    signY += 35  // ← diubah dari 20 menjadi 35

    doc.setDrawColor(80, 80, 80)
    doc.setLineWidth(0.4)
    doc.line(leftX, signY, leftX + ttdW, signY)
    doc.line(rightX, signY, rightX + ttdW, signY)
    doc.setLineWidth(0.2)
    signY += 5

    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(50, 50, 50)
    doc.text('Supervisor K3', leftX, signY)
    doc.text('General Manager', rightX, signY)

    addPageFooter(doc, pageWidth, pageHeight, pageNum)

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
