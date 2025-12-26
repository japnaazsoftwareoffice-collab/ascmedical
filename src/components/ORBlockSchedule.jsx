import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { db } from '../lib/supabase';
import './ORBlockSchedule.css';

// Rooms displayed in the grid
const ROOMS = ['OR 1', 'OR 2', 'OR 3', 'OR 4', 'Procedure Room'];

/** Helper: format a Date object as YYYY‑MM‑DD */
const formatDate = date => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

/** Helper: get day name (Monday‑Friday) */
const getDayName = date =>
    ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][date.getDay()];

/** Helper: Convert HHMM to HH:MM for input */
const toInputTime = (str) => {
    if (!str) return '';
    if (str.includes(':')) return str;
    if (str.length === 4) return `${str.slice(0, 2)}:${str.slice(2)}`;
    return str;
};

/** Helper: Convert HH:MM to HHMM for storage */
const toStorageTime = (str) => {
    if (!str) return '';
    return str.replace(':', '');
};

/** Helper: Calculate duration in minutes between two HHMM times */
const calcDuration = (start, end) => {
    if (!start || !end) return 0;
    const sH = parseInt(start.substring(0, 2));
    const sM = parseInt(start.substring(2, 4));
    const eH = parseInt(end.substring(0, 2));
    const eM = parseInt(end.substring(2, 4));
    return (eH * 60 + eM) - (sH * 60 + sM);
};

/** Helper: Get week of month (First, Second, etc.) */
const getWeekOfMonth = (date) => {
    const day = date.getDate();
    const week = Math.ceil(day / 7);
    const map = { 1: 'First', 2: 'Second', 3: 'Third', 4: 'Fourth', 5: 'Fifth' };
    return map[week] || 'First';
};

const ORBlockSchedule = ({ surgeons = [], embedded = false }) => {
    // ----- State -----------------------------------------------------------
    const [schedule, setSchedule] = useState([]); // [{id, date, room_name, provider_name, start_time, end_time}]
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // selectedCell identifies the context (Date + Room)
    const [selectedCell, setSelectedCell] = useState(null); // {date, room, blocks: []}

    // editingBlock identifies the specific block being added/edited within that cell
    const [editingBlock, setEditingBlock] = useState(null); // null = list view, {} = add mode, {id...} = edit mode

    const [formData, setFormData] = useState({ provider_name: '', start_time: '', end_time: '' });
    const [selectedDate, setSelectedDate] = useState(''); // YYYY‑MM‑DD for modal date picker
    const [currentMonth, setCurrentMonth] = useState(new Date()); // month shown in the grid

    // ----- Load schedule ----------------------------------------------------
    useEffect(() => {
        loadSchedule();
    }, []);

    const loadSchedule = async () => {
        try {
            setLoading(true);
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            const isMock = !supabaseUrl || supabaseUrl === 'https://placeholder.supabase.co';
            if (isMock) {
                // Mock data spread across the current month
                const today = new Date();
                const y = today.getFullYear();
                const m = String(today.getMonth() + 1).padStart(2, '0');
                const mock = [
                    { id: 1, date: `${y}-${m}-01`, room_name: 'OR 1', provider_name: 'Burmiester', start_time: '1200', end_time: '1600' },
                    { id: 2, date: `${y}-${m}-01`, room_name: 'OR 2', provider_name: 'Prysi', start_time: '0730', end_time: '1300' },
                    { id: 3, date: `${y}-${m}-02`, room_name: 'OR 1', provider_name: 'McGee', start_time: '0730', end_time: '1600' },
                    { id: 4, date: `${y}-${m}-02`, room_name: 'OR 2', provider_name: 'Naples Plastic', start_time: '0730', end_time: '1600' }
                ];
                setSchedule(mock);
                setLoading(false);
                return;
            }
            const data = await db.getORBlockSchedule();
            setSchedule(data);
        } catch (err) {
            console.error('Failed to load schedule', err);
        } finally {
            setLoading(false);
        }
    };

    // ----- Helpers --------------------------------------------------------
    const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
    const monthDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    // Returns ARRAY of blocks for a cell, sorted by start_time
    const getCellBlocks = (dateStr, room) => {
        return schedule
            .filter(item => item.date === dateStr && item.room_name === room)
            .sort((a, b) => a.start_time.localeCompare(b.start_time));
    };

    // ----- UI Handlers -----------------------------------------------------
    const handleCellClick = (dateStr, room) => {
        const blocks = getCellBlocks(dateStr, room);
        setSelectedCell({ date: dateStr, room, blocks });
        setSelectedDate(dateStr);
        setEditingBlock(null); // Mode: List View
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedCell(null);
        setEditingBlock(null);
        setSelectedDate('');
        setFormData({ provider_name: '', start_time: '', end_time: '' });
    };

    const handleAddNewBlock = () => {
        setEditingBlock({}); // Empty object = New Block Mode
        setFormData({ provider_name: '', start_time: '', end_time: '' });
    };

    const handleEditBlock = (block) => {
        setEditingBlock(block); // Existing object = Edit Mode
        setFormData({
            provider_name: block.provider_name || '',
            start_time: toInputTime(block.start_time),
            end_time: toInputTime(block.end_time)
        });
    };

    const handleChange = e => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSave = async e => {
        e.preventDefault();
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const isMock = !supabaseUrl || supabaseUrl === 'https://placeholder.supabase.co';

        // Parse date to correctly identify Day of Week
        const [y, m, d] = (selectedDate || selectedCell.date).split('-').map(Number);
        const localDate = new Date(y, m - 1, d);

        const payload = {
            date: selectedDate || selectedCell.date,
            room_name: selectedCell.room,
            day_of_week: getDayName(localDate),
            week_of_month: getWeekOfMonth(localDate),
            provider_name: formData.provider_name,
            start_time: toStorageTime(formData.start_time),
            end_time: toStorageTime(formData.end_time)
        };

        try {
            if (editingBlock && editingBlock.id) {
                // Update existing
                if (isMock) {
                    setSchedule(prev => prev.map(item => (item.id === editingBlock.id ? { ...item, ...payload } : item)));
                } else {
                    await db.updateORBlockSchedule(editingBlock.id, payload);
                    await loadSchedule();
                }
                await Swal.fire({ title: 'Updated!', icon: 'success', timer: 1000, showConfirmButton: false });
            } else {
                // Create new
                if (isMock) {
                    setSchedule(prev => [...prev, { ...payload, id: Date.now() }]);
                } else {
                    await db.addORBlockSchedule(payload);
                    await loadSchedule();
                }
                await Swal.fire({ title: 'Added!', icon: 'success', timer: 1000, showConfirmButton: false });
            }
            // Return to list view
            // We need to fetch updated blocks (but state is updated by loadSchedule)
            // We clear editingBlock to show the list view again
            setEditingBlock(null);
            // In a real scenario we might need to properly re-select the cell to see updates if we depended on selectedCell.blocks state
            // But getCellBlocks reads from `schedule`, which is updated.
        } catch (err) {
            console.error('Error saving block:', err);
            Swal.fire({ title: 'Error!', text: 'Could not save block.', icon: 'error' });
        }
    };

    const handleDelete = async (id) => {
        const confirm = await Swal.fire({
            title: 'Remove Block?',
            text: 'This cannot be undone.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            confirmButtonText: 'Yes, remove it!'
        });
        if (!confirm.isConfirmed) return;

        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const isMock = !supabaseUrl || supabaseUrl === 'https://placeholder.supabase.co';

        try {
            if (isMock) {
                setSchedule(prev => prev.filter(item => item.id !== id));
            } else {
                await db.deleteORBlockSchedule(id);
                await loadSchedule();
            }
            // If deleting from list view, we just stay there
            await Swal.fire({ title: 'Removed!', icon: 'success', timer: 1000, showConfirmButton: false });
        } catch (err) {
            console.error(err);
            Swal.fire({ title: 'Error!', icon: 'error', text: 'Could not delete block.' });
        }
    };

    const prevMonth = () => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    const nextMonth = () => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));

    /** Render the Gap Indicator between two blocks */
    const renderGap = (prevBlock, currentBlock) => {
        if (!prevBlock) return null;
        const gapMins = calcDuration(prevBlock.end_time, currentBlock.start_time);

        // 0 or negative gap means overlap or touching
        if (gapMins <= 0) return null;

        let gapClass = 'gap-green';
        if (gapMins > 30) gapClass = 'gap-yellow';
        if (gapMins > 60) gapClass = 'gap-red';

        return (
            <div className={`gap-indicator ${gapClass}`} title={`${gapMins} min turnover`}>
                {gapMins}m Gap
            </div>
        );
    };

    // ----- Calculate Monthly Metrics -----
    const totalBlocks = schedule.filter(s => {
        const d = new Date(s.date);
        return d.getMonth() === currentMonth.getMonth() && d.getFullYear() === currentMonth.getFullYear();
    }).length;

    // ----- Render ----------------------------------------------------------
    return (
        <div className={`or-schedule-container fade-in ${embedded ? 'embedded' : ''}`}>
            <div className="or-schedule-header">
                <div>
                    <h2 className="or-schedule-title">OR Block Schedule</h2>
                    <div className="header-metrics">
                        <span className="metric-badge">Total Blocks: {totalBlocks}</span>
                        {/* Future: Add Utilization % here */}
                    </div>
                </div>
                <div className="month-nav">
                    <button className="btn-nav" onClick={prevMonth}>←</button>
                    <span className="month-label">
                        {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </span>
                    <button className="btn-nav" onClick={nextMonth}>→</button>
                </div>
            </div>

            <div className="schedule-grid-wrapper">
                <div className="schedule-grid">
                    {/* Header */}
                    <div className="grid-header-row">
                        <div className="grid-header-cell">Date</div>
                        {ROOMS.map(room => (
                            <div key={room} className="grid-header-cell">{room}</div>
                        ))}
                    </div>

                    {/* Body rows – Grouped by Day of Week */}
                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(dayName => {
                        const datesForDay = monthDays.filter(day => {
                            const dateObj = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
                            return getDayName(dateObj) === dayName;
                        });

                        if (datesForDay.length === 0) return null;

                        return (
                            <React.Fragment key={dayName}>
                                <div className="grid-group-header">
                                    {dayName}s
                                </div>
                                {datesForDay.map(day => {
                                    const dateObj = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
                                    const dateStr = formatDate(dateObj);
                                    return (
                                        <div key={day} className="grid-row">
                                            <div className="row-label">
                                                {day} {dayName}
                                                <span className="week-label">{getWeekOfMonth(dateObj)} Week</span>
                                            </div>
                                            {ROOMS.map(room => {
                                                const blocks = getCellBlocks(dateStr, room);
                                                return (
                                                    <div
                                                        key={room}
                                                        className={`grid-cell ${blocks.length > 0 ? 'has-data' : ''}`}
                                                        onClick={() => handleCellClick(dateStr, room)}
                                                    >
                                                        {blocks.length > 0 ? (
                                                            <div className="block-list">
                                                                {blocks.map((block, idx) => (
                                                                    <React.Fragment key={block.id}>
                                                                        {idx > 0 && renderGap(blocks[idx - 1], block)}
                                                                        <div className="block-item">
                                                                            <div className="cell-provider">{block.provider_name}</div>
                                                                            <div className="cell-time">{block.start_time}-{block.end_time}</div>
                                                                        </div>
                                                                    </React.Fragment>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <div className="empty-cell-placeholder">+ Add</div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                })}
                            </React.Fragment>
                        );
                    })}
                </div>
            </div>

            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3>{selectedCell?.date} - {selectedCell?.room}</h3>
                            <button className="btn-close" onClick={handleCloseModal}>×</button>
                        </div>

                        {/* VIEW MODE: LIST BLOCKS */}
                        {!editingBlock && (
                            <>
                                <div className="modal-block-list">
                                    {getCellBlocks(selectedCell.date, selectedCell.room).length === 0 ? (
                                        <p style={{ textAlign: 'center', color: '#94a3b8' }}>No blocks scheduled.</p>
                                    ) : (
                                        getCellBlocks(selectedCell.date, selectedCell.room).map(block => (
                                            <div key={block.id} className="modal-block-item">
                                                <div className="modal-block-info">
                                                    <h4>{block.provider_name}</h4>
                                                    <p>{toInputTime(block.start_time)} - {toInputTime(block.end_time)}</p>
                                                </div>
                                                <div className="modal-block-actions">
                                                    <button
                                                        className="btn-icon edit"
                                                        onClick={() => handleEditBlock(block)}
                                                        title="Edit"
                                                    >
                                                        ✎
                                                    </button>
                                                    <button
                                                        className="btn-icon delete"
                                                        onClick={() => handleDelete(block.id)}
                                                        title="Delete"
                                                    >
                                                        🗑
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                                <button className="btn-add-block" onClick={handleAddNewBlock}>
                                    + Add Surgeon Block
                                </button>
                                <div className="modal-actions">
                                    <button className="btn-cancel" onClick={handleCloseModal}>Close</button>
                                </div>
                            </>
                        )}

                        {/* EDIT/ADD MODE: FORM */}
                        {editingBlock && (
                            <form onSubmit={handleSave}>
                                <div className="form-group">
                                    <label>Surgeon / Provider</label>
                                    <select
                                        name="provider_name"
                                        value={formData.provider_name}
                                        onChange={handleChange}
                                        className="form-input"
                                        required
                                    >
                                        <option value="">Select Surgeon</option>
                                        {surgeons.map(surgeon => (
                                            <option key={surgeon.id} value={surgeon.name}>
                                                {surgeon.name} {surgeon.specialty ? `- ${surgeon.specialty}` : ''}
                                            </option>
                                        ))}
                                        {/* Allow custom entry if not in list */}
                                        <option value="Opthalmology Group">Opthalmology Group</option>
                                        <option value="Pain Management">Pain Management</option>
                                    </select>
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Start Time</label>
                                        <input
                                            type="time"
                                            name="start_time"
                                            value={formData.start_time}
                                            onChange={handleChange}
                                            className="form-input"
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>End Time</label>
                                        <input
                                            type="time"
                                            name="end_time"
                                            value={formData.end_time}
                                            onChange={handleChange}
                                            className="form-input"
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="modal-actions">
                                    <button type="button" className="btn-cancel" onClick={() => setEditingBlock(null)}>
                                        Back
                                    </button>
                                    <button type="submit" className="btn-save">
                                        {editingBlock.id ? 'Save Changes' : 'Add Block'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ORBlockSchedule;
