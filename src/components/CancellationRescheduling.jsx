import React, { useState } from 'react';
import './Management.css';
import { formatCurrency } from '../utils/hospitalUtils';

const CancellationRescheduling = ({ surgeries, surgeons, patients }) => {
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

    // Calculate gradient stops
    const p1 = completedPercentage;
    const p2 = p1 + scheduledPercentage;
    const p3 = p2 + cancelledPercentage;
    const p4 = p3 + rescheduledPercentage;

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

            {/* Detailed Pie Chart Modal */}
            {showChart && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    backdropFilter: 'blur(4px)'
                }} onClick={() => setShowChart(false)}>
                    <div style={{
                        background: 'white',
                        padding: '2rem',
                        borderRadius: '24px',
                        width: '90%',
                        maxWidth: '600px',
                        position: 'relative',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                    }} onClick={e => e.stopPropagation()}>
                        <button
                            onClick={() => setShowChart(false)}
                            style={{
                                position: 'absolute',
                                top: '1.5rem',
                                right: '1.5rem',
                                background: '#f1f5f9',
                                border: 'none',
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                color: '#64748b',
                                fontSize: '1.2rem',
                                transition: 'all 0.2s'
                            }}
                        >
                            ×
                        </button>

                        <h3 style={{ marginTop: 0, marginBottom: '0.5rem', color: '#1e293b', textAlign: 'center', fontSize: '1.5rem' }}>Surgery Outcome Analysis</h3>

                        <div style={{
                            display: 'flex',
                            justifyContent: 'center',
                            gap: '0.75rem',
                            marginBottom: '2rem',
                            alignItems: 'center'
                        }}>
                            <select
                                className="filter-select"
                                style={{
                                    padding: '0.4rem 0.75rem',
                                    fontSize: '0.9rem',
                                    borderRadius: '8px',
                                    border: '1px solid #e2e8f0',
                                    background: '#f8fafc'
                                }}
                                value={outcomeView}
                                onChange={(e) => setOutcomeView(e.target.value)}
                            >
                                <option value="all">All Time</option>
                                <option value="daily">Daily View</option>
                            </select>

                            {outcomeView === 'daily' && (
                                <input
                                    type="date"
                                    className="date-input"
                                    style={{
                                        padding: '0.35rem 0.75rem',
                                        fontSize: '0.9rem',
                                        borderRadius: '8px',
                                        border: '1px solid #e2e8f0'
                                    }}
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                />
                            )}
                        </div>

                        {total > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                {/* Chart Container */}
                                <div style={{
                                    width: '260px',
                                    height: '260px',
                                    borderRadius: '50%',
                                    background: `conic-gradient(
                                        #10b981 0% ${p1}%, 
                                        #3b82f6 ${p1}% ${p2}%, 
                                        #dc2626 ${p2}% ${p3}%, 
                                        #f59e0b ${p3}% ${p4}%
                                    )`,
                                    marginBottom: '2.5rem',
                                    position: 'relative',
                                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                                }}>
                                    {/* Donut Hole */}
                                    <div style={{
                                        position: 'absolute',
                                        top: '50%',
                                        left: '50%',
                                        transform: 'translate(-50%, -50%)',
                                        background: 'white',
                                        width: '180px',
                                        height: '180px',
                                        borderRadius: '50%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexDirection: 'column',
                                        boxShadow: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)'
                                    }}>
                                        <span style={{ fontSize: '2.5rem', fontWeight: '800', color: '#1e293b', lineHeight: '1' }}>{total}</span>
                                        <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '0.25rem' }}>Total Cases</span>
                                    </div>
                                </div>

                                {/* Legend Grid */}
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(2, 1fr)',
                                    gap: '1.5rem',
                                    width: '100%',
                                    maxWidth: '400px'
                                }}>
                                    {/* Completed */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', background: '#f0fdf4', borderRadius: '12px' }}>
                                        <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 0 2px #bbf7d0' }}></div>
                                        <div>
                                            <div style={{ fontWeight: '700', color: '#166534', fontSize: '1.1rem' }}>{completedSurgeries}</div>
                                            <div style={{ fontSize: '0.75rem', color: '#15803d', fontWeight: '500' }}>Completed ({completedPercentage.toFixed(1)}%)</div>
                                        </div>
                                    </div>

                                    {/* Scheduled */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', background: '#eff6ff', borderRadius: '12px' }}>
                                        <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#3b82f6', boxShadow: '0 0 0 2px #bfdbfe' }}></div>
                                        <div>
                                            <div style={{ fontWeight: '700', color: '#1e40af', fontSize: '1.1rem' }}>{scheduledSurgeries}</div>
                                            <div style={{ fontSize: '0.75rem', color: '#1d4ed8', fontWeight: '500' }}>Scheduled ({scheduledPercentage.toFixed(1)}%)</div>
                                        </div>
                                    </div>

                                    {/* Rescheduled */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', background: '#fffbeb', borderRadius: '12px' }}>
                                        <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#f59e0b', boxShadow: '0 0 0 2px #fde68a' }}></div>
                                        <div>
                                            <div style={{ fontWeight: '700', color: '#92400e', fontSize: '1.1rem' }}>{rescheduledCount}</div>
                                            <div style={{ fontSize: '0.75rem', color: '#b45309', fontWeight: '500' }}>Rescheduled ({rescheduledPercentage.toFixed(1)}%)</div>
                                        </div>
                                    </div>

                                    {/* Cancelled */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', background: '#fef2f2', borderRadius: '12px' }}>
                                        <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#dc2626', boxShadow: '0 0 0 2px #fecaca' }}></div>
                                        <div>
                                            <div style={{ fontWeight: '700', color: '#991b1b', fontSize: '1.1rem' }}>{cancelledCount}</div>
                                            <div style={{ fontSize: '0.75rem', color: '#b91c1c', fontWeight: '500' }}>Cancelled ({cancelledPercentage.toFixed(1)}%)</div>
                                        </div>
                                    </div>
                                </div>

                            </div>
                        ) : (
                            <p style={{ textAlign: 'center', color: '#64748b' }}>No surgery data available for analysis</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default CancellationRescheduling;
