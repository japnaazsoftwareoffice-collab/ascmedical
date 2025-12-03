import React, { useState, useEffect } from 'react';
import { formatCurrency, calculateORCost } from '../utils/hospitalUtils';
import './AIAnalystModal.css';

const AIAnalystModal = ({ isOpen, onClose, surgeries, cptCodes }) => {
    const [utilizationTarget, setUtilizationTarget] = useState(80);
    const [isOptimizing, setIsOptimizing] = useState(false);
    const [recommendation, setRecommendation] = useState(null);

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setRecommendation(null);
            setUtilizationTarget(80);
        }
    }, [isOpen]);

    const calculateAverageDurations = () => {
        const durationMap = {};
        const countMap = {};

        // Initialize with defaults or historical data
        cptCodes.forEach(cpt => {
            durationMap[cpt.code] = 60; // Default 60 mins
            countMap[cpt.code] = 0;
        });

        surgeries.forEach(s => {
            const duration = s.duration_minutes || s.durationMinutes || 60;
            const codes = s.cpt_codes || s.cptCodes || [];

            // Distribute duration among codes (simple approximation: split evenly)
            const durationPerCode = duration / (codes.length || 1);

            codes.forEach(code => {
                if (durationMap[code] !== undefined) {
                    if (countMap[code] === 0) durationMap[code] = 0; // Reset default if we have data
                    durationMap[code] += durationPerCode;
                    countMap[code]++;
                }
            });
        });

        // Finalize averages
        Object.keys(durationMap).forEach(code => {
            if (countMap[code] > 0) {
                durationMap[code] = Math.round(durationMap[code] / countMap[code]);
            }
        });

        return durationMap;
    };

    const handleOptimize = () => {
        setIsOptimizing(true);

        // Simulate AI "thinking" time
        setTimeout(() => {
            const avgDurations = calculateAverageDurations();
            const targetMinutes = (utilizationTarget / 100) * 480; // Based on 8-hour day

            // Prepare items for knapsack-like problem
            // We want to maximize PROFIT (Revenue - OR Cost) within Time Constraint
            let items = cptCodes.map(cpt => {
                const duration = avgDurations[cpt.code] || 60;
                const estimatedORCost = calculateORCost(duration);
                const estimatedProfit = cpt.reimbursement - estimatedORCost;

                return {
                    ...cpt,
                    duration,
                    estimatedORCost,
                    estimatedProfit,
                    // Efficiency = Profit per Minute
                    efficiency: estimatedProfit / duration
                };
            });

            // Sort by efficiency (Profit per Minute) descending
            items.sort((a, b) => b.efficiency - a.efficiency);

            let currentMinutes = 0;
            let currentRevenue = 0;
            let currentProfit = 0;
            let currentCost = 0;
            const selectedSurgeries = [];

            // Greedy approach: Add most efficient surgeries that fit
            let attempts = 0;
            while (currentMinutes < targetMinutes && attempts < 100) {
                let added = false;
                for (const item of items) {
                    // Only add if it fits AND is profitable
                    if (currentMinutes + item.duration <= targetMinutes + 30 && item.estimatedProfit > 0) {
                        selectedSurgeries.push(item);
                        currentMinutes += item.duration;
                        currentRevenue += item.reimbursement;
                        currentProfit += item.estimatedProfit;
                        currentCost += item.estimatedORCost;
                        added = true;
                        break;
                    }
                }
                if (!added) break; // Nothing fits anymore
                attempts++;
            }

            setRecommendation({
                surgeries: selectedSurgeries,
                totalMinutes: currentMinutes,
                totalRevenue: currentRevenue,
                totalProfit: currentProfit,
                totalCost: currentCost,
                utilization: Math.round((currentMinutes / 480) * 100)
            });

            setIsOptimizing(false);
        }, 1500);
    };

    if (!isOpen) return null;

    return (
        <div className="ai-modal-overlay">
            <div className="ai-modal-content">
                <div className="ai-modal-header">
                    <div className="ai-title-group">
                        <div className="ai-icon-large">✨</div>
                        <div className="ai-modal-title">
                            <h2>ASC Analyst</h2>
                            <p>Smart Schedule Optimization</p>
                        </div>
                    </div>
                    <button className="btn-close" onClick={onClose}>×</button>
                </div>

                <div className="ai-modal-body">
                    <div className="optimization-controls">
                        <div className="control-row">
                            <div className="control-group">
                                <label>Target OR Utilization</label>
                                <div className="slider-container">
                                    <input
                                        type="range"
                                        min="50"
                                        max="100"
                                        value={utilizationTarget}
                                        onChange={(e) => setUtilizationTarget(e.target.value)}
                                        className="utilization-slider"
                                    />
                                    <span className="utilization-value">{utilizationTarget}%</span>
                                </div>
                            </div>
                            <button
                                className="btn-optimize"
                                onClick={handleOptimize}
                                disabled={isOptimizing}
                            >
                                {isOptimizing ? 'Optimizing...' : 'Generate Optimal Schedule'}
                            </button>
                        </div>
                    </div>

                    {isOptimizing ? (
                        <div className="ai-loading">
                            <div className="spinner"></div>
                            <p>Analyzing historical data and CPT efficiency...</p>
                        </div>
                    ) : recommendation ? (
                        <div className="optimization-results">
                            <div className="results-summary">
                                <div className="result-card">
                                    <div className="result-label">Projected Revenue</div>
                                    <div className="result-value highlight">{formatCurrency(recommendation.totalRevenue)}</div>
                                </div>
                                <div className="result-card">
                                    <div className="result-label">Est. Profit</div>
                                    <div className="result-value highlight" style={{ color: '#10b981' }}>{formatCurrency(recommendation.totalProfit)}</div>
                                </div>
                                <div className="result-card">
                                    <div className="result-label">Total Time</div>
                                    <div className="result-value">
                                        {Math.floor(recommendation.totalMinutes / 60)}h {recommendation.totalMinutes % 60}m
                                    </div>
                                </div>
                                <div className="result-card">
                                    <div className="result-label">Utilization</div>
                                    <div className="result-value">{recommendation.utilization}%</div>
                                </div>
                            </div>

                            <h3>Recommended Procedures</h3>
                            <p style={{ color: '#64748b', marginBottom: '1rem' }}>
                                Based on historical efficiency, scheduling these procedures will maximize profit while hitting your utilization target.
                            </p>

                            <div className="recommendations-list">
                                {recommendation.surgeries.map((item, idx) => (
                                    <div key={idx} className="recommendation-item">
                                        <div className="rec-info">
                                            <span className="rec-code">{item.code}</span>
                                            <span className="rec-desc">{item.description}</span>
                                        </div>
                                        <div className="rec-metrics">
                                            <div className="rec-metric">
                                                <span>Est. Time</span>
                                                <span>{item.duration} min</span>
                                            </div>
                                            <div className="rec-metric">
                                                <span>Profit</span>
                                                <span style={{ color: '#10b981' }}>{formatCurrency(item.estimatedProfit)}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="ai-intro">
                            <p>
                                Use the AI Analyst to calculate the optimal mix of surgeries for a specific day.
                                Set your target utilization (e.g., 80%) and the AI will recommend specific CPT codes
                                to maximize profit based on historical duration data and OR costs.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AIAnalystModal;
