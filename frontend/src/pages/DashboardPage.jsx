import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, CalendarDays, RefreshCcw, ShieldCheck, Siren, Video, AlertCircle } from 'lucide-react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'
import api from '../services/api'

const COLORS = ['#2563eb', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6']

export default function DashboardPage() {
  const [data, setData] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const reportsPerPage = 5
  const dateInputRef = useRef(null)

  const getTodayLocalDate = () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')

    return `${year}-${month}-${day}`
  }

  const [selectedDate, setSelectedDate] = useState(() => {
    return getTodayLocalDate()
  })

  const formattedDate = new Date(selectedDate).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  })

  const handlePageChange = (page) => {
    setCurrentPage(page)

    const section = document.getElementById('recent-reports')
    if (section) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const fetchDashboard = () => {
    api.get(`/dashboard?date=${selectedDate}`).then((res) => {
      setData(res.data)
    })
  }

  useEffect(() => {
    fetchDashboard()

    const interval = setInterval(fetchDashboard, 3000)

    return () => clearInterval(interval)
  }, [selectedDate])

  if (!data) return <div className="loading-box">Loading dashboard...</div>

  const totalReports = data.recentReports.length
  const totalPages = Math.ceil(totalReports / reportsPerPage)

  const startIndex = (currentPage - 1) * reportsPerPage
  const endIndex = startIndex + reportsPerPage

  const paginatedReports = data.recentReports.slice(startIndex, endIndex)
  const pendingReportsCount = data.recentReports.filter(r => r.validationStatus === 'pending').length
  
  const statCards = [
    {
      title: 'Total Violations',
      value: data.stats.totalViolations.toLocaleString(),
      note: `${data.stats.totalGrowth} from last week`,
      colorClass: 'soft-blue',
      icon: Siren
    },
    {
      title: 'Most Frequent Violation',
      value: data.stats.mostFrequentViolation,
      note: `${data.stats.topViolationShare} of total`,
      colorClass: 'soft-orange',
      icon: AlertTriangle
    },
    {
      title: 'Monitoring Coverage',
      value: data.stats.monitoringCoverage,
      note: `${data.stats.coverageGrowth} from last week`,
      colorClass: 'soft-green',
      icon: Video
    },
    {
      title: 'Compliance Rate',
      value: data.stats.complianceRate,
      note: `${data.stats.complianceGrowth} from last week`,
      colorClass: 'soft-purple',
      icon: ShieldCheck
    }
  ]

  return (
    <div>
      <div className="page-topbar">
        <div>
          <h1 className="page-title">Dashboard Monitoring K3</h1>
          <p className="page-subtitle">
            Sistem Monitoring K3 Smart-Factory Berbasis Computer Vision untuk Meningkatkan Standar
            Keselamatan dan Disiplin Kerja di PT. Indonesia Epson Industry
          </p>
        </div>
        <div className="toolbar-right">
          <div className="date-picker-wrapper">
            <button
              type="button"
              className="modern-date-btn"
              onClick={() => {
                if (dateInputRef.current?.showPicker) {
                  dateInputRef.current.showPicker()
                } else {
                  dateInputRef.current?.click()
                }
              }}
            >
              <CalendarDays size={18} />
              <span>{formattedDate}</span>
            </button>

            <input
              ref={dateInputRef}
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value)
                setCurrentPage(1)
              }}
              className="hidden-real-date-input"
            />
          </div>

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
              <AlertCircle size={16} style={{ color: '#dc2626', animation: 'pulse 2s infinite' }} />
              <span>{pendingReportsCount} pending reports</span>
            </div>
          )}

          <button
            type="button"
            className="modern-refresh-btn"
            onClick={() => {
              setCurrentPage(1)
              fetchDashboard()
            }}
          >
            <RefreshCcw size={18} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <div className="stats-grid">
        {statCards.map(({ title, value, note, colorClass, icon: Icon }) => (
          <div className="panel card" key={title}>
            <div className="stat-row">
              <div className={`stat-icon ${colorClass}`}><Icon size={24} /></div>
              <div>
                <div className="stat-title">{title}</div>
                <div className="stat-value">{value}</div>
                <div className="stat-note">↗ {note}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="dashboard-main-grid">
        <div className="panel card chart-panel wide-panel">
          <div className="panel-header">
            <h3>Daily Violations</h3>
            <button className="mini-btn">This Week</button>
          </div>
          <div className="chart-area">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.dailyViolations}>
                <defs>
                  <linearGradient id="fillBlue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.26} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#e8eef7" vertical={false} />
                <XAxis dataKey="date" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip />
                <Area dataKey="value" stroke="#2563eb" fill="url(#fillBlue)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="panel card chart-panel donut-panel">
          <div className="panel-header"><h3>Violation Types Overview</h3></div>
          <div className="donut-wrap">
            <div className="donut-chart-box">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.violationOverview}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={70}
                    outerRadius={110}
                    paddingAngle={2}
                  >
                    {data.violationOverview.map((entry, index) => (
                      <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="donut-center">
                <div className="center-value">1,248</div>
                <div className="center-label">Total</div>
              </div>
            </div>
            <div className="legend-list">
              {data.violationOverview.map((item, index) => (
                <div className="legend-item" key={item.name}>
                  <div className="legend-left">
                    <span className="legend-dot" style={{ background: COLORS[index % COLORS.length] }} />
                    <span>{item.name}</span>
                  </div>
                  <strong>{item.percentage}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="panel card camera-status-panel">
          <div className="panel-header"><h3>Active Cameras</h3></div>
          <div className="camera-status-list">
            {data.activeCameras.slice(0, 5).map((cam) => (
              <Link
                to={`/live-camera/${cam.id}`}
                className="camera-status-item"
                key={cam.id}
              >
                <div className="camera-status-left">
                  <div className="camera-icon-box">
                    <Video size={18} />
                  </div>
                  <div>
                    <div className="camera-code">{cam.id}</div>
                    <div className="camera-location">{cam.location}</div>
                  </div>
                </div>

                <span className={`status-pill ${cam.status.toLowerCase()}`}>
                  {cam.status === 'Active' ? '● Active' : '○ Inactive'}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div id="recent-reports" className="panel card reports-panel">
        <div className="panel-header table-head">
          <h3>Recent Reports</h3>
          <Link className="link-btn" to="/reports">
            View All Reports
          </Link>
        </div>
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
              {paginatedReports.map((report) => (
                <tr key={report.id}>
                  <td>{report.id}</td>
                  <td>{report.area}</td>
                  <td>{report.cameraId}</td>
                  <td>
                    <div className="type-cell">
                      <span className="legend-dot tiny" style={{ background: report.color }} />
                      {report.type}
                    </div>
                  </td>
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
              ))}
            </tbody>
          </table>
        </div>
        <div className="table-footer clean-pagination-footer only-pagination">
          <div className="clean-pagination">
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
        </div>
      </div>
    </div>
  )
}
