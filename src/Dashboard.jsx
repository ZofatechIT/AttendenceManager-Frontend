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

  // console.log(token)

  // Helper to get and update location
  const updateLocation = (send = false) => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          if (send) {
            sendAttendance('location', getTime(), pos.coords.latitude, pos.coords.longitude);
          }
        },
        err => setLocation('Permission denied')
      );
    } else {
      setLocation('Not supported');
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
    // eslint-disable-next-line
    fetchAttendance();
  }, []);

  useEffect(() => {
    return () => {
      clearTimeout(lunchTimeout.current);
      clearTimeout(lunchEndTimeout.current);
      clearInterval(locationInterval.current);
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
  // Responsive styles
  const containerStyle = {
    maxWidth: 420,
    margin: '0 auto',
    padding: 16,
    background: '#f8fafc',
    minHeight: '100vh',
    boxSizing: 'border-box',
    fontFamily: 'Inter, Arial, sans-serif',
  };

  const cardStyle = {
    marginBottom: 18,
    background: '#fff',
    borderRadius: 12,
    padding: 16,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: 600,
    boxShadow: '0 2px 8px rgba(100,108,255,0.07)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  };

  const logoutBtnStyle = {
    background: '#ff4d4f',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '7px 14px',
    fontWeight: 500,
    fontSize: 15,
    cursor: 'pointer',
    marginLeft: 8,
    marginTop: 4,
  };

  const infoStyle = {
    textAlign: 'center',
    marginBottom: 10,
    fontSize: '1.75rem',
    color: '#444',
    fontWeight: 'bold',
  };

  const clockStyle = {
    textAlign: 'center',
    fontSize: '3rem',
    fontWeight: 'bold',
    margin: '0 0 24px 0',
    color: '#22223b',
    fontFamily: 'monospace',
  };

  const btnContainerStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    margin: '0 0 10px 0',
  };

  const summaryStyle = {
    marginTop: 22,
    fontSize: 16,
    background: '#fff',
    borderRadius: 10,
    padding: 14,
    boxShadow: '0 1px 4px rgba(100,108,255,0.05)',
    lineHeight: 1.7,
    wordBreak: 'break-word',
  };

  // Responsive media queries
  const styleTag = (
    <style>{`
      @media (max-width: 600px) {
        .dashboard-container {
          padding: 8px !important;
        }
        .dashboard-card {
          padding: 10px !important;
          font-size: 15px !important;
        }
        .dashboard-title {
          font-size: 18px !important;
        }
        .dashboard-btn {
          font-size: 16px !important;
          padding: 12px !important;
        }
        .dashboard-summary {
          font-size: 14px !important;
          padding: 10px !important;
        }
      }
    `}</style>
  );
  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <div style={{ fontWeight: 600, color: '#222', display: 'flex', alignItems: 'center', gap: 8 }}>
          {user.name || user.employeeId}
          {user.isAdmin && (
            <>
              <span style={{ color: '#28a745', fontWeight: 700, fontSize: 14, marginLeft: 8 }}>[Admin]</span>
              <button
                style={{ marginLeft: 12, background: '#646cff', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 12px', fontWeight: 500, fontSize: 14, cursor: 'pointer' }}
                onClick={() => window.location.href = '/admin'}
              >
                Admin Panel
              </button>
            </>
          )}
        </div>
        <button onClick={handleLogout} style={logoutBtnStyle}>Logout</button>
      </div>

      <div style={infoStyle}>{day}, {date}</div>
      <div style={clockStyle}>
        {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </div>

      <div style={btnContainerStyle}>
        <button onClick={handleStart} style={btnStyle}>
          Begin Work
        </button>
        <button onClick={handleLunchStart} style={btnStyle}>
          Lunch Break Start
        </button>
        <button onClick={handleLunchEnd} style={btnStyle}>
          Lunch Break End
        </button>
        <button onClick={handleEnd} style={btnStyle}>
          End Work
        </button>
      </div>
      
      {user.location && (
        <div style={{...summaryStyle, textAlign: 'center', marginTop: 16, fontWeight: 600 }}>
          Location: {user.location.name}
        </div>
      )}

      <div style={{ marginTop: 24, fontSize: 16 }}>
        <div style={cardStyle}>
          <div>Start Time</div>
          <div style={{ color: '#222' }}>
            {startTime ? getTimeString(startTime) : '-- : --'}
            <span style={{fontSize:12, color:'#888', marginLeft:5}}>{findLocation(startTime, locations)}</span>
          </div>
        </div>
        <div style={cardStyle}>
          <div>Lunch</div>
          <div style={{ color: '#222' }}>
            {lunchStartTime ? getTimeString(lunchStartTime) : '-- : --'}
            <span style={{fontSize:12, color:'#888', marginLeft:5}}>{findLocation(lunchStartTime, locations)}</span>
            {' - '}
            {lunchEndTime ? getTimeString(lunchEndTime) : '-- : --'}
            <span style={{fontSize:12, color:'#888', marginLeft:5}}>{findLocation(lunchEndTime, locations)}</span>
          </div>
        </div>
        <div style={cardStyle}>
          <div>End Time</div>
          <div style={{ color: '#222' }}>
            {endTime ? getTimeString(endTime) : '-- : --'}
            <span style={{fontSize:12, color:'#888', marginLeft:5}}>{findLocation(endTime, locations)}</span>
          </div>
        </div>
        {totalHours && <div style={{ marginTop: 12, fontWeight: 600 }}>Total Hours Worked: {totalHours}</div>}
      </div>
    </div>
  );
}

const btnStyle = {
  padding: 14,
  borderRadius: 8,
  fontSize: 18,
  fontWeight: 600,
  background: '#646cff',
  color: '#fff',
  border: 'none',
  width: '100%',
};

function getTimeString(date) {
  if (!date) return '--';
  if (typeof date === 'string') date = new Date(date);
  return date.toLocaleTimeString();
} 