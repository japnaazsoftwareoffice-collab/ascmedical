import React, { useState, useEffect } from 'react';
import './SurgeonSchedule.css';

const SurgeonSchedule = ({ surgeries, surgeon, patients, cptCodes }) => {
    const [filter, setFilter] = useState('upcoming');
    const [filteredSurgeries, setFilteredSurgeries] = useState([]);

    useEffect(() => {
        if (!surgeries || !surgeon) return;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let filtered = surgeries.filter(surgery => {
            // Filter by surgeon
            const isMySurgery = surgery.surgeon_id === surgeon.id ||
                surgery.doctor_name === surgeon.name;

            if (!isMySurgery) return false;

            const surgeryDate = new Date(surgery.date);
            surgeryDate.setHours(0, 0, 0, 0);

            if (filter === 'upcoming') {
                return surgeryDate >= today && surgery.status !== 'cancelled';
            } else if (filter === 'past') {
                return surgeryDate < today || surgery.status === 'completed';
            } else if (filter === 'today') {
                return surgeryDate.getTime() === today.getTime();
            }
            return true;
        });

        setFilteredSurgeries(filtered);
    }, [surgeries, surgeon, filter]);

    const getPatientName = (patientId) => {
        const patient = patients?.find(p => p.id === patientId);
        return patient?.name || 'Unknown Patient';
    };

    const getCPTDetails = (codes) => {
        if (!codes || !cptCodes) return [];
        return codes.map(code => {
            const cpt = cptCodes.find(c => c.code === code);
            return cpt || { code, description: 'Unknown', reimbursement: 0 };
        });
    };

    const calculateTotalRevenue = (codes) => {
        const details = getCPTDetails(codes);
        return details.reduce((sum, cpt) => sum + parseFloat(cpt.reimbursement || 0), 0);
    };

    const getStatusBadge = (status) => {
        const badges = {
            'scheduled': '📅 Scheduled',
            'in-progress': '⚕️ In Progress',
            'completed': '✅ Completed',
            'cancelled': '❌ Cancelled'
        };
        return badges[status] || status;
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    return (
        <div className="page-container fade-in">
            <div className="page-header">
                <div>
                    <h2 className="page-title">My Surgery Schedule</h2>
                    <p className="page-subtitle">View and manage your upcoming surgeries</p>
                </div>
                <div className="filter-tabs">
                    <button
                        className={`filter-tab ${filter === 'today' ? 'active' : ''}`}
                        onClick={() => setFilter('today')}
                    >
                        Today
                    </button>
                    <button
                        className={`filter-tab ${filter === 'upcoming' ? 'active' : ''}`}
                        onClick={() => setFilter('upcoming')}
                    >
                        Upcoming
                    </button>
                    <button
                        className={`filter-tab ${filter === 'past' ? 'active' : ''}`}
                        onClick={() => setFilter('past')}
                    >
                        Past
                    </button>
                </div>
            </div>

            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon">📅</div>
                    <div className="stat-info">
                        <div className="stat-value">
                            {surgeries?.filter(s => {
                                const today = new Date();
                                today.setHours(0, 0, 0, 0);
                                const surgeryDate = new Date(s.date);
                                surgeryDate.setHours(0, 0, 0, 0);
                                return surgeryDate.getTime() === today.getTime() &&
                                    (s.surgeon_id === surgeon?.id || s.doctor_name === surgeon?.name);
                            }).length || 0}
                        </div>
                        <div className="stat-label">Today's Surgeries</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon">🔜</div>
                    <div className="stat-info">
                        <div className="stat-value">
                            {surgeries?.filter(s => {
                                const today = new Date();
                                today.setHours(0, 0, 0, 0);
                                const surgeryDate = new Date(s.date);
                                surgeryDate.setHours(0, 0, 0, 0);
                                return surgeryDate >= today && s.status !== 'cancelled' &&
                                    (s.surgeon_id === surgeon?.id || s.doctor_name === surgeon?.name);
                            }).length || 0}
                        </div>
                        <div className="stat-label">Upcoming</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon">✅</div>
                    <div className="stat-info">
                        <div className="stat-value">
                            {surgeries?.filter(s =>
                                s.status === 'completed' &&
                                (s.surgeon_id === surgeon?.id || s.doctor_name === surgeon?.name)
                            ).length || 0}
                        </div>
                        <div className="stat-label">Completed</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon">👥</div>
                    <div className="stat-info">
                        <div className="stat-value">
                            {new Set(surgeries?.filter(s =>
                                s.surgeon_id === surgeon?.id || s.doctor_name === surgeon?.name
                            ).map(s => s.patient_id)).size || 0}
                        </div>
                        <div className="stat-label">Total Patients</div>
                    </div>
                </div>
            </div>

            <div className="content-card">
                <div className="card-header">
                    <h3>{filter === 'today' ? "Today's Schedule" : filter === 'upcoming' ? 'Upcoming Surgeries' : 'Past Surgeries'}</h3>
                    <span className="count-badge">{filteredSurgeries.length} surgeries</span>
                </div>

                {filteredSurgeries.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">📋</div>
                        <h3>No surgeries found</h3>
                        <p>You have no {filter} surgeries scheduled</p>
                    </div>
                ) : (
                    <div className="surgeries-list">
                        {filteredSurgeries.map((surgery) => (
                            <div key={surgery.id} className="surgery-card">
                                <div className="surgery-header">
                                    <div className="surgery-date-time">
                                        <div className="surgery-date">{formatDate(surgery.date)}</div>
                                        <div className="surgery-time">{surgery.start_time} • {surgery.duration_minutes} min</div>
                                    </div>
                                    <div className={`status-badge status-${surgery.status}`}>
                                        {getStatusBadge(surgery.status)}
                                    </div>
                                </div>

                                <div className="surgery-body">
                                    <div className="surgery-patient">
                                        <span className="label">Patient:</span>
                                        <span className="value">{getPatientName(surgery.patient_id)}</span>
                                    </div>

                                    <div className="surgery-procedures">
                                        <span className="label">Procedures:</span>
                                        <div className="cpt-list">
                                            {getCPTDetails(surgery.cpt_codes).map((cpt, idx) => (
                                                <div key={idx} className="cpt-item">
                                                    <span className="cpt-code">{cpt.code}</span>
                                                    <span className="cpt-desc">{cpt.description}</span>
                                                    <span className="cpt-amount">${parseFloat(cpt.reimbursement).toLocaleString()}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="surgery-total">
                                        <span className="label">Total Revenue:</span>
                                        <span className="total-amount">${calculateTotalRevenue(surgery.cpt_codes).toLocaleString()}</span>
                                    </div>

                                    {surgery.notes && (
                                        <div className="surgery-notes">
                                            <span className="label">Notes:</span>
                                            <p>{surgery.notes}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SurgeonSchedule;
