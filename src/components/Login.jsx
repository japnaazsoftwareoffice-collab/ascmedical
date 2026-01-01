import React, { useState } from 'react';
import './Login.css';

const Login = ({ onLogin }) => {
    const [credentials, setCredentials] = useState({
        email: '',
        password: '',
        role: 'admin'
    });
    const [error, setError] = useState('');

    // Demo credentials for testing
    const demoUsers = {
        admin: { email: 'admin@hospital.com', password: 'admin123', name: 'Admin User' },
        manager: { email: 'manager@hospital.com', password: 'manager123', name: 'Case Manager' },
        surgeon: { email: 'surgeon@hospital.com', password: 'surgeon123', name: 'Dr. Sarah Williams' },
        patient: { email: 'patient@hospital.com', password: 'patient123', name: 'John Doe', mrn: 'MRN001' }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        try {
            await onLogin(credentials.email, credentials.password);
        } catch (err) {
            setError('Invalid email or password');
        }
    };

    const handleDemoLogin = async (role) => {
        const user = demoUsers[role];
        try {
            await onLogin(user.email, user.password);
        } catch (err) {
            setError('Login failed');
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <div className="login-header">
                    <h1>🏥 ASC Manager</h1>
                    <p>Hospital Management System</p>
                </div>

                <form onSubmit={handleSubmit} className="login-form">
                    <div className="form-group">
                        <label>Login As</label>
                        <select
                            className="form-input"
                            value={credentials.role}
                            onChange={(e) => setCredentials({ ...credentials, role: e.target.value })}
                        >
                            <option value="admin">Administrator</option>
                            <option value="manager">Manager</option>
                            <option value="surgeon">Surgeon</option>
                            <option value="patient">Patient</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Email</label>
                        <input
                            type="email"
                            className="form-input"
                            placeholder="Enter your email"
                            value={credentials.email}
                            onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Password</label>
                        <input
                            type="password"
                            className="form-input"
                            placeholder="Enter your password"
                            value={credentials.password}
                            onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                            required
                        />
                    </div>

                    {error && <div className="error-message">{error}</div>}

                    <button type="submit" className="btn-login">
                        Sign In
                    </button>
                </form>

                <div className="demo-section">
                    <p className="demo-title">Quick Demo Login:</p>
                    <div className="demo-buttons">
                        <button onClick={() => handleDemoLogin('admin')} className="demo-btn admin">
                            <span className="demo-icon">👨‍💼</span>
                            <span className="demo-label">Admin</span>
                        </button>
                        <button onClick={() => handleDemoLogin('manager')} className="demo-btn manager">
                            <span className="demo-icon">📋</span>
                            <span className="demo-label">Manager</span>
                        </button>
                        <button onClick={() => handleDemoLogin('surgeon')} className="demo-btn surgeon">
                            <span className="demo-icon">👨‍⚕️</span>
                            <span className="demo-label">Surgeon</span>
                        </button>
                        <button onClick={() => handleDemoLogin('patient')} className="demo-btn patient">
                            <span className="demo-icon">👤</span>
                            <span className="demo-label">Patient</span>
                        </button>
                    </div>
                    <div className="demo-credentials">
                        <p><strong>Admin:</strong> admin@hospital.com / admin123</p>
                        <p><strong>Manager:</strong> manager@hospital.com / manager123</p>
                        <p><strong>Surgeon:</strong> surgeon@hospital.com / surgeon123</p>
                        <p><strong>Patient:</strong> patient@hospital.com / patient123</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
