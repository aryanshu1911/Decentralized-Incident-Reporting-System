import { useState, useRef } from 'react';
import ReportList from './reportList';

export default function AdminDashboard() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const reportListRef = useRef();

    const handleLogin = (e) => {
        e.preventDefault();
        // Hardcoded password for MVP purposes (as requested in plan)
        if (password === 'admin123') {
            setIsAuthenticated(true);
            setError('');
        } else {
            setError('Invalid investigator passcode.');
            setPassword('');
        }
    };

    if (!isAuthenticated) {
        return (
            <div className="card" style={{ maxWidth: '400px', margin: '40px auto', textAlign: 'center' }}>
                <h2><span className="icon">🔐</span> Investigator Login</h2>
                <p style={{ color: 'var(--text-muted)', marginBottom: '24px', fontSize: '0.9rem' }}>
                    Restricted Area. Please enter your authorized passcode to access the Admin Dashboard.
                </p>
                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <input
                        type="password"
                        placeholder="Enter Passcode..."
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        style={{
                            padding: '12px',
                            borderRadius: '8px',
                            border: '1px solid var(--border)',
                            background: 'var(--bg-input)',
                            color: 'var(--text)',
                            textAlign: 'center',
                            letterSpacing: '2px'
                        }}
                    />
                    {error && <div style={{ color: 'var(--error)', fontSize: '0.85rem' }}>{error}</div>}
                    <button type="submit" className="btn-submit" style={{ margin: 0 }}>
                        Authenticate
                    </button>
                </form>
            </div>
        );
    }

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ color: 'var(--primary-light)' }}>
                    <span className="icon" style={{ marginRight: '8px' }}>🛡️</span>
                    Authorized Dashboard
                </h3>
                <button
                    onClick={() => setIsAuthenticated(false)}
                    style={{
                        background: 'transparent',
                        border: '1px solid var(--border)',
                        color: 'var(--text-muted)',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        cursor: 'pointer'
                    }}
                >
                    Logout
                </button>
            </div>

            {/* Render the Report List but pass the isAdmin flag */}
            <ReportList ref={reportListRef} isAdmin={true} />
        </div>
    );
}
