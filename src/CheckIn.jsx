import { useState, useEffect } from 'react';

export default function CheckIn() {
  const [currentTime, setCurrentTime] = useState(new Date());



  const [attendanceData, setAttendanceData] = useState([]);
  const [expandedWeeks, setExpandedWeeks] = useState(new Set());

  const [hourlyRate, setHourlyRate] = useState(20); // USD per hour
  const [lastUpdated, setLastUpdated] = useState(new Date());



  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    const dataRefreshTimer = setInterval(() => {
      // Refresh attendance data every 30 seconds to keep it real-time
      loadAttendanceData();
    }, 30 * 1000); // 30 seconds
    
    loadAttendanceData();
    
    return () => {
      clearInterval(timer);
      clearInterval(dataRefreshTimer);
    };
  }, []);







  const loadAttendanceData = () => {
    // Generate sample attendance data similar to Admin Dashboard
    const sampleAttendance = generateSampleAttendanceData();
    const convertedData = convertBackendDataToAttendanceFormat(sampleAttendance);
    setAttendanceData(convertedData);
    setLastUpdated(new Date());
  };

  const generateSampleAttendanceData = () => {
    const today = new Date();
    const sampleData = [];
    
    // Generate attendance records for the last 30 days
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      
      // Skip weekends (Saturday = 6, Sunday = 0)
      if (date.getDay() === 0 || date.getDay() === 6) {
        continue;
      }
      
      // Generate random work hours (7-11 hours per day) with more variation
      const workHours = 7 + Math.random() * 4;
      const startHour = 7 + Math.random() * 3; // Start between 7-10 AM
      const startTime = new Date(date);
      startTime.setHours(Math.floor(startHour), Math.floor(Math.random() * 60), 0, 0);
      
      const endTime = new Date(startTime);
      endTime.setHours(startTime.getHours() + Math.floor(workHours), startTime.getMinutes(), 0, 0);
      
      // Lunch break (45 minutes to 1.5 hours) at variable times
      const lunchDelay = 3 + Math.random() * 3; // 3-6 hours after start
      const lunchDuration = 0.75 + Math.random() * 0.75; // 45 min to 1.5 hours
      
      const lunchStart = new Date(startTime);
      lunchStart.setHours(startTime.getHours() + Math.floor(lunchDelay), Math.floor(Math.random() * 60), 0, 0);
      
      const lunchEnd = new Date(lunchStart);
      lunchEnd.setHours(lunchStart.getHours() + Math.floor(lunchDuration), Math.floor((lunchDuration % 1) * 60), 0, 0);
      
      sampleData.push({
        _id: `sample_${i}_${Date.now()}`,
        date: date.toISOString().split('T')[0], // YYYY-MM-DD format
        startTime: startTime.toISOString(),
        lunchStartTime: lunchStart.toISOString(),
        lunchEndTime: lunchEnd.toISOString(),
        endTime: endTime.toISOString(),
        totalHours: workHours,
        locations: [
          {
            time: startTime.toISOString(),
            lat: 40.7128 + (Math.random() - 0.5) * 0.01,
            lng: -74.0060 + (Math.random() - 0.5) * 0.01
          },
          {
            time: endTime.toISOString(),
            lat: 40.7128 + (Math.random() - 0.5) * 0.01,
            lng: -74.0060 + (Math.random() - 0.5) * 0.01
          }
        ]
      });
    }
    
    return sampleData;
  };





  const convertBackendDataToAttendanceFormat = (backendAttendance) => {
    const data = [];
    const today = new Date();
    
    // Generate 8 weeks of data (4 biweekly periods)
    for (let weekOffset = 7; weekOffset >= 0; weekOffset--) {
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - (weekOffset * 7));
      
      const weekData = {
        weekStart: weekStart.toISOString(),
        weekEnd: new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000).toISOString(),
        weekNumber: Math.ceil((8 - weekOffset) / 2),
        days: []
      };

      // Generate 7 days for each week
      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const dayDate = new Date(weekStart);
        dayDate.setDate(weekStart.getDate() + dayOffset);
        
        const isWeekend = dayDate.getDay() === 0 || dayDate.getDay() === 6;
        const isToday = dayDate.toDateString() === today.toDateString();
        
        // Find backend attendance record for this specific day
        const dayAttendance = backendAttendance.find(record => {
          // Handle different date formats from backend
          let recordDate;
          if (record.date) {
            recordDate = new Date(record.date);
            // Check if date is valid
            if (isNaN(recordDate.getTime())) {
              return false;
            }
          } else {
            return false;
          }
          
          const dayDateString = dayDate.toDateString();
          const recordDateString = recordDate.toDateString();
          
          return recordDateString === dayDateString;
        });
        
        let dayData = {
          date: dayDate.toISOString(),
          timeIn: null,
          lunchStart: null,
          lunchEnd: null,
          timeOut: null,
          totalHours: 0,
          isWeekend,
          isToday,
          backendRecord: dayAttendance
        };

        // Process backend attendance data for this day
        if (dayAttendance) {
          // Convert backend fields to our format
          if (dayAttendance.startTime) {
            dayData.timeIn = new Date(dayAttendance.startTime);
          }
          if (dayAttendance.lunchStartTime) {
            dayData.lunchStart = new Date(dayAttendance.lunchStartTime);
          }
          if (dayAttendance.lunchEndTime) {
            dayData.lunchEnd = new Date(dayAttendance.lunchEndTime);
          }
          if (dayAttendance.endTime) {
            dayData.timeOut = new Date(dayAttendance.endTime);
          }
          
          // Use backend totalHours if available, otherwise calculate
          if (dayAttendance.totalHours) {
            dayData.totalHours = dayAttendance.totalHours;
          } else if (dayData.timeIn && dayData.timeOut) {
            const totalMinutes = (dayData.timeOut - dayData.timeIn) / (1000 * 60);
            const lunchMinutes = dayData.lunchStart && dayData.lunchEnd ? 
              (dayData.lunchEnd - dayData.lunchStart) / (1000 * 60) : 0;
            dayData.totalHours = Math.round((totalMinutes - lunchMinutes) / 60 * 100) / 100;
          }
        }
        
        weekData.days.push(dayData);
      }
      
      data.push(weekData);
    }
    
    return data;
  };



  const toggleWeekExpansion = (weekIndex) => {
    const newExpanded = new Set(expandedWeeks);
    if (newExpanded.has(weekIndex)) {
      newExpanded.delete(weekIndex);
    } else {
      newExpanded.add(weekIndex);
    }
    setExpandedWeeks(newExpanded);
  };



  const calculateBiweeklyHours = (week) => {
    return week.days.reduce((total, day) => total + (day.totalHours || 0), 0);
  };

  const calculateBiweeklyPayout = (week) => {
    const totalHours = calculateBiweeklyHours(week);
    return totalHours * hourlyRate;
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString([], { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const getStatusColor = (day) => {
    if (day.isWeekend) return '#f3f4f6';
    if (day.timeIn && day.timeOut) return '#d1fae5';
    if (day.timeIn) return '#fef3c7';
    return '#fee2e2';
  };

  const printWeek = (weekIndex) => {
    const week = attendanceData[weekIndex];
    const weekStart = new Date(week.weekStart);
    const weekEnd = new Date(week.weekEnd);
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Attendance Report - ${weekStart.toLocaleDateString()} to ${weekEnd.toLocaleDateString()}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .summary { margin: 20px 0; padding: 20px; background-color: #f9f9f9; }
            .header { text-align: center; margin-bottom: 30px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Attendance Report</h1>
            <h2>${weekStart.toLocaleDateString()} - ${weekEnd.toLocaleDateString()}</h2>
          </div>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Time In</th>
                <th>Lunch Start</th>
                <th>Lunch End</th>
                <th>Time Out</th>
                <th>Total Hours</th>
              </tr>
            </thead>
            <tbody>
              ${week.days.map(day => `
                <tr>
                  <td>${new Date(day.date).toLocaleDateString()}</td>
                  <td>${day.timeIn ? formatTime(day.timeIn) : ''}</td>
                  <td>${day.lunchStart ? formatTime(day.lunchStart) : ''}</td>
                  <td>${day.lunchEnd ? formatTime(day.lunchEnd) : ''}</td>
                  <td>${day.timeOut ? formatTime(day.timeOut) : ''}</td>
                  <td>${day.totalHours || 0}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="summary">
            <h3>Summary</h3>
            <p><strong>Total Hours:</strong> ${calculateBiweeklyHours(week)}</p>
            <p><strong>Payout ($${hourlyRate}/hr):</strong> $${calculateBiweeklyPayout(week).toFixed(2)}</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="checkin-container">
      {/* Header */}
      <header className="checkin-header">
        <div className="header-content">
          <button className="back-btn" onClick={() => window.location.href = '/dashboard'}>
            ← Back to Dashboard
          </button>
          <h1>Guard Check-in System</h1>
          <div className="time-display">
            {currentTime.toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit', 
              second: '2-digit' 
            })}
          </div>
        </div>
      </header>

      <div className="checkin-content">
        {/* Attendance Table Section */}
        <div className="attendance-section">
          <div className="attendance-card">
            <div className="attendance-header">
              <h2>Attendance Records</h2>
              <div className="header-controls">

                                 <div className="backend-status">
                   <span className="backend-connected">📊 Sample Data Mode</span>
                   <span className="live-indicator">🔄 Live Updates</span>
                   <span className="last-updated">Last: {lastUpdated.toLocaleTimeString()}</span>
                 </div>
                <div className="hourly-rate-control">
                  <label>Hourly Rate: $</label>
                  <input
                    type="number"
                    value={hourlyRate}
                    onChange={(e) => setHourlyRate(parseFloat(e.target.value) || 0)}
                    min="0"
                    step="0.01"
                    className="rate-input"
                  />
                </div>

                <button 
                  className="refresh-data-btn"
                  onClick={() => loadAttendanceData()}
                  title="Refresh attendance data"
                >
                  🔄 Refresh Data
                </button>
                                 <button 
                   className="debug-btn"
                   onClick={() => {
                     console.log('Current attendance data:', attendanceData);
                     alert(`Sample attendance data: ${attendanceData.length} weeks loaded with realistic work hours.`);
                   }}
                   title="Debug info"
                 >
                   🐛 Debug
                 </button>

              </div>
            </div>
            
            <div className="biweekly-container">
              {attendanceData.map((week, weekIndex) => {
                const weekStart = new Date(week.weekStart);
                const weekEnd = new Date(week.weekEnd);
                const isExpanded = expandedWeeks.has(weekIndex);
                const totalHours = calculateBiweeklyHours(week);
                const payout = calculateBiweeklyPayout(week);
                const isCurrentWeek = week.days.some(day => day.isToday);
                
                return (
                  <div key={weekIndex} className={`biweekly-block ${isCurrentWeek ? 'current-week' : ''}`}>
                    <div className="week-header" onClick={() => toggleWeekExpansion(weekIndex)}>
                      <div className="week-info">
                        <h3>Week {week.weekNumber || Math.floor(weekIndex / 2) + 1}</h3>
                        <p>{weekStart.toLocaleDateString()} - {weekEnd.toLocaleDateString()}</p>
                      </div>
                      <div className="week-summary">
                        <span className="total-hours">{totalHours} hrs</span>
                        <span className="total-payout">${payout.toFixed(2)}</span>
                        <span className="expand-icon">{isExpanded ? '▼' : '▶'}</span>
                      </div>
                    </div>
                    
                    {isExpanded && (
                      <div className="week-details">
                        <div className="table-container">
                          <table className="attendance-table">
                            <thead>
                              <tr>
                                <th>Date</th>
                                <th>Time In</th>
                                <th>Lunch Start</th>
                                <th>Lunch End</th>
                                <th>Time Out</th>
                                <th>Total Hours</th>
                              </tr>
                            </thead>
                            <tbody>
                              {week.days.map((day, dayIndex) => (
                                <tr key={dayIndex} style={{ backgroundColor: getStatusColor(day) }}>
                                  <td className={`date-cell ${day.isWeekend ? 'weekend' : ''} ${day.isToday ? 'today' : ''}`}>
                                    {formatDate(day.date)}
                                    {day.isToday && <span className="today-badge">Today</span>}
                                  </td>
                                  <td className="time-cell">
                                    {day.timeIn ? formatTime(day.timeIn) : '-'}
                                  </td>
                                  <td className="time-cell">
                                    {day.lunchStart ? formatTime(day.lunchStart) : '-'}
                                  </td>
                                  <td className="time-cell">
                                    {day.lunchEnd ? formatTime(day.lunchEnd) : '-'}
                                  </td>
                                  <td className="time-cell">
                                    {day.timeOut ? formatTime(day.timeOut) : '-'}
                                  </td>
                                  <td className="hours-cell">
                                    {day.totalHours || 0}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        
                        <div className="week-actions">
                          <button 
                            className="print-btn"
                            onClick={() => printWeek(weekIndex)}
                          >
                            🖨️ Print Report
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .checkin-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }

        .checkin-header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 1rem 0;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        }

        .header-content {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 2rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .back-btn {
          background: rgba(255, 255, 255, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.3);
          color: white;
          padding: 0.5rem 1rem;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.3s ease;
        }

        .back-btn:hover {
          background: rgba(255, 255, 255, 0.3);
        }

        .header-content h1 {
          margin: 0;
          font-size: 1.5rem;
          font-weight: 600;
        }

        .time-display {
          font-size: 1.1rem;
          font-weight: 500;
          background: rgba(255, 255, 255, 0.2);
          padding: 0.5rem 1rem;
          border-radius: 8px;
        }

        .checkin-content {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem;
        }

        .attendance-card {
          background: white;
          border-radius: 16px;
          padding: 2rem;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
        }

        .attendance-card h2 {
          margin: 0 0 1.5rem 0;
          color: #1f2937;
          font-size: 1.5rem;
          font-weight: 600;
        }

        /* Attendance Section Styles */
        .attendance-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }

        .header-controls {
          display: flex;
          align-items: center;
          gap: 1rem;
        }



        .backend-status {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .backend-connected {
          background: #dcfce7;
          color: #166534;
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.875rem;
          font-weight: 500;
        }

        .backend-disconnected {
          background: #fef3c7;
          color: #92400e;
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.875rem;
          font-weight: 500;
        }

        .live-indicator {
          background: #dbeafe;
          color: #1e40af;
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.875rem;
          font-weight: 500;
          animation: pulse 2s infinite;
        }

        .last-updated {
          background: #f3f4f6;
          color: #374151;
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 500;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }



        .hourly-rate-control {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }



        .refresh-data-btn {
          background: #8b5cf6;
          color: white;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.875rem;
          font-weight: 500;
          transition: all 0.3s ease;
        }

        .refresh-data-btn:hover {
          background: #7c3aed;
          transform: translateY(-1px);
        }

        .debug-btn {
          background: #f59e0b;
          color: white;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.875rem;
          font-weight: 500;
          transition: all 0.3s ease;
        }

        .debug-btn:hover {
          background: #d97706;
          transform: translateY(-1px);
        }



        .rate-input {
          width: 80px;
          padding: 0.5rem;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          text-align: center;
        }

        .biweekly-container {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .biweekly-block {
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          overflow: hidden;
          background: white;
          transition: all 0.3s ease;
        }

        .biweekly-block.current-week {
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .week-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 1.5rem;
          background: #f8fafc;
          cursor: pointer;
          transition: background-color 0.3s ease;
        }

        .week-header:hover {
          background: #f1f5f9;
        }

        .week-info h3 {
          margin: 0 0 0.25rem 0;
          color: #1f2937;
          font-size: 1.1rem;
        }

        .week-info p {
          margin: 0;
          color: #6b7280;
          font-size: 0.875rem;
        }

        .week-summary {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .total-hours {
          background: #dbeafe;
          color: #1e40af;
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.875rem;
          font-weight: 600;
        }

        .total-payout {
          background: #dcfce7;
          color: #166534;
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.875rem;
          font-weight: 600;
        }

        .expand-icon {
          color: #6b7280;
          font-size: 1.2rem;
        }

        .week-details {
          padding: 1.5rem;
          border-top: 1px solid #e5e7eb;
        }

        .table-container {
          overflow-x: auto;
          margin-bottom: 1.5rem;
        }

        .attendance-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.875rem;
        }

        .attendance-table th {
          background: #f8fafc;
          padding: 0.75rem;
          text-align: left;
          font-weight: 600;
          color: #374151;
          border-bottom: 2px solid #e5e7eb;
          position: sticky;
          top: 0;
          z-index: 10;
        }

        .attendance-table td {
          padding: 0.75rem;
          border-bottom: 1px solid #e5e7eb;
        }

        .date-cell {
          font-weight: 500;
          position: relative;
        }

        .date-cell.weekend {
          color: #6b7280;
          font-style: italic;
        }

        .date-cell.today {
          color: #667eea;
          font-weight: 600;
        }

        .today-badge {
          background: #667eea;
          color: white;
          padding: 0.125rem 0.5rem;
          border-radius: 12px;
          font-size: 0.75rem;
          margin-left: 0.5rem;
        }



        .hours-cell {
          font-weight: 600;
          color: #1f2937;
          text-align: center;
        }

        .week-actions {
          display: flex;
          gap: 1rem;
          justify-content: flex-end;
        }

        .print-btn {
          background: #10b981;
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.3s ease;
        }

        .print-btn:hover {
          background: #059669;
          transform: translateY(-1px);
        }

        @media (max-width: 768px) {
          .checkin-content {
            padding: 1rem;
          }

          .header-content {
            flex-direction: column;
            gap: 1rem;
            text-align: center;
          }

          .attendance-header {
            flex-direction: column;
            gap: 1rem;
            align-items: flex-start;
          }

          .week-header {
            flex-direction: column;
            gap: 1rem;
            text-align: center;
          }

          .week-summary {
            justify-content: center;
          }

          .week-actions {
            flex-direction: column;
          }

          .attendance-table {
            font-size: 0.75rem;
          }

          .attendance-table th,
          .attendance-table td {
            padding: 0.5rem 0.25rem;
          }
        }
      `}</style>
    </div>
  );
}
