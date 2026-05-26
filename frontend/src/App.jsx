import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import LiveCameraPage from './pages/LiveCameraPage'
import CameraDetailPage from './pages/CameraDetailPage'
import ReportsPage from './pages/ReportsPage'
import ReportDetailPage from './pages/ReportDetailPage'
import AdminPage from './pages/AdminPage'

// 1. Komponen Pelindung (Route Guard)
const ProtectedRoute = ({ children }) => {
  // Mengecek apakah ada data user/token yang tersimpan di memori browser
  const user = localStorage.getItem('user')

  // Jika tidak ada data (berarti guest/belum login), paksa pindah ke halaman login
  if (!user) {
    return <Navigate to="/login" replace />
  }

  // Jika ada data (berarti sudah login), izinkan komponen Layout dan halamannya dirender
  return children
}

export default function App() {
  return (
    <Routes>
      {/* =========================================
          RUTE PUBLIK
      ========================================= */}
      <Route path="/login" element={<LoginPage />} />
      
      {/* =========================================
          RUTE PRIVAT (Dilindungi ProtectedRoute)
      ========================================= */}
      <Route 
        path="/" 
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        {/* Semua halaman anak di bawah Layout kini tidak bisa diakses tanpa login */}
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="live-camera" element={<LiveCameraPage />} />
        <Route path="live-camera/:cameraId" element={<CameraDetailPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="reports/:reportId" element={<ReportDetailPage />} />
        <Route path="admin" element={<AdminPage />} />
      </Route>
    </Routes>
  )
}