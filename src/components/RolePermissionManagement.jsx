import React, { useState, useEffect } from 'react';
import { db } from '../lib/supabase';
import Swal from 'sweetalert2';
import './RolePermissionManagement.css';

const RolePermissionManagement = () => {
    const [roles] = useState(['admin', 'manager', 'surgeon', 'patient']);
    const [selectedRole, setSelectedRole] = useState('manager');
    const [permissions, setPermissions] = useState([]);
    const [rolePermissions, setRolePermissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        if (selectedRole) {
            loadRolePermissions(selectedRole);
        }
    }, [selectedRole]);

    const loadData = async () => {
        try {
            setLoading(true);
            const perms = await db.getPermissions();
            setPermissions(perms);
        } catch (error) {
            console.error('Error loading permissions:', error);
            Swal.fire('Error', 'Failed to load permissions list.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const loadRolePermissions = async (role) => {
        try {
            const rolePerms = await db.getRolePermissions(role);
            // rolePerms is an array of objects: { permission_id: X, permissions: { name: Y } }
            setRolePermissions(rolePerms.map(rp => rp.permission_id));
        } catch (error) {
            console.error('Error loading role permissions:', error);
            Swal.fire('Error', 'Failed to load permissions for this role.', 'error');
        }
    };

    const handleTogglePermission = (permissionId) => {
        // Allow editing all roles, including admin

        setRolePermissions(prev =>
            prev.includes(permissionId)
                ? prev.filter(id => id !== permissionId)
                : [...prev, permissionId]
        );
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            await db.updateRolePermissions(selectedRole, rolePermissions);
            Swal.fire('Success', `Permissions updated for ${selectedRole}`, 'success');
        } catch (error) {
            console.error('Error saving role permissions:', error);
            Swal.fire('Error', 'Failed to save changes.', 'error');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="loading-state">Loading permission system...</div>;

    return (
        <div className="role-permissions-container fade-in">
            <div className="management-header">
                <h2>Roles & Permissions</h2>
                <p>Configure which features each role can access in the ASC Manager system.</p>
            </div>

            <div className="management-content">
                <div className="role-selector-card">
                    <h3>Select Role</h3>
                    <div className="role-buttons">
                        {roles.map(role => (
                            <button
                                key={role}
                                className={`role-btn ${selectedRole === role ? 'active' : ''}`}
                                onClick={() => setSelectedRole(role)}
                            >
                                {role.charAt(0).toUpperCase() + role.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="permissions-card">
                    <div className="card-header">
                        <h3>{selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)} Permissions</h3>
                        <button
                            className="save-btn"
                            onClick={handleSave}
                            disabled={saving}
                        >
                            {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>

                    <div className="permissions-grid">
                        {permissions.map(perm => {
                            const isChecked = rolePermissions.includes(perm.id);
                            return (
                                <div
                                    key={perm.id}
                                    className={`permission-item ${isChecked ? 'checked' : ''}`}
                                    onClick={() => handleTogglePermission(perm.id)}
                                >
                                    <div className="checkbox-wrapper">
                                        <input
                                            type="checkbox"
                                            checked={isChecked}
                                            readOnly
                                        />
                                        <span className="checkmark"></span>
                                    </div>
                                    <div className="permission-info">
                                        <div className="perm-name">{perm.name.replace(/_/g, ' ').toUpperCase()}</div>
                                        <div className="perm-desc">{perm.description}</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RolePermissionManagement;
