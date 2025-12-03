import React from 'react';
import './PatientSurgeries.css';

const PatientSurgeries = ({ surgeries, cptCodes }) => {
    const getCPTDetails = (codes) => {
        if (!codes || !cptCodes) return [];
        return codes.map(code => {
            const cpt = cptCodes.find(c => c.code === code);
            return cpt || { code, description: 'Unknown', reimbursement: 0 };
        });
    };

    const calculateTotalCost = (codes) => {
        const details = getCPTDetails(codes);
        return details.reduce((sum, cpt) => sum + parseFloat(cpt.reimbursement || 0), 0);
    };

    const getStatusBadge = (status) => {
        const badges = {
            'scheduled': { icon: '📅', text: 'Scheduled', class: 'scheduled' },
            'in-progress': { icon: '⚕️', text: 'In Progress', class: 'in-progress' },
            'completed': { icon: '✅', text: 'Completed', class: 'completed' },
            'cancelled': { icon: '❌', text: 'Cancelled', class: 'cancelled' }
        };
        return badges[status] || { icon: '📋', text: status, class: 'default' };
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const upcomingSurgeries = surgeries?.filter(s => {
        const surgeryDate = new Date(s.date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return surgeryDate >= today && s.status !== 'cancelled';
    }) || [];

    const pastSurgeries = surgeries?.filter(s => {
        const surgeryDate = new Date(s.date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return surgeryDate < today || s.status === 'completed' || s.status === 'cancelled';
    }) || [];

    const SurgeryCard = ({ surgery }) => {
        const status = getStatusBadge(surgery.status);

        return (
            <div className="surgery-card">
                <div className="surgery-header">
                    <div className="surgery-date-info">
                        <div className="surgery-date">{formatDate(surgery.date)}</div>
                        <div className="surgery-time">{surgery.start_time} • {surgery.duration_minutes} minutes</div>
                    </div>
                    <div className={`status-badge status-${status.class}`}>
                        <span className="status-icon">{status.icon}</span>
                        <span className="status-text">{status.text}</span>
                    </div>
                </div>

                <div className="surgery-body">
                    <div className="surgery-info-row">
                        <span className="label">Surgeon:</span>
                        <span className="value">{surgery.doctor_name}</span>
                    </div>

                    <div className="procedures-section">
                        <span className="label">Procedures:</span>
                        <div className="procedures-list">
                            {getCPTDetails(surgery.cpt_codes).map((cpt, idx) => (
                                <div key={idx} className="procedure-item">
                                    <div className="procedure-info">
                                        <span className="procedure-code">{cpt.code}</span>
                                        <span className="procedure-desc">{cpt.description}</span>
                                    </div>
                                    <span className="procedure-cost">${parseFloat(cpt.reimbursement).toLocaleString()}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="surgery-total">
                        <span className="total-label">Estimated Total:</span>
                        <span className="total-amount">${calculateTotalCost(surgery.cpt_codes).toLocaleString()}</span>
                    </div>

                    {surgery.notes && (
                        <div className="surgery-notes">
                            <span className="label">Notes:</span>
                            <p>{surgery.notes}</p>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="page-container fade-in">
            <h2 className="page-title">My Surgeries</h2>
            <p className="page-subtitle">View your surgery history and upcoming procedures</p>

            {/* Stats */}
            <div className="surgery-stats">
                <div className="stat-card">
                    <div className="stat-icon">📅</div>
                    <div className="stat-info">
                        <div className="stat-value">{upcomingSurgeries.length}</div>
                        <div className="stat-label">Upcoming</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">✅</div>
                    <div className="stat-info">
                        <div className="stat-value">{pastSurgeries.filter(s => s.status === 'completed').length}</div>
                        <div className="stat-label">Completed</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">📋</div>
                    <div className="stat-info">
                        <div className="stat-value">{surgeries?.length || 0}</div>
                        <div className="stat-label">Total</div>
                    </div>
                </div>
            </div>

            {/* Upcoming Surgeries */}
            {upcomingSurgeries.length > 0 && (
                <div className="content-card">
                    <div className="card-header">
                        <h3>🔜 Upcoming Surgeries</h3>
                        <span className="count-badge">{upcomingSurgeries.length}</span>
                    </div>
                    <div className="surgeries-container">
                        {upcomingSurgeries.map(surgery => (
                            <SurgeryCard key={surgery.id} surgery={surgery} />
                        ))}
                    </div>
                </div>
            )}

            {/* Past Surgeries */}
            <div className="content-card">
                <div className="card-header">
                    <h3>📚 Surgery History</h3>
                    <span className="count-badge">{pastSurgeries.length}</span>
                </div>
                {pastSurgeries.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">📋</div>
                        <h3>No Surgery History</h3>
                        <p>You don't have any past surgeries on record</p>
                    </div>
                ) : (
                    <div className="surgeries-container">
                        {pastSurgeries.map(surgery => (
                            <SurgeryCard key={surgery.id} surgery={surgery} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default PatientSurgeries;
