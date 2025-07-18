import { useEffect, useState } from 'react';

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ employeeId: '', password: '', name: '', isAdmin: false, email: '', phone: '', address: '' });
  const [adding, setAdding] = useState(false);
  const [manageMode, setManageMode] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [editingRecordId, setEditingRecordId] = useState(null);
  const [editRecordData, setEditRecordData] = useState(null);
  const [profilePic, setProfilePic] = useState(null);
  const [idDocs, setIdDocs] = useState([]);
  const [editProfilePic, setEditProfilePic] = useState(null);
  const [editIdDocs, setEditIdDocs] = useState([]);
  const token = localStorage.getItem('token');

  useEffect(() => {
    async function fetchUsers() {
      setLoading(true);
      try {
        const res = await fetch('https://attendencemanager-backend.onrender.com/api/admin/users', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to fetch users');
        setUsers(await res.json());
      } catch (err) {
        setError('Failed to fetch users');
      } finally {
        setLoading(false);
      }
    }
    fetchUsers();
    // eslint-disable-next-line
  }, []);

  const handleChange = e => {
    const { name, value, type, checked } = e.target;
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleAddUser = async e => {
    e.preventDefault();
    setAdding(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      Object.entries(form).forEach(([key, value]) => formData.append(key, value));
      if (profilePic) formData.append('profilePic', profilePic);
      if (idDocs && idDocs.length > 0) {
        Array.from(idDocs).forEach(file => formData.append('idDocs', file));
      }
      const res = await fetch('https://attendencemanager-backend.onrender.com/api/admin/add-user', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) throw new Error((await res.json()).message || 'Failed to add user');
      setForm({ employeeId: '', password: '', name: '', isAdmin: false, email: '', phone: '', address: '' });
      setProfilePic(null);
      setIdDocs([]);
      // Refresh users
      const usersRes = await fetch('https://attendencemanager-backend.onrender.com/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(await usersRes.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setAdding(false);
    }
  };

  const handleManageUsers = () => {
    setManageMode(true);
    setSelectedUser(null);
  };

  const handleBack = () => {
    setManageMode(false);
    setSelectedUser(null);
    setAttendance([]);
    setEditMode(false);
    setEditUser(null);
  };

  const handleSelectUser = async (user) => {
    setSelectedUser(user);
    setEditMode(false);
    setEditUser(null);
    setLoadingAttendance(true);
    setAttendance([]);
    try {
      const res = await fetch(`https://attendencemanager-backend.onrender.com/api/admin/user-attendance/${user.employeeId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch attendance');
      setAttendance(await res.json());
    } catch (err) {
      setError('Failed to fetch attendance');
    } finally {
      setLoadingAttendance(false);
    }
  };

  const handleEdit = () => {
    setEditMode(true);
    setEditUser({ ...selectedUser, password: '' });
    setEditProfilePic(null);
    setEditIdDocs([]);
  };

  const handleEditChange = e => {
    const { name, value, type, checked } = e.target;
    setEditUser(u => ({ ...u, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSaveEdit = async () => {
    setError('');
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('name', editUser.name);
      formData.append('isAdmin', editUser.isAdmin);
      formData.append('employeeId', editUser.employeeId);
      formData.append('email', editUser.email || '');
      formData.append('phone', editUser.phone || '');
      formData.append('address', editUser.address || '');
      if (editUser.password) formData.append('password', editUser.password);
      if (editProfilePic) formData.append('profilePic', editProfilePic);
      if (editIdDocs && editIdDocs.length > 0) {
        Array.from(editIdDocs).forEach(file => formData.append('idDocs', file));
      }
      const res = await fetch(`https://attendencemanager-backend.onrender.com/api/admin/edit-user/${selectedUser.employeeId}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) throw new Error((await res.json()).message || 'Failed to update user');
      setSelectedUser({ ...editUser, password: undefined });
      setEditMode(false);
      // Refresh users
      const usersRes = await fetch('https://attendencemanager-backend.onrender.com/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(await usersRes.json());
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteUser = async (employeeId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    setError('');
    try {
      const res = await fetch(`https://attendencemanager-backend.onrender.com/api/admin/delete-user/${employeeId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error((await res.json()).message || 'Failed to delete user');
      // Refresh users
      const usersRes = await fetch('https://attendencemanager-backend.onrender.com/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(await usersRes.json());
      setSelectedUser(null);
      setAttendance([]);
    } catch (err) {
      setError(err.message);
    }
  };

  const findLocation = (time, locations) => {
    if (!time || !locations) return null;
    const loc = locations.find(l => l.time === time);
    if (!loc) return null;
    return `(Lat: ${loc.lat.toFixed(3)}, Lon: ${loc.lng.toFixed(3)})`;
  };

  const handleGenerateId = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('https://attendencemanager-backend.onrender.com/api/admin/next-employee-id', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch next ID');
      const data = await res.json();
      setForm(f => ({ ...f, employeeId: data.nextEmployeeId }));
    } catch (err) {
      alert('Could not generate ID');
    }
  };

  const handleEditRecord = (record) => {
    setEditingRecordId(record._id);
    // Helper to format ISO string to 'YYYY-MM-DDTHH:mm' for datetime-local input
    const toInputFormat = (isoString) => {
      if (!isoString) return '';
      const d = new Date(isoString);
      // Adjust for timezone offset
      const z = d.getTimezoneOffset() * 60 * 1000;
      const local = new Date(d - z);
      return local.toISOString().slice(0, 16);
    };
    setEditRecordData({
      ...record,
      startTime: toInputFormat(record.startTime),
      lunchStartTime: toInputFormat(record.lunchStartTime),
      lunchEndTime: toInputFormat(record.lunchEndTime),
      endTime: toInputFormat(record.endTime),
    });
  };
  
  const handleCancelEditRecord = () => {
    setEditingRecordId(null);
    setEditRecordData(null);
  };

  const handleRecordInputChange = (e) => {
    const { name, value } = e.target;
    setEditRecordData(d => ({ ...d, [name]: value }));
  };

  const handleSaveRecord = async (recordId) => {
    setError('');
    try {
      // Helper to convert local input time back to ISO string if not empty
      const toISO = (localTime) => localTime ? new Date(localTime).toISOString() : null;
      const body = {
        date: editRecordData.date,
        startTime: toISO(editRecordData.startTime),
        lunchStartTime: toISO(editRecordData.lunchStartTime),
        lunchEndTime: toISO(editRecordData.lunchEndTime),
        endTime: toISO(editRecordData.endTime),
      };
      
      const res = await fetch(`https://attendencemanager-backend.onrender.com/api/admin/attendance/record/${recordId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error((await res.json()).message || 'Failed to update record');
      
      // Refresh attendance list
      handleSelectUser(selectedUser);
      setEditingRecordId(null);
      setEditRecordData(null);

    } catch (err) {
      setError(err.message);
    }
  };

  // Main admin dashboard
  if (!manageMode) {
    return (
      <div style={containerStyle}>
        <button onClick={() => window.location.href = '/'} style={{ ...btnStyle, background: '#007bff', color: '#fff', marginBottom: 12 }}>Home</button>
        <h2 style={headerStyle}>Admin Dashboard</h2>
        <form onSubmit={handleAddUser} style={formStyle} encType="multipart/form-data">
          <h4>Add User</h4>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input name="employeeId" placeholder="Employee ID (manual or generate)" value={form.employeeId} onChange={handleChange} required style={inputStyle} />
            <button type="button" onClick={handleGenerateId} style={{ ...btnStyle, width: 'auto', padding: '8px 12px', fontSize: 14, background: '#28a745' }}>Generate</button>
          </div>
          <small style={{ color: '#888', marginBottom: 8, display: 'block' }}>You can enter an Employee ID manually or click Generate.</small>
          <input name="password" type="password" placeholder="Password" value={form.password} onChange={handleChange} required style={inputStyle} />
          <input name="name" placeholder="Name" value={form.name} onChange={handleChange} style={inputStyle} />
          <input name="email" placeholder="Email" value={form.email} onChange={handleChange} style={inputStyle} />
          <input name="phone" placeholder="Phone" value={form.phone} onChange={handleChange} style={inputStyle} />
          <input name="address" placeholder="Address" value={form.address} onChange={handleChange} style={inputStyle} />
          <label style={{ display: 'block', margin: '8px 0' }}>
            <input type="checkbox" name="isAdmin" checked={form.isAdmin} onChange={handleChange} /> Admin
          </label>
          <div style={{ margin: '8px 0' }}>
            <label>Profile Picture: <input type="file" accept="image/*" onChange={e => setProfilePic(e.target.files[0])} /></label>
          </div>
          <div style={{ margin: '8px 0' }}>
            <label>ID Document Images: <input type="file" accept="image/*" multiple onChange={e => setIdDocs(e.target.files)} /></label>
          </div>
          <button type="submit" style={btnStyle} disabled={adding}>{adding ? 'Adding...' : 'Add User'}</button>
        </form>
        <button style={{ ...btnStyle, background: '#1a1a1a', marginTop: 16 }} onClick={handleManageUsers}>Manage Users</button>
        {error && <div style={{ color: 'red', marginTop: 12 }}>{error}</div>}
      </div>
    );
  }

  // Manage users page
  if (manageMode && !selectedUser) {
    return (
      <div className="admin-container">
        <button onClick={() => window.location.href = '/'} style={{ ...btnStyle, background: '#007bff', color: '#fff', marginBottom: 12 }}>Home</button>
        <h2>Manage Users</h2>
        <button onClick={handleBack} className="btn btn-secondary">
          Back
        </button>
        <div className="users-list">
          {users.map(u => (
            <div className="user-card" key={u._id}>
              <div className="user-info">
                {u.profilePic && <img src={u.profilePic} alt="Profile" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', marginRight: 10 }} />}
                <div>
                  <span className="user-name">
                    {u.name || u.employeeId}
                    {u.isAdmin && <span className="admin-tag"> [Admin]</span>}
                  </span>
                  <span className="user-id">ID: {u.employeeId}</span>
                </div>
              </div>
              <div className="user-actions">
                <button className="btn" onClick={() => handleSelectUser(u)}>
                  View / Edit
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() => handleDeleteUser(u.employeeId)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
        {error && <div className="error-message">{error}</div>}
      </div>
    );
  }

  // User details page
  if (manageMode && selectedUser) {
    return (
      <div style={containerStyle}>
        <button onClick={handleBack} style={{ ...btnStyle, background: '#1a1a1a', marginBottom: 12 }}>Back</button>
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          {selectedUser.profilePic && (
            <img src={selectedUser.profilePic} alt="Profile" style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', marginBottom: 8 }} />
          )}
          <div style={{ fontWeight: 700, fontSize: 18 }}>{selectedUser.name || selectedUser.employeeId}</div>
          <div style={{ fontSize: 14, color: '#888' }}>ID: {selectedUser.employeeId}</div>
          {selectedUser.email && <div style={{ fontSize: 14, color: '#888' }}>Email: {selectedUser.email}</div>}
          {selectedUser.phone && <div style={{ fontSize: 14, color: '#888' }}>Phone: {selectedUser.phone}</div>}
          {selectedUser.address && <div style={{ fontSize: 14, color: '#888' }}>Address: {selectedUser.address}</div>}
          {selectedUser.idDocs && selectedUser.idDocs.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>ID Documents:</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                {selectedUser.idDocs.map((url, idx) => (
                  <a href={url} target="_blank" rel="noopener noreferrer" key={idx}>
                    <img src={url} alt={`ID Doc ${idx + 1}`} style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 6, border: '1px solid #ccc' }} />
                  </a>
                ))}
              </div>
            </div>
          )}
          {editMode ? (
            <>
              <input name="name" value={editUser.name} onChange={handleEditChange} style={inputStyle} placeholder="Name" />
              <input name="employeeId" value={editUser.employeeId} onChange={handleEditChange} style={inputStyle} placeholder="Employee ID" />
              <input name="password" value={editUser.password} onChange={handleEditChange} style={inputStyle} placeholder="New Password (leave blank to keep)" type="password" />
              <input name="email" value={editUser.email || ''} onChange={handleEditChange} style={inputStyle} placeholder="Email" />
              <input name="phone" value={editUser.phone || ''} onChange={handleEditChange} style={inputStyle} placeholder="Phone" />
              <input name="address" value={editUser.address || ''} onChange={handleEditChange} style={inputStyle} placeholder="Address" />
              <label style={{ display: 'block', margin: '8px 0' }}>
                <input type="checkbox" name="isAdmin" checked={editUser.isAdmin} onChange={handleEditChange} /> Admin
              </label>
              <div style={{ margin: '8px 0' }}>
                <label>Profile Picture: <input type="file" accept="image/*" onChange={e => setEditProfilePic(e.target.files[0])} /></label>
              </div>
              <div style={{ margin: '8px 0' }}>
                <label>ID Document Images: <input type="file" accept="image/*" multiple onChange={e => setEditIdDocs(e.target.files)} /></label>
              </div>
              <button style={{ ...btnStyle, marginTop: 8 }} onClick={handleSaveEdit}>Save</button>
              <button style={{ ...btnStyle, background: '#888', marginTop: 8 }} onClick={() => setEditMode(false)}>Cancel</button>
            </>
          ) : (
            <>
              <button style={{ ...btnStyle, marginTop: 8 }} onClick={handleEdit}>Edit</button>
            </>
          )}
        </div>
        <h4>Attendance Records</h4>
        {loadingAttendance ? <div>Loading attendance...</div> : (
          <ul style={{ padding: 0, listStyle: 'none' }}>
            {attendance.map((a, i) => (
              <li key={i} style={{...attendanceCardStyle, background: editingRecordId === a._id ? '#e6f7ff' : '#f7f7ff'}}>
                {editingRecordId === a._id ? (
                  <div>
                    <div style={{fontWeight:'bold', marginBottom:8}}>Editing Record for {a.date}</div>
                    <label style={editLabelStyle}>Start Time</label>
                    <input type="datetime-local" name="startTime" value={editRecordData.startTime} onChange={handleRecordInputChange} style={editInputStyle}/>
                    <label style={editLabelStyle}>Lunch Start</label>
                    <input type="datetime-local" name="lunchStartTime" value={editRecordData.lunchStartTime} onChange={handleRecordInputChange} style={editInputStyle}/>
                    <label style={editLabelStyle}>Lunch End</label>
                    <input type="datetime-local" name="lunchEndTime" value={editRecordData.lunchEndTime} onChange={handleRecordInputChange} style={editInputStyle}/>
                    <label style={editLabelStyle}>End Time</label>
                    <input type="datetime-local" name="endTime" value={editRecordData.endTime} onChange={handleRecordInputChange} style={editInputStyle}/>
                    <div style={{marginTop:12}}>
                      <button style={{...btnStyle, background:'#28a745', width:'auto', padding:'6px 12px', fontSize:14, marginRight:8}} onClick={() => handleSaveRecord(a._id)}>Save</button>
                      <button style={{...btnStyle, background:'#888', width:'auto', padding:'6px 12px', fontSize:14}} onClick={handleCancelEditRecord}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8}}>
                      <div><b>Date:</b> {a.date}</div>
                      <button style={{...btnStyle, width:'auto', padding:'4px 8px', fontSize:12, background:'#1a1a1a'}} onClick={() => handleEditRecord(a)}>Edit</button>
                    </div>
                    <div><b>Day:</b> {a.date ? new Date(a.date).toLocaleDateString(undefined, { weekday: 'long' }) : '--'}</div>
                    <div><b>Start:</b> {a.startTime ? new Date(a.startTime).toLocaleTimeString() : '--'} <span style={{fontSize:12, color:'#888'}}>{findLocation(a.startTime, a.locations)}</span></div>
                    <div><b>Lunch:</b> {a.lunchStartTime ? new Date(a.lunchStartTime).toLocaleTimeString() : '--'} <span style={{fontSize:12, color:'#888'}}>{findLocation(a.lunchStartTime, a.locations)}</span> - {a.lunchEndTime ? new Date(a.lunchEndTime).toLocaleTimeString() : '--'} <span style={{fontSize:12, color:'#888'}}>{findLocation(a.lunchEndTime, a.locations)}</span></div>
                    <div><b>End:</b> {a.endTime ? new Date(a.endTime).toLocaleTimeString() : '--'} <span style={{fontSize:12, color:'#888'}}>{findLocation(a.endTime, a.locations)}</span></div>
                    <div><b>Total Hours:</b> {a.totalHours ? a.totalHours.toFixed(2) : '--'}</div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
        {error && <div style={{ color: 'red', marginTop: 12 }}>{error}</div>}
      </div>
    );
  }
}

const containerStyle = {
  maxWidth: 420,
  margin: '0 auto',
  padding: 12,
  background: '#fff',
  borderRadius: 10,
  boxShadow: '0 2px 8px #eee',
  minHeight: '100vh',
};
const headerStyle = {
  textAlign: 'center',
  fontSize: 22,
  margin: '18px 0 18px 0',
};
const formStyle = {
  marginBottom: 16,
  background: '#f9f9f9',
  padding: 12,
  borderRadius: 8,
};
const btnStyle = {
  padding: 14,
  borderRadius: 8,
  fontSize: 18,
  fontWeight: 600,
  background: '#646cff',
  color: '#fff',
  border: 'none',
  width: '100%',
  maxWidth: 320,
  margin: '0 auto',
  display: 'block',
};
const inputStyle = {
  width: '100%',
  padding: 8,
  margin: '6px 0',
  borderRadius: 6,
  border: '1px solid #ccc',
};
const userCardStyle = {
  background: '#f3f3f3',
  borderRadius: 8,
  padding: 12,
  marginBottom: 10,
  boxShadow: '0 1px 4px #eee',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
};
const attendanceCardStyle = {
  background: '#f7f7ff',
  borderRadius: 8,
  padding: 10,
  marginBottom: 10,
  fontSize: 15,
};
const editLabelStyle = {
  display: 'block',
  fontSize: 13,
  fontWeight: 600,
  color: '#555',
  marginTop: 8,
};
const editInputStyle = {
  width: '100%',
  padding: 6,
  borderRadius: 4,
  border: '1px solid #ccc',
  marginTop: 4,
}; 