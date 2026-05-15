import React, { useState, useEffect } from 'react';
import './AuditLogs.css';

const AuditLogs = ({ logs = [] }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState('All');

    const getActionType = (action) => {
        const a = action.toLowerCase();
        if (a.includes('update')) return 'update';
        if (a.includes('add') || a.includes('schedule') || a.includes('create')) return 'add';
        if (a.includes('delete') || a.includes('remove')) return 'delete';
        return 'other';
    };

    const filteredLogs = logs.filter(log => {
        const matchesSearch = (log.user_email?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              log.action?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              log.details?.toLowerCase().includes(searchQuery.toLowerCase()));
        
        const actionType = getActionType(log.action);
        const matchesFilter = filterType === 'All' || 
                             (filterType === 'Updates' && actionType === 'update') ||
                             (filterType === 'Creations' && actionType === 'add') ||
                             (filterType === 'Deletions' && actionType === 'delete');
                             
        return matchesSearch && matchesFilter;
    });

    const formatTimestamp = (ts) => {
        if (!ts) return '-';
        const date = new Date(ts);
        return date.toLocaleString();
    };

    return (
        <div className="audit-logs-container fade-in">
            <div className="management-header">
                <h2>📜 System Audit Logs</h2>
                <p>Track all administrative actions and security-related events across the platform.</p>
            </div>

            <div className="audit-content">
                <div className="audit-card">
                    <div className="card-header">
                        <h3>Recent Activity</h3>
                        <div className="filters">
                            <input 
                                type="text" 
                                placeholder="Search logs..." 
                                className="search-input" 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            <select 
                                className="filter-select"
                                value={filterType}
                                onChange={(e) => setFilterType(e.target.value)}
                            >
                                <option value="All">All Actions</option>
                                <option value="Updates">Updates</option>
                                <option value="Creations">Creations</option>
                                <option value="Deletions">Deletions</option>
                            </select>
                        </div>
                    </div>

                    <div className="audit-table-wrapper">
                        <table className="audit-table">
                            <thead>
                                <tr>
                                    <th>User</th>
                                    <th>Action</th>
                                    <th>Timestamp</th>
                                    <th>Details</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredLogs.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                                            No audit logs found.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredLogs.map(log => (
                                        <tr key={log.id}>
                                            <td>
                                                <div className="user-cell">
                                                    <span className="user-icon">👤</span>
                                                    <span className="user-email">{log.user_email}</span>
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`action-badge ${getActionType(log.action)}`}>
                                                    {log.action}
                                                </span>
                                            </td>
                                            <td className="timestamp">{formatTimestamp(log.created_at)}</td>
                                            <td className="details">{log.details}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AuditLogs;
