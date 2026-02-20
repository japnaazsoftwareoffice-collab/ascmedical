import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { db } from '../lib/supabase';
import * as pdfjs from 'pdfjs-dist';
import mammoth from 'mammoth';
import Papa from 'papaparse';
import './Management.css';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

const InstructionPanel = () => {
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isEditing, setIsEditing] = useState(null);
    const [formData, setFormData] = useState({
        question: '',
        category: '',
        is_active: true
    });
    const [errors, setErrors] = useState({});
    const [isImporting, setIsImporting] = useState(false);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Unique categories for filtering
    const categories = ['All', ...new Set(questions.map(q => q.category).filter(Boolean))];
    const [filterCategory, setFilterCategory] = useState('All');

    useEffect(() => {
        loadQuestions();
    }, []);

    const loadQuestions = async () => {
        try {
            setLoading(true);
            const data = await db.getChatbotQuestions();
            setQuestions(data);
        } catch (error) {
            console.error('Error loading chatbot questions:', error);
            Swal.fire('Error', 'Failed to load question list', 'error');
        } finally {
            setLoading(false);
        }
    };

    const validateForm = () => {
        const newErrors = {};
        if (!formData.question.trim()) newErrors.question = 'Question is required';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        try {
            if (isEditing) {
                await db.updateChatbotQuestion(isEditing, formData);
                Swal.fire({
                    title: 'Updated!',
                    text: 'Question updated successfully',
                    icon: 'success',
                    timer: 1500,
                    showConfirmButton: false
                });
            } else {
                await db.addChatbotQuestion(formData);
                Swal.fire({
                    title: 'Added!',
                    text: 'New question added successfully',
                    icon: 'success',
                    timer: 1500,
                    showConfirmButton: false
                });
            }
            setFormData({ question: '', category: '', is_active: true });
            setIsEditing(null);
            loadQuestions();
        } catch (error) {
            console.error('Error saving chatbot question:', error);
            Swal.fire('Error', 'Failed to save question', 'error');
        }
    };

    const handleEdit = (q) => {
        setFormData({
            question: q.question,
            category: q.category || '',
            is_active: q.is_active
        });
        setIsEditing(q.id);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id) => {
        const result = await Swal.fire({
            title: 'Delete Question?',
            text: "This action cannot be undone.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Yes, delete it!'
        });

        if (result.isConfirmed) {
            try {
                await db.deleteChatbotQuestion(id);
                loadQuestions();
                Swal.fire('Deleted!', 'Question has been removed.', 'success');
            } catch (error) {
                console.error('Error deleting chatbot question:', error);
                Swal.fire('Error', 'Failed to delete question', 'error');
            }
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const fileType = file.name.split('.').pop().toLowerCase();
        setIsImporting(true);

        try {
            let importedQuestions = [];

            if (fileType === 'pdf') {
                const text = await extractTextFromPDF(file);
                importedQuestions = text.split(/\n|\?/).map(line => line.trim()).filter(line => line.length > 5);
            } else if (fileType === 'docx') {
                const text = await extractTextFromDocx(file);
                importedQuestions = text.split(/\n|\?/).map(line => line.trim()).filter(line => line.length > 5);
            } else if (fileType === 'csv') {
                importedQuestions = await parseCSV(file);
            } else {
                throw new Error('Unsupported file type. Please use PDF, DOCX, or CSV.');
            }

            if (importedQuestions.length === 0) {
                throw new Error('No valid questions found in the document.');
            }

            const confirmResult = await Swal.fire({
                title: 'Confirm Bulk Import',
                text: `Found ${importedQuestions.length} potential questions. Import them now?`,
                icon: 'question',
                showCancelButton: true,
                confirmButtonColor: '#3b82f6',
                confirmButtonText: 'Yes, import all'
            });

            if (confirmResult.isConfirmed) {
                const results = await Promise.allSettled(
                    importedQuestions.map(q => db.addChatbotQuestion({
                        question: q + (q.endsWith('?') ? '' : '?'),
                        category: 'Imported',
                        is_active: true
                    }))
                );

                const successCount = results.filter(r => r.status === 'fulfilled').length;
                Swal.fire('Import Complete', `Successfully imported ${successCount} questions.`, 'success');
                loadQuestions();
            }
        } catch (error) {
            console.error('Import error:', error);
            Swal.fire('Import Failed', error.message, 'error');
        } finally {
            setIsImporting(false);
            e.target.value = ''; // Reset input
        }
    };

    const extractTextFromPDF = async (file) => {
        const reader = new FileReader();
        return new Promise((resolve, reject) => {
            reader.onload = async () => {
                try {
                    const typedarray = new Uint8Array(reader.result);
                    const pdf = await pdfjs.getDocument(typedarray).promise;
                    let text = '';
                    for (let i = 1; i <= pdf.numPages; i++) {
                        const page = await pdf.getPage(i);
                        const content = await page.getTextContent();
                        text += content.items.map(item => item.str).join(' ') + '\n';
                    }
                    resolve(text);
                } catch (err) {
                    reject(err);
                }
            };
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    };

    const extractTextFromDocx = async (file) => {
        const reader = new FileReader();
        return new Promise((resolve, reject) => {
            reader.onload = async () => {
                try {
                    const result = await mammoth.extractRawText({ arrayBuffer: reader.result });
                    resolve(result.value);
                } catch (err) {
                    reject(err);
                }
            };
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    };

    const parseCSV = async (file) => {
        return new Promise((resolve, reject) => {
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    // Try to find a 'question' column, otherwise take the first column of each row
                    const extracted = results.data.map(row => {
                        if (row.question) return row.question.trim();
                        if (row.Question) return row.Question.trim();
                        // If no named column, take the first value
                        const values = Object.values(row);
                        return values[0] ? values[0].toString().trim() : null;
                    }).filter(q => q && q.length > 5);
                    resolve(extracted);
                },
                error: (error) => reject(error)
            });
        });
    };

    const filteredQuestions = questions.filter(q => {
        const matchesSearch = q.question.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = filterCategory === 'All' || q.category === filterCategory;
        return matchesSearch && matchesCategory;
    });

    // Reset pagination on filter change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, filterCategory]);

    // Pagination logic
    const totalPages = Math.ceil(filteredQuestions.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedQuestions = filteredQuestions.slice(startIndex, startIndex + itemsPerPage);

    return (
        <div className="management-container fade-in">
            <div className="management-header">
                <h2 className="management-title">Question List Panel</h2>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <div className="import-wrapper">
                        <label className="btn-secondary" style={{
                            padding: '0.625rem 1.25rem',
                            background: '#f8fafc',
                            border: '1px dashed #cbd5e1',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            fontWeight: '600',
                            color: '#475569',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            transition: 'all 0.2s'
                        }}>
                            <span>{isImporting ? '⌛' : '📥'}</span>
                            {isImporting ? 'Importing...' : 'Bulk Import (PDF/DOCX/CSV)'}
                            <input
                                type="file"
                                accept=".pdf,.docx,.csv"
                                style={{ display: 'none' }}
                                onChange={handleFileUpload}
                                disabled={isImporting}
                            />
                        </label>
                    </div>
                </div>
            </div>

            <div className="vertical-layout">
                {/* Form Card */}
                <div className="content-card form-card-wide">
                    <div className="card-header-compact">
                        <div className="header-info">
                            <h3>{isEditing ? 'Edit Question' : 'Add New Question'}</h3>
                            <p className="card-subtitle">Enter a question that users might ask</p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className="form-row">
                            <div className="form-group form-row-full">
                                <label>Question Text <span className="required-star">*</span></label>
                                <input
                                    type="text"
                                    className={`form-input ${errors.question ? 'error-border' : ''}`}
                                    placeholder="Enter the question..."
                                    value={formData.question}
                                    onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                                />
                                {errors.question && <span className="error-text">{errors.question}</span>}
                            </div>
                        </div>

                        <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                            <div className="form-group">
                                <label>Category</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="e.g. Billing, Surgery, General"
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                />
                            </div>
                            <div className="form-group" style={{ display: 'flex', alignItems: 'center', marginTop: '1.5rem' }}>
                                <label className="checkbox-container" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={formData.is_active}
                                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                        style={{ width: '18px', height: '18px' }}
                                    />
                                    <span style={{ fontWeight: '600', color: '#1e293b' }}>Active</span>
                                </label>
                            </div>
                        </div>

                        <div className="form-submit-row">
                            <button type="submit" className="btn-save" style={{ minWidth: '160px' }}>
                                {isEditing ? 'Update Question' : 'Save Question'}
                            </button>
                            {isEditing && (
                                <button
                                    type="button"
                                    className="btn-cancel"
                                    onClick={() => {
                                        setIsEditing(null);
                                        setFormData({ question: '', category: '', is_active: true });
                                    }}
                                >
                                    Cancel
                                </button>
                            )}
                        </div>
                    </form>
                </div>

                {/* List Card */}
                <div className="content-card full-width">
                    <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                        <div>
                            <h3>Question List</h3>
                            <p className="card-subtitle">{filteredQuestions.length} questions registered</p>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                            <div className="search-wrapper" style={{ position: 'relative' }}>
                                <input
                                    type="text"
                                    placeholder="Search questions..."
                                    className="form-input"
                                    style={{ paddingLeft: '2.5rem', width: '250px' }}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>🔍</span>
                            </div>
                            <select
                                className="form-input"
                                style={{ width: 'auto' }}
                                value={filterCategory}
                                onChange={(e) => setFilterCategory(e.target.value)}
                            >
                                {categories.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th style={{ width: '60%' }}>Question</th>
                                    <th>Category</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan="4" style={{ textAlign: 'center', padding: '2rem' }}>Loading questions...</td></tr>
                                ) : paginatedQuestions.length === 0 ? (
                                    <tr><td colSpan="4" style={{ textAlign: 'center', padding: '2rem' }}>No questions found.</td></tr>
                                ) : (
                                    paginatedQuestions.map(q => (
                                        <tr key={q.id}>
                                            <td style={{ fontWeight: '600' }}>{q.question}</td>
                                            <td>
                                                <span className="category-tag" style={{ background: '#f1f5f9', color: '#475569', padding: '0.25rem 0.75rem', borderRadius: '6px', fontSize: '0.8rem' }}>
                                                    {q.category || 'General'}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`status-badge ${q.is_active ? 'status-completed' : 'status-pending'}`}>
                                                    {q.is_active ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="actions-cell">
                                                    <button className="btn-icon btn-edit" onClick={() => handleEdit(q)} title="Edit">
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                                        </svg>
                                                    </button>
                                                    <button className="btn-icon btn-delete" onClick={() => handleDelete(q.id)} title="Delete">
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
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="pagination-wrapper" style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginTop: '1.5rem',
                            padding: '1rem',
                            borderTop: '1px solid #f1f5f9'
                        }}>
                            <div className="pagination-info" style={{ color: '#64748b', fontSize: '0.875rem' }}>
                                Showing <span style={{ fontWeight: '600' }}>{startIndex + 1}</span> to <span style={{ fontWeight: '600' }}>{Math.min(startIndex + itemsPerPage, filteredQuestions.length)}</span> of <span style={{ fontWeight: '600' }}>{filteredQuestions.length}</span> results
                            </div>
                            <div className="pagination-buttons" style={{ display: 'flex', gap: '0.5rem' }}>
                                <button
                                    className="btn-pagination"
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                    style={{
                                        padding: '0.5rem 1rem',
                                        background: currentPage === 1 ? '#f1f5f9' : '#fff',
                                        color: currentPage === 1 ? '#94a3b8' : '#475569',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '8px',
                                        cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                                        fontSize: '0.875rem',
                                        fontWeight: '500',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    Previous
                                </button>
                                <div style={{ display: 'flex', gap: '0.25rem' }}>
                                    {[...Array(totalPages)].map((_, i) => {
                                        const pageNum = i + 1;
                                        // Show first, last, and pages around current
                                        if (
                                            pageNum === 1 ||
                                            pageNum === totalPages ||
                                            (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                                        ) {
                                            return (
                                                <button
                                                    key={pageNum}
                                                    onClick={() => setCurrentPage(pageNum)}
                                                    style={{
                                                        padding: '0.5rem 0.875rem',
                                                        background: currentPage === pageNum ? '#3b82f6' : '#fff',
                                                        color: currentPage === pageNum ? '#fff' : '#475569',
                                                        border: '1px solid',
                                                        borderColor: currentPage === pageNum ? '#3b82f6' : '#e2e8f0',
                                                        borderRadius: '8px',
                                                        cursor: 'pointer',
                                                        fontSize: '0.875rem',
                                                        fontWeight: '600',
                                                        minWidth: '40px'
                                                    }}
                                                >
                                                    {pageNum}
                                                </button>
                                            );
                                        } else if (
                                            (pageNum === currentPage - 2 && pageNum > 1) ||
                                            (pageNum === currentPage + 2 && pageNum < totalPages)
                                        ) {
                                            return <span key={pageNum} style={{ padding: '0.5rem', color: '#94a3b8' }}>...</span>;
                                        }
                                        return null;
                                    })}
                                </div>
                                <button
                                    className="btn-pagination"
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage === totalPages}
                                    style={{
                                        padding: '0.5rem 1rem',
                                        background: currentPage === totalPages ? '#f1f5f9' : '#fff',
                                        color: currentPage === totalPages ? '#94a3b8' : '#475569',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '8px',
                                        cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                                        fontSize: '0.875rem',
                                        fontWeight: '500',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default InstructionPanel;
