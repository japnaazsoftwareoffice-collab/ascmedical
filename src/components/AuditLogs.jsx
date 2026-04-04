import React, { useState, useEffect } from 'react';
import './AuditLogs.css';

const AuditLogs = () => {
    const [logs, setLogs] = useState([
        { id: 1, user: 'admin@hospital.com', action: 'Update Role Permissions', timestamp: '2026-04-03 14:20:15', details: 'Changed permissions for Surgeon' },
        { id: 2, user: 'manager@hospital.com', action: 'Schedule Surgery', timestamp: '2026-04-03 15:45:22', details: 'Patient ID: 1045, Dr. Williams' },
        { id: 3, user: 'admin@hospital.com', action: 'Add New Staff', timestamp: '2026-04-04 09:12:05', details: 'Nurse Jane Cooper (Registration)' },
        { id: 4, user: 'admin@hospital.com', action: 'Update Settings', timestamp: '2026-04-04 10:05:48', details: 'Modified CPT pricing multipliers' }
    ]);

    const getActionType = (action) => {
        if (action.includes('Update')) return 'update';
        if (action.includes('Add') || action.includes('Schedule')) return 'add';
        if (action.includes('Delete')) return 'delete';
        return 'other';
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
                            <input type="text" placeholder="Search logs..." className="search-input" />
                            <select className="filter-select">
                                <option>All Actions</option>
                                <option>Updates</option>
                                <option>Creations</option>
                                <option>Deletions</option>
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
                                {logs.map(log => (
                                    <tr key={log.id}>
                                        <td>
                                            <div className="user-cell">
                                                <span className="user-icon">👤</span>
                                                <span className="user-email">{log.user}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`action-badge ${getActionType(log.action)}`}>
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="timestamp">{log.timestamp}</td>
                                        <td className="details">{log.details}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AuditLogs;
