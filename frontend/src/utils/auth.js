export const USERS = [
  {
    email: 'supervisor@epson.co.id',
    username: 'supervisor',
    password: 'supervisor123',
    role: 'supervisor',
    name: 'Wahyu Hidayat'
  },
  {
    email: 'manager@epson.co.id',
    username: 'manager',
    password: 'manager123',
    role: 'general_manager',
    name: 'Budi Santoso'
  }
]

export function login(identifier, password) {
  const user = USERS.find(
    (item) =>
      (item.email === identifier || item.username === identifier) &&
      item.password === password
  )

  if (!user) return null

  localStorage.setItem('smart_k3_user', JSON.stringify(user))
  return user
}

export function getCurrentUser() {
  const user = localStorage.getItem('smart_k3_user')
  return user ? JSON.parse(user) : null
}

export function logout() {
  localStorage.removeItem('smart_k3_user')
}