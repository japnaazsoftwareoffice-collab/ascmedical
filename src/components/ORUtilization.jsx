import React, { useState, useMemo } from 'react';
import { calculateORCost, formatCurrency, formatSurgeonName, calculateMedicareRevenue } from '../utils/hospitalUtils';
import './ORUtilization.css';

const ORUtilization = ({ surgeries, cptCodes, settings }) => {
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedOR, setSelectedOR] = useState('all'); // 'all' or specific OR number

    // Constants
    const OR_COUNT = 4;
    const OR_START_HOUR = 7; // 7 AM
    const OR_END_HOUR = 16; // 4 PM
    const TOTAL_MINUTES_PER_OR = (OR_END_HOUR - OR_START_HOUR) * 60; // 540 minutes (9 hours)
    const TOTAL_FACILITY_MINUTES = TOTAL_MINUTES_PER_OR * OR_COUNT; // 2160 minutes total

    // Calculate utilization and financials for selected date
    const utilizationData = useMemo(() => {
        if (!surgeries) return {
            orUtilization: [],
            totalUtilization: 0,
            totalSurgeries: 0,
            totalMinutesUsed: 0,
            totalOperationCost: 0,
            totalORCost: 0,
            totalLaborCost: 0,
            totalSuppliesCost: 0
        };

        // Filter surgeries for selected date
        const dateSurgeries = surgeries.filter(s => s.date === selectedDate);

        let totalOperationCost = 0;
        let totalORCost = 0;
        let totalLaborCost = 0;
        let totalSuppliesCost = 0;

        // Initialize OR data
        const orData = Array.from({ length: OR_COUNT }, (_, i) => ({
            orNumber: i + 1,
            orName: `OR ${i + 1}`,
            minutesUsed: 0,
            turnoverMinutes: 0,
            surgeries: [],
            utilizationPercent: 0
        }));

        // Assign surgeries to ORs and calculate costs
        dateSurgeries.forEach((surgery, index) => {
            const orIndex = surgery.or_room ? surgery.or_room - 1 : index % OR_COUNT;
            const duration = surgery.duration_minutes || 0;
            let turnover = surgery.turnover_time || surgery.turnoverTime || 0;

            // Fallback: Calculate turnover from CPT codes if not stored on surgery
            if (turnover === 0 && surgery.cpt_codes && surgery.cpt_codes.length > 0) {
                surgery.cpt_codes.forEach(code => {
                    const cpt = cptCodes.find(c => String(c.code) === String(code));
                    if (cpt) {
                        turnover += parseInt(cpt.turnover_time || cpt.turnoverTime || 0);
                    }
                });
            }

            // Calculate OR Cost (Expense) - Includes Turnover (Internal Cost)
            const surgeryORCost = calculateORCost(duration + turnover);
            totalORCost += surgeryORCost;

            // Calculate Labor Cost from notes or use actual_labor_cost
            let surgeryLaborCost = surgery.actual_labor_cost || 0;

            if (!surgeryLaborCost && surgery.notes) {
                // Extract self-pay anesthesia
                const selfPayMatch = surgery.notes.match(/Self-Pay Anesthesia(?:\s*\([^)]+\))?\s*:\s*\$?\s*([0-9,]+)/i);
                if (selfPayMatch) {
                    surgeryLaborCost = parseFloat(selfPayMatch[1].replace(/,/g, ''));
                }

                // Extract cosmetic anesthesia
                const cosmeticAnesthesiaMatch = surgery.notes.match(/Anesthesia:\s*\$?\s*([0-9,]+)/i);
                if (cosmeticAnesthesiaMatch && surgery.notes.includes('Cosmetic Surgery')) {
                    surgeryLaborCost = parseFloat(cosmeticAnesthesiaMatch[1].replace(/,/g, ''));
                }
            }

            // If still no labor cost, default to 30% of OR cost
            if (!surgeryLaborCost) {
                surgeryLaborCost = surgeryORCost * 0.3;
            }

            // Get supplies costs
            const surgerySuppliesCost = (surgery.supplies_cost || 0) + (surgery.implants_cost || 0) + (surgery.medications_cost || 0);

            // Calculate Operation Cost (Revenue)
            let surgeryRevenue = 0;

            // Check if cosmetic
            const isCosmetic = !surgery.cpt_codes || surgery.cpt_codes.length === 0;

            if (isCosmetic) {
                if (surgery.notes) {
                    const facilityMatch = surgery.notes.match(/Facility Fee:\s*\$?\s*([\d,]+)/);
                    const anesthesiaMatch = surgery.notes.match(/Anesthesia:\s*\$?\s*([\d,]+)/);
                    const facilityFee = facilityMatch ? parseInt(facilityMatch[1].replace(/,/g, '')) : 0;
                    const anesthesiaFee = anesthesiaMatch ? parseInt(anesthesiaMatch[1].replace(/,/g, '')) : 0;
                    surgeryRevenue = facilityFee + anesthesiaFee;
                }
            } else {
                // CPT Codes revenue
                const cptRevenue = calculateMedicareRevenue(
                    surgery.cpt_codes || [],
                    cptCodes,
                    settings?.apply_medicare_mppr || false
                );

                // Add Billable Facility Fee (based on procedure duration only)
                const billableFacilityFee = calculateORCost(duration);

                // Add Self-Pay Anesthesia if applicable
                let anesthesiaExtra = 0;
                if (surgery.notes && surgery.notes.includes('Self-Pay Anesthesia')) {
                    const match = surgery.notes.match(/Self-Pay Anesthesia: \$([\d,]+)/);
                    if (match) {
                        anesthesiaExtra = parseFloat(match[1].replace(/,/g, ''));
                    }
                }

                surgeryRevenue = cptRevenue + billableFacilityFee + anesthesiaExtra;
            }

            totalOperationCost += surgeryRevenue;
            totalLaborCost += surgeryLaborCost;
            totalSuppliesCost += surgerySuppliesCost;

            // Determine Patient Name
            let patientName = surgery.patient_name;
            if (!patientName && surgery.patients) {
                if (surgery.patients.name) {
                    patientName = surgery.patients.name;
                } else {
                    const first = surgery.patients.firstname || surgery.patients.first_name || '';
                    const last = surgery.patients.lastname || surgery.patients.last_name || '';
                    if (first && last) {
                        patientName = `${first} ${last}`;
                    }
                }
            }
            patientName = patientName || 'Unknown Patient';

            // Determine Doctor Name
            let doctorName = surgery.doctor_name;
            if (!doctorName && surgery.surgeons) {
                doctorName = formatSurgeonName(surgery.surgeons);
            }
            doctorName = doctorName || 'Unknown Surgeon';

            if (orIndex >= 0 && orIndex < OR_COUNT) {
                orData[orIndex].minutesUsed += (duration + turnover);
                orData[orIndex].turnoverMinutes += turnover;
                orData[orIndex].surgeries.push({
                    id: surgery.id,
                    patientName: patientName,
                    doctorName: doctorName,
                    startTime: surgery.start_time,
                    duration: duration,
                    turnover: turnover,
                    revenue: surgeryRevenue,
                    cost: surgeryORCost,
                    laborCost: surgeryLaborCost,
                    suppliesCost: surgerySuppliesCost
                });
            }
        });

        // Calculate utilization percentages
        orData.forEach(or => {
            or.utilizationPercent = (or.minutesUsed / TOTAL_MINUTES_PER_OR) * 100;
        });

        const totalMinutesUsed = orData.reduce((sum, or) => sum + or.minutesUsed, 0);
        const totalTurnoverMinutes = orData.reduce((sum, or) => sum + or.turnoverMinutes, 0);
        const totalUtilization = (totalMinutesUsed / TOTAL_FACILITY_MINUTES) * 100;

        return {
            orUtilization: orData,
            totalUtilization,
            totalSurgeries: dateSurgeries.length,
            totalMinutesUsed,
            totalTurnoverMinutes,
            totalOperationCost,
            totalORCost,
            totalLaborCost,
            totalSuppliesCost
        };
    }, [surgeries, cptCodes, selectedDate]);

    // Calculate filtered metrics based on selected OR
    const filteredMetrics = useMemo(() => {
        if (selectedOR === 'all') {
            return {
                revenue: utilizationData.totalOperationCost,
                cost: utilizationData.totalORCost,
                laborCost: utilizationData.totalLaborCost,
                suppliesCost: utilizationData.totalSuppliesCost,
                surgeries: utilizationData.totalSurgeries,
                minutesUsed: utilizationData.totalMinutesUsed,
                turnoverMinutes: utilizationData.totalTurnoverMinutes,
                utilization: utilizationData.totalUtilization,
                totalCapacity: TOTAL_FACILITY_MINUTES
            };
        }

        // Filter for specific OR
        const orNumber = parseInt(selectedOR);
        const orStats = utilizationData.orUtilization.find(or => or.orNumber === orNumber);

        if (!orStats) {
            return {
                revenue: 0,
                cost: 0,
                laborCost: 0,
                suppliesCost: 0,
                surgeries: 0,
                minutesUsed: 0,
                turnoverMinutes: 0,
                utilization: 0,
                totalCapacity: TOTAL_MINUTES_PER_OR
            };
        }

        // Calculate revenue and costs for this specific OR
        const orRevenue = orStats.surgeries.reduce((sum, s) => sum + s.revenue, 0);
        const orCost = orStats.surgeries.reduce((sum, s) => sum + s.cost, 0);
        const orLaborCost = orStats.surgeries.reduce((sum, s) => sum + s.laborCost, 0);
        const orSuppliesCost = orStats.surgeries.reduce((sum, s) => sum + s.suppliesCost, 0);

        return {
            revenue: orRevenue,
            cost: orCost,
            laborCost: orLaborCost,
            suppliesCost: orSuppliesCost,
            surgeries: orStats.surgeries.length,
            minutesUsed: orStats.minutesUsed,
            turnoverMinutes: orStats.turnoverMinutes,
            utilization: orStats.utilizationPercent,
            totalCapacity: TOTAL_MINUTES_PER_OR
        };
    }, [utilizationData, selectedOR]);

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
        if (percent >= 90) return '#10b981'; // Green - excellent
        if (percent >= 70) return '#3b82f6'; // Blue - good
        if (percent >= 50) return '#f97316'; // Orange - moderate
        return '#ef4444'; // Red - low
    };

    const getUtilizationBg = (percent) => {
        if (percent >= 90) return '#ecfdf5'; // Green bg
        if (percent >= 70) return '#eff6ff'; // Blue bg
        if (percent >= 50) return '#fff7ed'; // Orange bg
        return '#fef2f2'; // Red bg
    };

    const getUtilizationLabel = (percent) => {
        if (percent >= 90) return 'Excellent';
        if (percent >= 70) return 'Good';
        if (percent >= 50) return 'Moderate';
        return 'Low';
    };

    return (
        <div className="page-container fade-in">
            {/* Page Header */}
            <div className="dashboard-header">
                <div className="header-left">
                    <h2 className="page-title">OR Utilization Dashboard</h2>
                </div>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div className="date-picker">
                        <span>🏥</span>
                        <select
                            value={selectedOR}
                            onChange={(e) => setSelectedOR(e.target.value)}
                            className="date-input"
                            style={{ minWidth: '150px' }}
                        >
                            <option value="all">All ORs</option>
                            <option value="1">OR 1</option>
                            <option value="2">OR 2</option>
                            <option value="3">OR 3</option>
                            <option value="4">OR 4</option>
                        </select>
                    </div>
                    <div className="date-picker">
                        <span>📅</span>
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="date-input"
                        />
                    </div>
                </div>
            </div>

            {/* Financial Overview */}
            <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
                <div className="stat-card">
                    <div className="stat-content">
                        <div className="stat-label">Total Operation Revenue</div>
                        <div className="stat-value" style={{ color: '#10b981' }}>
                            {formatCurrency(filteredMetrics.revenue)}
                        </div>
                        <div className="stat-sublabel">
                            Est. Revenue from Surgeries
                        </div>
                    </div>
                    <div className="stat-icon" style={{ backgroundColor: '#ecfdf5', color: '#10b981' }}>
                        💰
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-content">
                        <div className="stat-label">Total OR Cost</div>
                        <div className="stat-value" style={{ color: '#ef4444' }}>
                            {formatCurrency(filteredMetrics.cost)}
                        </div>
                        <div className="stat-sublabel">
                            Est. Operational Expense
                        </div>
                    </div>
                    <div className="stat-icon" style={{ backgroundColor: '#fef2f2', color: '#ef4444' }}>
                        📉
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-content">
                        <div className="stat-label">Net Profit/Loss</div>
                        <div className="stat-value" style={{
                            color: (filteredMetrics.revenue - filteredMetrics.cost - filteredMetrics.laborCost - filteredMetrics.suppliesCost) > 0 ? '#10b981' : '#ef4444'
                        }}>
                            {formatCurrency(
                                filteredMetrics.revenue -
                                filteredMetrics.cost -
                                filteredMetrics.laborCost -
                                filteredMetrics.suppliesCost
                            )}
                        </div>
                        <div className="stat-sublabel">
                            Revenue - Cost
                        </div>
                    </div>
                    <div className="stat-icon" style={{ backgroundColor: '#eff6ff', color: '#3b82f6' }}>
                        ⚖️
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-content">
                        <div className="stat-label">Efficiency Ratio</div>
                        <div className="stat-value" style={{ color: '#3b82f6' }}>
                            {(() => {
                                const totalCosts = filteredMetrics.cost + filteredMetrics.laborCost + filteredMetrics.suppliesCost;
                                return totalCosts > 0 ? (filteredMetrics.revenue / totalCosts).toFixed(2) : 'N/A';
                            })()}x
                        </div>
                        <div className="stat-sublabel">
                            Revenue per $1 Cost
                        </div>
                    </div>
                    <div className="stat-icon" style={{ backgroundColor: '#f5f3ff', color: '#8b5cf6' }}>
                        📈
                    </div>
                </div>
            </div>

            {/* Key Metrics */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-content">
                        <div className="stat-label">Overall Utilization</div>
                        <div className="stat-value">{filteredMetrics.utilization.toFixed(1)}%</div>
                        <div className="stat-sublabel">{getUtilizationLabel(filteredMetrics.utilization)} Efficiency</div>
                    </div>
                    <div className="stat-icon" style={{
                        backgroundColor: getUtilizationBg(filteredMetrics.utilization),
                        color: getUtilizationColor(filteredMetrics.utilization)
                    }}>
                        🏥
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-content">
                        <div className="stat-label">Total Surgeries</div>
                        <div className="stat-value">{filteredMetrics.surgeries}</div>
                        <div className="stat-sublabel">
                            {new Date(selectedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </div>
                    </div>
                    <div className="stat-icon icon-purple">
                        🔪
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-content">
                        <div className="stat-label">Time Used</div>
                        <div className="stat-value">{formatDuration(filteredMetrics.minutesUsed)}</div>
                        <div className="stat-sublabel">
                            {formatDuration(filteredMetrics.minutesUsed - filteredMetrics.turnoverMinutes)} surg + {formatDuration(filteredMetrics.turnoverMinutes)} turn
                        </div>
                    </div>
                    <div className="stat-icon icon-blue">
                        ⏱️
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-content">
                        <div className="stat-label">Available Capacity</div>
                        <div className="stat-value">{formatDuration(filteredMetrics.totalCapacity - filteredMetrics.minutesUsed)}</div>
                        <div className="stat-sublabel">{((filteredMetrics.totalCapacity - filteredMetrics.minutesUsed) / filteredMetrics.totalCapacity * 100).toFixed(1)}% remaining</div>
                    </div>
                    <div className="stat-icon icon-green">
                        📊
                    </div>
                </div>
            </div>

            {/* OR Cards Grid */}
            <div className="section-header">
                <h3>Operating Room Details</h3>
                <div className="or-info-badge">
                    {selectedOR === 'all'
                        ? `${OR_COUNT} Rooms • 7 AM - 4 PM (9 hours)`
                        : `OR ${selectedOR} • 7 AM - 4 PM (9 hours)`}
                </div>
            </div>

            <div className="or-grid">{utilizationData.orUtilization
                .filter(or => selectedOR === 'all' || or.orNumber === parseInt(selectedOR))
                .map((or) => (
                    <div key={or.orNumber} className="content-card or-card">
                        <div className="or-card-header-section">
                            <div className="or-header-top">
                                <h3 className="or-title">{or.orName}</h3>
                                <span className="utilization-badge" style={{
                                    backgroundColor: getUtilizationBg(or.utilizationPercent),
                                    color: getUtilizationColor(or.utilizationPercent)
                                }}>
                                    {or.utilizationPercent.toFixed(1)}%
                                </span>
                            </div>
                            <div className="or-status-label" style={{ color: getUtilizationColor(or.utilizationPercent) }}>
                                {getUtilizationLabel(or.utilizationPercent)} Utilization
                            </div>
                        </div>

                        <div className="or-progress-section">
                            <div className="progress-bar-container">
                                <div
                                    className="progress-bar-fill"
                                    style={{
                                        width: `${Math.min(or.utilizationPercent, 100)}%`,
                                        backgroundColor: getUtilizationColor(or.utilizationPercent)
                                    }}
                                />
                            </div>
                            <div className="progress-labels">
                                <span>{formatDuration(or.minutesUsed)} used</span>
                                <span>{formatDuration(TOTAL_MINUTES_PER_OR - or.minutesUsed)} available</span>
                            </div>
                        </div>

                        <div className="or-stats-mini">
                            <div className="mini-stat">
                                <div className="mini-stat-icon">⏰</div>
                                <div>
                                    <div className="mini-stat-value">{formatDuration(or.minutesUsed)}</div>
                                    <div className="mini-stat-label">Used</div>
                                </div>
                            </div>
                            <div className="mini-stat">
                                <div className="mini-stat-icon">📋</div>
                                <div>
                                    <div className="mini-stat-value">{or.surgeries.length}</div>
                                    <div className="mini-stat-label">Surgeries</div>
                                </div>
                            </div>
                            <div className="mini-stat">
                                <div className="mini-stat-icon">📊</div>
                                <div>
                                    <div className="mini-stat-value">{formatDuration(TOTAL_MINUTES_PER_OR - or.minutesUsed)}</div>
                                    <div className="mini-stat-label">Available</div>
                                </div>
                            </div>
                        </div>

                        <div className="or-surgeries-list">
                            <div className="surgeries-list-header">
                                <span>Scheduled Surgeries</span>
                                <span className="count-badge">{or.surgeries.length}</span>
                            </div>
                            {or.surgeries.length > 0 ? (
                                <div className="surgeries-items">
                                    {or.surgeries.map((surgery, idx) => (
                                        <div key={idx} className="surgery-item">
                                            {surgery.startTime && <div className="surgery-time">{formatTime(surgery.startTime)}</div>}
                                            <div className="surgery-details">
                                                <div className="surgery-patient">{surgery.patientName}</div>
                                                <div className="surgery-doctor">{surgery.doctorName}</div>
                                            </div>
                                            <div className="surgery-duration" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                                                <span>{formatDuration(surgery.duration)}</span>
                                                {surgery.turnover > 0 && (
                                                    <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 'normal' }}>
                                                        + {surgery.turnover}m turn
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="empty-state">
                                    No surgeries scheduled
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ORUtilization;
