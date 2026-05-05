import express from 'express'
import cors from 'cors'

const app = express()
const PORT = 5000

app.use(cors())
app.use(express.json())

const cameras = [
  { id: 'CAM-01', name: 'Camera 1', location: 'Main Gate', status: 'Active', preview: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1200&auto=format&fit=crop&q=60' },
  { id: 'CAM-02', name: 'Camera 2', location: 'Workshop Area', status: 'Active', preview: 'https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?w=1200&auto=format&fit=crop&q=60' },
  { id: 'CAM-03', name: 'Camera 3', location: 'Warehouse', status: 'Active', preview: 'https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?w=1200&auto=format&fit=crop&q=60' },
  { id: 'CAM-04', name: 'Camera 4', location: 'Parking Area', status: 'Inactive', preview: 'https://images.unsplash.com/photo-1489515217757-5fd1be406fef?w=1200&auto=format&fit=crop&q=60' },
  { id: 'CAM-05', name: 'Camera 5', location: 'Loading Bay', status: 'Warning', preview: 'https://images.unsplash.com/photo-1567789884554-0b844b597180?w=1200&auto=format&fit=crop&q=60' },
  { id: 'CAM-06', name: 'Camera 6', location: 'Assembly Line', status: 'Active', preview: 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=1200&auto=format&fit=crop&q=60' }
]

const reports = [
  { id: 'RPT-2025-0518-1248', area: 'Main Gate', cameraId: 'CAM-01', type: 'No Helmet', timestamp: 'May 18, 2025 10:24 AM', reportStatus: 'New', color: '#2563eb', image: 'https://images.unsplash.com/photo-1581093450021-4a7360e9a6b5?w=1000&auto=format&fit=crop&q=60' },
  { id: 'RPT-2025-0518-1247', area: 'Workshop Area', cameraId: 'CAM-02', type: 'Triple Riding', timestamp: 'May 18, 2025 10:15 AM', reportStatus: 'In Review', color: '#ef4444', image: 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=1000&auto=format&fit=crop&q=60' },
  { id: 'RPT-2025-0518-1246', area: 'Warehouse', cameraId: 'CAM-03', type: 'No License', timestamp: 'May 18, 2025 10:07 AM', reportStatus: 'Resolved', color: '#f59e0b', image: 'https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?w=1000&auto=format&fit=crop&q=60' },
  { id: 'RPT-2025-0518-1245', area: 'Parking Area', cameraId: 'CAM-04', type: 'Red Light Jump', timestamp: 'May 18, 2025 09:58 AM', reportStatus: 'New', color: '#10b981', image: 'https://images.unsplash.com/photo-1489515217757-5fd1be406fef?w=1000&auto=format&fit=crop&q=60' },
  { id: 'RPT-2025-0518-1244', area: 'Loading Bay', cameraId: 'CAM-05', type: 'No Helmet', timestamp: 'May 18, 2025 09:42 AM', reportStatus: 'In Review', color: '#2563eb', image: 'https://images.unsplash.com/photo-1567789884554-0b844b597180?w=1000&auto=format&fit=crop&q=60' }
]

const dashboardData = {
  stats: {
    totalViolations: 1248,
    totalGrowth: '12.5%',
    mostFrequentViolation: 'No Helmet',
    topViolationShare: '35.4%',
    monitoringCoverage: '92.6%',
    coverageGrowth: '3.2%',
    complianceRate: '86.7%',
    complianceGrowth: '4.8%'
  },
  dailyViolations: [
    { date: 'May 12', value: 120 },
    { date: 'May 13', value: 182 },
    { date: 'May 14', value: 210 },
    { date: 'May 15', value: 298 },
    { date: 'May 16', value: 245 },
    { date: 'May 17', value: 310 },
    { date: 'May 18', value: 283 }
  ],
  violationOverview: [
    { name: 'No Helmet', value: 35.4, percentage: '35.4%' },
    { name: 'Triple Riding', value: 24.7, percentage: '24.7%' },
    { name: 'No License', value: 17.8, percentage: '17.8%' },
    { name: 'Red Light Jump', value: 12.1, percentage: '12.1%' },
    { name: 'Others', value: 10.0, percentage: '10.0%' }
  ],
  activeCameras: cameras,
  recentReports: reports
}

function normalizeViolationType(type = '') {
  const lower = type.toLowerCase()

  if (lower.includes('all ppe')) return 'Multiple PPE'
  if (lower.includes('helmet')) return 'No Helmet'
  if (lower.includes('vest')) return 'No Vest'
  if (lower.includes('shoes')) return 'No Safety Shoes'
  if (lower.includes('gloves')) return 'No Gloves'

  return 'Others'
}

app.get('/api/health', (req, res) => res.json({ status: 'ok' }))
app.get('/api/dashboard', (req, res) => {
  const totalViolations = reports.length

  const categoryCounts = {
    'No Helmet': 0,
    'No Vest': 0,
    'No Safety Shoes': 0,
    'No Gloves': 0,
    'Multiple PPE': 0
  }

  reports.forEach((report) => {
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

  const dynamicDashboard = {
    stats: {
      totalViolations,
      totalGrowth: 'Realtime',
      mostFrequentViolation: mostFrequent ? mostFrequent[0] : '-',
      topViolationShare:
        totalViolations > 0
          ? `${((mostFrequent[1] / totalViolations) * 100).toFixed(1)}%`
          : '0%',
      monitoringCoverage: '100%',
      coverageGrowth: 'Live',
      complianceRate: totalViolations > 0 ? 'Need Review' : '100%',
      complianceGrowth: 'Realtime'
    },

    dailyViolations: [
      { date: 'Today', value: totalViolations }
    ],

    violationOverview,

    activeCameras: cameras,

    recentReports: reports.slice(0, 5)
  }

  res.json(dynamicDashboard)
})
app.get('/api/cameras', (req, res) => res.json(cameras))
app.get('/api/cameras/:id', (req, res) => {
  const item = cameras.find((cam) => cam.id === req.params.id)
  if (!item) return res.status(404).json({ message: 'Camera not found' })
  res.json(item)
})
app.get('/api/reports', (req, res) => res.json(reports))
app.post('/api/reports', (req, res) => {
  const { area, cameraId, type, timestamp, reportStatus, image } = req.body

  const newReport = {
    id: `RPT-${Date.now()}`,
    area: area || 'Unknown Area',
    cameraId: cameraId || 'Unknown Camera',
    type: type || 'Unknown Violation',
    timestamp: timestamp || new Date().toLocaleString(),
    reportStatus: reportStatus || 'New',
    color: '#ef4444',
    image:
      image ||
      'https://placehold.co/1000x600/eaf2ff/2563eb?text=Violation+Evidence'
  }

  reports.unshift(newReport)

  res.status(201).json({
    message: 'Report berhasil ditambahkan',
    data: newReport
  })
})
app.get('/api/reports/:id', (req, res) => {
  const item = reports.find((report) => report.id === req.params.id)
  if (!item) return res.status(404).json({ message: 'Report not found' })
  res.json(item)
})

app.get('/', (req, res) => {
  res.send('Smart K3 Vision Backend is running')
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
