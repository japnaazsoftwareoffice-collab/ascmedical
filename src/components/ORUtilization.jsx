import React, { useState, useMemo, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { calculateORCost, formatCurrency, formatSurgeonName, calculateMedicareRevenue, getSurgeryMetrics, formatDateLocal } from '../utils/hospitalUtils';
import Papa from 'papaparse';
import './ORUtilization.css';

const ORUtilization = ({ surgeries, cptCodes, settings, procedureGroupItems = [], billing = [] }) => {
    const [selectedDate, setSelectedDate] = useState(formatDateLocal(new Date()));
    const [selectedOR, setSelectedOR] = useState('all'); // 'all' or specific OR number
    const [includeLaborSupplies, setIncludeLaborSupplies] = useState(() => {
        return typeof window !== 'undefined' ? localStorage.getItem('includeLaborSupplies') === 'true' : false;
    });

    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('includeLaborSupplies', String(includeLaborSupplies));
        }
    }, [includeLaborSupplies]);
    const [viewType, setViewType] = useState('day'); // 'day', 'week', 'month', 'year'

    const handleDateChange = (val) => {
        if (!val) return;

        let d = new Date(val + 'T00:00:00');
        if (isNaN(d.getTime())) return;

        let newDate = val;
        
        if (viewType === 'week') {
            // Snap to Monday of that week
            const day = d.getDay();
            const diff = d.getDate() - day + (day === 0 ? -6 : 1);
            d.setDate(diff);
            newDate = formatDateLocal(d);
        } else if (viewType === 'month' && val.length === 7) {
            newDate = `${val}-01`;
        } else if (viewType === 'year' && val.length === 4) {
            newDate = `${val}-01-01`;
        }
        
        setSelectedDate(newDate);
    };

    // Auto-sync date when view type changes
    React.useEffect(() => {
        handleDateChange(selectedDate);
    }, [viewType]);

    // Constants
    const OR_COUNT = 1;
    const OR_START_HOUR = 7; // 7 AM
    const OR_END_HOUR = 15; // 3 PM (8 hour day)
    const TOTAL_MINUTES_PER_OR = (OR_END_HOUR - OR_START_HOUR) * 60; // 480 minutes (8 hours)
    const TOTAL_FACILITY_MINUTES = TOTAL_MINUTES_PER_OR * OR_COUNT; // 480 minutes total

    // Calculate utilization and financials for selected period
    const utilizationData = useMemo(() => {
        if (!surgeries) return {
            orUtilization: [],
            totalUtilization: 0,
            totalSurgeries: 0,
            totalMinutesUsed: 0,
            totalOperationCost: 0,
            totalORCost: 0,
            totalLaborCost: 0,
            totalSuppliesCost: 0,
            capacityInPeriod: TOTAL_FACILITY_MINUTES
        };

        const dateToParse = selectedDate.length === 7 ? selectedDate + '-01' : (selectedDate.length === 4 ? selectedDate + '-01-01' : selectedDate);
        const selected = new Date(dateToParse + 'T00:00:00'); 
        
        // Helper to get start and end of week
        const getWeekRange = (date) => {
            const start = new Date(date);
            const day = start.getDay(); // 0 is Sunday
            const diff = start.getDate() - day + (day === 0 ? -6 : 1); // Monday as start
            start.setDate(diff);
            start.setHours(0, 0, 0, 0);
            
            const end = new Date(start);
            end.setDate(start.getDate() + 6);
            end.setHours(23, 59, 59, 999);
            return { start, end };
        };

        const { start: weekStart, end: weekEnd } = getWeekRange(selected);

        // Filter surgeries for selected period
        const periodSurgeries = surgeries.filter(s => {
            const surgeryDate = new Date(s.date + 'T00:00:00');
            
            if (viewType === 'day') {
                return s.date === selectedDate;
            } else if (viewType === 'week') {
                return surgeryDate >= weekStart && surgeryDate <= weekEnd;
            } else if (viewType === 'month') {
                return surgeryDate.getMonth() === selected.getMonth() && 
                       surgeryDate.getFullYear() === selected.getFullYear();
            } else if (viewType === 'year') {
                return surgeryDate.getFullYear() === selected.getFullYear();
            }
            return false;
        });

        // Determine capacity based on view type (Assuming 5-day work week for simplicity)
        let daysInPeriod = 1;
        if (viewType === 'week') daysInPeriod = 5;
        else if (viewType === 'month') {
            // Calculate working days in that month (approximate or precise)
            // For simplicity, let's use 22 for month and 260 for year unless we want to be very precise
            daysInPeriod = 22; 
        } else if (viewType === 'year') {
            daysInPeriod = 260;
        }

        const capacityInPeriod = TOTAL_FACILITY_MINUTES * daysInPeriod;
        const orCapacityInPeriod = TOTAL_MINUTES_PER_OR * daysInPeriod;

        let totalOperationCost = 0;
        let totalORCost = 0;
        let totalLaborCost = 0;
        let totalSuppliesCost = 0;
        let totalProfit = 0;

        // Initialize OR data
        const orData = Array.from({ length: OR_COUNT }, (_, i) => ({
            orNumber: i + 1,
            orName: `OR ${i + 1}`,
            minutesUsed: 0,
            turnoverMinutes: 0,
            surgeries: [],
            utilizationPercent: 0,
            capacity: orCapacityInPeriod
        }));

        // Assign surgeries to ORs and calculate costs
        periodSurgeries.forEach((surgery, index) => {
            const orIndex = surgery.or_room ? surgery.or_room - 1 : 0; // Standardized to use room 1 if missing

            const metrics = getSurgeryMetrics(surgery, cptCodes, settings, procedureGroupItems, billing);

            if (!includeLaborSupplies && !metrics.isProbono) {
                metrics.netProfit = metrics.netProfit + metrics.laborCost + metrics.supplyCosts + metrics.internalRoomCost;
                metrics.netProfit = metrics.netProfit - metrics.supplyCosts;
                metrics.laborCost = 0;
                metrics.supplyCosts = 0;
                metrics.internalRoomCost = 0;
            } else if (metrics.isProbono) {
                metrics.netProfit = 0;
            }

            // Rule: Actual Billing Amount is Net Profit
            metrics.totalRevenue = metrics.netProfit;

            const duration = parseInt(surgery.actual_duration_minutes || surgery.duration_minutes || surgery.durationMinutes || 0);
            const turnover = parseInt(surgery.turnover_time || surgery.turnoverTime || 0);

            totalOperationCost += metrics.totalRevenue;
            totalProfit += metrics.netProfit;
            totalORCost += metrics.internalRoomCost;
            totalLaborCost += metrics.laborCost;
            totalSuppliesCost += metrics.supplyCosts;

            // Patient/Doctor name logic (keeping existing)
            let patientName = surgery.patient_name;
            if (!patientName && surgery.patients) {
                if (surgery.patients.name) patientName = surgery.patients.name;
                else {
                    const first = surgery.patients.firstname || surgery.patients.first_name || '';
                    const last = surgery.patients.lastname || surgery.patients.last_name || '';
                    if (first && last) patientName = `${first} ${last}`;
                }
            }
            patientName = patientName || 'Unknown Patient';

            let doctorName = surgery.doctor_name;
            if (!doctorName && surgery.surgeons) doctorName = formatSurgeonName(surgery.surgeons);
            doctorName = doctorName || 'Unknown Surgeon';

            if (orIndex >= 0 && orIndex < OR_COUNT) {
                orData[orIndex].minutesUsed += (duration + turnover);
                orData[orIndex].turnoverMinutes += turnover;
                orData[orIndex].surgeries.push({
                    id: surgery.id,
                    date: surgery.date,
                    patientName: patientName,
                    doctorName: doctorName,
                    startTime: surgery.actual_start_time || surgery.start_time,
                    endTime: surgery.actual_end_time,
                    duration: duration,
                    turnover: turnover,
                    revenue: metrics.totalRevenue,
                    cost: metrics.internalRoomCost,
                    laborCost: metrics.laborCost,
                    suppliesCost: metrics.supplyCosts,
                    netProfit: metrics.netProfit,
                    hasActualTimes: !!surgery.actual_duration_minutes
                });
            }
        });

        // Sort surgeries within ORs by date and then time
        orData.forEach(or => {
            or.surgeries.sort((a, b) => {
                if (a.date !== b.date) return a.date.localeCompare(b.date);
                return (a.startTime || '').localeCompare(b.startTime || '');
            });
            or.utilizationPercent = (or.minutesUsed / orCapacityInPeriod) * 100;
        });

        const totalMinutesUsed = orData.reduce((sum, or) => sum + or.minutesUsed, 0);
        const totalTurnoverMinutes = orData.reduce((sum, or) => sum + or.turnoverMinutes, 0);
        const totalUtilization = (totalMinutesUsed / capacityInPeriod) * 100;

        return {
            orUtilization: orData,
            totalUtilization,
            totalSurgeries: periodSurgeries.length,
            totalMinutesUsed,
            totalTurnoverMinutes,
            totalOperationCost,
            totalProfit,
            totalORCost,
            totalLaborCost,
            totalSuppliesCost,
            capacityInPeriod
        };
    }, [surgeries, cptCodes, selectedDate, includeLaborSupplies, viewType]);

    // Calculate filtered metrics based on selected OR
    const filteredMetrics = useMemo(() => {
        if (selectedOR === 'all') {
            return {
                revenue: utilizationData.totalOperationCost,
                profit: utilizationData.totalProfit,
                cost: utilizationData.totalORCost,
                laborCost: utilizationData.totalLaborCost,
                suppliesCost: utilizationData.totalSuppliesCost,
                surgeries: utilizationData.totalSurgeries,
                minutesUsed: utilizationData.totalMinutesUsed,
                turnoverMinutes: utilizationData.totalTurnoverMinutes,
                utilization: utilizationData.totalUtilization,
                totalCapacity: utilizationData.capacityInPeriod
            };
        }

        // Filter for specific OR
        const orNumber = parseInt(selectedOR);
        const orStats = utilizationData.orUtilization.find(or => or.orNumber === orNumber);

        if (!orStats) {
            return {
                revenue: 0,
                profit: 0,
                cost: 0,
                laborCost: 0,
                suppliesCost: 0,
                surgeries: 0,
                minutesUsed: 0,
                turnoverMinutes: 0,
                utilization: 0,
                totalCapacity: utilizationData.capacityInPeriod
            };
        }

        // Calculate revenue and costs for this specific OR
        const orRevenue = orStats.surgeries.reduce((sum, s) => sum + s.revenue, 0);
        const orProfit = orStats.surgeries.reduce((sum, s) => sum + s.netProfit, 0);
        const orCost = orStats.surgeries.reduce((sum, s) => sum + s.cost, 0);
        const orLaborCost = orStats.surgeries.reduce((sum, s) => sum + s.laborCost, 0);
        const orSuppliesCost = orStats.surgeries.reduce((sum, s) => sum + s.suppliesCost, 0);

        return {
            revenue: orRevenue,
            profit: orProfit,
            cost: orCost,
            laborCost: orLaborCost,
            suppliesCost: orSuppliesCost,
            surgeries: orStats.surgeries.length,
            minutesUsed: orStats.minutesUsed,
            turnoverMinutes: orStats.turnoverMinutes,
            utilization: orStats.utilizationPercent,
            totalCapacity: orStats.capacity
        };
    }, [utilizationData, selectedOR]);

    const handleExportCSV = () => {
        // 1. Prepare Summary Data
        const netProfit = filteredMetrics.profit;
        const summaryData = [
            { 'Dashboard Summary': 'Metric', 'Value': 'Value' },
            { 'Dashboard Summary': 'Period Type', 'Value': viewType.charAt(0).toUpperCase() + viewType.slice(1) },
            { 'Dashboard Summary': 'Reference Date', 'Value': selectedDate },
            { 'Dashboard Summary': 'Room Filter', 'Value': selectedOR === 'all' ? 'All ORs' : `OR ${selectedOR}` },
            { 'Dashboard Summary': 'Overall Utilization', 'Value': filteredMetrics.utilization.toFixed(1) + '%' },
            { 'Dashboard Summary': 'Total Surgeries', 'Value': filteredMetrics.surgeries },
            { 'Dashboard Summary': 'Time Used', 'Value': formatDuration(filteredMetrics.minutesUsed) },
            { 'Dashboard Summary': 'Available Capacity', 'Value': filteredMetrics.totalCapacity - filteredMetrics.minutesUsed > 0 ? formatDuration(filteredMetrics.totalCapacity - filteredMetrics.minutesUsed) : '0m' },
            { 'Dashboard Summary': 'Total Revenue', 'Value': formatCurrency(filteredMetrics.revenue) },
            { 'Dashboard Summary': 'Total Cost', 'Value': formatCurrency(filteredMetrics.cost + filteredMetrics.laborCost + filteredMetrics.suppliesCost) },
            { 'Dashboard Summary': 'Net Profit/Loss', 'Value': formatCurrency(netProfit) },
            { 'Dashboard Summary': 'Efficiency Ratio', 'Value': (filteredMetrics.revenue / (filteredMetrics.cost + filteredMetrics.laborCost + filteredMetrics.suppliesCost || 1)).toFixed(2) + 'x' }
        ];

        // 2. Prepare Surgery Details Data
        const dataToExport = [];
        const targetORs = selectedOR === 'all' 
            ? utilizationData.orUtilization 
            : utilizationData.orUtilization.filter(or => or.orNumber === parseInt(selectedOR));

        targetORs.forEach(or => {
            or.surgeries.forEach(s => {
                dataToExport.push({
                    'OR Room': or.orName,
                    'Date': s.date,
                    'Patient Name': s.patientName,
                    'Surgeon': s.doctorName,
                    'Start Time': s.startTime ? formatTime(s.startTime) : 'N/A',
                    'Duration (min)': s.duration,
                    'Turnover (min)': s.turnover,
                    'Total Time (min)': s.duration + s.turnover,
                    'Revenue': s.revenue.toFixed(2),
                    'Cost': s.cost.toFixed(2),
                    'Labor Cost': s.laborCost.toFixed(2),
                    'Supplies Cost': s.suppliesCost.toFixed(2),
                    'Net Profit': s.netProfit.toFixed(2),
                    'Status': s.hasActualTimes ? 'Actual' : 'Planned'
                });
            });
        });

        // 3. Combine and Export
        const summaryCsv = Papa.unparse(summaryData);
        const surgeriesCsv = Papa.unparse(dataToExport);
        
        const finalCsv = summaryCsv + '\n\n' + 'SURGERY DETAILS' + '\n' + surgeriesCsv;
        
        const blob = new Blob([finalCsv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `OR_Utilization_Report_${viewType}_${selectedDate}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const formatTime = (time24) => {
        if (!time24) return 'N/A';
        const [hours, minutes] = time24.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const hour12 = hour % 12 || 12;
        return `${hour12}:${minutes} ${ampm}`;
    };

    const formatDuration = (minutes) => {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        if (hours > 0) {
            return `${hours}h ${mins}m`;
        }
        return `${mins}m`;
    };

    const getUtilizationColor = (percent) => {
        if (percent > 100) return '#8b5cf6'; // Purple - Over Capacity/Overtime
        if (percent >= 90) return '#10b981'; // Green - excellent
        if (percent >= 70) return '#3b82f6'; // Blue - good
        if (percent >= 50) return '#f97316'; // Orange - moderate
        return '#ef4444'; // Red - low
    };

    const getUtilizationBg = (percent) => {
        if (percent > 100) return '#f5f3ff'; // Purple bg
        if (percent >= 90) return '#ecfdf5'; // Green bg
        if (percent >= 70) return '#eff6ff'; // Blue bg
        if (percent >= 50) return '#fff7ed'; // Orange bg
        return '#fef2f2'; // Red bg
    };

    const getUtilizationLabel = (percent) => {
        if (percent > 100) return 'Over Capacity';
        if (percent >= 90) return 'Excellent';
        if (percent >= 70) return 'Good';
        if (percent >= 50) return 'Moderate';
        return 'Low';
    };

    const pieData = useMemo(() => {
        const used = filteredMetrics.minutesUsed;
        const available = Math.max(0, filteredMetrics.totalCapacity - used);
        return [
            { name: 'Used Time', value: used, color: '#3b82f6' },
            { name: 'Available Time', value: available, color: '#e2e8f0' }
        ];
    }, [filteredMetrics]);

    return (
        <div className="page-container fade-in">
            {/* Page Header */}
            <div className="dashboard-header">
                <div className="header-left">
                    <h2 className="page-title">OR Utilization</h2>
                    <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '4px' }}>Simplified overview of operating room efficiency</p>
                </div>
                <div className="header-actions">
                    <div className="view-toggle-container">
                        {['day', 'week', 'month', 'year'].map(type => (
                            <button 
                                key={type}
                                className={`view-toggle-btn ${viewType === type ? 'active' : ''}`}
                                onClick={() => setViewType(type)}
                            >
                                {type.charAt(0).toUpperCase() + type.slice(1)}
                            </button>
                        ))}
                    </div>
                    
                    <div className="date-picker">
                        <span>🏥</span>
                        <select
                            value={selectedOR}
                            onChange={(e) => setSelectedOR(e.target.value)}
                            className="date-input"
                        >
                            <option value="all">All Rooms</option>
                            <option value="1">OR 1</option>
                        </select>
                    </div>

                    <div className="date-picker">
                        <span>📅</span>
                        {viewType === 'day' && <input type="date" value={selectedDate} onChange={(e) => handleDateChange(e.target.value)} className="date-input" />}
                        {viewType === 'week' && <input type="date" value={selectedDate} onChange={(e) => handleDateChange(e.target.value)} className="date-input" step="7" />}
                        {viewType === 'month' && <input type="month" value={selectedDate.substring(0, 7)} onChange={(e) => handleDateChange(e.target.value)} className="date-input" />}
                        {viewType === 'year' && (
                            <select value={selectedDate.substring(0, 4)} onChange={(e) => handleDateChange(e.target.value)} className="date-input">
                                {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        )}
                    </div>

                    <button onClick={handleExportCSV} className="btn-action" style={{ background: '#10b981', color: 'white', border: 'none', padding: '10px 18px', borderRadius: '10px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>📥</span> Export
                    </button>
                </div>
            </div>

            {/* Simplified Grid */}
            <div className="or-util-simplified-grid">
                {/* Left: Utilization Pie Chart */}
                <div className="chart-card glass-card">
                    <h3 className="chart-title">Utilization Breakdown</h3>
                    <div className="utilization-pie-container">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={70}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="value"
                                    startAngle={90}
                                    endAngle={-270}
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                                    ))}
                                </Pie>
                                <RechartsTooltip 
                                    formatter={(value) => formatDuration(value)}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="pie-center-label">
                            <span className="pie-center-value">{filteredMetrics.utilization.toFixed(1)}%</span>
                            <span className="pie-center-text">Utilized</span>
                        </div>
                    </div>
                    <div className="chart-legend">
                        <div className="legend-item">
                            <div className="legend-color" style={{ backgroundColor: '#3b82f6' }}></div>
                            <span>Used: {formatDuration(filteredMetrics.minutesUsed)}</span>
                        </div>
                        <div className="legend-item">
                            <div className="legend-color" style={{ backgroundColor: '#e2e8f0' }}></div>
                            <span>Available: {formatDuration(Math.max(0, filteredMetrics.totalCapacity - filteredMetrics.minutesUsed))}</span>
                        </div>
                    </div>
                </div>

                {/* Right: Key Financials & Metrics */}
                <div className="simplified-metrics-column">
                    <div className="compact-stat-card">
                        <div className="compact-stat-info">
                            <span className="compact-stat-label">Total Revenue</span>
                            <span className="compact-stat-value" style={{ color: '#10b981' }}>{formatCurrency(filteredMetrics.revenue)}</span>
                        </div>
                        <div style={{ fontSize: '1.5rem' }}>💰</div>
                    </div>

                    <div className="compact-stat-card">
                        <div className="compact-stat-info">
                            <span className="compact-stat-label">Net Profit</span>
                            <span className="compact-stat-value" style={{ color: filteredMetrics.profit >= 0 ? '#10b981' : '#ef4444' }}>
                                {formatCurrency(filteredMetrics.profit)}
                            </span>
                        </div>
                        <div style={{ fontSize: '1.5rem' }}>📈</div>
                    </div>

                    <div className="compact-stat-card">
                        <div className="compact-stat-info">
                            <span className="compact-stat-label">Total Surgeries</span>
                            <span className="compact-stat-value">{filteredMetrics.surgeries}</span>
                        </div>
                        <div style={{ fontSize: '1.5rem' }}>🏥</div>
                    </div>

                    <div className="compact-stat-card">
                        <div className="compact-stat-info">
                            <span className="compact-stat-label">Efficiency Ratio</span>
                            <span className="compact-stat-value" style={{ color: '#3b82f6' }}>
                                {(() => {
                                    const totalCosts = filteredMetrics.cost + filteredMetrics.laborCost + filteredMetrics.suppliesCost;
                                    return totalCosts > 0 ? (filteredMetrics.revenue / totalCosts).toFixed(2) : '0.00';
                                })()}x
                            </span>
                        </div>
                        <div style={{ fontSize: '1.5rem' }}>⚖️</div>
                    </div>
                </div>
            </div>

            {/* Compact Surgery List */}
            <div className="compact-surgery-list">
                <div className="compact-list-header">
                    <h3 className="compact-list-title">Scheduled Surgeries</h3>
                    <div className="or-info-badge">
                        {filteredMetrics.surgeries} Procedures
                    </div>
                </div>
                <div className="list-content">
                    {utilizationData.orUtilization
                        .filter(or => selectedOR === 'all' || or.orNumber === parseInt(selectedOR))
                        .flatMap(or => or.surgeries)
                        .length > 0 ? (
                            utilizationData.orUtilization
                                .filter(or => selectedOR === 'all' || or.orNumber === parseInt(selectedOR))
                                .flatMap(or => or.surgeries)
                                .map((s, idx) => (
                                    <div key={idx} className="surgery-row">
                                        <div className="row-time">{s.startTime ? formatTime(s.startTime) : 'N/A'}</div>
                                        <div className="row-patient">{s.patientName}</div>
                                        <div className="row-surgeon">{s.doctorName}</div>
                                        <div className="row-duration">
                                            {formatDuration(s.duration)}
                                            {s.hasActualTimes && <span style={{ marginLeft: '4px', fontSize: '0.6rem', color: '#10b981', border: '1px solid #10b981', padding: '1px 3px', borderRadius: '3px' }}>ACT</span>}
                                        </div>
                                    </div>
                                ))
                        ) : (
                            <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                                <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📅</div>
                                <p>No surgeries found for this period</p>
                            </div>
                        )
                    }
                </div>
            </div>
        </div>
    );
};

export default ORUtilization;
