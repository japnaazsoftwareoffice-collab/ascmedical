import React, { useState, useEffect } from 'react';
import { calculateORCost, formatCurrency } from '../utils/hospitalUtils';
import AIAnalystModal from './AIAnalystModal';
import './Dashboard.css';

const Dashboard = ({ surgeries, cptCodes }) => {
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [isAIModalOpen, setIsAIModalOpen] = useState(false);
    const [timeframe, setTimeframe] = useState('daily'); // daily, weekly, monthly
    const [stats, setStats] = useState({
        totalSurgeries: 0,
        totalRevenue: 0,
        totalCost: 0,
        netProfit: 0,
        cptUsage: {},
        revenueChange: 0,
        profitChange: 0
    });
    const [chartData, setChartData] = useState([]);

    useEffect(() => {
        const calculateStats = (filteredSurgeries) => {
            let revenue = 0;
            let cost = 0;
            const usage = {};
            const perCaseData = [];

            filteredSurgeries.forEach(surgery => {
                // Calculate Cost
                const duration = surgery.duration_minutes || surgery.durationMinutes || 0;
                const caseCost = calculateORCost(duration);
                cost += caseCost;

                // Calculate Revenue
                let caseRevenue = 0;
                const codes = surgery.cpt_codes || surgery.cptCodes || [];
                codes.forEach(code => {
                    const cpt = cptCodes.find(c => c.code === code);
                    if (cpt) {
                        caseRevenue += cpt.reimbursement;
                    }
                    usage[code] = (usage[code] || 0) + 1;
                });
                revenue += caseRevenue;

                perCaseData.push({
                    id: surgery.id,
                    revenue: caseRevenue,
                    cost: caseCost,
                    profit: caseRevenue - caseCost
                });
            });

            return { revenue, cost, profit: revenue - cost, usage, perCaseData };
        };

        const now = new Date(selectedDate);
        let currentStart, currentEnd, prevStart, prevEnd;

        // Determine Date Ranges
        if (timeframe === 'daily') {
            currentStart = new Date(now);
            currentEnd = new Date(now);

            prevStart = new Date(now);
            prevStart.setDate(now.getDate() - 1);
            prevEnd = new Date(prevStart);
        } else if (timeframe === 'weekly') {
            currentStart = new Date(now);
            currentStart.setDate(now.getDate() - now.getDay()); // Sunday
            currentEnd = new Date(currentStart);
            currentEnd.setDate(currentStart.getDate() + 6); // Saturday

            prevStart = new Date(currentStart);
            prevStart.setDate(currentStart.getDate() - 7);
            prevEnd = new Date(prevStart);
            prevEnd.setDate(prevStart.getDate() + 6);
        } else if (timeframe === 'monthly') {
            currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
            currentEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

            prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            prevEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        }

        // Filter Surgeries
        const currentSurgeries = surgeries.filter(s => {
            const d = new Date(s.date);
            // Reset times for accurate date comparison
            d.setHours(0, 0, 0, 0);
            const start = new Date(currentStart); start.setHours(0, 0, 0, 0);
            const end = new Date(currentEnd); end.setHours(23, 59, 59, 999);
            return d >= start && d <= end;
        });

        const prevSurgeries = surgeries.filter(s => {
            const d = new Date(s.date);
            d.setHours(0, 0, 0, 0);
            const start = new Date(prevStart); start.setHours(0, 0, 0, 0);
            const end = new Date(prevEnd); end.setHours(23, 59, 59, 999);
            return d >= start && d <= end;
        });

        // Calculate Stats
        const currentStats = calculateStats(currentSurgeries);
        const prevStats = calculateStats(prevSurgeries);

        // Calculate Changes
        const calculateChange = (current, previous) => {
            if (previous === 0) return current > 0 ? 100 : 0;
            return ((current - previous) / previous) * 100;
        };

        setStats({
            totalSurgeries: currentSurgeries.length,
            totalRevenue: currentStats.revenue,
            totalCost: currentStats.cost,
            netProfit: currentStats.profit,
            cptUsage: currentStats.usage,
            revenueChange: calculateChange(currentStats.revenue, prevStats.revenue),
            profitChange: calculateChange(currentStats.profit, prevStats.profit)
        });

        setChartData(currentStats.perCaseData);

    }, [surgeries, selectedDate, cptCodes, timeframe]);

    return (
        <div className="dashboard fade-in">
            <AIAnalystModal
                isOpen={isAIModalOpen}
                onClose={() => setIsAIModalOpen(false)}
                surgeries={surgeries}
                cptCodes={cptCodes}
            />

            <div className="dashboard-header">
                <div className="header-left">
                    <h2 className="page-title">Dashboard</h2>
                    <div className="date-picker">
                        <span className="icon">📅</span>
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="date-input"
                        />
                    </div>
                </div>
                <button className="btn-ai" onClick={() => setIsAIModalOpen(true)}>
                    ✨ Ask ASC Analyst
                </button>
            </div>

            <div className="dashboard-content">
                {/* Hero Stats Row */}
                <div className="stats-hero">
                    <div className="hero-card revenue-hero">
                        <div className="hero-icon-wrapper">
                            <span className="hero-icon">💰</span>
                        </div>
                        <div className="hero-content">
                            <span className="hero-label">Total Revenue</span>
                            <span className="hero-value">{formatCurrency(stats.totalRevenue)}</span>
                            <span className={`hero-trend ${stats.revenueChange >= 0 ? 'positive' : 'negative'}`}>
                                {stats.revenueChange >= 0 ? '↗' : '↘'} {stats.revenueChange > 0 ? '+' : ''}{stats.revenueChange.toFixed(1)}%
                            </span>
                        </div>
                        <div className="hero-bg-pattern"></div>
                    </div>

                    <div className="hero-card profit-hero">
                        <div className="hero-icon-wrapper">
                            <span className="hero-icon">📈</span>
                        </div>
                        <div className="hero-content">
                            <span className="hero-label">Net Profit</span>
                            <span className="hero-value">{formatCurrency(stats.netProfit)}</span>
                            <span className={`hero-trend ${stats.profitChange >= 0 ? 'positive' : 'negative'}`}>
                                {stats.profitChange >= 0 ? '↗' : '↘'} {stats.profitChange > 0 ? '+' : ''}{stats.profitChange.toFixed(1)}%
                            </span>
                        </div>
                        <div className="hero-bg-pattern"></div>
                    </div>

                    <div className="mini-stats-column">
                        <div className="mini-stat-card">
                            <div className="mini-stat-icon cost">📉</div>
                            <div className="mini-stat-info">
                                <span className="mini-stat-label">Total Cost</span>
                                <span className="mini-stat-value">{formatCurrency(stats.totalCost)}</span>
                            </div>
                        </div>
                        <div className="mini-stat-card">
                            <div className="mini-stat-icon cases">🏥</div>
                            <div className="mini-stat-info">
                                <span className="mini-stat-label">Cases Today</span>
                                <span className="mini-stat-value">{stats.totalSurgeries}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="dashboard-grid">
                    {/* Diverging Bar Chart: Profit vs Loss */}
                    <div className="chart-card wide-chart">
                        <div className="chart-header">
                            <h3>Case Profitability Analysis</h3>
                            <div className="chart-actions">
                                <button
                                    className={`chart-action-btn ${timeframe === 'daily' ? 'active' : ''}`}
                                    onClick={() => setTimeframe('daily')}
                                >
                                    Daily
                                </button>
                                <button
                                    className={`chart-action-btn ${timeframe === 'weekly' ? 'active' : ''}`}
                                    onClick={() => setTimeframe('weekly')}
                                >
                                    Weekly
                                </button>
                                <button
                                    className={`chart-action-btn ${timeframe === 'monthly' ? 'active' : ''}`}
                                    onClick={() => setTimeframe('monthly')}
                                >
                                    Monthly
                                </button>
                            </div>
                        </div>
                        <div className="diverging-chart-container">
                            {chartData.length === 0 ? (
                                <div className="empty-chart-state">
                                    <span>No surgeries scheduled for this date</span>
                                </div>
                            ) : (
                                chartData.map((data, index) => {
                                    const maxVal = Math.max(...chartData.map(d => Math.abs(d.profit)), 1000); // Avoid div by zero
                                    const percentage = (data.profit / maxVal) * 100;
                                    const isPositive = data.profit >= 0;

                                    return (
                                        <div key={index} className="diverging-bar-row">
                                            <div className="bar-label">Case #{index + 1}</div>
                                            <div className="bar-track">
                                                <div
                                                    className={`bar-fill ${isPositive ? 'positive' : 'negative'}`}
                                                    style={{
                                                        width: `${Math.abs(percentage) / 2}%`,
                                                        left: isPositive ? '50%' : `calc(50% - ${Math.abs(percentage) / 2}%)`
                                                    }}
                                                >
                                                    <span className="bar-tooltip">
                                                        {formatCurrency(data.profit)}
                                                    </span>
                                                </div>
                                                <div className="center-line"></div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Donut Chart: Financial Composition */}
                    <div className="chart-card donut-chart-card">
                        <div className="chart-header">
                            <h3>Financial Composition</h3>
                        </div>
                        <div className="donut-chart-container">
                            {stats.totalRevenue === 0 ? (
                                <div className="empty-chart-state">No data</div>
                            ) : (
                                <>
                                    <div
                                        className="donut-chart"
                                        style={{
                                            background: `conic-gradient(
                                                #10b981 0% ${(stats.netProfit / stats.totalRevenue) * 100}%,
                                                #ef4444 ${(stats.netProfit / stats.totalRevenue) * 100}% 100%
                                            )`
                                        }}
                                    >
                                        <div className="donut-hole">
                                            <div className="donut-center-text">
                                                <span className="donut-label">Margin</span>
                                                <span className="donut-value">
                                                    {Math.round((stats.netProfit / stats.totalRevenue) * 100)}%
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="chart-legend-vertical">
                                        <div className="legend-item">
                                            <span className="legend-dot profit"></span>
                                            <div className="legend-info">
                                                <span className="legend-name">Net Profit</span>
                                                <span className="legend-val">{formatCurrency(stats.netProfit)}</span>
                                            </div>
                                        </div>
                                        <div className="legend-item">
                                            <span className="legend-dot cost"></span>
                                            <div className="legend-info">
                                                <span className="legend-name">Op. Costs</span>
                                                <span className="legend-val">{formatCurrency(stats.totalCost)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
