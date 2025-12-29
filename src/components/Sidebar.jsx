import React from 'react';
import './Sidebar.css';

const Sidebar = ({ currentView, onViewChange, user, onLogout }) => {
    // Define menu items based on user role
    const getMenuItems = () => {
        if (user.role === 'admin') {
            return [
                { id: 'dashboard', icon: '📊', label: 'Financial Dashboard' },
                { id: 'register', icon: '👥', label: 'Patient Management' },
                { id: 'claims', icon: '📄', label: 'Claims Management' },
                { id: 'scheduler', icon: '📅', label: 'Surgery Log & OR' },
                { id: 'or-schedule', icon: '🗓️', label: 'OR Block Schedule' },
                { id: 'surgery-schedule-sidebar', icon: '🗓️', label: 'Surgery Schedule' },
                { id: 'surgeons', icon: '👨‍⚕️', label: 'Surgeon Management' },
                { id: 'staff', icon: '👩‍⚕️', label: 'Nurses & Staff' },
                { id: 'users', icon: '🔐', label: 'User Management' },
                { id: 'analysis', icon: '🏥', label: 'OR Utilization' },
                { id: 'scorecard', icon: '🎯', label: 'Surgeon Scorecard' },
                { id: 'cpt', icon: '⚙️', label: 'CPT & Categories' },
                { id: 'auto-cpt', icon: '🔄', label: 'CPT Auto-Updater' },
                { id: 'settings', icon: '🔧', label: 'Settings' }
            ];
        } else if (user.role === 'surgeon') {
            return [
                { id: 'my-schedule', icon: '📅', label: 'My Schedule' },
                { id: 'patients', icon: '👥', label: 'My Patients' },
                { id: 'scheduler', icon: '➕', label: 'Schedule Surgery' }
            ];
        } else if (user.role === 'patient') {
            return [
                { id: 'my-info', icon: '👤', label: 'My Information' },
                { id: 'my-surgeries', icon: '📋', label: 'My Surgeries' },
                { id: 'my-bills', icon: '💰', label: 'Billing' }
            ];
        }
        return [];
    };

    const menuItems = getMenuItems();

    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <span className="logo-text">ASC MANAGER</span>
                <span className="role-badge">{user.role.toUpperCase()}</span>
            </div>

            <div className="user-profile">
                <div className="user-avatar">
                    {user.role === 'admin' && '👨‍💼'}
                    {user.role === 'surgeon' && '👨‍⚕️'}
                    {user.role === 'patient' && '👤'}
                </div>
                <div className="user-info">
                    <div className="user-name">{user.name}</div>
                    <div className="user-email">{user.email}</div>
                </div>
            </div>

            <nav className="sidebar-nav">
                {menuItems.map(item => (
                    <button
                        key={item.id}
                        className={`nav-item ${currentView === item.id ? 'active' : ''}`}
                        onClick={() => onViewChange(item.id)}
                    >
                        <span className="icon">{item.icon}</span>
                        {item.label}
                    </button>
                ))}
            </nav>

            <div className="sidebar-footer">
                <button className="logout-btn" onClick={onLogout}>
                    <span className="icon">🚪</span>
                    Logout
                </button>
                <div className="user-details">
                    <span className="user-role">Naples, FL Rate Table Loaded</span>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
