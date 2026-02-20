import React, { useState } from 'react';
import Swal from 'sweetalert2';
import { formatCurrency } from '../utils/hospitalUtils';
import './Management.css';

const SupplyManager = ({
    procedureGroupItems = [],
    onAddProcedureGroupItem,
    onUpdateProcedureGroupItem,
    onDeleteProcedureGroupItem
}) => {
    // === PROCEDURE GROUP ITEM STATE ===
    const [pgFormData, setPgFormData] = useState({
        procedure_group: '',
        item_name: '',
        item_type: 'Supply',
        is_reusable: false,
        quantity_per_case: 1,
        is_high_cost: false,
        unit_price: ''
    });
    const [pgEditingId, setPgEditingId] = useState(null);
    const [pgSearchQuery, setPgSearchQuery] = useState('');
    const [pgFilterGroup, setPgFilterGroup] = useState('All Groups');
    const [errors, setErrors] = useState({});

    // Pagination State
    const [pgCurrentPage, setPgCurrentPage] = useState(1);
    const pgItemsPerPage = 10;

    // Get unique procedure groups
    const uniqueProcedureGroups = React.useMemo(() => {
        const groups = new Set(procedureGroupItems.map(i => i.procedure_group));
        return ['All Groups', ...[...groups].sort()];
    }, [procedureGroupItems]);

    // === PROCEDURE GROUP ITEM HANDLERS ===
    const validateForm = () => {
        const newErrors = {};
        if (!pgFormData.procedure_group || !pgFormData.procedure_group.trim()) {
            newErrors.procedure_group = 'Procedure Group is required';
        }
        if (!pgFormData.item_name || !pgFormData.item_name.trim()) {
            newErrors.item_name = 'Item Name is required';
        }
        if (!pgFormData.item_type) {
            newErrors.item_type = 'Item Type is required';
        }

        const price = parseFloat(pgFormData.unit_price);
        if (pgFormData.unit_price === '' || isNaN(price) || price < 0) {
            newErrors.unit_price = 'Price must be 0 or greater';
        }

        const qty = parseInt(pgFormData.quantity_per_case);
        if (pgFormData.quantity_per_case === '' || isNaN(qty) || qty < 1) {
            newErrors.quantity_per_case = 'Quantity must be 1 or greater';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handlePgSubmit = async (e) => {
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

        // Check for duplicates (same name in same group)
        const isDuplicate = procedureGroupItems.some(item =>
            item.id !== pgEditingId &&
            item.procedure_group.toLowerCase() === pgFormData.procedure_group.toLowerCase().trim() &&
            item.item_name.toLowerCase() === pgFormData.item_name.toLowerCase().trim()
        );

        if (isDuplicate) {
            const confirmDuplicate = await Swal.fire({
                title: 'Duplicate Item?',
                text: `An item named "${pgFormData.item_name}" already exists in "${pgFormData.procedure_group}". Do you want to add it anyway?`,
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'Yes, add it',
                cancelButtonText: 'No, cancel',
                confirmButtonColor: '#3b82f6',
                cancelButtonColor: '#64748b'
            });

            if (!confirmDuplicate.isConfirmed) return;
        }

        const itemData = {
            procedure_group: pgFormData.procedure_group,
            item_name: pgFormData.item_name,
            item_type: pgFormData.item_type,
            is_reusable: pgFormData.is_reusable,
            quantity_per_case: parseInt(pgFormData.quantity_per_case) || 1,
            is_high_cost: pgFormData.is_high_cost,
            unit_price: parseFloat(pgFormData.unit_price) || 0.00
        };

        if (pgEditingId) {
            await onUpdateProcedureGroupItem(pgEditingId, itemData);
            await Swal.fire({
                title: 'Updated!',
                text: 'Item updated successfully',
                icon: 'success',
                timer: 1500,
                showConfirmButton: false
            });
            setPgEditingId(null);
        } else {
            await onAddProcedureGroupItem(itemData);
            await Swal.fire({
                title: 'Added!',
                text: 'Item added successfully',
                icon: 'success',
                timer: 1500,
                showConfirmButton: false
            });
        }

        setErrors({});
        setPgFormData({
            procedure_group: '',
            item_name: '',
            item_type: 'Supply',
            is_reusable: false,
            quantity_per_case: 1,
            is_high_cost: false,
            unit_price: ''
        });
    };

    const handlePgEdit = (item) => {
        setPgFormData({
            procedure_group: item.procedure_group,
            item_name: item.item_name,
            item_type: item.item_type,
            is_reusable: item.is_reusable,
            quantity_per_case: item.quantity_per_case,
            is_high_cost: item.is_high_cost,
            unit_price: item.unit_price
        });
        setPgEditingId(item.id);
        setErrors({});
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handlePgDelete = async (id) => {
        const result = await Swal.fire({
            title: 'Delete Item?',
            text: 'Are you sure you want to delete this item?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Yes, delete it!'
        });

        if (result.isConfirmed) {
            onDeleteProcedureGroupItem(id);
        }
    };

    const handlePgCancelEdit = () => {
        setPgFormData({
            procedure_group: '',
            item_name: '',
            item_type: 'Supply',
            is_reusable: false,
            quantity_per_case: 1,
            is_high_cost: false,
            unit_price: ''
        });
        setPgEditingId(null);
        setErrors({});
    };

    // Filter procedure group items
    const filteredPgItems = procedureGroupItems.filter(item => {
        const matchesGroup = pgFilterGroup === 'All Groups' || item.procedure_group === pgFilterGroup;
        const matchesSearch = pgSearchQuery === '' ||
            (item.item_name && item.item_name.toLowerCase().includes(pgSearchQuery.toLowerCase())) ||
            (item.procedure_group && item.procedure_group.toLowerCase().includes(pgSearchQuery.toLowerCase()));
        return matchesGroup && matchesSearch;
    });

    // Pagination Logic
    const indexOfLastPgItem = pgCurrentPage * pgItemsPerPage;
    const indexOfFirstPgItem = indexOfLastPgItem - pgItemsPerPage;
    const currentPgItems = filteredPgItems.slice(indexOfFirstPgItem, indexOfLastPgItem);
    const totalPgPages = Math.ceil(filteredPgItems.length / pgItemsPerPage);

    const paginatePg = (pageNumber) => setPgCurrentPage(pageNumber);

    return (
        <div className="management-container">
            <div className="management-header">
                <div>
                    <h1>📦 Supply Manager</h1>
                    <p>Manage procedure group cost sets and standard items</p>
                </div>
                <div className="header-stats">
                    <div className="stat-box">
                        <div className="stat-value">{procedureGroupItems.length}</div>
                        <div className="stat-label">Proc. Items</div>
                    </div>
                </div>
            </div>

            <div className="vertical-layout">
                {/* Top Section: Form Card */}
                <div className="content-card form-card-wide">
                    <div className="card-header-compact">
                        <div className="header-info">
                            <h3>{pgEditingId ? 'Edit Procedure Set Item' : 'Add Procedure Set Item'}</h3>
                            <p className="card-subtitle">Define standard items used for specific procedure groups</p>
                        </div>
                    </div>

                    <form onSubmit={handlePgSubmit} className="cpt-form-grid">
                        <div className="form-row-grid">
                            <div className="form-group">
                                <label>Procedure Group <span className="required-star">*</span></label>
                                <div className="input-with-action">
                                    <input
                                        type="text"
                                        className={`form-input ${errors.procedure_group ? 'error-border' : ''}`}
                                        value={pgFormData.procedure_group}
                                        onChange={e => {
                                            setPgFormData({ ...pgFormData, procedure_group: e.target.value });
                                            if (errors.procedure_group) setErrors({ ...errors, procedure_group: null });
                                        }}
                                        placeholder="e.g. Cataract Surgery"
                                        list="procedure-groups"
                                    />
                                    {errors.procedure_group && <span className="error-text">{errors.procedure_group}</span>}
                                    <datalist id="procedure-groups">
                                        {uniqueProcedureGroups.slice(1).map(g => (
                                            <option key={g} value={g} />
                                        ))}
                                    </datalist>
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Item Name <span className="required-star">*</span></label>
                                <input
                                    type="text"
                                    className={`form-input ${errors.item_name ? 'error-border' : ''}`}
                                    value={pgFormData.item_name}
                                    onChange={e => {
                                        setPgFormData({ ...pgFormData, item_name: e.target.value });
                                        if (errors.item_name) setErrors({ ...errors, item_name: null });
                                    }}
                                    placeholder="e.g. Scalpel #11"
                                />
                                {errors.item_name && <span className="error-text">{errors.item_name}</span>}
                            </div>

                            <div className="form-group">
                                <label>Type <span className="required-star">*</span></label>
                                <select
                                    className={`form-select ${errors.item_type ? 'error-border' : ''}`}
                                    value={pgFormData.item_type}
                                    onChange={e => {
                                        const newType = e.target.value;
                                        setPgFormData({
                                            ...pgFormData,
                                            item_type: newType,
                                            is_high_cost: newType === 'High Cost' ? true : pgFormData.is_high_cost
                                        });
                                        if (errors.item_type) setErrors({ ...errors, item_type: null });
                                    }}
                                >
                                    <option value="Supply">Supply</option>
                                    <option value="Tool">Tool</option>
                                    <option value="High Cost">High Cost</option>
                                </select>
                                {errors.item_type && <span className="error-text">{errors.item_type}</span>}
                            </div>

                            <div className="form-group">
                                <label>Unit Price ($) <span className="required-star">*</span></label>
                                <div className="currency-input">
                                    <span className="unit">$</span>
                                    <input
                                        type="number"
                                        className={`form-input ${errors.unit_price ? 'error-border' : ''}`}
                                        step="0.01"
                                        value={pgFormData.unit_price}
                                        onChange={e => {
                                            setPgFormData({ ...pgFormData, unit_price: e.target.value });
                                            if (errors.unit_price) setErrors({ ...errors, unit_price: null });
                                        }}
                                        placeholder="0.00"
                                    />
                                </div>
                                {errors.unit_price && <span className="error-text">{errors.unit_price}</span>}
                            </div>

                            <div className="form-group">
                                <label>Qty Per Case <span className="required-star">*</span></label>
                                <input
                                    type="number"
                                    className={`form-input ${errors.quantity_per_case ? 'error-border' : ''}`}
                                    value={pgFormData.quantity_per_case}
                                    onChange={e => {
                                        setPgFormData({ ...pgFormData, quantity_per_case: e.target.value });
                                        if (errors.quantity_per_case) setErrors({ ...errors, quantity_per_case: null });
                                    }}
                                    min="1"
                                />
                                {errors.quantity_per_case && <span className="error-text">{errors.quantity_per_case}</span>}
                            </div>

                            {/* Checkboxes styled as toggle buttons or similar */}
                            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', justifyContent: 'center' }}>
                                <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={pgFormData.is_reusable}
                                        onChange={e => setPgFormData({ ...pgFormData, is_reusable: e.target.checked })}
                                    />
                                    <span>Reusable Item</span>
                                </label>
                                <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={pgFormData.is_high_cost}
                                        onChange={e => setPgFormData({ ...pgFormData, is_high_cost: e.target.checked })}
                                    />
                                    <span>High Cost Item</span>
                                </label>
                            </div>
                        </div>

                        <div className="form-submit-row">
                            <button type="submit" className="btn-save-modern">
                                {pgEditingId ? 'Update Item' : 'Add Item'}
                            </button>
                            {pgEditingId && (
                                <button type="button" className="btn-cancel-modern" onClick={handlePgCancelEdit}>
                                    Cancel Edit
                                </button>
                            )}
                        </div>
                    </form>
                </div>

                {/* Bottom Section: List Card */}
                <div className="content-card full-width list-card-modern">
                    <div className="card-header list-header" style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'nowrap',
                        gap: '12px',
                        paddingBottom: '1rem',
                        borderBottom: '1px solid #e2e8f0',
                        overflowX: 'auto'
                    }}>
                        <div style={{ flex: '0 0 auto' }}>
                            <h3 style={{ margin: 0, fontSize: '1.25rem', whiteSpace: 'nowrap' }}>Procedure Group Items</h3>
                            <p className="card-subtitle" style={{ margin: 0 }}>{filteredPgItems.length} items found</p>
                        </div>

                        <div className="list-actions" style={{
                            display: 'flex',
                            gap: '10px',
                            alignItems: 'center',
                            justifyContent: 'flex-end',
                            flex: '1 1 auto',
                            minWidth: '0'
                        }}>
                            <div className="search-wrapper" style={{ position: 'relative', width: '280px' }}>
                                <input
                                    type="text"
                                    placeholder="Search..."
                                    value={pgSearchQuery}
                                    onChange={(e) => setPgSearchQuery(e.target.value)}
                                    className="form-input"
                                    style={{
                                        paddingLeft: '2.5rem',
                                        width: '100%',
                                        height: '40px',
                                        margin: 0,
                                        border: '1px solid #cbd5e1',
                                        borderRadius: '6px'
                                    }}
                                />
                                <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>🔍</span>
                            </div>

                            <select
                                className="filter-select form-input"
                                value={pgFilterGroup}
                                onChange={(e) => {
                                    setPgFilterGroup(e.target.value);
                                    setPgCurrentPage(1); // Reset to page 1 on filter change
                                }}
                                style={{ height: '40px', width: '180px', flexShrink: 0 }}
                            >
                                {uniqueProcedureGroups.map(g => (
                                    <option key={g} value={g}>{g}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {filteredPgItems.length > 0 ? (
                        <>
                            <div className="table-container" style={{ boxShadow: 'none', border: 'none', borderRadius: 0 }}>
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Group</th>
                                            <th>Item Name</th>
                                            <th>Type</th>
                                            <th>Price</th>
                                            <th>Qty</th>
                                            <th>High Cost</th>
                                            <th>Reusable</th>
                                            <th>Created At</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {currentPgItems.map(item => (
                                            <tr key={item.id}>
                                                <td style={{ fontWeight: '600', color: '#334155' }}>{item.procedure_group}</td>
                                                <td style={{ fontWeight: '500' }}>{item.item_name}</td>
                                                <td>
                                                    <span className={`badge ${item.item_type === 'High Cost' ? 'badge-red' : item.item_type === 'Tool' ? 'badge-blue' : 'badge-gray'}`}
                                                        style={{
                                                            backgroundColor: item.item_type === 'High Cost' ? '#fee2e2' : item.item_type === 'Tool' ? '#e0e7ff' : '#f1f5f9',
                                                            color: item.item_type === 'High Cost' ? '#dc2626' : item.item_type === 'Tool' ? '#4338ca' : '#475569',
                                                            padding: '0.25rem 0.75rem',
                                                            borderRadius: '9999px',
                                                            fontSize: '0.75rem',
                                                            fontWeight: '600'
                                                        }}
                                                    >
                                                        {item.item_type}
                                                    </span>
                                                </td>
                                                <td style={{ fontWeight: '600', color: '#10b981' }}>{formatCurrency(item.unit_price)}</td>
                                                <td style={{ textAlign: 'center' }}>{item.quantity_per_case}</td>
                                                <td style={{ textAlign: 'center' }}>{item.is_high_cost ? '✅' : '-'}</td>
                                                <td style={{ textAlign: 'center' }}>{item.is_reusable ? '✅' : '-'}</td>
                                                <td style={{ fontSize: '0.85rem', color: '#64748b' }}>
                                                    {item.created_at ? new Date(item.created_at).toLocaleDateString() : '-'}
                                                </td>
                                                <td>
                                                    <div className="actions-cell">
                                                        <button
                                                            className="btn-icon btn-edit"
                                                            onClick={() => handlePgEdit(item)}
                                                            title="Edit"
                                                        >
                                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                                            </svg>
                                                        </button>
                                                        <button
                                                            className="btn-icon btn-delete"
                                                            onClick={() => handlePgDelete(item.id)}
                                                            title="Delete"
                                                        >
                                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                <polyline points="3 6 5 6 21 6"></polyline>
                                                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                                                <line x1="10" y1="11" x2="10" y2="17"></line>
                                                                <line x1="14" y1="11" x2="14" y2="17"></line>
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination Controls */}
                            {totalPgPages > 1 && (
                                <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', padding: '1.5rem', borderTop: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
                                    <button
                                        onClick={() => paginatePg(Math.max(1, pgCurrentPage - 1))}
                                        disabled={pgCurrentPage === 1}
                                        style={{
                                            padding: '0.5rem 1rem',
                                            border: '1px solid #e2e8f0',
                                            backgroundColor: pgCurrentPage === 1 ? '#f1f5f9' : 'white',
                                            color: pgCurrentPage === 1 ? '#94a3b8' : '#334155',
                                            borderRadius: '0.375rem',
                                            cursor: pgCurrentPage === 1 ? 'not-allowed' : 'pointer'
                                        }}
                                    >
                                        Previous
                                    </button>

                                    {Array.from({ length: totalPgPages }, (_, i) => i + 1).map(page => (
                                        <button
                                            key={page}
                                            onClick={() => paginatePg(page)}
                                            style={{
                                                padding: '0.5rem 1rem',
                                                border: pgCurrentPage === page ? 'none' : '1px solid #e2e8f0',
                                                backgroundColor: pgCurrentPage === page ? '#3b82f6' : 'white',
                                                color: pgCurrentPage === page ? 'white' : '#334155',
                                                borderRadius: '0.375rem',
                                                cursor: 'pointer',
                                                fontWeight: pgCurrentPage === page ? '600' : '400'
                                            }}
                                        >
                                            {page}
                                        </button>
                                    ))}

                                    <button
                                        onClick={() => paginatePg(Math.min(totalPgPages, pgCurrentPage + 1))}
                                        disabled={pgCurrentPage === totalPgPages}
                                        style={{
                                            padding: '0.5rem 1rem',
                                            border: '1px solid #e2e8f0',
                                            backgroundColor: pgCurrentPage === totalPgPages ? '#f1f5f9' : 'white',
                                            color: pgCurrentPage === totalPgPages ? '#94a3b8' : '#334155',
                                            borderRadius: '0.375rem',
                                            cursor: pgCurrentPage === totalPgPages ? 'not-allowed' : 'pointer'
                                        }}
                                    >
                                        Next
                                    </button>
                                </div>
                            )}
                        </>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                            <p style={{ fontSize: '1.1rem' }}>No procedure group items found.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SupplyManager;
