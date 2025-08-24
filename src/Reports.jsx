import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';

export default function Reports() {
  const [showForm, setShowForm] = useState(false);
  const [reportType, setReportType] = useState('');
  const [reportMessage, setReportMessage] = useState('');
  const [reportLocation, setReportLocation] = useState('');
  const [reportPictures, setReportPictures] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [location, setLocation] = useState(null);

  useEffect(() => {
    // Get current location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        err => {
          console.error('Location error:', err);
          setLocation('Permission denied');
        }
      );
    }
  }, []);

  const handleAllGood = async () => {
    setIsSubmitting(true);
    try {
      const currentToken = localStorage.getItem('token');
      if (!currentToken) {
        Swal.fire('Error', 'Please login again', 'error');
        return;
      }

      const reportData = {
        type: 'all_ok',
        date: new Date().toISOString().slice(0, 10),
        time: new Date().toLocaleTimeString(),
        message: 'Everything is okay. All systems functioning normally.',
        location: location ? (typeof location === 'object' ? `Lat: ${location.lat.toFixed(6)}, Lng: ${location.lng.toFixed(6)}` : location) : 'Location not available'
      };

      const response = await fetch('https://attendencemanager-backend.onrender.com/api/reports', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${currentToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reportData),
      });

      if (response.ok) {
        Swal.fire('Success!', 'Report submitted successfully', 'success');
        setShowForm(false);
        setReportType('');
        setReportMessage('');
        setReportLocation('');
        setReportPictures([]);
      } else {
        Swal.fire('Error', 'Failed to submit report', 'error');
      }
    } catch (error) {
      console.error('Error submitting report:', error);
      Swal.fire('Error', 'Failed to submit report', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReportProblem = async () => {
    if (!reportType || !reportMessage) {
      Swal.fire('Error', 'Please fill in all required fields', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const currentToken = localStorage.getItem('token');
      if (!currentToken) {
        Swal.fire('Error', 'Please login again', 'error');
        return;
      }

      console.log('🔍 Frontend: Submitting problem report with data:', {
        type: reportType,
        date: new Date().toISOString().slice(0, 10),
        time: new Date().toLocaleTimeString(),
        message: reportMessage,
        location: reportLocation || (location ? (typeof location === 'object' ? `Lat: ${location.lat.toFixed(6)}, Lng: ${location.lng.toFixed(6)}` : location) : 'Location not available'),
        picturesCount: reportPictures.length
      });

      const formData = new FormData();
      formData.append('type', reportType);
      formData.append('date', new Date().toISOString().slice(0, 10));
      formData.append('time', new Date().toLocaleTimeString());
      formData.append('message', reportMessage);
      formData.append('location', reportLocation || (location ? (typeof location === 'object' ? `Lat: ${location.lat.toFixed(6)}, Lng: ${location.lng.toFixed(6)}` : location) : 'Location not available'));

      // Add pictures if any
      reportPictures.forEach((picture, index) => {
        formData.append('pictures', picture);
      });

      console.log('🔍 Frontend: Sending request to backend...');
      const response = await fetch('https://attendencemanager-backend.onrender.com/api/reports', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${currentToken}`,
        },
        body: formData,
      });

      console.log('🔍 Frontend: Response received:', {
        status: response.status,
        ok: response.ok,
        statusText: response.statusText
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Frontend: Report submitted successfully:', result);
        Swal.fire('Success!', 'Problem report submitted successfully', 'success');
        setShowForm(false);
        setReportType('');
        setReportMessage('');
        setReportLocation('');
        setReportPictures([]);
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        console.error('❌ Frontend: Backend error:', errorData);
        Swal.fire('Error', `Failed to submit report: ${errorData.message || 'Unknown error'}`, 'error');
      }
    } catch (error) {
      console.error('❌ Frontend: Network or other error:', error);
      Swal.fire('Error', `Failed to submit report: ${error.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setReportPictures(files);
  };

  const removePicture = (index) => {
    setReportPictures(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="reports-container">
      {/* Header */}
      <header className="reports-header">
        <div className="header-content">
          <button className="back-btn" onClick={() => window.location.href = '/dashboard'}>
            ← Back to Dashboard
          </button>
          <h1>Submit Report</h1>
        </div>
      </header>

      <div className="reports-content">
        {/* Quick Report Buttons */}
        <div className="quick-report-section">
          <h2>Quick Report</h2>
          <div className="quick-buttons">
            <button 
              className="all-good-btn" 
              onClick={handleAllGood}
              disabled={isSubmitting}
            >
              ✅ All Good
            </button>
            <button 
              className="report-problem-btn" 
              onClick={() => setShowForm(true)}
              disabled={isSubmitting}
            >
              🚨 Report Problem
            </button>
          </div>
        </div>

        {/* Problem Report Form */}
        {showForm && (
          <div className="problem-report-form">
            <h2>Report a Problem</h2>
            
            <div className="form-group">
              <label>Problem Type *</label>
              <select 
                value={reportType} 
                onChange={(e) => setReportType(e.target.value)}
                className="form-input"
              >
                <option value="">Select problem type</option>
                <option value="security">Security Issue</option>
                <option value="maintenance">Maintenance Problem</option>
                <option value="suspicious">Suspicious Activity</option>
                <option value="equipment">Equipment Failure</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="form-group">
              <label>Location</label>
              <input 
                type="text" 
                value={reportLocation} 
                onChange={(e) => setReportLocation(e.target.value)}
                placeholder="Enter specific location details"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>Description *</label>
              <textarea 
                value={reportMessage} 
                onChange={(e) => setReportMessage(e.target.value)}
                placeholder="Describe the problem in detail..."
                rows={4}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>Pictures (Optional)</label>
              <input 
                type="file" 
                multiple 
                accept="image/*" 
                onChange={handleFileSelect}
                className="form-input"
              />
              {reportPictures.length > 0 && (
                <div className="picture-preview">
                  {reportPictures.map((pic, index) => (
                    <div key={index} className="picture-item">
                      <img src={URL.createObjectURL(pic)} alt={`Preview ${index + 1}`} />
                      <button 
                        className="remove-picture"
                        onClick={() => removePicture(index)}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="form-actions">
              <button 
                className="cancel-btn" 
                onClick={() => {
                  setShowForm(false);
                  setReportType('');
                  setReportMessage('');
                  setReportLocation('');
                  setReportPictures([]);
                }}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button 
                className="submit-btn" 
                onClick={handleReportProblem}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
