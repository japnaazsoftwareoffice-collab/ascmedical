import React, { useState, useEffect } from 'react';
import './SurgeonPatients.css';

const SurgeonPatients = ({ patients, surgeries, surgeon }) => {
    const [myPatients, setMyPatients] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');



    const getPatientName = (p) => {
        if (p.name) return p.name;
        const first = p.firstname || p.first_name || '';
        const last = p.lastname || p.last_name || '';
        return first && last ? `${first} ${last}` : 'Unknown';
    };

    const getSurgeonName = (s) => {
        if (s.name) return s.name;
        const first = s.firstname || s.first_name || '';
        const last = s.lastname || s.last_name || '';
        return first && last ? `Dr. ${last} ${first}` : 'Unknown';
    };

    useEffect(() => {
        if (!patients || !surgeries || !surgeon) return;

        const surgeonName = getSurgeonName(surgeon);

        // Find all patients who have surgeries with this surgeon
        const patientIds = new Set(
            surgeries
                .filter(s => s.surgeon_id === surgeon.id || s.doctor_name === surgeonName)
                .map(s => s.patient_id)
        );

        const filtered = patients.filter(p => patientIds.has(p.id));
        setMyPatients(filtered);
    }, [patients, surgeries, surgeon]);

    const filteredPatients = myPatients.filter(patient =>
        getPatientName(patient).toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.mrn.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getPatientLastSurgery = (patientId) => {
        const surgeonName = getSurgeonName(surgeon);
        const patientSurgeries = surgeries
            .filter(s => s.patient_id === patientId && (s.surgeon_id === surgeon.id || s.doctor_name === surgeonName))
            .sort((a, b) => new Date(b.date) - new Date(a.date));

        return patientSurgeries.length > 0 ? patientSurgeries[0] : null;
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    return (
        <div className="page-container fade-in">
            <div className="page-header">
                <div>
                    <h2 className="page-title">My Patients</h2>
                    <p className="page-subtitle">Manage your patient list and history</p>
                </div>
                <div className="search-box">
                    <span className="search-icon">🔍</span>
                    <input
                        type="text"
                        placeholder="Search by name or MRN..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="search-input"
                    />
                </div>
            </div>

            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon">👥</div>
                    <div className="stat-info">
                        <div className="stat-value">{myPatients.length}</div>
                        <div className="stat-label">Total Patients</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">📅</div>
                    <div className="stat-info">
                        <div className="stat-value">
                            {myPatients.filter(p => {
                                const lastSurgery = getPatientLastSurgery(p.id);
                                if (!lastSurgery) return false;
                                const daysSince = (new Date() - new Date(lastSurgery.date)) / (1000 * 60 * 60 * 24);
                                return daysSince <= 30;
                            }).length}
                        </div>
                        <div className="stat-label">Seen This Month</div>
                    </div>
                </div>
            </div>

            <div className="content-card">
                <div className="card-header">
                    <h3>Patient Directory</h3>
                    <span className="count-badge">{filteredPatients.length} patients</span>
                </div>

                {filteredPatients.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">👥</div>
                        <h3>No Patients Found</h3>
                        <p>You don't have any patients matching your search</p>
                    </div>
                ) : (
                    <div className="patients-grid">
                        {filteredPatients.map(patient => {
                            const lastSurgery = getPatientLastSurgery(patient.id);
                            const patientName = getPatientName(patient);

                            return (
                                <div key={patient.id} className="patient-card">
                                    <div className="patient-header">
                                        <div className="patient-avatar">
                                            {patientName.charAt(0)}
                                        </div>
                                        <div className="patient-info">
                                            <div className="patient-name">{patientName}</div>
                                            <div className="patient-mrn">{patient.mrn}</div>
                                        </div>
                                    </div>

                                    <div className="patient-details">
                                        <div className="detail-row">
                                            <span className="label">DOB:</span>
                                            <span className="value">{formatDate(patient.dob)}</span>
                                        </div>
                                        <div className="detail-row">
                                            <span className="label">Phone:</span>
                                            <span className="value">{patient.phone || 'N/A'}</span>
                                        </div>
                                        {lastSurgery && (
                                            <div className="last-surgery">
                                                <span className="label">Last Surgery:</span>
                                                <div className="surgery-preview">
                                                    <span className="date">{formatDate(lastSurgery.date)}</span>
                                                    <span className="status">{lastSurgery.status}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="patient-actions">
                                        <button className="btn-action">View History</button>
                                        <button className="btn-action secondary">Contact</button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SurgeonPatients;
