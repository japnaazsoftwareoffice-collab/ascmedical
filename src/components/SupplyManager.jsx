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

    // Pagination State
    const [pgCurrentPage, setPgCurrentPage] = useState(1);
    const pgItemsPerPage = 10;

    // Get unique procedure groups
    const uniqueProcedureGroups = React.useMemo(() => {
        const groups = new Set(procedureGroupItems.map(i => i.procedure_group));
        return ['All Groups', ...[...groups].sort()];
    }, [procedureGroupItems]);

    // === PROCEDURE GROUP ITEM HANDLERS ===
    const handlePgSubmit = async (e) => {
        e.preventDefault();

        if (!pgFormData.procedure_group || !pgFormData.item_name || !pgFormData.item_type) {
            Swal.fire({
                title: 'Missing Fields',
                text: 'Please fill in required fields (Group, Item Name, Type)',
                icon: 'warning',
                confirmButtonColor: '#3b82f6'
            });
            return;
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
                                <label>Procedure Group *</label>
                                <div className="input-with-action">
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={pgFormData.procedure_group}
                                        onChange={e => setPgFormData({ ...pgFormData, procedure_group: e.target.value })}
                                        placeholder="e.g. Cataract Surgery"
                                        list="procedure-groups"
                                        required
                                    />
                                    <datalist id="procedure-groups">
                                        {uniqueProcedureGroups.slice(1).map(g => (
                                            <option key={g} value={g} />
                                        ))}
                                    </datalist>
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Item Name *</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={pgFormData.item_name}
                                    onChange={e => setPgFormData({ ...pgFormData, item_name: e.target.value })}
                                    placeholder="e.g. Scalpel #11"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Type *</label>
                                <select
                                    className="form-select"
                                    value={pgFormData.item_type}
                                    onChange={e => setPgFormData({ ...pgFormData, item_type: e.target.value })}
                                >
                                    <option value="Supply">Supply</option>
                                    <option value="Tool">Tool</option>
                                    <option value="High Cost">High Cost</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Unit Price ($)</label>
                                <div className="currency-input">
                                    <span className="unit">$</span>
                                    <input
                                        type="number"
                                        className="form-input"
                                        step="0.01"
                                        value={pgFormData.unit_price}
                                        onChange={e => setPgFormData({ ...pgFormData, unit_price: e.target.value })}
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Qty Per Case</label>
                                <input
                                    type="number"
                                    className="form-input"
                                    value={pgFormData.quantity_per_case}
                                    onChange={e => setPgFormData({ ...pgFormData, quantity_per_case: e.target.value })}
                                    min="1"
                                />
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
                        flexWrap: 'wrap',
                        gap: '1.5rem'
                    }}>
                        <div>
                            <h3>Procedure Group Items</h3>
                            <p className="card-subtitle">{filteredPgItems.length} items found</p>
                        </div>
                        <div className="list-actions" style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <div className="search-wrapper" style={{ position: 'relative', flex: '1 1 auto' }}>
                                <input
                                    type="text"
                                    placeholder="Search group or item..."
                                    value={pgSearchQuery}
                                    onChange={(e) => setPgSearchQuery(e.target.value)}
                                    className="form-input"
                                    style={{
                                        paddingLeft: '2.5rem',
                                        width: '280px',
                                        height: '42px',
                                        margin: 0
                                    }}
                                />
                                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>🔍</span>
                            </div>
                            <select
                                className="filter-select form-input"
                                value={pgFilterGroup}
                                onChange={(e) => {
                                    setPgFilterGroup(e.target.value);
                                    setPgCurrentPage(1); // Reset to page 1 on filter change
                                }}
                                style={{ height: '42px', minWidth: '160px' }}
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
                                                            ✏️
                                                        </button>
                                                        <button
                                                            className="btn-icon btn-delete"
                                                            onClick={() => handlePgDelete(item.id)}
                                                            title="Delete"
                                                        >
                                                            🗑️
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
