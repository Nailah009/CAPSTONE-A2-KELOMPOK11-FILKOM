export function getCurrentUser() {
  const user = localStorage.getItem('smart_k3_user')
  return user ? JSON.parse(user) : null
}

export function logout() {
  localStorage.removeItem('smart_k3_user')
}