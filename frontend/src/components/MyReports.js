import React, { useState, useEffect } from 'react';
import { getMyReports } from '../utils/api';

const MyReports = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchMyReports();
  }, []);

  const fetchMyReports = async () => {
    try {
      const data = await getMyReports();
      setReports(data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch your reports. Make sure you are logged in.');
      setLoading(false);
    }
  };

  if (loading) return <div>Loading your past reports...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="reports-container">
      <h2>My Past Reports</h2>
      {reports.length === 0 ? (
        <p>You haven't submitted any reports yet.</p>
      ) : (
        <div className="reports-list">
          {reports.map((report) => (
            <div key={report.reportId} className="report-card">
              <div className="report-header">
                <h3>Report ID: {report.reportId}</h3>
                <span className={`status-badge status-${report.status.toLowerCase().replace(' ', '-')}`}>
                  {report.status}
                </span>
              </div>
              <p><strong>Category:</strong> {report.category}</p>
              <p><strong>Description:</strong> {report.description}</p>
              <p><strong>Location:</strong> {report.locationText}</p>
              <p><strong>Submitted:</strong> {new Date(report.createdAt).toLocaleString()}</p>
              
              {report.imageCID && report.imageCID !== "NO_IMAGE" && (
                <div className="report-image-preview">
                  <p><strong>Evidence Image:</strong></p>
                  <img 
                    src={`https://gateway.pinata.cloud/ipfs/${report.imageCID}`} 
                    alt="Evidence" 
                    className="evidence-img"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyReports;
