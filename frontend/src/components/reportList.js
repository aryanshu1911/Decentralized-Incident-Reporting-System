import { useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { getAllReports, getTrendingReports, updateReportStatus, verifyReportOnChain } from '../utils/api';

// Helper: compute a human-readable relative time string
function timeAgo(dateString) {
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

const ReportList = forwardRef(({ isAdmin = false }, ref) => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [verifications, setVerifications] = useState({});
  const [statusFilter, setStatusFilter] = useState('All'); // Admin status filter
  const [categoryFilter, setCategoryFilter] = useState('All'); // New category filter
  const [selectedImage, setSelectedImage] = useState(null);

  useImperativeHandle(ref, () => ({
    refresh: () => {
      fetchReports();
    },
  }));

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    try {
      // Admin/Investigator view uses full-data endpoint
      const data = await getAllReports();
      const reportsData = Array.isArray(data) ? data : (data.value || []);
      setReports(reportsData);

      if (isAdmin) {
        reportsData.forEach(async (report) => {
          try {
            const verifyData = await verifyReportOnChain(report.reportId);
            setVerifications(prev => ({ ...prev, [report.reportId]: verifyData }));
          } catch (e) {
            console.error("Verification failed for", report.reportId, e);
          }
        });
      }
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
    if (s === 'rejected') return 'rejected';
    return '';
  };

  // Filter reports by status and category (admin feature)
  const filteredReports = reports.filter(r => {
    const statusMatch = statusFilter === 'All' ? true : r.status === statusFilter;
    const categoryMatch = categoryFilter === 'All' ? true : r.category === categoryFilter;
    return statusMatch && categoryMatch;
  });

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0 }}><span className="icon">📋</span> All Reports</h2>
        {isAdmin && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Category:</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                style={{
                  padding: '6px 12px', borderRadius: '6px',
                  background: 'var(--bg-input)', color: 'var(--text)',
                  border: '1px solid var(--border)', fontSize: '0.85rem'
                }}
              >
                <option value="All">All Topics</option>
                <option value="Theft">Theft</option>
                <option value="Assault">Assault</option>
                <option value="Vandalism">Vandalism</option>
                <option value="Fraud">Fraud</option>
                <option value="Harassment">Harassment</option>
                <option value="Drug Activity">Drug Activity</option>
                <option value="Traffic Violation">Traffic Violation</option>
                <option value="Public Disturbance">Public Disturbance</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Status:</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{
                  padding: '6px 12px', borderRadius: '6px',
                  background: 'var(--bg-input)', color: 'var(--text)',
                  border: '1px solid var(--border)', fontSize: '0.85rem'
                }}
              >
                <option value="All">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {loading && (
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading reports...</p>
        </div>
      )}

      {!loading && filteredReports.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <p>No reports submitted yet.</p>
        </div>
      )}

      <div className="report-list">
        {filteredReports.map((report) => (
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
                  <option value="Rejected">Rejected</option>
                </select>
              ) : (
                <span className={`status-badge ${getStatusClass(report.status)}`}>
                  {report.status}
                </span>
              )}
            </div>
            <div className="report-card-body">
              {/* Relative timestamp */}
              <p className="time-ago" style={{ marginBottom: '10px' }}>
                🕐 Reported {timeAgo(report.createdAt)}
              </p>

              {/* Admin: Blockchain verification indicators */}
              {isAdmin && verifications[report.reportId] && verifications[report.reportId].reason === 'hash_mismatch' && (
                <div style={{
                  marginBottom: '16px',
                  padding: '12px',
                  backgroundColor: 'rgba(225, 112, 85, 0.1)',
                  border: '1px solid var(--error)',
                  borderRadius: '8px',
                  color: 'var(--error)'
                }}>
                  <strong>❌ TAMPERING DETECTED</strong>
                  <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>
                    The data in the database does not match the cryptographic hash secured on the blockchain.
                  </p>
                </div>
              )}
              {isAdmin && verifications[report.reportId] && verifications[report.reportId].verified && (
                <div style={{
                  marginBottom: '16px',
                  padding: '8px 12px',
                  backgroundColor: 'rgba(0, 184, 148, 0.1)',
                  border: '1px solid var(--success)',
                  borderRadius: '8px',
                  color: 'var(--success)',
                  fontSize: '0.85rem'
                }}>
                  <strong>✅ Blockchain Verified</strong>
                </div>
              )}

              <p><strong>Category:</strong> {report.category}</p>
              <p><strong>Description:</strong> {report.description}</p>
              <p><strong>Location:</strong> {report.locationText || report.location?.coordinates?.join(', ') || 'N/A'}</p>

              {report.imageCID && report.imageCID !== "NO_IMAGE" && (
                <div className="report-image" style={{ marginTop: '15px' }}>
                  <img
                    src={`https://gateway.pinata.cloud/ipfs/${report.imageCID}`}
                    alt="Evidence"
                    onClick={() => setSelectedImage(report.imageCID)}
                    style={{
                      width: '100%',
                      maxHeight: '400px',
                      objectFit: 'contain',
                      borderRadius: '12px',
                      border: '1px solid rgba(255,255,255,0.1)',
                      background: 'rgba(0,0,0,0.2)',
                      cursor: 'zoom-in'
                    }}
                  />
                </div>
              )}

              {/* Investigator: View Community Actions */}
              <div className="community-stats" style={{ marginTop: '15px', display: 'flex', gap: '15px' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  👍 <strong>{report.upvotes || 0}</strong> Upvotes
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  🚩 <strong>{report.disputes || 0}</strong> Disputes
                </span>
              </div>

              {report.txHash && report.txHash !== 'Blockchain pending' && (
                <p className="report-card-hash" style={{ marginTop: '15px', fontSize: '0.75rem', opacity: 0.7 }}>
                  ⛓️ <strong>Tx Hash:</strong> {report.txHash}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Image Modal overlay */}
      {selectedImage && (
        <div className="image-modal-overlay" onClick={() => setSelectedImage(null)}>
          <img
            src={`https://gateway.pinata.cloud/ipfs/${selectedImage}`}
            alt="Enlarged Evidence"
            className="image-modal-content"
          />
        </div>
      )}
    </div>
  );
});

export default ReportList;