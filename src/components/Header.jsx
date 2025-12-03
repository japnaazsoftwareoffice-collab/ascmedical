import React from 'react';
import './Header.css';

const Header = ({ currentView, onViewChange }) => {
    return (
        <header className="header">
            <div className="container header-content">
                <div className="logo" onClick={() => onViewChange('dashboard')} style={{ cursor: 'pointer' }}>
                    <span className="logo-text">Antigravity Health</span>
                </div>
                <nav className="nav">
                    <button
                        className={`nav-link-btn ${currentView === 'dashboard' ? 'active' : ''}`}
                        onClick={() => onViewChange('dashboard')}
                    >
                        Dashboard
                    </button>
                    <button
                        className={`nav-link-btn ${currentView === 'register' ? 'active' : ''}`}
                        onClick={() => onViewChange('register')}
                    >
                        Register Patient
                    </button>
                    <button
                        className={`nav-link-btn ${currentView === 'scheduler' ? 'active' : ''}`}
                        onClick={() => onViewChange('scheduler')}
                    >
                        Schedule Surgery
                    </button>
                </nav>
                <div className="header-actions">
                    <div className="user-profile">
                        <span className="user-name">Dr. Admin</span>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;
