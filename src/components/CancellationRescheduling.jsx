import React, { useState } from 'react';
import './Management.css';
import { formatCurrency } from '../utils/hospitalUtils';

const CancellationRescheduling = ({ surgeries, surgeons, patients }) => {
    const [activeTab, setActiveTab] = useState('cancelled'); // 'cancelled' or 'rescheduled'

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

    return (
        <div className="management-container fade-in">
            <div className="management-header">
                <h2 className="management-title">Cancellation & Rescheduling</h2>
            </div>

            <div className="tabs-container" style={{ marginBottom: '2rem' }}>
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
                        background: activeTab === 'rescheduled' ? '#f59e0b' : 'white',
                        color: activeTab === 'rescheduled' ? 'white' : '#64748b',
                        border: '1px solid #e2e8f0',
                        cursor: 'pointer',
                        fontWeight: '600'
                    }}
                >
                    Rescheduled ({rescheduledSurgeries.length})
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
        </div>
    );
};

export default CancellationRescheduling;
