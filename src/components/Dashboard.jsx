import React, { useState, useEffect } from 'react';
import { db } from '../lib/supabase';
import { calculateORCost, calculateMedicareRevenue, formatCurrency, getSurgeryMetrics, isDateInRange } from '../utils/hospitalUtils';
import AIAnalystModal from './AIAnalystModal';
import './Dashboard.css';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import Swal from 'sweetalert2';
import emailjs from '@emailjs/browser';

// EmailJS Configuration
const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || 'service_1uqpug2';
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || 'template_7bwe5or';
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || 'kemMSpgMmsNS0Hcu5';

const Dashboard = ({ surgeries, cptCodes, settings, procedureGroupItems = [] }) => {
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [isAIModalOpen, setIsAIModalOpen] = useState(false);
    const [timeframe, setTimeframe] = useState('daily'); // daily, weekly, monthly
    const [outcomeView, setOutcomeView] = useState('all'); // all, daily
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
    const [topSurgeons, setTopSurgeons] = useState({
        daily: null,
        weekly: null,
        monthly: null
    });
    const [utilizationData, setUtilizationData] = useState([]);
    const [includeLaborSupplies, setIncludeLaborSupplies] = useState(false);

    const [isExporting, setIsExporting] = useState(false);


    // Outcome Analysis State
    const [outcomeData, setOutcomeData] = useState({
        completed: 0,
        scheduled: 0,
        rescheduled: 0,
        cancelled: 0,
        total: 0
    });


    // Email Modal State
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [emailAddress, setEmailAddress] = useState('');
    const [isSendingEmail, setIsSendingEmail] = useState(false);

    useEffect(() => {
        // Initialize EmailJS
        emailjs.init(EMAILJS_PUBLIC_KEY);
    }, []);

    useEffect(() => {
        const calculateStats = (filteredSurgeries) => {
            let totalRevenue = 0;
            let totalCost = 0;
            const usage = {};
            const perCaseData = [];

            filteredSurgeries.forEach(surgery => {
                const metrics = getSurgeryMetrics(surgery, cptCodes, settings, procedureGroupItems);

                if (!includeLaborSupplies) {
                    // Logic for Room + CPT only
                    metrics.netProfit = metrics.netProfit + metrics.laborCost + metrics.supplyCosts + metrics.internalRoomCost;
                    metrics.netProfit = metrics.netProfit - metrics.supplyCosts;
                    metrics.totalRevenue = metrics.totalRevenue - metrics.supplyCosts;
                    metrics.laborCost = 0;
                    metrics.supplyCosts = 0;
                    metrics.internalRoomCost = 0;
                }

                totalRevenue += metrics.totalRevenue;
                totalCost += (metrics.internalRoomCost + metrics.laborCost + metrics.supplyCosts);

                const codes = surgery.cpt_codes || surgery.cptCodes || [];
                codes.forEach(code => {
                    usage[code] = (usage[code] || 0) + 1;
                });

                perCaseData.push({
                    id: surgery.id,
                    revenue: metrics.totalRevenue,
                    cost: metrics.internalRoomCost + metrics.laborCost + metrics.supplyCosts,
                    laborCost: metrics.laborCost,
                    suppliesCost: metrics.supplyCosts,
                    profit: metrics.netProfit
                });
            });

            return {
                revenue: totalRevenue,
                cost: totalCost,
                profit: totalRevenue - totalCost,
                usage,
                perCaseData
            };
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

        // Filter Surgeries using string-based comparison to avoid timezone issues
        const currentSurgeries = surgeries.filter(s => {
            return isDateInRange(s.date,
                currentStart.toISOString().split('T')[0],
                currentEnd.toISOString().split('T')[0]
            );
        });

        const prevSurgeries = surgeries.filter(s => {
            return isDateInRange(s.date,
                prevStart.toISOString().split('T')[0],
                prevEnd.toISOString().split('T')[0]
            );
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

        // Update Outcome Stats
        const getRelevantSurgeries = () => {
            if (outcomeView === 'daily') {
                return surgeries.filter(s => {
                    const sDate = new Date(s.date).toISOString().split('T')[0];
                    return sDate === selectedDate;
                });
            }
            return surgeries;
        };

        const relevantOutcomeSurgeries = getRelevantSurgeries();

        setOutcomeData({
            completed: relevantOutcomeSurgeries.filter(s => s.status === 'completed').length,
            scheduled: relevantOutcomeSurgeries.filter(s => s.status === 'scheduled').length,
            rescheduled: relevantOutcomeSurgeries.filter(s => s.status === 'rescheduled').length,
            cancelled: relevantOutcomeSurgeries.filter(s => s.status === 'cancelled').length,
            total: relevantOutcomeSurgeries.length
        });

        setChartData(currentStats.perCaseData);

        // Calculate Top Surgeons for all timeframes independent of selected view
        // Calculate Top Surgeons for all timeframes independent of selected view
        const calculateTopSurgeon = (subset) => {
            const profits = {};
            subset.forEach(s => {
                const name = s.doctor_name || 'Unknown';
                const metrics = getSurgeryMetrics(s, cptCodes, settings, procedureGroupItems);

                if (!includeLaborSupplies) {
                    metrics.netProfit = metrics.netProfit + metrics.laborCost + metrics.supplyCosts + metrics.internalRoomCost;
                    metrics.netProfit = metrics.netProfit - metrics.supplyCosts;
                }

                profits[name] = (profits[name] || 0) + metrics.netProfit;
            });

            let top = null;
            let max = -Infinity;
            Object.entries(profits).forEach(([name, profit]) => {
                if (profit > max) {
                    max = profit;
                    top = { name, profit };
                }
            });
            return top;
        };

        const dateObj = new Date(selectedDate);

        // Daily Range for Top Surgeon
        const dStart = new Date(dateObj); dStart.setHours(0, 0, 0, 0);
        const dEnd = new Date(dateObj); dEnd.setHours(23, 59, 59, 999);

        // Weekly Range for Top Surgeon
        const wStart = new Date(dateObj); wStart.setDate(dateObj.getDate() - dateObj.getDay()); wStart.setHours(0, 0, 0, 0);
        const wEnd = new Date(wStart); wEnd.setDate(wStart.getDate() + 6); wEnd.setHours(23, 59, 59, 999);

        // Monthly Range for Top Surgeon
        const mStart = new Date(dateObj.getFullYear(), dateObj.getMonth(), 1); mStart.setHours(0, 0, 0, 0);
        const mEnd = new Date(dateObj.getFullYear(), dateObj.getMonth() + 1, 0); mEnd.setHours(23, 59, 59, 999);

        const dailySurgs = surgeries.filter(s => isDateInRange(s.date, selectedDate, selectedDate));
        const weeklySurgs = surgeries.filter(s => isDateInRange(s.date,
            wStart.toISOString().split('T')[0],
            wEnd.toISOString().split('T')[0]
        ));
        const monthlySurgs = surgeries.filter(s => isDateInRange(s.date,
            mStart.toISOString().split('T')[0],
            mEnd.toISOString().split('T')[0]
        ));

        setTopSurgeons({
            daily: calculateTopSurgeon(dailySurgs),
            weekly: calculateTopSurgeon(weeklySurgs),
            monthly: calculateTopSurgeon(monthlySurgs)
        });

        // Calculate Utilization for Pie Chart (Current View)
        const calculateUtilization = (subset) => {
            const util = {};
            const counts = {};
            let totalMinutes = 0;

            subset.filter(s => s.status !== 'cancelled').forEach(s => {
                const name = s.doctor_name || 'Unknown';
                // Prioritize actual duration logged after completion
                const duration = parseFloat(s.actual_duration_minutes || s.duration_minutes || s.durationMinutes || 0);

                let turnover = parseFloat(s.turnover_time || s.turnoverTime || 0);
                // Fallback: Calculate turnover from CPT codes if not stored on surgery
                if (turnover === 0) {
                    const codes = s.cpt_codes || s.cptCodes || [];
                    if (codes.length > 0) {
                        codes.forEach(code => {
                            const cpt = cptCodes.find(c => String(c.code) === String(code));
                            if (cpt) {
                                turnover += parseFloat(cpt.turnover_time || cpt.turnoverTime || 0);
                            }
                        });
                    }
                }

                const totalDuration = duration + turnover;
                util[name] = (util[name] || 0) + totalDuration;
                counts[name] = (counts[name] || 0) + 1;
                totalMinutes += totalDuration;
            });

            return Object.entries(util).map(([name, minutes]) => ({
                name,
                value: minutes,
                count: counts[name],
                percentage: totalMinutes > 0 ? (minutes / totalMinutes) * 100 : 0,
                color: generateColor(name) // Helper to generate consistent colors
            })).sort((a, b) => b.value - a.value);
        };

        setUtilizationData(calculateUtilization(currentSurgeries));

    }, [surgeries, selectedDate, cptCodes, timeframe, outcomeView, includeLaborSupplies]);

    // Helper for consistent colors
    const generateColor = (str) => {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
        return '#' + '00000'.substring(0, 6 - c.length) + c;
    };

    const generatePDF = () => {
        const doc = new jsPDF();

        // Title
        doc.setFontSize(20);
        doc.text('Financial Dashboard Report', 14, 22);

        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(`Date: ${selectedDate} | View: ${timeframe.charAt(0).toUpperCase() + timeframe.slice(1)}`, 14, 30);

        // 1. Financial Summary
        doc.setFontSize(14);
        doc.setTextColor(0);
        doc.text('Financial Summary', 14, 45);

        autoTable(doc, {
            startY: 50,
            head: [['Metric', 'Value']],
            body: [
                ['Total Revenue', formatCurrency(stats.totalRevenue)],
                ['Total Cost', formatCurrency(stats.totalCost)],
                ['Net Profit', formatCurrency(stats.netProfit)],
                ['Total Surgeries', stats.totalSurgeries.toString()]
            ],
            theme: 'striped',
            headStyles: { fillColor: [41, 128, 185] }
        });

        // 2. Top Surgeons
        let finalY = doc.lastAutoTable.finalY + 15;
        doc.text('Top Performing Surgeons', 14, finalY);

        autoTable(doc, {
            startY: finalY + 5,
            head: [['Timeframe', 'Surgeon Name', 'Profit']],
            body: [
                ['Daily', topSurgeons.daily ? topSurgeons.daily.name : 'N/A', topSurgeons.daily ? formatCurrency(topSurgeons.daily.profit) : '-'],
                ['Weekly', topSurgeons.weekly ? topSurgeons.weekly.name : 'N/A', topSurgeons.weekly ? formatCurrency(topSurgeons.weekly.profit) : '-'],
                ['Monthly', topSurgeons.monthly ? topSurgeons.monthly.name : 'N/A', topSurgeons.monthly ? formatCurrency(topSurgeons.monthly.profit) : '-']
            ],
            theme: 'grid',
            headStyles: { fillColor: [39, 174, 96] }
        });

        // 3. OR Utilization
        finalY = doc.lastAutoTable.finalY + 15;
        doc.text('OR Utilization', 14, finalY);

        const utilizationRows = utilizationData.map(u => [u.name, `${u.value} mins`, `${u.percentage.toFixed(1)}%`]);

        autoTable(doc, {
            startY: finalY + 5,
            head: [['Surgeon', 'Total Minutes', 'Percentage']],
            body: utilizationRows.length > 0 ? utilizationRows : [['No data', '-', '-']],
            theme: 'striped'
        });

        // 4. Case Detail
        finalY = doc.lastAutoTable.finalY + 15;
        // Check if we need a new page
        if (finalY > 250) {
            doc.addPage();
            finalY = 20;
        }

        doc.text('Case Profitability Detail', 14, finalY);

        const caseRows = chartData.map((c, index) => [
            `Case #${index + 1}`,
            formatCurrency(c.revenue),
            formatCurrency(c.cost),
            formatCurrency(c.profit)
        ]);

        autoTable(doc, {
            startY: finalY + 5,
            head: [['Case ID', 'Revenue', 'Cost', 'Profit']],
            body: caseRows.length > 0 ? caseRows : [['No surgeries', '-', '-', '-']],
            theme: 'striped',
            headStyles: { fillColor: [142, 68, 173] }
        });

        return doc;
    };

    const handleExport = () => {
        setIsExporting(true);
        try {
            const doc = generatePDF();
            doc.save(`financial_report_${selectedDate}.pdf`);
        } catch (error) {
            console.error('Export failed:', error);
            Swal.fire('Error', 'Failed to generate PDF report.', 'error');
        } finally {
            setIsExporting(false);
        }
    };

    const handleEmailClick = () => {
        setShowEmailModal(true);
    };

    const handleSendEmail = async () => {
        if (!emailAddress || !emailAddress.includes('@')) {
            Swal.fire('Invalid Email', 'Please enter a valid email address.', 'warning');
            return;
        }

        if (EMAILJS_SERVICE_ID === 'YOUR_SERVICE_ID') {
            Swal.fire({
                title: 'Configuration Required',
                html: `
                    <p>To send real emails, you need to configure EmailJS.</p>
                    <p>1. Sign up at <a href="https://www.emailjs.com" target="_blank">emailjs.com</a> (it's free).</p>
                    <p>2. Create a Service and a Template.</p>
                    <p>3. Update the keys in <b>Dashboard.jsx</b> (lines 8-10).</p>
                    <br/>
                    <p><i>For now, the PDF has been downloaded to your computer.</i></p>
                `,
                icon: 'info',
                confirmButtonColor: '#3b82f6'
            });
            // Fallback to download
            const doc = generatePDF();
            doc.save(`financial_report_${selectedDate}.pdf`);
            return;
        }

        setIsSendingEmail(true);
        try {
            // 1. Generate PDF as Base64
            const doc = generatePDF();
            const pdfBase64 = doc.output('datauristring').split(',')[1]; // Remove data:application/pdf;base64, prefix

            // 2. Send via EmailJS
            const templateParams = {
                to_email: emailAddress,
                date: selectedDate,
                total_revenue: formatCurrency(stats.totalRevenue),
                net_profit: formatCurrency(stats.netProfit),
                content: pdfBase64 // Ensure your EmailJS template has an attachment field mapped to this
            };

            await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams);

            setShowEmailModal(false);
            setEmailAddress('');

            Swal.fire({
                title: 'Sent!',
                text: `The financial report has been successfully sent to ${emailAddress}`,
                icon: 'success',
                confirmButtonColor: '#3b82f6'
            });

        } catch (error) {
            console.error('Email failed:', error);
            Swal.fire('Error', 'Failed to send email. Check your EmailJS configuration.', 'error');
        } finally {
            setIsSendingEmail(false);
        }
    };

    return (
        <div className="dashboard fade-in">
            <AIAnalystModal
                isOpen={isAIModalOpen}
                onClose={() => setIsAIModalOpen(false)}
                surgeries={surgeries}
                cptCodes={cptCodes}
                settings={settings}
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '1rem', background: 'white', padding: '6px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                        <input
                            type="checkbox"
                            id="dashboard-toggle-costs"
                            checked={includeLaborSupplies}
                            onChange={(e) => setIncludeLaborSupplies(e.target.checked)}
                            style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                        />
                        <label htmlFor="dashboard-toggle-costs" style={{ fontSize: '0.85rem', color: '#64748b', cursor: 'pointer', fontWeight: '600', whiteSpace: 'nowrap' }}>
                            Include Labor/Supplies
                        </label>
                    </div>
                </div>
                <div className="header-actions">
                    <button className="btn-action" onClick={handleExport} disabled={isExporting}>
                        {isExporting ? '⏳ Exporting...' : '📥 Export PDF'}
                    </button>
                    <button className="btn-action" onClick={handleEmailClick}>
                        📧 Email Report
                    </button>
                    <button className="btn-ai" onClick={() => setIsAIModalOpen(true)}>
                        ✨ Ask ASC Analyst
                    </button>
                </div>
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
                                <span className="mini-stat-label">Cases {timeframe === 'daily' ? 'Today' : timeframe === 'weekly' ? 'This Week' : 'This Month'}</span>
                                <span className="mini-stat-value">{stats.totalSurgeries}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Top Surgeons Section */}
                <div className="top-surgeons-section">
                    <h3 className="section-title">🏆 Most Profitable Surgeons</h3>
                    <div className="top-surgeons-grid">
                        <div className="top-surgeon-card">
                            <div className="ts-header">Daily Top Performer</div>
                            {topSurgeons.daily ? (
                                <div className="ts-content">
                                    <div className="ts-name">{topSurgeons.daily.name}</div>
                                    <div className={`ts-profit ${topSurgeons.daily.profit >= 0 ? 'positive' : 'negative'}`}>
                                        {topSurgeons.daily.profit > 0 ? '+' : ''}{formatCurrency(topSurgeons.daily.profit)}
                                    </div>
                                </div>
                            ) : <div className="ts-empty">No surgeries today</div>}
                        </div>
                        <div className="top-surgeon-card">
                            <div className="ts-header">Weekly Top Performer</div>
                            {topSurgeons.weekly ? (
                                <div className="ts-content">
                                    <div className="ts-name">{topSurgeons.weekly.name}</div>
                                    <div className={`ts-profit ${topSurgeons.weekly.profit >= 0 ? 'positive' : 'negative'}`}>
                                        {topSurgeons.weekly.profit > 0 ? '+' : ''}{formatCurrency(topSurgeons.weekly.profit)}
                                    </div>
                                </div>
                            ) : <div className="ts-empty">No surgeries this week</div>}
                        </div>
                        <div className="top-surgeon-card">
                            <div className="ts-header">Monthly Top Performer</div>
                            {topSurgeons.monthly ? (
                                <div className="ts-content">
                                    <div className="ts-name">{topSurgeons.monthly.name}</div>
                                    <div className={`ts-profit ${topSurgeons.monthly.profit >= 0 ? 'positive' : 'negative'}`}>
                                        {topSurgeons.monthly.profit > 0 ? '+' : ''}{formatCurrency(topSurgeons.monthly.profit)}
                                    </div>
                                </div>
                            ) : <div className="ts-empty">No surgeries this month</div>}
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
                                                #10b981 0% ${Math.max(0, (stats.netProfit / stats.totalRevenue) * 100)}%,
                                                #ef4444 ${Math.max(0, (stats.netProfit / stats.totalRevenue) * 100)}% 100%
                                            )`
                                        }}
                                    >
                                        <div className="donut-hole">
                                            <div className="donut-center-text">
                                                <span className="donut-label">Margin</span>
                                                <span className="donut-value">
                                                    {stats.totalRevenue > 0 ? Math.round((stats.netProfit / stats.totalRevenue) * 100) : 0}%
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

                {/* OR Utilization Chart */}
                <div className="pie-charts-grid">
                    {/* OR Utilization Chart */}
                    <div className="chart-card utilization-chart-card">
                        <div className="chart-header">
                            <h3>OR Utilization by Surgeon ({timeframe})</h3>
                        </div>
                        <div className="utilization-chart-container">
                            {utilizationData.length === 0 ? (
                                <div className="empty-chart-state">No surgeries for this period</div>
                            ) : (
                                <div className="pie-chart-wrapper">
                                    <div
                                        className="pie-chart"
                                        style={{
                                            background: `conic-gradient(${utilizationData.reduce((acc, item, index) => {
                                                const prevPerc = index === 0 ? 0 : utilizationData.slice(0, index).reduce((p, i) => p + i.percentage, 0);
                                                return `${acc}${index > 0 ? ',' : ''} ${item.color} ${prevPerc}% ${prevPerc + item.percentage}%`;
                                            }, '')
                                                })`
                                        }}
                                    ></div>
                                    <div className="chart-legend-grid">
                                        {utilizationData.map((item, index) => (
                                            <div key={index} className="legend-item">
                                                <span className="legend-dot" style={{ background: item.color }}></span>
                                                <div className="legend-info">
                                                    <span className="legend-name">{item.name}</span>
                                                    <span className="legend-val">{Math.round(item.percentage)}% ({item.value} mins | {item.count} {item.count === 1 ? 'case' : 'cases'})</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Surgery Outcome Analysis Chart (New) */}
                    <div className="chart-card utilization-chart-card">
                        <div className="chart-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                                <h3>Outcome Analysis ({outcomeView === 'all' ? 'All Time' : 'Daily'})</h3>
                                <select
                                    className="filter-select"
                                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.85rem' }}
                                    value={outcomeView}
                                    onChange={(e) => setOutcomeView(e.target.value)}
                                >
                                    <option value="all">All Time</option>
                                    <option value="daily">Daily</option>
                                </select>
                            </div>
                        </div>
                        <div className="utilization-chart-container">
                            {outcomeData.total === 0 ? (
                                <div className="empty-chart-state">No surgeries for this period</div>
                            ) : (
                                <div className="pie-chart-wrapper">
                                    <div
                                        className="pie-chart"
                                        style={{
                                            background: `conic-gradient(
                                                #10b981 0% ${(outcomeData.completed / outcomeData.total) * 100}%, 
                                                #3b82f6 ${(outcomeData.completed / outcomeData.total) * 100}% ${((outcomeData.completed + outcomeData.scheduled) / outcomeData.total) * 100}%, 
                                                #f59e0b ${((outcomeData.completed + outcomeData.scheduled) / outcomeData.total) * 100}% ${((outcomeData.completed + outcomeData.scheduled + outcomeData.rescheduled) / outcomeData.total) * 100}%, 
                                                #dc2626 ${((outcomeData.completed + outcomeData.scheduled + outcomeData.rescheduled) / outcomeData.total) * 100}% 100%
                                            )`
                                        }}
                                    >
                                        {/* Donut Hole */}
                                        <div className="donut-hole" style={{ width: '50%', height: '50%', background: '#fff', borderRadius: '50%', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                            <span style={{ fontSize: '1.5rem', fontWeight: '800', color: '#1e293b', lineHeight: '1' }}>{outcomeData.total}</span>
                                            <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Cases</span>
                                        </div>
                                    </div>

                                    <div className="chart-legend-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                                        <div className="legend-item">
                                            <span className="legend-dot" style={{ background: '#10b981' }}></span>
                                            <div className="legend-info">
                                                <span className="legend-name">Completed</span>
                                                <span className="legend-val">{outcomeData.completed}</span>
                                            </div>
                                        </div>
                                        <div className="legend-item">
                                            <span className="legend-dot" style={{ background: '#3b82f6' }}></span>
                                            <div className="legend-info">
                                                <span className="legend-name">Scheduled</span>
                                                <span className="legend-val">{outcomeData.scheduled}</span>
                                            </div>
                                        </div>
                                        <div className="legend-item">
                                            <span className="legend-dot" style={{ background: '#f59e0b' }}></span>
                                            <div className="legend-info">
                                                <span className="legend-name">Rescheduled</span>
                                                <span className="legend-val">{outcomeData.rescheduled}</span>
                                            </div>
                                        </div>
                                        <div className="legend-item">
                                            <span className="legend-dot" style={{ background: '#dc2626' }}></span>
                                            <div className="legend-info">
                                                <span className="legend-name">Cancelled</span>
                                                <span className="legend-val">{outcomeData.cancelled}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            {/* Email Report Modal */}
            {showEmailModal && (
                <div className="email-modal-overlay" onClick={() => setShowEmailModal(false)}>
                    <div className="email-modal-content" onClick={e => e.stopPropagation()}>
                        <div className="email-modal-header">
                            <h3 className="email-modal-title">Email Financial Report</h3>
                            <p className="email-modal-desc">
                                Enter the recipient's email address to send the PDF report for {selectedDate}.
                            </p>
                        </div>

                        <div className="email-input-group">
                            <label className="email-input-label">Recipient Email</label>
                            <input
                                type="email"
                                className="email-input"
                                placeholder="doctor@example.com"
                                value={emailAddress}
                                onChange={(e) => setEmailAddress(e.target.value)}
                                autoFocus
                            />
                        </div>

                        <div className="email-modal-actions">
                            <button
                                className="btn-cancel"
                                onClick={() => setShowEmailModal(false)}
                                disabled={isSendingEmail}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn-send"
                                onClick={handleSendEmail}
                                disabled={isSendingEmail}
                            >
                                {isSendingEmail ? 'Sending...' : 'Send Report'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
