import React, { useMemo, useState } from 'react';
import {
    formatCurrency,
    getSurgeryMetrics,
    formatDateLocal,
    isDateInRange
} from '../utils/hospitalUtils';
import {
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import './SurgeonDashboard.css';

const SurgeonDashboard = ({ user, surgeries, cptCodes, settings, procedureGroupItems = [] }) => {
    const [viewType, setViewType] = useState('month');
    const [selectedDate, setSelectedDate] = useState(formatDateLocal(new Date()));
    const [includeLaborSupplies, setIncludeLaborSupplies] = useState(false);

    // 1. Surgeon name
    const surgeonName = useMemo(() => user.full_name || user.name || 'Unknown Surgeon', [user]);

    // 2. Compute date range from viewType + selectedDate
    const dateRange = useMemo(() => {
        const base = selectedDate.length === 7
            ? selectedDate + '-01'
            : selectedDate.length === 4
                ? selectedDate + '-01-01'
                : selectedDate;
        const d = new Date(base + 'T00:00:00');
        if (viewType === 'day') {
            return { start: formatDateLocal(d), end: formatDateLocal(d) };
        } else if (viewType === 'week') {
            const day = d.getDay();
            const mon = new Date(d); mon.setDate(d.getDate() - ((day + 6) % 7));
            const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
            return { start: formatDateLocal(mon), end: formatDateLocal(sun) };
        } else if (viewType === 'month') {
            const start = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
            const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
            const end = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
            return { start, end };
        } else {
            const year = selectedDate.substring(0, 4);
            return { start: `${year}-01-01`, end: `${year}-12-31` };
        }
    }, [selectedDate, viewType]);

    // 3. Filter this surgeon's surgeries within the date range
    const mySurgeries = useMemo(() =>
        surgeries.filter(s =>
            (s.doctor_name === surgeonName || s.surgeon_id === user.surgeon_id) &&
            isDateInRange(s.date, dateRange.start, dateRange.end)
        ),
        [surgeries, surgeonName, user.surgeon_id, dateRange]
    );

    // 4. Stats
    const stats = useMemo(() => {
        const completed = mySurgeries.filter(s => s.status === 'completed');
        const scheduled = mySurgeries.filter(s => s.status === 'scheduled');
        const cancelled = mySurgeries.filter(s => s.status === 'cancelled');
        const rescheduled = mySurgeries.filter(s => s.status === 'rescheduled');
        let totalRevenue = 0, totalCost = 0, totalMinutes = 0;

        completed.forEach(s => {
            const m = getSurgeryMetrics(s, cptCodes, settings, procedureGroupItems);
            const rev = includeLaborSupplies ? m.totalRevenue : m.totalRevenue - m.supplyCosts;
            const cost = includeLaborSupplies ? (m.internalRoomCost + m.laborCost + m.supplyCosts) : m.internalRoomCost;
            totalRevenue += rev;
            totalCost += cost;
            totalMinutes += (s.actual_duration_minutes || s.duration_minutes || 0);
        });

        return {
            total: mySurgeries.length,
            completedCount: completed.length,
            scheduledCount: scheduled.length,
            cancelledCount: cancelled.length,
            rescheduledCount: rescheduled.length,
            revenue: totalRevenue,
            profit: totalRevenue - totalCost,
            avgRevenuePerCase: completed.length > 0 ? totalRevenue / completed.length : 0,
            totalMinutes
        };
    }, [mySurgeries, cptCodes, settings, procedureGroupItems, includeLaborSupplies]);

    // 5. Chart data
    const chartData = useMemo(() => {
        const grouped = {};
        mySurgeries.filter(s => s.status === 'completed').forEach(s => {
            const date = new Date(s.date + 'T00:00:00');
            const key = viewType === 'year'
                ? date.toLocaleString('default', { month: 'short' })
                : viewType === 'month'
                    ? date.toLocaleString('default', { month: 'short', day: 'numeric' })
                    : s.date;
            if (!grouped[key]) grouped[key] = { name: key, revenue: 0, profit: 0, cases: 0 };
            const m = getSurgeryMetrics(s, cptCodes, settings, procedureGroupItems);
            grouped[key].revenue += m.totalRevenue;
            grouped[key].profit += m.netProfit;
            grouped[key].cases += 1;
        });
        return Object.values(grouped);
    }, [mySurgeries, viewType, cptCodes, settings, procedureGroupItems]);

    // 6. Status pie
    const statusData = [
        { name: 'Completed', value: stats.completedCount, color: '#10b981' },
        { name: 'Scheduled', value: stats.scheduledCount, color: '#3b82f6' },
        { name: 'Cancelled', value: stats.cancelledCount, color: '#ef4444' },
        { name: 'Rescheduled', value: stats.rescheduledCount, color: '#f59e0b' }
    ].filter(d => d.value > 0);

    // 7. Upcoming surgeries (always from today, not filtered by date range)
    const upcomingSurgeries = useMemo(() => {
        const today = formatDateLocal(new Date());
        return surgeries
            .filter(s =>
                (s.doctor_name === surgeonName || s.surgeon_id === user.surgeon_id) &&
                s.status === 'scheduled' && s.date >= today
            )
            .sort((a, b) => new Date(a.date) - new Date(b.date))
            .slice(0, 5);
    }, [surgeries, surgeonName, user.surgeon_id]);

    return (
        <div className="surgeon-dashboard fade-in">
            <header className="sd-header">
                <div className="sd-welcome">
                    <h1>Welcome, {surgeonName}</h1>
                    <p>Here's your surgical performance and schedule overview.</p>
                </div>
                <div className="sd-controls">
                    {/* Labor/Supplies toggle */}
                    <div className="cost-toggle">
                        <input
                            type="checkbox"
                            id="sd-labor-toggle"
                            checked={includeLaborSupplies}
                            onChange={(e) => setIncludeLaborSupplies(e.target.checked)}
                        />
                        <label htmlFor="sd-labor-toggle">Include Labor/Supplies</label>
                    </div>

                    {/* Day / Week / Month / Year buttons */}
                    <div className="sd-view-toggle">
                        {['day', 'week', 'month', 'year'].map(v => (
                            <button
                                key={v}
                                className={`sd-toggle-btn ${viewType === v ? 'active' : ''}`}
                                onClick={() => setViewType(v)}
                            >
                                {v.charAt(0).toUpperCase() + v.slice(1)}
                            </button>
                        ))}
                    </div>

                    {/* Date picker — adapts to view type */}
                    <div className="sd-date-picker">
                        <span>📅</span>
                        {(viewType === 'day' || viewType === 'week') && (
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="sd-date-input"
                            />
                        )}
                        {viewType === 'month' && (
                            <input
                                type="month"
                                value={selectedDate.substring(0, 7)}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="sd-date-input"
                            />
                        )}
                        {viewType === 'year' && (
                            <select
                                value={selectedDate.substring(0, 4)}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="sd-date-input"
                            >
                                {[2022, 2023, 2024, 2025, 2026].map(y => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                        )}
                    </div>
                </div>
            </header>

            {/* Stats */}
            <div className="sd-stats-grid">
                <div className="sd-stat-card revenue">
                    <div className="sd-stat-icon">💰</div>
                    <div className="sd-stat-info">
                        <span className="sd-stat-label">Total Revenue</span>
                        <span className="sd-stat-value">{formatCurrency(stats.revenue)}</span>
                        <span className="sd-stat-sub">From {stats.completedCount} cases</span>
                    </div>
                </div>
                <div className="sd-stat-card cases">
                    <div className="sd-stat-icon">🏥</div>
                    <div className="sd-stat-info">
                        <span className="sd-stat-label">Scheduled Cases</span>
                        <span className="sd-stat-value">{stats.scheduledCount}</span>
                        <span className="sd-stat-sub">Pending procedures</span>
                    </div>
                </div>
                <div className="sd-stat-card profit">
                    <div className="sd-stat-icon">📈</div>
                    <div className="sd-stat-info">
                        <span className="sd-stat-label">Net Profit</span>
                        <span className="sd-stat-value">{formatCurrency(stats.profit)}</span>
                        <span className="sd-stat-sub">Hospital contribution</span>
                    </div>
                </div>
                <div className="sd-stat-card efficiency">
                    <div className="sd-stat-icon">⏱️</div>
                    <div className="sd-stat-info">
                        <span className="sd-stat-label">OR Time</span>
                        <span className="sd-stat-value">{stats.totalMinutes}m</span>
                        <span className="sd-stat-sub">Total minutes logged</span>
                    </div>
                </div>
            </div>

            <div className="sd-main-grid">
                {/* Revenue Trend */}
                <div className="sd-chart-card">
                    <h3>Revenue &amp; Profit Trend</h3>
                    <div className="chart-container">
                        <ResponsiveContainer width="100%" height={300}>
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="sdColorRev" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                                        <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                                    </linearGradient>
                                    <linearGradient id="sdColorProfit" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8}/>
                                        <stop offset="95%" stopColor="#82ca9d" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="name" />
                                <YAxis />
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <Tooltip formatter={(val) => formatCurrency(val)} />
                                <Legend />
                                <Area type="monotone" dataKey="revenue" stroke="#8884d8" fillOpacity={1} fill="url(#sdColorRev)" />
                                <Area type="monotone" dataKey="profit" stroke="#82ca9d" fillOpacity={1} fill="url(#sdColorProfit)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Status Pie */}
                <div className="sd-chart-card tiny">
                    <h3>Case Status Distribution</h3>
                    <div className="chart-container">
                        <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                                <Pie
                                    data={statusData.length > 0 ? statusData : [{ name: 'No Data', value: 1, color: '#e2e8f0' }]}
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {(statusData.length > 0 ? statusData : [{ color: '#e2e8f0' }]).map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Upcoming Schedule */}
                <div className="sd-table-card">
                    <div className="card-header">
                        <h3>Upcoming Schedule</h3>
                    </div>
                    <div className="mini-table">
                        <table>
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Patient</th>
                                    <th>Procedure</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {upcomingSurgeries.length === 0 ? (
                                    <tr><td colSpan="4" className="empty-row">No upcoming surgeries scheduled</td></tr>
                                ) : (
                                    upcomingSurgeries.map(s => (
                                        <tr key={s.id}>
                                            <td>{new Date(s.date + 'T00:00:00').toLocaleDateString()} at {s.start_time}</td>
                                            <td>{s.patients?.full_name || s.patients?.first_name || 'Patient'}</td>
                                            <td>{s.cpt_codes?.length > 0 ? `CPT ${s.cpt_codes[0]}` : 'General Surgery'}</td>
                                            <td><span className={`status-badge ${s.status}`}>{s.status}</span></td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Performance Insights */}
                <div className="sd-table-card">
                    <h3>Performance Insights</h3>
                    <div className="sd-insights">
                        <div className="insight-item">
                            <span className="insight-icon">✔️</span>
                            <div className="insight-text">
                                <strong>Case Volume</strong>
                                <p>You have {stats.completedCount} completed cases this period.</p>
                            </div>
                        </div>
                        <div className="insight-item">
                            <span className="insight-icon">⚠️</span>
                            <div className="insight-text">
                                <strong>Cancellations</strong>
                                <p>Cancellations are at {((stats.cancelledCount / (stats.total || 1)) * 100).toFixed(1)}%.</p>
                            </div>
                        </div>
                        <div className="insight-item">
                            <span className="insight-icon">💎</span>
                            <div className="insight-text">
                                <strong>Avg Revenue/Case</strong>
                                <p>Averaging {formatCurrency(stats.avgRevenuePerCase)} per case.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SurgeonDashboard;
