import React, { useState } from 'react';
import Swal from 'sweetalert2';
import { formatCurrency } from '../utils/hospitalUtils';
import { db } from '../lib/supabase';
import CPTDurationUpdater from './CPTDurationUpdater';
import './Management.css';

const CPTManager = ({ cptCodes, onAddCPT, onUpdateCPT, onDeleteCPT, onRefreshCPTCodes, showAllCPTs, setShowAllCPTs }) => {
    const [formData, setFormData] = useState({
        category: '',
        code: '',
        description: '',
        reimbursement: '',
        procedure_indicator: '',
        body_part: '',
        average_duration: ''
    });
    const [filterCategory, setFilterCategory] = useState('All Categories');
    const [searchQuery, setSearchQuery] = useState('');
    // showAllCPTs is now a prop
    const [editingId, setEditingId] = useState(null);
    const [isNewCategory, setIsNewCategory] = useState(false);
    const [showDurationUpdater, setShowDurationUpdater] = useState(false);

    // Get unique categories from existing codes
    const uniqueCategories = React.useMemo(() => {
        const cats = new Set(cptCodes.map(c => c.category));
        // Ensure 'General' always exists as a fallback
        cats.add('General');
        return [...cats].sort();
    }, [cptCodes]);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;


    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validation
        if (!formData.category || !formData.code || !formData.description || !formData.reimbursement) {
            Swal.fire({
                title: 'Missing Fields',
                text: 'Please fill in all required fields',
                icon: 'warning',
                confirmButtonColor: '#3b82f6'
            });
            return;
        }

        const cptData = {
            code: formData.code,
            description: formData.description,
            reimbursement: parseFloat(formData.reimbursement),
            category: formData.category,
            procedure_indicator: formData.procedure_indicator,
            body_part: formData.body_part,
            average_duration: parseInt(formData.average_duration) || 0
        };

        if (editingId) {
            await onUpdateCPT(editingId, cptData);
            await Swal.fire({
                title: 'Updated!',
                text: 'CPT code updated successfully',
                icon: 'success',
                timer: 1500,
                showConfirmButton: false
            });
            setEditingId(null);
        } else {
            await onAddCPT(cptData);
            await Swal.fire({
                title: 'Added!',
                text: 'CPT code added successfully',
                icon: 'success',
                timer: 1500,
                showConfirmButton: false
            });
        }

        setFormData({ category: '', code: '', description: '', reimbursement: '', procedure_indicator: '', body_part: '', average_duration: '' });
        setIsNewCategory(false);
    };

    const handleEdit = (cpt) => {
        setFormData({
            category: cpt.category,
            code: cpt.code,
            description: cpt.description,
            reimbursement: cpt.reimbursement,
            procedure_indicator: cpt.procedure_indicator || '',
            body_part: cpt.body_part || '',
            average_duration: cpt.average_duration || ''
        });
        setEditingId(cpt.id);

        // Scroll to form
        setTimeout(() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 100);
    };

    const handleDelete = async (id) => {
        const result = await Swal.fire({
            title: 'Delete CPT Code?',
            text: 'Are you sure you want to delete this CPT code?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Yes, delete it!'
        });

        if (result.isConfirmed) {
            onDeleteCPT(id);
        }
    };

    const handleCancelEdit = () => {
        setFormData({ category: '', code: '', description: '', reimbursement: '', procedure_indicator: '', body_part: '', average_duration: '' });
        setEditingId(null);
        setIsNewCategory(false);
    };

    // Filter CPT list based on selected category, search query, and active status
    const filteredCPTList = cptCodes.filter(cpt => {
        const matchesCategory = filterCategory === 'All Categories' || cpt.category === filterCategory;
        const matchesSearch = searchQuery === '' ||
            (cpt.code && cpt.code.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (cpt.description && cpt.description.toLowerCase().includes(searchQuery.toLowerCase()));

        // Show only active codes unless "Show All" is enabled
        const matchesActive = showAllCPTs || cpt.is_active !== false; // Default to true if undefined

        return matchesCategory && matchesSearch && matchesActive;
    });

    // Pagination Logic
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredCPTList.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredCPTList.length / itemsPerPage);

    const paginate = (pageNumber) => setCurrentPage(pageNumber);

    // Get unique categories for filter
    const categories = ['All Categories', ...new Set(cptCodes.map(cpt => cpt.category))];

    // Category Management Handlers
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null); // { name: 'Old Name' }
    const [newCategoryName, setNewCategoryName] = useState('');

    const handleUpdateCategory = async (oldName) => {
        if (!newCategoryName.trim() || newCategoryName === oldName) {
            setEditingCategory(null);
            return;
        }

        try {
            await db.updateCategoryName(oldName, newCategoryName);
            await Swal.fire({
                title: 'Updated!',
                text: 'Category name updated successfully',
                icon: 'success',
                timer: 1500,
                showConfirmButton: false
            });

            if (onRefreshCPTCodes) {
                onRefreshCPTCodes();
            }
        } catch (error) {
            console.error('Error updating category:', error);
            Swal.fire('Error', 'Failed to update category', 'error');
        }
        setEditingCategory(null);
        setNewCategoryName('');
    };

    const handleDeleteCategory = async (categoryName) => {
        const result = await Swal.fire({
            title: 'Delete Category?',
            text: `This will move all "${categoryName}" codes to "General".`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            confirmButtonText: 'Yes, delete it!'
        });

        if (result.isConfirmed) {
            try {
                await db.deleteCategory(categoryName);
                await Swal.fire('Deleted!', 'Category has been removed.', 'success');
                if (onRefreshCPTCodes) {
                    onRefreshCPTCodes();
                }
            } catch (error) {
                console.error('Error deleting category:', error);
                Swal.fire('Error', `Failed to delete category: ${error.message || JSON.stringify(error)}`, 'error');
            }
        }
    };

    return (
        <div className="management-container fade-in">
            <div className="management-header">
                <h2 className="management-title">CPT Codes & Pricing</h2>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button
                        className="btn-secondary"
                        onClick={() => setShowDurationUpdater(true)}
                        style={{
                            padding: '0.5rem 1rem',
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: '600',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}
                    >
                        <span style={{ fontSize: '1.2rem' }}>🤖</span> AI Update Durations
                    </button>
                    <button
                        className="btn-secondary"
                        onClick={() => setShowCategoryModal(true)}
                        style={{
                            padding: '0.5rem 1rem',
                            background: 'white',
                            border: '1px solid #cbd5e1',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: '600',
                            color: '#475569',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}
                    >
                        <span style={{ fontSize: '1.2rem' }}>🏷️</span> Manage Categories
                    </button>
                </div>
            </div>

            <div className="split-layout">
                {/* Left Side: Add/Edit Form */}
                <div className="content-card form-card">
                    <div className="card-header">
                        <h3>{editingId ? 'Edit CPT Code' : 'Add New CPT'}</h3>
                        <p className="card-subtitle">Manage procedure codes and pricing</p>
                    </div>
                    <form onSubmit={handleSubmit} className="cpt-form">
                        <div className="form-group">
                            <label>Category <span style={{ color: 'red' }}>*</span></label>
                            {isNewCategory ? (
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="Enter new category name"
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                        required
                                        autoFocus
                                    />
                                    <button
                                        type="button"
                                        className="btn-cancel"
                                        onClick={() => {
                                            setIsNewCategory(false);
                                            setFormData({ ...formData, category: '' });
                                        }}
                                        style={{ padding: '0.5rem', whiteSpace: 'nowrap' }}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            ) : (
                                <select
                                    className="form-input"
                                    value={formData.category}
                                    onChange={(e) => {
                                        if (e.target.value === 'NEW_CATEGORY_OPTION') {
                                            setIsNewCategory(true);
                                            setFormData({ ...formData, category: '' });
                                        } else {
                                            setFormData({ ...formData, category: e.target.value });
                                        }
                                    }}
                                    required
                                >
                                    <option value="">Select Category...</option>
                                    {uniqueCategories.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                    <option value="NEW_CATEGORY_OPTION" style={{ fontWeight: 'bold', color: '#3b82f6' }}>+ Create New Category...</option>
                                </select>
                            )}
                        </div>

                        <div className="form-group">
                            <label>CPT Code <span style={{ color: 'red' }}>*</span></label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="e.g. 99213"
                                value={formData.code}
                                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Description <span style={{ color: 'red' }}>*</span></label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Short procedure name"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Procedure Indicator</label>
                            <select
                                className="form-input"
                                value={formData.procedure_indicator}
                                onChange={(e) => setFormData({ ...formData, procedure_indicator: e.target.value })}
                            >
                                <option value="">-- Select Indicator --</option>
                                <option value="S">S - Surgical Procedure</option>
                                <option value="A">A - Ancillary Service</option>
                                <option value="C">C - Carrier Priced</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Body Part</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="e.g. Hand, Shoulder, Knee"
                                value={formData.body_part}
                                onChange={(e) => setFormData({ ...formData, body_part: e.target.value })}
                            />
                        </div>

                        <div className="form-group">
                            <label>Average Duration (Minutes)</label>
                            <input
                                type="number"
                                className="form-input"
                                placeholder="e.g. 60"
                                min="0"
                                value={formData.average_duration}
                                onChange={(e) => setFormData({ ...formData, average_duration: e.target.value })}
                            />
                        </div>

                        <div className="form-group">
                            <label>Reimbursement ($) <span style={{ color: 'red' }}>*</span></label>
                            <input
                                type="number"
                                className="form-input"
                                placeholder="0.00"
                                step="0.01"
                                min="0"
                                value={formData.reimbursement}
                                onChange={(e) => setFormData({ ...formData, reimbursement: e.target.value })}
                                required
                            />
                        </div>

                        <div className="form-actions" style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <button type="submit" className="btn-save full-width" style={{ width: '100%', justifyContent: 'center' }}>
                                {editingId ? 'Update CPT Code' : 'Add to Price List'}
                            </button>
                            {editingId && (
                                <button type="button" className="btn-cancel full-width" onClick={handleCancelEdit} style={{ width: '100%', justifyContent: 'center' }}>
                                    Cancel Edit
                                </button>
                            )}
                        </div>
                    </form>
                </div>

                {/* Right Side: List */}
                <div className="content-card list-card" style={{ display: 'flex', flexDirection: 'column', height: 'fit-content' }}>
                    <div className="card-header list-header" style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '1.5rem'
                    }}>
                        <div>
                            <h3>Master Price List</h3>
                            <p className="card-subtitle">{filteredCPTList.length} codes found</p>
                        </div>
                        <div className="list-actions" style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <div className="search-wrapper" style={{ position: 'relative', flex: '1 1 auto' }}>
                                <input
                                    type="text"
                                    placeholder="Search code or description..."
                                    value={searchQuery}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                    className="form-input"
                                    style={{
                                        paddingLeft: '2.5rem',
                                        width: '320px',
                                        minWidth: '240px',
                                        height: '42px',
                                        margin: 0
                                    }}
                                />
                                <span style={{
                                    position: 'absolute',
                                    left: '12px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    color: '#94a3b8',
                                    pointerEvents: 'none',
                                    display: 'flex',
                                    alignItems: 'center'
                                }}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="11" cy="11" r="8"></circle>
                                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                                    </svg>
                                </span>
                            </div>
                            <select
                                className="filter-select form-input"
                                value={filterCategory}
                                onChange={(e) => {
                                    setFilterCategory(e.target.value);
                                    setCurrentPage(1);
                                }}
                                style={{
                                    height: '42px',
                                    width: 'auto',
                                    minWidth: '160px',
                                    cursor: 'pointer',
                                    borderColor: '#e2e8f0'
                                }}
                            >
                                <option value="All Categories">All Categories</option>
                                {categories.filter(c => c !== 'All Categories').map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>

                            <button
                                onClick={() => setShowAllCPTs(!showAllCPTs)}
                                style={{
                                    padding: '0 1rem',
                                    height: '42px',
                                    background: showAllCPTs ? '#3b82f6' : 'white',
                                    color: showAllCPTs ? 'white' : '#64748b',
                                    border: `1px solid ${showAllCPTs ? '#3b82f6' : '#e2e8f0'}`,
                                    borderRadius: '8px',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    transition: 'all 0.2s'
                                }}
                                title={showAllCPTs ? "Showing all codes (Active & Inactive)" : "Showing only active codes"}
                            >
                                <span>{showAllCPTs ? '👁️' : '👁️‍🗨️'}</span>
                                {showAllCPTs ? 'Show All' : 'Active Only'}
                            </button>
                        </div>
                    </div>

                    <div className="table-container" style={{ boxShadow: 'none', border: 'none', borderRadius: 0 }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Code</th>
                                    <th>Description</th>
                                    <th>Indicator</th>
                                    <th>Category</th>
                                    <th>Body Part</th>
                                    <th>Duration</th>
                                    <th>Reimbursement</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {currentItems.length > 0 ? (
                                    currentItems.map((cpt, index) => (
                                        <tr key={cpt.id || index}>
                                            <td className="font-mono" style={{ fontWeight: 600 }}>{cpt.code}</td>
                                            <td>{cpt.description}</td>
                                            <td>
                                                {cpt.procedure_indicator ? (
                                                    <span className="badge" style={{ background: '#e0e7ff', color: '#4338ca' }}>
                                                        {cpt.procedure_indicator}
                                                    </span>
                                                ) : (
                                                    <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>-</span>
                                                )}
                                            </td>
                                            <td><span className="category-tag">{cpt.category}</span></td>
                                            <td>{cpt.body_part || '-'}</td>
                                            <td>{cpt.average_duration ? `${cpt.average_duration} min` : '-'}</td>
                                            <td style={{ fontWeight: 600, color: '#10b981' }}>{formatCurrency(cpt.reimbursement)}</td>
                                            <td>
                                                <div className="actions-cell">
                                                    <button
                                                        className="btn-icon btn-edit"
                                                        onClick={() => handleEdit(cpt)}
                                                        title="Edit"
                                                    >
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                                        </svg>
                                                    </button>
                                                    <button
                                                        className="btn-icon btn-delete"
                                                        onClick={() => handleDelete(cpt.id)}
                                                        title="Delete"
                                                    >
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <polyline points="3 6 5 6 21 6"></polyline>
                                                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                                            <line x1="10" y1="11" x2="10" y2="17"></line>
                                                            <line x1="14" y1="11" x2="14" y2="17"></line>
                                                        </svg>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                                            No CPT codes found for this category
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="pagination-controls" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', padding: '1rem', borderTop: '1px solid #e2e8f0' }}>
                            <button
                                onClick={() => paginate(currentPage - 1)}
                                disabled={currentPage === 1}
                                className="btn-pagination"
                                style={{ padding: '0.5rem 1rem', border: '1px solid #cbd5e1', borderRadius: '6px', background: currentPage === 1 ? '#f1f5f9' : 'white', cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
                            >
                                Previous
                            </button>

                            <span style={{ fontSize: '0.9rem', color: '#64748b' }}>
                                Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
                            </span>

                            <button
                                onClick={() => paginate(currentPage + 1)}
                                disabled={currentPage === totalPages}
                                className="btn-pagination"
                                style={{ padding: '0.5rem 1rem', border: '1px solid #cbd5e1', borderRadius: '6px', background: currentPage === totalPages ? '#f1f5f9' : 'white', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
                            >
                                Next
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Category Management Modal */}
            {showCategoryModal && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '500px' }}>
                        <div className="modal-header">
                            <h3>Manage Categories</h3>
                            <button className="btn-close" onClick={() => setShowCategoryModal(false)}>×</button>
                        </div>
                        <div className="modal-body" style={{ padding: '1.5rem' }}>
                            <div className="category-list-manage" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '400px', overflowY: 'auto' }}>
                                {uniqueCategories.map(cat => (
                                    <div key={cat} className="category-item-manage" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                        {editingCategory === cat ? (
                                            <div style={{ display: 'flex', gap: '0.5rem', flex: 1 }}>
                                                <input
                                                    type="text"
                                                    className="form-input"
                                                    value={newCategoryName}
                                                    onChange={(e) => setNewCategoryName(e.target.value)}
                                                    autoFocus
                                                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.9rem' }}
                                                />
                                                <button className="btn-save" onClick={() => handleUpdateCategory(cat)} style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }}>Save</button>
                                                <button className="btn-cancel" onClick={() => setEditingCategory(null)} style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }}>Cancel</button>
                                            </div>
                                        ) : (
                                            <>
                                                <span style={{ fontWeight: '500', color: '#334155' }}>{cat}</span>
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    <button
                                                        className="btn-icon"
                                                        onClick={() => {
                                                            setEditingCategory(cat);
                                                            setNewCategoryName(cat);
                                                        }}
                                                        title="Rename"
                                                        style={{ color: '#3b82f6' }}
                                                    >
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                                    </button>
                                                    <button
                                                        className="btn-icon"
                                                        onClick={() => handleDeleteCategory(cat)}
                                                        title="Delete"
                                                        style={{ color: '#ef4444' }}
                                                    >
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* AI Duration Updater Modal */}
            {showDurationUpdater && (
                <CPTDurationUpdater
                    cptCodes={cptCodes}
                    onClose={() => {
                        setShowDurationUpdater(false);
                        if (onRefreshCPTCodes) {
                            onRefreshCPTCodes();
                        }
                    }}
                />
            )}
        </div>
    );
};

export default CPTManager;
