import { useState, useEffect } from 'react'
import { X, Plus, Edit2, Trash2, Save } from 'lucide-react'
import { getCurrentUser } from '../utils/auth'
import { useNavigate } from 'react-router-dom'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

export default function AdminPage() {
  const navigate = useNavigate()
  const user = getCurrentUser()
  const [activeTab, setActiveTab] = useState('users')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  // User Management
  const [users, setUsers] = useState([])
  const [showUserModal, setShowUserModal] = useState(false)
  const [formUser, setFormUser] = useState({ name: '', username: '', password: '', role: 'supervisor' })

  // Camera Management
  const [cameras, setCameras] = useState([])
  const [showCameraModal, setShowCameraModal] = useState(false)
  const [formCamera, setFormCamera] = useState({ name: '', location: '', rtsp_url: '' })
  const [editingCamera, setEditingCamera] = useState(null)

  // Areas Management
  const [areas, setAreas] = useState([])
  const [showAreaModal, setShowAreaModal] = useState(false)
  const [formArea, setFormArea] = useState({ name: '' })
  const [editingArea, setEditingArea] = useState(null)

  // Rules Management
  const [rules, setRules] = useState([])
  const [showRulesModal, setShowRulesModal] = useState(false)
  const [formRules, setFormRules] = useState({
    camera_id: '',
    enforce_helmet: true,
    enforce_vest: true,
    enforce_gloves: false,
    enforce_shoes: true
  })
  const [editingRule, setEditingRule] = useState(null)

  // Check authorization - Only run once on mount
  useEffect(() => {
    if (user?.role !== 'admin') {
      navigate('/dashboard')
    }
  }, [user, navigate])

  // Fetch data based on active tab
  useEffect(() => {
    if (activeTab === 'users') fetchUsers()
    if (activeTab === 'cameras') fetchCameras()
    if (activeTab === 'areas') fetchAreas()
    if (activeTab === 'rules') fetchRules()
  }, [activeTab])

  // ==========================================
  // USER MANAGEMENT FUNCTIONS
  // ==========================================
  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_URL}/api/admin/users`)
      if (!response.ok) throw new Error('Gagal mengambil pengguna')
      const data = await response.json()
      setUsers(data)
    } catch (error) {
      showMessage('error', error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAddUser = async (e) => {
    e.preventDefault()
    if (!formUser.name || !formUser.username || !formUser.password) {
      showMessage('error', 'Semua field wajib diisi')
      return
    }

    try {
      setLoading(true)
      const response = await fetch(`${API_URL}/api/admin/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formUser)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message)
      }

      showMessage('success', 'Pengguna berhasil ditambahkan')
      setFormUser({ name: '', username: '', password: '', role: 'supervisor' })
      setShowUserModal(false)
      fetchUsers()
    } catch (error) {
      showMessage('error', error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Yakin ingin menghapus pengguna ini?')) return

    try {
      setLoading(true)
      const response = await fetch(`${API_URL}/api/admin/users/${userId}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Gagal menghapus pengguna')
      showMessage('success', 'Pengguna berhasil dihapus')
      fetchUsers()
    } catch (error) {
      showMessage('error', error.message)
    } finally {
      setLoading(false)
    }
  }

  // ==========================================
  // CAMERA MANAGEMENT FUNCTIONS
  // ==========================================
  const fetchCameras = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_URL}/api/admin/cameras`)
      if (!response.ok) throw new Error('Gagal mengambil kamera')
      const data = await response.json()
      setCameras(data)
    } catch (error) {
      showMessage('error', error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAddCamera = async (e) => {
    e.preventDefault()
    if (!formCamera.name || !formCamera.location) {
      showMessage('error', 'Nama dan lokasi wajib diisi')
      return
    }

    try {
      setLoading(true)
      const endpoint = editingCamera
        ? `${API_URL}/api/admin/cameras/${editingCamera.id}`
        : `${API_URL}/api/admin/cameras`
      const method = editingCamera ? 'PUT' : 'POST'

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formCamera)
      })

      if (!response.ok) throw new Error('Gagal menyimpan kamera')
      showMessage('success', 'Kamera berhasil disimpan')
      setFormCamera({ name: '', location: '', rtsp_url: '' })
      setEditingCamera(null)
      setShowCameraModal(false)
      fetchCameras()
    } catch (error) {
      showMessage('error', error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleEditCamera = (camera) => {
    setFormCamera(camera)
    setEditingCamera(camera)
    setShowCameraModal(true)
  }

  const handleDeleteCamera = async (cameraId) => {
    if (!window.confirm('Yakin ingin menghapus kamera ini?')) return

    try {
      setLoading(true)
      const response = await fetch(`${API_URL}/api/admin/cameras/${cameraId}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Gagal menghapus kamera')
      showMessage('success', 'Kamera berhasil dihapus')
      fetchCameras()
    } catch (error) {
      showMessage('error', error.message)
    } finally {
      setLoading(false)
    }
  }

  // ==========================================
  // AREA MANAGEMENT FUNCTIONS
  // ==========================================
  const fetchAreas = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_URL}/api/admin/areas`)
      if (!response.ok) throw new Error('Gagal mengambil area')
      const data = await response.json()
      setAreas(data)
    } catch (error) {
      showMessage('error', error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAddArea = async (e) => {
    e.preventDefault()
    if (!formArea.name) {
      showMessage('error', 'Nama area wajib diisi')
      return
    }

    try {
      setLoading(true)
      const endpoint = editingArea
        ? `${API_URL}/api/admin/areas/${editingArea.id}`
        : `${API_URL}/api/admin/areas`
      const method = editingArea ? 'PUT' : 'POST'

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formArea)
      })

      if (!response.ok) throw new Error('Gagal menyimpan area')
      showMessage('success', 'Area berhasil disimpan')
      setFormArea({ name: '' })
      setEditingArea(null)
      setShowAreaModal(false)
      fetchAreas()
    } catch (error) {
      showMessage('error', error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleEditArea = (area) => {
    setFormArea({ name: area.name })
    setEditingArea(area)
    setShowAreaModal(true)
  }

  const handleDeleteArea = async (areaId) => {
    if (!window.confirm('Yakin ingin menghapus area ini?')) return

    try {
      setLoading(true)
      const response = await fetch(`${API_URL}/api/admin/areas/${areaId}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Gagal menghapus area')
      showMessage('success', 'Area berhasil dihapus')
      fetchAreas()
    } catch (error) {
      showMessage('error', error.message)
    } finally {
      setLoading(false)
    }
  }

  // ==========================================
  // RULES MANAGEMENT FUNCTIONS
  // ==========================================
  const fetchRules = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_URL}/api/admin/rules`)
      if (!response.ok) throw new Error('Gagal mengambil rules')
      const data = await response.json()
      setRules(data)
    } catch (error) {
      showMessage('error', error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAddRule = async (e) => {
    e.preventDefault()
    if (!formRules.camera_id) {
      showMessage('error', 'Pilih kamera terlebih dahulu')
      return
    }

    try {
      setLoading(true)
      const endpoint = editingRule
        ? `${API_URL}/api/admin/rules/${editingRule.id}`
        : `${API_URL}/api/admin/rules`
      const method = editingRule ? 'PUT' : 'POST'

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formRules)
      })

      if (!response.ok) throw new Error('Gagal menyimpan rule')
      showMessage('success', 'Rule berhasil disimpan')
      setFormRules({
        camera_id: '',
        enforce_helmet: true,
        enforce_vest: true,
        enforce_gloves: false,
        enforce_shoes: true
      })
      setEditingRule(null)
      setShowRulesModal(false)
      fetchRules()
    } catch (error) {
      showMessage('error', error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleEditRule = (rule) => {
    setFormRules({
      camera_id: rule.camera_id,
      enforce_helmet: Boolean(rule.enforce_helmet),
      enforce_vest: Boolean(rule.enforce_vest),
      enforce_gloves: Boolean(rule.enforce_gloves),
      enforce_shoes: Boolean(rule.enforce_shoes)
    })
    setEditingRule(rule)
    setShowRulesModal(true)
  }

  // ==========================================
  // UTILITY FUNCTIONS
  // ==========================================
  const showMessage = (type, text) => {
    setMessage({ type, text })
    setTimeout(() => setMessage({ type: '', text: '' }), 3000)
  }

  const closeModals = () => {
    setShowUserModal(false)
    setShowCameraModal(false)
    setShowAreaModal(false)
    setShowRulesModal(false)
    setEditingCamera(null)
    setEditingArea(null)
    setEditingRule(null)
    setFormUser({ name: '', username: '', password: '', role: 'supervisor' })
    setFormCamera({ name: '', location: '', rtsp_url: '' })
    setFormArea({ name: '' })
    setFormRules({
      camera_id: '',
      enforce_helmet: true,
      enforce_vest: true,
      enforce_gloves: false,
      enforce_shoes: true
    })
  }

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <h1>Admin Panel</h1>
        <p>Kelola pengguna, kamera, area, dan aturan AI</p>
      </div>

      {message.text && (
        <div className={`message-banner message-${message.type}`}>
          {message.text}
        </div>
      )}

      {/* Tab Navigation - Admin only sees settings, not dashboard/reports */}
      <div className="admin-tabs">
        <button
          className={`tab-button ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          Pengguna
        </button>
        <button
          className={`tab-button ${activeTab === 'cameras' ? 'active' : ''}`}
          onClick={() => setActiveTab('cameras')}
        >
          Kamera
        </button>
        <button
          className={`tab-button ${activeTab === 'areas' ? 'active' : ''}`}
          onClick={() => setActiveTab('areas')}
        >
          Area
        </button>
        <button
          className={`tab-button ${activeTab === 'rules' ? 'active' : ''}`}
          onClick={() => setActiveTab('rules')}
        >
          Aturan AI
        </button>
      </div>

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="admin-section">
          <div className="section-header">
            <h2>Manajemen Pengguna</h2>
            <button
              className="btn-primary"
              onClick={() => setShowUserModal(true)}
              disabled={loading}
            >
              <Plus size={18} /> Tambah Pengguna
            </button>
          </div>

          {loading ? (
            <p className="loading-text">Memuat...</p>
          ) : users.length === 0 ? (
            <p className="empty-text">Tidak ada pengguna</p>
          ) : (
            <div className="table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Nama</th>
                    <th>Username</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.id}>
                      <td>{user.name}</td>
                      <td>{user.username}</td>
                      <td>
                        <span className="badge badge-info">{user.role}</span>
                      </td>
                      <td>
                        <span className={`badge badge-${user.status === 'active' ? 'success' : 'danger'}`}>
                          {user.status}
                        </span>
                      </td>
                      <td>
                        <button
                          className="btn-danger btn-sm"
                          onClick={() => handleDeleteUser(user.id)}
                          disabled={loading}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Cameras Tab */}
      {activeTab === 'cameras' && (
        <div className="admin-section">
          <div className="section-header">
            <h2>Manajemen Kamera</h2>
            <button
              className="btn-primary"
              onClick={() => {
                setEditingCamera(null)
                setFormCamera({ name: '', location: '', rtsp_url: '' })
                setShowCameraModal(true)
              }}
              disabled={loading}
            >
              <Plus size={18} /> Tambah Kamera
            </button>
          </div>

          {loading ? (
            <p className="loading-text">Memuat...</p>
          ) : cameras.length === 0 ? (
            <p className="empty-text">Tidak ada kamera</p>
          ) : (
            <div className="table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Nama</th>
                    <th>Lokasi</th>
                    <th>RTSP URL</th>
                    <th>Status</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {cameras.map(camera => (
                    <tr key={camera.id}>
                      <td>{camera.name}</td>
                      <td>{camera.location}</td>
                      <td className="rtsp-url-cell">
                        {camera.rtsp_url ? (
                          camera.rtsp_url === '0' ? (
                            <span className="badge badge-info">Webcam Laptop</span>
                          ) : (
                            <code>{camera.rtsp_url.substring(0, 40)}{camera.rtsp_url.length > 40 ? '...' : ''}</code>
                          )
                        ) : (
                          <span className="text-muted">-</span>
                        )}
                      </td>
                      <td>
                        <span className={`badge badge-${camera.status === 'Active' ? 'success' : 'danger'}`}>
                          {camera.status}
                        </span>
                      </td>
                      <td>
                        <button
                          className="btn-secondary btn-sm"
                          onClick={() => handleEditCamera(camera)}
                          disabled={loading}
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          className="btn-danger btn-sm"
                          onClick={() => handleDeleteCamera(camera.id)}
                          disabled={loading}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Areas Tab */}
      {activeTab === 'areas' && (
        <div className="admin-section">
          <div className="section-header">
            <h2>Manajemen Area</h2>
            <button
              className="btn-primary"
              onClick={() => {
                setEditingArea(null)
                setFormArea({ name: '' })
                setShowAreaModal(true)
              }}
              disabled={loading}
            >
              <Plus size={18} /> Tambah Area
            </button>
          </div>

          {loading ? (
            <p className="loading-text">Memuat...</p>
          ) : areas.length === 0 ? (
            <p className="empty-text">Tidak ada area</p>
          ) : (
            <div className="table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Nama Area</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {areas.map(area => (
                    <tr key={area.id}>
                      <td>{area.name}</td>
                      <td>
                        <button
                          className="btn-secondary btn-sm"
                          onClick={() => handleEditArea(area)}
                          disabled={loading}
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          className="btn-danger btn-sm"
                          onClick={() => handleDeleteArea(area.id)}
                          disabled={loading}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Rules Tab */}
      {activeTab === 'rules' && (
        <div className="admin-section">
          <div className="section-header">
            <h2>Manajemen AI Rules</h2>
            <button
              className="btn-primary"
              onClick={() => {
                setEditingRule(null)
                setFormRules({
                  camera_id: '',
                  enforce_helmet: true,
                  enforce_vest: true,
                  enforce_gloves: false,
                  enforce_shoes: true
                })
                setShowRulesModal(true)
              }}
              disabled={loading}
            >
              <Plus size={18} /> Tambah Rule
            </button>
          </div>

          {loading ? (
            <p className="loading-text">Memuat...</p>
          ) : rules.length === 0 ? (
            <p className="empty-text">Tidak ada rule</p>
          ) : (
            <div className="table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Kamera</th>
                    <th>Helm</th>
                    <th>Rompi</th>
                    <th>Sarung Tangan</th>
                    <th>Sepatu</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {rules.map(rule => {
                    const camera = cameras.find(cam => cam.id === rule.camera_id)
                    const cameraDisplay = camera ? `${camera.name} (${camera.id})` : rule.camera_id
                    return (
                      <tr key={rule.id}>
                        <td>{cameraDisplay}</td>
                        <td>
                          <span className={`badge badge-${rule.enforce_helmet ? 'success' : 'danger'}`}>
                            {rule.enforce_helmet ? 'Ya' : 'Tidak'}
                          </span>
                        </td>
                        <td>
                          <span className={`badge badge-${rule.enforce_vest ? 'success' : 'danger'}`}>
                            {rule.enforce_vest ? 'Ya' : 'Tidak'}
                          </span>
                        </td>
                        <td>
                          <span className={`badge badge-${rule.enforce_gloves ? 'success' : 'danger'}`}>
                            {rule.enforce_gloves ? 'Ya' : 'Tidak'}
                          </span>
                        </td>
                        <td>
                          <span className={`badge badge-${rule.enforce_shoes ? 'success' : 'danger'}`}>
                            {rule.enforce_shoes ? 'Ya' : 'Tidak'}
                          </span>
                        </td>
                        <td>
                          <button
                            className="btn-secondary btn-sm"
                            onClick={() => handleEditRule(rule)}
                            disabled={loading}
                          >
                            <Edit2 size={16} />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* User Modal */}
      {showUserModal && (
        <div className="modal-overlay" onClick={closeModals}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Tambah Pengguna Baru</h3>
              <button className="close-btn" onClick={closeModals}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddUser} className="modal-form">
              <div className="form-group">
                <label>Nama</label>
                <input
                  type="text"
                  placeholder="Masukkan nama pengguna"
                  value={formUser.name}
                  onChange={e => setFormUser({ ...formUser, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Username</label>
                <input
                  type="text"
                  placeholder="Masukkan username"
                  value={formUser.username}
                  onChange={e => setFormUser({ ...formUser, username: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  placeholder="Masukkan password"
                  value={formUser.password}
                  onChange={e => setFormUser({ ...formUser, password: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Role</label>
                <select
                  value={formUser.role}
                  onChange={e => setFormUser({ ...formUser, role: e.target.value })}
                >
                  <option value="admin">Admin</option>
                  <option value="supervisor">Supervisor</option>
                  <option value="general_manager">General Manager</option>
                </select>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={closeModals}>
                  Batal
                </button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  <Save size={18} /> Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Camera Modal */}
      {showCameraModal && (
        <div className="modal-overlay" onClick={closeModals}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingCamera ? 'Edit Kamera' : 'Tambah Kamera Baru'}</h3>
              <button className="close-btn" onClick={closeModals}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddCamera} className="modal-form">
              <div className="form-group">
                <label>Nama Kamera</label>
                <input
                  type="text"
                  placeholder="Masukkan nama kamera"
                  value={formCamera.name}
                  onChange={e => setFormCamera({ ...formCamera, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Lokasi/Area</label>
                <select
                  value={formCamera.location}
                  onChange={e => setFormCamera({ ...formCamera, location: e.target.value })}
                  required
                >
                  <option value="">-- Pilih Area --</option>
                  {areas.map(area => (
                    <option key={area.id} value={area.name}>
                      {area.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>RTSP URL atau Kamera Sumber</label>
                <input
                  type="text"
                  placeholder="rtsp://192.168.1.100:554/stream, 0 untuk webcam laptop, atau kosongkan"
                  value={formCamera.rtsp_url}
                  onChange={e => setFormCamera({ ...formCamera, rtsp_url: e.target.value })}
                />
                <small>Masukkan URL RTSP untuk CCTV, ketik '0' untuk webcam laptop, atau kosongkan untuk mode manual</small>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={closeModals}>
                  Batal
                </button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  <Save size={18} /> Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Area Modal */}
      {showAreaModal && (
        <div className="modal-overlay" onClick={closeModals}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingArea ? 'Edit Area' : 'Tambah Area Baru'}</h3>
              <button className="close-btn" onClick={closeModals}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddArea} className="modal-form">
              <div className="form-group">
                <label>Nama Area</label>
                <input
                  type="text"
                  placeholder="Masukkan nama area (contoh: Area Produksi A, Gudang, dll)"
                  value={formArea.name}
                  onChange={e => setFormArea({ ...formArea, name: e.target.value })}
                  required
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={closeModals}>
                  Batal
                </button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  <Save size={18} /> Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rules Modal */}
      {showRulesModal && (
        <div className="modal-overlay" onClick={closeModals}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingRule ? 'Edit AI Rule' : 'Tambah AI Rule Baru'}</h3>
              <button className="close-btn" onClick={closeModals}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddRule} className="modal-form">
              <div className="form-group">
                <label>Pilih Kamera</label>
                <select
                  value={formRules.camera_id}
                  onChange={e => setFormRules({ ...formRules, camera_id: e.target.value })}
                  required
                  disabled={editingRule !== null}
                >
                  <option value="">-- Pilih Kamera --</option>
                  {cameras.map(cam => (
                    <option key={cam.id} value={cam.id}>
                      {cam.name} ({cam.id})
                    </option>
                  ))}
                </select>
              </div>
              <div className="rules-checkboxes">
                <label className="checkbox-group">
                  <input
                    type="checkbox"
                    checked={formRules.enforce_helmet}
                    onChange={e => setFormRules({ ...formRules, enforce_helmet: e.target.checked })}
                  />
                  <span>Wajib Helm</span>
                </label>
                <label className="checkbox-group">
                  <input
                    type="checkbox"
                    checked={formRules.enforce_vest}
                    onChange={e => setFormRules({ ...formRules, enforce_vest: e.target.checked })}
                  />
                  <span>Wajib Rompi</span>
                </label>
                <label className="checkbox-group">
                  <input
                    type="checkbox"
                    checked={formRules.enforce_gloves}
                    onChange={e => setFormRules({ ...formRules, enforce_gloves: e.target.checked })}
                  />
                  <span>Wajib Sarung Tangan</span>
                </label>
                <label className="checkbox-group">
                  <input
                    type="checkbox"
                    checked={formRules.enforce_shoes}
                    onChange={e => setFormRules({ ...formRules, enforce_shoes: e.target.checked })}
                  />
                  <span>Wajib Sepatu</span>
                </label>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={closeModals}>
                  Batal
                </button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  <Save size={18} /> Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
