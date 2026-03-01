import { useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { getReports, updateReportStatus } from '../utils/api';

const ReportList = forwardRef(({ isAdmin = false }, ref) => {
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

  const handleStatusChange = async (reportId, newStatus) => {
    try {
      // Optimistic UI update
      setReports((prev) =>
        prev.map(r => r.reportId === reportId ? { ...r, status: newStatus } : r)
      );
      // Actual API call which updates Mongo + Smart Contract
      await updateReportStatus(reportId, newStatus);
    } catch (err) {
      console.error("Failed to update status:", err);
      // Revert on failure by refreshing
      fetchReports();
      alert("Failed to sync status to Blockchain. Please try again.");
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
              {isAdmin ? (
                <select
                  value={report.status}
                  onChange={(e) => handleStatusChange(report.reportId, e.target.value)}
                  className={`status-badge ${getStatusClass(report.status)}`}
                  style={{ cursor: 'pointer', border: 'none', appearance: 'auto' }}
                >
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                </select>
              ) : (
                <span className={`status-badge ${getStatusClass(report.status)}`}>
                  {report.status}
                </span>
              )}
            </div>
            <div className="report-card-body">
              <p><strong>Category:</strong> {report.category}</p>
              <p><strong>Description:</strong> {report.description}</p>
              <p><strong>Location:</strong> {report.location}</p>
              {report.txHash && report.txHash !== 'Blockchain pending' && (
                <p className="report-card-hash">⛓️ <strong>Tx Hash:</strong> <span>{report.txHash}</span></p>
              )}
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