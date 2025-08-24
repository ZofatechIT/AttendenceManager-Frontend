import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';

export default function Home() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [liveStats, setLiveStats] = useState({
    activeGuards: 0,
    totalPosts: 0,
    incidentsToday: 0,
    checkInsToday: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [isLoadingLiveData, setIsLoadingLiveData] = useState(false);
  const [isUsingLiveData, setIsUsingLiveData] = useState(false);
  const [lastDataUpdate, setLastDataUpdate] = useState(null);
  const [showAllActivities, setShowAllActivities] = useState(false);
  const [activitiesToShow, setActivitiesToShow] = useState(3);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    
    // Check if user is already logged in
    const checkExistingSession = async () => {
      const userData = localStorage.getItem('user');
      const token = localStorage.getItem('token');
      const refreshToken = localStorage.getItem('refreshToken');
      
      if (userData && token) {
        // User has token, check if it's still valid
        try {
          const response = await fetch('https://attendencemanager-backend.onrender.com/api/live/status', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          if (response.ok) {
            // Token is valid, user is logged in
            setIsLoggedIn(true);
            setUser(JSON.parse(userData));
            console.log('✅ Home: Existing session is valid');
          } else if (response.status === 401 && refreshToken) {
            // Token expired, try to refresh
            console.log('🔄 Home: Token expired, attempting to refresh...');
            const refreshed = await refreshUserToken();
            if (refreshed) {
              setIsLoggedIn(true);
              setUser(JSON.parse(userData));
              console.log('✅ Home: Session refreshed successfully');
            } else {
              // Refresh failed, clear session
              localStorage.removeItem('token');
              localStorage.removeItem('refreshToken');
              localStorage.removeItem('user');
              setIsLoggedIn(false);
              setUser(null);
              console.log('❌ Home: Session refresh failed, cleared session');
            }
          } else {
            // No valid session
            setIsLoggedIn(false);
            setUser(null);
            console.log('❌ Home: No valid session found');
          }
        } catch (error) {
          console.error('❌ Home: Error checking session:', error);
          setIsLoggedIn(false);
          setUser(null);
        }
      } else {
        setIsLoggedIn(false);
        setUser(null);
      }
    };
    
    checkExistingSession();
    
    // Request notification permission for live updates
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
    
    // Load live data
    loadLiveData();
    loadRecentActivity();
    
    // Update live data every 30 seconds
    const dataTimer = setInterval(loadLiveData, 30000);
    const activityTimer = setInterval(loadRecentActivity, 15000);
    
    return () => {
      clearInterval(timer);
      clearInterval(dataTimer);
      clearInterval(activityTimer);
    };
  }, []);

  const loadLiveData = async () => {
    try {
      const currentToken = localStorage.getItem('token');
      if (!currentToken) {
        console.log('❌ Home: No token found, trying to restore session...');
        await restoreUserSession();
        return;
      }

      const response = await fetch('https://attendencemanager-backend.onrender.com/api/live/status', {
        headers: {
          'Authorization': `Bearer ${currentToken}`,
        },
      });

      if (response.status === 401) {
        console.log('🔄 Home: Token expired, refreshing...');
        await refreshUserToken();
        return;
      }

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Home: Live data loaded:', data);
        
        setLiveStats({
          activeGuards: data.liveData.activeGuards,
          totalPosts: data.liveData.totalPosts,
          incidentsToday: data.liveData.incidentsToday,
          checkInsToday: data.liveData.checkInsToday,
          lastUpdate: new Date(data.liveData.lastUpdate)
        });
        
        setRecentActivity(data.recentActivity || []);
        setIsUsingLiveData(true);
        setLastDataUpdate(new Date());
        setIsLoadingLiveData(false);
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Home: Error loading live data:', error);
      setIsLoadingLiveData(false);
      setIsUsingLiveData(false);
      
      // No more mock data - only use real data from backend
      console.log('⚠️ Home: No real data available from backend');
      setLiveStats({
        activeGuards: 0,
        totalPosts: 0,
        incidentsToday: 0,
        checkInsToday: 0,
        lastUpdate: new Date()
      });
      
      setRecentActivity([]);
    }
  };

  const loadRecentActivity = () => {
    // This is now handled by loadLiveData
    // Keeping for backward compatibility
  };

  // Remove loadMockData function - no longer needed
  // We now only use real data from backend API

  const toggleActivitiesView = () => {
    if (showAllActivities) {
      setShowAllActivities(false);
      setActivitiesToShow(3);
    } else {
      setShowAllActivities(true);
      setActivitiesToShow(recentActivity.length);
    }
  };

  const getActivityIcon = (type) => {
    if (type === 'checkin') {
      return '✓';
    } else if (type === 'incident') {
      return '⚠';
    }
    return '•';
  };

  // Session management functions
  const restoreUserSession = async () => {
    try {
      const userData = localStorage.getItem('user');
      if (!userData) return false;
      
      const user = JSON.parse(userData);
      const refreshToken = localStorage.getItem('refreshToken');
      
      if (!refreshToken) return false;
      
      console.log('🔄 Home: Attempting to restore session with refresh token...');
      const response = await fetch('https://attendencemanager-backend.onrender.com/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });
      
      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('token', data.token);
        localStorage.setItem('refreshToken', data.refreshToken);
        console.log('✅ Home: Session restored successfully');
        return true;
      } else {
        console.log('❌ Home: Failed to restore session');
        return false;
      }
    } catch (error) {
      console.error('❌ Home: Error restoring session:', error);
      return false;
    }
  };

  const refreshUserToken = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) return false;
      
      console.log('🔄 Home: Refreshing user token...');
      const response = await fetch('https://attendencemanager-backend.onrender.com/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });
      
      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('token', data.token);
        localStorage.setItem('refreshToken', data.refreshToken);
        console.log('✅ Home: Token refreshed successfully');
        return true;
      } else {
        console.log('❌ Home: Failed to refresh token');
        // Clear invalid tokens
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        return false;
      }
    } catch (error) {
      console.error('❌ Home: Error refreshing token:', error);
      return false;
    }
  };

  const handleGetStarted = () => {
    if (isLoggedIn) {
      window.location.href = '/dashboard';
    } else {
      window.location.href = '/login';
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsLoggedIn(false);
    setUser(null);
    Swal.fire('Logged Out', 'You have been successfully logged out', 'success');
  };

  const formatTimeAgo = (date) => {
    const now = new Date();
    const diffMs = now - date;
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes} min ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  const features = [
    {
      icon: '🕐',
      title: 'Real-time Attendance',
      description: 'Clock in/out with GPS location tracking and real-time updates'
    },
    {
      icon: '📱',
      title: 'Mobile Friendly',
      description: 'Works seamlessly on all devices with responsive design'
    },
    {
      icon: '📍',
      title: 'Location Tracking',
      description: 'Monitor guard positions and movement patterns'
    },
    {
      icon: '📊',
      title: 'Smart Reports',
      description: 'Generate detailed reports and analytics'
    },
    {
      icon: '🔒',
      title: 'Secure Access',
      description: 'Role-based access control and authentication'
    },
    {
      icon: '📈',
      title: 'Performance Analytics',
      description: 'Track productivity and attendance patterns'
    }
  ];

  return (
    <div className="home-container">
      {/* Header */}
      <header className="home-header">
        <div className="header-content">
          <div className="logo">
            <span className="logo-icon">🛡️</span>
            <h1>GuardTrack Pro</h1>
          </div>
          <div className="header-actions">
            {isLoggedIn ? (
              <div className="user-info">
                <span className="user-name">Welcome, {user?.name || 'User'}</span>
                <button className="btn-secondary" onClick={() => window.location.href = '/dashboard'}>
                  Dashboard
                </button>
                <button className="btn-logout" onClick={handleLogout}>
                  Logout
                </button>
              </div>
            ) : (
              <div className="auth-buttons">
                <button className="btn-secondary" onClick={() => window.location.href = '/login'}>
                  Login
                </button>
                <button className="btn-primary" onClick={() => window.location.href = '/login'}>
                  Get Started
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-text">
            <h1 className="hero-title">
              Professional <span className="highlight">Guard Management</span> System
            </h1>
            <p className="hero-description">
              Streamline your security operations with real-time attendance tracking, 
              location monitoring, and comprehensive reporting. Manage your guards 
              efficiently from anywhere, anytime.
            </p>
            <div className="hero-actions">
              <button className="btn-primary btn-large" onClick={handleGetStarted}>
                {isLoggedIn ? 'Go to Dashboard' : 'Get Started Free'}
              </button>
              <button className="btn-outline btn-large" onClick={() => window.location.href = '/login'}>
                Learn More
              </button>
            </div>
          </div>
          <div className="hero-visual">
            <div className="floating-card">
              <div className="card-header">
                <span className="status-dot active"></span>
                <span>Live Status</span>
              </div>
              <div className="card-time">
                {currentTime.toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit', 
                  second: '2-digit' 
                })}
              </div>
              <div className="card-date">
                {currentTime.toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </div>
              <div className="live-indicator">
                <span className="pulse-dot"></span>
                Live Data
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Live Stats Section */}
      <section className="live-stats-section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Live Security Dashboard</h2>
            <div className="live-data-controls">
              <div className="live-indicator">
                <span className={`live-dot ${!isUsingLiveData ? 'offline' : ''}`}></span>
                <span className={`live-text ${!isUsingLiveData ? 'offline' : ''}`}>
                  {isUsingLiveData ? 'Live' : 'Offline'}
                </span>
                {isLoadingLiveData && <span className="refreshing-indicator">🔄</span>}
                <button 
                  className="refresh-btn" 
                  onClick={loadLiveData}
                  disabled={isLoadingLiveData}
                  title="Refresh live data"
                >
                  🔄
                </button>
              </div>
            </div>
          </div>
          <div className="live-stats-grid">
            <div className="live-stat-card">
              <div className="stat-icon">👥</div>
              <div className="stat-content">
                <div className="stat-number">
                  {isLoadingLiveData ? (
                    <span className="loading-dots">...</span>
                  ) : (
                    liveStats.activeGuards
                  )}
                </div>
                <div className="stat-label">Active Guards</div>
                <div className="stat-status active">On Duty</div>
              </div>
            </div>
            <div className="live-stat-card">
              <div className="stat-icon">📍</div>
              <div className="stat-content">
                <div className="stat-number">
                  {isLoadingLiveData ? (
                    <span className="loading-dots">...</span>
                  ) : (
                    liveStats.totalPosts
                  )}
                </div>
                <div className="stat-label">Security Posts</div>
                <div className="stat-status">Covered</div>
              </div>
            </div>
            <div className="live-stat-card">
              <div className="stat-icon">⚠️</div>
              <div className="stat-content">
                <div className="stat-number">
                  {isLoadingLiveData ? (
                    <span className="loading-dots">...</span>
                  ) : (
                    liveStats.incidentsToday
                  )}
                </div>
                <div className="stat-label">Incidents Today</div>
                <div className="stat-status warning">Monitoring</div>
              </div>
            </div>
            <div className="live-stat-card">
              <div className="stat-icon">✅</div>
              <div className="stat-content">
                <div className="stat-number">
                  {isLoadingLiveData ? (
                    <span className="loading-dots">...</span>
                  ) : (
                    liveStats.checkInsToday
                  )}
                </div>
                <div className="stat-label">Check-ins Today</div>
                <div className="stat-status success">Active</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Recent Activity Section */}
      <section className="activity-section">
        <div className="container">
          <h2 className="section-title">Recent Activity</h2>
          <div className="activity-grid">
            <div className="activity-card">
              <h3>Live Updates</h3>
              <div className="activity-list">
                {recentActivity.slice(0, activitiesToShow).map((activity) => (
                  <div key={activity.id} className="activity-item">
                    <div className="activity-icon">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="activity-details">
                      <div className="activity-text">
                        <strong>{activity.guard}</strong> {activity.type === 'checkin' ? 'checked in at' : 'reported incident at'} <strong>{activity.post}</strong>
                      </div>
                      <div className="activity-time">
                        {formatTimeAgo(activity.time)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {recentActivity.length > 3 && (
                <div className="activity-actions">
                  <button 
                    className="btn-show-more" 
                    onClick={toggleActivitiesView}
                  >
                    {showAllActivities ? 'Show Less' : `Show More (${recentActivity.length - 3})`}
                  </button>
                </div>
              )}
              <div className="activity-footer">
                <span className="live-indicator-small">
                  <span className="pulse-dot-small"></span>
                  Live Updates
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="container">
          <h2 className="section-title">Why Choose GuardTrack Pro?</h2>
          <div className="features-grid">
            {features.map((feature, index) => (
              <div key={index} className="feature-card">
                <div className="feature-icon">{feature.icon}</div>
                <h3 className="feature-title">{feature.title}</h3>
                <p className="feature-description">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats-section">
        <div className="container">
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-number">24/7</div>
              <div className="stat-label">Monitoring</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">99.9%</div>
              <div className="stat-label">Uptime</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">Real-time</div>
              <div className="stat-label">Updates</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">Secure</div>
              <div className="stat-label">Data</div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="home-footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-section">
              <h3>GuardTrack Pro</h3>
              <p>Professional guard management made simple and efficient.</p>
            </div>
            <div className="footer-section">
              <h4>Quick Links</h4>
              <ul>
                <li><button onClick={() => window.location.href = '/dashboard'}>Dashboard</button></li>
                <li><button onClick={() => window.location.href = '/login'}>Login</button></li>
                <li><button onClick={() => window.location.href = '/reports'}>Reports</button></li>
              </ul>
            </div>
            <div className="footer-section">
              <h4>Contact</h4>
              <p>support@guardtrackpro.com</p>
              <p>+1 (555) 123-4567</p>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; 2024 GuardTrack Pro. All rights reserved.</p>
          </div>
        </div>
      </footer>

      <style jsx>{`
        .home-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }

        .home-header {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.2);
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 1000;
        }

        .header-content {
          max-width: 1200px;
          margin: 0 auto;
          padding: 1rem 2rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .logo-icon {
          font-size: 2rem;
        }

        .logo h1 {
          margin: 0;
          font-size: 1.5rem;
          font-weight: 700;
        }

        .header-actions {
          display: flex;
          gap: 1rem;
          align-items: center;
        }

        .user-info {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .user-name {
          font-weight: 500;
        }

        .btn-primary, .btn-secondary, .btn-outline, .btn-logout {
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          text-decoration: none;
          display: inline-block;
        }

        .btn-primary {
          background: #4f46e5;
          color: white;
        }

        .btn-primary:hover {
          background: #4338ca;
          transform: translateY(-2px);
        }

        .btn-secondary {
          background: rgba(255, 255, 255, 0.2);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.3);
        }

        .btn-secondary:hover {
          background: rgba(255, 255, 255, 0.3);
        }

        .btn-outline {
          background: transparent;
          color: white;
          border: 2px solid white;
        }

        .btn-outline:hover {
          background: white;
          color: #4f46e5;
        }

        .btn-logout {
          background: #ef4444;
          color: white;
        }

        .btn-logout:hover {
          background: #dc2626;
        }

        .btn-large {
          padding: 1rem 2rem;
          font-size: 1.1rem;
        }

        .hero-section {
          padding: 8rem 2rem 4rem;
          min-height: 100vh;
          display: flex;
          align-items: center;
        }

        .hero-content {
          max-width: 1200px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4rem;
          align-items: center;
        }

        .hero-title {
          font-size: 3.5rem;
          font-weight: 800;
          line-height: 1.2;
          margin-bottom: 1.5rem;
        }

        .highlight {
          background: linear-gradient(45deg, #fbbf24, #f59e0b);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .hero-description {
          font-size: 1.25rem;
          line-height: 1.6;
          margin-bottom: 2rem;
          opacity: 0.9;
        }

        .hero-actions {
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .hero-visual {
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .floating-card {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 20px;
          padding: 2rem;
          text-align: center;
          box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
          animation: float 6s ease-in-out infinite;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }

        .card-header {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          margin-bottom: 1rem;
          font-size: 0.9rem;
          opacity: 0.8;
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #10b981;
        }

        .status-dot.active {
          background: #10b981;
          box-shadow: 0 0 10px #10b981;
        }

        .card-time {
          font-size: 2.5rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
        }

        .card-date {
          font-size: 1rem;
          opacity: 0.8;
        }

        .live-indicator {
          margin-top: 1.5rem;
          font-size: 0.9rem;
          opacity: 0.8;
        }

        .pulse-dot {
          display: inline-block;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #10b981;
          margin-right: 0.5rem;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% { transform: scale(0.9); opacity: 0.7; }
          50% { transform: scale(1.1); opacity: 1; }
        }

        .live-indicator-small {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.8rem;
          opacity: 0.8;
        }

        .pulse-dot-small {
          display: inline-block;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #10b981;
          animation: pulse-small 2s infinite;
        }

        @keyframes pulse-small {
          0%, 100% { transform: scale(0.8); opacity: 0.6; }
          50% { transform: scale(1.0); opacity: 1; }
        }

        .live-stats-section {
          padding: 6rem 2rem;
          background: #f8fafc;
          color: #1f2937;
        }

        .live-stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 2rem;
          margin-top: 3rem;
        }

        .live-stat-card {
          background: white;
          border-radius: 16px;
          padding: 2rem;
          display: flex;
          align-items: center;
          gap: 1.5rem;
          box-shadow: 0 10px 20px rgba(0, 0, 0, 0.08);
          border: 1px solid #e2e8f0;
        }

        .stat-icon {
          font-size: 2.5rem;
          color: #4f46e5;
        }

        .stat-content {
          flex-grow: 1;
        }

        .stat-number {
          font-size: 2rem;
          font-weight: 700;
          color: #1f2937;
          margin-bottom: 0.5rem;
        }

        .stat-label {
          font-size: 0.9rem;
          color: #6b7280;
          margin-bottom: 0.5rem;
        }

        .stat-status {
          font-size: 0.8rem;
          font-weight: 600;
          padding: 0.3rem 0.8rem;
          border-radius: 12px;
          display: inline-block;
        }

        .stat-status.active {
          background: #d1fae5;
          color: #065f46;
        }

        .stat-status.warning {
          background: #fef3c7;
          color: #92400e;
        }

        .stat-status.success {
          background: #d1fae5;
          color: #065f46;
        }

        .activity-section {
          padding: 6rem 2rem;
          background: #f8fafc;
          color: #1f2937;
        }

        .activity-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 2rem;
        }

        .activity-card {
          background: white;
          border-radius: 16px;
          padding: 2rem;
          box-shadow: 0 10px 20px rgba(0, 0, 0, 0.08);
          border: 1px solid #e2e8f0;
        }

        .activity-card h3 {
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 1.5rem;
          color: #1f2937;
        }

        .activity-list {
          max-height: 300px; /* Adjust as needed */
          overflow-y: auto;
          padding-right: 10px; /* Add some padding for scrollbar */
        }

        .activity-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.8rem 0;
          border-bottom: 1px solid #f3f4f6;
        }

        .activity-item:last-child {
          border-bottom: none;
        }

        .activity-icon {
          font-size: 1.5rem;
          color: #4f46e5;
        }

        .activity-details {
          flex-grow: 1;
        }

        .activity-text {
          font-size: 0.95rem;
          color: #374151;
          margin-bottom: 0.2rem;
        }

        .activity-time {
          font-size: 0.8rem;
          color: #9ca3af;
        }

        .activity-footer {
          text-align: center;
          margin-top: 1.5rem;
          padding-top: 1.5rem;
          border-top: 1px solid #e5e7eb;
        }

        .activity-actions {
          text-align: center;
          margin-top: 1.5rem;
          padding-top: 1.5rem;
          border-top: 1px solid #e5e7eb;
        }

        .btn-show-more {
          background: #4f46e5;
          color: white;
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          text-decoration: none;
          display: inline-block;
        }

        .btn-show-more:hover {
          background: #4338ca;
          transform: translateY(-2px);
        }

        .features-section {
          padding: 6rem 2rem;
          background: white;
          color: #1f2937;
        }

        .container {
          max-width: 1200px;
          margin: 0 auto;
        }

        .section-title {
          text-align: center;
          font-size: 2.5rem;
          font-weight: 700;
          margin-bottom: 3rem;
          color: #1f2937;
        }

        .features-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 2rem;
        }

        .feature-card {
          background: #f8fafc;
          padding: 2rem;
          border-radius: 16px;
          text-align: center;
          transition: all 0.3s ease;
          border: 1px solid #e2e8f0;
        }

        .feature-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
          background: white;
        }

        .feature-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
        }

        .feature-title {
          font-size: 1.25rem;
          font-weight: 600;
          margin-bottom: 1rem;
          color: #1f2937;
        }

        .feature-description {
          color: #6b7280;
          line-height: 1.6;
        }

        .stats-section {
          padding: 4rem 2rem;
          background: #1f2937;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 2rem;
        }

        .stat-card {
          text-align: center;
          padding: 2rem;
        }

        .stat-number {
          font-size: 2.5rem;
          font-weight: 700;
          color: #fbbf24;
          margin-bottom: 0.5rem;
        }

        .stat-label {
          font-size: 1.1rem;
          opacity: 0.8;
        }

        .home-footer {
          background: #111827;
          color: white;
          padding: 3rem 2rem 1rem;
        }

        .footer-content {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 2rem;
          margin-bottom: 2rem;
        }

        .footer-section h3, .footer-section h4 {
          margin-bottom: 1rem;
          color: #fbbf24;
        }

        .footer-section ul {
          list-style: none;
          padding: 0;
        }

        .footer-section ul li {
          margin-bottom: 0.5rem;
        }

        .footer-section ul li button {
          background: none;
          border: none;
          color: white;
          cursor: pointer;
          padding: 0;
          text-decoration: underline;
        }

        .footer-section ul li button:hover {
          color: #fbbf24;
        }

        .footer-bottom {
          text-align: center;
          padding-top: 2rem;
          border-top: 1px solid #374151;
          opacity: 0.7;
        }

        @media (max-width: 768px) {
          .hero-content {
            grid-template-columns: 1fr;
            text-align: center;
          }

          .hero-title {
            font-size: 2.5rem;
          }

          .hero-actions {
            justify-content: center;
          }

          .header-content {
            padding: 1rem;
          }

          .hero-section {
            padding: 6rem 1rem 2rem;
          }

          .features-section, .stats-section {
            padding: 3rem 1rem;
          }

          .live-stats-grid {
            grid-template-columns: 1fr;
          }

          .activity-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
