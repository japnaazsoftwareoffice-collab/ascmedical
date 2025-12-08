import React, { useState, useMemo } from 'react';
import Swal from 'sweetalert2';
import HCFA1500Form from './HCFA1500Form';
import { calculateORCost } from '../utils/hospitalUtils';
import './Management.css';

const ClaimsManagement = ({ claims = [], patients, surgeries, billing = [], cptCodes = [], onAdd, onUpdate, onDelete, onAddBilling }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingClaim, setEditingClaim] = useState(null);
    const [printingClaim, setPrintingClaim] = useState(null);
    const [selectedStatus, setSelectedStatus] = useState('all');
    const [formData, setFormData] = useState({
        patient_id: '',
        surgery_id: '',
        claim_type: 'primary',
        insurance_provider: '',
        insurance_policy_number: '',
        insurance_group_number: '',
        subscriber_name: '',
        subscriber_relationship: 'Self',
        service_date: '',
        diagnosis_codes: [],
        procedure_codes: [],
        place_of_service: 'Office',
        total_charges: '',
        status: 'draft',
        notes: ''
    });

    // Generate unique claim number
    const generateClaimNumber = () => {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        return `CLM-${year}${month}${day}-${random}`;
    };

    // Filter claims by status
    const filteredClaims = useMemo(() => {
        if (selectedStatus === 'all') return claims;
        return claims.filter(claim => claim.status === selectedStatus);
    }, [claims, selectedStatus]);

    // Calculate statistics
    const statistics = useMemo(() => {
        const total = claims.length;
        const submitted = claims.filter(c => c.status === 'submitted' || c.status === 'pending' || c.status === 'in_review').length;
        const approved = claims.filter(c => c.status === 'approved' || c.status === 'paid').length;
        const denied = claims.filter(c => c.status === 'denied').length;
        const totalAmount = claims.reduce((sum, c) => sum + (parseFloat(c.total_charges) || 0), 0);
        const paidAmount = claims.reduce((sum, c) => sum + (parseFloat(c.insurance_payment) || 0), 0);

        return { total, submitted, approved, denied, totalAmount, paidAmount };
    }, [claims]);

    const handleAddClick = () => {
        setEditingClaim(null);
        setFormData({
            patient_id: '',
            surgery_id: '',
            claim_type: 'primary',
            insurance_provider: '',
            insurance_policy_number: '',
            insurance_group_number: '',
            subscriber_name: '',
            subscriber_relationship: 'Self',
            service_date: '',
            diagnosis_codes: [],
            procedure_codes: [],
            place_of_service: 'Office',
            total_charges: '',
            status: 'draft',
            notes: ''
        });
        setIsModalOpen(true);
    };

    const handleEditClick = (claim) => {
        setEditingClaim(claim);
        setFormData({
            patient_id: claim.patient_id || '',
            surgery_id: claim.surgery_id || '',
            claim_type: claim.claim_type || 'primary',
            insurance_provider: claim.insurance_provider || '',
            insurance_policy_number: claim.insurance_policy_number || '',
            insurance_group_number: claim.insurance_group_number || '',
            subscriber_name: claim.subscriber_name || '',
            subscriber_relationship: claim.subscriber_relationship || 'Self',
            service_date: claim.service_date || '',
            diagnosis_codes: claim.diagnosis_codes || [],
            procedure_codes: claim.procedure_codes || [],
            place_of_service: claim.place_of_service || 'Office',
            total_charges: claim.total_charges || '',
            status: claim.status || 'draft',
            notes: claim.notes || ''
        });
        setIsModalOpen(true);
    };

    const handleDeleteClick = async (id) => {
        const result = await Swal.fire({
            title: 'Delete Claim?',
            text: 'This action cannot be undone. Are you sure you want to delete this claim?',
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
                    text: 'Claim has been deleted successfully.',
                    icon: 'success',
                    confirmButtonColor: '#3b82f6',
                    timer: 1500,
                    timerProgressBar: true
                });
            } catch (error) {
                Swal.fire({
                    title: 'Error!',
                    text: 'Failed to delete claim. Please try again.',
                    icon: 'error',
                    confirmButtonColor: '#ef4444'
                });
            }
        }
    };

    const handlePostToBilling = async (claim) => {
        // Check if bill already exists
        const existingBill = billing.find(b => b.claim_id === claim.id || (claim.surgery_id && b.surgery_id === claim.surgery_id));

        if (existingBill) {
            Swal.fire({
                title: 'Bill Exists',
                text: 'A billing record already exists for this claim/surgery.',
                icon: 'info',
                confirmButtonColor: '#3b82f6'
            });
            return;
        }

        const result = await Swal.fire({
            title: 'Post to Billing?',
            text: `Create a billing record for $${claim.total_charges}?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#10b981',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Yes, create bill'
        });

        if (result.isConfirmed) {
            try {
                const dueDate = new Date();
                dueDate.setDate(dueDate.getDate() + 30);

                const billData = {
                    patient_id: claim.patient_id,
                    surgery_id: claim.surgery_id || null,
                    claim_id: claim.id,
                    total_amount: parseFloat(claim.total_charges),
                    insurance_covered: parseFloat(claim.insurance_payment || 0),
                    patient_responsibility: parseFloat(claim.patient_responsibility || claim.total_charges),
                    status: 'pending',
                    due_date: dueDate.toISOString().split('T')[0]
                };

                await onAddBilling(billData);

                await Swal.fire({
                    title: 'Posted!',
                    text: 'Billing record created successfully.',
                    icon: 'success',
                    timer: 1500,
                    showConfirmButton: false
                });
            } catch (error) {
                console.error("Error posting to billing:", error);
                Swal.fire({
                    title: 'Error!',
                    text: 'Failed to create billing record.',
                    icon: 'error',
                    confirmButtonColor: '#ef4444'
                });
            }
        }
    };

    const handleSubmitClaim = async (claimId) => {
        const result = await Swal.fire({
            title: 'Submit Claim?',
            text: 'This will submit the claim to the insurance provider. Continue?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#3b82f6',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Yes, submit it!',
            cancelButtonText: 'Cancel',
            reverseButtons: true
        });

        if (result.isConfirmed) {
            try {
                const claim = claims.find(c => c.id === claimId);
                await onUpdate({
                    ...claim,
                    status: 'submitted',
                    submission_date: new Date().toISOString().split('T')[0]
                });
                await Swal.fire({
                    title: 'Submitted!',
                    text: 'Claim has been submitted successfully.',
                    icon: 'success',
                    confirmButtonColor: '#3b82f6',
                    timer: 1500,
                    timerProgressBar: true
                });
            } catch (error) {
                Swal.fire({
                    title: 'Error!',
                    text: 'Failed to submit claim. Please try again.',
                    icon: 'error',
                    confirmButtonColor: '#ef4444'
                });
            }
        }
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingClaim(null);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            const claimData = {
                ...formData,
                claim_number: editingClaim?.claim_number || generateClaimNumber()
            };

            if (editingClaim) {
                await onUpdate({ ...editingClaim, ...claimData });
                handleCloseModal();
                await Swal.fire({
                    title: 'Updated!',
                    text: 'Claim has been updated successfully.',
                    icon: 'success',
                    confirmButtonColor: '#3b82f6',
                    timer: 1500,
                    timerProgressBar: true,
                    showConfirmButton: false
                });
            } else {
                await onAdd(claimData);
                handleCloseModal();
                await Swal.fire({
                    title: 'Created!',
                    text: 'New claim has been created successfully.',
                    icon: 'success',
                    confirmButtonColor: '#3b82f6',
                    timer: 1500,
                    timerProgressBar: true,
                    showConfirmButton: false
                });
            }
        } catch (error) {
            console.error("Error saving claim:", error);
            Swal.fire({
                title: 'Error!',
                text: 'Failed to save claim. Please check your input and try again.',
                icon: 'error',
                confirmButtonColor: '#ef4444'
            });
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });

        // Auto-populate insurance info when patient is selected
        if (name === 'patient_id' && value) {
            const patient = patients.find(p => p.id === parseInt(value));
            if (patient) {
                setFormData(prev => ({
                    ...prev,
                    insurance_provider: patient.insurance_provider || '',
                    insurance_policy_number: patient.insurance_policy_number || '',
                    insurance_group_number: patient.insurance_group_number || '',
                    subscriber_name: patient.subscriber_name || patient.name,
                    subscriber_relationship: patient.subscriber_relationship || 'Self'
                }));
            }
        }

        // Auto-populate from surgery when selected
        if (name === 'surgery_id' && value) {
            const surgery = surgeries.find(s => s.id === parseInt(value));
            if (surgery) {
                // Calculate Total Charges
                let totalCharges = 0;
                const isCosmeticSurgery = !surgery.cpt_codes || surgery.cpt_codes.length === 0;

                if (isCosmeticSurgery) {
                    // Parse cosmetic fees from notes
                    if (surgery.notes) {
                        const facilityMatch = surgery.notes.match(/Facility Fee: \$([\d,]+)/);
                        const anesthesiaMatch = surgery.notes.match(/Anesthesia: \$([\d,]+)/);
                        const facilityFee = facilityMatch ? parseFloat(facilityMatch[1].replace(/,/g, '')) : 0;
                        const anesthesiaFee = anesthesiaMatch ? parseFloat(anesthesiaMatch[1].replace(/,/g, '')) : 0;
                        totalCharges = facilityFee + anesthesiaFee;
                    }
                } else {
                    // Regular Surgery: CPT Codes + OR Cost
                    const cptTotal = (surgery.cpt_codes || []).reduce((sum, code) => {
                        const cpt = cptCodes.find(c => c.code === code);
                        return sum + (cpt?.reimbursement || 0);
                    }, 0);

                    let orCost = calculateORCost(surgery.duration_minutes || 0);

                    // Check for Self-Pay Anesthesia in notes
                    if (surgery.notes && surgery.notes.includes('Self-Pay Anesthesia')) {
                        const match = surgery.notes.match(/Self-Pay Anesthesia: \$([\d,]+)/);
                        if (match) {
                            orCost += parseFloat(match[1].replace(/,/g, ''));
                        }
                    }

                    totalCharges = cptTotal + orCost;
                }

                setFormData(prev => ({
                    ...prev,
                    service_date: surgery.date,
                    procedure_codes: surgery.cpt_codes || [],
                    total_charges: totalCharges
                }));
            }
        }
    };

    const getStatusBadge = (status) => {
        const statusColors = {
            draft: { bg: '#f1f5f9', color: '#64748b', label: 'Draft' },
            submitted: { bg: '#dbeafe', color: '#1e40af', label: 'Submitted' },
            pending: { bg: '#fef3c7', color: '#92400e', label: 'Pending' },
            in_review: { bg: '#e0e7ff', color: '#3730a3', label: 'In Review' },
            approved: { bg: '#d1fae5', color: '#065f46', label: 'Approved' },
            partially_approved: { bg: '#fef9c3', color: '#854d0e', label: 'Partially Approved' },
            denied: { bg: '#fee2e2', color: '#991b1b', label: 'Denied' },
            paid: { bg: '#d1fae5', color: '#065f46', label: 'Paid' },
            appealed: { bg: '#fce7f3', color: '#831843', label: 'Appealed' }
        };

        const style = statusColors[status] || statusColors.draft;
        return (
            <span style={{
                padding: '0.25rem 0.75rem',
                borderRadius: '9999px',
                fontSize: '0.75rem',
                fontWeight: '600',
                background: style.bg,
                color: style.color
            }}>
                {style.label}
            </span>
        );
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount || 0);
    };

    return (
        <div className="management-container fade-in">
            <div className="management-header">
                <h2 className="management-title">Claims Management</h2>
                <button className="btn-add" onClick={handleAddClick}>
                    <span>+</span> Create Claim
                </button>
            </div>

            {/* Statistics Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                    <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.5rem' }}>Total Claims</div>
                    <div style={{ fontSize: '2rem', fontWeight: '700', color: '#1e293b' }}>{statistics.total}</div>
                </div>
                <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                    <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.5rem' }}>Submitted</div>
                    <div style={{ fontSize: '2rem', fontWeight: '700', color: '#3b82f6' }}>{statistics.submitted}</div>
                </div>
                <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                    <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.5rem' }}>Approved</div>
                    <div style={{ fontSize: '2rem', fontWeight: '700', color: '#10b981' }}>{statistics.approved}</div>
                </div>
                <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                    <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.5rem' }}>Denied</div>
                    <div style={{ fontSize: '2rem', fontWeight: '700', color: '#ef4444' }}>{statistics.denied}</div>
                </div>
                <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                    <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.5rem' }}>Total Billed</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1e293b' }}>{formatCurrency(statistics.totalAmount)}</div>
                </div>
                <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                    <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.5rem' }}>Total Paid</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#10b981' }}>{formatCurrency(statistics.paidAmount)}</div>
                </div>
            </div>

            {/* Status Filter */}
            <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: '600', color: '#475569', marginRight: '1rem' }}>Filter by Status:</label>
                <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    style={{
                        padding: '0.5rem 1rem',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0',
                        fontSize: '0.875rem',
                        cursor: 'pointer'
                    }}
                >
                    <option value="all">All Claims</option>
                    <option value="draft">Draft</option>
                    <option value="submitted">Submitted</option>
                    <option value="pending">Pending</option>
                    <option value="in_review">In Review</option>
                    <option value="approved">Approved</option>
                    <option value="denied">Denied</option>
                    <option value="paid">Paid</option>
                </select>
            </div>

            {/* Claims Table */}
            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Claim #</th>
                            <th>Patient</th>
                            <th>Service Date</th>
                            <th>Insurance</th>
                            <th>Amount</th>
                            <th>Status</th>
                            <th>Submitted</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredClaims.length === 0 ? (
                            <tr>
                                <td colSpan="8" style={{ textAlign: 'center', padding: '2rem' }}>No claims found.</td>
                            </tr>
                        ) : (
                            filteredClaims.map(claim => {
                                const patient = patients.find(p => p.id === claim.patient_id);
                                return (
                                    <tr key={claim.id}>
                                        <td style={{ fontWeight: '600', color: '#3b82f6' }}>{claim.claim_number}</td>
                                        <td>{patient?.name || 'N/A'}</td>
                                        <td>{claim.service_date}</td>
                                        <td>{claim.insurance_provider}</td>
                                        <td>{formatCurrency(claim.total_charges)}</td>
                                        <td>{getStatusBadge(claim.status)}</td>
                                        <td>{claim.submission_date || '-'}</td>
                                        <td className="actions-cell">
                                            <button
                                                className="btn-icon"
                                                onClick={() => setPrintingClaim(claim)}
                                                title="Print HCFA-1500"
                                                style={{ background: '#64748b', color: '#fff', marginRight: '0.5rem' }}
                                            >
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <polyline points="6 9 6 2 18 2 18 9"></polyline>
                                                    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                                                    <rect x="6" y="14" width="12" height="8"></rect>
                                                </svg>
                                            </button>
                                            {(claim.status === 'approved' || claim.status === 'paid') && (
                                                <button
                                                    className="btn-icon"
                                                    onClick={() => handlePostToBilling(claim)}
                                                    title="Post to Billing"
                                                    style={{ background: '#10b981', color: '#fff', marginRight: '0.5rem' }}
                                                >
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                                                    </svg>
                                                </button>
                                            )}
                                            {claim.status === 'draft' && (
                                                <button
                                                    className="btn-icon"
                                                    onClick={() => handleSubmitClaim(claim.id)}
                                                    title="Submit Claim"
                                                    style={{ background: '#3b82f6', color: '#fff', marginRight: '0.5rem' }}
                                                >
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"></path>
                                                    </svg>
                                                </button>
                                            )}
                                            <button
                                                className="btn-icon btn-edit"
                                                onClick={() => handleEditClick(claim)}
                                                title="Edit Claim"
                                            >
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                                </svg>
                                            </button>
                                            <button
                                                className="btn-icon btn-delete"
                                                onClick={() => handleDeleteClick(claim.id)}
                                                title="Delete Claim"
                                            >
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <polyline points="3 6 5 6 21 6"></polyline>
                                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                                </svg>
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal for Add/Edit Claim */}
            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '800px' }}>
                        <div className="modal-header">
                            <h3>{editingClaim ? 'Edit Claim' : 'Create New Claim'}</h3>
                            <button className="btn-close" onClick={handleCloseModal}>×</button>
                        </div>
                        <form onSubmit={handleSave}>
                            {/* Patient & Surgery Selection */}
                            <div style={{ marginBottom: '1.5rem' }}>
                                <h4 style={{ fontSize: '1rem', fontWeight: '600', color: '#1e293b', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '2px solid #e2e8f0' }}>
                                    Patient & Service Information
                                </h4>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Patient *</label>
                                        <select
                                            name="patient_id"
                                            value={formData.patient_id}
                                            onChange={handleChange}
                                            className="form-input"
                                            required
                                        >
                                            <option value="">Select Patient</option>
                                            {patients.map(patient => (
                                                <option key={patient.id} value={patient.id}>{patient.name} - {patient.mrn}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Related Surgery (Optional)</label>
                                        <select
                                            name="surgery_id"
                                            value={formData.surgery_id}
                                            onChange={handleChange}
                                            className="form-input"
                                        >
                                            <option value="">Select Surgery</option>
                                            {surgeries.filter(s => s.patient_id === parseInt(formData.patient_id)).map(surgery => (
                                                <option key={surgery.id} value={surgery.id}>
                                                    {surgery.date} - {surgery.doctor_name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Service Date *</label>
                                        <input
                                            type="date"
                                            name="service_date"
                                            value={formData.service_date}
                                            onChange={handleChange}
                                            className="form-input"
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Place of Service</label>
                                        <select
                                            name="place_of_service"
                                            value={formData.place_of_service}
                                            onChange={handleChange}
                                            className="form-input"
                                        >
                                            <option value="Office">Office</option>
                                            <option value="Hospital">Hospital</option>
                                            <option value="Outpatient">Outpatient</option>
                                            <option value="Emergency Room">Emergency Room</option>
                                            <option value="Ambulatory Surgical Center">Ambulatory Surgical Center</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Insurance Information */}
                            <div style={{ marginBottom: '1.5rem' }}>
                                <h4 style={{ fontSize: '1rem', fontWeight: '600', color: '#1e293b', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '2px solid #3b82f6' }}>
                                    Insurance Information
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
                                            list="claim-insurance-providers"
                                            required
                                        />
                                        <datalist id="claim-insurance-providers">
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
                                        <label>Policy Number *</label>
                                        <input
                                            type="text"
                                            name="insurance_policy_number"
                                            value={formData.insurance_policy_number}
                                            onChange={handleChange}
                                            className="form-input"
                                            required
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
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Claim Type</label>
                                        <select
                                            name="claim_type"
                                            value={formData.claim_type}
                                            onChange={handleChange}
                                            className="form-input"
                                        >
                                            <option value="primary">Primary</option>
                                            <option value="secondary">Secondary</option>
                                            <option value="appeal">Appeal</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Financial Information */}
                            <div style={{ marginBottom: '1.5rem' }}>
                                <h4 style={{ fontSize: '1rem', fontWeight: '600', color: '#1e293b', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '2px solid #10b981' }}>
                                    Financial Information
                                </h4>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Total Charges *</label>
                                        <div style={{ position: 'relative' }}>
                                            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}>$</span>
                                            <input
                                                type="number"
                                                name="total_charges"
                                                value={formData.total_charges}
                                                onChange={handleChange}
                                                className="form-input"
                                                style={{ paddingLeft: '24px' }}
                                                step="0.01"
                                                min="0"
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label>Status</label>
                                        <select
                                            name="status"
                                            value={formData.status}
                                            onChange={handleChange}
                                            className="form-input"
                                        >
                                            <option value="draft">Draft</option>
                                            <option value="submitted">Submitted</option>
                                            <option value="pending">Pending</option>
                                            <option value="in_review">In Review</option>
                                            <option value="approved">Approved</option>
                                            <option value="denied">Denied</option>
                                            <option value="paid">Paid</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Notes */}
                            <div className="form-group">
                                <label>Notes</label>
                                <textarea
                                    name="notes"
                                    value={formData.notes}
                                    onChange={handleChange}
                                    className="form-input"
                                    rows="3"
                                    placeholder="Additional notes or comments..."
                                />
                            </div>

                            <div className="modal-actions">
                                <button type="button" className="btn-cancel" onClick={handleCloseModal}>Cancel</button>
                                <button type="submit" className="btn-save">Save Claim</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* HCFA-1500 Form Modal */}
            {printingClaim && (
                <HCFA1500Form
                    claim={printingClaim}
                    patient={patients.find(p => p.id === printingClaim.patient_id)}
                    surgery={surgeries.find(s => s.id === printingClaim.surgery_id)}
                    onClose={() => setPrintingClaim(null)}
                />
            )}
        </div>
    );
};

export default ClaimsManagement;
