import React, { useMemo, useState } from 'react';
import { calculateORCost, calculateMedicareRevenue, formatCurrency } from '../utils/hospitalUtils';
import './Management.css';

const SurgeonScorecard = ({ surgeries, surgeons, cptCodes, settings }) => {
    const [sortBy, setSortBy] = useState('netMargin'); // netMargin, cases, efficiency, breaches
    const [sortOrder, setSortOrder] = useState('desc');

    // Calculate scorecard data
    const scorecardData = useMemo(() => {
        // Filter only completed surgeries
        const completedSurgeries = surgeries.filter(s => s.status === 'completed');

        // Group by surgeon
        const surgeonStats = {};

        completedSurgeries.forEach(surgery => {
            const surgeonName = surgery.doctor_name;

            if (!surgeonStats[surgeonName]) {
                const surgeonData = surgeons.find(s => s.name === surgeonName);
                surgeonStats[surgeonName] = {
                    name: surgeonName,
                    specialty: surgeonData?.specialty || 'Unknown',
                    totalCases: 0,
                    totalRevenue: 0,
                    totalORCost: 0,
                    totalLaborCost: 0,
                    totalSuppliesCost: 0,
                    totalMinutes: 0,
                    tierBreaches: 0,
                    surgeries: []
                };
            }

            const stats = surgeonStats[surgeonName];
            stats.totalCases++;
            stats.surgeries.push(surgery);

            // Calculate revenue (use snapshot if available, otherwise calculate)
            let revenue = 0;
            if (surgery.expected_reimbursement) {
                revenue = surgery.expected_reimbursement;
            } else if (surgery.cpt_codes && surgery.cpt_codes.length > 0) {
                revenue = calculateMedicareRevenue(surgery.cpt_codes, cptCodes, settings?.apply_medicare_mppr || false);
            }
            stats.totalRevenue += revenue;

            // Calculate OR cost (use snapshot if available, otherwise calculate)
            const orCost = surgery.actual_room_cost || calculateORCost(surgery.duration_minutes || 0);
            stats.totalORCost += orCost;

            // Labor cost - use actual if available, otherwise default to 30% of OR cost
            const laborCost = surgery.actual_labor_cost || (orCost * 0.3);
            stats.totalLaborCost += laborCost;

            // Supplies cost
            stats.totalSuppliesCost += (surgery.supplies_cost || 0) +
                (surgery.implants_cost || 0) +
                (surgery.medications_cost || 0);

            // Track minutes
            stats.totalMinutes += surgery.duration_minutes || 0;

            // Count tier breaches (> 60 minutes)
            if (surgery.duration_minutes > 60) {
                stats.tierBreaches++;
            }
        });

        // Calculate derived metrics
        const scorecard = Object.values(surgeonStats).map(stats => {
            const totalCosts = stats.totalORCost + stats.totalLaborCost + stats.totalSuppliesCost;
            const netMargin = stats.totalRevenue - totalCosts;
            const efficiencyRating = stats.totalMinutes > 0
                ? stats.totalRevenue / stats.totalMinutes
                : 0;
            const avgRevenuePerCase = stats.totalCases > 0
                ? stats.totalRevenue / stats.totalCases
                : 0;
            const avgMarginPerCase = stats.totalCases > 0
                ? netMargin / stats.totalCases
                : 0;

            return {
                ...stats,
                totalCosts,
                netMargin,
                efficiencyRating,
                avgRevenuePerCase,
                avgMarginPerCase,
                marginPercentage: stats.totalRevenue > 0 ? (netMargin / stats.totalRevenue) * 100 : 0
            };
        });

        // Sort
        scorecard.sort((a, b) => {
            let aVal = a[sortBy];
            let bVal = b[sortBy];

            if (sortOrder === 'asc') {
                return aVal - bVal;
            } else {
                return bVal - aVal;
            }
        });

        return scorecard;

    }, [surgeries, surgeons, cptCodes, sortBy, sortOrder, settings?.apply_medicare_mppr]);

    const handleSort = (column) => {
        if (sortBy === column) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(column);
            setSortOrder('desc');
        }
    };

    const getSortIcon = (column) => {
        if (sortBy !== column) return '⇅';
        return sortOrder === 'asc' ? '↑' : '↓';
    };

    // Calculate totals
    const totals = useMemo(() => {
        return scorecardData.reduce((acc, surgeon) => ({
            totalCases: acc.totalCases + surgeon.totalCases,
            totalRevenue: acc.totalRevenue + surgeon.totalRevenue,
            totalCosts: acc.totalCosts + surgeon.totalCosts,
            netMargin: acc.netMargin + surgeon.netMargin,
            tierBreaches: acc.tierBreaches + surgeon.tierBreaches
        }), { totalCases: 0, totalRevenue: 0, totalCosts: 0, netMargin: 0, tierBreaches: 0 });
    }, [scorecardData]);

    return (
        <div className="management-container fade-in">
            <div className="management-header">
                <div>
                    <h2 className="management-title">Surgeon Scorecard</h2>
                    <p className="card-subtitle">Performance analytics for completed surgeries with financial intelligence</p>
                </div>
            </div>

            {/* Summary Cards */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem',
                marginBottom: '2rem'
            }}>
                <div style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    padding: '1.5rem',
                    borderRadius: '12px',
                    color: 'white'
                }}>
                    <div style={{ fontSize: '0.9rem', opacity: 0.9, marginBottom: '0.5rem' }}>Total Cases</div>
                    <div style={{ fontSize: '2rem', fontWeight: '700' }}>{totals.totalCases}</div>
                </div>
                <div style={{
                    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                    padding: '1.5rem',
                    borderRadius: '12px',
                    color: 'white'
                }}>
                    <div style={{ fontSize: '0.9rem', opacity: 0.9, marginBottom: '0.5rem' }}>Total Revenue</div>
                    <div style={{ fontSize: '2rem', fontWeight: '700' }}>{formatCurrency(totals.totalRevenue)}</div>
                </div>
                <div style={{
                    background: totals.netMargin >= 0
                        ? 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
                        : 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
                    padding: '1.5rem',
                    borderRadius: '12px',
                    color: 'white'
                }}>
                    <div style={{ fontSize: '0.9rem', opacity: 0.9, marginBottom: '0.5rem' }}>Net Margin</div>
                    <div style={{ fontSize: '2rem', fontWeight: '700' }}>{formatCurrency(totals.netMargin)}</div>
                </div>
                <div style={{
                    background: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
                    padding: '1.5rem',
                    borderRadius: '12px',
                    color: '#78350f'
                }}>
                    <div style={{ fontSize: '0.9rem', opacity: 0.9, marginBottom: '0.5rem' }}>Tier Breaches</div>
                    <div style={{ fontSize: '2rem', fontWeight: '700' }}>{totals.tierBreaches}</div>
                </div>
            </div>

            <div className="content-card">
                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th onClick={() => handleSort('name')} style={{ cursor: 'pointer' }}>
                                    Surgeon Name {getSortIcon('name')}
                                </th>
                                <th>Specialty</th>
                                <th onClick={() => handleSort('totalCases')} style={{ cursor: 'pointer' }}>
                                    Total Cases {getSortIcon('totalCases')}
                                </th>
                                <th onClick={() => handleSort('totalRevenue')} style={{ cursor: 'pointer' }}>
                                    Total Revenue {getSortIcon('totalRevenue')}
                                </th>
                                <th onClick={() => handleSort('totalCosts')} style={{ cursor: 'pointer' }}>
                                    Total Costs {getSortIcon('totalCosts')}
                                </th>
                                <th onClick={() => handleSort('netMargin')} style={{ cursor: 'pointer' }}>
                                    Net Margin {getSortIcon('netMargin')}
                                </th>
                                <th onClick={() => handleSort('marginPercentage')} style={{ cursor: 'pointer' }}>
                                    Margin % {getSortIcon('marginPercentage')}
                                </th>
                                <th onClick={() => handleSort('tierBreaches')} style={{ cursor: 'pointer' }}>
                                    Tier Breaches {getSortIcon('tierBreaches')}
                                </th>
                                <th onClick={() => handleSort('efficiencyRating')} style={{ cursor: 'pointer' }}>
                                    Efficiency {getSortIcon('efficiencyRating')}
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {scorecardData.length === 0 ? (
                                <tr>
                                    <td colSpan="9" style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                                        <div style={{ fontSize: '1.1rem', fontWeight: '500' }}>
                                            No completed surgeries found
                                        </div>
                                        <div style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>
                                            Complete surgeries to see surgeon performance metrics
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                scorecardData.map((surgeon, index) => (
                                    <tr key={index}>
                                        <td style={{ fontWeight: '600' }}>{surgeon.name}</td>
                                        <td>
                                            <span className="badge" style={{
                                                background: '#e0f2fe',
                                                color: '#0369a1',
                                                padding: '4px 8px',
                                                borderRadius: '4px',
                                                fontSize: '0.85rem'
                                            }}>
                                                {surgeon.specialty}
                                            </span>
                                        </td>
                                        <td style={{ fontWeight: '600' }}>{surgeon.totalCases}</td>
                                        <td style={{ color: '#059669', fontWeight: '600' }}>
                                            {formatCurrency(surgeon.totalRevenue)}
                                            <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '400' }}>
                                                Avg: {formatCurrency(surgeon.avgRevenuePerCase)}
                                            </div>
                                        </td>
                                        <td style={{ color: '#dc2626', fontWeight: '600' }}>
                                            {formatCurrency(surgeon.totalCosts)}
                                            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '400' }}>
                                                OR: {formatCurrency(surgeon.totalORCost)} |
                                                Labor: {formatCurrency(surgeon.totalLaborCost)} |
                                                Supplies: {formatCurrency(surgeon.totalSuppliesCost)}
                                            </div>
                                        </td>
                                        <td style={{
                                            color: surgeon.netMargin >= 0 ? '#059669' : '#dc2626',
                                            fontWeight: '700',
                                            fontSize: '1.05rem'
                                        }}>
                                            {formatCurrency(surgeon.netMargin)}
                                            <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '400' }}>
                                                Avg: {formatCurrency(surgeon.avgMarginPerCase)}
                                            </div>
                                        </td>
                                        <td style={{
                                            color: surgeon.marginPercentage >= 20 ? '#059669' :
                                                surgeon.marginPercentage >= 10 ? '#f59e0b' : '#dc2626',
                                            fontWeight: '600'
                                        }}>
                                            {surgeon.marginPercentage.toFixed(1)}%
                                        </td>
                                        <td>
                                            {surgeon.tierBreaches > 0 ? (
                                                <span className="badge" style={{
                                                    background: surgeon.tierBreaches > 5 ? '#fee2e2' : '#fef3c7',
                                                    color: surgeon.tierBreaches > 5 ? '#991b1b' : '#92400e',
                                                    padding: '4px 8px',
                                                    borderRadius: '4px',
                                                    fontWeight: '600'
                                                }}>
                                                    {surgeon.tierBreaches}
                                                </span>
                                            ) : (
                                                <span style={{ color: '#64748b' }}>0</span>
                                            )}
                                        </td>
                                        <td style={{ fontWeight: '600', color: '#6366f1' }}>
                                            ${surgeon.efficiencyRating.toFixed(2)}/min
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {scorecardData.length > 0 && (
                    <div style={{
                        marginTop: '1.5rem',
                        padding: '1rem',
                        background: '#f8fafc',
                        borderRadius: '8px',
                        fontSize: '0.85rem',
                        color: '#64748b'
                    }}>
                        <strong>Metrics Explained:</strong>
                        <ul style={{ marginTop: '0.5rem', marginBottom: 0, paddingLeft: '1.5rem' }}>
                            <li><strong>Net Margin:</strong> Total Revenue - (OR Costs + Labor + Supplies)</li>
                            <li><strong>Tier Breaches:</strong> Number of surgeries exceeding 60 minutes (causing $300+ surcharge)</li>
                            <li><strong>Efficiency Rating:</strong> Total Revenue ÷ Total OR Minutes (higher is better)</li>
                            <li><strong>Margin %:</strong> (Net Margin ÷ Total Revenue) × 100</li>
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SurgeonScorecard;
