import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import multer from 'multer'
import fs from 'fs'
import path from 'path'
import db from './db.js'

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

function createViolationTypeFromBooleans({ missingHelmet, missingVest}) {
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
    missingVest: Boolean(row.missingVest)
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

async function insertReport({
  area,
  cameraId,
  type,
  missingItems,
  imagePath,
  timestamp
}) {
  const report = {
    id: `RPT-${Date.now()}`,
    area: area || 'Unknown Area',
    cameraId: cameraId || 'CAM-LAPTOP',
    type: type || 'Unknown Violation',
    missingItems: missingItems || '-',
    imagePath: imagePath || '',
    timestamp: timestamp || formatMysqlDate()
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
    const reports = await getReports()
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
      createViolationTypeFromBooleans({ missingHelmet, missingVest})

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

app.get('/api/dashboard', async (req, res) => {
  try {
    const selectedDate = req.query.date
    const reportRows = await getReports(selectedDate)
    const totalViolations = reportRows.length

    const categoryCounts = {
      'No Helmet': 0,
      'No Vest': 0,
      'Multiple PPE': 0
    }

    reportRows.forEach((report) => {
      const category = normalizeViolationType(report.type)

      if (categoryCounts[category] !== undefined) {
        categoryCounts[category] += 1
      }
    })

    const violationOverview = Object.entries(categoryCounts).map(([name, count]) => {
      const percentage =
        totalViolations > 0 ? ((count / totalViolations) * 100).toFixed(1) : '0.0'

      return {
        name,
        value: count,
        percentage: `${percentage}%`
      }
    })

    const mostFrequent = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]

    const [cameraRows] = await db.query(`
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
        totalViolations,
        totalGrowth: 'Realtime',
        mostFrequentViolation: mostFrequent ? mostFrequent[0] : '-',
        topViolationShare:
          totalViolations > 0 && mostFrequent
            ? `${((mostFrequent[1] / totalViolations) * 100).toFixed(1)}%`
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

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
