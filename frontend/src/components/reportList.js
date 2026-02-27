import { useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { getReports } from '../utils/api';

const ReportList = forwardRef((props, ref) => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useImperativeHandle(ref, () => ({
    refresh: fetchReports,
  }));

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const data = await getReports();
      setReports(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusClass = (status) => {
    if (!status) return '';
    const s = status.toLowerCase();
    if (s === 'pending') return 'pending';
    if (s === 'resolved') return 'resolved';
    if (s === 'in progress' || s === 'in-progress') return 'in-progress';
    return '';
  };

  return (
    <div className="card">
      <h2><span className="icon">📋</span> All Reports</h2>

      {loading && (
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading reports...</p>
        </div>
      )}

      {!loading && reports.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <p>No reports submitted yet.</p>
        </div>
      )}

      <div className="report-list">
        {reports.map((report) => (
          <div className="report-card" key={report.reportId}>
            <div className="report-card-header">
              <span className="report-card-id">ID: {report.reportId}</span>
              <span className={`status-badge ${getStatusClass(report.status)}`}>
                {report.status}
              </span>
            </div>
            <div className="report-card-body">
              <p><strong>Category:</strong> {report.category}</p>
              <p><strong>Description:</strong> {report.description}</p>
              <p><strong>Location:</strong> {report.location}</p>
              {report.imageCID && (
                <div className="report-image">
                  <img
                    src={`https://gateway.pinata.cloud/ipfs/${report.imageCID}`}
                    alt="Report evidence"
                  />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

export default ReportList;