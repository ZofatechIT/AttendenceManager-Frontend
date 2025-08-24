import { useEffect, useState, useRef } from 'react';
import Swal from 'sweetalert2';

const getTime = () => new Date().toISOString();

export default function Dashboard({ user }) {
  const [started, setStarted] = useState(false);
  const [lunchStarted, setLunchStarted] = useState(false);
  const [lunchEnded, setLunchEnded] = useState(false);
  const [ended, setEnded] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [lunchStartTime, setLunchStartTime] = useState(null);
  const [lunchEndTime, setLunchEndTime] = useState(null);
  const [endTime, setEndTime] = useState(null);
  const [totalHours, setTotalHours] = useState(null);
  const [location, setLocation] = useState(null);
  const [locations, setLocations] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showReportSection, setShowReportSection] = useState(false);
  const [reportType, setReportType] = useState('');
  const [reportDate, setReportDate] = useState('');
  const [reportTime, setReportTime] = useState('');
  const [reportMessage, setReportMessage] = useState('');
  const [reportLocation, setReportLocation] = useState('');
  const [reportPictures, setReportPictures] = useState([]);
  const [submittingReport, setSubmittingReport] = useState(false);
  const [liveData, setLiveData] = useState({
    activeGuards: 0,
    totalPosts: 0,
    incidentsToday: 0,
    checkInsToday: 0,
    lastUpdate: new Date()
  });
  const [recentCheckIns, setRecentCheckIns] = useState([]);
  const [guardStatuses, setGuardStatuses] = useState([]);
  const [isLoadingLiveData, setIsLoadingLiveData] = useState(false);
  const [lastDataUpdate, setLastDataUpdate] = useState(null);
  const [isUsingLiveData, setIsUsingLiveData] = useState(false);
  const [showAllGuards, setShowAllGuards] = useState(false);
  const [guardsToShow, setGuardsToShow] = useState(5);
  const lunchTimeout = useRef();
  const lunchEndTimeout = useRef();
  const locationInterval = useRef();
  const token = localStorage.getItem('token');

  // Logout handler
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
  };

  // Helper to get and update location
  const updateLocation = (send = false) => {
    if (navigator.geolocation) {
      console.log('📍 Dashboard: Requesting GPS location...');
      
      navigator.geolocation.getCurrentPosition(
        pos => {
          const newLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          console.log('✅ Dashboard: GPS location captured:', newLocation);
          setLocation(newLocation);
          
          // Always send location to backend when it's updated
          console.log('📤 Dashboard: Automatically sending location to backend...');
          sendAttendance('location', getTime(), pos.coords.latitude, pos.coords.longitude);
        },
        err => {
          console.error('❌ Dashboard: GPS error:', err);
          let errorMessage = 'Location access denied';
          
          switch(err.code) {
            case err.PERMISSION_DENIED:
              errorMessage = 'GPS permission denied. Please enable location access.';
              break;
            case err.POSITION_UNAVAILABLE:
              errorMessage = 'Location information unavailable.';
              break;
            case err.TIMEOUT:
              errorMessage = 'GPS request timed out.';
              break;
            default:
              errorMessage = 'GPS error: ' + err.message;
          }
          
          setLocation(errorMessage);
          
          // Show user-friendly error message
          if (send) {
            Swal.fire('Location Error', errorMessage, 'warning');
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      );
    } else {
      setLocation('GPS not supported');
    }
  };

  // Send attendance event to backend
  const sendAttendance = async (type, time, lat, lng) => {
    try {
      await fetch('https://attendencemanager-backend.onrender.com/api/attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ type, time, lat, lng }),
      });
    } catch {}
  };

  // Start time logic
  const handleStart = () => {
    Swal.fire({
      title: 'Confirm Start Time',
      text: 'Are you sure you want to begin your work day?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, start now!',
      cancelButtonText: 'Cancel'
    }).then(result => {
      if (result.isConfirmed) doStart();
    });
  };
  
  const doStart = () => {
    setStarted(true);
    setLunchStarted(false);
    setLunchEnded(false);
    setEnded(false);
    setLunchStartTime(null);
    setLunchEndTime(null);
    setEndTime(null);
    setTotalHours(null);
    const now = new Date();
    setStartTime(now);
    navigator.geolocation.getCurrentPosition(
      pos => {
        const newLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setLocation(newLoc);
        setLocations(prev => [...prev, { time: now.toISOString(), lat: newLoc.lat, lng: newLoc.lng }]);
        sendAttendance('start', now.toISOString(), newLoc.lat, newLoc.lng);
      },
      err => {
        setLocation('Permission denied');
        sendAttendance('start', now.toISOString());
      }
    );
    lunchTimeout.current = setTimeout(() => {
      window.alert('Lunch break time!');
      new Audio('https://www.soundjay.com/buttons/beep-07.mp3').play();
    }, 4 * 60 * 60 * 1000);
    locationInterval.current = setInterval(() => updateLocation(true), 30 * 60 * 1000);
    Swal.fire('Started!', 'Your work day has officially begun.', 'success');
  };

  // Lunch break start
  const handleLunchStart = () => {
    Swal.fire({
      title: 'Confirm Lunch Break',
      text: 'Ready to start your lunch break?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, start lunch!',
      cancelButtonText: 'Cancel'
    }).then(result => {
      if (result.isConfirmed) doLunchStart();
    });
  };
  
  const doLunchStart = () => {
    setLunchStarted(true);
    setLunchEnded(false);
    setEnded(false);
    setLunchEndTime(null);
    setEndTime(null);
    setTotalHours(null);
      const now = new Date();
    setLunchStartTime(now);
    navigator.geolocation.getCurrentPosition(
      pos => {
        const newLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setLocation(newLoc);
        setLocations(prev => [...prev, { time: now.toISOString(), lat: newLoc.lat, lng: newLoc.lng }]);
        sendAttendance('lunchStart', now.toISOString(), newLoc.lat, newLoc.lng);
      },
      err => {
        setLocation('Permission denied');
        sendAttendance('lunchStart', now.toISOString());
      }
    );
    lunchEndTimeout.current = setTimeout(() => {
      window.alert('Lunch break ended!');
      new Audio('https://www.soundjay.com/buttons/beep-07.mp3').play();
    }, 60 * 60 * 1000);
    Swal.fire('Enjoy!', 'Your lunch break has started.', 'success');
  };

  // Lunch break end
  const handleLunchEnd = () => {
    Swal.fire({
      title: 'Confirm End of Lunch',
      text: 'Are you ready to resume work?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, back to work!',
      cancelButtonText: 'Cancel'
    }).then(result => {
      if (result.isConfirmed) doLunchEnd();
    });
  };
  
  const doLunchEnd = () => {
    setLunchEnded(true);
        setEnded(false);
        setEndTime(null);
        setTotalHours(null);
    const now = new Date();
    setLunchEndTime(now);
    navigator.geolocation.getCurrentPosition(
      pos => {
        const newLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setLocation(newLoc);
        setLocations(prev => [...prev, { time: now.toISOString(), lat: newLoc.lat, lng: newLoc.lng }]);
        sendAttendance('lunchEnd', now.toISOString(), newLoc.lat, newLoc.lng);
      },
      err => {
        setLocation('Permission denied');
        sendAttendance('lunchEnd', now.toISOString());
      }
    );
    Swal.fire('Welcome Back!', 'You have successfully clocked back in.', 'success');
  };

  // End work
  const handleEnd = () => {
          Swal.fire({
      title: 'Confirm End of Day',
      text: 'Are you sure you want to end your work day?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, end my day!',
      cancelButtonText: 'Cancel'
    }).then(result => {
      if (result.isConfirmed) doEnd();
    });
  };
  
  const doEnd = () => {
    setEnded(true);
    const end = new Date();
    setEndTime(end);
          clearTimeout(lunchTimeout.current);
    clearTimeout(lunchEndTimeout.current);
    clearInterval(locationInterval.current);
    navigator.geolocation.getCurrentPosition(
      pos => {
        const newLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setLocation(newLoc);
        setLocations(prev => [...prev, { time: end.toISOString(), lat: newLoc.lat, lng: newLoc.lng }]);
        sendAttendance('end', end.toISOString(), newLoc.lat, newLoc.lng);
      },
      err => {
        setLocation('Permission denied');
        sendAttendance('end', end.toISOString());
      }
    );
    // Calculate total hours
    if (startTime && end) {
      let ms = end - startTime;
      if (lunchStartTime && lunchEndTime) {
        ms -= (lunchEndTime - lunchStartTime);
      }
      setTotalHours((ms / (1000 * 60 * 60)).toFixed(2));
    }
    Swal.fire('Day Complete!', 'You have successfully clocked out.', 'success');
  };

  // Reset session
  const handleReset = () => {
    Swal.fire({
      title: 'Confirm Reset',
      text: 'Are you sure you want to reset your session? This will clear all current data.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, reset!',
      cancelButtonText: 'Cancel'
    }).then(result => {
      if (result.isConfirmed) {
        setStarted(false);
        setLunchStarted(false);
        setLunchEnded(false);
        setEnded(false);
        setStartTime(null);
        setLunchStartTime(null);
        setLunchEndTime(null);
        setEndTime(null);
        setTotalHours(null);
        setLocations([]);
        clearTimeout(lunchTimeout.current);
        clearTimeout(lunchEndTimeout.current);
          clearInterval(locationInterval.current);
        Swal.fire('Reset Complete!', 'Your session has been reset.', 'success');
      }
    });
  };

  // Load live data from backend
  const loadLiveData = async () => {
    try {
      setIsLoadingLiveData(true);
      const response = await fetch('https://attendencemanager-backend.onrender.com/api/live/status', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Dashboard: Live data loaded:', data);
        
        setLiveData({
          activeGuards: data.liveData.activeGuards,
          totalPosts: data.liveData.totalPosts,
          incidentsToday: data.liveData.incidentsToday,
          checkInsToday: data.liveData.checkInsToday,
          lastUpdate: new Date(data.liveData.lastUpdate)
        });
        
        setGuardStatuses(data.guardStatuses || []);
        setRecentCheckIns(data.recentCheckIns || []);
        setIsUsingLiveData(true);
        setLastDataUpdate(new Date());
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Dashboard: Error loading live data:', error);
      setIsUsingLiveData(false);
    } finally {
      setIsLoadingLiveData(false);
    }
  };

  // Fetch today's attendance on load
  useEffect(() => {
    async function fetchAttendance() {
      try {
        const res = await fetch('https://attendencemanager-backend.onrender.com/api/attendance', {
           method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const att = await res.json();
        if (!att) return;
        if (att.startTime) {
          setStarted(true);
          setStartTime(new Date(att.startTime));
        }
        if (att.lunchStartTime) {
            setLunchStarted(true);
          setLunchStartTime(new Date(att.lunchStartTime));
          }
        if (att.lunchEndTime) {
            setLunchEnded(true);
          setLunchEndTime(new Date(att.lunchEndTime));
        }
        if (att.endTime) {
          setEnded(true);
          setEndTime(new Date(att.endTime));
        }
        if (att.locations) setLocations(att.locations);
        if (att.totalHours) setTotalHours(att.totalHours.toFixed(2));
      } catch {}
    }
    
    fetchAttendance();
    loadLiveData();
    
    // Update live data every 30 seconds
    const dataTimer = setInterval(loadLiveData, 30000);
    
    return () => {
      clearTimeout(lunchTimeout.current);
      clearTimeout(lunchEndTimeout.current);
      clearInterval(locationInterval.current);
      clearInterval(dataTimer);
    };
  }, []);

  useEffect(() => {
    const timerId = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timerId);
  }, []);

  const findLocation = (time, locations) => {
    if (!time || !locations) return null;
    const locTime = time.toISOString();
    const loc = locations.find(l => l.time === locTime);
    if (!loc) return null;
    return `(Lat: ${loc.lat.toFixed(3)}, Lon: ${loc.lng.toFixed(3)})`;
  };

  const today = new Date();
  const day = today.toLocaleDateString(undefined, { weekday: 'long' });
  const date = today.toLocaleDateString();

  return (
    <>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px', fontFamily: 'Inter, Arial, sans-serif' }}>
        {/* Header */}
        <header style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', padding: '1rem', borderRadius: '12px', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Welcome, {user.name || user.employeeId}</h1>
            <p style={{ margin: '0.5rem 0 0 0', opacity: 0.9 }}>
              {day}, {date} • {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {user.isAdmin && (
              <button
                style={{ background: '#646cff', color: 'white', border: 'none', borderRadius: '6px', padding: '8px 16px', cursor: 'pointer' }}
                onClick={() => window.location.href = '/admin'}
              >
                Admin Panel
              </button>
            )}
            <button 
              style={{ background: '#ff4d4f', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer' }}
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        </div>
      </header>

        {/* Live Data Section */}
      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '1.5rem', color: '#1f2937' }}>Live Security Status</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>👥</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1f2937' }}>{liveData.activeGuards}</div>
            <div style={{ color: '#6b7280' }}>Active Guards</div>
            <div style={{ background: '#d1fae5', color: '#065f46', padding: '0.25rem 0.75rem', borderRadius: '12px', fontSize: '0.75rem', marginTop: '0.5rem' }}>On Duty</div>
                </div>
          <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📍</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1f2937' }}>{liveData.totalPosts}</div>
            <div style={{ color: '#6b7280' }}>Security Posts</div>
            <div style={{ background: '#d1fae5', color: '#065f46', padding: '0.25rem 0.75rem', borderRadius: '12px', fontSize: '0.75rem', marginTop: '0.5rem' }}>Covered</div>
              </div>
          <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⚠️</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1f2937' }}>{liveData.incidentsToday}</div>
            <div style={{ color: '#6b7280' }}>Incidents Today</div>
            <div style={{ background: '#fef3c7', color: '#92400e', padding: '0.25rem 0.75rem', borderRadius: '12px', fontSize: '0.75rem', marginTop: '0.5rem' }}>Monitoring</div>
                </div>
          <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✅</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1f2937' }}>{liveData.checkInsToday}</div>
            <div style={{ color: '#6b7280' }}>Check-ins Today</div>
            <div style={{ background: '#d1fae5', color: '#065f46', padding: '0.25rem 0.75rem', borderRadius: '12px', fontSize: '0.75rem', marginTop: '0.5rem' }}>Active</div>
              </div>
                </div>
        <div style={{ textAlign: 'center', color: '#6b7280', fontSize: '0.875rem' }}>
          Last updated: {liveData.lastUpdate instanceof Date ? liveData.lastUpdate.toLocaleTimeString() : 'Never'}
              <button 
            style={{ background: 'none', border: 'none', fontSize: '1rem', cursor: 'pointer', marginLeft: '0.5rem' }}
                onClick={loadLiveData}
                disabled={isLoadingLiveData}
                title="Refresh live data"
              >
            🔄
              </button>
          </div>
        </section>

        {/* Main Dashboard Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: '2rem', alignItems: 'start' }}>
          {/* Left Column - Attendance Controls */}
          <div style={{ width: '100%' }}>
            <>
            <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: '0 0 1rem 0', color: '#1f2937' }}>Attendance Control</h2>
              
              {/* Location Info */}
              <div style={{ marginBottom: '1rem' }}>
                <h3 style={{ margin: '0 0 0.75rem 0', color: '#374151', fontSize: '1rem' }}>📍 Current Location</h3>
                <div>
                  {location && typeof location === 'object' ? (
                    <>
                      <div style={{ fontFamily: 'Courier New, monospace', background: '#f3f4f6', padding: '0.75rem', borderRadius: '8px', marginBottom: '0.75rem', fontSize: '0.875rem' }}>
                        📍 {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                        <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                          🔄 Auto-updating every 2 min
                        </div>
                      </div>
                      <button 
                        style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer', width: '100%' }}
                        onClick={() => updateLocation()}
                      >
                        🔄 Refresh Now
                      </button>
                    </>
                  ) : (
                    <div style={{ color: '#ef4444', background: '#fef2f2', padding: '0.75rem', borderRadius: '8px', border: '1px solid #fecaca' }}>
                      ❌ {location || 'Location access required'}
                      <button 
                        style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer', marginTop: '0.5rem', width: '100%' }}
                        onClick={() => updateLocation()}
                      >
                        🔄 Try Again
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Control Buttons */}
            <div style={{ marginBottom: '1.5rem' }}>
                {!started ? (
                <button 
                  style={{ 
                    width: '100%', 
                    padding: '0.75rem', 
                    border: 'none', 
                    borderRadius: '8px', 
                    fontWeight: '600', 
                    cursor: 'pointer',
                    background: location ? '#10b981' : '#9ca3af',
                    color: 'white',
                    marginBottom: '0.5rem'
                  }}
                  onClick={handleStart} 
                  disabled={!location}
                >
                    🟢 Start Work
                  </button>
                ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {!lunchStarted ? (
                    <button 
                      style={{ 
                        width: '100%', 
                        padding: '0.75rem', 
                        border: 'none', 
                        borderRadius: '8px', 
                        fontWeight: '600', 
                        cursor: 'pointer',
                        background: '#f59e0b',
                        color: 'white'
                      }}
                      onClick={handleLunchStart}
                    >
                        🍽️ Start Lunch
                      </button>
                    ) : (
                    <button 
                      style={{ 
                        width: '100%', 
                        padding: '0.75rem', 
                        border: 'none', 
                        borderRadius: '8px', 
                        fontWeight: '600', 
                        cursor: 'pointer',
                        background: '#f59e0b',
                        color: 'white'
                      }}
                      onClick={handleLunchEnd}
                    >
                        ⏰ End Lunch
                      </button>
                    )}
                    
                  <button 
                    style={{ 
                      width: '100%', 
                      padding: '0.75rem', 
                      border: 'none', 
                      borderRadius: '8px', 
                      fontWeight: '600', 
                      cursor: 'pointer',
                      background: '#ef4444',
                      color: 'white'
                    }}
                    onClick={handleEnd}
                  >
                      🔴 End Work
                    </button>
                    
                  <button 
                    style={{ 
                      width: '100%', 
                      padding: '0.75rem', 
                      border: 'none', 
                      borderRadius: '8px', 
                      fontWeight: '600', 
                      cursor: 'pointer',
                      background: '#6b7280',
                      color: 'white'
                    }}
                    onClick={handleReset}
                  >
                      🔄 Reset Session
                    </button>
                  </div>
                )}
              </div>

              {/* Session Info */}
              {started && (
              <div>
                <h3 style={{ margin: '0 0 1rem 0', color: '#374151', fontSize: '1rem' }}>Session Details</h3>
                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid #f3f4f6' }}>
                    <span style={{ fontWeight: '500', color: '#374151' }}>Start Time:</span>
                    <span style={{ color: '#6b7280', fontFamily: 'Courier New, monospace' }}>{startTime?.toLocaleTimeString() || 'N/A'}</span>
                    </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid #f3f4f6' }}>
                    <span style={{ fontWeight: '500', color: '#374151' }}>Lunch Start:</span>
                    <span style={{ color: '#6b7280', fontFamily: 'Courier New, monospace' }}>{lunchStartTime ? lunchStartTime.toLocaleTimeString() : 'Not started'}</span>
                    </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid #f3f4f6' }}>
                    <span style={{ fontWeight: '500', color: '#374151' }}>Lunch End:</span>
                    <span style={{ color: '#6b7280', fontFamily: 'Courier New, monospace' }}>{lunchEndTime ? lunchEndTime.toLocaleTimeString() : 'Not ended'}</span>
                    </div>
                    {endTime && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid #f3f4f6' }}>
                      <span style={{ fontWeight: '500', color: '#374151' }}>End Time:</span>
                      <span style={{ color: '#6b7280', fontFamily: 'Courier New, monospace' }}>{endTime.toLocaleTimeString()}</span>
                      </div>
                    )}
                    {totalHours && (
                    <div style={{ background: '#f0f9ff', padding: '0.5rem', borderRadius: '6px', borderLeft: '3px solid #3b82f6' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: '500', color: '#374151' }}>Total Hours:</span>
                        <span style={{ color: '#1d4ed8', fontWeight: '600', fontFamily: 'Courier New, monospace' }}>{totalHours} hrs</span>
                      </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', width: '100%' }}>
              <h3 style={{ margin: '0 0 1rem 0', color: '#1f2937' }}>Quick Actions</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <button 
                  style={{ 
                    background: '#8b5cf6', 
                    color: 'white', 
                    border: 'none', 
                    padding: '0.75rem 1rem', 
                    borderRadius: '8px', 
                    fontWeight: '600', 
                    cursor: 'pointer',
                    width: '100%',
                    fontSize: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                  onClick={() => window.location.href = '/checkin'}
                >
                  📍 Check-in
                </button>
                <button 
                  style={{ 
                    background: '#8b5cf6', 
                    color: 'white', 
                    border: 'none', 
                    padding: '0.75rem 1rem', 
                    borderRadius: '8px', 
                    fontWeight: '600', 
                    cursor: 'pointer',
                    width: '100%',
                    fontSize: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                  onClick={() => window.location.href = '/reports'}
                >
                  📊 Reports
                </button>
                <button 
                  style={{ 
                    background: '#8b5cf6', 
                    color: 'white', 
                    border: 'none', 
                    padding: '0.75rem 1rem', 
                    borderRadius: '8px', 
                    fontWeight: '600', 
                    cursor: 'pointer',
                    width: '100%',
                    fontSize: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                  onClick={() => window.location.href = '/map'}
                >
                  🗺️ Live Map
                </button>
              </div>
            </div>
            </>
          </div>
        </div>
      </div>
    {/* </div> */}
  </>
  );
}