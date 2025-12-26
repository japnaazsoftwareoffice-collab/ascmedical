import React, { useState } from 'react';
import './SurgerySchedule.css';

const SurgerySchedule = ({ surgeries = [] }) => {
    const [currentDate, setCurrentDate] = useState(new Date());

    // Helper: get the start of the week (Monday) from a date
    const getStartOfWeek = (date) => {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
        return new Date(d.setDate(diff));
    };

    const startOfWeek = getStartOfWeek(currentDate);

    // Generate array of 5 days (Mon-Fri)
    const weekDays = Array.from({ length: 5 }, (_, i) => {
        const d = new Date(startOfWeek);
        d.setDate(startOfWeek.getDate() + i);
        return d;
    });

    // Navigation
    const nextWeek = () => {
        const next = new Date(currentDate);
        next.setDate(currentDate.getDate() + 7);
        setCurrentDate(next);
    };

    const prevWeek = () => {
        const prev = new Date(currentDate);
        prev.setDate(currentDate.getDate() - 7);
        setCurrentDate(prev);
    };

    // Format helpers
    const formatDate = (d) => d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    const formatTime = (t) => {
        if (!t) return 'TBD';
        // Handle HH:MM or HHMM
        if (t.includes(':')) return t;
        if (t.length === 4) return `${t.slice(0, 2)}:${t.slice(2)}`;
        return t;
    };

    // Filter surgeries for a specific date
    const getSurgeriesForDate = (date) => {
        const dateStr = date.toISOString().split('T')[0];
        return surgeries.filter(s => s.date === dateStr).sort((a, b) => {
            const timeA = a.start_time || '00:00';
            const timeB = b.start_time || '00:00';
            return timeA.localeCompare(timeB);
        });
    };

    // Colors for different surgeons
    const COLORS = [
        { border: '#3b82f6', bg: '#eff6ff' }, // Blue
        { border: '#10b981', bg: '#ecfdf5' }, // Emerald
        { border: '#8b5cf6', bg: '#f5f3ff' }, // Violet
        { border: '#f59e0b', bg: '#fffbeb' }, // Amber
        { border: '#f43f5e', bg: '#fff1f2' }, // Rose
        { border: '#06b6d4', bg: '#ecfeff' }, // Cyan
        { border: '#f97316', bg: '#fff7ed' }, // Orange
        { border: '#6366f1', bg: '#eef2ff' }, // Indigo
        { border: '#ec4899', bg: '#fdf2f8' }, // Pink
        { border: '#14b8a6', bg: '#f0fdfa' }, // Teal
    ];

    const getSurgeonColor = (name) => {
        if (!name) return COLORS[0];
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        const index = Math.abs(hash) % COLORS.length;
        return COLORS[index];
    };

    return (
        <div className="surgery-schedule-container fade-in">
            <div className="schedule-header">
                <h2>Weekly Surgery Schedule</h2>
                <div className="week-nav">
                    <button className="btn-nav" onClick={prevWeek}>← Prev Week</button>
                    <span className="current-week-label">
                        Week of {startOfWeek.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </span>
                    <button className="btn-nav" onClick={nextWeek}>Next Week →</button>
                </div>
            </div>

            <div className="weekly-grid">
                {weekDays.map(day => (
                    <div key={day.toISOString()} className="day-column">
                        <div className="day-header">
                            <span className="day-name">{day.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                            <span className="day-date">{day.getDate()}</span>
                        </div>
                        <div className="day-cards">
                            {getSurgeriesForDate(day).map(surgery => {
                                const surgeonName = surgery.doctor_name || (surgery.surgeons ? surgery.surgeons.name : 'Unknown');
                                const colorStyle = getSurgeonColor(surgeonName);
                                return (
                                    <div
                                        key={surgery.id}
                                        className="surgery-card"
                                        style={{
                                            borderLeft: `4px solid ${colorStyle.border}`,
                                            backgroundColor: colorStyle.bg
                                        }}
                                    >
                                        <div className="card-time">{formatTime(surgery.start_time)}</div>
                                        <div className="card-patient">
                                            {(() => {
                                                const p = surgery.patients;
                                                if (!p) return 'Unknown Patient';
                                                const name = p.name ||
                                                    `${p.first_name || p.firstname || ''} ${p.last_name || p.lastname || ''}`.trim();
                                                return name || 'Unknown Patient';
                                            })()}
                                        </div>
                                        <div className="card-surgeon">
                                            DR. {surgeonName}
                                        </div>
                                        <div className="card-procedure">
                                            {surgery.notes || 'No notes'}
                                        </div>
                                        <div className={`card-status status-${surgery.status}`}>
                                            {surgery.status}
                                        </div>
                                    </div>
                                );
                            })}
                            {getSurgeriesForDate(day).length === 0 && (
                                <div className="no-surgeries">
                                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>☕</div>
                                    No surgeries
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SurgerySchedule;
