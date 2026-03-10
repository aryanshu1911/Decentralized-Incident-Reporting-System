import { useEffect, useState } from 'react';
import { getReports, getTrendingReports, upvoteReport, disputeReport } from '../utils/api';

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

// Helper: get CSS class for status badge
function getStatusClass(status) {
    if (!status) return '';
    const s = status.toLowerCase();
    if (s === 'pending') return 'pending';
    if (s === 'resolved') return 'resolved';
    if (s === 'in progress' || s === 'in-progress') return 'in-progress';
    if (s === 'rejected') return 'rejected';
    return '';
}


export default function PublicReports() {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedImage, setSelectedImage] = useState(null);
    const [votingIds, setVotingIds] = useState(new Set()); // track which reports are currently being voted on to prevent double clicks
    const [votedReports, setVotedReports] = useState(new Set()); // simple local tracking to prevent immediate re-voting
    const [categoryFilter, setCategoryFilter] = useState('All'); // New state for filtering

    useEffect(() => {
        fetchReports();
    }, []);

    const fetchReports = async () => {
        setLoading(true);
        try {
            const data = await getReports();
            // Handle both array and wrapped response { value: [], Count: X }
            const reportsData = Array.isArray(data) ? data : (data.value || []);
            setReports(reportsData);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleVote = async (reportId, type) => {
        if (votingIds.has(reportId) || votedReports.has(reportId)) return;

        setVotingIds(prev => new Set(prev).add(reportId));

        try {
            if (type === 'upvote') {
                const res = await upvoteReport(reportId);
                setReports(reports.map(r => r.reportId === reportId ? { ...r, upvotes: res.upvotes } : r));
            } else if (type === 'dispute') {
                const res = await disputeReport(reportId);
                setReports(reports.map(r => r.reportId === reportId ? { ...r, disputes: res.disputes } : r));
            }
            // Mark as voted for this session
            setVotedReports(prev => new Set(prev).add(reportId));
        } catch (err) {
            console.error("Failed to submit vote:", err);
            alert("Failed to submit vote. Please try again.");
        } finally {
            setVotingIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(reportId);
                return newSet;
            });
        }
    };

    const filteredReports = categoryFilter === 'All'
        ? reports
        : reports.filter(r => r.category === categoryFilter);

    return (
        <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h2 style={{ margin: 0 }}><span className="icon">📊</span> Public Reports</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                        Category:
                    </label>
                    <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        style={{
                            padding: '6px 12px', borderRadius: '6px',
                            background: 'var(--bg-input)', color: 'var(--text)',
                            border: '1px solid var(--border)', fontSize: '0.85rem'
                        }}
                    >
                        <option value="All">All Categories</option>
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
            </div>
            <p style={{ color: 'var(--text-muted)', marginBottom: '20px', fontSize: '0.9rem' }}>
                Browse recently submitted incident reports. For full report details, use "Track My Report" with your Report ID.
            </p>

            {loading && (
                <div className="loading">
                    <div className="spinner"></div>
                    <p>Loading reports...</p>
                </div>
            )}

            {!loading && filteredReports.length === 0 && (
                <div className="empty-state">
                    <div className="empty-icon">📭</div>
                    <p>No reports found for this filter.</p>
                </div>
            )}

            <div className="report-list">
                {filteredReports.map((report) => (
                    <div className="report-card" key={report.reportId || report._id}>
                        <div className="report-card-header">
                            <span className="time-ago">🕐 Reported {timeAgo(report.createdAt)}</span>
                            <div className="report-badges">
                                {report.isTampered ? (
                                    <span className="badge-tampered" title="Data has been modified since submission!">❌ Tampered</span>
                                ) : report.txHash && report.txHash !== 'Blockchain pending' ? (
                                    <span className="badge-authentic" title="Secured on Blockchain">🛡️ Authentic</span>
                                ) : (
                                    <span className="badge-pending-chain" title="Awaiting Blockchain Confirmation">⏳ Pending Chain</span>
                                )}
                                <span className={`status-badge ${getStatusClass(report.status)}`}>
                                    {report.status}
                                </span>
                            </div>
                        </div>
                        <div className="report-card-body">
                            <p><strong>Category:</strong> {report.category}</p>
                            <p><strong>Description:</strong> {report.description}</p>
                            <p><strong>Location:</strong> {report.locationText}</p>

                            {report.imageCID && report.imageCID !== 'NO_IMAGE' && (
                                <div className="report-image-container" style={{ marginTop: '15px' }}>
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

                            {/* Community Validation Section */}
                            <div className="community-validation">
                                <button
                                    className={`vote-btn upvote ${votedReports.has(report.reportId) ? 'disabled' : ''}`}
                                    onClick={() => handleVote(report.reportId, 'upvote')}
                                    disabled={votingIds.has(report.reportId) || votedReports.has(report.reportId)}
                                >
                                    👍 <span className="vote-count">{report.upvotes || 0}</span>
                                </button>
                                <button
                                    className={`vote-btn dispute ${votedReports.has(report.reportId) ? 'disabled' : ''}`}
                                    onClick={() => handleVote(report.reportId, 'dispute')}
                                    disabled={votingIds.has(report.reportId) || votedReports.has(report.reportId)}
                                >
                                    🚩 <span className="vote-count">{report.disputes || 0}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

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
}
