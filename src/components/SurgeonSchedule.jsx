import React, { useState, useMemo } from 'react';
import './SurgeonSchedule.css';

const SurgeonSchedule = ({ surgeries, surgeon, patients, cptCodes }) => {
    const [filter, setFilter] = useState('all');


    const filteredSurgeries = useMemo(() => {
        if (!surgeries || !surgeon) return [];

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return surgeries.filter(surgery => {
            // Filter by surgeon
            const isMySurgery = surgery.surgeon_id === surgeon.id ||
                surgery.doctor_name === surgeon.name;

            if (!isMySurgery) return false;
            if (filter === 'all') return true;

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
    }, [surgeries, surgeon, filter]);


    const getPatientName = (patientId) => {
        const p = patients?.find(p => p.id === patientId);
        if (!p) return 'Unknown Patient';
        if (p.full_name) return p.full_name;
        if (p.name) return p.name;
        const first = p.firstname || p.first_name || '';
        const last = p.lastname || p.last_name || '';
        return (first + ' ' + last).trim() || 'Patient ' + patientId;
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
                    <p className="page-subtitle">
                        {filter === 'all' ? 'View and manage all your surgeries' : 
                         filter === 'upcoming' ? 'View and manage your upcoming surgeries' :
                         filter === 'past' ? 'View your past surgery history' :
                         "View today's surgery schedule"}
                    </p>
                </div>
                <div className="filter-tabs">
                    <button
                        className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
                        onClick={() => setFilter('all')}
                    >
                        All
                    </button>
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
                    <h3>{filter === 'all' ? 'All Surgeries' : filter === 'today' ? "Today's Schedule" : filter === 'upcoming' ? 'Upcoming Surgeries' : 'Past Surgeries'}</h3>
                    <span className="count-badge">{filteredSurgeries.length} surgeries</span>
                </div>

                {filteredSurgeries.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">📋</div>
                        <h3>No surgeries found</h3>
                        <p>You have no {filter} surgeries scheduled</p>
                    </div>
                ) : (
                    <div className="table-responsive">
                        <table className="clean-table">
                            <thead>
                                <tr>
                                    <th>Date & Time</th>
                                    <th>Patient</th>
                                    <th>Procedures</th>
                                    <th>Total Revenue</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredSurgeries.map((surgery) => (
                                    <tr key={surgery.id}>
                                        <td>
                                            <div className="date-cell">
                                                <strong>{formatDate(surgery.date)}</strong>
                                                <div className="text-muted">{surgery.start_time} ({surgery.duration_minutes} min)</div>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="patient-cell">
                                                {getPatientName(surgery.patient_id)}
                                            </div>
                                        </td>
                                        <td>
                                            <div className="procedures-cell">
                                                {surgery.cpt_codes?.slice(0, 2).map((code, idx) => (
                                                    <span key={idx} className="category-tag" style={{marginRight: '4px'}}>
                                                        {code}
                                                    </span>
                                                ))}
                                                {surgery.cpt_codes?.length > 2 && (
                                                    <span className="text-muted">+{surgery.cpt_codes.length - 2} more</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="amount-cell">
                                            <strong>${calculateTotalRevenue(surgery.cpt_codes).toLocaleString()}</strong>
                                        </td>
                                        <td>
                                            <div className={`status-badge status-${surgery.status}`}>
                                                {getStatusBadge(surgery.status)}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SurgeonSchedule;
