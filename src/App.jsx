import { useState, useEffect } from 'react'
import Login from './Login'
import Dashboard from './Dashboard'
import AdminDashboard from './AdminDashboard'

function App() {
  const [route, setRoute] = useState(window.location.pathname)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const onPopState = () => setRoute(window.location.pathname)
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  useEffect(() => {
    setLoading(true)
    const u = JSON.parse(localStorage.getItem('user') || 'null')
    setUser(u)
    setLoading(false)
  }, [route])

  if (loading) return <div style={{textAlign:'center',marginTop:60}}>Loading...</div>

  if (user && route === '/admin') {
    if (user.isAdmin) return <AdminDashboard />
    window.location.href = '/dashboard'
    return <div style={{textAlign:'center',marginTop:60}}>Redirecting...</div>
  }
  if (user && route === '/dashboard') return <Dashboard user={user} />
  if (!user) return <Login />
  // Default: if logged in, go to dashboard
  window.location.href = '/dashboard'
  return <div style={{textAlign:'center',marginTop:60}}>Redirecting...</div>
}

export default App
