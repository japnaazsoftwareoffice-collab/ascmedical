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
    const [selectedCell, setSelectedCell] = useState(null); // {date, room, data?}
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

    const getCellData = (dateStr, room) =>
        schedule.find(item => item.date === dateStr && item.room_name === room);

    // ----- UI Handlers -----------------------------------------------------
    const handleCellClick = (dateStr, room) => {
        const existing = getCellData(dateStr, room);
        setSelectedCell({ date: dateStr, room, data: existing });
        setFormData({
            provider_name: existing?.provider_name || '',
            start_time: toInputTime(existing?.start_time),
            end_time: toInputTime(existing?.end_time)
        });
        setSelectedDate(dateStr);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedCell(null);
        setSelectedDate('');
    };

    const handleChange = e => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleDateChange = e => {
        const val = e.target.value; // YYYY‑MM‑DD
        setSelectedDate(val);
        if (selectedCell) {
            setSelectedCell({ ...selectedCell, date: val });
        }
    };

    const handleSave = async e => {
        e.preventDefault();
        if (!selectedCell) return;
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const isMock = !supabaseUrl || supabaseUrl === 'https://placeholder.supabase.co';
        const dateObj = new Date(selectedDate || selectedCell.date);
        // Adjust for timezone if needed, but assuming local date string YYYY-MM-DD is sufficient
        // We need to ensure we get the correct day of week from the string
        const [y, m, d] = (selectedDate || selectedCell.date).split('-').map(Number);
        const localDate = new Date(y, m - 1, d); // Create date object from parts to avoid timezone shifts

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
            if (selectedCell.data) {
                // Update existing block
                if (isMock) {
                    setSchedule(prev =>
                        prev.map(item => (item.id === selectedCell.data.id ? { ...item, ...payload } : item))
                    );
                } else {
                    await db.updateORBlockSchedule(selectedCell.data.id, payload);
                    await loadSchedule(); // Reload from database
                }
                await Swal.fire({ title: 'Updated!', icon: 'success', timer: 1500, showConfirmButton: false });
            } else {
                // Create new block
                if (isMock) {
                    setSchedule(prev => [...prev, { ...payload, id: Date.now() }]);
                } else {
                    await db.addORBlockSchedule(payload);
                    await loadSchedule(); // Reload from database
                }
                await Swal.fire({ title: 'Added!', icon: 'success', timer: 1500, showConfirmButton: false });
            }
            handleCloseModal();
        } catch (err) {
            console.error('Error saving block:', err);
            Swal.fire({
                title: 'Error!',
                text: 'Could not save block.',
                icon: 'error',
                confirmButtonColor: '#3b82f6'
            });
        }
    };

    const handleDelete = async () => {
        if (!selectedCell?.data) return;
        const confirm = await Swal.fire({
            title: 'Clear Block?',
            text: 'Are you sure?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Yes, clear it!'
        });
        if (!confirm.isConfirmed) return;
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const isMock = !supabaseUrl || supabaseUrl === 'https://placeholder.supabase.co';
        try {
            if (isMock) {
                setSchedule(prev => prev.filter(item => item.id !== selectedCell.data.id));
            } else {
                await db.deleteORBlockSchedule(selectedCell.data.id);
                await loadSchedule(); // Reload from database
            }
            await Swal.fire({ title: 'Cleared!', icon: 'success', timer: 1500, showConfirmButton: false });
            handleCloseModal();
        } catch (err) {
            console.error(err);
            Swal.fire({ title: 'Error!', icon: 'error', text: 'Could not delete block.' });
        }
    };

    const prevMonth = () => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    const nextMonth = () => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));

    // ----- Render ----------------------------------------------------------
    return (
        <div className={`or-schedule-container fade-in ${embedded ? 'embedded' : ''}`}>
            <div className="or-schedule-header">
                <h2 className="or-schedule-title">OR Block Schedule</h2>
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
                        // Find all dates in the current month that match this day name
                        const datesForDay = monthDays.filter(day => {
                            const dateObj = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
                            return getDayName(dateObj) === dayName;
                        });

                        if (datesForDay.length === 0) return null;

                        return (
                            <React.Fragment key={dayName}>
                                {/* Group Header */}
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
                                                const data = getCellData(dateStr, room);
                                                return (
                                                    <div
                                                        key={room}
                                                        className={`grid-cell ${data ? 'has-data' : ''}`}
                                                        onClick={() => handleCellClick(dateStr, room)}
                                                    >
                                                        {data ? (
                                                            <>
                                                                <div className="cell-provider">{data.provider_name}</div>
                                                                <div className="cell-time">{data.start_time}-{data.end_time}</div>
                                                            </>
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
                        <form onSubmit={handleSave}>
                            <div className="form-group">
                                <label>Date</label>
                                <input
                                    type="date"
                                    name="date"
                                    value={selectedDate}
                                    onChange={handleDateChange}
                                    className="form-input"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Provider / Surgeon</label>
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
                                </select>
                            </div>
                            <div className="form-row">
                                <div className="form-group" style={{ flex: 1 }}>
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
                                <div className="form-group" style={{ flex: 1 }}>
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
                                {selectedCell?.data && (
                                    <button type="button" className="btn-delete" onClick={handleDelete}>Clear Block</button>
                                )}
                                <button type="button" className="btn-cancel" onClick={handleCloseModal}>Cancel</button>
                                <button type="submit" className="btn-save">Save Block</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ORBlockSchedule;
