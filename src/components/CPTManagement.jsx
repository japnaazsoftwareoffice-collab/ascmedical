import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import db from '../db'; // Assume Supabase helper functions are exported from db.js

const CPTManagement = () => {
    const [cpts, setCpts] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({ code: '', description: '' });
    const [editingId, setEditingId] = useState(null);

    const fetchCpts = async () => {
        const { data, error } = await db.getCpts();
        if (error) {
            console.error('Error fetching CPTs:', error);
        } else {
            setCpts(data);
        }
    };

    useEffect(() => {
        fetchCpts();
    }, []);

    const handleAddClick = () => {
        setFormData({ code: '', description: '' });
        setEditingId(null);
        setShowModal(true);
    };

    const handleEditClick = (cpt) => {
        setFormData({ code: cpt.code, description: cpt.description });
        setEditingId(cpt.id);
        setShowModal(true);
    };

    const handleDeleteClick = async (id) => {
        const result = await Swal.fire({
            title: 'Delete CPT?',
            text: 'This action cannot be undone.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Delete',
        });
        if (result.isConfirmed) {
            const { error } = await db.deleteCpt(id);
            if (error) {
                Swal.fire({ title: 'Error!', text: 'Failed to delete CPT.', icon: 'error' });
            } else {
                Swal.fire({ title: 'Deleted!', icon: 'success', timer: 1500, showConfirmButton: false });
                fetchCpts();
            }
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (editingId) {
            const { error } = await db.updateCpt(editingId, formData);
            if (error) {
                Swal.fire({ title: 'Error!', text: 'Failed to update CPT.', icon: 'error' });
                return;
            }
            Swal.fire({ title: 'Updated!', icon: 'success', timer: 1500, showConfirmButton: false });
        } else {
            const { error } = await db.createCpt(formData);
            if (error) {
                Swal.fire({ title: 'Error!', text: 'Failed to create CPT.', icon: 'error' });
                return;
            }
            Swal.fire({ title: 'Created!', icon: 'success', timer: 1500, showConfirmButton: false });
        }
        setShowModal(false);
        fetchCpts();
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleCloseModal = () => setShowModal(false);

    return (
        <div className="management-container fade-in">
            <div className="management-header">
                <h2 className="management-title">CPT Management</h2>
                <button className="btn-add" onClick={handleAddClick}>+ Add CPT</button>
            </div>
            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Code</th>
                            <th>Description</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {cpts.length === 0 ? (
                            <tr>
                                <td colSpan="3" style={{ textAlign: 'center', padding: '2rem' }}>No CPT codes found.</td>
                            </tr>
                        ) : (
                            cpts.map(cpt => (
                                <tr key={cpt.id}>
                                    <td>{cpt.code}</td>
                                    <td>{cpt.description}</td>
                                    <td className="actions-cell">
                                        <button className="btn-icon btn-edit" onClick={() => handleEditClick(cpt)} title="Edit CPT"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg></button>
                                        <button className="btn-icon btn-delete" onClick={() => handleDeleteClick(cpt.id)} title="Delete CPT"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg></button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3>{editingId ? 'Edit CPT' : 'Add CPT'}</h3>
                            <button className="btn-close" onClick={handleCloseModal}>×</button>
                        </div>
                        <form onSubmit={handleSave}>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Code</label>
                                    <input type="text" name="code" value={formData.code} onChange={handleChange} className="form-input" required />
                                </div>
                                <div className="form-group">
                                    <label>Description</label>
                                    <input type="text" name="description" value={formData.description} onChange={handleChange} className="form-input" required />
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

export default CPTManagement;
