import React, { useState, useEffect, useMemo } from 'react';
import { calculateORCost, formatCurrency } from '../utils/hospitalUtils';
import './CostAnalysis.css';

const CostAnalysis = ({ surgeries, cptCodes, surgeons }) => {
    const [timeframe, setTimeframe] = useState('month');
    const [selectedCategory, setSelectedCategory] = useState('all');

    // Calculate comprehensive analytics
    const analytics = useMemo(() => {
        if (!surgeries || !cptCodes) return {
            totalRevenue: 0,
            totalCost: 0,
            totalORCost: 0,
            profit: 0,
            profitMargin: 0,
            surgeryCount: 0,
            avgRevenuePerSurgery: 0,
            avgORCost: 0,
            cosmeticRevenue: 0,
            regularRevenue: 0
        };

        const now = new Date();
        const filteredSurgeries = surgeries.filter(surgery => {
            const surgeryDate = new Date(surgery.date);
            const daysDiff = (now - surgeryDate) / (1000 * 60 * 60 * 24);

            if (timeframe === 'week') return daysDiff <= 7;
            if (timeframe === 'month') return daysDiff <= 30;
            if (timeframe === 'quarter') return daysDiff <= 90;
            if (timeframe === 'year') return daysDiff <= 365;
            return true;
        });

        let totalRevenue = 0;
        let totalCost = 0;
        let totalORCost = 0;
        let cosmeticRevenue = 0;
        let regularRevenue = 0;

        filteredSurgeries.forEach(surgery => {
            const isCosmeticSurgery = !surgery.cpt_codes || surgery.cpt_codes.length === 0;

            if (isCosmeticSurgery) {
                // Parse cosmetic fees from notes
                if (surgery.notes) {
                    const facilityMatch = surgery.notes.match(/Facility Fee: \$([\d,]+)/);
                    const anesthesiaMatch = surgery.notes.match(/Anesthesia: \$([\d,]+)/);
                    const facilityFee = facilityMatch ? parseInt(facilityMatch[1].replace(/,/g, '')) : 0;
                    const anesthesiaFee = anesthesiaMatch ? parseInt(anesthesiaMatch[1].replace(/,/g, '')) : 0;
                    const cosmeticTotal = facilityFee + anesthesiaFee;
                    cosmeticRevenue += cosmeticTotal;
                    totalRevenue += cosmeticTotal;
                }
            } else {
                // Regular surgery with CPT codes
                surgery.cpt_codes?.forEach(code => {
                    const cpt = cptCodes.find(c => c.code === code);
                    if (cpt) {
                        totalRevenue += parseFloat(cpt.reimbursement || 0);
                        totalCost += parseFloat(cpt.cost || 0);
                    }
                });

                // Add OR cost
                const orCost = calculateORCost(surgery.duration_minutes || 0);
                totalORCost += orCost;

                // Check for Self-Pay Anesthesia
                if (surgery.notes && surgery.notes.includes('Self-Pay Anesthesia')) {
                    const match = surgery.notes.match(/Self-Pay Anesthesia: \$([\d,]+)/);
                    if (match) {
                        totalORCost += parseFloat(match[1].replace(/,/g, ''));
                    }
                }

                regularRevenue += surgery.cpt_codes?.reduce((sum, code) => {
                    const cpt = cptCodes.find(c => c.code === code);
                    return sum + (cpt?.reimbursement || 0);
                }, 0) || 0;
            }
        });

        const profit = totalRevenue - totalCost - totalORCost;
        const profitMargin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;
        const avgRevenuePerSurgery = filteredSurgeries.length > 0 ? totalRevenue / filteredSurgeries.length : 0;
        const avgORCost = filteredSurgeries.length > 0 ? totalORCost / filteredSurgeries.length : 0;

        return {
            totalRevenue,
            totalCost,
            totalORCost,
            profit,
            profitMargin,
            surgeryCount: filteredSurgeries.length,
            avgRevenuePerSurgery,
            avgORCost,
            cosmeticRevenue,
            regularRevenue
        };
    }, [surgeries, cptCodes, timeframe]);

    // Category breakdown
    const categoryBreakdown = useMemo(() => {
        if (!surgeries || !cptCodes) return [];

        const categoryMap = {};

        surgeries.forEach(surgery => {
            surgery.cpt_codes?.forEach(code => {
                const cpt = cptCodes.find(c => c.code === code);
                if (cpt) {
                    if (!categoryMap[cpt.category]) {
                        categoryMap[cpt.category] = {
                            category: cpt.category,
                            revenue: 0,
                            cost: 0,
                            count: 0,
                            profit: 0
                        };
                    }
                    categoryMap[cpt.category].revenue += parseFloat(cpt.reimbursement || 0);
                    categoryMap[cpt.category].cost += parseFloat(cpt.cost || 0);
                    categoryMap[cpt.category].count += 1;
                    categoryMap[cpt.category].profit += parseFloat(cpt.reimbursement || 0) - parseFloat(cpt.cost || 0);
                }
            });
        });

        return Object.values(categoryMap).sort((a, b) => b.revenue - a.revenue);
    }, [surgeries, cptCodes]);

    // Surgeon performance
    const surgeonPerformance = useMemo(() => {
        if (!surgeries || !cptCodes || !surgeons) return [];

        const surgeonMap = {};

        surgeries.forEach(surgery => {
            const surgeonName = surgery.doctor_name;
            if (!surgeonMap[surgeonName]) {
                const surgeonData = surgeons.find(s => s.name === surgeonName);
                surgeonMap[surgeonName] = {
                    name: surgeonName,
                    specialty: surgeonData?.specialty || 'Unknown',
                    revenue: 0,
                    surgeryCount: 0,
                    avgRevenue: 0
                };
            }

            const isCosmeticSurgery = !surgery.cpt_codes || surgery.cpt_codes.length === 0;

            if (isCosmeticSurgery && surgery.notes) {
                const facilityMatch = surgery.notes.match(/Facility Fee: \$([\d,]+)/);
                const anesthesiaMatch = surgery.notes.match(/Anesthesia: \$([\d,]+)/);
                const facilityFee = facilityMatch ? parseInt(facilityMatch[1].replace(/,/g, '')) : 0;
                const anesthesiaFee = anesthesiaMatch ? parseInt(anesthesiaMatch[1].replace(/,/g, '')) : 0;
                surgeonMap[surgeonName].revenue += facilityFee + anesthesiaFee;
            } else {
                surgery.cpt_codes?.forEach(code => {
                    const cpt = cptCodes.find(c => c.code === code);
                    if (cpt) {
                        surgeonMap[surgeonName].revenue += parseFloat(cpt.reimbursement || 0);
                    }
                });
            }
            surgeonMap[surgeonName].surgeryCount += 1;
        });

        // Calculate average revenue
        Object.values(surgeonMap).forEach(surgeon => {
            surgeon.avgRevenue = surgeon.surgeryCount > 0 ? surgeon.revenue / surgeon.surgeryCount : 0;
        });

        return Object.values(surgeonMap).sort((a, b) => b.revenue - a.revenue);
    }, [surgeries, cptCodes, surgeons]);

    // Monthly trend data
    const monthlyTrend = useMemo(() => {
        if (!surgeries || !cptCodes) return [];

        const monthMap = {};

        surgeries.forEach(surgery => {
            const date = new Date(surgery.date);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

            if (!monthMap[monthKey]) {
                monthMap[monthKey] = {
                    month: monthKey,
                    revenue: 0,
                    count: 0
                };
            }

            const isCosmeticSurgery = !surgery.cpt_codes || surgery.cpt_codes.length === 0;

            if (isCosmeticSurgery && surgery.notes) {
                const facilityMatch = surgery.notes.match(/Facility Fee: \$([\d,]+)/);
                const anesthesiaMatch = surgery.notes.match(/Anesthesia: \$([\d,]+)/);
                const facilityFee = facilityMatch ? parseInt(facilityMatch[1].replace(/,/g, '')) : 0;
                const anesthesiaFee = anesthesiaMatch ? parseInt(anesthesiaMatch[1].replace(/,/g, '')) : 0;
                monthMap[monthKey].revenue += facilityFee + anesthesiaFee;
            } else {
                surgery.cpt_codes?.forEach(code => {
                    const cpt = cptCodes.find(c => c.code === code);
                    if (cpt) {
                        monthMap[monthKey].revenue += parseFloat(cpt.reimbursement || 0);
                    }
                });
            }
            monthMap[monthKey].count += 1;
        });

        return Object.values(monthMap).sort((a, b) => a.month.localeCompare(b.month)).slice(-6);
    }, [surgeries, cptCodes]);

    return (
        <div className="page-container fade-in">
            <div className="page-header">
                <div>
                    <h2 className="page-title">Financial Analytics</h2>
                    <p className="page-subtitle">Comprehensive revenue, cost, and performance insights</p>
                </div>
                <div className="timeframe-selector">
                    <button
                        className={`timeframe-btn ${timeframe === 'week' ? 'active' : ''}`}
                        onClick={() => setTimeframe('week')}
                    >
                        Week
                    </button>
                    <button
                        className={`timeframe-btn ${timeframe === 'month' ? 'active' : ''}`}
                        onClick={() => setTimeframe('month')}
                    >
                        Month
                    </button>
                    <button
                        className={`timeframe-btn ${timeframe === 'quarter' ? 'active' : ''}`}
                        onClick={() => setTimeframe('quarter')}
                    >
                        Quarter
                    </button>
                    <button
                        className={`timeframe-btn ${timeframe === 'year' ? 'active' : ''}`}
                        onClick={() => setTimeframe('year')}
                    >
                        Year
                    </button>
                    <button
                        className={`timeframe-btn ${timeframe === 'all' ? 'active' : ''}`}
                        onClick={() => setTimeframe('all')}
                    >
                        All Time
                    </button>
                </div>
            </div>

            {/* Key Metrics */}
            <div className="metrics-grid">
                <div className="metric-card revenue-card">
                    <div className="metric-icon">💰</div>
                    <div className="metric-info">
                        <div className="metric-label">Total Revenue</div>
                        <div className="metric-value">{formatCurrency(analytics.totalRevenue)}</div>
                        <div className="metric-detail">
                            {analytics.surgeryCount} surgeries
                        </div>
                    </div>
                </div>

                <div className="metric-card cost-card">
                    <div className="metric-icon">💸</div>
                    <div className="metric-info">
                        <div className="metric-label">Total Costs</div>
                        <div className="metric-value">{formatCurrency(analytics.totalCost + analytics.totalORCost)}</div>
                        <div className="metric-detail">
                            CPT: {formatCurrency(analytics.totalCost)} | OR: {formatCurrency(analytics.totalORCost)}
                        </div>
                    </div>
                </div>

                <div className="metric-card profit-card">
                    <div className="metric-icon">📈</div>
                    <div className="metric-info">
                        <div className="metric-label">Net Profit</div>
                        <div className="metric-value profit-value">{formatCurrency(analytics.profit)}</div>
                        <div className="metric-detail">
                            {analytics.profitMargin.toFixed(1)}% margin
                        </div>
                    </div>
                </div>

                <div className="metric-card avg-card">
                    <div className="metric-icon">💵</div>
                    <div className="metric-info">
                        <div className="metric-label">Avg Revenue/Surgery</div>
                        <div className="metric-value">{formatCurrency(analytics.avgRevenuePerSurgery)}</div>
                        <div className="metric-detail">
                            Avg OR Cost: {formatCurrency(analytics.avgORCost)}
                        </div>
                    </div>
                </div>

                <div className="metric-card cosmetic-card">
                    <div className="metric-icon">✨</div>
                    <div className="metric-info">
                        <div className="metric-label">Cosmetic Revenue</div>
                        <div className="metric-value">{formatCurrency(analytics.cosmeticRevenue)}</div>
                        <div className="metric-detail">
                            {analytics.totalRevenue > 0 ? ((analytics.cosmeticRevenue / analytics.totalRevenue) * 100).toFixed(1) : 0}% of total
                        </div>
                    </div>
                </div>

                <div className="metric-card regular-card">
                    <div className="metric-icon">⚕️</div>
                    <div className="metric-info">
                        <div className="metric-label">Regular Revenue</div>
                        <div className="metric-value">{formatCurrency(analytics.regularRevenue)}</div>
                        <div className="metric-detail">
                            {analytics.totalRevenue > 0 ? ((analytics.regularRevenue / analytics.totalRevenue) * 100).toFixed(1) : 0}% of total
                        </div>
                    </div>
                </div>
            </div>

            {/* Monthly Trend */}
            <div className="content-card trend-card" style={{ marginBottom: '2rem' }}>
                <div className="card-header">
                    <h3>📊 6-Month Revenue Trend</h3>
                </div>
                <div className="trend-container">
                    {monthlyTrend.map((month, idx) => {
                        const maxRevenue = Math.max(...monthlyTrend.map(m => m.revenue));
                        const heightPercent = maxRevenue > 0 ? (month.revenue / maxRevenue) * 100 : 0;
                        const monthName = new Date(month.month + '-01').toLocaleDateString('default', { month: 'short', year: '2-digit' });

                        return (
                            <div key={idx} className="trend-bar-wrapper">
                                <div className="trend-bar-container">
                                    <div
                                        className="trend-bar"
                                        style={{ height: `${heightPercent}%` }}
                                        title={`${monthName}: ${formatCurrency(month.revenue)}`}
                                    >
                                        <div className="trend-tooltip">
                                            {formatCurrency(month.revenue)}
                                            <div className="trend-count">{month.count} surgeries</div>
                                        </div>
                                    </div>
                                </div>
                                <div className="trend-label">{monthName}</div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Analysis Grid */}
            <div className="analysis-grid">
                {/* Category Breakdown */}
                <div className="content-card category-card">
                    <div className="card-header">
                        <h3>📋 Revenue by Category</h3>
                    </div>
                    <div className="chart-container">
                        {categoryBreakdown.map((category, idx) => {
                            const maxRevenue = Math.max(...categoryBreakdown.map(c => c.revenue));
                            const percentage = maxRevenue > 0 ? (category.revenue / maxRevenue) * 100 : 0;
                            const profitMargin = category.revenue > 0 ? ((category.profit / category.revenue) * 100).toFixed(1) : 0;

                            return (
                                <div key={idx} className="chart-row">
                                    <div className="chart-label">
                                        <span className="category-name">{category.category}</span>
                                        <span className="category-count">{category.count} procedures • {profitMargin}% margin</span>
                                    </div>
                                    <div className="chart-bar-container">
                                        <div
                                            className="chart-bar"
                                            style={{ width: `${percentage}%` }}
                                        >
                                            <div className="chart-bar-tooltip">
                                                Revenue: {formatCurrency(category.revenue)}
                                                <br />
                                                Profit: {formatCurrency(category.profit)}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="chart-value">
                                        {formatCurrency(category.revenue)}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Surgeon Performance */}
                <div className="content-card surgeon-card">
                    <div className="card-header">
                        <h3>👨‍⚕️ Surgeon Performance</h3>
                    </div>
                    <div className="surgeon-list">
                        {surgeonPerformance.map((surgeon, idx) => (
                            <div key={idx} className="surgeon-item">
                                <div className={`surgeon-rank rank-${idx + 1}`}>{idx + 1}</div>
                                <div className="surgeon-avatar">
                                    {surgeon.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                                </div>
                                <div className="surgeon-info">
                                    <div className="surgeon-name">{surgeon.name}</div>
                                    <div className="surgeon-subtext">
                                        {surgeon.specialty} • {surgeon.surgeryCount} surgeries • Avg: {formatCurrency(surgeon.avgRevenue)}
                                    </div>
                                </div>
                                <div className="surgeon-revenue">
                                    {formatCurrency(surgeon.revenue)}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CostAnalysis;
