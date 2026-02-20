import React, { useState } from 'react';
import Swal from 'sweetalert2';
import './Management.css';

const StaffManagement = ({ staff, onUpdate, onDelete, onAdd }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingStaff, setEditingStaff] = useState(null);
    const [formData, setFormData] = useState({
        firstname: '',
        lastname: '',
        role: '',
        specialty: '',
        license_number: '',
        phone: '',
        email: '',
        countryCode: '+1'
    });
    const [errors, setErrors] = useState({});

    const roles = [
        'Registered Nurse (RN)',
        'Licensed Practical Nurse (LPN)',
        'Scrub Technician',
        'Surgical Assistant',
        'Physician Assistant (PA)',
        'Nurse Practitioner (NP)',
        'Circulator',
        'Anesthesia Tech',
        'Sterile Processing Tech',
        'Other Staff'
    ];

    const handleAddClick = () => {
        setEditingStaff(null);
        setFormData({
            firstname: '',
            lastname: '',
            role: '',
            specialty: '',
            license_number: '',
            phone: '',
            email: '',
            countryCode: '+1'
        });
        setErrors({});
        setIsModalOpen(true);
    };

    const handleEditClick = (member) => {
        setEditingStaff(member);

        // Parse phone number
        let phone = member.phone || '';
        let countryCode = '+1';

        if (phone.startsWith('+')) {
            const parts = phone.split(' ');
            if (parts.length > 1) {
                countryCode = parts[0];
                phone = parts.slice(1).join('');
            } else {
                const digits = phone.replace(/\D/g, '');
                if (digits.length > 10) {
                    phone = digits.slice(-10);
                } else {
                    phone = digits;
                }
            }
        }
        phone = phone.replace(/\D/g, '').slice(0, 10);

        setFormData({
            firstname: member.firstname || '',
            lastname: member.lastname || '',
            role: member.role || '',
            specialty: member.specialty || '',
            license_number: member.license_number || '',
            phone: phone,
            email: member.email || '',
            countryCode: countryCode
        });
        setErrors({});
        setIsModalOpen(true);
    };

    const handleDeleteClick = async (id) => {
        const result = await Swal.fire({
            title: 'Delete Staff Member?',
            text: 'This action cannot be undone. Are you sure you want to delete this staff member?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Yes, delete it!',
            reverseButtons: true
        });

        if (result.isConfirmed) {
            try {
                await onDelete(id);
                await Swal.fire({
                    title: 'Deleted!',
                    text: 'Staff member has been deleted.',
                    icon: 'success',
                    timer: 1500,
                    showConfirmButton: false
                });
            } catch (error) {
                Swal.fire('Error', 'Failed to delete staff member.', 'error');
            }
        }
    };

    const validateForm = () => {
        const newErrors = {};
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z.-]+\.[a-zA-Z]{2,}$/;

        // First Name: Required, max 20
        if (!formData.firstname || !formData.firstname.trim()) {
            newErrors.firstname = 'First Name is required';
        } else if (formData.firstname.length > 20) {
            newErrors.firstname = 'Max 20 characters';
        }

        // Last Name: Required, max 20
        if (!formData.lastname || !formData.lastname.trim()) {
            newErrors.lastname = 'Last Name is required';
        } else if (formData.lastname.length > 20) {
            newErrors.lastname = 'Max 20 characters';
        }

        // Role: Required
        if (!formData.role) {
            newErrors.role = 'Role is required';
        }

        // License: Required
        if (!formData.license_number || !formData.license_number.trim()) {
            newErrors.license_number = 'License/ID is required';
        }

        // Phone: 10 numeric
        if (!formData.phone || formData.phone.length !== 10) {
            newErrors.phone = 'Phone must be exactly 10 digits';
        }

        // Email: Required, proper mail format
        if (!formData.email || !formData.email.trim()) {
            newErrors.email = 'Email is required';
        } else if (!emailRegex.test(formData.email)) {
            newErrors.email = 'Invalid email format (no numbers in domain name)';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            Swal.fire({
                title: 'Validation Error',
                text: 'Please check the form for missing or invalid fields.',
                icon: 'error',
                confirmButtonColor: '#3b82f6'
            });
            return;
        }

        const fullPhone = formData.phone ? `${formData.countryCode} ${formData.phone}` : '';
        const staffData = {
            firstname: formData.firstname,
            lastname: formData.lastname,
            role: formData.role,
            specialty: formData.specialty,
            license_number: formData.license_number,
            phone: fullPhone,
            email: formData.email
        };

        try {
            if (editingStaff) {
                await onUpdate({ ...editingStaff, ...staffData });
                setIsModalOpen(false);
                Swal.fire({ title: 'Updated!', icon: 'success', timer: 1500, showConfirmButton: false });
            } else {
                await onAdd(staffData);
                setIsModalOpen(false);
                Swal.fire({ title: 'Added!', icon: 'success', timer: 1500, showConfirmButton: false });
            }
        } catch (error) {
            Swal.fire('Error', 'Failed to save staff information.', 'error');
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
        if (errors[name]) {
            setErrors({ ...errors, [name]: null });
        }
    };

    return (
        <div className="management-container fade-in">
            <div className="management-header">
                <h2 className="management-title">Nurses & Staff Management</h2>
                <button className="btn-add" onClick={handleAddClick}>
                    <span>+</span> Add Staff Member
                </button>
            </div>

            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Role</th>
                            <th>Specialty</th>
                            <th>License / ID</th>
                            <th>Phone</th>
                            <th>Email</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {staff.length === 0 ? (
                            <tr>
                                <td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>No staff members found.</td>
                            </tr>
                        ) : (
                            staff.map(member => (
                                <tr key={member.id}>
                                    <td>{`${member.firstname} ${member.lastname}`}</td>
                                    <td>{member.role}</td>
                                    <td>{member.specialty}</td>
                                    <td>{member.license_number}</td>
                                    <td>{member.phone}</td>
                                    <td>{member.email}</td>
                                    <td className="actions-cell">
                                        <button className="btn-icon btn-edit" onClick={() => handleEditClick(member)}>
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                            </svg>
                                        </button>
                                        <button className="btn-icon btn-delete" onClick={() => handleDeleteClick(member.id)}>
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <polyline points="3 6 5 6 21 6"></polyline>
                                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                                <line x1="10" y1="11" x2="10" y2="17"></line>
                                                <line x1="14" y1="11" x2="14" y2="17"></line>
                                            </svg>
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3>{editingStaff ? 'Edit Staff Member' : 'Add Staff Member'}</h3>
                            <button className="btn-close" onClick={() => { setIsModalOpen(false); setErrors({}); }}>×</button>
                        </div>
                        <form onSubmit={handleSave}>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>First Name <span className="required-star">*</span></label>
                                    <input type="text" name="firstname" value={formData.firstname} onChange={handleChange} className={`form-input ${errors.firstname ? 'error-border' : ''}`} maxLength={20} />
                                    {errors.firstname && <span className="error-text">{errors.firstname}</span>}
                                </div>
                                <div className="form-group">
                                    <label>Last Name <span className="required-star">*</span></label>
                                    <input type="text" name="lastname" value={formData.lastname} onChange={handleChange} className={`form-input ${errors.lastname ? 'error-border' : ''}`} maxLength={20} />
                                    {errors.lastname && <span className="error-text">{errors.lastname}</span>}
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Role <span className="required-star">*</span></label>
                                    <select name="role" value={formData.role} onChange={handleChange} className={`form-input ${errors.role ? 'error-border' : ''}`}>
                                        <option value="">Select Role</option>
                                        {roles.map(r => <option key={r} value={r}>{r}</option>)}
                                    </select>
                                    {errors.role && <span className="error-text">{errors.role}</span>}
                                </div>
                                <div className="form-group">
                                    <label>Specialty</label>
                                    <input type="text" name="specialty" value={formData.specialty} onChange={handleChange} className="form-input" />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>License / ID Number <span className="required-star">*</span></label>
                                    <input type="text" name="license_number" value={formData.license_number} onChange={handleChange} className={`form-input ${errors.license_number ? 'error-border' : ''}`} />
                                    {errors.license_number && <span className="error-text">{errors.license_number}</span>}
                                </div>
                                <div className="form-group">
                                    <label>Phone <span className="required-star">*</span></label>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <select name="countryCode" value={formData.countryCode} onChange={handleChange} className="form-input" style={{ width: '90px' }}>
                                            <option value="+1">+1</option>
                                            <option value="+44">+44</option>
                                            <option value="+91">+91</option>
                                        </select>
                                        <input type="tel" name="phone" value={formData.phone} onChange={(e) => {
                                            const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                                            setFormData({ ...formData, phone: val });
                                            if (errors.phone) setErrors({ ...errors, phone: null });
                                        }} className={`form-input ${errors.phone ? 'error-border' : ''}`} placeholder="1234567890" style={{ flex: 1 }} />
                                    </div>
                                    {errors.phone && <span className="error-text">{errors.phone}</span>}
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Email <span className="required-star">*</span></label>
                                    <input type="email" name="email" value={formData.email} onChange={handleChange} className={`form-input ${errors.email ? 'error-border' : ''}`} />
                                    {errors.email && <span className="error-text">{errors.email}</span>}
                                </div>
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn-cancel" onClick={() => { setIsModalOpen(false); setErrors({}); }}>Cancel</button>
                                <button type="submit" className="btn-save">Save Member</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StaffManagement;
