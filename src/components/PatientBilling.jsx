import React from 'react';
import './PatientBilling.css';

const PatientBilling = ({ billing, surgeries }) => {
    const getStatusBadge = (status) => {
        const badges = {
            'pending': { icon: '⏳', text: 'Pending', class: 'pending' },
            'paid': { icon: '✅', text: 'Paid', class: 'paid' },
            'partially-paid': { icon: '📊', text: 'Partially Paid', class: 'partially-paid' },
            'overdue': { icon: '⚠️', text: 'Overdue', class: 'overdue' }
        };
        return badges[status] || { icon: '📋', text: status, class: 'default' };
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const getSurgeryInfo = (surgeryId) => {
        return surgeries?.find(s => s.id === surgeryId);
    };

    const calculateTotals = () => {
        if (!billing || billing.length === 0) {
            return { total: 0, paid: 0, pending: 0, overdue: 0 };
        }

        return billing.reduce((acc, bill) => {
            acc.total += parseFloat(bill.patient_responsibility || 0);
            if (bill.status === 'paid') {
                acc.paid += parseFloat(bill.patient_responsibility || 0);
            } else if (bill.status === 'overdue') {
                acc.overdue += parseFloat(bill.patient_responsibility || 0);
            } else {
                acc.pending += parseFloat(bill.patient_responsibility || 0);
            }
            return acc;
        }, { total: 0, paid: 0, pending: 0, overdue: 0 });
    };

    const totals = calculateTotals();

    const BillCard = ({ bill }) => {
        const status = getStatusBadge(bill.status);
        const surgery = getSurgeryInfo(bill.surgery_id);
        const isOverdue = bill.status === 'overdue' || (bill.due_date && new Date(bill.due_date) < new Date() && bill.status === 'pending');

        return (
            <div className={`bill-card ${isOverdue ? 'overdue-card' : ''}`}>
                <div className="bill-header">
                    <div className="bill-info">
                        <div className="bill-id">Bill #{bill.id}</div>
                        <div className="bill-date">Created: {formatDate(bill.created_at)}</div>
                    </div>
                    <div className={`status-badge status-${status.class}`}>
                        <span className="status-icon">{status.icon}</span>
                        <span className="status-text">{status.text}</span>
                    </div>
                </div>

                {surgery && (
                    <div className="bill-surgery-info">
                        <span className="label">Related Surgery:</span>
                        <span className="value">{surgery.doctor_name} - {formatDate(surgery.date)}</span>
                    </div>
                )}

                <div className="bill-amounts">
                    <div className="amount-row">
                        <span className="amount-label">Total Amount:</span>
                        <span className="amount-value">${parseFloat(bill.total_amount).toLocaleString()}</span>
                    </div>
                    <div className="amount-row">
                        <span className="amount-label">Insurance Covered:</span>
                        <span className="amount-value insurance-covered">-${parseFloat(bill.insurance_covered).toLocaleString()}</span>
                    </div>
                    <div className="amount-row total-row">
                        <span className="amount-label">Your Responsibility:</span>
                        <span className="amount-value responsibility">${parseFloat(bill.patient_responsibility).toLocaleString()}</span>
                    </div>
                </div>

                <div className="bill-footer">
                    {bill.due_date && (
                        <div className="due-date">
                            <span className="label">Due Date:</span>
                            <span className={`value ${isOverdue ? 'overdue-text' : ''}`}>
                                {formatDate(bill.due_date)}
                            </span>
                        </div>
                    )}
                    {bill.paid_date && (
                        <div className="paid-date">
                            <span className="label">Paid On:</span>
                            <span className="value">{formatDate(bill.paid_date)}</span>
                        </div>
                    )}
                </div>

                {bill.status === 'pending' && (
                    <button className="pay-button">
                        💳 Pay Now
                    </button>
                )}
            </div>
        );
    };

    return (
        <div className="page-container fade-in">
            <h2 className="page-title">My Billing</h2>
            <p className="page-subtitle">View and manage your medical bills</p>

            {/* Summary Stats */}
            <div className="billing-stats">
                <div className="stat-card">
                    <div className="stat-icon">💰</div>
                    <div className="stat-info">
                        <div className="stat-value">${totals.total.toLocaleString()}</div>
                        <div className="stat-label">Total Billed</div>
                    </div>
                </div>
                <div className="stat-card paid-stat">
                    <div className="stat-icon">✅</div>
                    <div className="stat-info">
                        <div className="stat-value">${totals.paid.toLocaleString()}</div>
                        <div className="stat-label">Paid</div>
                    </div>
                </div>
                <div className="stat-card pending-stat">
                    <div className="stat-icon">⏳</div>
                    <div className="stat-info">
                        <div className="stat-value">${totals.pending.toLocaleString()}</div>
                        <div className="stat-label">Pending</div>
                    </div>
                </div>
                {totals.overdue > 0 && (
                    <div className="stat-card overdue-stat">
                        <div className="stat-icon">⚠️</div>
                        <div className="stat-info">
                            <div className="stat-value">${totals.overdue.toLocaleString()}</div>
                            <div className="stat-label">Overdue</div>
                        </div>
                    </div>
                )}
            </div>

            {/* Bills List */}
            <div className="content-card">
                <div className="card-header">
                    <h3>📄 All Bills</h3>
                    <span className="count-badge">{billing?.length || 0} bills</span>
                </div>

                {!billing || billing.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">📄</div>
                        <h3>No Bills Found</h3>
                        <p>You don't have any billing records</p>
                    </div>
                ) : (
                    <div className="bills-container">
                        {billing.map(bill => (
                            <BillCard key={bill.id} bill={bill} />
                        ))}
                    </div>
                )}
            </div>

            {/* Help Section */}
            <div className="billing-help">
                <div className="help-icon">💡</div>
                <div className="help-content">
                    <h4>Need Help with Billing?</h4>
                    <p>Contact our billing department at <strong>(555) 123-4567</strong> or email <strong>billing@hospital.com</strong></p>
                    <p>Office hours: Monday - Friday, 8:00 AM - 5:00 PM</p>
                </div>
            </div>
        </div>
    );
};

export default PatientBilling;
