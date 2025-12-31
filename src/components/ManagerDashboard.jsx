import React, { useState } from 'react';
import './ManagerDashboard.css';

const ManagerDashboard = ({ surgeries = [], patients = [], onLogout, user }) => {
    const [currentView, setCurrentView] = useState('schedule');
    const [selectedCase, setSelectedCase] = useState(null);
    const [sidebarMode, setSidebarMode] = useState('schedule'); // Default to 'schedule' to match currentView

    // Filter States
    const [viewDate, setViewDate] = useState(new Date()); // Calendar Month View
    const [activeDate, setActiveDate] = useState(new Date()); // Selected Specific Day
    const [viewMode, setViewMode] = useState('month'); // Default to 'month' to show all data initially
    const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'complete', 'incomplete', 'alert', 'cancelled'

    // Case Navigation Tab State
    const [activeCaseTab, setActiveCaseTab] = useState('patient-info'); // Default to first tab

    // Detail View Sub-States (Implants vs Products)
    const [detailTab, setDetailTab] = useState('implants'); // 'implants', 'products'
    const [selectedImplants, setSelectedImplants] = useState([]);
    const [selectedProducts, setSelectedProducts] = useState([]);
    const [currentImplantSelection, setCurrentImplantSelection] = useState('');
    const [currentProductSelection, setCurrentProductSelection] = useState('');

    const availableImplants = [
        "Persona The Personalized Knee - Zimmer Biomet - Kendall R. (SBOX-MEDTEL)",
        "Small Fragment System - Depuy Synthes - Billy M. (SBOX-MEDTEL)",
        "SpeedBridge Implant System - Arthrex Inc. - Jim H. (SBOX-MEDTEL)",
        "Vanguard Knee System - Biomet",
        "Triathlon Total Knee System - Stryker"
    ];

    const availableProducts = [
        "Robaxin 500mg PO 1 hour prior to surgery",
        "Tylenol 1000mg IV",
        "Ancef 2g IV",
        "Decadron 10mg IV",
        "Tranexamic Acid 1g IV"
    ];

    // Helper to format date
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString();
    };

    // Helper to normalize date for comparison (YYYY-MM-DD)
    const getNormalizedDate = (date) => {
        if (!date) return '';
        const d = new Date(date);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    // 1. Process ALL Data for Schedule View first
    const allScheduleData = surgeries.map(s => {
        const patient = patients.find(p => String(p.id) === String(s.patient_id || s.patientId)) || {};
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
            time: s.start_time || 'N/A',
            patient: patientName,
            dob: patient.date_of_birth || 'N/A',
            provider: surgeonName,
            date: formatDate(s.date),
            location: 'MEDTEL Surgery Center',
            status: statusStyle,
            originalStatus: s.status,
            rawDate: new Date(s.date)
        };
    });

    // 2. Filter Data based on Time (Day vs Month)
    const timeFilteredData = allScheduleData.filter(item => {
        if (viewMode === 'day') {
            return getNormalizedDate(item.rawDate) === getNormalizedDate(activeDate);
        } else {
            // Month View
            return item.rawDate.getMonth() === viewDate.getMonth() &&
                item.rawDate.getFullYear() === viewDate.getFullYear();
        }
    });

    // 3. KPI Calculations (Based on Time-Filtered Data, BEFORE status filter)
    const kpiCounts = {
        all: timeFilteredData.length,
        complete: timeFilteredData.filter(d => d.status === 'complete').length,
        incomplete: timeFilteredData.filter(d => d.status === 'incomplete').length,
        alert: timeFilteredData.filter(d => d.status === 'alert').length,
        cancelled: timeFilteredData.filter(d => d.status === 'cancelled').length
    };

    // 4. Final Display Data (Filtered by Status)
    const finalDisplayData = timeFilteredData.filter(item => {
        if (statusFilter === 'all') return true;
        return item.status === statusFilter;
    });

    // Sub-Logic: Work Queues (unchanged logic, just re-declared)
    const workQueueData = surgeries.map(s => {
        const patient = patients.find(p => String(p.id) === String(s.patient_id || s.patientId)) || {};
        let surgeonName = s.doctor_name || 'Unknown';
        if (s.surgeons && s.surgeons.name) surgeonName = s.surgeons.name;

        // Robust Name Formatting
        let patientName = 'Unknown';
        if (patient.id) {
            const last = patient.last_name || patient.lastname || '';
            const first = patient.first_name || patient.firstname || '';
            if (last) patientName = `${last}, ${first}`;
            else if (patient.name) patientName = patient.name;
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
            type: 'Inpatient',
            cpt: s.cpt_codes ? (Array.isArray(s.cpt_codes) ? s.cpt_codes.join(', ') : s.cpt_codes) : 'N/A',
            status: s.status === 'completed' ? 'Compliant' : 'Non Compliant'
        };
    });

    const workQueues = [
        { id: 'insurance', label: 'Insurance Authorization', count: 5, icon: '5' },
        { id: 'presurgical', label: 'Presurgical Testing at Facility', count: 4, icon: '4' },
        { id: 'preadmission', label: 'Preadmission Testing At Facility', count: 7, icon: '7' },
        { id: 'cms', label: 'CMS Inpatient Only', count: workQueueData.length, icon: workQueueData.length.toString(), active: true },
        { id: 'pending', label: 'Pending Scheduling Confirmation', count: 13, icon: '13' },
        { id: 'amendment', label: 'Case Amendment Tracker', count: 44, icon: '44' }
    ];

    const handleCaseClick = (caseItem) => {
        const surgery = surgeries.find(s => s.id === caseItem.id);
        const patient = patients.find(p => p.id === surgery?.patient_id);
        setSelectedCase({ ...caseItem, fullSurgery: surgery, fullPatient: patient });
        setSidebarMode('case-navigation');
        setCurrentView('case-navigation');
        setActiveCaseTab('patient-info'); // Reset to first tab on new case selection
    };

    const handleBackToQueues = () => {
        setSelectedCase(null);
        setSidebarMode('work-queues');
        setCurrentView('work-queues');
    };

    const handleDateClick = (day) => {
        const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
        setActiveDate(newDate);
        setViewMode('day'); // Switch to day view when a date is clicked
        setStatusFilter('all'); // Reset status filter on date change? Or keep it? Let's keep it usually, but maybe reset is safer to see data. Let's keep 'all' default.
    };

    const handleStatusClick = (status) => {
        setStatusFilter(prev => prev === status ? 'all' : status);
    };

    const handleAddImplant = () => {
        if (currentImplantSelection && !selectedImplants.includes(currentImplantSelection)) {
            setSelectedImplants([...selectedImplants, currentImplantSelection]);
            setCurrentImplantSelection('');
        }
    };

    const handleRemoveImplant = (item) => {
        setSelectedImplants(selectedImplants.filter(i => i !== item));
    };

    const handleAddProduct = () => {
        if (currentProductSelection && !selectedProducts.includes(currentProductSelection)) {
            setSelectedProducts([...selectedProducts, currentProductSelection]);
            setCurrentProductSelection('');
        }
    };

    const handleRemoveProduct = (item) => {
        setSelectedProducts(selectedProducts.filter(p => p !== item));
    };

    const monthNames = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const renderCalendarDays = () => {
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDay = new Date(year, month, 1).getDay();

        const days = [];
        for (let i = 0; i < firstDay; i++) {
            days.push(<span key={`empty-${i}`} className="cal-day"></span>);
        }

        for (let i = 1; i <= daysInMonth; i++) {
            // Check if this specific day is the Active Date
            const currentDayDate = new Date(year, month, i);
            const isActive = getNormalizedDate(currentDayDate) === getNormalizedDate(activeDate);

            days.push(
                <span
                    key={i}
                    className={`cal-day ${isActive ? 'active' : ''}`}
                    onClick={() => handleDateClick(i)}
                >
                    {i}
                </span>
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
            return null; // Sidebar hidden in case navigation view
        } else {
            return (
                <div className="manager-sidebar">
                    <div className="sidebar-header">
                        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                            <strong>{monthNames[viewDate.getMonth()]} {viewDate.getFullYear()}</strong>
                            <div>
                                <button style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '1.2rem' }} onClick={() => {
                                    const d = new Date(viewDate);
                                    d.setMonth(d.getMonth() - 1);
                                    setViewDate(d);
                                }}>&#8249;</button>
                                <button style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '1.2rem' }} onClick={() => {
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
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <button className="back-btn" onClick={handleBackToQueues} style={{ marginBottom: 0 }}>← Back</button>
                                <span>Work Queues</span> &gt; <span>CMS Inpatient Only</span> &gt; <span className="current">{selectedCase?.patient}</span>
                            </div>
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
                            <div
                                className={`kpi-card ${statusFilter === 'all' ? 'active-filter' : ''}`}
                                onClick={() => handleStatusClick('all')}
                                style={{ cursor: 'pointer', border: statusFilter === 'all' ? '2px solid #3b82f6' : '' }}
                            >
                                <span className="kpi-number">{kpiCounts.all}</span>
                                <span className="kpi-label">All Cases</span>
                            </div>
                            <div
                                className={`kpi-card complete ${statusFilter === 'complete' ? 'active-filter' : ''}`}
                                onClick={() => handleStatusClick('complete')}
                                style={{ cursor: 'pointer', border: statusFilter === 'complete' ? '2px solid #22c55e' : '' }}
                            >
                                <span className="kpi-number">{kpiCounts.complete}</span>
                                <span className="kpi-label"><span className="status-icon complete"></span> Complete</span>
                            </div>
                            <div
                                className={`kpi-card incomplete ${statusFilter === 'incomplete' ? 'active-filter' : ''}`}
                                onClick={() => handleStatusClick('incomplete')}
                                style={{ cursor: 'pointer', border: statusFilter === 'incomplete' ? '2px solid #3b82f6' : '' }}
                            >
                                <span className="kpi-number">{kpiCounts.incomplete}</span>
                                <span className="kpi-label"><span className="status-icon incomplete"></span> Incomplete</span>
                            </div>
                            <div
                                className={`kpi-card alert ${statusFilter === 'alert' ? 'active-filter' : ''}`}
                                onClick={() => handleStatusClick('alert')}
                                style={{ cursor: 'pointer', border: statusFilter === 'alert' ? '2px solid #ef4444' : '' }}
                            >
                                <span className="kpi-number">{kpiCounts.alert}</span>
                                <span className="kpi-label"><span className="status-icon alert"></span> Alert</span>
                            </div>
                            <div
                                className={`kpi-card cancelled ${statusFilter === 'cancelled' ? 'active-filter' : ''}`}
                                onClick={() => handleStatusClick('cancelled')}
                                style={{ cursor: 'pointer', border: statusFilter === 'cancelled' ? '2px solid #94a3b8' : '' }}
                            >
                                <span className="kpi-number">{kpiCounts.cancelled}</span>
                                <span className="kpi-label"><span className="status-icon cancelled"></span> Cancelled</span>
                            </div>
                        </div>

                        <div className="table-controls" style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={viewMode === 'month'}
                                    onChange={(e) => setViewMode(e.target.checked ? 'month' : 'day')}
                                    style={{ accentColor: '#3b82f6' }}
                                />
                                <span style={{ color: '#64748b' }}>Month View</span>
                            </label>
                            {/* Explicit Day View indicator if needed, or just rely on the toggle state */}
                            {viewMode === 'day' && <span style={{ fontSize: '0.9rem', color: '#3b82f6', fontWeight: '600' }}>Day View Active ({activeDate.toLocaleDateString()})</span>}
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
                                    {finalDisplayData.length > 0 ? finalDisplayData.map((row, idx) => (
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
                                            <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                                                No surgeries found for this filter.
                                            </td>
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

                        {/* Top Navigation Tabs */}
                        <div className="top-nav-tabs-container">
                            <div className="nav-tabs-scroll">
                                {['patient-info', 'financial', 'procedure-details', 'scheduling', 'implants', 'clinical'].map(tab => (
                                    <button
                                        key={tab}
                                        className={`nav-tab-item ${activeCaseTab === tab ? 'active' : ''}`}
                                        onClick={() => setActiveCaseTab(tab)}
                                    >
                                        {tab.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()).replace('Implants', 'Implants & Products')}
                                    </button>
                                ))}
                                <span className="nav-divider">|</span>
                                {['case-summary', 'doc-management', 'comments', 'activity-logs'].map(tab => (
                                    <button
                                        key={tab}
                                        className={`nav-tab-item ${activeCaseTab === tab ? 'active' : ''}`}
                                        onClick={() => setActiveCaseTab(tab)}
                                    >
                                        {tab.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="case-content-wrapper">

                            {/* 1. Patient Information Tab */}
                            {activeCaseTab === 'patient-info' && (
                                <div className="tab-pane fade-in">
                                    <h2>Patient Information</h2>
                                    <div className="form-section">
                                        <div className="info-grid">
                                            <div className="info-item">
                                                <label>Full Name</label>
                                                <div className="info-value">{selectedCase?.patient || 'N/A'}</div>
                                            </div>
                                            <div className="info-item">
                                                <label>Date of Birth</label>
                                                <div className="info-value">{selectedCase?.fullPatient?.date_of_birth || 'N/A'}</div>
                                            </div>
                                            <div className="info-item">
                                                <label>MRN</label>
                                                <div className="info-value">{selectedCase?.fullPatient?.mrn || 'N/A'}</div>
                                            </div>
                                            <div className="info-item">
                                                <label>Gender</label>
                                                <div className="info-value">{selectedCase?.fullPatient?.gender || 'N/A'}</div>
                                            </div>
                                            <div className="info-item">
                                                <label>Phone</label>
                                                <div className="info-value">{selectedCase?.fullPatient?.phone || 'N/A'}</div>
                                            </div>
                                            <div className="info-item">
                                                <label>Address</label>
                                                <div className="info-value">{selectedCase?.fullPatient?.address || 'N/A'}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* 2. Financial Tab */}
                            {activeCaseTab === 'financial' && (
                                <div className="tab-pane fade-in">
                                    <h2>Financial Overview</h2>
                                    <div className="kpi-cards" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                                        <div className="kpi-card">
                                            <span className="kpi-label">Estimated Cost</span>
                                            <span className="kpi-number">$12,450</span>
                                        </div>
                                        <div className="kpi-card">
                                            <span className="kpi-label">Insurance Status</span>
                                            <span className="kpi-number" style={{ color: '#22c55e', fontSize: '1.5rem' }}>Verified</span>
                                        </div>
                                        <div className="kpi-card">
                                            <span className="kpi-label">Patient Liability</span>
                                            <span className="kpi-number">$500</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* 3. Procedure Details Tab */}
                            {activeCaseTab === 'procedure-details' && (
                                <div className="tab-pane fade-in">
                                    <h2>Procedure Details</h2>
                                    <div className="form-section">
                                        <div className="info-grid">
                                            <div className="info-item">
                                                <label>Primary Procedure</label>
                                                <div className="info-value">{selectedCase?.cpt || 'N/A'}</div>
                                            </div>
                                            <div className="info-item">
                                                <label>Surgeon</label>
                                                <div className="info-value">{selectedCase?.provider || 'N/A'}</div>
                                            </div>
                                            <div className="info-item">
                                                <label>Location</label>
                                                <div className="info-value">{selectedCase?.location || 'N/A'}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* 4. Scheduling Tab */}
                            {activeCaseTab === 'scheduling' && (
                                <div className="tab-pane fade-in">
                                    <h2>Scheduling</h2>
                                    <div className="form-section">
                                        <div className="info-grid">
                                            <div className="info-item">
                                                <label>Date</label>
                                                <div className="info-value">{selectedCase?.date || 'N/A'}</div>
                                            </div>
                                            <div className="info-item">
                                                <label>Time</label>
                                                <div className="info-value">{selectedCase?.fullSurgery?.start_time || '07:30 AM'}</div>
                                            </div>
                                            <div className="info-item">
                                                <label>Duration</label>
                                                <div className="info-value">{selectedCase?.fullSurgery?.duration || '90'} mins</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* 5. Implants and Products Tab (Original Content) */}
                            {activeCaseTab === 'implants' && (
                                <div className="tab-pane fade-in">
                                    <h2>Implants and Products</h2>

                                    {/* Tabs */}
                                    <div className="tabs-container">
                                        <button
                                            className={`tab-btn ${detailTab === 'implants' ? 'active' : ''}`}
                                            onClick={() => setDetailTab('implants')}
                                        >
                                            Implants
                                        </button>
                                        <button
                                            className={`tab-btn ${detailTab === 'products' ? 'active' : ''}`}
                                            onClick={() => setDetailTab('products')}
                                        >
                                            Products
                                        </button>
                                    </div>

                                    {/* Implants Sub-Tab */}
                                    {detailTab === 'implants' && (
                                        <div className="tab-content fade-in">
                                            <div className="form-section">
                                                <label className="section-label">Implant Selection</label>
                                                <div className="selection-row">
                                                    <div className="custom-select-container" style={{ flex: 1 }}>
                                                        <label className="input-label-floating">Implant Name</label>
                                                        <select
                                                            className="full-width-select"
                                                            value={currentImplantSelection}
                                                            onChange={(e) => setCurrentImplantSelection(e.target.value)}
                                                        >
                                                            <option value="">Select an Implant...</option>
                                                            {availableImplants.map((imp, idx) => (
                                                                <option key={idx} value={imp}>{imp}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <button className="add-btn" onClick={handleAddImplant}>Add Implant</button>
                                                </div>
                                            </div>

                                            {selectedImplants.length > 0 && (
                                                <div className="selected-items-list">
                                                    <h3>Selected Implants</h3>
                                                    {selectedImplants.map((img, idx) => (
                                                        <div key={idx} className="selected-item-card">
                                                            <span>{img}</span>
                                                            <button className="remove-btn" onClick={() => handleRemoveImplant(img)}>Remove</button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Products Sub-Tab */}
                                    {detailTab === 'products' && (
                                        <div className="tab-content fade-in">
                                            <div className="form-section">
                                                <label className="section-label">Product Selection</label>
                                                <div className="selection-row">
                                                    <div className="custom-select-container" style={{ flex: 1 }}>
                                                        <label className="input-label-floating">Product Name</label>
                                                        <select
                                                            className="full-width-select"
                                                            value={currentProductSelection}
                                                            onChange={(e) => setCurrentProductSelection(e.target.value)}
                                                        >
                                                            <option value="">Select a Product...</option>
                                                            {availableProducts.map((prod, idx) => (
                                                                <option key={idx} value={prod}>{prod}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <button className="add-btn" onClick={handleAddProduct}>Add Product</button>
                                                </div>
                                            </div>

                                            {selectedProducts.length > 0 && (
                                                <div className="selected-items-list">
                                                    <h3>Selected Products</h3>
                                                    {selectedProducts.map((prod, idx) => (
                                                        <div key={idx} className="selected-item-card">
                                                            <span>{prod}</span>
                                                            <button className="remove-btn" onClick={() => handleRemoveProduct(prod)}>Remove</button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* 6. Clinical Tab */}
                            {activeCaseTab === 'clinical' && (
                                <div className="tab-pane fade-in">
                                    <h2>Clinical Documentation</h2>
                                    <div className="form-section">
                                        <p>No clinical documents available.</p>
                                    </div>
                                </div>
                            )}

                            {/* 7. Case Summary Tab */}
                            {activeCaseTab === 'case-summary' && (
                                <div className="tab-pane fade-in">
                                    <h2>Case Summary</h2>
                                    <div className="form-section">
                                        <p>Summary of the case will appear here.</p>
                                    </div>
                                </div>
                            )}

                            {/* 8. Doc Management Placeholder */}
                            {activeCaseTab === 'doc-management' && (
                                <div className="tab-pane fade-in">
                                    <h2>Document Management</h2>
                                    <div className="form-section"><p>Document management tools here.</p></div>
                                </div>
                            )}

                            {/* 9. Comments Placeholder */}
                            {activeCaseTab === 'comments' && (
                                <div className="tab-pane fade-in">
                                    <h2>Comments</h2>
                                    <div className="form-section"><p>Case comments here.</p></div>
                                </div>
                            )}

                            {/* 10. Activity Logs Placeholder */}
                            {activeCaseTab === 'activity-logs' && (
                                <div className="tab-pane fade-in">
                                    <h2>Activity Logs</h2>
                                    <div className="form-section"><p>Audit logs here.</p></div>
                                </div>
                            )}

                            {/* Footer (Always Visible in Detail View) */}
                            <div style={{ marginTop: 'auto', paddingTop: '2rem', color: '#64748b', fontSize: '0.9rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <p><strong>Case ID:</strong> {selectedCase?.caseId || selectedCase?.id}</p>
                                    <p><strong>Patient:</strong> {selectedCase?.patient}</p>
                                </div>
                                <div>
                                    <button className="cancel-case-btn" style={{ width: 'auto', display: 'inline-block', marginRight: '1rem', background: '#e2e8f0' }}>Cancel Case</button>
                                    <button className="save-btn-primary">Save Changes</button>
                                </div>
                            </div>

                        </div> {/* End case-content-wrapper */}
                    </div>
                )
                }
            </main>
        </div>
    );
};

export default ManagerDashboard;
