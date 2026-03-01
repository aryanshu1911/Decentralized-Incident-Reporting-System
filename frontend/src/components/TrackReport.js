import { useState } from 'react';
import { getReportById, verifyReportOnChain } from '../utils/api';

export default function TrackReport() {
    const [reportId, setReportId] = useState('');
    const [report, setReport] = useState(null);
    const [verification, setVerification] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!reportId.trim()) return;

        setLoading(true);
        setError('');
        setReport(null);
        setVerification(null);

        try {
            // 1. Fetch the report details from MongoDB
            const reportData = await getReportById(reportId);
            setReport(reportData);

            // 2. Fetch the verification status from the Smart Contract!
            const verifyData = await verifyReportOnChain(reportId);
            setVerification(verifyData);
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.error || 'Could not find a report with that ID.');
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
            <h2><span className="icon">🔍</span> Track Your Report</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '24px', fontSize: '0.9rem' }}>
                Enter your secure Report ID to view real-time updates and cryptographically verify that your submitted evidence is safely secured on the Ethereum Blockchain.
            </p>

            <form className="report-form" onSubmit={handleSearch}>
                <div className="form-group">
                    <label htmlFor="searchId">Secure Report ID</label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <input
                            type="text"
                            id="searchId"
                            placeholder="e.g. 1772362000059"
                            value={reportId}
                            onChange={(e) => setReportId(e.target.value)}
                            style={{ flex: 1 }}
                        />
                        <button type="submit" className="btn-submit" style={{ marginTop: 0 }} disabled={loading}>
                            {loading ? 'Searching...' : 'Track'}
                        </button>
                    </div>
                </div>
            </form>

            {error && <div className="message error" style={{ marginTop: '24px' }}>{error}</div>}

            {report && (
                <div className="report-card" style={{ marginTop: '24px', animation: 'slideIn 0.4s ease' }}>
                    <div className="report-card-header">
                        <span className="report-card-id">Report ID: {report.reportId}</span>
                        <span className={`status-badge ${getStatusClass(report.status)}`}>
                            {report.status}
                        </span>
                    </div>

                    <div className="report-card-body">
                        <p><strong>Category:</strong> {report.category}</p>
                        <p><strong>Description:</strong> {report.description}</p>
                        <p><strong>Location:</strong> {report.location}</p>
                        <p><strong>Submitted On:</strong> {new Date(report.createdAt).toLocaleString()}</p>

                        {/* Cryptographic Verification Box */}
                        {verification && (
                            <div className="verification-box" style={{
                                marginTop: '16px',
                                padding: '16px',
                                background: verification.verified ? 'rgba(0, 184, 148, 0.1)' : 'rgba(225, 112, 85, 0.1)',
                                border: `1px solid ${verification.verified ? 'rgba(0, 184, 148, 0.3)' : 'rgba(225, 112, 85, 0.3)'}`,
                                borderRadius: '8px'
                            }}>
                                <h4 style={{
                                    color: verification.verified ? 'var(--success)' : 'var(--error)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    marginBottom: '8px'
                                }}>
                                    {verification.verified ? '✅ On-Chain Verification Passed' : '❌ Blockchain Verification Failed'}
                                </h4>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{verification.message}</p>
                                {verification.blockchainHash && (
                                    <div className="tx-hash-display" style={{ marginTop: '8px', paddingTop: '8px' }}>
                                        <strong>Secured Hash:</strong><br />
                                        <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', wordBreak: 'break-all' }}>
                                            {verification.blockchainHash}
                                        </span>
                                    </div>
                                )}
                                {report.txHash && report.txHash !== 'Blockchain pending' && (
                                    <div className="tx-hash-display" style={{ marginTop: '4px', paddingTop: '4px', borderTop: 'none' }}>
                                        <strong>Ethereum Tx:</strong><br />
                                        <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', wordBreak: 'break-all' }}>
                                            {report.txHash}
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}

                        {report.imageCID && (
                            <div className="report-image" style={{ marginTop: '20px' }}>
                                <p style={{ marginBottom: '8px' }}><strong>Evidence Image:</strong></p>
                                <img
                                    src={`https://gateway.pinata.cloud/ipfs/${report.imageCID}`}
                                    alt="Report evidence"
                                    style={{ maxWidth: '100%', borderRadius: '8px' }}
                                />
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
