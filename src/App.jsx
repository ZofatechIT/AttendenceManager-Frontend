import { useState, useEffect } from 'react'
import Login from './Login'
import Dashboard from './Dashboard'
import AdminDashboard from './AdminDashboard'
import Home from './Home'
import CheckIn from './CheckIn'
import Reports from './Reports'
import Map from './Map'

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

  // Route handling
  if (route === '/') return <Home />
  if (route === '/login') return !user ? <Login /> : <Navigate to="/dashboard" />
  if (route === '/checkin') return user ? <CheckIn /> : <Navigate to="/login" />
  if (route === '/reports') return user ? <Reports /> : <Navigate to="/login" />
  if (route === '/map') return user && user.isAdmin ? <Map /> : <Navigate to="/dashboard" />
  if (route === '/admin') return user && user.isAdmin ? <AdminDashboard /> : <Navigate to="/dashboard" />
  if (route === '/dashboard') return user ? <Dashboard user={user} /> : <Navigate to="/login" />
  
  // Default: if logged in, go to dashboard; if not, go to home
  if (user) {
    window.location.href = '/dashboard'
    return <div style={{textAlign:'center',marginTop:60}}>Redirecting...</div>
  } else {
    window.location.href = '/'
    return <div style={{textAlign:'center',marginTop:60}}>Redirecting...</div>
  }
}

// Simple Navigate component
function Navigate({ to }) {
  useEffect(() => {
    window.location.href = to
  }, [to])
  return <div style={{textAlign:'center',marginTop:60}}>Redirecting...</div>
}

export default App
