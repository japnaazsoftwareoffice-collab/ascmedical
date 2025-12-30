import React, { useState } from 'react';
import './ManagerDashboard.css';

const ManagerDashboard = ({ surgeries = [], patients = [], onLogout, user }) => {
    const [currentView, setCurrentView] = useState('schedule');
    const [selectedCase, setSelectedCase] = useState(null);
    const [sidebarMode, setSidebarMode] = useState('work-queues'); // 'work-queues' or 'case-navigation'
    const [viewDate, setViewDate] = useState(new Date());

    // Helper to format date
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString();
    };

    // 1. Process Data for Schedule View (All Surgeries)
    const scheduleData = surgeries.map(s => {
        // Robust patient lookup - handle string vs number IDs
        const patient = patients.find(p => String(p.id) === String(s.patient_id || s.patientId)) || {};

        // Extract surgeon name from either linked object or doctor_name field
        let surgeonName = s.doctor_name || 'Unknown';
        if (s.surgeons && s.surgeons.name) {
            surgeonName = s.surgeons.name;
        }

        let statusStyle = 'incomplete';
        if (s.status === 'completed') statusStyle = 'complete';
        else if (s.status === 'cancelled') statusStyle = 'cancelled';
        else if (!s.cpt_codes || s.cpt_codes.length === 0) statusStyle = 'alert';

        // Robust Name Formatting
        let patientName = 'Unknown';
        if (patient.id) {
            // Check for various name fields
            const last = patient.last_name || patient.lastname || '';
            const first = patient.first_name || patient.firstname || '';
            if (last || first) {
                patientName = `${last}, ${first}`;
            } else if (patient.name) {
                patientName = patient.name;
            }
        }
        // Clean up cases where only a comma might appear if one name part is missing
        if (patientName.trim() === ',') patientName = 'Unknown';

        return {
            id: s.id,
            time: s.start_time || 'N/A',
            patient: patientName,
            dob: patient.date_of_birth || 'N/A',
            provider: surgeonName,
            date: formatDate(s.date),
            location: 'MEDTEL Surgery Center',
            status: statusStyle,
            originalStatus: s.status,
            rawDate: s.date
        };
    });

    // KPI Calculations
    const kpiCounts = {
        all: scheduleData.length,
        complete: scheduleData.filter(d => d.originalStatus === 'completed').length,
        incomplete: scheduleData.filter(d => d.originalStatus === 'scheduled' || d.originalStatus === 'pending').length,
        alert: scheduleData.filter(d => d.status === 'alert').length,
        cancelled: scheduleData.filter(d => d.originalStatus === 'cancelled').length
    };

    // 2. Process Data for Work Queues (CMS Inpatient Only - Mock Logic for "Inpatient")
    // For demo: Filter surgeries that might look like inpatient or show all if none
    // Real implementation would check admission_type column if it exists
    const workQueueData = surgeries.map(s => {
        // Robust patient lookup
        const patient = patients.find(p => String(p.id) === String(s.patient_id || s.patientId)) || {};

        let surgeonName = s.doctor_name || 'Unknown';
        if (s.surgeons && s.surgeons.name) surgeonName = s.surgeons.name;

        // Robust Name Formatting
        let patientName = 'Unknown';
        if (patient.id) {
            const last = patient.last_name || patient.lastname || '';
            const first = patient.first_name || patient.firstname || '';
            if (last || first) {
                patientName = `${last}, ${first}`;
            } else if (patient.name) {
                patientName = patient.name;
            }
        }
        if (patientName.trim() === ',') patientName = 'Unknown';

        return {
            id: s.id,
            patient: patientName,
            provider: surgeonName,
            location: 'MEDTEL Surgery Center',
            unit: 'OR',
            caseId: s.id,
            date: formatDate(s.date),
            type: 'Inpatient', // comprehensive mapping not available, defaulting
            cpt: s.cpt_codes ? (Array.isArray(s.cpt_codes) ? s.cpt_codes.join(', ') : s.cpt_codes) : 'N/A',
            status: s.status === 'completed' ? 'Compliant' : 'Non Compliant' // Mock compliance logic
        };
    });

    // Mock data for work queues sidebar counts
    const workQueues = [
        { id: 'insurance', label: 'Insurance Authorization', count: 5, icon: '5' },
        { id: 'presurgical', label: 'Presurgical Testing at Facility', count: 4, icon: '4' },
        { id: 'preadmission', label: 'Preadmission Testing At Facility', count: 7, icon: '7' },
        { id: 'cms', label: 'CMS Inpatient Only', count: workQueueData.length, icon: workQueueData.length.toString(), active: true },
        { id: 'pending', label: 'Pending Scheduling Confirmation', count: 13, icon: '13' },
        { id: 'amendment', label: 'Case Amendment Tracker', count: 44, icon: '44' }
    ];

    const handleCaseClick = (caseItem) => {
        // Find full surgery object
        const surgery = surgeries.find(s => s.id === caseItem.id);
        const patient = patients.find(p => p.id === surgery?.patient_id);
        setSelectedCase({ ...caseItem, fullSurgery: surgery, fullPatient: patient });
        setSidebarMode('case-navigation');
        setCurrentView('case-navigation');
    };

    const handleBackToQueues = () => {
        setSelectedCase(null);
        setSidebarMode('work-queues');
        setCurrentView('work-queues');
    };

    // Calendar Logic
    const monthNames = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    // Basic mock calendar generator for current month
    const renderCalendarDays = () => {
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDay = new Date(year, month, 1).getDay(); // 0 = Sunday

        const days = [];
        // Empty slots for days before first of month
        for (let i = 0; i < firstDay; i++) {
            days.push(<span key={`empty-${i}`} className="cal-day"></span>);
        }

        for (let i = 1; i <= daysInMonth; i++) {
            const isToday = i === new Date().getDate() && month === new Date().getMonth();
            days.push(
                <span key={i} className={`cal-day ${isToday ? 'active' : ''}`}>{i}</span>
            );
        }
        return days;
    };

    const renderSidebar = () => {
        if (sidebarMode === 'work-queues') {
            return (
                <div className="manager-sidebar">
                    <div className="sidebar-header">
                        <h3>Work Queues</h3>
                    </div>
                    <nav className="queue-nav">
                        {workQueues.map(q => (
                            <button key={q.id} className={`queue-item ${q.active ? 'active' : ''}`}>
                                <span className="queue-badge">{q.icon}</span>
                                <span className="queue-label">{q.label}</span>
                            </button>
                        ))}
                    </nav>
                </div>
            );
        } else if (sidebarMode === 'case-navigation') {
            return (
                <div className="manager-sidebar case-nav">
                    <div className="sidebar-header">
                        <button className="back-btn" onClick={handleBackToQueues}>← Back</button>
                        <h3>Case Navigation</h3>
                    </div>
                    <nav className="case-menu">
                        <div className="menu-group">
                            <div className="menu-item status-green">Patient Information</div>
                            <div className="menu-item status-green">Financial</div>
                            <div className="menu-item status-green">Procedure Details</div>
                            <div className="menu-item status-green">Scheduling</div>
                            <div className="menu-item status-blue active">Implants and Products</div>
                            <div className="menu-item status-green">Clinical</div>
                        </div>
                        <div className="menu-divider"></div>
                        <div className="menu-group">
                            <div className="menu-item">Case Summary</div>
                            <div className="menu-item">Doc Management</div>
                            <div className="menu-item">Comments</div>
                            <div className="menu-item">Activity Logs</div>
                        </div>
                        <div className="menu-footer">
                            <button className="cancel-case-btn">Cancel Case</button>
                        </div>
                    </nav>
                </div>
            );
        } else {
            // Default Schedule Sidebar (Calendar)
            return (
                <div className="manager-sidebar">
                    <div className="sidebar-header">
                        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                            <strong>{monthNames[viewDate.getMonth()]} {viewDate.getFullYear()}</strong>
                            <div>
                                <button style={{ border: 'none', background: 'transparent', cursor: 'pointer' }} onClick={() => {
                                    const d = new Date(viewDate);
                                    d.setMonth(d.getMonth() - 1);
                                    setViewDate(d);
                                }}>&#8249;</button>
                                <button style={{ border: 'none', background: 'transparent', cursor: 'pointer' }} onClick={() => {
                                    const d = new Date(viewDate);
                                    d.setMonth(d.getMonth() + 1);
                                    setViewDate(d);
                                }}>&#8250;</button>
                            </div>
                        </div>
                    </div>
                    <div className="calendar-widget">
                        <div className="calendar-grid">
                            <span className="cal-day-header">S</span>
                            <span className="cal-day-header">M</span>
                            <span className="cal-day-header">T</span>
                            <span className="cal-day-header">W</span>
                            <span className="cal-day-header">T</span>
                            <span className="cal-day-header">F</span>
                            <span className="cal-day-header">S</span>
                            {renderCalendarDays()}
                        </div>
                    </div>
                </div>
            );
        }
    };

    return (
        <div className="manager-dashboard-container">
            {renderSidebar()}

            <main className="manager-content">
                {/* Header Area */}
                <header className="manager-header">
                    <div className="breadcrumbs">
                        {sidebarMode === 'case-navigation' ? (
                            <>
                                <span>Work Queues</span> &gt; <span>CMS Inpatient Only</span> &gt; <span className="current">{selectedCase?.patient}</span>
                            </>
                        ) : (
                            <div className="view-switcher">
                                <button
                                    className={`view-btn ${currentView === 'schedule' ? 'active' : ''}`}
                                    onClick={() => { setCurrentView('schedule'); setSidebarMode('schedule'); }}
                                >
                                    Schedule Overview
                                </button>
                                <button
                                    className={`view-btn ${currentView === 'work-queues' ? 'active' : ''}`}
                                    onClick={() => { setCurrentView('work-queues'); setSidebarMode('work-queues'); }}
                                >
                                    Work Queues
                                </button>
                            </div>
                        )}
                    </div>
                    <div className="user-profile-mini">
                        <span>{user?.name || 'Manager'}</span>
                        <button onClick={onLogout} className="logout-mini">Logout</button>
                    </div>
                </header>

                {/* Schedule View (Image 3) */}
                {currentView === 'schedule' && (
                    <div className="content-panel schedule-container">
                        <div className="kpi-cards">
                            <div className="kpi-card">
                                <span className="kpi-number">{kpiCounts.all}</span>
                                <span className="kpi-label">All Cases</span>
                            </div>
                            <div className="kpi-card complete">
                                <span className="kpi-number">{kpiCounts.complete}</span>
                                <span className="kpi-label"><span className="status-icon complete"></span> Complete</span>
                            </div>
                            <div className="kpi-card incomplete">
                                <span className="kpi-number">{kpiCounts.incomplete}</span>
                                <span className="kpi-label"><span className="status-icon incomplete"></span> Incomplete</span>
                            </div>
                            <div className="kpi-card alert">
                                <span className="kpi-number">{kpiCounts.alert}</span>
                                <span className="kpi-label"><span className="status-icon alert"></span> Alert</span>
                            </div>
                            <div className="kpi-card cancelled">
                                <span className="kpi-number">{kpiCounts.cancelled}</span>
                                <span className="kpi-label"><span className="status-icon cancelled"></span> Cancelled</span>
                            </div>
                        </div>

                        <div className="table-controls" style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                            <span style={{ color: '#3b82f6', fontWeight: '600' }}>Day View</span>
                            <input type="checkbox" checked readOnly style={{ accentColor: '#3b82f6' }} />
                            <span style={{ color: '#64748b' }}>Month View</span>
                        </div>

                        <div className="table-responsive">
                            <table className="manager-table">
                                <thead style={{ background: '#0ea5e9', color: 'white' }}>
                                    <tr>
                                        <th style={{ color: 'white', background: '#0ea5e9' }}>Time</th>
                                        <th style={{ color: 'white', background: '#0ea5e9' }}>Patient Name</th>
                                        <th style={{ color: 'white', background: '#0ea5e9' }}>DOB</th>
                                        <th style={{ color: 'white', background: '#0ea5e9' }}>Proceduralist</th>
                                        <th style={{ color: 'white', background: '#0ea5e9' }}>Procedure Date</th>
                                        <th style={{ color: 'white', background: '#0ea5e9' }}>Location</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {scheduleData.length > 0 ? scheduleData.map((row, idx) => (
                                        <tr key={idx} className="clickable-row">
                                            <td style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                <span className={`status-icon ${row.status}`}></span>
                                                {row.time}
                                            </td>
                                            <td><strong>{row.patient}</strong></td>
                                            <td>{row.dob}</td>
                                            <td>{row.provider}</td>
                                            <td>{row.date}</td>
                                            <td>{row.location}</td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>No surgeries scheduled.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Work Queues View (Image 1) */}
                {currentView === 'work-queues' && (
                    <div className="content-panel">
                        <div style={{ marginBottom: '1rem' }}>
                            <h2 style={{ fontSize: '1.5rem', color: '#1e3a8a' }}>CMS Inpatient Only</h2>
                        </div>
                        <div className="table-responsive">
                            <table className="manager-table">
                                <thead>
                                    <tr>
                                        <th>Patient Name</th>
                                        <th>Provider</th>
                                        <th>Surgical Location</th>
                                        <th>Procedure Unit</th>
                                        <th>Case ID</th>
                                        <th>Procedure Date</th>
                                        <th>Admission Type</th>
                                        <th>CMS Inpatient CPT codes</th>
                                        <th>Compliance Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {workQueueData.length > 0 ? workQueueData.map((c) => (
                                        <tr key={c.id} onClick={() => handleCaseClick(c)} className="clickable-row">
                                            <td><strong>{c.patient}</strong></td>
                                            <td>{c.provider}</td>
                                            <td>{c.location}</td>
                                            <td>{c.unit}</td>
                                            <td><span className="link-text">{c.caseId}</span></td>
                                            <td>{c.date}</td>
                                            <td>{c.type}</td>
                                            <td>{c.cpt}</td>
                                            <td>
                                                <span className={`status-pill ${c.status === 'Compliant' ? 'compliant' : 'non-compliant'}`}>
                                                    {c.status}
                                                </span>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan="9" style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>No cases in this queue.</td>
                                        </tr>
                                    )}
                                </tbody>
                                <tfoot>
                                    <tr>
                                        <td colSpan="9">
                                            <div className="table-footer">
                                                Rows per page: 100 <span>1-{workQueueData.length} of {workQueueData.length}</span>
                                            </div>
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                )}

                {/* Case Navigation View (Image 2) */}
                {currentView === 'case-navigation' && (
                    <div className="content-panel detail-view">
                        <h2>Implants and Products</h2>

                        <div className="form-section">
                            <label className="section-label">Product Selection</label>
                            <div className="custom-select-container">
                                <label className="input-label-floating">Product Name</label>
                                <select className="full-width-select">
                                    <option>Persona The Personalized Knee - Zimmer Biomet - Kendall R. (SBOX-MEDTEL)</option>
                                    <option>Robaxin 500mg PO 1 hour prior to surgery</option>
                                    <option>Small Fragment System - Depuy Synthes - Billy M. (SBOX-MEDTEL)</option>
                                    <option>SpeedBridge Implant System - Arthrex Inc. - Jim H. (SBOX-MEDTEL)</option>
                                </select>
                            </div>
                        </div>

                        {/* Optional: Display real case info below for confirmation */}
                        <div style={{ marginTop: '2rem', color: '#64748b', fontSize: '0.9rem' }}>
                            <p><strong>Case ID:</strong> {selectedCase?.caseId}</p>
                            <p><strong>Patient:</strong> {selectedCase?.patient}</p>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default ManagerDashboard;
