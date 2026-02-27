import React, { useRef } from 'react';
import './App.css';
import ReportForm from './components/reportForm';
import ReportList from './components/reportList';

function App() {
  const reportListRef = useRef();

  const handleReportSubmitted = () => {
    if (reportListRef.current) {
      reportListRef.current.refresh();
    }
  };

  return (
    <div className="App">
      <header className="app-header">
        <h1>🛡️ Crime & Social Issue Reporting</h1>
        <p>Report incidents securely with blockchain-backed evidence</p>
      </header>
      <ReportForm onReportSubmitted={handleReportSubmitted} />
      <hr className="divider" />
      <ReportList ref={reportListRef} />
    </div>
  );
}

export default App;