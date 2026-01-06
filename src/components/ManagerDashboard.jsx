import React, { useMemo, useState } from 'react';
import SurgeonManagement from './SurgeonManagement';
import StaffManagement from './StaffManagement';
import './Dashboard.css'; // Reuse some dashboard styles

const ManagerDashboard = ({
    surgeries,
    patients,
    surgeons,
    staff = [],
    orBlockSchedule,
    billing = [],
    claims = [],
    onAddSurgeon,
    onUpdateSurgeon,
    onDeleteSurgeon,
    onAddStaff,
    onUpdateStaff,
    onDeleteStaff
}) => {
    const [currentPage, setCurrentPage] = useState(1);
    const [filter, setFilter] = useState('all'); // all, today, pending, completed, alerts, date
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedCase, setSelectedCase] = useState(null);
    const [showPersonnelView, setShowPersonnelView] = useState(false);
    const [activeTab, setActiveTab] = useState('patient-info');
    const [personnelTab, setPersonnelTab] = useState('surgeons');
    const recordsPerPage = 10;

    // Calculate Manager-specific KPIs
    const kpis = useMemo(() => {
        const today = new Date().toISOString().split('T')[0];

        const todaySurgeries = surgeries.filter(s => s.date === today);
        const pendingSurgeries = surgeries.filter(s => s.status === 'scheduled');
        const completedSurgeries = surgeries.filter(s => s.status === 'completed');

        // Find cases with missing info (e.g., no CPT codes or empty notes)
        const alertCases = surgeries.filter(s =>
            s.status === 'scheduled' &&
            (!s.cpt_codes || s.cpt_codes.length === 0 || !s.doctor_name)
        );

        return {
            todayCount: todaySurgeries.length,
            pendingCount: pendingSurgeries.length,
            completedCount: completedSurgeries.length,
            alertsCount: alertCases.length,
            surgeonsCount: surgeons.length
        };
    }, [surgeries, surgeons]);

    // Apply Filter and Sort
    const filteredSurgeries = useMemo(() => {
        let result = [...surgeries];
        const today = new Date().toISOString().split('T')[0];

        if (filter === 'today') {
            result = result.filter(s => s.date === today);
        } else if (filter === 'pending') {
            result = result.filter(s => s.status === 'scheduled');
        } else if (filter === 'completed') {
            result = result.filter(s => s.status === 'completed');
        } else if (filter === 'alerts') {
            result = result.filter(s =>
                s.status === 'scheduled' &&
                (!s.cpt_codes || s.cpt_codes.length === 0 || !s.doctor_name)
            );
        } else if (filter === 'date') {
            result = result.filter(s => s.date === selectedDate);
        }

        return result.sort((a, b) => {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            if (dateB - dateA !== 0) return dateB - dateA; // Most recent first
            return a.start_time.localeCompare(b.start_time);
        });
    }, [surgeries, filter, selectedDate]);

    // Calculate pagination
    const totalPages = Math.ceil(filteredSurgeries.length / recordsPerPage);
    const paginatedSurgeries = useMemo(() => {
        const startIndex = (currentPage - 1) * recordsPerPage;
        return filteredSurgeries.slice(startIndex, startIndex + recordsPerPage);
    }, [filteredSurgeries, currentPage]);

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
        }
    };

    const handleFilterToggle = (newFilter) => {
        if (filter === newFilter) {
            setFilter('all');
        } else {
            setFilter(newFilter);
        }
        setCurrentPage(1); // Reset to first page when filter changes
    };

    const handleDateChange = (e) => {
        setSelectedDate(e.target.value);
        setFilter('date');
        setCurrentPage(1);
    };

    const tabs = [
        { id: 'patient-info', label: 'Patient Info' },
        { id: 'financial', label: 'Financial' },
        { id: 'procedure', label: 'Procedure Details' },
        { id: 'scheduling', label: 'Scheduling' },
        { id: 'implants', label: 'Implants & Products' },
        { id: 'clinical', label: 'Clinical' },
        { id: 'summary', label: 'Case Summary' },
        { id: 'docs', label: 'Doc Management' },
        { id: 'comments', label: 'Comments' },
        { id: 'logs', label: 'Activity Logs' },
    ];

    const renderCaseDetail = () => {
        const patient = patients.find(p => p.id === selectedCase.patient_id) || selectedCase.patients || {};
        const caseBilling = billing.find(b => b.surgery_id === selectedCase.id);
        const caseClaim = claims.find(c => c.surgery_id === selectedCase.id);
        const surgeon = surgeons.find(s => s.id === selectedCase.surgeon_id) || selectedCase.surgeons || {};

        return (
            <div className="case-detail-view fade-in">
                <div className="case-detail-header" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', width: '100%', gap: '1rem', marginBottom: '2rem' }}>
                    <button className="btn-back" onClick={() => setSelectedCase(null)}>
                        ← Back to Queues
                    </button>
                    <div className="case-tabs" style={{ width: '100%', overflowX: 'auto', display: 'flex', gap: '0.5rem', paddingBottom: '4px' }}>
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                className={`case-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                                onClick={() => setActiveTab(tab.id)}
                                style={{ flexShrink: 0, whiteSpace: 'nowrap' }}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="case-detail-content">
                    {activeTab === 'patient-info' && (
                        <div className="tab-pane">
                            <h2 className="section-title">Patient Information</h2>
                            <div className="detail-grid">
                                <div className="detail-item">
                                    <label>FULL NAME</label>
                                    <div className="detail-value-box">{patient.name || 'N/A'}</div>
                                </div>
                                <div className="detail-item">
                                    <label>DATE OF BIRTH</label>
                                    <div className="detail-value-box">{patient.dob || 'N/A'}</div>
                                </div>
                                <div className="detail-item">
                                    <label>MRN</label>
                                    <div className="detail-value-box">{patient.mrn || 'N/A'}</div>
                                </div>
                                <div className="detail-item">
                                    <label>GENDER</label>
                                    <div className="detail-value-box">{patient.gender || 'N/A'}</div>
                                </div>
                                <div className="detail-item">
                                    <label>PHONE</label>
                                    <div className="detail-value-box">{patient.phone || 'N/A'}</div>
                                </div>
                                <div className="detail-item">
                                    <label>EMAIL</label>
                                    <div className="detail-value-box">{patient.email || 'N/A'}</div>
                                </div>
                                <div className="detail-item" style={{ gridColumn: 'span 2' }}>
                                    <label>ADDRESS</label>
                                    <div className="detail-value-box">{patient.address || 'N/A'}</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'financial' && (
                        <div className="tab-pane">
                            <h2 className="section-title">Financial & Insurance</h2>

                            <h3 style={{ fontSize: '1rem', color: '#3b82f6', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.25rem' }}>Primary Insurance</h3>
                            <div className="detail-grid" style={{ marginBottom: '2rem' }}>
                                <div className="detail-item">
                                    <label>INSURANCE PROVIDER</label>
                                    <div className="detail-value-box">{patient.insurance_provider || 'N/A'}</div>
                                </div>
                                <div className="detail-item">
                                    <label>POLICY NUMBER</label>
                                    <div className="detail-value-box">{patient.insurance_policy_number || 'N/A'}</div>
                                </div>
                                <div className="detail-item">
                                    <label>GROUP NUMBER</label>
                                    <div className="detail-value-box">{patient.insurance_group_number || 'N/A'}</div>
                                </div>
                                <div className="detail-item">
                                    <label>INSURANCE TYPE</label>
                                    <div className="detail-value-box">{patient.insurance_type || 'Primary'}</div>
                                </div>
                                <div className="detail-item">
                                    <label>SUBSCRIBER NAME</label>
                                    <div className="detail-value-box">{patient.subscriber_name || 'N/A'}</div>
                                </div>
                                <div className="detail-item">
                                    <label>RELATIONSHIP</label>
                                    <div className="detail-value-box">{patient.subscriber_relationship || 'Self'}</div>
                                </div>
                                <div className="detail-item">
                                    <label>EFFECTIVE DATE</label>
                                    <div className="detail-value-box">{patient.insurance_effective_date || 'N/A'}</div>
                                </div>
                                <div className="detail-item">
                                    <label>EXPIRATION DATE</label>
                                    <div className="detail-value-box">{patient.insurance_expiration_date || 'N/A'}</div>
                                </div>
                                <div className="detail-item">
                                    <label>COPAY AMOUNT</label>
                                    <div className="detail-value-box">{patient.copay_amount ? `$${patient.copay_amount}` : 'N/A'}</div>
                                </div>
                                <div className="detail-item">
                                    <label>DEDUCTIBLE</label>
                                    <div className="detail-value-box">{patient.deductible_amount ? `$${patient.deductible_amount}` : 'N/A'}</div>
                                </div>
                            </div>

                            {patient.secondary_insurance_provider && (
                                <>
                                    <h3 style={{ fontSize: '1rem', color: '#64748b', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.25rem' }}>Secondary Insurance</h3>
                                    <div className="detail-grid" style={{ marginBottom: '2rem' }}>
                                        <div className="detail-item">
                                            <label>INSURANCE PROVIDER</label>
                                            <div className="detail-value-box">{patient.secondary_insurance_provider || 'N/A'}</div>
                                        </div>
                                        <div className="detail-item">
                                            <label>POLICY NUMBER</label>
                                            <div className="detail-value-box">{patient.secondary_insurance_policy_number || 'N/A'}</div>
                                        </div>
                                        <div className="detail-item">
                                            <label>GROUP NUMBER</label>
                                            <div className="detail-value-box">{patient.secondary_insurance_group_number || 'N/A'}</div>
                                        </div>
                                    </div>
                                </>
                            )}

                            <h3 style={{ fontSize: '1rem', color: '#059669', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.25rem' }}>Case Billing Status</h3>
                            <div className="detail-grid">
                                <div className="detail-item">
                                    <label>TOTAL AMOUNT</label>
                                    <div className="detail-value-box highlight-value">${caseBilling?.total_amount?.toLocaleString() || '0.00'}</div>
                                </div>
                                <div className="detail-item">
                                    <label>INSURANCE RESPONSIBILITY</label>
                                    <div className="detail-value-box">${caseBilling?.insurance_amount?.toLocaleString() || '0.00'}</div>
                                </div>
                                <div className="detail-item">
                                    <label>BILLING STATUS</label>
                                    <div className={`detail-value-box status-box ${caseBilling?.status?.toLowerCase() || 'pending'}`}>
                                        {caseBilling?.status || 'PENDING'}
                                    </div>
                                </div>
                                <div className="detail-item">
                                    <label>CLAIM ID</label>
                                    <div className="detail-value-box">{caseClaim?.id || 'NO CLAIM FILED'}</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'procedure' && (
                        <div className="tab-pane">
                            <h2 className="section-title">Procedure Details</h2>
                            <div className="detail-grid">
                                <div className="detail-item" style={{ gridColumn: 'span 2' }}>
                                    <label>CPT CODES (PROCEDURES)</label>
                                    <div className="detail-value-box" style={{ height: 'auto', minHeight: '60px', flexWrap: 'wrap', gap: '0.5rem' }}>
                                        {selectedCase.cpt_codes?.map(code => (
                                            <span key={code} className="cpt-tag">{code}</span>
                                        )) || 'General Procedure'}
                                    </div>
                                </div>
                                <div className="detail-item">
                                    <label>PRIMARY SURGEON</label>
                                    <div className="detail-value-box">{selectedCase.doctor_name || surgeon.name || 'N/A'}</div>
                                </div>
                                <div className="detail-item">
                                    <label>SIDE / LATERALITY</label>
                                    <div className="detail-value-box">{selectedCase.laterality || 'N/A'}</div>
                                </div>
                                <div className="detail-item">
                                    <label>ANESTHESIA TYPE</label>
                                    <div className="detail-value-box">{selectedCase.anesthesia_type || 'GENERAL'}</div>
                                </div>
                                <div className="detail-item">
                                    <label>ESTIMATED DURATION</label>
                                    <div className="detail-value-box">90 Minutes (Placeholder)</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'scheduling' && (
                        <div className="tab-pane">
                            <h2 className="section-title">Scheduling Details</h2>
                            <div className="detail-grid">
                                <div className="detail-item">
                                    <label>SURGERY DATE</label>
                                    <div className="detail-value-box">{selectedCase.date}</div>
                                </div>
                                <div className="detail-item">
                                    <label>START TIME</label>
                                    <div className="detail-value-box">{selectedCase.start_time}</div>
                                </div>
                                <div className="detail-item">
                                    <label>END TIME</label>
                                    <div className="detail-value-box">{selectedCase.end_time || 'N/A'}</div>
                                </div>
                                <div className="detail-item">
                                    <label>OR ROOM / BLOCK</label>
                                    <div className="detail-value-box">{selectedCase.or_room || 'OR-1'}</div>
                                </div>
                                <div className="detail-item">
                                    <label>PATIENT ARRIVAL TIME</label>
                                    <div className="detail-value-box">07:00:00 (Placeholder)</div>
                                </div>
                                <div className="detail-item">
                                    <label>SCHEDULING STATUS</label>
                                    <div className="detail-value-box status-box confirmed">CONFIRMED</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'implants' && (
                        <div className="tab-pane">
                            <h2 className="section-title">Implants & Products</h2>
                            <div className="empty-pane" style={{ padding: '2rem' }}>
                                <p style={{ marginBottom: '1.5rem' }}>No implants or specialized products associated with this case.</p>
                                <button className="btn-save-changes" style={{ background: '#3b82f6' }}>+ Add Implant</button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'clinical' && (
                        <div className="tab-pane">
                            <h2 className="section-title">Clinical Information</h2>
                            <div className="detail-grid">
                                <div className="detail-item" style={{ gridColumn: 'span 2' }}>
                                    <label>DIAGNOSIS / INDICATIONS</label>
                                    <div className="detail-value-box" style={{ minHeight: '80px', alignItems: 'flex-start', padding: '1rem' }}>
                                        {selectedCase.notes || 'No clinical notes provided for this case.'}
                                    </div>
                                </div>
                                <div className="detail-item">
                                    <label>ALLERGIES</label>
                                    <div className="detail-value-box" style={{ color: '#ef4444', fontWeight: 'bold' }}>NKA (Placeholder)</div>
                                </div>
                                <div className="detail-item">
                                    <label>PRE-OP CLEARANCE</label>
                                    <div className="detail-value-box status-box completed">COMPLETED</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {['summary', 'docs', 'comments', 'logs'].includes(activeTab) && (
                        <div className="tab-pane empty-pane">
                            <div className="placeholder-icon" style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.3 }}>📂</div>
                            <p>Development ongoing for <strong>{tabs.find(t => t.id === activeTab).label}</strong> section.</p>
                            <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '0.5rem' }}>This information will be available in the next system update.</p>
                        </div>
                    )}
                </div>

                <div className="case-detail-footer">
                    <div className="footer-info">
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>CASE ID:</span>
                            <strong>{selectedCase.id}</strong>
                        </span>
                        <div style={{ width: '1px', height: '20px', background: '#e2e8f0' }}></div>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>PATIENT:</span>
                            <strong>{patient.name}</strong>
                        </span>
                    </div>
                    <div className="footer-actions">
                        <button className="btn-cancel-case">Cancel Case</button>
                        <button className="btn-save-changes">Save Changes</button>
                    </div>
                </div>
            </div>
        );
    };

    const renderPersonnelOverview = () => {
        return (
            <div className="case-detail-view fade-in">
                <div className="case-detail-header" style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <button className="btn-back" onClick={() => setShowPersonnelView(false)}>
                        ← Back to Dashboard
                    </button>
                    <div className="case-tabs">
                        <button
                            className={`case-tab-btn ${personnelTab === 'surgeons' ? 'active' : ''}`}
                            onClick={() => setPersonnelTab('surgeons')}
                        >
                            👨‍⚕️ Surgeons
                        </button>
                        <button
                            className={`case-tab-btn ${personnelTab === 'staff' ? 'active' : ''}`}
                            onClick={() => setPersonnelTab('staff')}
                        >
                            👩‍⚕️ Nurses & Staff
                        </button>
                    </div>
                </div>

                <div className="case-detail-content" style={{ padding: '0' }}>
                    {personnelTab === 'surgeons' && (
                        <SurgeonManagement
                            surgeons={surgeons}
                            onAdd={onAddSurgeon}
                            onUpdate={onUpdateSurgeon}
                            onDelete={onDeleteSurgeon}
                        />
                    )}

                    {personnelTab === 'staff' && (
                        <StaffManagement
                            staff={staff}
                            onAdd={onAddStaff}
                            onUpdate={onUpdateStaff}
                            onDelete={onDeleteStaff}
                        />
                    )}
                </div>

                <div className="case-detail-footer">
                    <div className="footer-info">
                        <strong>Total Personnel: {personnelTab === 'surgeons' ? surgeons.length : staff.length} Active</strong>
                    </div>
                </div>
            </div>
        )
    }

    if (showPersonnelView) {
        return (
            <div className="dashboard-container">
                {renderPersonnelOverview()}
                <style dangerouslySetInnerHTML={{
                    __html: `
                    .case-detail-view {
                        background: #f8fafc;
                        min-height: calc(100vh - 40px);
                        display: flex;
                        flex-direction: column;
                        font-family: 'Inter', sans-serif;
                    }
                    .case-detail-header {
                        background: white;
                        padding: 1rem 2rem;
                        border-bottom: 1px solid #e2e8f0;
                        display: flex;
                        flex-direction: column;
                        gap: 1.25rem;
                        position: sticky;
                        top: 0;
                        z-index: 100;
                        box-shadow: 0 4px 6px -4px rgba(0,0,0,0.05);
                    }
                    .btn-back {
                        background: #f1f5f9;
                        border: 1px solid #e2e8f0;
                        color: #64748b;
                        font-weight: 600;
                        cursor: pointer;
                        font-size: 0.85rem;
                        padding: 0.5rem 1rem;
                        border-radius: 50px;
                        width: fit-content;
                        transition: all 0.2s;
                    }
                    .btn-back:hover {
                        background: #e2e8f0;
                        color: #1e293b;
                    }
                    .case-tabs {
                        display: flex;
                        gap: 0.5rem;
                        overflow-x: auto;
                        padding: 0.4rem;
                        background: #f8fafc;
                        border-radius: 12px;
                        border: 1px solid #e2e8f0;
                        scrollbar-width: none;
                    }
                    .case-tab-btn {
                        padding: 0.6rem 1.25rem;
                        border: none;
                        background: transparent;
                        color: #64748b;
                        font-size: 0.85rem;
                        font-weight: 600;
                        cursor: pointer;
                        border-radius: 8px;
                        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                        white-space: nowrap;
                    }
                    .case-tab-btn:hover {
                        background: rgba(255,255,255,0.8);
                        color: #1e293b;
                    }
                    .case-tab-btn.active {
                        background: white;
                        color: #059669;
                        box-shadow: 0 4px 12px rgba(5, 150, 105, 0.15);
                    }
                    .case-detail-content {
                        flex: 1;
                        padding: 1.5rem;
                        overflow-y: auto;
                    }
                    .tab-pane {
                        background: white;
                        border-radius: 16px;
                        padding: 2rem;
                        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);
                        max-width: 1200px;
                        margin: 0 auto;
                        border: 1px solid #e2e8f0;
                    }
                    .section-title {
                        font-size: 1.25rem;
                        color: #1e293b;
                        margin-bottom: 2rem;
                        border-left: 4px solid #059669;
                        padding-left: 1rem;
                        font-weight: 700;
                    }
                    .case-detail-footer {
                        background: white;
                        border-top: 1px solid #e2e8f0;
                        padding: 1rem 3rem;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    }
                    .btn-save-changes {
                        padding: 0.6rem 2rem;
                        background: #059669;
                        border: none;
                        border-radius: 8px;
                        color: white;
                        font-weight: 600;
                        cursor: pointer;
                        box-shadow: 0 4px 6px -1px rgba(5, 150, 105, 0.4);
                        font-size: 0.85rem;
                    }
                    .empty-pane { text-align: center; color: #64748b; }
                `}} />
            </div>
        )
    }

    if (selectedCase) {
        return (
            <div className="dashboard-container">
                {renderCaseDetail()}
                <style dangerouslySetInnerHTML={{
                    __html: `
                    .case-detail-view {
                        background: #f8fafc;
                        min-height: calc(100vh - 40px);
                        display: flex;
                        flex-direction: column;
                        font-family: 'Inter', sans-serif;
                    }
                    .case-detail-header {
                        background: white;
                        padding: 1rem 2rem;
                        border-bottom: 1px solid #e2e8f0;
                        display: flex;
                        flex-direction: column;
                        gap: 1.25rem;
                        position: sticky;
                        top: 0;
                        z-index: 100;
                        box-shadow: 0 4px 6px -4px rgba(0,0,0,0.05);
                    }
                    .btn-back {
                        background: #f1f5f9;
                        border: 1px solid #e2e8f0;
                        color: #64748b;
                        font-weight: 600;
                        cursor: pointer;
                        font-size: 0.85rem;
                        padding: 0.5rem 1rem;
                        border-radius: 50px;
                        width: fit-content;
                        transition: all 0.2s;
                    }
                    .btn-back:hover {
                        background: #e2e8f0;
                        color: #1e293b;
                    }
                    .case-tabs {
                        display: flex;
                        gap: 0.5rem;
                        overflow-x: auto;
                        padding: 0.4rem;
                        background: #f8fafc;
                        border-radius: 12px;
                        border: 1px solid #e2e8f0;
                        scrollbar-width: none; /* Firefox */
                    }
                    .case-tabs::-webkit-scrollbar {
                        display: none; /* Chrome/Safari */
                    }
                    .case-tab-btn {
                        padding: 0.6rem 1.25rem;
                        border: none;
                        background: transparent;
                        color: #64748b;
                        font-size: 0.85rem;
                        font-weight: 600;
                        cursor: pointer;
                        border-radius: 8px;
                        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                        white-space: nowrap;
                    }
                    .case-tab-btn:hover {
                        background: rgba(255,255,255,0.8);
                        color: #1e293b;
                        transform: translateY(-1px);
                    }
                    .case-tab-btn.active {
                        background: white;
                        color: #059669;
                        box-shadow: 0 4px 12px rgba(5, 150, 105, 0.15);
                        transform: translateY(-1px);
                    }
                    .case-detail-content {
                        flex: 1;
                        padding: 1.5rem;
                        overflow-y: auto;
                    }
                    .tab-pane {
                        background: white;
                        border-radius: 16px;
                        padding: 1.5rem 2rem;
                        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);
                        max-width: 1000px;
                        margin: 0 auto;
                        border: 1px solid #e2e8f0;
                    }
                    .section-title {
                        font-size: 1.25rem;
                        color: #1e293b;
                        margin-bottom: 1.5rem;
                        border-left: 4px solid #059669;
                        padding-left: 1rem;
                        display: flex;
                        align-items: center;
                        font-weight: 700;
                    }
                    .detail-grid {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 1.25rem 2rem;
                    }
                    .detail-item {
                        display: flex;
                        flex-direction: column;
                        gap: 0.4rem;
                    }
                    .detail-item label {
                        font-size: 0.65rem;
                        font-weight: 700;
                        color: #94a3b8;
                        letter-spacing: 0.075em;
                        text-transform: uppercase;
                    }
                    .detail-value-box {
                        background: #f8fafc;
                        border: 1px solid #e2e8f0;
                        border-radius: 8px;
                        padding: 0.6rem 1rem;
                        color: #334155;
                        font-weight: 500;
                        min-height: 42px;
                        display: flex;
                        align-items: center;
                        font-size: 0.95rem;
                        transition: border-color 0.2s;
                    }
                    .detail-value-box:hover {
                        border-color: #cbd5e1;
                    }
                    .highlight-value {
                        color: #059669;
                        font-size: 1.25rem;
                        font-weight: 800;
                    }
                    .status-box {
                        justify-content: center;
                        text-transform: uppercase;
                        font-size: 0.75rem;
                        letter-spacing: 0.5px;
                        font-weight: 700;
                    }
                    .status-box.pending { background: #fff7ed; color: #c2410c; border-color: #ffedd5; }
                    .status-box.completed, .status-box.confirmed { background: #f0fdf4; color: #15803d; border-color: #dcfce7; }
                    .cpt-tag {
                        padding: 0.25rem 0.6rem;
                        background: #ecfdf5;
                        color: #059669;
                        border-radius: 6px;
                        font-size: 0.75rem;
                        font-weight: 700;
                        border: 1px solid #d1fae5;
                    }
                    .case-detail-footer {
                        background: white;
                        border-top: 1px solid #e2e8f0;
                        padding: 1rem 3rem;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    }
                    .footer-info {
                        display: flex;
                        gap: 1.5rem;
                        align-items: center;
                        color: #1e293b;
                        font-size: 0.95rem;
                    }
                    .footer-actions {
                        display: flex;
                        gap: 1rem;
                    }
                    .btn-cancel-case {
                        padding: 0.6rem 1.5rem;
                        background: #fff;
                        border: 1px solid #e2e8f0;
                        border-radius: 8px;
                        color: #64748b;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.2s;
                        font-size: 0.85rem;
                    }
                    .btn-cancel-case:hover {
                        background: #fef2f2;
                        color: #ef4444;
                        border-color: #fecaca;
                    }
                    .btn-save-changes {
                        padding: 0.6rem 2rem;
                        background: #059669;
                        border: none;
                        border-radius: 8px;
                        color: white;
                        font-weight: 600;
                        cursor: pointer;
                        box-shadow: 0 4px 6px -1px rgba(5, 150, 105, 0.4);
                        transition: all 0.2s;
                        font-size: 0.85rem;
                    }
                    .btn-save-changes:hover {
                        background: #047857;
                        transform: translateY(-2px);
                        box-shadow: 0 10px 15px -3px rgba(5, 150, 105, 0.4);
                    }
                    .empty-pane {
                        text-align: center;
                        padding: 4rem 2rem !important;
                        color: #64748b;
                    }
                `}} />
            </div>
        );
    }

    return (
        <div className="dashboard fade-in">
            <div className="dashboard-header">
                <div className="header-left">
                    <h2 className="page-title">Manager Dashboard</h2>
                </div>
                <div className="header-actions">
                </div>
            </div>

            <div className="dashboard-content">
                {/* KPI Row */}
                <div className="stats-hero">
                    <div
                        className={`hero-card revenue-hero clickable ${filter === 'today' ? 'active-filter' : ''}`}
                        onClick={() => handleFilterToggle('today')}
                    >
                        <div className="hero-icon-wrapper">
                            <span className="hero-icon">📅</span>
                        </div>
                        <div className="hero-content">
                            <span className="hero-label">Cases Today</span>
                            <span className="hero-value">{kpis.todayCount}</span>
                            {/* <span className="hero-trend positive">Active Today</span> */}
                        </div>
                        <div className="hero-bg-pattern"></div>
                    </div>

                    <div
                        className={`hero-card profit-hero clickable ${filter === 'pending' ? 'active-filter' : ''}`}
                        onClick={() => handleFilterToggle('pending')}
                    >
                        <div className="hero-icon-wrapper">
                            <span className="hero-icon">⏳</span>
                        </div>
                        <div className="hero-content">
                            <span className="hero-label">Pending Cases</span>
                            <span className="hero-value">{kpis.pendingCount}</span>
                            {/* <span className="hero-trend">Needs Attn</span> */}
                        </div>
                        <div className="hero-bg-pattern"></div>
                    </div>

                    <div
                        className="hero-card surgeons-hero clickable"
                        onClick={() => setShowPersonnelView(true)}
                    >
                        <div className="hero-icon-wrapper">
                            <span className="hero-icon">👨‍⚕️</span>
                        </div>
                        <div className="hero-content">
                            <span className="hero-label">Total Surgeons</span>
                            <span className="hero-value">{kpis.surgeonsCount}</span>
                            {/* <span className="hero-trend positive">Active Staff</span> */}
                        </div>
                        <div className="hero-bg-pattern"></div>
                    </div>

                    <div className="mini-stats-column">
                        <div
                            className={`mini-stat-card clickable ${filter === 'completed' ? 'active-filter' : ''}`}
                            onClick={() => handleFilterToggle('completed')}
                        >
                            <div className="mini-stat-icon cases">✅</div>
                            <div className="mini-stat-info">
                                <span className="mini-stat-label">Completed</span>
                                <span className="mini-stat-value">{kpis.completedCount}</span>
                            </div>
                        </div>
                        <div
                            className={`mini-stat-card clickable ${filter === 'alerts' ? 'active-filter' : ''}`}
                            onClick={() => handleFilterToggle('alerts')}
                        >
                            <div className="mini-stat-icon cost">⚠️</div>
                            <div className="mini-stat-info">
                                <span className="mini-stat-label">Alerts</span>
                                <span className="mini-stat-value">{kpis.alertsCount}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="dashboard-grid full-width-grid">
                    {/* Surgery Schedule Card - Full Width */}
                    <div className="chart-card full-width-card">
                        <div className="chart-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                                <h3 style={{ margin: 0, alignSelf: 'center' }}>
                                    {filter === 'all' ? 'Surgery Schedule' :
                                        filter === 'date' ? `Schedule for ${selectedDate}` :
                                            `${filter.charAt(0).toUpperCase() + filter.slice(1)} Cases`}
                                </h3>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <div className="date-filter-group" style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        background: '#f8fafc',
                                        padding: '0 0.6rem',
                                        borderRadius: '6px',
                                        border: '1px solid #e2e8f0',
                                        height: '32px'
                                    }}>
                                        <span style={{ fontSize: '0.75rem', color: '#64748b', marginRight: '0.4rem', fontWeight: '500' }}>📅 Schedule For:</span>
                                        <input
                                            type="date"
                                            value={selectedDate}
                                            onChange={handleDateChange}
                                            style={{
                                                border: 'none',
                                                color: '#1e293b',
                                                fontWeight: '600',
                                                fontSize: '0.75rem',
                                                outline: 'none',
                                                cursor: 'pointer',
                                                background: 'transparent',
                                                padding: '0',
                                                height: '100%'
                                            }}
                                        />
                                    </div>

                                    {filter !== 'all' && (
                                        <button
                                            className="btn-action"
                                            style={{
                                                padding: '0 0.8rem',
                                                height: '32px',
                                                background: '#fef2f2',
                                                color: '#ef4444',
                                                borderColor: '#fee2e2',
                                                fontSize: '0.75rem',
                                                display: 'flex',
                                                alignItems: 'center',
                                                fontWeight: '600',
                                                borderRadius: '6px'
                                            }}
                                            onClick={() => setFilter('all')}
                                        >
                                            ✕ Clear Filter
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="pagination-info" style={{ alignSelf: 'center' }}>
                                Showing {filteredSurgeries.length > 0 ? ((currentPage - 1) * recordsPerPage) + 1 : 0} - {Math.min(currentPage * recordsPerPage, filteredSurgeries.length)} of {filteredSurgeries.length}
                            </div>
                        </div>
                        <div className="table-container" style={{ padding: '1rem' }}>
                            {filteredSurgeries.length === 0 ? (
                                <div className="empty-state" style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '5rem 2rem',
                                    minHeight: '200px'
                                }}>
                                    <p style={{ color: '#64748b', fontSize: '1.1rem', marginBottom: '1.5rem' }}>No surgeries found for the selected filter.</p>
                                    <button className="btn-action" style={{ padding: '0.75rem 2rem', background: '#3b82f6', color: 'white', border: 'none' }} onClick={() => setFilter('all')}>
                                        Show All Surgeries
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <div className="table-responsive">
                                        <table className="management-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                                            <thead>
                                                <tr style={{ textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>
                                                    <th style={{ padding: '0.75rem' }}>Date</th>
                                                    <th style={{ padding: '0.75rem' }}>Time</th>
                                                    <th style={{ padding: '0.75rem' }}>Patient</th>
                                                    <th style={{ padding: '0.75rem' }}>Surgeon</th>
                                                    <th style={{ padding: '0.75rem' }}>Procedure</th>
                                                    <th style={{ padding: '0.75rem' }}>Status</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {paginatedSurgeries.map(s => (
                                                    <tr
                                                        key={s.id}
                                                        style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}
                                                        className="row-hover"
                                                        onClick={() => setSelectedCase(s)}
                                                    >
                                                        <td style={{ padding: '0.75rem' }}>{s.date}</td>
                                                        <td style={{ padding: '0.75rem' }}>{s.start_time}</td>
                                                        <td style={{ padding: '0.75rem' }}>{s.patients?.name || 'Unknown'}</td>
                                                        <td style={{ padding: '0.75rem' }}>{s.doctor_name}</td>
                                                        <td style={{ padding: '0.75rem' }}>
                                                            {s.cpt_codes?.slice(0, 2).join(', ') || 'General'}
                                                            {s.cpt_codes?.length > 2 ? '...' : ''}
                                                        </td>
                                                        <td style={{ padding: '0.75rem' }}>
                                                            <span className={`status-badge ${s.status}`}>
                                                                {s.status}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Pagination Controls */}
                                    {totalPages > 1 && (
                                        <div className="pagination-controls">
                                            <button
                                                className="pagination-btn"
                                                onClick={() => handlePageChange(currentPage - 1)}
                                                disabled={currentPage === 1}
                                            >
                                                Previous
                                            </button>
                                            <div className="page-numbers">
                                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                                    let pageNum;
                                                    if (totalPages <= 5) pageNum = i + 1;
                                                    else if (currentPage <= 3) pageNum = i + 1;
                                                    else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                                                    else pageNum = currentPage - 2 + i;

                                                    return (
                                                        <button
                                                            key={pageNum}
                                                            className={`page-num ${currentPage === pageNum ? 'active' : ''}`}
                                                            onClick={() => handlePageChange(pageNum)}
                                                        >
                                                            {pageNum}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                            <button
                                                className="pagination-btn"
                                                onClick={() => handlePageChange(currentPage + 1)}
                                                disabled={currentPage === totalPages}
                                            >
                                                Next
                                            </button>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                .stats-hero {
                    display: grid !important;
                    grid-template-columns: 1fr 1fr 1fr 0.8fr !important;
                    gap: 1rem !important;
                    margin-bottom: 1.5rem !important;
                    height: auto !important;
                }
                .surgeons-hero {
                    background: linear-gradient(135deg, #ffffff 0%, #faf5ff 100%) !important;
                    border: 1px solid #f3e8ff !important;
                }
                .hero-card {
                    padding: 1.2rem !important;
                    min-height: auto !important;
                    display: flex !important;
                    align-items: center !important;
                    gap: 1.2rem !important;
                }
                .hero-icon-wrapper {
                    width: 48px !important;
                    height: 48px !important;
                    margin-bottom: 0 !important;
                }
                .hero-icon {
                    font-size: 1.5rem !important;
                }
                .hero-content {
                    text-align: left !important;
                }
                .hero-value {
                    font-size: 2rem !important;
                    margin: 2px 0 !important;
                }
                .hero-label {
                    font-size: 0.85rem !important;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                .mini-stat-card {
                    padding: 0.8rem 1.2rem !important;
                    margin-bottom: 0.75rem !important;
                }
                .mini-stat-card:last-child {
                    margin-bottom: 0 !important;
                }
                .mini-stat-icon {
                    width: 36px !important;
                    height: 36px !important;
                    font-size: 1.1rem !important;
                }
                .mini-stat-value {
                    font-size: 1.2rem !important;
                }
                
                .full-width-grid {
                    display: block !important;
                }
                .full-width-card {
                    width: 100% !important;
                    margin-bottom: 2rem;
                }
                .status-badge {
                    padding: 4px 8px;
                    border-radius: 4px;
                    font-size: 0.75rem;
                    font-weight: 600;
                    text-transform: uppercase;
                }
                .status-badge.scheduled { background: #dbeafe; color: #1e40af; }
                .status-badge.completed { background: #d1fae5; color: #065f46; }
                .status-badge.cancelled { background: #fee2e2; color: #991b1b; }
                .status-badge.in-progress { background: #fef3c7; color: #92400e; }
                
                .clickable {
                    cursor: pointer;
                    transition: transform 0.2s, box-shadow 0.2s;
                }
                .clickable:hover {
                    transform: translateY(-4px);
                    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
                }
                .active-filter {
                    border: 2px solid #3b82f6 !important;
                    transform: translateY(-4px);
                    box-shadow: 0 10px 15px -3px rgba(59, 130, 246, 0.2);
                }
                
                .row-hover:hover {
                    background-color: #f8fafc;
                }
                
                .pagination-controls {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    gap: 1rem;
                    margin-top: 1.5rem;
                    padding-top: 1rem;
                    border-top: 1px solid #f1f5f9;
                }
                .pagination-btn {
                    padding: 0.5rem 1rem;
                    border: 1px solid #e2e8f0;
                    background: white;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 0.85rem;
                    color: #64748b;
                    transition: all 0.2s;
                }
                .pagination-btn:hover:not(:disabled) {
                    background: #f8fafc;
                    border-color: #cbd5e1;
                    color: #1e293b;
                }
                .pagination-btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
                .page-numbers {
                    display: flex; gap: 0.5rem;
                }
                .page-num {
                    width: 32px; height: 32px;
                    display: flex; align-items: center; justify-content: center;
                    border: 1px solid #e2e8f0; background: white; border-radius: 6px;
                    cursor: pointer; font-size: 0.85rem; color: #64748b;
                }
                .page-num.active {
                    background: #3b82f6; color: white; border-color: #3b82f6;
                }
                .btn-action {
                    padding: 0.5rem 1rem;
                    background: #f1f5f9;
                    border: 1px solid #e2e8f0;
                    border-radius: 6px;
                    color: #475569;
                    font-size: 0.85rem;
                    font-weight: 500;
                    cursor: pointer;
                }
            `}} />
        </div>
    );
};

export default ManagerDashboard;
