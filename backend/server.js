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
      COALESCE(validation_status, 'pending') AS validationStatus,
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
        COALESCE(validation_status, 'pending') AS validationStatus,
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
      validationStatus: row.validationStatus
    }))

    res.json(reports)
  } catch (error) {
    console.error('Gagal mengambil laporan yang belum divalidasi:', error)
    res.status(500).json({ message: 'Gagal mengambil data' })
  }
})

app.put('/api/reports/:id/validate', async (req, res) => {
  try {
    const { validationStatus, validatedBy } = req.body
    const reportId = req.params.id

    if (!['valid', 'invalid'].includes(validationStatus)) {
      return res.status(400).json({ message: 'Status validasi tidak valid' })
    }

    await db.query(`
      UPDATE reports
      SET validation_status = ?, validated_at = NOW(), validated_by = ?
      WHERE id = ?
    `, [validationStatus, validatedBy || null, reportId])

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

    const userId = `USR-${Date.now()}`
    await db.query(
      'INSERT INTO users (id, name, username, password, role, status, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())',
      [userId, name, username, password, 'admin', 'active']
    )

    res.json({ id: userId, name, username, role: 'admin', status: 'active', message: 'Admin berhasil dibuat' })
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

    const userId = `USR-${Date.now()}`
    await db.query(
      'INSERT INTO users (id, name, username, password, role, status, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())',
      [userId, name, username, password, role, 'active']
    )

    res.json({ id: userId, name, username, role, status: 'active' })
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

    const hasRtspUrl = rtsp_url && rtsp_url.trim() !== ''
    const status = hasRtspUrl ? 'Active' : 'Inactive'

    await db.query(
      'UPDATE cameras SET name = ?, location = ?, rtsp_url = ?, status = ? WHERE id = ?',
      [name, location, rtsp_url, status, id]
    )
    res.json({ message: 'Kamera berhasil diperbarui' })
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
      SELECT id, name, rtsp_url, location
      FROM cameras
      WHERE status = 'Active'
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

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
