import React, { useState } from 'react';
import Swal from 'sweetalert2';
import { formatSurgeonName } from '../utils/hospitalUtils';
import './Management.css';

const SurgeonManagement = ({ surgeons, onUpdate, onDelete, onAdd }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSurgeon, setEditingSurgeon] = useState(null);
    const [formData, setFormData] = useState({
        firstname: '',
        lastname: '',
        specialty: '',
        license_number: '',
        phone: '',
        email: '',
        countryCode: '+1'
    });

    const handleAddClick = () => {
        setEditingSurgeon(null);
        setFormData({
            firstname: '',
            lastname: '',
            specialty: '',
            license_number: '',
            phone: '',
            email: '',
            countryCode: '+1'
        });
        setIsModalOpen(true);
    };

    const handleEditClick = (surgeon) => {
        setEditingSurgeon(surgeon);

        // Parse phone number
        let phone = surgeon.phone || '';
        let countryCode = '+1';

        // Simple heuristic: check if it starts with +
        if (phone.startsWith('+')) {
            // Try to match known codes or just take first part
            const parts = phone.split(' ');
            if (parts.length > 1) {
                countryCode = parts[0];
                phone = parts.slice(1).join('');
            } else {
                // If no space, maybe it's stuck together?
                // Let's assume last 10 digits are phone
                const digits = phone.replace(/\D/g, '');
                if (digits.length > 10) {
                    phone = digits.slice(-10);
                } else {
                    phone = digits;
                }
            }
        }

        // clean phone to just digits
        phone = phone.replace(/\D/g, '').slice(0, 10);

        // Handle both new format (firstname, lastname) and old format (name)
        let firstName = surgeon.firstname || '';
        let lastName = surgeon.lastname || '';

        // If no firstname/lastname but has name, parse it
        if (!firstName && !lastName && surgeon.name) {
            const nameParts = surgeon.name.replace(/^Dr\.?\s*/i, '').trim().split(' ');
            if (nameParts.length >= 2) {
                firstName = nameParts[0];
                lastName = nameParts.slice(1).join(' ');
            } else if (nameParts.length === 1) {
                lastName = nameParts[0];
            }
        }

        setFormData({
            firstname: firstName,
            lastname: lastName,
            specialty: surgeon.specialty,
            license_number: surgeon.license_number || '',
            phone: phone,
            email: surgeon.email || '',
            countryCode: countryCode
        });
        setIsModalOpen(true);
    };

    const handleDeleteClick = async (id) => {
        const result = await Swal.fire({
            title: 'Delete Surgeon?',
            text: 'This action cannot be undone. Are you sure you want to delete this surgeon?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Yes, delete it!',
            cancelButtonText: 'Cancel',
            reverseButtons: true
        });

        if (result.isConfirmed) {
            try {
                await onDelete(id);
                await Swal.fire({
                    title: 'Deleted!',
                    text: 'Surgeon has been deleted successfully.',
                    icon: 'success',
                    confirmButtonColor: '#3b82f6',
                    timer: 1500,
                    timerProgressBar: true,
                    showConfirmButton: false
                });
            } catch (error) {
                Swal.fire({
                    title: 'Error!',
                    text: 'Failed to delete surgeon. Please try again.',
                    icon: 'error',
                    confirmButtonColor: '#ef4444'
                });
            }
        }
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingSurgeon(null);
    };

    const handleSave = async (e) => {
        e.preventDefault();

        if (formData.phone.length !== 10) {
            Swal.fire({
                title: 'Invalid Phone',
                text: 'Phone number must be exactly 10 digits',
                icon: 'warning',
                confirmButtonColor: '#3b82f6'
            });
            return;
        }

        const fullPhone = `${formData.countryCode} ${formData.phone}`;
        const surgeonData = {
            firstname: formData.firstname,
            lastname: formData.lastname,
            specialty: formData.specialty,
            license_number: formData.license_number,
            phone: fullPhone,
            email: formData.email
        };

        try {
            if (editingSurgeon) {
                await onUpdate({ ...editingSurgeon, ...surgeonData });
                handleCloseModal();
                await Swal.fire({
                    title: 'Updated!',
                    text: 'Surgeon information has been updated successfully.',
                    icon: 'success',
                    confirmButtonColor: '#3b82f6',
                    timer: 1500,
                    timerProgressBar: true,
                    showConfirmButton: false
                });
            } else {
                await onAdd(surgeonData);
                handleCloseModal();
                await Swal.fire({
                    title: 'Added!',
                    text: 'New surgeon has been added successfully.',
                    icon: 'success',
                    confirmButtonColor: '#3b82f6',
                    timer: 1500,
                    timerProgressBar: true,
                    showConfirmButton: false
                });
            }
        } catch (error) {
            console.error("Error saving surgeon:", error);
            Swal.fire({
                title: 'Error!',
                text: 'Failed to save surgeon. Please check your input and try again.',
                icon: 'error',
                confirmButtonColor: '#ef4444'
            });
        }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    return (
        <div className="management-container fade-in">
            <div className="management-header">
                <h2 className="management-title">Surgeon Management</h2>
                <button className="btn-add" onClick={handleAddClick}>
                    <span>+</span> Add Surgeon
                </button>
            </div>

            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Specialty</th>
                            <th>License / NPI</th>
                            <th>Phone</th>
                            <th>Email</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {surgeons.length === 0 ? (
                            <tr>
                                <td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>No surgeons found.</td>
                            </tr>
                        ) : (
                            surgeons.map(surgeon => (
                                <tr key={surgeon.id}>
                                    <td>{formatSurgeonName(surgeon)}</td>
                                    <td>{surgeon.specialty}</td>
                                    <td>{surgeon.license_number}</td>
                                    <td>{surgeon.phone}</td>
                                    <td>{surgeon.email}</td>
                                    <td className="actions-cell">
                                        <button
                                            className="btn-icon btn-edit"
                                            onClick={() => handleEditClick(surgeon)}
                                            title="Edit Surgeon"
                                            aria-label="Edit Surgeon"
                                        >
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                            </svg>
                                        </button>
                                        <button
                                            className="btn-icon btn-delete"
                                            onClick={() => handleDeleteClick(surgeon.id)}
                                            title="Delete Surgeon"
                                            aria-label="Delete Surgeon"
                                        >
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
                            <h3>{editingSurgeon ? 'Edit Surgeon' : 'Add Surgeon'}</h3>
                            <button className="btn-close" onClick={handleCloseModal} style={{ color: '#64748b' }}>×</button>
                        </div>
                        <form onSubmit={handleSave}>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>First Name</label>
                                    <input
                                        type="text"
                                        name="firstname"
                                        value={formData.firstname}
                                        onChange={handleChange}
                                        className="form-input"
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Last Name</label>
                                    <input
                                        type="text"
                                        name="lastname"
                                        value={formData.lastname}
                                        onChange={handleChange}
                                        className="form-input"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Specialty</label>
                                    <input
                                        type="text"
                                        name="specialty"
                                        value={formData.specialty}
                                        onChange={handleChange}
                                        className="form-input"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>License / NPI</label>
                                    <input
                                        type="text"
                                        name="license_number"
                                        value={formData.license_number}
                                        onChange={handleChange}
                                        className="form-input"
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Phone</label>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <select
                                            name="countryCode"
                                            value={formData.countryCode}
                                            onChange={handleChange}
                                            className="form-input"
                                            style={{ width: '100px', padding: '0.75rem 0.5rem' }}
                                        >
                                            <option value="+1">+1 (US)</option>
                                            <option value="+44">+44 (UK)</option>
                                            <option value="+91">+91 (IN)</option>
                                            <option value="+61">+61 (AU)</option>
                                            <option value="+81">+81 (JP)</option>
                                            <option value="+49">+49 (DE)</option>
                                            <option value="+33">+33 (FR)</option>
                                        </select>
                                        <input
                                            type="tel"
                                            name="phone"
                                            value={formData.phone}
                                            onChange={(e) => {
                                                const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                                                setFormData({ ...formData, phone: val });
                                            }}
                                            className="form-input"
                                            placeholder="1234567890"
                                            pattern="[0-9]{10}"
                                            title="Please enter a valid 10-digit phone number"
                                            required
                                            style={{ flex: 1 }}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Email</label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        className="form-input"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn-cancel" onClick={handleCloseModal}>Cancel</button>
                                <button type="submit" className="btn-save">Save Changes</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SurgeonManagement;
