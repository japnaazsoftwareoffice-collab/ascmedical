import React, { useState } from 'react';
import Swal from 'sweetalert2';
import { formatCurrency } from '../utils/hospitalUtils';
import { db } from '../lib/supabase';
import './Management.css';

const SupplyManager = ({ supplies, onAddSupply, onUpdateSupply, onDeleteSupply, onRefreshSupplies }) => {
    const [formData, setFormData] = useState({
        name: '',
        category: '',
        unit_cost: '',
        quantity_in_stock: '',
        reorder_level: '',
        supplier: '',
        sku: '',
        description: ''
    });
    const [filterCategory, setFilterCategory] = useState('All Categories');
    const [searchQuery, setSearchQuery] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [isNewCategory, setIsNewCategory] = useState(false);

    // Get unique categories from existing supplies
    const uniqueCategories = React.useMemo(() => {
        const cats = new Set(supplies.map(s => s.category));
        cats.add('General');
        return [...cats].sort();
    }, [supplies]);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validation
        if (!formData.name || !formData.category || !formData.unit_cost) {
            Swal.fire({
                title: 'Missing Fields',
                text: 'Please fill in all required fields (Name, Category, Unit Cost)',
                icon: 'warning',
                confirmButtonColor: '#3b82f6'
            });
            return;
        }

        const supplyData = {
            name: formData.name,
            category: formData.category,
            unit_cost: parseFloat(formData.unit_cost),
            quantity_in_stock: parseInt(formData.quantity_in_stock) || 0,
            reorder_level: parseInt(formData.reorder_level) || 0,
            supplier: formData.supplier || '',
            sku: formData.sku || '',
            description: formData.description || ''
        };

        if (editingId) {
            await onUpdateSupply(editingId, supplyData);
            await Swal.fire({
                title: 'Updated!',
                text: 'Supply item updated successfully',
                icon: 'success',
                timer: 1500,
                showConfirmButton: false
            });
            setEditingId(null);
        } else {
            await onAddSupply(supplyData);
            await Swal.fire({
                title: 'Added!',
                text: 'Supply item added successfully',
                icon: 'success',
                timer: 1500,
                showConfirmButton: false
            });
        }

        setFormData({
            name: '',
            category: '',
            unit_cost: '',
            quantity_in_stock: '',
            reorder_level: '',
            supplier: '',
            sku: '',
            description: ''
        });
        setIsNewCategory(false);
    };

    const handleEdit = (supply) => {
        setFormData({
            name: supply.name,
            category: supply.category,
            unit_cost: supply.unit_cost,
            quantity_in_stock: supply.quantity_in_stock || 0,
            reorder_level: supply.reorder_level || 0,
            supplier: supply.supplier || '',
            sku: supply.sku || '',
            description: supply.description || ''
        });
        setEditingId(supply.id);

        // Scroll to form
        setTimeout(() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 100);
    };

    const handleDelete = async (id) => {
        const result = await Swal.fire({
            title: 'Delete Supply Item?',
            text: 'Are you sure you want to delete this supply item?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Yes, delete it!'
        });

        if (result.isConfirmed) {
            onDeleteSupply(id);
        }
    };

    const handleCancelEdit = () => {
        setFormData({
            name: '',
            category: '',
            unit_cost: '',
            quantity_in_stock: '',
            reorder_level: '',
            supplier: '',
            sku: '',
            description: ''
        });
        setEditingId(null);
        setIsNewCategory(false);
    };

    // Filter supply list based on selected category and search query
    const filteredSupplyList = supplies.filter(supply => {
        const matchesCategory = filterCategory === 'All Categories' || supply.category === filterCategory;
        const matchesSearch = searchQuery === '' ||
            (supply.name && supply.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (supply.sku && supply.sku.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (supply.description && supply.description.toLowerCase().includes(searchQuery.toLowerCase()));

        return matchesCategory && matchesSearch;
    });

    // Pagination Logic
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredSupplyList.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredSupplyList.length / itemsPerPage);

    const paginate = (pageNumber) => setCurrentPage(pageNumber);

    // Get unique categories for filter
    const categories = ['All Categories', ...new Set(supplies.map(supply => supply.category))];

    // Calculate low stock items
    const lowStockItems = supplies.filter(s => s.quantity_in_stock <= s.reorder_level);

    return (
        <div className="management-container">
            <div className="management-header">
                <div>
                    <h1>📦 Supply Manager</h1>
                    <p>Manage medical supplies, inventory, and costs</p>
                </div>
                <div className="header-stats">
                    <div className="stat-box">
                        <div className="stat-value">{supplies.length}</div>
                        <div className="stat-label">Total Items</div>
                    </div>
                    <div className="stat-box" style={{ backgroundColor: lowStockItems.length > 0 ? '#fee2e2' : '#dbeafe' }}>
                        <div className="stat-value" style={{ color: lowStockItems.length > 0 ? '#dc2626' : '#0284c7' }}>
                            {lowStockItems.length}
                        </div>
                        <div className="stat-label">Low Stock</div>
                    </div>
                    <div className="stat-box">
                        <div className="stat-value">
                            {formatCurrency(supplies.reduce((sum, s) => sum + (s.unit_cost * s.quantity_in_stock), 0))}
                        </div>
                        <div className="stat-label">Inventory Value</div>
                    </div>
                </div>
            </div>

            {/* Add/Edit Supply Form */}
            <div className="management-section">
                <h2>{editingId ? '✏️ Edit Supply Item' : '➕ Add New Supply'}</h2>
                <form onSubmit={handleSubmit} className="management-form">
                    <div className="form-row">
                        <div className="form-group">
                            <label>Item Name *</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g., Sterile Gloves (Size M)"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>SKU</label>
                            <input
                                type="text"
                                value={formData.sku}
                                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                                placeholder="e.g., GLV-M-001"
                            />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Category *</label>
                            {isNewCategory ? (
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <input
                                        type="text"
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                        placeholder="New category name"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setIsNewCategory(false)}
                                        style={{ padding: '0.5rem 1rem', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '0.375rem', cursor: 'pointer' }}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <select
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                        required
                                    >
                                        <option value="">Select Category...</option>
                                        {uniqueCategories.map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                    <button
                                        type="button"
                                        onClick={() => setIsNewCategory(true)}
                                        style={{ padding: '0.5rem 1rem', backgroundColor: '#e0f2fe', border: '1px solid #7dd3fc', borderRadius: '0.375rem', cursor: 'pointer' }}
                                    >
                                        + New
                                    </button>
                                </div>
                            )}
                        </div>
                        <div className="form-group">
                            <label>Unit Cost ($) *</label>
                            <input
                                type="number"
                                step="0.01"
                                value={formData.unit_cost}
                                onChange={(e) => setFormData({ ...formData, unit_cost: e.target.value })}
                                placeholder="0.00"
                                required
                            />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Quantity in Stock</label>
                            <input
                                type="number"
                                value={formData.quantity_in_stock}
                                onChange={(e) => setFormData({ ...formData, quantity_in_stock: e.target.value })}
                                placeholder="0"
                            />
                        </div>
                        <div className="form-group">
                            <label>Reorder Level</label>
                            <input
                                type="number"
                                value={formData.reorder_level}
                                onChange={(e) => setFormData({ ...formData, reorder_level: e.target.value })}
                                placeholder="0"
                            />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                            <label>Supplier</label>
                            <input
                                type="text"
                                value={formData.supplier}
                                onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                                placeholder="e.g., Medline Industries"
                            />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                            <label>Description</label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Additional details about the supply..."
                                rows="3"
                            />
                        </div>
                    </div>

                    <div className="form-actions">
                        <button type="submit" className="btn-primary">
                            {editingId ? '💾 Update Supply' : '➕ Add Supply'}
                        </button>
                        {editingId && (
                            <button type="button" onClick={handleCancelEdit} className="btn-secondary">
                                ✕ Cancel Edit
                            </button>
                        )}
                    </div>
                </form>
            </div>

            {/* Supply List */}
            <div className="management-section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2>Supply Inventory</h2>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <input
                            type="text"
                            placeholder="🔍 Search by name, SKU, or description..."
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setCurrentPage(1);
                            }}
                            style={{ padding: '0.5rem 1rem', border: '1px solid #e2e8f0', borderRadius: '0.375rem', flex: 1, minWidth: '200px' }}
                        />
                        <select
                            value={filterCategory}
                            onChange={(e) => {
                                setFilterCategory(e.target.value);
                                setCurrentPage(1);
                            }}
                            style={{ padding: '0.5rem 1rem', border: '1px solid #e2e8f0', borderRadius: '0.375rem' }}
                        >
                            {categories.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {currentItems.length > 0 ? (
                    <>
                        <div className="table-wrapper">
                            <table className="management-table">
                                <thead>
                                    <tr>
                                        <th>Item Name</th>
                                        <th>SKU</th>
                                        <th>Category</th>
                                        <th>Unit Cost</th>
                                        <th>Qty Stock</th>
                                        <th>Reorder Level</th>
                                        <th>Total Value</th>
                                        <th>Supplier</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {currentItems.map(supply => {
                                        const isLowStock = supply.quantity_in_stock <= supply.reorder_level;
                                        const totalValue = supply.unit_cost * supply.quantity_in_stock;
                                        return (
                                            <tr key={supply.id} style={{ opacity: isLowStock ? 0.9 : 1 }}>
                                                <td style={{ fontWeight: '500' }}>{supply.name}</td>
                                                <td>{supply.sku || '-'}</td>
                                                <td><span style={{ backgroundColor: '#f1f5f9', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.875rem' }}>{supply.category}</span></td>
                                                <td>{formatCurrency(supply.unit_cost)}</td>
                                                <td style={{ textAlign: 'center', color: isLowStock ? '#dc2626' : '#0284c7', fontWeight: isLowStock ? '600' : '500' }}>
                                                    {supply.quantity_in_stock}
                                                </td>
                                                <td style={{ textAlign: 'center' }}>{supply.reorder_level}</td>
                                                <td>{formatCurrency(totalValue)}</td>
                                                <td>{supply.supplier || '-'}</td>
                                                <td>
                                                    {isLowStock ? (
                                                        <span style={{ backgroundColor: '#fee2e2', color: '#dc2626', padding: '0.25rem 0.75rem', borderRadius: '0.375rem', fontSize: '0.875rem', fontWeight: '500' }}>
                                                            ⚠️ Low Stock
                                                        </span>
                                                    ) : (
                                                        <span style={{ backgroundColor: '#dbeafe', color: '#0284c7', padding: '0.25rem 0.75rem', borderRadius: '0.375rem', fontSize: '0.875rem', fontWeight: '500' }}>
                                                            ✓ In Stock
                                                        </span>
                                                    )}
                                                </td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <button
                                                        onClick={() => handleEdit(supply)}
                                                        style={{ backgroundColor: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.2rem', padding: '0.25rem 0.5rem' }}
                                                        title="Edit"
                                                    >
                                                        ✏️
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(supply.id)}
                                                        style={{ backgroundColor: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.2rem', padding: '0.25rem 0.5rem' }}
                                                        title="Delete"
                                                    >
                                                        🗑️
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
                                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                    <button
                                        key={page}
                                        onClick={() => paginate(page)}
                                        style={{
                                            padding: '0.5rem 0.75rem',
                                            border: currentPage === page ? 'none' : '1px solid #e2e8f0',
                                            backgroundColor: currentPage === page ? '#3b82f6' : 'transparent',
                                            color: currentPage === page ? 'white' : '#1e293b',
                                            borderRadius: '0.375rem',
                                            cursor: 'pointer',
                                            fontWeight: currentPage === page ? '600' : '500'
                                        }}
                                    >
                                        {page}
                                    </button>
                                ))}
                            </div>
                        )}
                    </>
                ) : (
                    <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                        <p style={{ fontSize: '1.1rem' }}>No supplies found. Add your first supply item to get started! 📦</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SupplyManager;
