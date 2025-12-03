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

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!formData.name || !formData.specialty) {
            Swal.fire({
                title: 'Missing Fields',
                text: 'Please fill in required fields (Name and Specialty)',
                icon: 'warning',
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
                            <label>FULL NAME *</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Dr. John Smith"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>SPECIALTY *</label>
                            <select
                                className="form-input"
                                value={formData.specialty}
                                onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                                required
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
                        </div>

                        <div className="form-group">
                            <label>LICENSE NUMBER</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="e.g. MD-12345"
                                value={formData.licenseNumber}
                                onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                            />
                        </div>

                        <div className="form-group">
                            <label>EMAIL</label>
                            <input
                                type="email"
                                className="form-input"
                                placeholder="doctor@hospital.com"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            />
                        </div>

                        <div className="form-group">
                            <label>PHONE</label>
                            <input
                                type="tel"
                                className="form-input"
                                placeholder="(555) 123-4567"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            />
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
