# 🔍 Implementation Status Report
## Financial Intelligence & Surgeon Scorecard Modules

**Date**: December 23, 2025  
**Project**: ASC Medical Management System  
**Requested Features**: 4 Core Modules for Financial Intelligence

---

## 📊 Executive Summary

| Module | Status | Completion | Notes |
|--------|--------|------------|-------|
| **1. Calculation Engine** | ✅ **PARTIAL** | 50% | `calculateORCost` exists, `calculateMedicareRevenue` missing |
| **2. Database Schema Updates** | ❌ **PENDING** | 0% | Financial snapshot columns not added |
| **3. Surgeon Scorecard Component** | ❌ **PENDING** | 0% | Component doesn't exist |
| **4. Profitability Guardrails** | ❌ **PENDING** | 0% | No margin warnings in scheduler |

**Overall Progress**: **12.5%** (1 of 8 sub-tasks complete)

---

## 📋 Detailed Analysis

### ✅ Module 1: Calculation Engine (`src/utils/hospitalUtils.js`)

#### ✅ **IMPLEMENTED: `calculateORCost(durationMinutes)`**

**Location**: `src/utils/hospitalUtils.js` (lines 26-61)

**Current Implementation**:
```javascript
export const calculateORCost = (durationMinutes) => {
    if (!durationMinutes || durationMinutes <= 0) return 0;

    let cost = 0;

    if (durationMinutes <= 60) {
        // Proportional rate for first hour: $1500 / 60 min = $25 per minute
        return durationMinutes * 25;
    }

    // Base rate for first full hour
    cost = 1500;

    // Remaining minutes after first hour
    let remainingMinutes = durationMinutes - 60;

    // Next 60 minutes (up to 2 hours total): $300 for each additional 30 minutes
    const secondHourMinutes = Math.min(remainingMinutes, 60);
    const secondHourBlocks = Math.ceil(secondHourMinutes / 30);
    cost += secondHourBlocks * 300;

    remainingMinutes -= secondHourMinutes;

    if (remainingMinutes > 0) {
        // After 2 hours: $400 for each additional 30 minutes
        const additionalBlocks = Math.ceil(remainingMinutes / 30);
        cost += additionalBlocks * 400;
    }

    return cost;
};
```

**Status**: ✅ **FULLY IMPLEMENTED**

**Logic Verification**:
- ✅ First 60 mins: $1,500 (proportional: $25/min)
- ✅ 61-120 mins: +$300 per 30-min block started
- ✅ 121+ mins: +$400 per 30-min block started

**Usage**: Currently used in 7 components:
1. `SurgeryScheduler.jsx` (line 424)
2. `Dashboard.jsx` (lines 58, 217)
3. `CostAnalysis.jsx` (line 67)
4. `ORUtilization.jsx` (line 48)
5. `ClaimsManagement.jsx` (line 330)
6. `AIAnalystModal.jsx` (line 66)

---

#### ❌ **MISSING: `calculateMedicareRevenue(cptCodesArray, cptDatabase)`**

**Status**: ❌ **NOT IMPLEMENTED**

**Required Logic**: Multiple Procedure Payment Reduction (MPPR)
- Sort CPT codes by reimbursement value (highest first)
- 100% payment for highest-value code
- 50% payment for all subsequent codes

**Example Implementation Needed**:
```javascript
export const calculateMedicareRevenue = (cptCodesArray, cptDatabase) => {
    if (!cptCodesArray || cptCodesArray.length === 0) return 0;
    
    // Get full CPT code objects with reimbursement values
    const cptObjects = cptCodesArray
        .map(code => cptDatabase.find(c => c.code === code))
        .filter(Boolean); // Remove any not found
    
    if (cptObjects.length === 0) return 0;
    
    // Sort by reimbursement value (highest first)
    const sortedCpts = [...cptObjects].sort((a, b) => 
        (b.reimbursement || 0) - (a.reimbursement || 0)
    );
    
    // Calculate total with MPPR
    let totalRevenue = 0;
    
    sortedCpts.forEach((cpt, index) => {
        if (index === 0) {
            // First (highest value) code gets 100%
            totalRevenue += cpt.reimbursement || 0;
        } else {
            // All subsequent codes get 50%
            totalRevenue += (cpt.reimbursement || 0) * 0.5;
        }
    });
    
    return totalRevenue;
};
```

**Impact**: This function is critical for accurate revenue projections and margin calculations.

---

### ❌ Module 2: Database Schema Updates

#### **Current `surgeries` Table Schema**

**Location**: `supabase-schema.sql` (lines 63-76)

```sql
CREATE TABLE IF NOT EXISTS surgeries (
  id BIGSERIAL PRIMARY KEY,
  patient_id BIGINT REFERENCES patients(id) ON DELETE CASCADE,
  surgeon_id BIGINT REFERENCES surgeons(id) ON DELETE SET NULL,
  doctor_name TEXT NOT NULL,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  duration_minutes INTEGER NOT NULL,
  cpt_codes TEXT[] NOT NULL,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in-progress', 'completed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### ❌ **MISSING: Financial Snapshot Columns**

**Required Additions**:
```sql
ALTER TABLE surgeries
ADD COLUMN IF NOT EXISTS actual_room_cost DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS actual_labor_cost DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS expected_reimbursement DECIMAL(10, 2);
```

**Purpose**:
- `actual_room_cost`: Calculated OR cost based on duration (from `calculateORCost`)
- `actual_labor_cost`: Labor/anesthesia costs
- `expected_reimbursement`: Medicare revenue with MPPR applied (from `calculateMedicareRevenue`)

**Migration File Needed**: `supabase-migration-add-financial-snapshot.sql`

---

#### ❌ **MISSING: 'Complete Surgery' Workflow**

**Current Status**: No automatic financial calculation on surgery completion

**Required Implementation**:

**Location**: `App.jsx` or `SurgeryScheduler.jsx`

```javascript
const handleCompleteSurgery = async (surgeryId) => {
    const surgery = surgeries.find(s => s.id === surgeryId);
    if (!surgery) return;
    
    // Calculate financial snapshot
    const actualRoomCost = calculateORCost(surgery.duration_minutes);
    const expectedReimbursement = calculateMedicareRevenue(
        surgery.cpt_codes, 
        cptCodes
    );
    
    // TODO: Calculate actual_labor_cost
    // This could be based on anesthesia time, staff count, etc.
    const actualLaborCost = 0; // Placeholder
    
    // Update surgery with financial snapshot
    await onUpdate(surgeryId, {
        status: 'completed',
        actual_room_cost: actualRoomCost,
        actual_labor_cost: actualLaborCost,
        expected_reimbursement: expectedReimbursement
    });
    
    await Swal.fire({
        title: 'Surgery Completed!',
        html: `
            <div style="text-align: left; margin-top: 1rem;">
                <p><strong>Financial Summary:</strong></p>
                <p>Expected Revenue: $${expectedReimbursement.toLocaleString()}</p>
                <p>OR Cost: $${actualRoomCost.toLocaleString()}</p>
                <p>Labor Cost: $${actualLaborCost.toLocaleString()}</p>
                <p><strong>Net Margin: $${(expectedReimbursement - actualRoomCost - actualLaborCost).toLocaleString()}</strong></p>
            </div>
        `,
        icon: 'success'
    });
};
```

**Integration Point**: Add "Complete Surgery" button in `SurgeryScheduler.jsx` surgery list

---

### ❌ Module 3: Surgeon Scorecard Component

#### **Status**: ❌ **COMPONENT DOES NOT EXIST**

**Required File**: `src/components/SurgeonScorecard.jsx`

**Required Features**:

1. **Data Aggregation**: Query all completed surgeries grouped by surgeon
2. **Metrics Calculation**:
   - Total Cases
   - Net Margin (Total Revenue - Total OR Costs - Total Labor)
   - Tier Breach Count (surgeries > 60 minutes)
   - Efficiency Rating (Total Revenue / Total OR Minutes)

**Example Implementation**:

```javascript
import React, { useMemo } from 'react';
import { calculateORCost, formatCurrency } from '../utils/hospitalUtils';
import './Management.css';

const SurgeonScorecard = ({ surgeries, surgeons, cptCodes }) => {
    const scorecardData = useMemo(() => {
        // Filter only completed surgeries
        const completedSurgeries = surgeries.filter(s => s.status === 'completed');
        
        // Group by surgeon
        const surgeonStats = {};
        
        completedSurgeries.forEach(surgery => {
            const surgeonName = surgery.doctor_name;
            
            if (!surgeonStats[surgeonName]) {
                surgeonStats[surgeonName] = {
                    name: surgeonName,
                    totalCases: 0,
                    totalRevenue: 0,
                    totalORCost: 0,
                    totalLaborCost: 0,
                    totalMinutes: 0,
                    tierBreaches: 0
                };
            }
            
            const stats = surgeonStats[surgeonName];
            stats.totalCases++;
            stats.totalRevenue += surgery.expected_reimbursement || 0;
            stats.totalORCost += surgery.actual_room_cost || calculateORCost(surgery.duration_minutes);
            stats.totalLaborCost += surgery.actual_labor_cost || 0;
            stats.totalMinutes += surgery.duration_minutes || 0;
            
            // Count tier breaches (> 60 minutes)
            if (surgery.duration_minutes > 60) {
                stats.tierBreaches++;
            }
        });
        
        // Calculate derived metrics
        return Object.values(surgeonStats).map(stats => ({
            ...stats,
            netMargin: stats.totalRevenue - stats.totalORCost - stats.totalLaborCost,
            efficiencyRating: stats.totalMinutes > 0 
                ? stats.totalRevenue / stats.totalMinutes 
                : 0
        })).sort((a, b) => b.netMargin - a.netMargin); // Sort by net margin
        
    }, [surgeries, cptCodes]);
    
    return (
        <div className="management-container">
            <div className="management-header">
                <h2 className="management-title">Surgeon Scorecard</h2>
                <p className="card-subtitle">Performance analytics for completed surgeries</p>
            </div>
            
            <div className="content-card">
                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Surgeon Name</th>
                                <th>Total Cases</th>
                                <th>Total Revenue</th>
                                <th>Total OR Cost</th>
                                <th>Total Labor</th>
                                <th>Net Margin</th>
                                <th>Tier Breaches</th>
                                <th>Efficiency Rating</th>
                            </tr>
                        </thead>
                        <tbody>
                            {scorecardData.map((surgeon, index) => (
                                <tr key={index}>
                                    <td style={{ fontWeight: '600' }}>{surgeon.name}</td>
                                    <td>{surgeon.totalCases}</td>
                                    <td style={{ color: '#059669', fontWeight: '600' }}>
                                        {formatCurrency(surgeon.totalRevenue)}
                                    </td>
                                    <td style={{ color: '#dc2626' }}>
                                        {formatCurrency(surgeon.totalORCost)}
                                    </td>
                                    <td style={{ color: '#dc2626' }}>
                                        {formatCurrency(surgeon.totalLaborCost)}
                                    </td>
                                    <td style={{ 
                                        color: surgeon.netMargin >= 0 ? '#059669' : '#dc2626',
                                        fontWeight: '700',
                                        fontSize: '1.05rem'
                                    }}>
                                        {formatCurrency(surgeon.netMargin)}
                                    </td>
                                    <td>
                                        {surgeon.tierBreaches > 0 ? (
                                            <span className="badge" style={{
                                                background: '#fef3c7',
                                                color: '#92400e',
                                                padding: '4px 8px',
                                                borderRadius: '4px'
                                            }}>
                                                {surgeon.tierBreaches}
                                            </span>
                                        ) : (
                                            <span style={{ color: '#64748b' }}>0</span>
                                        )}
                                    </td>
                                    <td style={{ fontWeight: '600' }}>
                                        ${surgeon.efficiencyRating.toFixed(2)}/min
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default SurgeonScorecard;
```

**Integration Required**:
1. Add to `App.jsx` imports
2. Add route in `renderContent()` function
3. Add navigation item in `Sidebar.jsx` (Admin only)

---

### ❌ Module 4: Profitability Guardrails in Surgery Scheduler

#### **Status**: ❌ **NOT IMPLEMENTED**

**Current State**: `SurgeryScheduler.jsx` shows estimated OR cost but no margin warnings

**Current Code** (line 424):
```javascript
const estimatedCost = calculateORCost(formData.durationMinutes);
```

**Required Implementation**:

**Step 1**: Calculate Projected Margin in real-time

```javascript
// Add to SurgeryScheduler.jsx after line 424
const projectedRevenue = useMemo(() => {
    if (!formData.selectedCptCodes || formData.selectedCptCodes.length === 0) {
        return 0;
    }
    return calculateMedicareRevenue(formData.selectedCptCodes, cptCodes);
}, [formData.selectedCptCodes, cptCodes]);

const projectedMargin = useMemo(() => {
    const orCost = calculateORCost(formData.durationMinutes);
    // TODO: Add labor cost estimation
    const laborCost = 0; // Placeholder
    return projectedRevenue - orCost - laborCost;
}, [projectedRevenue, formData.durationMinutes]);

// Determine cost tier
const costTier = useMemo(() => {
    const minutes = formData.durationMinutes;
    if (minutes <= 60) return { name: 'Standard', color: '#059669' };
    if (minutes <= 120) return { name: 'Tier 2 (+$300/30min)', color: '#f59e0b' };
    return { name: 'Tier 3 (+$400/30min)', color: '#dc2626' };
}, [formData.durationMinutes]);
```

**Step 2**: Add Margin Badge UI

Insert after duration input field in the form (around line 850):

```javascript
{/* Profitability Guardrails */}
{formData.selectedCptCodes.length > 0 && (
    <div style={{
        marginTop: '1rem',
        padding: '1rem',
        background: projectedMargin < 0 ? '#fee2e2' : '#f0fdf4',
        border: `2px solid ${projectedMargin < 0 ? '#dc2626' : '#059669'}`,
        borderRadius: '8px'
    }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#64748b' }}>
                    Financial Projection
                </h4>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <div>
                        <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Revenue: </span>
                        <span style={{ fontWeight: '600', color: '#059669' }}>
                            {formatCurrency(projectedRevenue)}
                        </span>
                    </div>
                    <div>
                        <span style={{ fontSize: '0.85rem', color: '#64748b' }}>OR Cost: </span>
                        <span style={{ fontWeight: '600', color: '#dc2626' }}>
                            {formatCurrency(estimatedCost)}
                        </span>
                    </div>
                    <div>
                        <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Cost Tier: </span>
                        <span style={{ 
                            fontWeight: '600', 
                            color: costTier.color,
                            fontSize: '0.85rem'
                        }}>
                            {costTier.name}
                        </span>
                    </div>
                </div>
            </div>
            <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.25rem' }}>
                    Projected Margin
                </div>
                <div style={{
                    fontSize: '1.5rem',
                    fontWeight: '700',
                    color: projectedMargin < 0 ? '#dc2626' : '#059669'
                }}>
                    {formatCurrency(projectedMargin)}
                </div>
            </div>
        </div>
        
        {/* High Tier Cost Alert */}
        {projectedMargin < 0 && formData.durationMinutes > 120 && (
            <div style={{
                marginTop: '0.75rem',
                padding: '0.75rem',
                background: '#fef2f2',
                border: '1px solid #fca5a5',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
            }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                    <line x1="12" y1="9" x2="12" y2="13"></line>
                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
                <span style={{ color: '#991b1b', fontSize: '0.9rem', fontWeight: '600' }}>
                    ⚠️ High Tier Cost Alert: Projected Margin is Negative
                </span>
            </div>
        )}
        
        {/* Tier Breach Warning */}
        {formData.durationMinutes > 60 && projectedMargin >= 0 && (
            <div style={{
                marginTop: '0.75rem',
                padding: '0.75rem',
                background: '#fffbeb',
                border: '1px solid #fcd34d',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
            }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <span style={{ color: '#92400e', fontSize: '0.85rem' }}>
                    Duration exceeds 60 minutes - Tier {formData.durationMinutes > 120 ? '3' : '2'} surcharge applies
                </span>
            </div>
        )}
    </div>
)}
```

---

## 📝 Implementation Checklist

### ✅ **Completed**
- [x] `calculateORCost()` function implemented
- [x] OR cost calculation used across 7 components
- [x] Tiered pricing logic (60min/$1500, 61-120/$300, 121+/$400)

### ❌ **Pending - High Priority**

#### **Module 1: Calculation Engine**
- [ ] Implement `calculateMedicareRevenue()` with MPPR logic
- [ ] Add unit tests for both calculation functions
- [ ] Create `src/utils/hospitalCalculations.js` (or add to existing `hospitalUtils.js`)

#### **Module 2: Database Schema**
- [ ] Create migration file: `supabase-migration-add-financial-snapshot.sql`
- [ ] Add columns: `actual_room_cost`, `actual_labor_cost`, `expected_reimbursement`
- [ ] Run migration on Supabase
- [ ] Update TypeScript types (if applicable)

#### **Module 3: Complete Surgery Workflow**
- [ ] Add "Complete Surgery" button to `SurgeryScheduler.jsx`
- [ ] Implement `handleCompleteSurgery()` function in `App.jsx`
- [ ] Trigger financial calculations on completion
- [ ] Save financial snapshot to database
- [ ] Show financial summary in completion confirmation

#### **Module 4: Surgeon Scorecard**
- [ ] Create `src/components/SurgeonScorecard.jsx`
- [ ] Implement data aggregation logic
- [ ] Calculate all 4 metrics (Cases, Net Margin, Tier Breaches, Efficiency)
- [ ] Add to `App.jsx` imports and routing
- [ ] Add navigation item in `Sidebar.jsx` (Admin only)
- [ ] Create CSS styling (or use existing `Management.css`)

#### **Module 5: Profitability Guardrails**
- [ ] Import `calculateMedicareRevenue` in `SurgeryScheduler.jsx`
- [ ] Add `projectedRevenue` calculation
- [ ] Add `projectedMargin` calculation
- [ ] Add `costTier` determination
- [ ] Insert Margin Badge UI in form
- [ ] Add "High Tier Cost Alert" warning
- [ ] Add "Tier Breach" warning
- [ ] Test with various CPT code combinations

---

## 🎯 Recommended Implementation Order

### **Phase 1: Foundation** (2-3 hours)
1. ✅ Implement `calculateMedicareRevenue()` function
2. ✅ Create and run database migration
3. ✅ Test calculation functions

### **Phase 2: Workflow** (2-3 hours)
4. ✅ Add "Complete Surgery" functionality
5. ✅ Implement financial snapshot saving
6. ✅ Test completion workflow

### **Phase 3: Analytics** (3-4 hours)
7. ✅ Build `SurgeonScorecard.jsx` component
8. ✅ Integrate into navigation
9. ✅ Test with real data

### **Phase 4: Guardrails** (2-3 hours)
10. ✅ Add profitability calculations to scheduler
11. ✅ Implement margin badge UI
12. ✅ Add warning alerts
13. ✅ Test edge cases

**Total Estimated Time**: 9-13 hours

---

## 🚨 Critical Dependencies

### **Must Be Completed First**:
1. `calculateMedicareRevenue()` - Required for all other modules
2. Database migration - Required for financial snapshot storage

### **Can Be Developed in Parallel**:
- Surgeon Scorecard (uses existing data + new calculations)
- Profitability Guardrails (uses new calculations)

---

## 📊 Current vs. Required State

### **Current State**:
```
Surgery Scheduling
    ↓
Calculate OR Cost ✅
    ↓
Save Surgery (basic data only)
    ↓
Display in Log
```

### **Required State**:
```
Surgery Scheduling
    ↓
Calculate OR Cost ✅
Calculate Medicare Revenue (MPPR) ❌
Calculate Projected Margin ❌
    ↓
Show Profitability Warnings ❌
    ↓
Save Surgery (basic data)
    ↓
Complete Surgery
    ↓
Calculate Financial Snapshot ❌
    ↓
Save Financial Data ❌
    ↓
Update Surgeon Scorecard ❌
```

---

## 💡 Additional Recommendations

### **1. Labor Cost Calculation**
Currently, `actual_labor_cost` is a placeholder. Consider implementing:
```javascript
export const calculateLaborCost = (durationMinutes, anesthesiaType = 'standard') => {
    // Base anesthesia cost
    const anesthesiaCostPerHour = 200; // Adjust as needed
    const anesthesiaCost = (durationMinutes / 60) * anesthesiaCostPerHour;
    
    // Nursing/staff cost
    const staffCostPerHour = 100; // Adjust as needed
    const staffCost = (durationMinutes / 60) * staffCostPerHour;
    
    return anesthesiaCost + staffCost;
};
```

### **2. Data Validation**
Add validation to ensure:
- CPT codes exist in database before calculation
- Duration is positive
- Financial calculations don't overflow

### **3. Historical Tracking**
Consider adding:
- `financial_snapshot_date` timestamp
- `calculation_version` for tracking formula changes
- Audit log for financial recalculations

### **4. Reporting**
Additional reports to consider:
- Monthly profitability trends
- CPT code profitability analysis
- Surgeon efficiency over time
- Tier breach analysis by specialty

---

## 📞 Next Steps

**To proceed with implementation, you should**:

1. **Review this status report** and confirm priorities
2. **Decide on implementation order** (recommended order provided above)
3. **Start with Phase 1** (Foundation) - implement `calculateMedicareRevenue()`
4. **Test incrementally** after each phase
5. **Update this document** as features are completed

---

**Document Version**: 1.0  
**Last Updated**: December 23, 2025  
**Status**: Awaiting Implementation Approval
