import React, { useMemo, useState } from 'react';
import './Dashboard.css'; // Reuse some dashboard styles

const ManagerDashboard = ({ surgeries, patients, surgeons, orBlockSchedule }) => {
    const [currentPage, setCurrentPage] = useState(1);
    const [filter, setFilter] = useState('all'); // all, today, pending, completed, alerts, date
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
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
            alertsCount: alertCases.length
        };
    }, [surgeries]);

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

    return (
        <div className="dashboard fade-in">
            <div className="dashboard-header">
                <div className="header-left">
                    <h2 className="page-title">Manager Dashboard</h2>
                </div>
                <div className="header-actions" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div className="date-filter-group" style={{ display: 'flex', alignItems: 'center', background: 'white', padding: '0.4rem 0.8rem', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                        <span style={{ fontSize: '0.85rem', color: '#64748b', marginRight: '0.5rem', fontWeight: '500' }}>📅 Schedule For:</span>
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={handleDateChange}
                            style={{ border: 'none', color: '#1e293b', fontWeight: '600', fontSize: '0.85rem', outline: 'none', cursor: 'pointer' }}
                        />
                    </div>
                    {filter !== 'all' && (
                        <button className="btn-action" style={{ background: '#fef2f2', color: '#ef4444', borderColor: '#fee2e2' }} onClick={() => setFilter('all')}>
                            Clear Filter
                        </button>
                    )}
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
                            <span className="hero-trend positive">Active Today</span>
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
                            <span className="hero-trend">Needs Attn</span>
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
                        <div className="chart-header">
                            <h3>
                                {filter === 'all' ? 'Surgery Schedule' :
                                    filter === 'date' ? `Schedule for ${selectedDate}` :
                                        `${filter.charAt(0).toUpperCase() + filter.slice(1)} Cases`}
                            </h3>
                            <div className="pagination-info">
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
                                                    <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }} className="row-hover">
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
                    gap: 1rem !important;
                    margin-bottom: 1.5rem !important;
                    height: auto !important;
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
