import { useEffect, useState } from 'react';
import { getReports, getTrendingReports } from '../utils/api';

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

// Helper: truncate description for public summary
function truncate(text, maxLen = 120) {
    if (!text || text.length <= maxLen) return text;
    return text.substring(0, maxLen) + '…';
}

export default function PublicReports() {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState('recent'); // 'recent' | 'trending'
    const [locationError, setLocationError] = useState('');

    const DEFAULT_CENTER = { lat: 19.0760, lng: 72.8777 };

    useEffect(() => {
        if (viewMode === 'recent') {
            fetchRecent();
        } else {
            fetchTrending();
        }
    }, [viewMode]);

    const fetchRecent = async () => {
        setLoading(true);
        setLocationError('');
        try {
            const data = await getReports();
            setReports(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchTrending = async () => {
        setLoading(true);
        setLocationError('');

        const fetchFromCoords = async (lat, lng, isDefault = false) => {
            try {
                const data = await getTrendingReports(lat, lng);
                setReports(data);
                if (isDefault) {
                    setLocationError('Location access denied. Showing trending near default center (Mumbai).');
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
            async (pos) => await fetchFromCoords(pos.coords.latitude, pos.coords.longitude),
            async () => await fetchFromCoords(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng, true)
        );
    };

    return (
        <div className="card">
            <h2><span className="icon">📊</span> Public Reports</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '20px', fontSize: '0.9rem' }}>
                Browse recently submitted and trending incident reports. For full report details, use "Track My Report" with your Report ID.
            </p>

            {/* View mode toggle */}
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
                    🕐 Recent
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

            {locationError && (
                <div style={{ marginBottom: '15px', color: 'var(--error)', fontSize: '0.85rem' }}>
                    ⚠️ {locationError}
                </div>
            )}

            {loading && (
                <div className="loading">
                    <div className="spinner"></div>
                    <p>Loading reports...</p>
                </div>
            )}

            {!loading && reports.length === 0 && (
                <div className="empty-state">
                    <div className="empty-icon">📭</div>
                    <p>No reports found.</p>
                </div>
            )}

            <div className="report-list">
                {reports.map((report) => (
                    <div className="report-card" key={report.reportId || report._id}>
                        <div className="report-card-header">
                            <span className="time-ago">🕐 Reported {timeAgo(report.createdAt)}</span>
                            <span className={`status-badge ${getStatusClass(report.status)}`}>
                                {report.status}
                            </span>
                        </div>
                        <div className="report-card-body">
                            {/* Trending score (only in trending view) */}
                            {viewMode === 'trending' && report.score !== undefined && (
                                <div style={{
                                    backgroundColor: 'rgba(25, 118, 210, 0.1)',
                                    padding: '10px',
                                    borderRadius: '5px',
                                    marginBottom: '10px',
                                    border: '1px solid rgba(25, 118, 210, 0.3)'
                                }}>
                                    <strong style={{ color: '#1976d2' }}>🔥 Score:</strong> {report.score.toFixed(2)}
                                    {' · '}
                                    <strong>📍</strong> {(report.distance / 1000).toFixed(2)} km away
                                </div>
                            )}
                            <p><strong>Category:</strong> {report.category}</p>
                            <p><strong>Description:</strong> {truncate(report.description)}</p>
                            <p><strong>Location:</strong> {report.locationText}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
