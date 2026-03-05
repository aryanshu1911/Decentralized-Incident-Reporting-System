import React, { useState } from 'react';
import './App.css';
import ReportForm from './components/reportForm';
import PublicReports from './components/PublicReports';
import TrackReport from './components/TrackReport';
import AdminDashboard from './components/AdminDashboard';

function App() {
  const [activeTab, setActiveTab] = useState('submit'); // 'submit', 'reports', 'track', 'admin'

  const handleReportSubmitted = () => {
    // Optionally automatically switch to the Track tab so the user can see their verification immediately
    setActiveTab('track');
  };

  return (
    <div className="App">
      <header className="app-header">
        <h1>🛡️ Anonymous Reporting System</h1>
        <p>Report incidents securely with blockchain-backed evidence</p>
      </header>

      <div className="tabs-container">
        <button
          className={`tab-btn ${activeTab === 'submit' ? 'active' : ''}`}
          onClick={() => setActiveTab('submit')}
        >📝 Submit Report</button>
        <button
          className={`tab-btn ${activeTab === 'reports' ? 'active' : ''}`}
          onClick={() => setActiveTab('reports')}
        >📊 Reports</button>
        <button
          className={`tab-btn ${activeTab === 'track' ? 'active' : ''}`}
          onClick={() => setActiveTab('track')}
        >🔍 Track My Report</button>
        <button
          className={`tab-btn ${activeTab === 'admin' ? 'admin-active' : ''}`}
          onClick={() => setActiveTab('admin')}
        >🔐 Investigator Login</button>
      </div>

      <div className="tab-content">
        {activeTab === 'submit' && <ReportForm onReportSubmitted={handleReportSubmitted} />}
        {activeTab === 'reports' && <PublicReports />}
        {activeTab === 'track' && <TrackReport />}
        {activeTab === 'admin' && <AdminDashboard />}
      </div>
    </div>
  );
}

export default App;