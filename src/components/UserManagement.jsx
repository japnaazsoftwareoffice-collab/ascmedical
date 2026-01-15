import React, { useState } from 'react';
import Swal from 'sweetalert2';
import './Management.css';

const UserManagement = ({ users, patients, surgeons, onAdd, onUpdate, onDelete }) => {
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        full_name: '',
        role: 'admin',
        patient_id: null,
        surgeon_id: null
    });
    const [editingId, setEditingId] = useState(null);
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.email || !formData.password || !formData.full_name) {
            Swal.fire('Error', 'Please fill in all required fields', 'error');
            return;
        }

        const payload = {
            ...formData,
            // Ensure we only send the relevant ID based on role
            patient_id: formData.role === 'patient' ? formData.patient_id : null,
            surgeon_id: formData.role === 'surgeon' ? formData.surgeon_id : null
        };

        try {
            if (editingId) {
                await onUpdate({ ...payload, id: editingId });
                Swal.fire('Success', 'User updated successfully', 'success');
                setEditingId(null);
            } else {
                await onAdd(payload);
                Swal.fire('Success', 'User added successfully', 'success');
            }
            setFormData({ email: '', password: '', full_name: '', role: 'admin', patient_id: null, surgeon_id: null });
        } catch (error) {
            console.error('Error saving user:', error);
            Swal.fire('Error', 'Failed to save user', 'error');
        }
    };

    const handleEdit = (user) => {
        setFormData({
            email: user.email,
            password: user.password,
            full_name: user.full_name || '',
            role: user.role || 'admin',
            patient_id: user.patient_id || null,
            surgeon_id: user.surgeon_id || null
        });
        setEditingId(user.id);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id) => {
        const result = await Swal.fire({
            title: 'Are you sure?',
            text: "You won't be able to revert this!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, delete it!'
        });

        if (result.isConfirmed) {
            await onDelete(id);
            Swal.fire('Deleted!', 'User has been deleted.', 'success');
        }
    };

    // Handle role change to reset specific IDs
    const handleRoleChange = (e) => {
        const newRole = e.target.value;
        setFormData({
            ...formData,
            role: newRole,
            patient_id: null,
            surgeon_id: null
        });
    };

    return (
        <div className="management-container fade-in">
            <div className="management-header">
                <h2 className="management-title">User Management</h2>
            </div>

            <div className="split-layout">
                <div className="content-card form-card">
                    <div className="card-header">
                        <h3>{editingId ? 'Edit User' : 'Add New User'}</h3>
                        <p className="card-subtitle">Manage system access and credentials</p>
                    </div>
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label>Full Name</label>
                            <input
                                type="text"
                                className="form-input"
                                value={formData.full_name}
                                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                placeholder="e.g. John Doe"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Email (Login ID)</label>
                            <input
                                type="email"
                                className="form-input"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                placeholder="user@hospital.com"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Password</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    className="form-input"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    placeholder="Enter password"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    style={{
                                        position: 'absolute',
                                        right: '10px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        color: '#64748b'
                                    }}
                                >
                                    {showPassword ? '👁️' : '👁️‍🗨️'}
                                </button>
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Role</label>
                            <select
                                className="form-input"
                                value={formData.role}
                                onChange={handleRoleChange}
                            >
                                <option value="admin">Admin</option>
                                <option value="surgeon">Surgeon</option>
                                <option value="patient">Patient</option>
                            </select>
                        </div>

                        {/* Conditional Dropdowns based on Role */}
                        {formData.role === 'surgeon' && (
                            <div className="form-group">
                                <label>Link to Surgeon Profile</label>
                                <select
                                    className="form-input"
                                    value={formData.surgeon_id || ''}
                                    onChange={(e) => {
                                        const sId = parseInt(e.target.value);
                                        const surgeon = surgeons.find(s => s.id === sId);
                                        setFormData({
                                            ...formData,
                                            surgeon_id: sId,
                                            full_name: surgeon ? surgeon.name : formData.full_name
                                        });
                                    }}
                                    required
                                >
                                    <option value="">Select Surgeon</option>
                                    {surgeons.map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {formData.role === 'patient' && (
                            <div className="form-group">
                                <label>Link to Patient Profile</label>
                                <select
                                    className="form-input"
                                    value={formData.patient_id || ''}
                                    onChange={(e) => {
                                        const pId = parseInt(e.target.value);
                                        const patient = patients.find(p => p.id === pId);
                                        setFormData({
                                            ...formData,
                                            patient_id: pId,
                                            full_name: patient ? patient.name : formData.full_name
                                        });
                                    }}
                                    required
                                >
                                    <option value="">Select Patient</option>
                                    {patients.map(p => (
                                        <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className="form-actions">
                            <button type="submit" className="btn-save full-width">
                                {editingId ? 'Update User' : 'Create User'}
                            </button>
                            {editingId && (
                                <button
                                    type="button"
                                    className="btn-cancel full-width"
                                    onClick={() => {
                                        setEditingId(null);
                                        setFormData({ email: '', password: '', full_name: '', role: 'admin', patient_id: null, surgeon_id: null });
                                    }}
                                    style={{ marginTop: '1rem' }}
                                >
                                    Cancel Edit
                                </button>
                            )}
                        </div>
                    </form>
                </div>

                <div className="content-card list-card">
                    <div className="card-header">
                        <h3>Users List</h3>
                        <p className="card-subtitle">{users.length} registered users</p>
                    </div>
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Role</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(user => (
                                    <tr key={user.id}>
                                        <td>
                                            <div style={{ fontWeight: 500 }}>{user.full_name}</div>
                                            {user.surgeon_id && <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Linked Surgeon</div>}
                                            {user.patient_id && <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Linked Patient</div>}
                                        </td>
                                        <td>{user.email}</td>
                                        <td>
                                            <span className={`status-badge status-${user.role === 'admin' ? 'completed' : user.role === 'surgeon' ? 'scheduled' : 'pending'}`}>
                                                {user.role.toUpperCase()}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="actions-cell">
                                                <button
                                                    className="btn-icon btn-edit"
                                                    onClick={() => handleEdit(user)}
                                                    title="Edit"
                                                >
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                                    </svg>
                                                </button>
                                                <button
                                                    className="btn-icon btn-delete"
                                                    onClick={() => handleDelete(user.id)}
                                                    title="Delete"
                                                >
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <polyline points="3 6 5 6 21 6"></polyline>
                                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2-2v2"></path>
                                                        <line x1="10" y1="11" x2="10" y2="17"></line>
                                                        <line x1="14" y1="11" x2="14" y2="17"></line>
                                                    </svg>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {users.length === 0 && (
                                    <tr>
                                        <td colSpan="4" style={{ textAlign: 'center', padding: '2rem' }}>
                                            No users found
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserManagement;
