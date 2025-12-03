import React, { useState } from 'react';
import Swal from 'sweetalert2';

const PatientRegistration = ({ onRegister }) => {
    const [formData, setFormData] = useState({
        name: '',
        dob: '',
        mrn: ''
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        onRegister({ ...formData, id: Date.now() });
        setFormData({ name: '', dob: '', mrn: '' });
        Swal.fire({
            title: 'Registered!',
            text: 'Patient registered successfully',
            icon: 'success',
            timer: 1500,
            showConfirmButton: false
        });
    };

    return (
        <div className="page-container fade-in">
            <h2 className="page-title">New Patient</h2>

            <div className="content-card registration-card">
                <div className="card-header">
                    <h3>Patient Registration</h3>
                    <p className="card-subtitle">Add a new patient to the daily roster.</p>
                </div>

                <form onSubmit={handleSubmit} className="registration-form">
                    <div className="form-group full-width">
                        <label>Full Name</label>
                        <input
                            type="text"
                            required
                            className="form-input"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="e.g. Jane Doe"
                        />
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>MRN / ID</label>
                            <input
                                type="text"
                                required
                                className="form-input"
                                value={formData.mrn}
                                onChange={(e) => setFormData({ ...formData, mrn: e.target.value })}
                                placeholder="Optional"
                            />
                        </div>
                        <div className="form-group">
                            <label>Date of Birth</label>
                            <input
                                type="date"
                                required
                                className="form-input"
                                value={formData.dob}
                                onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                            />
                        </div>
                    </div>

                    <button type="submit" className="btn-submit">
                        <span className="icon">+</span> Add to Surgery Queue
                    </button>
                </form>
            </div>
        </div>
    );
};

export default PatientRegistration;
