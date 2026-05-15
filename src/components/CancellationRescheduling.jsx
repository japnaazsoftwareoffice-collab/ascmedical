import React, { useState, useMemo } from 'react';
import './Management.css';
import { formatCurrency, getSurgeryMetrics } from '../utils/hospitalUtils';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';

const CancellationRescheduling = ({ surgeries, surgeons, patients, cptCodes, settings, procedureGroupItems = [], billing = [] }) => {
    const [activeTab, setActiveTab] = useState('cancelled'); // 'cancelled' or 'rescheduled'
    const [outcomeView, setOutcomeView] = useState('all'); // 'all' or 'daily'
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

    // Filter surgeries based on status
    const cancelledSurgeries = surgeries.filter(s => s.status === 'cancelled')
        .sort((a, b) => new Date(b.date) - new Date(a.date)); // Newest first

    const rescheduledSurgeries = surgeries.filter(s => s.status === 'rescheduled')
        .sort((a, b) => new Date(b.date) - new Date(a.date)); // Newest first

    const displaySurgeries = activeTab === 'cancelled' ? cancelledSurgeries : rescheduledSurgeries;

    const getPatientName = (id, surgery) => {
        if (surgery.patients) {
            const p = surgery.patients;
            return p.name || `${p.firstname || p.first_name || ''} ${p.lastname || p.last_name || ''}`.trim() || 'Unknown';
        }
        if (surgery.patient_name) return surgery.patient_name;

        const patient = patients.find(p => p.id === id);
        if (!patient) return 'Unknown';
        return patient.name || `${patient.firstname || patient.first_name || ''} ${patient.lastname || patient.last_name || ''}`.trim();
    };

    const getSurgeonName = (id, surgery) => {
        if (surgery.doctor_name) return `Dr. ${surgery.doctor_name}`;
        if (surgery.surgeons) {
            const s = surgery.surgeons;
            if (s.firstname && s.lastname) return `Dr. ${s.firstname} ${s.lastname}`;
            return `Dr. ${s.name}`;
        }

        const surgeon = surgeons.find(s => s.id === id);
        return surgeon ? `Dr. ${surgeon.name}` : 'Unknown';
    };

    const [showChart, setShowChart] = useState(false);

    // Filter surgeries for analysis
    const filteredSurgeriesForAnalysis = outcomeView === 'daily'
        ? surgeries.filter(s => {
            const sDate = new Date(s.date).toISOString().split('T')[0];
            return sDate === selectedDate;
        })
        : surgeries;

    // Calculate chart data for all statuses using filtered surgeries
    const completedSurgeries = filteredSurgeriesForAnalysis.filter(s => s.status === 'completed').length;
    const scheduledSurgeries = filteredSurgeriesForAnalysis.filter(s => s.status === 'scheduled').length;
    const cancelledCount = filteredSurgeriesForAnalysis.filter(s => s.status === 'cancelled').length;
    const rescheduledCount = filteredSurgeriesForAnalysis.filter(s => s.status === 'rescheduled').length;

    // Total should be the sum relative to the data we have
    const total = filteredSurgeriesForAnalysis.length;

    const completedPercentage = total > 0 ? (completedSurgeries / total) * 100 : 0;
    const scheduledPercentage = total > 0 ? (scheduledSurgeries / total) * 100 : 0;
    const cancelledPercentage = total > 0 ? (cancelledCount / total) * 100 : 0;
    const rescheduledPercentage = total > 0 ? (rescheduledCount / total) * 100 : 0;

    // Calculate Financial Loss for Cancelled Surgeries
    const financialImpact = useMemo(() => {
        const cancelled = surgeries.filter(s => s.status === 'cancelled');
        let totalRevenueLost = 0;
        let totalIdleRoomCost = 0;
        let totalIdleLaborCost = 0;

        cancelled.forEach(s => {
            const metrics = getSurgeryMetrics(s, cptCodes, settings, procedureGroupItems, billing);
            totalRevenueLost += metrics.totalRevenue;
            totalIdleRoomCost += metrics.internalRoomCost;
            totalIdleLaborCost += metrics.laborCost;
        });

        return {
            revenueLost: totalRevenueLost,
            idleCosts: totalIdleRoomCost + totalIdleLaborCost,
            totalImpact: totalRevenueLost + totalIdleRoomCost + totalIdleLaborCost,
            count: cancelled.length
        };
    }, [surgeries, cptCodes, settings, procedureGroupItems, billing]);

    const pieData = useMemo(() => {
        return [
            { name: 'Completed', value: completedSurgeries, color: '#10b981' },
            { name: 'Scheduled', value: scheduledSurgeries, color: '#3b82f6' },
            { name: 'Cancelled', value: cancelledCount, color: '#dc2626' },
            { name: 'Rescheduled', value: rescheduledCount, color: '#f59e0b' }
        ].filter(d => d.value > 0);
    }, [completedSurgeries, scheduledSurgeries, cancelledCount, rescheduledCount]);

    const chartColors = ['#10b981', '#3b82f6', '#dc2626', '#f59e0b'];

    return (
        <div className="management-container fade-in">
            <div className="management-header">
                <h2 className="management-title">Cancellation & Rescheduling</h2>
            </div>

            <div className="tabs-container" style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center' }}>
                <button
                    className={`tab-btn ${activeTab === 'cancelled' ? 'active' : ''}`}
                    onClick={() => setActiveTab('cancelled')}
                    style={{
                        padding: '0.75rem 1.5rem',
                        borderRadius: '8px',
                        marginRight: '1rem',
                        background: activeTab === 'cancelled' ? '#dc2626' : 'white',
                        color: activeTab === 'cancelled' ? 'white' : '#64748b',
                        border: '1px solid #e2e8f0',
                        cursor: 'pointer',
                        fontWeight: '600'
                    }}
                >
                    Cancelled ({cancelledSurgeries.length})
                </button>
                <button
                    className={`tab-btn ${activeTab === 'rescheduled' ? 'active' : ''}`}
                    onClick={() => setActiveTab('rescheduled')}
                    style={{
                        padding: '0.75rem 1.5rem',
                        borderRadius: '8px',
                        marginRight: '1rem',
                        background: activeTab === 'rescheduled' ? '#f59e0b' : 'white',
                        color: activeTab === 'rescheduled' ? 'white' : '#64748b',
                        border: '1px solid #e2e8f0',
                        cursor: 'pointer',
                        fontWeight: '600'
                    }}
                >
                    Rescheduled ({rescheduledSurgeries.length})
                </button>

                <button
                    onClick={() => setShowChart(true)}
                    style={{
                        padding: '0.75rem 1.5rem',
                        borderRadius: '8px',
                        background: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        cursor: 'pointer',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        marginLeft: 'auto'
                    }}
                >
                    <span>📊</span> Analysis
                </button>
            </div>

            <div className="content-card">
                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Original Date</th>
                                <th>Original Time</th>
                                <th>Patient</th>
                                <th>Surgeon</th>
                                <th>Status</th>
                                <th>Notes</th>
                                {activeTab === 'rescheduled' && <th>New Date</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {displaySurgeries.length === 0 ? (
                                <tr>
                                    <td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>
                                        No {activeTab} surgeries found.
                                    </td>
                                </tr>
                            ) : (
                                displaySurgeries.map(surgery => (
                                    <tr key={surgery.id}>
                                        <td>{new Date(surgery.date).toLocaleDateString()}</td>
                                        <td>{surgery.start_time}</td>
                                        <td style={{ fontWeight: '500' }}>{getPatientName(surgery.patient_id, surgery)}</td>
                                        <td>{getSurgeonName(surgery.surgeon_id, surgery)}</td>
                                        <td>
                                            <span className={`status-badge status-${surgery.status}`} style={{ textTransform: 'capitalize' }}>
                                                {surgery.status}
                                            </span>
                                        </td>
                                        <td style={{ maxWidth: '300px' }}>
                                            {surgery.notes || '-'}
                                        </td>
                                        {activeTab === 'rescheduled' && (
                                            /* We might want to link/show the new date if we had a link, 
                                               but for now we just show the old record which is 'rescheduled'. 
                                               Ideally we'd have a 'rescheduled_to_id' but we didn't add that column.
                                               So we just show the list of old (rescheduled) slots.
                                            */
                                            <td>
                                                {(() => {
                                                    const match = surgery.notes && surgery.notes.match(/Rescheduled to (\d{4}-\d{2}-\d{2})/);
                                                    if (match && match[1]) {
                                                        return (
                                                            <span style={{ fontWeight: '600', color: '#059669' }}>
                                                                {new Date(match[1]).toLocaleDateString()}
                                                            </span>
                                                        );
                                                    }
                                                    return <span style={{ fontSize: '0.85rem', color: '#64748b' }}>(See Schedule)</span>;
                                                })()}
                                            </td>
                                        )}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Financial Loss Analysis Section */}
            <div className="section-header" style={{ marginTop: '2rem' }}>
                <h3>Financial Impact Analysis</h3>
                <span className="or-info-badge" style={{ background: '#fef2f2', color: '#dc2626' }}>
                    Critical Loss Tracking
                </span>
            </div>

            <div className="stats-grid" style={{ marginBottom: '2rem' }}>
                <div className="stat-card" style={{ borderLeft: '4px solid #dc2626' }}>
                    <div className="stat-content">
                        <div className="stat-label">Potential Revenue Lost</div>
                        <div className="stat-value" style={{ color: '#dc2626' }}>
                            {formatCurrency(financialImpact.revenueLost)}
                        </div>
                        <div className="stat-sublabel">From {financialImpact.count} cancelled cases</div>
                    </div>
                    <div className="stat-icon" style={{ backgroundColor: '#fef2f2', color: '#dc2626' }}>
                        💸
                    </div>
                </div>

                <div className="stat-card" style={{ borderLeft: '4px solid #ef4444' }}>
                    <div className="stat-content">
                        <div className="stat-label">Idle Resource Costs</div>
                        <div className="stat-value" style={{ color: '#ef4444' }}>
                            {formatCurrency(financialImpact.idleCosts)}
                        </div>
                        <div className="stat-sublabel">Sunk Room & Labor Expense</div>
                    </div>
                    <div className="stat-icon" style={{ backgroundColor: '#fff5f5', color: '#ef4444' }}>
                        ⏳
                    </div>
                </div>

                <div className="stat-card" style={{ borderLeft: '4px solid #1e293b', background: '#f8fafc' }}>
                    <div className="stat-content">
                        <div className="stat-label">Total Economic Impact</div>
                        <div className="stat-value" style={{ color: '#1e293b' }}>
                            {formatCurrency(financialImpact.totalImpact)}
                        </div>
                        <div className="stat-sublabel">Revenue Lost + Idle Expense</div>
                    </div>
                    <div className="stat-icon" style={{ backgroundColor: '#f1f5f9', color: '#475569' }}>
                        📉
                    </div>
                </div>
            </div>

            <div className="or-util-simplified-grid" style={{ marginBottom: '2rem' }}>
                <div className="chart-card glass-card">
                    <h3 className="chart-title">Surgery Outcome Distribution</h3>
                    <div className="utilization-pie-container">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={70}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="value"
                                    startAngle={90}
                                    endAngle={-270}
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <RechartsTooltip 
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                />
                                <Legend verticalAlign="bottom" height={36}/>
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="pie-center-label">
                            <span className="pie-center-value">{total}</span>
                            <span className="pie-center-text">Total Cases</span>
                        </div>
                    </div>
                </div>

                <div className="simplified-metrics-column">
                    <div className="compact-stat-card" style={{ borderLeft: '4px solid #dc2626' }}>
                        <div className="compact-stat-info">
                            <span className="compact-stat-label">Cancellation Rate</span>
                            <span className="compact-stat-value">{cancelledPercentage.toFixed(1)}%</span>
                        </div>
                        <div style={{ fontSize: '1.2rem' }}>🚫</div>
                    </div>
                    <div className="compact-stat-card" style={{ borderLeft: '4px solid #f59e0b' }}>
                        <div className="compact-stat-info">
                            <span className="compact-stat-label">Reschedule Rate</span>
                            <span className="compact-stat-value">{rescheduledPercentage.toFixed(1)}%</span>
                        </div>
                        <div style={{ fontSize: '1.2rem' }}>🔄</div>
                    </div>
                    <div className="compact-stat-card" style={{ borderLeft: '4px solid #10b981' }}>
                        <div className="compact-stat-info">
                            <span className="compact-stat-label">Completion Rate</span>
                            <span className="compact-stat-value">{completedPercentage.toFixed(1)}%</span>
                        </div>
                        <div style={{ fontSize: '1.2rem' }}>✅</div>
                    </div>
                </div>
            </div>

            <div className="section-header">
                <h3>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} List</h3>
            </div>
        </div>
    );
};

export default CancellationRescheduling;
