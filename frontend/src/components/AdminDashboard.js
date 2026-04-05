import { useRef } from 'react';
import ReportList from './reportList';

export default function AdminDashboard() {
    const reportListRef = useRef();

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ color: 'var(--primary-light)' }}>
                    <span className="icon" style={{ marginRight: '8px' }}>🛡️</span>
                    Authorized Dashboard
                </h3>
            </div>

            {/* Render the Report List but pass the isAdmin flag */}
            <ReportList ref={reportListRef} isAdmin={true} />
        </div>
    );
}
