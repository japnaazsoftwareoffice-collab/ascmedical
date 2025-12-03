import React from 'react';
import './PatientInfo.css';

const PatientInfo = ({ patient }) => {
    if (!patient) {
        return (
            <div className="page-container fade-in">
                <div className="empty-state">
                    <div className="empty-icon">👤</div>
                    <h3>Patient Information Not Found</h3>
                    <p>Unable to load patient information</p>
                </div>
            </div>
        );
    }

    const calculateAge = (dob) => {
        const birthDate = new Date(dob);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        });
    };

    return (
        <div className="page-container fade-in">
            <h2 className="page-title">My Information</h2>
            <p className="page-subtitle">View your personal and medical information</p>

            <div className="info-grid">
                {/* Personal Information */}
                <div className="content-card">
                    <div className="card-header">
                        <h3>👤 Personal Information</h3>
                    </div>
                    <div className="info-section">
                        <div className="info-row">
                            <span className="info-label">Full Name</span>
                            <span className="info-value">{patient.name}</span>
                        </div>
                        <div className="info-row">
                            <span className="info-label">Date of Birth</span>
                            <span className="info-value">{formatDate(patient.dob)} ({calculateAge(patient.dob)} years old)</span>
                        </div>
                        <div className="info-row">
                            <span className="info-label">Medical Record Number</span>
                            <span className="info-value info-highlight">{patient.mrn}</span>
                        </div>
                    </div>
                </div>

                {/* Contact Information */}
                <div className="content-card">
                    <div className="card-header">
                        <h3>📞 Contact Information</h3>
                    </div>
                    <div className="info-section">
                        <div className="info-row">
                            <span className="info-label">Phone Number</span>
                            <span className="info-value">{patient.phone || 'Not provided'}</span>
                        </div>
                        <div className="info-row">
                            <span className="info-label">Email Address</span>
                            <span className="info-value">{patient.email || 'Not provided'}</span>
                        </div>
                        <div className="info-row">
                            <span className="info-label">Address</span>
                            <span className="info-value">{patient.address || 'Not provided'}</span>
                        </div>
                    </div>
                </div>

                {/* Insurance Information */}
                <div className="content-card">
                    <div className="card-header">
                        <h3>🏥 Insurance Information</h3>
                    </div>
                    <div className="info-section">
                        <div className="info-row">
                            <span className="info-label">Insurance Provider</span>
                            <span className="info-value">{patient.insurance_provider || 'Not provided'}</span>
                        </div>
                        <div className="info-row">
                            <span className="info-label">Policy Number</span>
                            <span className="info-value info-highlight">{patient.insurance_policy_number || 'Not provided'}</span>
                        </div>
                    </div>
                </div>

                {/* Emergency Contact */}
                <div className="content-card">
                    <div className="card-header">
                        <h3>🚨 Emergency Contact</h3>
                    </div>
                    <div className="info-section">
                        <div className="info-row">
                            <span className="info-label">Contact Name</span>
                            <span className="info-value">{patient.emergency_contact_name || 'Not provided'}</span>
                        </div>
                        <div className="info-row">
                            <span className="info-label">Contact Phone</span>
                            <span className="info-value">{patient.emergency_contact_phone || 'Not provided'}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="info-notice">
                <div className="notice-icon">ℹ️</div>
                <div className="notice-content">
                    <h4>Need to Update Your Information?</h4>
                    <p>Please contact our front desk at <strong>(555) 123-4567</strong> or email <strong>info@hospital.com</strong> to update your personal information.</p>
                </div>
            </div>
        </div>
    );
};

export default PatientInfo;
