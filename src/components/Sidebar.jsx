import React from 'react';
import './Sidebar.css';

const Sidebar = ({ currentView, onViewChange, user, onLogout, permissions = [] }) => {
    // Define menu items based on user role
    // Define all available menu items with their required permissions
    const allMenuItems = [
        { id: 'manager-dashboard', icon: '📋', label: 'Manager Dashboard', permission: 'view_manager_dashboard' },
        { id: 'dashboard', icon: '📊', label: 'Financial Dashboard', permission: 'view_financial_dashboard' },
        { id: 'register', icon: '👥', label: 'Patient Management', permission: 'manage_patients' },
        { id: 'claims', icon: '📄', label: 'Claims Management', permission: 'view_claims' },
        { id: 'scheduler', icon: '📅', label: 'Surgery Log & OR', permission: 'manage_surgeries' },
        { id: 'cancellation-rescheduling', icon: '🚫', label: 'Cancellation & Rescheduling', permission: 'manage_surgeries' },
        { id: 'or-schedule', icon: '🗓️', label: 'OR Block Schedule', permission: 'view_or_blocks' },
        { id: 'surgery-schedule-sidebar', icon: '🗓️', label: 'Surgery Schedule', permission: 'view_surgery_schedule' },
        { id: 'surgeons', icon: '👨‍⚕️', label: 'Surgeon Management', permission: 'manage_surgeons' },
        { id: 'staff', icon: '👩‍⚕️', label: 'Nurses & Staff', permission: 'manage_staff' },
        { id: 'users', icon: '🔐', label: 'User Management', permission: 'manage_users' },
        { id: 'roles-permissions', icon: '🛡️', label: 'Roles & Permissions', permission: 'manage_permissions' },
        { id: 'analysis', icon: '🏥', label: 'OR Utilization', permission: 'view_analytics' },
        { id: 'scorecard', icon: '🎯', label: 'Surgeon Scorecard', permission: 'view_scorecards' },
        { id: 'cpt', icon: '⚙️', label: 'CPT & Categories', permission: 'manage_cpt_codes' },
        { id: 'auto-cpt', icon: '🔄', label: 'CPT Auto-Updater', permission: 'use_auto_updater' },
        { id: 'settings', icon: '🔧', label: 'Settings', permission: 'manage_settings' }
    ];

    const getMenuItems = () => {
        if (user.role === 'admin') {
            // Admins see everything that they have permissions for
            return allMenuItems.filter(item => !item.permission || permissions.includes(item.permission));
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
        } else if (user.role === 'manager') {
            // Filter allMenuItems based on manager's permissions
            const items = allMenuItems.filter(item => permissions.includes(item.permission));
            // Ensure Manager Dashboard is always visible for managers
            if (!items.find(i => i.id === 'manager-dashboard')) {
                const managerDashboardItem = allMenuItems.find(i => i.id === 'manager-dashboard');
                if (managerDashboardItem) items.unshift(managerDashboardItem);
            }
            return items;
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
                    {user.role === 'manager' && '📋'}
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
