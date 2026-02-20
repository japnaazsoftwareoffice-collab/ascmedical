import React, { useState } from 'react';
import Swal from 'sweetalert2';

const SurgeonManager = ({ surgeons, onAddSurgeon }) => {
    const [formData, setFormData] = useState({
        name: '',
        specialty: '',
        licenseNumber: '',
        email: '',
        phone: ''
    });
    const [errors, setErrors] = useState({});

    const validateForm = () => {
        const newErrors = {};
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z.-]+\.[a-zA-Z]{2,}$/;

        // Name: Required, max 20
        if (!formData.name || !formData.name.trim()) {
            newErrors.name = 'Full Name is required';
        } else if (formData.name.trim().length > 20) {
            newErrors.name = 'Name must be 20 characters or less';
        }

        // Specialty: Required
        if (!formData.specialty || !formData.specialty.trim()) {
            newErrors.specialty = 'Specialty is required';
        }

        // License Number: Required
        if (!formData.licenseNumber || !formData.licenseNumber.trim()) {
            newErrors.licenseNumber = 'License Number is required';
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

    const handleSubmit = (e) => {
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

        const newSurgeon = {
            ...formData,
            id: Date.now()
        };

        onAddSurgeon(newSurgeon);
        setFormData({ name: '', specialty: '', licenseNumber: '', email: '', phone: '' });
        setErrors({});
        Swal.fire({
            title: 'Success!',
            text: 'Surgeon added successfully',
            icon: 'success',
            timer: 1500,
            showConfirmButton: false
        });
    };

    return (
        <div className="page-container fade-in">
            <h2 className="page-title">Surgeon Management</h2>

            <div className="split-layout">
                {/* Left Side: Add Form */}
                <div className="content-card form-card">
                    <div className="card-header">
                        <h3>+ Add New Surgeon</h3>
                    </div>
                    <form onSubmit={handleSubmit} className="cpt-form">
                        <div className="form-group">
                            <label>FULL NAME <span className="required-star">*</span></label>
                            <input
                                type="text"
                                className={`form-input ${errors.name ? 'error-border' : ''}`}
                                placeholder="Dr. John Smith"
                                value={formData.name}
                                onChange={(e) => {
                                    setFormData({ ...formData, name: e.target.value });
                                    if (errors.name) setErrors({ ...errors, name: null });
                                }}
                                maxLength={20}
                            />
                            {errors.name && <span className="error-text">{errors.name}</span>}
                        </div>

                        <div className="form-group">
                            <label>SPECIALTY <span className="required-star">*</span></label>
                            <select
                                className={`form-input ${errors.specialty ? 'error-border' : ''}`}
                                value={formData.specialty}
                                onChange={(e) => {
                                    setFormData({ ...formData, specialty: e.target.value });
                                    if (errors.specialty) setErrors({ ...errors, specialty: null });
                                }}
                            >
                                <option value="">Select Specialty...</option>
                                <option value="Orthopedics">Orthopedics</option>
                                <option value="Gastroenterology">Gastroenterology</option>
                                <option value="Ophthalmology">Ophthalmology</option>
                                <option value="Cardiology">Cardiology</option>
                                <option value="Neurosurgery">Neurosurgery</option>
                                <option value="General Surgery">General Surgery</option>
                                <option value="Oncology">Oncology</option>
                                <option value="Other">Other</option>
                            </select>
                            {errors.specialty && <span className="error-text">{errors.specialty}</span>}
                        </div>

                        <div className="form-group">
                            <label>LICENSE NUMBER <span className="required-star">*</span></label>
                            <input
                                type="text"
                                className={`form-input ${errors.licenseNumber ? 'error-border' : ''}`}
                                placeholder="e.g. MD-12345"
                                value={formData.licenseNumber}
                                onChange={(e) => {
                                    setFormData({ ...formData, licenseNumber: e.target.value });
                                    if (errors.licenseNumber) setErrors({ ...errors, licenseNumber: null });
                                }}
                            />
                            {errors.licenseNumber && <span className="error-text">{errors.licenseNumber}</span>}
                        </div>

                        <div className="form-group">
                            <label>EMAIL <span className="required-star">*</span></label>
                            <input
                                type="email"
                                className={`form-input ${errors.email ? 'error-border' : ''}`}
                                placeholder="doctor@hospital.com"
                                value={formData.email}
                                onChange={(e) => {
                                    setFormData({ ...formData, email: e.target.value });
                                    if (errors.email) setErrors({ ...errors, email: null });
                                }}
                            />
                            {errors.email && <span className="error-text">{errors.email}</span>}
                        </div>

                        <div className="form-group">
                            <label>PHONE <span className="required-star">*</span></label>
                            <input
                                type="tel"
                                className={`form-input ${errors.phone ? 'error-border' : ''}`}
                                placeholder="1234567890"
                                value={formData.phone}
                                onChange={(e) => {
                                    const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                                    setFormData({ ...formData, phone: val });
                                    if (errors.phone) setErrors({ ...errors, phone: null });
                                }}
                            />
                            {errors.phone && <span className="error-text">{errors.phone}</span>}
                        </div>

                        <button type="submit" className="btn-submit full-width">
                            Add Surgeon
                        </button>
                    </form>
                </div>

                {/* Right Side: List */}
                <div className="content-card list-card">
                    <div className="card-header list-header">
                        <h3>👨‍⚕️ Surgeon Directory</h3>
                        <div className="list-actions">
                            <span className="count-badge">{surgeons.length} Surgeons</span>
                        </div>
                    </div>

                    <div className="table-responsive">
                        <table className="clean-table">
                            <thead>
                                <tr>
                                    <th>NAME</th>
                                    <th>SPECIALTY</th>
                                    <th>LICENSE</th>
                                    <th>CONTACT</th>
                                </tr>
                            </thead>
                            <tbody>
                                {surgeons.length > 0 ? (
                                    surgeons.map((surgeon, index) => (
                                        <tr key={index}>
                                            <td className="surgeon-name">{surgeon.name}</td>
                                            <td><span className="category-tag">{surgeon.specialty}</span></td>
                                            <td className="font-mono">{surgeon.licenseNumber || 'N/A'}</td>
                                            <td className="contact-info">
                                                {surgeon.email && <div className="email">{surgeon.email}</div>}
                                                {surgeon.phone && <div className="phone">{surgeon.phone}</div>}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="4" style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                                            No surgeons added yet
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

export default SurgeonManager;
