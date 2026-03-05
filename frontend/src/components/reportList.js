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
  const [viewMode, setViewMode] = useState('recent'); // 'recent' | 'trending'
  const [locationError, setLocationError] = useState('');
  const [statusFilter, setStatusFilter] = useState('All'); // Admin status filter

  useImperativeHandle(ref, () => ({
    refresh: () => {
      if (viewMode === 'recent') fetchReports();
      else fetchTrendingReports();
    },
  }));

  useEffect(() => {
    if (viewMode === 'recent') {
      fetchReports();
    } else {
      fetchTrendingReports();
    }
  }, [viewMode]);

  // Default center coordinates (Mumbai) used when user denies location access
  const DEFAULT_CENTER = { lat: 19.0760, lng: 72.8777 };

  const fetchTrendingReports = async () => {
    setLoading(true);
    setLocationError('');

    const fetchFromCoords = async (lat, lng, isDefault = false) => {
      try {
        const data = await getTrendingReports(lat, lng);
        setReports(data);

        if (isDefault) {
          setLocationError('Location access denied. Showing trending reports near default center (Mumbai).');
        }

        if (isAdmin) {
          data.forEach(async (report) => {
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
        setLocationError('Error fetching trending reports.');
      } finally {
        setLoading(false);
      }
    };

    if (!navigator.geolocation) {
      await fetchFromCoords(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng, true);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        await fetchFromCoords(position.coords.latitude, position.coords.longitude);
      },
      async () => {
        await fetchFromCoords(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng, true);
      }
    );
  };

  const fetchReports = async () => {
    setLoading(true);
    try {
      // Admin view uses full-data endpoint
      const data = await getAllReports();
      setReports(data);

      if (isAdmin) {
        data.forEach(async (report) => {
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

  // Filter reports by status (admin feature)
  const filteredReports = statusFilter === 'All'
    ? reports
    : reports.filter(r => r.status === statusFilter);

  return (
    <div className="card">
      <h2><span className="icon">📋</span> All Reports</h2>

      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
        <button
          onClick={() => setViewMode('recent')}
          className="btn-submit"
          style={{
            backgroundColor: viewMode === 'recent' ? '#1976d2' : '#e0e0e0',
            color: viewMode === 'recent' ? '#fff' : '#333',
            flex: 1
          }}
        >
          Recent Activity
        </button>
        <button
          onClick={() => setViewMode('trending')}
          className="btn-submit"
          style={{
            backgroundColor: viewMode === 'trending' ? '#1976d2' : '#e0e0e0',
            color: viewMode === 'trending' ? '#fff' : '#333',
            flex: 1
          }}
        >
          🔥 Trending Near Me
        </button>
      </div>

      {/* Admin status filter */}
      {isAdmin && (
        <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            Filter by Status:
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '6px 12px', borderRadius: '6px',
              background: 'var(--bg-input)', color: 'var(--text)',
              border: '1px solid var(--border)', fontSize: '0.85rem'
            }}
          >
            <option value="All">All</option>
            <option value="Pending">Pending</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
            <option value="Rejected">Rejected</option>
          </select>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            ({filteredReports.length} report{filteredReports.length !== 1 ? 's' : ''})
          </span>
        </div>
      )}

      {locationError && (
        <div style={{ marginBottom: '15px', color: 'var(--error)' }}>
          ⚠️ {locationError}
        </div>
      )}

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
                    This report may have been manipulated!
                  </p>
                </div>
              )}
              {isAdmin && verifications[report.reportId] && (verifications[report.reportId].reason === 'not_on_chain' || verifications[report.reportId].reason === 'no_blockchain_data' || verifications[report.reportId].reason === 'error') && (
                <div style={{
                  marginBottom: '16px',
                  padding: '8px 12px',
                  backgroundColor: 'rgba(255, 193, 7, 0.1)',
                  border: '1px solid rgba(255, 193, 7, 0.5)',
                  borderRadius: '8px',
                  color: '#e6a800',
                  fontSize: '0.85rem'
                }}>
                  <strong>⚠️ Not Found on Blockchain</strong>
                  <p style={{ fontSize: '0.8rem', marginTop: '4px', opacity: 0.85 }}>
                    {verifications[report.reportId].message || 'This report is not currently on the blockchain node. The node may have been restarted.'}
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
                  <strong>✅ Blockchain Verified (Untampered)</strong>
                </div>
              )}

              {/* Trending score (only in trending view) */}
              {viewMode === 'trending' && report.score !== undefined && (
                <div style={{ backgroundColor: 'rgba(25, 118, 210, 0.1)', padding: '10px', borderRadius: '5px', marginBottom: '10px', border: '1px solid rgba(25, 118, 210, 0.3)' }}>
                  <strong style={{ color: '#1976d2' }}>🔥 Trending Score:</strong> {report.score.toFixed(2)} <br />
                  <strong>📍 Distance:</strong> {(report.distance / 1000).toFixed(2)} km <br />
                  <span style={{ fontSize: '0.85rem' }}>👍 Upvotes: {report.upvotes || 0} | 💬 Comments: {report.commentsCount || 0} | 🚨 Severity: {report.severity || 1}</span>
                </div>
              )}

              <p><strong>Category:</strong> {report.category}</p>
              <p><strong>Description:</strong> {report.description}</p>
              <p><strong>Location:</strong> {report.locationText || report.location}</p>
              {report.txHash && report.txHash !== 'Blockchain pending' && (
                <p className="report-card-hash">⛓️ <strong>Tx Hash:</strong> <span>{report.txHash}</span></p>
              )}
              {report.imageCID && report.imageCID !== "NO_IMAGE" && (
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