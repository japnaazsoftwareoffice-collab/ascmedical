import React, { useState, useEffect } from 'react';
import { db } from '../lib/supabase';
import { calculateORCost, calculateMedicareRevenue, formatCurrency } from '../utils/hospitalUtils';
import AIAnalystModal from './AIAnalystModal';
import './Dashboard.css';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import Swal from 'sweetalert2';
import emailjs from '@emailjs/browser';

// EmailJS Configuration (Replace with your actual keys from emailjs.com)
const EMAILJS_SERVICE_ID = 'service_1uqpug2';
const EMAILJS_TEMPLATE_ID = 'template_7bwe5or';
const EMAILJS_PUBLIC_KEY = 'kemMSpgMmsNS0Hcu5';

const Dashboard = ({ surgeries, cptCodes, settings }) => {
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
    const [topSurgeons, setTopSurgeons] = useState({
        daily: null,
        weekly: null,
        monthly: null
    });
    const [utilizationData, setUtilizationData] = useState([]);

    const [isExporting, setIsExporting] = useState(false);

    // Block Schedule State
    const [blockSchedule, setBlockSchedule] = useState([]);
    const [blockStats, setBlockStats] = useState([]); // [{name, value, percentage, color}]
    const [selectedRoom, setSelectedRoom] = useState('All'); // 'All' or specific room name
    const ROOMS = ['OR 1', 'OR 2', 'OR 3', 'OR 4', 'Procedure Room'];
    const DAILY_CAPACITY_PER_ROOM = 480; // 8 hours (07:00 - 15:00)


    // Email Modal State
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [emailAddress, setEmailAddress] = useState('');
    const [isSendingEmail, setIsSendingEmail] = useState(false);

    useEffect(() => {
        // Initialize EmailJS
        emailjs.init(EMAILJS_PUBLIC_KEY);

        // Fetch Block Schedule
        const fetchBlockSchedule = async () => {
            try {
                const data = await db.getORBlockSchedule();
                setBlockSchedule(data || []);
            } catch (err) {
                console.error('Failed to load block schedule', err);
            }
        };
        fetchBlockSchedule();
    }, []);

    useEffect(() => {
        const calculateStats = (filteredSurgeries) => {
            let revenue = 0;
            let cost = 0;
            let laborCost = 0;
            const usage = {};
            const perCaseData = [];

            filteredSurgeries.forEach(surgery => {
                // Calculate OR Cost
                const duration = parseFloat(surgery.duration_minutes || surgery.durationMinutes || 0);
                const caseCost = calculateORCost(duration);
                cost += caseCost;

                // Calculate Labor Cost from notes or use actual_labor_cost
                let caseLaborCost = parseFloat(surgery.actual_labor_cost);

                // Handle NaN or 0 (force default if 0/missing)
                if (isNaN(caseLaborCost) || caseLaborCost === 0) {
                    caseLaborCost = 0; // Reset to 0 before trying other methods

                    if (surgery.notes) {
                        // Extract self-pay anesthesia
                        const selfPayMatch = surgery.notes.match(/Self-Pay Anesthesia(?:\s*\([^)]+\))?\s*:\s*\$?\s*([0-9,]+)/i);
                        if (selfPayMatch) {
                            caseLaborCost = parseFloat(selfPayMatch[1].replace(/,/g, ''));
                        }

                        // Extract cosmetic anesthesia
                        const cosmeticAnesthesiaMatch = surgery.notes.match(/Anesthesia:\s*\$?\s*([0-9,]+)/i);
                        if (cosmeticAnesthesiaMatch && surgery.notes.includes('Cosmetic Surgery')) {
                            caseLaborCost = parseFloat(cosmeticAnesthesiaMatch[1].replace(/,/g, ''));
                        }
                    }

                    // If still no labor cost, default to 30% of OR cost
                    if (caseLaborCost === 0) {
                        caseLaborCost = caseCost * 0.3;
                        // console.log('DEBUG: Calculated labor cost', { caseCost, caseLaborCost });
                    }
                }

                laborCost += caseLaborCost;

                // Calculate Revenue
                let caseRevenue = 0;
                const codes = surgery.cpt_codes || surgery.cptCodes || [];

                if (codes.length === 0 && surgery.notes) {
                    // CPT codes empty implies Cosmetic Surgery (or custom logic)
                    // Parse fees from notes - support multiple formats
                    // Formats: "Facility Fee: $1500", "Fee: 1500", "Paid: 1500", "Price: 1500"
                    const facilityMatch = surgery.notes.match(/(?:Facility |Cosmetic )?Fee:?\s*\$?\s*([\d,.]+)/i) ||
                        surgery.notes.match(/Paid:?\s*\$?\s*([\d,.]+)/i) ||
                        surgery.notes.match(/Price:?\s*\$?\s*([\d,.]+)/i) ||
                        surgery.notes.match(/Amount:?\s*\$?\s*([\d,.]+)/i) ||
                        surgery.notes.match(/\$\s*([\d,.]+)/); // Fallback: just a dollar amount

                    const anesthesiaMatch = surgery.notes.match(/Anesthesia:\s*\$?\s*([\d,.]+)/i);

                    const facilityFee = facilityMatch ? parseFloat(facilityMatch[1].replace(/,/g, '')) : 0;
                    const anesthesiaFee = anesthesiaMatch ? parseFloat(anesthesiaMatch[1].replace(/,/g, '')) : 0;
                    caseRevenue = facilityFee + anesthesiaFee;
                } else {
                    // Use calculateMedicareRevenue for proper MPPR handling
                    caseRevenue = calculateMedicareRevenue(codes, cptCodes, settings?.apply_medicare_mppr || false);

                    codes.forEach(code => {
                        usage[code] = (usage[code] || 0) + 1;
                    });

                    // Also check for "Self-Pay Anesthesia" in notes for standard surgeries
                    if (surgery.notes) {
                        const anesthesiaMatch = surgery.notes.match(/Self-Pay Anesthesia:?\s*\$?\s*([\d,.]+)/i);
                        if (anesthesiaMatch) {
                            caseRevenue += parseFloat(anesthesiaMatch[1].replace(/,/g, ''));
                        }
                    }
                }
                revenue += caseRevenue;

                // Get supplies costs
                const suppliesCost = (parseFloat(surgery.supplies_cost) || 0) +
                    (parseFloat(surgery.implants_cost) || 0) +
                    (parseFloat(surgery.medications_cost) || 0);

                // Track total supplies cost for stats
                // Note: The original code logic for 'stats' object might need checking, 
                // but here we just push to perCaseData and accumulate locally if needed.
                // Wait, perCaseData logic uses local variables.

                perCaseData.push({
                    id: surgery.id,
                    revenue: caseRevenue,
                    cost: caseCost,
                    laborCost: caseLaborCost,
                    suppliesCost: suppliesCost,
                    profit: caseRevenue - caseCost - caseLaborCost - suppliesCost
                });
            });

            // Calculate total supplies cost from perCaseData
            const totalSuppliesCost = perCaseData.reduce((sum, c) => sum + c.suppliesCost, 0);

            return {
                revenue,
                cost,
                laborCost,
                suppliesCost: totalSuppliesCost,
                profit: revenue - cost - laborCost - totalSuppliesCost,
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
            totalCost: currentStats.cost + currentStats.laborCost + currentStats.suppliesCost,
            netProfit: currentStats.profit,
            cptUsage: currentStats.usage,
            revenueChange: calculateChange(currentStats.revenue, prevStats.revenue),
            profitChange: calculateChange(currentStats.profit, prevStats.profit)
        });

        setChartData(currentStats.perCaseData);

        // Calculate Top Surgeons for all timeframes independent of selected view
        // Calculate Top Surgeons for all timeframes independent of selected view
        const calculateTopSurgeon = (subset) => {
            const profits = {};
            subset.forEach(s => {
                const name = s.doctor_name || 'Unknown';
                let revenue = 0;
                let isCosmetic = false;

                const codes = s.cpt_codes || s.cptCodes || [];

                // Logic to determine revenue
                if (codes.length === 0 && s.notes) {
                    // Cosmetic/Custom Logic
                    // Parse fees from notes - support multiple formats
                    const facilityMatch = s.notes.match(/(?:Facility |Cosmetic )?Fee:?\s*\$?\s*([\d,.]+)/i) ||
                        s.notes.match(/Paid:?\s*\$?\s*([\d,.]+)/i) ||
                        s.notes.match(/Price:?\s*\$?\s*([\d,.]+)/i) ||
                        s.notes.match(/Amount:?\s*\$?\s*([\d,.]+)/i) ||
                        s.notes.match(/\$\s*([\d,.]+)/);

                    const anesthesiaMatch = s.notes.match(/Anesthesia:\s*\$?\s*([\d,.]+)/i);

                    const facilityFee = facilityMatch ? parseFloat(facilityMatch[1].replace(/,/g, '')) : 0;
                    const anesthesiaFee = anesthesiaMatch ? parseFloat(anesthesiaMatch[1].replace(/,/g, '')) : 0;
                    revenue = facilityFee + anesthesiaFee;
                    isCosmetic = true;
                } else {
                    // Use calculateMedicareRevenue for proper MPPR handling
                    revenue = calculateMedicareRevenue(codes, cptCodes, settings?.apply_medicare_mppr || false);
                }

                // Calculate total costs: OR + Labor + Supplies
                const orCost = isCosmetic ? 0 : calculateORCost(s.duration_minutes || s.durationMinutes || 0);
                const laborCost = orCost * 0.3;
                const suppliesCost = (s.supplies_cost || 0) + (s.implants_cost || 0) + (s.medications_cost || 0);
                const totalCosts = orCost + laborCost + suppliesCost;

                profits[name] = (profits[name] || 0) + (revenue - totalCosts);
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

        const dailySurgs = surgeries.filter(s => {
            const d = new Date(s.date);
            // Reset time for comparison
            const dCheck = new Date(d); dCheck.setHours(0, 0, 0, 0);
            return dCheck >= dStart && dCheck <= dEnd;
        });
        const weeklySurgs = surgeries.filter(s => {
            const d = new Date(s.date);
            const dCheck = new Date(d); dCheck.setHours(0, 0, 0, 0);
            return dCheck >= wStart && dCheck <= wEnd;
        });
        const monthlySurgs = surgeries.filter(s => {
            const d = new Date(s.date);
            const dCheck = new Date(d); dCheck.setHours(0, 0, 0, 0);
            return dCheck >= mStart && dCheck <= mEnd;
        });

        setTopSurgeons({
            daily: calculateTopSurgeon(dailySurgs),
            weekly: calculateTopSurgeon(weeklySurgs),
            monthly: calculateTopSurgeon(monthlySurgs)
        });

        // Calculate Utilization for Pie Chart (Current View)
        const calculateUtilization = (subset) => {
            const util = {};
            let totalMinutes = 0;
            subset.forEach(s => {
                const name = s.doctor_name || 'Unknown';
                const duration = s.duration_minutes || s.durationMinutes || 0;
                util[name] = (util[name] || 0) + duration;
                totalMinutes += duration;
            });

            return Object.entries(util).map(([name, minutes]) => ({
                name,
                value: minutes,
                percentage: totalMinutes > 0 ? (minutes / totalMinutes) * 100 : 0,
                color: generateColor(name) // Helper to generate consistent colors
            })).sort((a, b) => b.value - a.value);
        };

        setUtilizationData(calculateUtilization(currentSurgeries));

        // --- Calculate Block Schedule Stats (Surgeons vs Gap) ---
        const calcDuration = (start, end) => {
            if (!start || !end) return 0;
            const sH = parseInt(start.substring(0, 2));
            const sM = parseInt(start.substring(2, 4));
            const eH = parseInt(end.substring(0, 2));
            const eM = parseInt(end.substring(2, 4));
            return (eH * 60 + eM) - (sH * 60 + sM);
        };

        const calculateBlockStats = () => {
            // 1. Filter Blocks by Timeframe AND Selected Room
            const relevantBlocks = blockSchedule.filter(b => {
                const d = new Date(b.date);
                d.setHours(0, 0, 0, 0);

                const start = new Date(currentStart); start.setHours(0, 0, 0, 0);
                const end = new Date(currentEnd); end.setHours(23, 59, 59, 999);

                const timeMatch = d >= start && d <= end;
                const roomMatch = selectedRoom === 'All' ? true : b.room_name === selectedRoom;

                return timeMatch && roomMatch;
            });

            // 2. Aggregate Allocated Time per Surgeon
            const surgeonAllocations = {};
            let totalAllocatedMinutes = 0;

            relevantBlocks.forEach(block => {
                const duration = calcDuration(block.start_time, block.end_time);
                const name = block.provider_name || 'Unknown';
                surgeonAllocations[name] = (surgeonAllocations[name] || 0) + duration;
                totalAllocatedMinutes += duration;
            });

            // 3. Calculate Total Capacity & Gap
            let businessDays = 0;
            let loopDate = new Date(currentStart);
            while (loopDate <= currentEnd) {
                const day = loopDate.getDay();
                if (day !== 0 && day !== 6) businessDays++; // Exclude Sun, Sat
                loopDate.setDate(loopDate.getDate() + 1);
            }
            if (businessDays === 0 && timeframe === 'daily') {
                const d = currentStart.getDay();
                if (d === 0 || d === 6) businessDays = 0;
            }

            const multiplier = selectedRoom === 'All' ? ROOMS.length : 1;
            const totalCapacity = businessDays * multiplier * DAILY_CAPACITY_PER_ROOM;
            const gapMinutes = Math.max(0, totalCapacity - totalAllocatedMinutes);

            // 4. Transform to Chart Data
            const stats = Object.entries(surgeonAllocations).map(([name, mins]) => ({
                name,
                value: mins,
                percentage: 0,
                color: generateColor(name)
            }));

            if (gapMinutes > 0) {
                stats.push({
                    name: 'Gap / Unused',
                    value: gapMinutes,
                    percentage: 0,
                    color: '#e2e8f0' // Grey for gap
                });
            }

            const grandTotal = totalAllocatedMinutes + gapMinutes;
            stats.forEach(s => {
                s.percentage = grandTotal > 0 ? (s.value / grandTotal) * 100 : 0;
            });

            return stats.sort((a, b) => b.value - a.value);
        };

        if (blockSchedule.length > 0 || selectedRoom) {
            setBlockStats(calculateBlockStats());
        }

    }, [surgeries, selectedDate, cptCodes, timeframe, blockSchedule, selectedRoom]);

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
                                <span className="mini-stat-label">Cases Today</span>
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

                {/* OR Utilization Chart */}
                <div className="chart-card utilization-chart-card" style={{ marginTop: '1.5rem' }}>
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
                                                <span className="legend-val">{Math.round(item.percentage)}% ({item.value} mins)</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* OR Block Schedule Allocation Chart */}
                    <div className="chart-card utilization-chart-card" style={{ marginTop: '1.5rem' }}>
                        <div className="chart-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                                <h3>OR Block Schedule Allocation ({timeframe})</h3>
                                {/* Room Selector */}
                                <select
                                    className="filter-select"
                                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.85rem' }}
                                    value={selectedRoom}
                                    onChange={(e) => setSelectedRoom(e.target.value)}
                                >
                                    <option value="All">All Rooms</option>
                                    {ROOMS.map(r => <option key={r} value={r}>{r}</option>)}
                                </select>
                            </div>
                            <span className="subtitle-sm" style={{ fontSize: '0.85rem', color: '#64748b', marginLeft: 'auto' }}>
                                (Surgeons vs Gap Time)
                            </span>
                        </div>
                        <div className="utilization-chart-container">
                            {blockStats.length === 0 ? (
                                <div className="empty-chart-state">No block data for this period</div>
                            ) : (
                                <div className="pie-chart-wrapper">
                                    <div
                                        className="pie-chart"
                                        style={{
                                            background: `conic-gradient(${blockStats.reduce((acc, item, index) => {
                                                const prevPerc = index === 0 ? 0 : blockStats.slice(0, index).reduce((p, i) => p + i.percentage, 0);
                                                return `${acc}${index > 0 ? ',' : ''} ${item.color} ${prevPerc}% ${prevPerc + item.percentage}%`;
                                            }, '')
                                                })`
                                        }}
                                    >
                                        {/* Optional Center Text for Donut effect */}
                                        <div className="donut-hole" style={{ width: '50%', height: '50%', background: '#fff', borderRadius: '50%', position: 'absolute', top: '50%', left: '50%' }}></div>
                                    </div>
                                    <div className="chart-legend-grid">
                                        {blockStats.map((item, index) => (
                                            <div key={index} className="legend-item">
                                                <span className="legend-dot" style={{ background: item.color }}></span>
                                                <div className="legend-info">
                                                    <span className="legend-name">{item.name}</span>
                                                    <span className="legend-val">{Math.round(item.percentage)}% ({Math.round(item.value / 60)} hrs)</span>
                                                </div>
                                            </div>
                                        ))}
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
