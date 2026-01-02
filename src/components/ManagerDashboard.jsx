import React, { useMemo } from 'react';
import './Dashboard.css'; // Reuse some dashboard styles

const ManagerDashboard = ({ surgeries, patients, surgeons, orBlockSchedule }) => {
    // Calculate Manager-specific KPIs
    const kpis = useMemo(() => {
        const today = new Date().toISOString().split('T')[0];

        const todaySurgeries = surgeries.filter(s => s.date === today);
        const pendingSurgeries = surgeries.filter(s => s.status === 'scheduled');
        const completedSurgeries = surgeries.filter(s => s.status === 'completed');

        // Find cases with missing info (e.g., no CPT codes or empty notes)
        const alerts = surgeries.filter(s =>
            s.status === 'scheduled' &&
            (!s.cpt_codes || s.cpt_codes.length === 0 || !s.doctor_name)
        ).length;

        return {
            todayCount: todaySurgeries.length,
            pendingCount: pendingSurgeries.length,
            completedCount: completedSurgeries.length,
            alerts
        };
    }, [surgeries]);

    // Get today's schedule
    const todaySchedule = useMemo(() => {
        const today = new Date().toISOString().split('T')[0];
        return surgeries
            .filter(s => s.date === today)
            .sort((a, b) => a.start_time.localeCompare(b.start_time));
    }, [surgeries]);

    return (
        <div className="dashboard fade-in">
            <div className="dashboard-header">
                <div className="header-left">
                    <h2 className="page-title">Manager Dashboard</h2>
                    <p className="subtitle">Operational Overview & Case Management</p>
                </div>
            </div>

            <div className="dashboard-content">
                {/* KPI Row */}
                <div className="stats-hero">
                    <div className="hero-card revenue-hero">
                        <div className="hero-icon-wrapper">
                            <span className="hero-icon">📅</span>
                        </div>
                        <div className="hero-content">
                            <span className="hero-label">Cases Today</span>
                            <span className="hero-value">{kpis.todayCount}</span>
                            <span className="hero-trend positive">Active Today</span>
                        </div>
                        <div className="hero-bg-pattern"></div>
                    </div>

                    <div className="hero-card profit-hero">
                        <div className="hero-icon-wrapper">
                            <span className="hero-icon">⏳</span>
                        </div>
                        <div className="hero-content">
                            <span className="hero-label">Pending Cases</span>
                            <span className="hero-value">{kpis.pendingCount}</span>
                            <span className="hero-trend">Needs Attn</span>
                        </div>
                        <div className="hero-bg-pattern"></div>
                    </div>

                    <div className="mini-stats-column">
                        <div className="mini-stat-card">
                            <div className="mini-stat-icon cases">✅</div>
                            <div className="mini-stat-info">
                                <span className="mini-stat-label">Completed</span>
                                <span className="mini-stat-value">{kpis.completedCount}</span>
                            </div>
                        </div>
                        <div className="mini-stat-card">
                            <div className="mini-stat-icon cost">⚠️</div>
                            <div className="mini-stat-info">
                                <span className="mini-stat-label">Alerts</span>
                                <span className="mini-stat-value">{kpis.alerts}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="dashboard-grid">
                    {/* Today's Schedule Card */}
                    <div className="chart-card wide-chart">
                        <div className="chart-header">
                            <h3>Today's Surgery Schedule</h3>
                        </div>
                        <div className="table-responsive" style={{ padding: '1rem' }}>
                            {todaySchedule.length === 0 ? (
                                <div className="empty-state" style={{ textAlign: 'center', padding: '2rem' }}>
                                    <p>No surgeries scheduled for today.</p>
                                </div>
                            ) : (
                                <table className="management-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>
                                            <th style={{ padding: '0.75rem' }}>Time</th>
                                            <th style={{ padding: '0.75rem' }}>Patient</th>
                                            <th style={{ padding: '0.75rem' }}>Surgeon</th>
                                            <th style={{ padding: '0.75rem' }}>Procedure</th>
                                            <th style={{ padding: '0.75rem' }}>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {todaySchedule.map(s => (
                                            <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                <td style={{ padding: '0.75rem' }}>{s.start_time}</td>
                                                <td style={{ padding: '0.75rem' }}>{s.patients?.name || 'Unknown'}</td>
                                                <td style={{ padding: '0.75rem' }}>{s.doctor_name}</td>
                                                <td style={{ padding: '0.75rem' }}>
                                                    {s.cpt_codes?.slice(0, 2).join(', ') || 'General'}
                                                    {s.cpt_codes?.length > 2 ? '...' : ''}
                                                </td>
                                                <td style={{ padding: '0.75rem' }}>
                                                    <span className={`status-badge ${s.status}`}>
                                                        {s.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>

                    {/* Quick Stats / Info */}
                    <div className="chart-card">
                        <div className="chart-header">
                            <h3>Manager Alerts</h3>
                        </div>
                        <div className="alerts-list" style={{ padding: '1rem' }}>
                            {kpis.alerts > 0 ? (
                                <div className="alert-item" style={{ background: '#fef2f2', borderLeft: '4px solid #ef4444', padding: '1rem', borderRadius: '4px', marginBottom: '1rem' }}>
                                    <strong style={{ color: '#991b1b' }}>Information Missing</strong>
                                    <p style={{ margin: '0.25rem 0 0', color: '#b91c1c', fontSize: '0.9rem' }}>
                                        {kpis.alerts} scheduled cases are missing CPT codes or details.
                                    </p>
                                </div>
                            ) : (
                                <p style={{ color: '#64748b', fontSize: '0.9rem' }}>No urgent alerts found.</p>
                            )}

                            <div className="quick-info" style={{ marginTop: '1.5rem' }}>
                                <h4 style={{ fontSize: '0.9rem', color: '#1e293b', marginBottom: '0.5rem' }}>Recent Summary</h4>
                                <ul style={{ listStyle: 'none', padding: 0, fontSize: '0.9rem', color: '#64748b' }}>
                                    <li style={{ marginBottom: '0.5rem' }}>• Total Patients: {patients.length}</li>
                                    <li style={{ marginBottom: '0.5rem' }}>• Active Surgeons: {surgeons.length}</li>
                                    <li style={{ marginBottom: '0.5rem' }}>• Block Schedule Active</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                .status-badge {
                    padding: 4px 8px;
                    border-radius: 4px;
                    font-size: 0.75rem;
                    font-weight: 600;
                    text-transform: uppercase;
                }
                .status-badge.scheduled { background: #dbeafe; color: #1e40af; }
                .status-badge.completed { background: #d1fae5; color: #065f46; }
                .status-badge.cancelled { background: #fee2e2; color: #991b1b; }
                .status-badge.in-progress { background: #fef3c7; color: #92400e; }
            `}} />
        </div>
    );
};

export default ManagerDashboard;
