import React, { useState } from 'react';
import Swal from 'sweetalert2';
import './Management.css';

const PatientManagement = ({ patients, onUpdate, onDelete, onAdd }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPatient, setEditingPatient] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        dob: '',
        mrn: '',
        phone: '',
        insurance_provider: '',
        insurance_policy_number: ''
    });

    const handleAddClick = () => {
        setEditingPatient(null);
        setFormData({
            name: '',
            dob: '',
            mrn: '',
            phone: '',
            insurance_provider: '',
            insurance_policy_number: ''
        });
        setIsModalOpen(true);
    };

    const handleEditClick = (patient) => {
        setEditingPatient(patient);
        setFormData({
            name: patient.name,
            dob: patient.dob,
            mrn: patient.mrn,
            phone: patient.phone,
            insurance_provider: patient.insurance_provider || '',
            insurance_policy_number: patient.insurance_policy_number || ''
        });
        setIsModalOpen(true);
    };

    const handleDeleteClick = async (id) => {
        const result = await Swal.fire({
            title: 'Delete Patient?',
            text: 'This action cannot be undone. Are you sure you want to delete this patient?',
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
                    text: 'Patient has been deleted successfully.',
                    icon: 'success',
                    confirmButtonColor: '#3b82f6',
                    confirmButtonText: 'OK',
                    timer: 1500,
                    timerProgressBar: true
                });
            } catch (error) {
                Swal.fire({
                    title: 'Error!',
                    text: 'Failed to delete patient. Please try again.',
                    icon: 'error',
                    confirmButtonColor: '#ef4444'
                });
            }
        }
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingPatient(null);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            if (editingPatient) {
                await onUpdate({ ...editingPatient, ...formData });
                handleCloseModal();
                await Swal.fire({
                    title: 'Updated!',
                    text: 'Patient information has been updated successfully.',
                    icon: 'success',
                    confirmButtonColor: '#3b82f6',
                    timer: 1500,
                    timerProgressBar: true,
                    showConfirmButton: false
                });
            } else {
                await onAdd(formData);
                handleCloseModal();
                await Swal.fire({
                    title: 'Added!',
                    text: 'New patient has been added successfully.',
                    icon: 'success',
                    confirmButtonColor: '#3b82f6',
                    timer: 1500,
                    timerProgressBar: true,
                    showConfirmButton: false
                });
            }

        } catch (error) {
            console.error("Error saving patient:", error);
            Swal.fire({
                title: 'Error!',
                text: 'Failed to save patient. Please check your input and try again.',
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
                <h2 className="management-title">Patient Management</h2>
                <button className="btn-add" onClick={handleAddClick}>
                    <span>+</span> Add Patient
                </button>
            </div>

            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Date of Birth</th>
                            <th>MRN</th>
                            <th>Phone</th>
                            <th>Insurance</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {patients.length === 0 ? (
                            <tr>
                                <td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>No patients found.</td>
                            </tr>
                        ) : (
                            patients.map(patient => (
                                <tr key={patient.id}>
                                    <td>{patient.name}</td>
                                    <td>{patient.dob}</td>
                                    <td>{patient.mrn}</td>
                                    <td>{patient.phone}</td>
                                    <td>{patient.insurance_provider}</td>
                                    <td className="actions-cell">
                                        <button
                                            className="btn-icon btn-edit"
                                            onClick={() => handleEditClick(patient)}
                                            title="Edit Patient"
                                            aria-label="Edit Patient"
                                        >
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                            </svg>
                                        </button>
                                        <button
                                            className="btn-icon btn-delete"
                                            onClick={() => handleDeleteClick(patient.id)}
                                            title="Delete Patient"
                                            aria-label="Delete Patient"
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
                            <h3>{editingPatient ? 'Edit Patient' : 'Add Patient'}</h3>
                            <button className="btn-close" onClick={handleCloseModal} style={{ color: '#64748b' }}>×</button>
                        </div>
                        <form onSubmit={handleSave}>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Full Name</label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        className="form-input"
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Date of Birth</label>
                                    <input
                                        type="date"
                                        name="dob"
                                        value={formData.dob}
                                        onChange={handleChange}
                                        className="form-input"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>MRN</label>
                                    <input
                                        type="text"
                                        name="mrn"
                                        value={formData.mrn}
                                        onChange={handleChange}
                                        className="form-input"
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Phone</label>
                                    <input
                                        type="tel"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        className="form-input"
                                        pattern="[0-9()\-\s+]+"
                                        maxLength="15"
                                        placeholder="(555) 123-4567"
                                        title="Please enter a valid phone number"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Insurance Provider</label>
                                    <input
                                        type="text"
                                        name="insurance_provider"
                                        value={formData.insurance_provider}
                                        onChange={handleChange}
                                        className="form-input"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Policy Number</label>
                                    <input
                                        type="text"
                                        name="insurance_policy_number"
                                        value={formData.insurance_policy_number}
                                        onChange={handleChange}
                                        className="form-input"
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
            )
            }
        </div >
    );
};

export default PatientManagement;
