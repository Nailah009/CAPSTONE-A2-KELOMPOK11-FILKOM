import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import multer from 'multer'
import fs from 'fs'
import path from 'path'
import cron from 'node-cron'
import db from './db.js'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import axios from 'axios'
import FormData from 'form-data'

dotenv.config()

const app = express()
const PORT = Number(process.env.PORT || 5000)
const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads/violations'
const uploadPath = path.join(process.cwd(), UPLOAD_DIR)

if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true })
}

app.use(cors())
app.use(express.json())
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')))

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadPath),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '.jpg') || '.jpg'
    cb(null, `violation_${Date.now()}${ext}`)
  }
})

const upload = multer({ storage })

const CAMERA_PREVIEW_FALLBACK = 'https://placehold.co/1200x700/eaf2ff/2563eb?text=Camera+Preview'
const EVIDENCE_FALLBACK = 'https://placehold.co/1000x600/eaf2ff/2563eb?text=Violation+Evidence'

function boolFromValue(value) {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value === 1
  if (!value) return false
  return String(value).toLowerCase() === 'true' || String(value) === '1'
}

function getColorByType(type = '') {
  const lower = type.toLowerCase()

  if (
    lower.includes('all ppe') ||
    lower.includes('multiple') ||
    (lower.includes('helmet') && lower.includes('vest'))
  ) {
    return '#8b5cf6'
  }

  if (lower.includes('helmet')) return '#2563eb'
  if (lower.includes('vest')) return '#ef4444'

  return '#64748b'
}

function normalizeViolationType(type = '') {
  const lower = type.toLowerCase()

  if (
    lower.includes('all ppe') ||
    lower.includes('multiple') ||
    (lower.includes('helmet') && lower.includes('vest'))
  ) {
    return 'Multiple PPE'
  }

  if (lower.includes('helmet')) return 'No Helmet'
  if (lower.includes('vest')) return 'No Vest'

  return 'Others'
}

function createViolationTypeFromBooleans({ missingHelmet, missingVest }) {
  if (!missingHelmet && !missingVest) return 'No Violation'
  if (missingHelmet && missingVest) return 'Missing All PPE'

  if (missingHelmet) return 'Missing helmet'
  if (missingVest) return 'Missing vest'

  return 'No Violation'
}

function formatMysqlDate(date = new Date()) {
  return new Date(date).toISOString().slice(0, 19).replace('T', ' ')
}

function mapReportRow(row) {
  return {
    id: row.id,
    area: row.area,
    cameraId: row.cameraId,
    type: row.type,
    timestamp: row.timestamp,
    reportStatus: row.reportStatus,
    image: row.image,
    color: row.color || getColorByType(row.type),
    missingHelmet: Boolean(row.missingHelmet),
    missingVest: Boolean(row.missingVest),
    violatorName: row.violatorName || '',
    notes: row.notes || ''
  }
}

async function ensureCameraExists(cameraId, area) {
  const [rows] = await db.query('SELECT id FROM cameras WHERE id = ?', [cameraId])

  if (rows.length > 0) return

  await db.query(
    `
    INSERT INTO cameras (id, name, location, status, preview)
    VALUES (?, ?, ?, 'Active', ?)
    `,
    [cameraId, cameraId, area || 'Unknown Area', CAMERA_PREVIEW_FALLBACK]
  )
}

async function getReports(date = null) {
  let query = `
    SELECT
      id,
      area,
      camera_id AS cameraId,
      type,
      missing_items AS missingItems,
      image_path AS imagePath,
      COALESCE(validation_status, 'pending') AS validationStatus,
      violator_name AS violatorName,
      notes,
      DATE_FORMAT(timestamp, '%Y-%m-%d %H:%i:%s') AS timestamp
    FROM reports
  `

  const params = []

  if (date) {
    query += ` WHERE DATE(timestamp) = ? `
    params.push(date)
  }

  query += ` ORDER BY timestamp DESC `

  const [rows] = await db.query(query, params)

  return rows.map((row) => ({
    id: row.id,
    area: row.area,
    cameraId: row.cameraId,
    type: row.type,
    missingItems: row.missingItems,
    imagePath: row.imagePath,
    image: row.imagePath,
    timestamp: row.timestamp,
    validationStatus: row.validationStatus || 'pending',
    violatorName: row.violatorName || '',
    notes: row.notes || '',
    reportStatus: 'New',
    color:
      row.type === 'Missing All PPE'
        ? '#8b5cf6'
        : row.type === 'Missing helmet'
          ? '#2563eb'
          : row.type === 'Missing vest'
            ? '#ef4444'
            : '#64748b'
  }))
}

function formatDateDDMMYYYY(date = new Date()) {
  const d = new Date(date)
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  return `${day}${month}${year}`
}

async function insertReport({
  area,
  cameraId,
  type,
  missingItems,
  imagePath,
  timestamp
}) {
  const effectiveTimestamp = timestamp || formatMysqlDate()
  const effectiveCameraId = cameraId || 'CAM-LAPTOP'
  const dateStr = formatDateDDMMYYYY(effectiveTimestamp)
  let reportId = `RPT-${effectiveCameraId}-${dateStr}`

  // Check if ID already exists and add counter if needed
  let counter = 1
  let uniqueId = reportId
  let idExists = true

  while (idExists) {
    try {
      const [existing] = await db.query('SELECT id FROM reports WHERE id = ?', [uniqueId])
      if (existing && existing.length > 0) {
        counter++
        uniqueId = `${reportId}-${String(counter).padStart(2, '0')}`
      } else {
        idExists = false
      }
    } catch (err) {
      idExists = false
    }
  }

  const report = {
    id: uniqueId,
    area: area || 'Unknown Area',
    cameraId: effectiveCameraId,
    type: type || 'Unknown Violation',
    missingItems: missingItems || '-',
    imagePath: imagePath || '',
    timestamp: effectiveTimestamp
  }

  await ensureCameraExists(report.cameraId, report.area)

  await db.query(
    `
    INSERT INTO reports
    (id, area, camera_id, type, missing_items, image_path, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    [
      report.id,
      report.area,
      report.cameraId,
      report.type,
      report.missingItems,
      report.imagePath,
      report.timestamp
    ]
  )

  return {
    id: report.id,
    area: report.area,
    cameraId: report.cameraId,
    type: report.type,
    missingItems: report.missingItems,
    imagePath: report.imagePath,
    image: report.imagePath,
    timestamp: report.timestamp,
    reportStatus: 'New'
  }
}

app.get('/', (req, res) => {
  res.send('Smart K3 Vision Backend with MySQL is running')
})

app.get('/api/health', async (req, res) => {
  try {
    await db.query('SELECT 1')
    res.json({ status: 'ok', database: 'connected' })
  } catch (error) {
    res.status(500).json({ status: 'error', database: 'disconnected', message: error.message })
  }
})

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body

    if (!username || !password) {
      return res.status(400).json({
        message: 'Username dan password wajib diisi'
      })
    }

    const [rows] = await db.query(
      `
      SELECT id, name, username, role, status
      FROM users
      WHERE username = ? AND password = ?
      LIMIT 1
      `,
      [username, password]
    )

    if (rows.length === 0) {
      return res.status(401).json({
        message: 'Username atau password salah'
      })
    }

    const user = rows[0]

    if (user.status !== 'active') {
      return res.status(403).json({
        message: 'Akun tidak aktif. Silakan hubungi admin.'
      })
    }

    res.json({
      message: 'Login berhasil',
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role
      }
    })
  } catch (error) {
    console.error('Gagal login:', error)
    res.status(500).json({
      message: 'Terjadi kesalahan saat login'
    })
  }
})

app.get('/api/cameras', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        id,
        name,
        location,
        status,
        rtsp_url AS rtspUrl,
        COALESCE(preview, ?) AS preview
      FROM cameras
      ORDER BY id ASC
    `, [CAMERA_PREVIEW_FALLBACK])

    res.json(rows)
  } catch (error) {
    console.error('Gagal mengambil cameras:', error)
    res.status(500).json({ message: 'Gagal mengambil data cameras' })
  }
})

app.get('/api/cameras/:id', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        id,
        name,
        location,
        status,
        rtsp_url AS rtspUrl,
        COALESCE(preview, ?) AS preview
      FROM cameras
      WHERE id = ?
    `, [CAMERA_PREVIEW_FALLBACK, req.params.id])

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Camera not found' })
    }

    res.json(rows[0])
  } catch (error) {
    console.error('Gagal mengambil detail camera:', error)
    res.status(500).json({ message: 'Gagal mengambil detail camera' })
  }
})

app.get('/api/reports', async (req, res) => {
  try {
    const { area, type, validationStatus, startDate, endDate } = req.query

    let query = `
      SELECT
        id,
        area,
        camera_id AS cameraId,
        type,
        missing_items AS missingItems,
        image_path AS imagePath,
        COALESCE(validation_status, 'pending') AS validationStatus,
        violator_name AS violatorName,
        notes,
        DATE_FORMAT(timestamp, '%Y-%m-%d %H:%i:%s') AS timestamp
      FROM reports
      WHERE 1=1
    `

    const params = []

    if (area && area !== 'All') {
      query += ` AND area = ?`
      params.push(area)
    }

    if (type && type !== 'All') {
      query += ` AND type = ?`
      params.push(type)
    }

    if (validationStatus && validationStatus !== 'All') {
      query += ` AND validation_status = ?`
      params.push(validationStatus)
    }

    if (startDate) {
      query += ` AND DATE(timestamp) >= ?`
      params.push(startDate)
    }
    if (endDate) {
      query += ` AND DATE(timestamp) <= ?`
      params.push(endDate)
    }

    query += ` ORDER BY timestamp DESC`

    const [rows] = await db.query(query, params)

    const reports = rows.map((row) => ({
      id: row.id,
      area: row.area,
      cameraId: row.cameraId,
      type: row.type,
      missingItems: row.missingItems,
      imagePath: row.imagePath,
      image: row.imagePath,
      timestamp: row.timestamp,
      validationStatus: row.validationStatus || 'pending',
      violatorName: row.violatorName || '',
      notes: row.notes || '',
      reportStatus: 'New',
      color:
        row.type === 'Missing All PPE' || row.type === 'missing all ppe'
          ? '#8b5cf6'
          : row.type === 'no helmet' || row.type === 'Missing helmet'
            ? '#2563eb'
            : row.type === 'no vest' || row.type === 'Missing vest'
              ? '#ef4444'
              : row.type === 'no gloves' || row.type === 'Missing gloves'
                ? '#06b6d4'
                : row.type === 'no shoes' || row.type === 'Missing shoes'
                  ? '#ec4899'
                  : '#64748b'
    }))

    res.json(reports)
  } catch (error) {
    console.error('Gagal mengambil reports:', error)
    res.status(500).json({ message: 'Gagal mengambil data reports' })
  }
})

app.get('/api/reports/:id', async (req, res) => {
  try {
    const [rows] = await db.query(
      `
      SELECT
        id,
        area,
        camera_id AS cameraId,
        type,
        missing_items AS missingItems,
        image_path AS imagePath,
        COALESCE(validation_status, 'pending') AS validationStatus,
        violator_name AS violatorName,
        notes,
        DATE_FORMAT(timestamp, '%Y-%m-%d %H:%i:%s') AS timestamp
      FROM reports
      WHERE id = ?
      LIMIT 1
      `,
      [req.params.id]
    )

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Report tidak ditemukan' })
    }

    const row = rows[0]

    res.json({
      id: row.id,
      area: row.area,
      cameraId: row.cameraId,
      type: row.type,
      missingItems: row.missingItems,
      imagePath: row.imagePath,
      image: row.imagePath,
      timestamp: row.timestamp,
      validationStatus: row.validationStatus || 'pending',
      violatorName: row.violatorName || '',
      notes: row.notes || '',
      reportStatus: 'New'
    })
  } catch (error) {
    console.error('Gagal mengambil detail report:', error)
    res.status(500).json({ message: 'Gagal mengambil detail report' })
  }
})

app.post('/api/reports', async (req, res) => {
  try {
    const {
      area,
      cameraId,
      type,
      missingItems,
      imagePath,
      image,
      timestamp
    } = req.body

    const newReport = await insertReport({
      area,
      cameraId,
      type,
      missingItems,
      imagePath: imagePath || image || '',
      timestamp
    })

    res.status(201).json({
      message: 'Report berhasil ditambahkan',
      data: newReport
    })
  } catch (error) {
    console.error('Gagal menyimpan report:', error)
    res.status(500).json({ message: 'Gagal menyimpan report' })
  }
})

app.post('/api/violations/ingest', upload.single('image'), async (req, res) => {
  try {
    const cameraId = req.body.camera_id || req.body.cameraId || 'CAM-LAPTOP'
    const area = req.body.area || 'Webcam Test Area'

    const missingHelmet = boolFromValue(req.body.missing_helmet)
    const missingVest = boolFromValue(req.body.missing_vest)

    const type =
      req.body.type ||
      createViolationTypeFromBooleans({ missingHelmet, missingVest })

    const image = req.file
      ? `http://localhost:${PORT}/uploads/violations/${req.file.filename}`
      : EVIDENCE_FALLBACK

    const newReport = await insertReport({
      area,
      cameraId,
      type,
      timestamp: formatMysqlDate(),
      reportStatus: 'New',
      image,
      missingHelmet,
      missingVest
    })

    res.status(201).json({
      status: 'success',
      message: 'Pelanggaran berhasil dicatat',
      data: newReport
    })
  } catch (error) {
    console.error('Gagal ingest violation:', error)
    res.status(500).json({ status: 'error', message: 'Internal server error' })
  }
})

// === MODIFIKASI: LOGIKA PERHITUNGAN DASHBOARD ===
app.get('/api/dashboard', async (req, res) => {
  try {
    const selectedDate = req.query.date
    const reportRows = await getReports(selectedDate)
    const totalViolations = reportRows.length

    // Inisialisasi keranjang hitung untuk SEMUA kemungkinan dari AI
    const categoryCounts = {
      'No Helmet': 0,
      'No Vest': 0,
      'No Gloves': 0,
      'No Shoes': 0,
      'Multiple PPE': 0
    }

    reportRows.forEach((report) => {
      const typeStr = (report.type || '').toLowerCase()

      // Penguraian string dinamis berdasarkan output dari opencv.py
      if (typeStr.includes('missing all ppe') || typeStr.includes('multiple')) {
        categoryCounts['Multiple PPE'] += 1
      } else {
        if (typeStr.includes('helmet')) categoryCounts['No Helmet'] += 1
        if (typeStr.includes('vest')) categoryCounts['No Vest'] += 1
        if (typeStr.includes('glove')) categoryCounts['No Gloves'] += 1
        if (typeStr.includes('shoe')) categoryCounts['No Shoes'] += 1
      }
    })

    // Membuang kategori yang nilainya 0 agar tidak kosong di grafik
    const filteredCategoryCounts = Object.entries(categoryCounts)
      .filter(([name, count]) => count > 0)

    // Menghitung total frekuensi seluruh pelanggaran (bisa lebih besar dari jumlah laporan)
    const totalFrequencies = filteredCategoryCounts.reduce((sum, [_, c]) => sum + c, 0)

    const violationOverview = filteredCategoryCounts.map(([name, count]) => {
      const percentage =
        totalFrequencies > 0 ? ((count / totalFrequencies) * 100).toFixed(1) : '0.0'

      return {
        name,
        value: count,
        percentage: `${percentage}%`
      }
    })

    const mostFrequent = filteredCategoryCounts.sort((a, b) => b[1] - a[1])[0]

    // SORTING ACTIVE CAMERAS
    const [cameraRows] = await db.query(`
      SELECT
        id,
        name,
        location,
        status,
        rtsp_url AS rtspUrl,
        COALESCE(preview, ?) AS preview
      FROM cameras
      ORDER BY CASE WHEN status = 'Active' THEN 1 ELSE 2 END, id ASC
    `, [CAMERA_PREVIEW_FALLBACK])

    const activeCount = cameraRows.filter((cam) => cam.status === 'Active').length
    const totalCameras = cameraRows.length
    const monitoringCoverage =
      totalCameras > 0 ? `${Math.round((activeCount / totalCameras) * 100)}%` : '0%'

    const [dailyRows] = await db.query(`
      SELECT 
        DATE(timestamp) AS date,
        COUNT(*) AS value
      FROM reports
      GROUP BY DATE(timestamp)
      ORDER BY DATE(timestamp) ASC
    `)

    const dynamicDashboard = {
      stats: {
        totalViolations, // Total Laporan / Insiden
        totalGrowth: 'Realtime',
        mostFrequentViolation: mostFrequent ? mostFrequent[0] : '-',
        topViolationShare:
          totalFrequencies > 0 && mostFrequent
            ? `${((mostFrequent[1] / totalFrequencies) * 100).toFixed(1)}%`
            : '0%',
        monitoringCoverage,
        coverageGrowth: 'Live',
        complianceRate: totalViolations > 0 ? 'Need Review' : '100%',
        complianceGrowth: 'Realtime'
      },

      dailyViolations: dailyRows.map((row) => ({
        date: new Date(row.date).toLocaleDateString('id-ID', {
          day: '2-digit',
          month: 'short'
        }),
        value: row.value
      })),

      violationOverview,
      activeCameras: cameraRows,
      recentReports: reportRows
    }

    res.json(dynamicDashboard)
  } catch (error) {
    console.error('Gagal mengambil dashboard:', error)
    res.status(500).json({ message: 'Gagal mengambil data dashboard' })
  }
})

app.get('/api/reports/unvalidated/pending', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        id,
        area,
        camera_id AS cameraId,
        type,
        missing_items AS missingItems,
        image_path AS imagePath,
        COALESCE(validation_status, 'pending') AS validationStatus,
        violator_name AS violatorName,
        notes,
        DATE_FORMAT(timestamp, '%Y-%m-%d %H:%i:%s') AS timestamp
      FROM reports
      WHERE COALESCE(validation_status, 'pending') = 'pending'
      ORDER BY timestamp DESC
    `)

    const reports = rows.map(row => ({
      id: row.id,
      area: row.area,
      cameraId: row.cameraId,
      type: row.type,
      missingItems: row.missingItems,
      imagePath: row.imagePath,
      image: row.imagePath,
      timestamp: row.timestamp,
      validationStatus: row.validationStatus,
      violatorName: row.violatorName || '',
      notes: row.notes || ''
    }))

    res.json(reports)
  } catch (error) {
    console.error('Gagal mengambil laporan yang belum divalidasi:', error)
    res.status(500).json({ message: 'Gagal mengambil data' })
  }
})

app.put('/api/reports/:id/validate', async (req, res) => {
  try {
    const { validationStatus, validatedBy, violatorName, notes } = req.body
    const reportId = req.params.id

    if (!['valid', 'invalid'].includes(validationStatus)) {
      return res.status(400).json({ message: 'Status validasi tidak valid' })
    }

    await db.query(`
      UPDATE reports
      SET validation_status = ?, validated_at = NOW(), validated_by = ?, violator_name = ?, notes = ?
      WHERE id = ?
    `, [validationStatus, validatedBy || null, violatorName || null, notes || null, reportId])

    res.json({ message: `Report berhasil divalidasi sebagai ${validationStatus}` })
  } catch (error) {
    console.error('Gagal memvalidasi report:', error)
    res.status(500).json({ message: 'Gagal memvalidasi report' })
  }
})

app.get('/api/reports/stats/trends-by-time', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        HOUR(timestamp) AS hour,
        COUNT(*) AS count
      FROM reports
      WHERE DATE(timestamp) = CURDATE()
      GROUP BY HOUR(timestamp)
      ORDER BY hour ASC
    `)

    const hourlyData = Array.from({ length: 24 }, (_, i) => {
      const hour = i
      const count = rows.find(r => r.hour === hour)?.count || 0
      return {
        hour: `${String(hour).padStart(2, '0')}:00`,
        violations: count
      }
    })

    res.json(hourlyData)
  } catch (error) {
    console.error('Gagal mengambil tren waktu:', error)
    res.status(500).json({ message: 'Gagal mengambil tren waktu' })
  }
})

app.get('/api/reports/stats/trends-by-location', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        area,
        COUNT(*) AS violations
      FROM reports
      GROUP BY area
      ORDER BY violations DESC
    `)

    res.json(rows)
  } catch (error) {
    console.error('Gagal mengambil tren lokasi:', error)
    res.status(500).json({ message: 'Gagal mengambil tren lokasi' })
  }
})

app.get('/api/reports/stats/trends-by-type', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        type,
        COUNT(*) AS violations
      FROM reports
      GROUP BY type
      ORDER BY violations DESC
    `)

    res.json(rows)
  } catch (error) {
    console.error('Gagal mengambil tren jenis pelanggaran:', error)
    res.status(500).json({ message: 'Gagal mengambil tren jenis pelanggaran' })
  }
})

app.get('/api/reports/stats/summary', async (req, res) => {
  try {
    const [totalRows] = await db.query('SELECT COUNT(*) AS total FROM reports')
    const [validatedRows] = await db.query("SELECT COUNT(*) AS total FROM reports WHERE COALESCE(validation_status, 'pending') IN ('valid', 'invalid')")
    const [pendingRows] = await db.query("SELECT COUNT(*) AS total FROM reports WHERE COALESCE(validation_status, 'pending') = 'pending'")
    const [validRows] = await db.query("SELECT COUNT(*) AS total FROM reports WHERE COALESCE(validation_status, 'pending') = 'valid'")
    const [invalidRows] = await db.query("SELECT COUNT(*) AS total FROM reports WHERE COALESCE(validation_status, 'pending') = 'invalid'")

    const [typeData] = await db.query(`
      SELECT type, COUNT(*) AS count
      FROM reports
      GROUP BY type
    `)

    const [locationData] = await db.query(`
      SELECT area, COUNT(*) AS count
      FROM reports
      GROUP BY area
    `)

    res.json({
      totalReports: totalRows[0].total,
      validatedReports: validatedRows[0].total,
      pendingReports: pendingRows[0].total,
      validReports: validRows[0].total,
      invalidReports: invalidRows[0].total,
      violationTypes: typeData,
      locations: locationData
    })
  } catch (error) {
    console.error('Gagal mengambil ringkasan statistik:', error)
    res.status(500).json({ message: 'Gagal mengambil ringkasan statistik' })
  }
})

// ==========================================
// BOOTSTRAP - Create First Admin User
// ==========================================
app.post('/api/bootstrap/init-admin', async (req, res) => {
  try {
    const { name, username, password } = req.body

    if (!name || !username || !password) {
      return res.status(400).json({ message: 'Semua field wajib diisi' })
    }

    const [adminExists] = await db.query('SELECT id FROM users WHERE role = ?', ['admin'])
    if (adminExists.length > 0) {
      return res.status(403).json({ message: 'Admin sudah ada, tidak bisa membuat admin baru melalui endpoint ini' })
    }

    const [existing] = await db.query('SELECT id FROM users WHERE username = ?', [username])
    if (existing.length > 0) {
      return res.status(409).json({ message: 'Username sudah terdaftar' })
    }

    await db.query(
      'INSERT INTO users (name, username, password, role, status, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
      [name, username, password, 'admin', 'active']
    )

    res.json({ name, username, role: 'admin', status: 'active', message: 'Admin berhasil dibuat' })
  } catch (error) {
    console.error('Gagal membuat admin awal:', error)
    res.status(500).json({ message: 'Gagal membuat admin' })
  }
})

app.get('/api/bootstrap/check-admin', async (req, res) => {
  try {
    const [adminExists] = await db.query('SELECT COUNT(*) as count FROM users WHERE role = ?', ['admin'])
    res.json({ adminExists: adminExists[0].count > 0 })
  } catch (error) {
    console.error('Gagal mengecek admin:', error)
    res.status(500).json({ message: 'Gagal mengecek admin' })
  }
})

// ==========================================
// ADMIN ENDPOINTS - User Management
// ==========================================
app.get('/api/admin/users', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT id, name, username, role, status, created_at
      FROM users
      ORDER BY created_at DESC
    `)
    res.json(rows)
  } catch (error) {
    console.error('Gagal mengambil data pengguna:', error)
    res.status(500).json({ message: 'Gagal mengambil data pengguna' })
  }
})

app.post('/api/admin/users', async (req, res) => {
  try {
    const { name, username, password, role } = req.body

    if (!name || !username || !password || !role) {
      return res.status(400).json({ message: 'Semua field wajib diisi' })
    }

    if (!['admin', 'supervisor', 'general_manager'].includes(role)) {
      return res.status(400).json({ message: 'Role tidak valid' })
    }

    const [existing] = await db.query('SELECT id FROM users WHERE username = ?', [username])
    if (existing.length > 0) {
      return res.status(409).json({ message: 'Username sudah terdaftar' })
    }

    const [result] = await db.query(
      'INSERT INTO users (name, username, password, role, status, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
      [name, username, password, role, 'active']
    )

    res.json({ id: result.insertId, name, username, role, status: 'active' })
  } catch (error) {
    console.error('Gagal membuat pengguna:', error)
    res.status(500).json({ message: 'Gagal membuat pengguna' })
  }
})

app.put('/api/admin/users/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { name, role, status } = req.body

    if (!['admin', 'supervisor', 'general_manager'].includes(role)) {
      return res.status(400).json({ message: 'Role tidak valid' })
    }

    if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({ message: 'Status tidak valid' })
    }

    await db.query('UPDATE users SET name = ?, role = ?, status = ? WHERE id = ?', [name, role, status, id])
    res.json({ message: 'Pengguna berhasil diperbarui' })
  } catch (error) {
    console.error('Gagal memperbarui pengguna:', error)
    res.status(500).json({ message: 'Gagal memperbarui pengguna' })
  }
})

app.delete('/api/admin/users/:id', async (req, res) => {
  try {
    const { id } = req.params
    await db.query('DELETE FROM users WHERE id = ?', [id])
    res.json({ message: 'Pengguna berhasil dihapus' })
  } catch (error) {
    console.error('Gagal menghapus pengguna:', error)
    res.status(500).json({ message: 'Gagal menghapus pengguna' })
  }
})

// ==========================================
// ADMIN ENDPOINTS - Camera Management
// ==========================================
app.get('/api/admin/cameras', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT id, name, location, status, rtsp_url, created_at
      FROM cameras
      ORDER BY created_at DESC
    `)
    res.json(rows)
  } catch (error) {
    console.error('Gagal mengambil data kamera:', error)
    res.status(500).json({ message: 'Gagal mengambil data kamera' })
  }
})

app.post('/api/admin/cameras', async (req, res) => {
  try {
    const { name, location, rtsp_url } = req.body

    if (!name || !location) {
      return res.status(400).json({ message: 'Nama dan lokasi wajib diisi' })
    }

    const cameraId = `CAM-${Date.now()}`
    const hasRtspUrl = rtsp_url && rtsp_url.trim() !== ''
    const status = hasRtspUrl ? 'Active' : 'Inactive'

    await db.query(
      `INSERT INTO cameras (id, name, location, rtsp_url, status, created_at)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [cameraId, name, location, rtsp_url || null, status]
    )

    res.json({ id: cameraId, name, location, rtsp_url, status })
  } catch (error) {
    console.error('Gagal membuat kamera:', error)
    res.status(500).json({ message: 'Gagal membuat kamera' })
  }
})

app.put('/api/admin/cameras/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { name, location, rtsp_url } = req.body

    // Validasi input
    if (!name || !location) {
      return res.status(400).json({ message: 'Nama dan lokasi wajib diisi' })
    }

    // Validasi RTSP URL - jika diisi, harus valid
    if (rtsp_url && rtsp_url.trim() !== '') {
      const trimmedUrl = rtsp_url.trim()
      // Hanya allow: RTSP URL, laptop address '0', atau URL lainnya
      if (trimmedUrl !== '0' && !trimmedUrl.toLowerCase().startsWith('rtsp://') &&
        !trimmedUrl.toLowerCase().startsWith('http')) {
        return res.status(400).json({ message: 'RTSP URL harus valid (rtsp:// atau http://) atau "0" untuk laptop' })
      }
    }

    const hasRtspUrl = rtsp_url && rtsp_url.trim() !== ''
    const status = hasRtspUrl ? 'Active' : 'Inactive'

    await db.query(
      'UPDATE cameras SET name = ?, location = ?, rtsp_url = ?, status = ? WHERE id = ?',
      [name, location, rtsp_url || null, status, id]
    )
    res.json({ id, name, location, rtsp_url: rtsp_url || null, status, message: 'Kamera berhasil diperbarui' })
  } catch (error) {
    console.error('Gagal memperbarui kamera:', error)
    res.status(500).json({ message: 'Gagal memperbarui kamera' })
  }
})

app.delete('/api/admin/cameras/:id', async (req, res) => {
  try {
    const { id } = req.params
    await db.query('DELETE FROM cameras WHERE id = ?', [id])
    res.json({ message: 'Kamera berhasil dihapus' })
  } catch (error) {
    console.error('Gagal menghapus kamera:', error)
    res.status(500).json({ message: 'Gagal menghapus kamera' })
  }
})

// ==========================================
// ADMIN ENDPOINTS - Area Management
// ==========================================
app.get('/api/admin/areas', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT id, name FROM areas
      ORDER BY name ASC
    `)
    res.json(rows)
  } catch (error) {
    console.error('Gagal mengambil data area:', error)
    res.status(500).json({ message: 'Gagal mengambil data area' })
  }
})

app.post('/api/admin/areas', async (req, res) => {
  try {
    const { name } = req.body

    if (!name) {
      return res.status(400).json({ message: 'Nama area wajib diisi' })
    }

    const areaId = `AREA-${Date.now()}`
    await db.query(
      `INSERT INTO areas (id, name) VALUES (?, ?)`,
      [areaId, name]
    )

    res.json({ id: areaId, name })
  } catch (error) {
    console.error('Gagal membuat area:', error)
    res.status(500).json({ message: 'Gagal membuat area' })
  }
})

app.put('/api/admin/areas/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { name } = req.body

    if (!name) {
      return res.status(400).json({ message: 'Nama area wajib diisi' })
    }

    await db.query(
      'UPDATE areas SET name = ? WHERE id = ?',
      [name, id]
    )
    res.json({ message: 'Area berhasil diperbarui' })
  } catch (error) {
    console.error('Gagal memperbarui area:', error)
    res.status(500).json({ message: 'Gagal memperbarui area' })
  }
})

app.delete('/api/admin/areas/:id', async (req, res) => {
  try {
    const { id } = req.params
    await db.query('DELETE FROM areas WHERE id = ?', [id])
    res.json({ message: 'Area berhasil dihapus' })
  } catch (error) {
    console.error('Gagal menghapus area:', error)
    res.status(500).json({ message: 'Gagal menghapus area' })
  }
})

// ==========================================
// ADMIN ENDPOINTS - AI Rules Management
// ==========================================
app.get('/api/admin/rules', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        id, 
        camera_id, 
        enforce_helmet, 
        enforce_vest, 
        enforce_gloves, 
        enforce_shoes, 
        created_at
      FROM ai_rules
      ORDER BY created_at DESC
    `)
    res.json(rows)
  } catch (error) {
    console.error('Gagal mengambil AI rules:', error)
    res.status(500).json({ message: 'Gagal mengambil AI rules' })
  }
})

app.post('/api/admin/rules', async (req, res) => {
  try {
    const { camera_id, enforce_helmet, enforce_vest, enforce_gloves, enforce_shoes } = req.body

    if (!camera_id) {
      return res.status(400).json({ message: 'Camera ID wajib diisi' })
    }

    const ruleId = `RULE-${Date.now()}`
    await db.query(
      `INSERT INTO ai_rules (id, camera_id, enforce_helmet, enforce_vest, enforce_gloves, enforce_shoes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [
        ruleId,
        camera_id,
        enforce_helmet ? 1 : 0,
        enforce_vest ? 1 : 0,
        enforce_gloves ? 1 : 0,
        enforce_shoes ? 1 : 0
      ]
    )

    res.json({
      id: ruleId,
      camera_id,
      enforce_helmet: Boolean(enforce_helmet),
      enforce_vest: Boolean(enforce_vest),
      enforce_gloves: Boolean(enforce_gloves),
      enforce_shoes: Boolean(enforce_shoes)
    })
  } catch (error) {
    console.error('Gagal membuat AI rule:', error)
    res.status(500).json({ message: 'Gagal membuat AI rule' })
  }
})

app.put('/api/admin/rules/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { enforce_helmet, enforce_vest, enforce_gloves, enforce_shoes } = req.body

    await db.query(
      `UPDATE ai_rules 
       SET enforce_helmet = ?, enforce_vest = ?, enforce_gloves = ?, enforce_shoes = ?
       WHERE id = ?`,
      [
        enforce_helmet ? 1 : 0,
        enforce_vest ? 1 : 0,
        enforce_gloves ? 1 : 0,
        enforce_shoes ? 1 : 0,
        id
      ]
    )
    res.json({ message: 'AI rule berhasil diperbarui' })
  } catch (error) {
    console.error('Gagal memperbarui AI rule:', error)
    res.status(500).json({ message: 'Gagal memperbarui AI rule' })
  }
})

// ==========================================
// ENDPOINT FOR OPENCV.PY - Configuration Fetch
// ==========================================
app.get('/api/admin/ai-config', async (req, res) => {
  try {
    const [cameras] = await db.query(`
      SELECT id, name, rtsp_url, location, status
      FROM cameras
      ORDER BY created_at ASC
    `)

    const camerasWithRules = await Promise.all(
      cameras.map(async (cam) => {
        const [rules] = await db.query(
          'SELECT * FROM ai_rules WHERE camera_id = ? LIMIT 1',
          [cam.id]
        )
        return {
          id: cam.id,
          name: cam.name,
          rtsp_url: cam.rtsp_url || '0',
          location: cam.location,
          status: cam.status,
          rules: rules.length > 0 ? rules[0] : {
            enforce_helmet: true,
            enforce_vest: true,
            enforce_gloves: false,
            enforce_shoes: true
          }
        }
      })
    )

    res.json({ cameras: camerasWithRules })
  } catch (error) {
    console.error('Gagal mengambil AI config:', error)
    res.status(500).json({ message: 'Gagal mengambil AI config' })
  }
})

// ==========================================
// TELEGRAM BOT INTEGRATION - DAILY SUMMARY & PDF
// ==========================================

// Fungsi Internal untuk menggambar PDF
function generateDailyPDFBuffer(rawReports = [], dateStrIndo = '') {
  const reports = rawReports.map((r) => ({
    id: r.id || '-',
    timestamp: r.timestamp || '-',
    area: r.area || '-',
    cameraId: r.cameraId || r.camera_id || '-',
    type: r.type || '-',
    validationStatus: r.validationStatus || r.validation_status || 'pending',
    violatorName: r.violatorName || r.violator_name || '',
    notes: r.notes || ''
  }))

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 14

  const BLUE = [37, 99, 235]

  const exportTime = new Date().toLocaleString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })

  const addPageHeader = (doc, pageWidth, exportTime) => {
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
      pageWidth / 2,
      pageHeight - 7,
      { align: 'center' }
    )
  }

  const typeCounts = {}
  reports.forEach((r) => {
    typeCounts[r.type] = (typeCounts[r.type] || 0) + 1
  })

  const areaCounts = {}
  reports.forEach((r) => {
    areaCounts[r.area] = (areaCounts[r.area] || 0) + 1
  })

  const mostFrequent = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]
  const mostFrequentArea = Object.entries(areaCounts).sort((a, b) => b[1] - a[1])[0]

  const validCount = reports.filter(r => r.validationStatus === 'valid').length
  const invalidCount = reports.filter(r => r.validationStatus === 'invalid').length
  const pendingCount = reports.filter(r => r.validationStatus === 'pending').length

  let dateRange = dateStrIndo || new Date().toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  })

  if (reports.length > 0) {
    const dates = reports
      .map((r) => new Date(r.timestamp))
      .filter((d) => !Number.isNaN(d.getTime()))

    if (dates.length > 0) {
      const minDate = new Date(Math.min(...dates)).toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      })
      const maxDate = new Date(Math.max(...dates)).toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      })
      dateRange = minDate === maxDate ? minDate : `${minDate} - ${maxDate}`
    }
  }

  const filterText = [
    'Area: Semua',
    'Tipe: Semua',
    'Status: Semua'
  ].join(' | ')

  // HALAMAN 1
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
      bg: [239, 246, 255],
      border: [191, 219, 254],
      valColor: [37, 99, 235]
    },
    {
      label: 'Validasi',
      value: `${validCount} valid`,
      sub: `${invalidCount} invalid | ${pendingCount} pending`,
      bg: [240, 253, 244],
      border: [134, 239, 172],
      valColor: [21, 128, 61]
    },
    {
      label: 'Tipe Terbanyak',
      value: mostFrequent ? mostFrequent[0] : 'Tidak ada',
      sub: mostFrequent
        ? `${mostFrequent[1]} kasus - ${((mostFrequent[1] / Math.max(reports.length, 1)) * 100).toFixed(1)}%`
        : '-',
      bg: [255, 247, 237],
      border: [251, 191, 36],
      valColor: [180, 83, 9]
    },
    {
      label: 'Area Terbanyak',
      value: mostFrequentArea ? mostFrequentArea[0] : 'Tidak ada',
      sub: mostFrequentArea ? `${mostFrequentArea[1]} kasus` : '-',
      bg: [253, 242, 248],
      border: [249, 168, 212],
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
      margin: { left: margin, right: margin, top: 34, bottom: 18 },
      tableWidth: pageWidth - margin * 2,
      head: [[
        'No',
        'ID Laporan',
        'Waktu',
        'Area',
        'Kamera',
        'Pelanggaran APD\nTidak Lengkap',
        'Status',
        'Nama Pelanggar',
        'Catatan Supervisor'
      ]],
      body: reports.map((report, i) => [
        i + 1,
        String(report.id).substring(0, 20),
        report.timestamp,
        report.area,
        report.cameraId,
        report.type,
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
        overflow: 'linebreak'
      },
      bodyStyles: {
        fontSize: 6.5,
        textColor: [40, 40, 40],
        cellPadding: 2,
        valign: 'top',
        overflow: 'linebreak'
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
      didDrawPage: () => {
        const pageNum = doc.internal.getCurrentPageInfo().pageNumber
        addPageHeader(doc, pageWidth, exportTime)
        addPageFooter(doc, pageWidth, pageHeight, pageNum)
      }
    })

    const afterTableY = doc.lastAutoTable.finalY + 4
    if (afterTableY < pageHeight - 18) {
      doc.setFontSize(7.5)
      doc.setFont('helvetica', 'italic')
      doc.setTextColor(130, 130, 130)
      doc.text('* Laporan berstatus Pending belum divalidasi oleh Supervisor.', margin, afterTableY)
    }
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

    addPageFooter(doc, pageWidth, pageHeight, 1)
  }

  // HALAMAN 2
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
    ['Area Pelanggaran Terbanyak', mostFrequentArea ? mostFrequentArea[0] : 'Tidak ada']
  ]

  autoTable(doc, {
    startY: noteY,
    margin: { left: margin, right: margin },
    head: [['Keterangan', 'Nilai']],
    body: summaryRows,
    headStyles: {
      fillColor: [50, 50, 50],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 9,
      cellPadding: 2.5
    },
    bodyStyles: {
      fontSize: 8.5,
      textColor: [40, 40, 40],
      cellPadding: 2.5
    },
    alternateRowStyles: { fillColor: [250, 250, 250] },
    columnStyles: {
      0: { cellWidth: 80 },
      1: { cellWidth: 'auto' }
    }
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
      headStyles: {
        fillColor: [50, 50, 50],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 9,
        cellPadding: 2.5
      },
      bodyStyles: {
        fontSize: 8.5,
        textColor: [40, 40, 40],
        cellPadding: 2.5
      },
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

    if (reports.length <= 5) {
      autoNoteLines.push('Jumlah pelanggaran tergolong rendah.')
    } else if (reports.length <= 15) {
      autoNoteLines.push('Jumlah pelanggaran tergolong sedang.')
    } else {
      autoNoteLines.push(`Jumlah pelanggaran tergolong tinggi karena mayoritas laporan berada pada tipe ${mostFrequent ? mostFrequent[0] : 'tidak diketahui'}.`)
    }

    if (mostFrequent) {
      autoNoteLines.push(`Jenis pelanggaran terbanyak berupa ${mostFrequent[0]} dengan ${mostFrequent[1]} kasus.`)
    }

    if (mostFrequentArea) {
      autoNoteLines.push(`Area dengan pelanggaran terbanyak adalah ${mostFrequentArea[0]} dengan ${mostFrequentArea[1]} kasus.`)
    }

    if (pendingCount > 0) {
      autoNoteLines.push(`Masih terdapat ${pendingCount} laporan pending yang perlu segera divalidasi oleh Supervisor K3.`)
      autoNoteLines.push('Laporan pending perlu divalidasi sebelum digunakan sebagai dasar evaluasi dan tindak lanjut.')
    }
  }

  const lineH = 5
  const noteBoxH = autoNoteLines.length * lineH + 8

  const noteColor =
    reports.length === 0 ? [240, 253, 244]
    : reports.length <= 5 ? [255, 251, 235]
    : reports.length <= 15 ? [255, 247, 237]
    : [254, 242, 242]

  const noteBorder =
    reports.length === 0 ? [134, 239, 172]
    : reports.length <= 5 ? [251, 191, 36]
    : reports.length <= 15 ? [251, 146, 60]
    : [252, 165, 165]

  const noteTextColor =
    reports.length === 0 ? [21, 128, 61]
    : reports.length <= 5 ? [92, 60, 0]
    : reports.length <= 15 ? [124, 45, 18]
    : [127, 29, 29]

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

  addPageFooter(doc, pageWidth, pageHeight, doc.internal.getCurrentPageInfo().pageNumber)

  // HALAMAN 3 — PENGESAHAN
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

  signY += 45

  const ttdW = 70
  const leftX = margin + 10
  const rightX = pageWidth - margin - ttdW - 10

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(50, 50, 50)

  doc.text('Dibuat oleh,', leftX, signY)
  doc.text('Diketahui oleh,', rightX, signY)

  signY += 35

  doc.setDrawColor(80, 80, 80)
  doc.setLineWidth(0.4)
  doc.line(leftX, signY, leftX + ttdW, signY)
  doc.line(rightX, signY, rightX + ttdW, signY)

  signY += 5

  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(50, 50, 50)

  doc.text('Supervisor K3', leftX, signY)
  doc.text('General Manager', rightX, signY)

  addPageFooter(doc, pageWidth, pageHeight, doc.internal.getCurrentPageInfo().pageNumber)

  return Buffer.from(doc.output('arraybuffer'))
}

// Send Telegram
async function sendTelegramDailySummary() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.warn('⚠️ Telegram Token atau Chat ID belum disetel di .env');
    return;
  }

  try {
    const today = new Date().toISOString().slice(0, 10);
    const dateStrIndo = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

    // 1. Ambil Data Database
    const [todayReports] = await db.query(
      `SELECT 
        id,
        camera_id AS cameraId,
        type,
        COALESCE(validation_status, 'pending') AS validationStatus,
        area,
        violator_name AS violatorName,
        notes,
        DATE_FORMAT(timestamp, '%Y-%m-%d %H:%i:%s') AS timestamp
      FROM reports 
      WHERE DATE(timestamp) = ? 
      ORDER BY timestamp DESC`,
      [today]
    );

    const [pendingPast] = await db.query(
      "SELECT COUNT(*) as count FROM reports WHERE COALESCE(validation_status, 'pending') = 'pending' AND DATE(timestamp) < ?",
      [today]
    );

    // 2. Fungsi Statistik
    const totalToday = todayReports.length;
    const validCount = todayReports.filter(r => r.validation_status === 'valid').length;
    const invalidCount = todayReports.filter(r => r.validation_status === 'invalid').length;
    const pendingToday = todayReports.filter(r => r.validation_status === 'pending' || !r.validation_status).length;
    const hutangValidasi = pendingPast[0].count;

    const typeCounts = {};
    const areaCounts = {};

    todayReports.forEach(r => {
      typeCounts[r.type] = (typeCounts[r.type] || 0) + 1;
      const areaName = r.area || 'Unknown Area';
      areaCounts[areaName] = (areaCounts[areaName] || 0) + 1;
    });

    const sortedTypes = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]);
    const mostFrequentType = sortedTypes.length > 0 ? `${sortedTypes[0][0]} (${sortedTypes[0][1]} Kasus)` : '-';

    const sortedAreas = Object.entries(areaCounts).sort((a, b) => b[1] - a[1]);
    const mostFrequentArea = sortedAreas.length > 0 ? `${sortedAreas[0][0]} (${sortedAreas[0][1]} Kasus)` : '-';

    // 3. Struktur Teks
    const textMessage = `
📊 <b>LAPORAN HARIAN K3 VISION</b> 📊
🗓️ Tanggal: ${dateStrIndo}

Selamat malam, berikut adalah ringkasan pemantauan kepatuhan APD hari ini:

📈 <b>RINGKASAN INSIDEN (Total: ${totalToday} Deteksi)</b>
• 🟢 <b>Valid</b> (Terkonfirmasi Pelanggaran): ${validCount}
• 🔴 <b>Invalid</b> (Salah Deteksi AI): ${invalidCount}
• ⚠️ <b>Pending</b> (Belum Divalidasi): ${pendingToday}

📌 <b>FOKUS UTAMA HARI INI</b>
• 🦺 <b>Pelanggaran Terbanyak:</b> ${mostFrequentType}
• 📍 <b>Lokasi Paling Rawan:</b> ${mostFrequentArea}

⏳ <b>PENGINGAT:</b> Terdapat total <b>${hutangValidasi}</b> laporan dari hari-hari sebelumnya yang masih berstatus <i>Pending</i>.

📄 <i>Detail rincian kasus beserta catatan Supervisor terlampir pada dokumen PDF di bawah ini.</i>
`;

    // 4. Ringkasan 
    try {
      await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
        chat_id: chatId,
        text: textMessage,
        parse_mode: 'HTML'
      })
    } catch (err) {
      console.error('❌ Gagal mengirim teks Telegram:', err.response?.data || err.message)
      return // Berhenti jika gagal kirim teks
    }

    // 5. Buat File PDF
    const summaryStats = { total: totalToday, valid: validCount, invalid: invalidCount, pending: pendingToday }
    const pdfBuffer = generateDailyPDFBuffer(todayReports, dateStrIndo)
    

    // Gunakan FormData dari package NodeJS (Tidak perlu fungsi Blob browser)
    const formData = new FormData()
    formData.append('chat_id', chatId)
    formData.append('document', pdfBuffer, `laporan-k3-${today}.pdf`)

    // 6. Kirim Dokumen PDF 
    try {
      await axios.post(`https://api.telegram.org/bot${token}/sendDocument`, formData, {
        headers: formData.getHeaders() // Wajib di NodeJS agar Telegram tahu ini adalah file
      })
      console.log('✅ Berhasil mengirim teks rekap & dokumen PDF ke Telegram!')
    } catch (err) {
      console.error('❌ Gagal mengirim dokumen PDF Telegram:', err.response?.data || err.message)
    }

  } catch (error) {
    console.error('❌ Terjadi kesalahan saat mengeksekusi Telegram Bot:', error)
  }
}

// ==========================================
// PENJADWALAN DAN ENDPOINT TESTING
// ==========================================

// Jadwalkan Cron Job (Berjalan setiap hari pada jam 19:00 server)
cron.schedule('0 19 * * *', () => {
  console.log('Menjalankan Cron Job: Mengirim Rekap Telegram...')
  sendTelegramDailySummary()
})

// Endpoint untuk trigger manual dari browser (WAJIB ADA AGAR TIDAK ERROR "CANNOT GET")
app.get('/api/test-telegram', async (req, res) => {
  await sendTelegramDailySummary()
  res.json({ message: 'Perintah pengiriman Telegram telah dipicu, silakan cek HP Anda.' })
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
