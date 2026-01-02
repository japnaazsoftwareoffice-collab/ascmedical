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
        email: '',
        gender: '',
        address: '',
        // Primary Insurance
        insurance_provider: '',
        insurance_policy_number: '',
        insurance_group_number: '',
        insurance_type: 'Primary',
        subscriber_name: '',
        subscriber_relationship: 'Self',
        insurance_effective_date: '',
        insurance_expiration_date: '',
        copay_amount: '',
        deductible_amount: '',
        // Secondary Insurance (optional)
        secondary_insurance_provider: '',
        secondary_insurance_policy_number: '',
        secondary_insurance_group_number: ''
    });

    const handleAddClick = () => {
        setEditingPatient(null);
        setFormData({
            name: '',
            dob: '',
            mrn: '',
            phone: '',
            email: '',
            gender: '',
            address: '',
            insurance_provider: '',
            insurance_policy_number: '',
            insurance_group_number: '',
            insurance_type: 'Primary',
            subscriber_name: '',
            subscriber_relationship: 'Self',
            insurance_effective_date: '',
            insurance_expiration_date: '',
            copay_amount: '',
            deductible_amount: '',
            secondary_insurance_provider: '',
            secondary_insurance_policy_number: '',
            secondary_insurance_group_number: ''
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
            email: patient.email || '',
            gender: patient.gender || '',
            address: patient.address || '',
            insurance_provider: patient.insurance_provider || '',
            insurance_policy_number: patient.insurance_policy_number || '',
            insurance_group_number: patient.insurance_group_number || '',
            insurance_type: patient.insurance_type || 'Primary',
            subscriber_name: patient.subscriber_name || '',
            subscriber_relationship: patient.subscriber_relationship || 'Self',
            insurance_effective_date: patient.insurance_effective_date || '',
            insurance_expiration_date: patient.insurance_expiration_date || '',
            copay_amount: patient.copay_amount || '',
            deductible_amount: patient.deductible_amount || '',
            secondary_insurance_provider: patient.secondary_insurance_provider || '',
            secondary_insurance_policy_number: patient.secondary_insurance_policy_number || '',
            secondary_insurance_group_number: patient.secondary_insurance_group_number || ''
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
                                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
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
                            {/* Basic Information */}
                            <div style={{ marginBottom: '1.5rem' }}>
                                <h4 style={{ fontSize: '1rem', fontWeight: '600', color: '#1e293b', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '2px solid #e2e8f0' }}>
                                    Basic Information
                                </h4>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Full Name *</label>
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
                                        <label>Date of Birth *</label>
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
                                        <label>MRN *</label>
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
                                        <label>Phone *</label>
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
                                    <div className="form-group">
                                        <label>Gender</label>
                                        <select
                                            name="gender"
                                            value={formData.gender}
                                            onChange={handleChange}
                                            className="form-input"
                                        >
                                            <option value="">Select Gender</option>
                                            <option value="Male">Male</option>
                                            <option value="Female">Female</option>
                                            <option value="Non-Binary">Non-Binary</option>
                                            <option value="Prefer not to say">Prefer not to say</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Contact Information */}
                            <div style={{ marginBottom: '1.5rem' }}>
                                <h4 style={{ fontSize: '1rem', fontWeight: '600', color: '#1e293b', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '2px solid #e2e8f0' }}>
                                    Contact Information
                                </h4>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Email</label>
                                        <input
                                            type="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleChange}
                                            className="form-input"
                                            placeholder="patient@example.com"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Address</label>
                                        <input
                                            type="text"
                                            name="address"
                                            value={formData.address}
                                            onChange={handleChange}
                                            className="form-input"
                                            placeholder="123 Main St, City, State ZIP"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Primary Insurance */}
                            <div style={{ marginBottom: '1.5rem' }}>
                                <h4 style={{ fontSize: '1rem', fontWeight: '600', color: '#1e293b', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '2px solid #3b82f6', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
                                        <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
                                    </svg>
                                    Primary Insurance
                                </h4>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Insurance Provider *</label>
                                        <input
                                            type="text"
                                            name="insurance_provider"
                                            value={formData.insurance_provider}
                                            onChange={handleChange}
                                            className="form-input"
                                            list="insurance-providers"
                                            placeholder="e.g. Blue Cross Blue Shield"
                                            required
                                        />
                                        <datalist id="insurance-providers">
                                            <option value="UnitedHealthcare" />
                                            <option value="Cigna Healthcare" />
                                            <option value="Aetna" />
                                            <option value="Blue Cross Blue Shield" />
                                            <option value="Humana" />
                                            <option value="Medicare" />
                                            <option value="Medicaid" />
                                            <option value="Kaiser Permanente" />
                                            <option value="Anthem" />
                                            <option value="Tricare" />
                                        </datalist>
                                    </div>
                                    <div className="form-group">
                                        <label>Policy Number</label>
                                        <input
                                            type="text"
                                            name="insurance_policy_number"
                                            value={formData.insurance_policy_number}
                                            onChange={handleChange}
                                            className="form-input"
                                            placeholder="Policy/Member ID"
                                        />
                                    </div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Group Number</label>
                                        <input
                                            type="text"
                                            name="insurance_group_number"
                                            value={formData.insurance_group_number}
                                            onChange={handleChange}
                                            className="form-input"
                                            placeholder="Group ID"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Insurance Type</label>
                                        <select
                                            name="insurance_type"
                                            value={formData.insurance_type}
                                            onChange={handleChange}
                                            className="form-input"
                                        >
                                            <option value="Primary">Primary</option>
                                            <option value="Secondary">Secondary</option>
                                            <option value="Medicare">Medicare</option>
                                            <option value="Medicaid">Medicaid</option>
                                            <option value="Private">Private</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Subscriber Name</label>
                                        <input
                                            type="text"
                                            name="subscriber_name"
                                            value={formData.subscriber_name}
                                            onChange={handleChange}
                                            className="form-input"
                                            placeholder="Policy holder name"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Relationship to Subscriber</label>
                                        <select
                                            name="subscriber_relationship"
                                            value={formData.subscriber_relationship}
                                            onChange={handleChange}
                                            className="form-input"
                                        >
                                            <option value="Self">Self</option>
                                            <option value="Spouse">Spouse</option>
                                            <option value="Child">Child</option>
                                            <option value="Parent">Parent</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Effective Date</label>
                                        <input
                                            type="date"
                                            name="insurance_effective_date"
                                            value={formData.insurance_effective_date}
                                            onChange={handleChange}
                                            className="form-input"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Expiration Date</label>
                                        <input
                                            type="date"
                                            name="insurance_expiration_date"
                                            value={formData.insurance_expiration_date}
                                            onChange={handleChange}
                                            className="form-input"
                                        />
                                    </div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Copay Amount</label>
                                        <div style={{ position: 'relative' }}>
                                            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}>$</span>
                                            <input
                                                type="number"
                                                name="copay_amount"
                                                value={formData.copay_amount}
                                                onChange={handleChange}
                                                className="form-input"
                                                style={{ paddingLeft: '24px' }}
                                                placeholder="0.00"
                                                step="0.01"
                                                min="0"
                                            />
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label>Deductible Amount</label>
                                        <div style={{ position: 'relative' }}>
                                            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}>$</span>
                                            <input
                                                type="number"
                                                name="deductible_amount"
                                                value={formData.deductible_amount}
                                                onChange={handleChange}
                                                className="form-input"
                                                style={{ paddingLeft: '24px' }}
                                                placeholder="0.00"
                                                step="0.01"
                                                min="0"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Secondary Insurance */}
                            <div style={{ marginBottom: '1.5rem' }}>
                                <h4 style={{ fontSize: '1rem', fontWeight: '600', color: '#1e293b', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '2px solid #64748b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
                                        <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
                                    </svg>
                                    Secondary Insurance (Optional)
                                </h4>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Insurance Provider</label>
                                        <input
                                            type="text"
                                            name="secondary_insurance_provider"
                                            value={formData.secondary_insurance_provider}
                                            onChange={handleChange}
                                            className="form-input"
                                            list="insurance-providers"
                                            placeholder="e.g., Aetna"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Policy Number</label>
                                        <input
                                            type="text"
                                            name="secondary_insurance_policy_number"
                                            value={formData.secondary_insurance_policy_number}
                                            onChange={handleChange}
                                            className="form-input"
                                            placeholder="Policy/Member ID"
                                        />
                                    </div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Group Number</label>
                                        <input
                                            type="text"
                                            name="secondary_insurance_group_number"
                                            value={formData.secondary_insurance_group_number}
                                            onChange={handleChange}
                                            className="form-input"
                                            placeholder="Group ID"
                                        />
                                    </div>
                                    <div className="form-group">
                                        {/* Empty for alignment */}
                                    </div>
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

export default PatientManagement;
