import React, { useState, useEffect } from 'react';
import './App.css';
import ReportForm from './components/reportForm';
import PublicReports from './components/PublicReports';
import TrackReport from './components/TrackReport'; // Or we can remove this, but let's keep it if users still need to look up by ID? Actually MyReports replaced the track flow, but we can replace the tab.
import MyReports from './components/MyReports';
import AdminDashboard from './components/AdminDashboard';
import Login from './components/Login';

function App() {
  const [activeTab, setActiveTab] = useState('reports'); // default to public reports
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Check if user is logged in
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    if (userData.role === 'investigator') {
      setActiveTab('admin');
    } else {
      setActiveTab('my-reports');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setActiveTab('reports');
  };

  const handleReportSubmitted = () => {
    setActiveTab('my-reports');
  };

  return (
    <div className="App">
      <header className="app-header">
        <div className="header-content">
          <div>
            <h1>Voices Unchained: Anonymous Reporting System</h1>
            <p>Report incidents securely with blockchain-backed evidence</p>
          </div>
          {user && (
            <div className="user-info">
              <span>Welcome, {user.username} ({user.role})</span>
              <button onClick={handleLogout} className="logout-btn">Logout</button>
            </div>
          )}
        </div>
      </header>

      <div className="tabs-container">
        <button
          className={`tab-btn ${activeTab === 'reports' ? 'active' : ''}`}
          onClick={() => setActiveTab('reports')}
        >📊 Public Reports</button>

        {!user && (
          <button
            className={`tab-btn ${activeTab === 'login' ? 'active' : ''}`}
            onClick={() => setActiveTab('login')}
          >🔐 Login / Register</button>
        )}

        {user && user.role === 'user' && (
          <>
            <button
              className={`tab-btn ${activeTab === 'submit' ? 'active' : ''}`}
              onClick={() => setActiveTab('submit')}
            >📝 Submit Report</button>
            <button
              className={`tab-btn ${activeTab === 'my-reports' ? 'active' : ''}`}
              onClick={() => setActiveTab('my-reports')}
            >🔍 My Reports</button>
            <button
              className={`tab-btn ${activeTab === 'track' ? 'active' : ''}`}
              onClick={() => setActiveTab('track')}
            >🆔 Track By ID</button>
          </>
        )}

        {user && user.role === 'investigator' && (
          <button
            className={`tab-btn ${activeTab === 'admin' ? 'admin-active' : ''}`}
            onClick={() => setActiveTab('admin')}
          >🛡️ Investigator Dashboard</button>
        )}
      </div>

      <div className="tab-content">
        {activeTab === 'reports' && <PublicReports />}
        {activeTab === 'login' && !user && <Login onLoginSuccess={handleLoginSuccess} />}
        {activeTab === 'submit' && user && user.role === 'user' && <ReportForm onReportSubmitted={handleReportSubmitted} />}
        {activeTab === 'my-reports' && user && user.role === 'user' && <MyReports />}
        {activeTab === 'track' && user && user.role === 'user' && <TrackReport />}
        {activeTab === 'admin' && user && user.role === 'investigator' && <AdminDashboard />}
      </div>
    </div>
  );
}

export default App;