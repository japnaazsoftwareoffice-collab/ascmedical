# 🔍 Supplies & Materials Tracking Status

**Date**: December 23, 2025  
**Question**: Are we checking the expense for the supplies list in the surgery?

---

## ❌ **SHORT ANSWER: NO**

**Supplies/materials costs are NOT currently tracked in the system.**

---

## 📊 Current Cost Tracking

### ✅ **What IS Being Tracked**

The system currently tracks **2 types of costs**:

#### 1. **CPT Code Costs** (Procedure-level costs)
- **Location**: `cpt_codes` table, `cost` column
- **Usage**: Used in `CostAnalysis.jsx` (line 62)
- **Calculation**: 
  ```javascript
  totalCost += parseFloat(cpt.cost || 0);
  ```
- **Purpose**: Represents the base cost of performing a procedure
- **Note**: This is a **static value per CPT code**, not itemized supplies

#### 2. **OR Room Costs** (Time-based facility costs)
- **Location**: `src/utils/hospitalUtils.js` - `calculateORCost()`
- **Usage**: Used across 7 components
- **Calculation**: Tiered pricing based on duration
  - First 60 mins: $1,500 ($25/min)
  - 61-120 mins: +$300 per 30-min block
  - 121+ mins: +$400 per 30-min block
- **Purpose**: Facility/room usage costs

---

### ❌ **What is NOT Being Tracked**

The following cost categories are **completely missing**:

#### 1. **Surgical Supplies**
- ❌ Sutures
- ❌ Gauze, bandages, dressings
- ❌ Surgical gloves
- ❌ Drapes
- ❌ Syringes, needles
- ❌ Medications/drugs
- ❌ Anesthesia supplies

#### 2. **Implants & Devices**
- ❌ Orthopedic implants (screws, plates, rods)
- ❌ Cardiac devices
- ❌ Neurostimulators
- ❌ Mesh materials
- ❌ IOLs (Intraocular lenses for cataract surgery)

**Note**: While some CPT codes mention "implantation" (e.g., CPT 63650 - "Percutaneous implantation of neurostimulator"), the **actual implant cost is not tracked separately**.

#### 3. **Disposable Equipment**
- ❌ Surgical instruments (single-use)
- ❌ Endoscopes/scopes
- ❌ Catheters
- ❌ Tubing

#### 4. **Inventory Management**
- ❌ No supplies database
- ❌ No stock tracking
- ❌ No reorder alerts
- ❌ No vendor management
- ❌ No cost per unit tracking

---

## 🏗️ Current Database Schema

### **surgeries** Table
```sql
CREATE TABLE surgeries (
  id BIGSERIAL PRIMARY KEY,
  patient_id BIGINT,
  surgeon_id BIGINT,
  doctor_name TEXT,
  date DATE,
  start_time TIME,
  duration_minutes INTEGER,
  cpt_codes TEXT[],           -- CPT codes only
  status TEXT,
  notes TEXT,                 -- Free-text only
  created_at TIMESTAMP,
  updated_at TIMESTAMP
  
  -- ❌ NO supplies tracking
  -- ❌ NO implants tracking
  -- ❌ NO materials cost
);
```

### **cpt_codes** Table
```sql
CREATE TABLE cpt_codes (
  id BIGSERIAL PRIMARY KEY,
  code TEXT,
  description TEXT,
  reimbursement DECIMAL(10, 2),
  cost DECIMAL(10, 2),        -- Generic procedure cost (not itemized)
  category TEXT,
  -- ... other fields
  
  -- ❌ NO supplies breakdown
  -- ❌ NO materials list
);
```

---

## 💰 Current Cost Calculation

### **In `CostAnalysis.jsx`** (lines 36-102)

```javascript
filteredSurgeries.forEach(surgery => {
    // 1. CPT Code Costs (generic procedure cost)
    surgery.cpt_codes?.forEach(code => {
        const cpt = cptCodes.find(c => c.code === code);
        if (cpt) {
            totalRevenue += parseFloat(cpt.reimbursement || 0);
            totalCost += parseFloat(cpt.cost || 0);  // ⚠️ Generic cost only
        }
    });

    // 2. OR Room Cost (time-based)
    const orCost = calculateORCost(surgery.duration_minutes || 0);
    totalORCost += orCost;
    
    // ❌ NO supplies cost
    // ❌ NO implants cost
    // ❌ NO materials cost
});

const profit = totalRevenue - totalCost - totalORCost;
```

**Current Profit Formula**:
```
Profit = Revenue - CPT Generic Cost - OR Time Cost
```

**Missing from Profit Calculation**:
- ❌ Actual supplies used
- ❌ Implants/devices cost
- ❌ Medications cost
- ❌ Anesthesia supplies cost

---

## 🚨 Impact on Financial Accuracy

### **Current State**
The system calculates profit based on:
1. **Revenue**: CPT reimbursement rates ✅
2. **Costs**: 
   - Generic CPT procedure cost ⚠️ (not itemized)
   - OR room time cost ✅

### **Problem**
**Profit margins are OVERSTATED** because actual supply costs are not deducted.

### **Example: Hip Replacement Surgery**

**Current Calculation**:
```
Revenue (CPT 27130):     $15,000
CPT Generic Cost:        -$8,000  (from database)
OR Cost (2 hours):       -$2,100  (calculated)
─────────────────────────────────
Calculated Profit:       $4,900   ✅ Shown in system
```

**Reality (with supplies)**:
```
Revenue (CPT 27130):     $15,000
CPT Generic Cost:        -$8,000
OR Cost (2 hours):       -$2,100
Hip Implant:             -$3,500  ❌ NOT TRACKED
Surgical Supplies:       -$800    ❌ NOT TRACKED
Medications:             -$400    ❌ NOT TRACKED
─────────────────────────────────
Actual Profit:           $200     ❌ NOT SHOWN
```

**Discrepancy**: $4,700 overstatement (2,350% error!)

---

## 🎯 Recommended Solution

### **Option 1: Simple Supplies Tracking** (Quick Implementation)

Add a single field to track total supplies cost per surgery.

#### **Database Migration**:
```sql
ALTER TABLE surgeries
ADD COLUMN IF NOT EXISTS supplies_cost DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS implants_cost DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS medications_cost DECIMAL(10, 2) DEFAULT 0;
```

#### **UI Update in `SurgeryScheduler.jsx`**:
Add input fields in the surgery form:
```javascript
<div className="form-row">
    <div className="form-group">
        <label>Supplies Cost</label>
        <input
            type="number"
            step="0.01"
            min="0"
            className="form-input"
            value={formData.suppliesCost || 0}
            onChange={(e) => setFormData({
                ...formData,
                suppliesCost: parseFloat(e.target.value) || 0
            })}
        />
    </div>
    <div className="form-group">
        <label>Implants Cost</label>
        <input
            type="number"
            step="0.01"
            min="0"
            className="form-input"
            value={formData.implantsCost || 0}
            onChange={(e) => setFormData({
                ...formData,
                implantsCost: parseFloat(e.target.value) || 0
            })}
        />
    </div>
    <div className="form-group">
        <label>Medications Cost</label>
        <input
            type="number"
            step="0.01"
            min="0"
            className="form-input"
            value={formData.medicationsCost || 0}
            onChange={(e) => setFormData({
                ...formData,
                medicationsCost: parseFloat(e.target.value) || 0
            })}
        />
    </div>
</div>
```

#### **Update Cost Calculations**:
In `CostAnalysis.jsx` and other components:
```javascript
const totalSuppliesCost = filteredSurgeries.reduce((sum, surgery) => 
    sum + (surgery.supplies_cost || 0) + 
          (surgery.implants_cost || 0) + 
          (surgery.medications_cost || 0), 0
);

const profit = totalRevenue - totalCost - totalORCost - totalSuppliesCost;
```

**Estimated Implementation Time**: 2-3 hours

---

### **Option 2: Full Inventory Management System** (Comprehensive)

Build a complete supplies tracking system.

#### **New Database Tables**:

```sql
-- 1. Supplies Catalog
CREATE TABLE supplies (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,  -- 'Suture', 'Implant', 'Medication', etc.
    unit_cost DECIMAL(10, 2) NOT NULL,
    unit_of_measure TEXT,    -- 'each', 'box', 'ml', etc.
    vendor TEXT,
    stock_quantity INTEGER DEFAULT 0,
    reorder_level INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Surgery Supplies Junction Table
CREATE TABLE surgery_supplies (
    id BIGSERIAL PRIMARY KEY,
    surgery_id BIGINT REFERENCES surgeries(id) ON DELETE CASCADE,
    supply_id BIGINT REFERENCES supplies(id) ON DELETE RESTRICT,
    quantity_used INTEGER NOT NULL,
    unit_cost DECIMAL(10, 2) NOT NULL,  -- Snapshot of cost at time of use
    total_cost DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Indexes
CREATE INDEX idx_surgery_supplies_surgery ON surgery_supplies(surgery_id);
CREATE INDEX idx_surgery_supplies_supply ON surgery_supplies(supply_id);
CREATE INDEX idx_supplies_category ON supplies(category);
```

#### **New Components**:

1. **`SuppliesManager.jsx`** - Manage supplies catalog
2. **`InventoryDashboard.jsx`** - Stock levels, reorder alerts
3. **`SurgerySuppliesSelector.jsx`** - Select supplies during surgery scheduling
4. **`SuppliesCostReport.jsx`** - Detailed supplies cost analysis

#### **Features**:
- ✅ Supplies catalog with unit costs
- ✅ Stock tracking
- ✅ Reorder alerts
- ✅ Vendor management
- ✅ Per-surgery supplies tracking
- ✅ Historical cost tracking
- ✅ Supplies usage analytics
- ✅ Cost variance analysis

**Estimated Implementation Time**: 20-30 hours

---

### **Option 3: Hybrid Approach** (Recommended)

Start with **Option 1** (simple tracking) and migrate to **Option 2** later.

**Phase 1** (Immediate - 2-3 hours):
- Add `supplies_cost`, `implants_cost`, `medications_cost` columns
- Add input fields to surgery form
- Update cost calculations

**Phase 2** (Future - 20-30 hours):
- Build full inventory system
- Migrate manual cost entries to itemized tracking
- Add advanced analytics

---

## 📋 Implementation Checklist

### **Phase 1: Basic Supplies Cost Tracking**

- [ ] Create migration: `supabase-migration-add-supplies-costs.sql`
- [ ] Add columns to `surgeries` table:
  - [ ] `supplies_cost`
  - [ ] `implants_cost`
  - [ ] `medications_cost`
- [ ] Update `SurgeryScheduler.jsx`:
  - [ ] Add cost input fields to form
  - [ ] Update form state
  - [ ] Save costs to database
- [ ] Update `CostAnalysis.jsx`:
  - [ ] Include supplies costs in calculations
  - [ ] Display supplies costs in metrics
- [ ] Update `Dashboard.jsx`:
  - [ ] Include supplies costs in profit calculations
- [ ] Update `SurgeonScorecard.jsx` (when implemented):
  - [ ] Include supplies costs in net margin
- [ ] Update profitability guardrails:
  - [ ] Factor in estimated supplies costs
  - [ ] Show warning if supplies push margin negative

### **Phase 2: Full Inventory System** (Future)

- [ ] Design database schema
- [ ] Create supplies catalog
- [ ] Build inventory management UI
- [ ] Implement stock tracking
- [ ] Add reorder alerts
- [ ] Create supplies usage reports
- [ ] Migrate from manual to itemized tracking

---

## 💡 Additional Recommendations

### **1. CPT-Specific Supplies Templates**

Create predefined supplies lists for common procedures:

```javascript
const cptSuppliesTemplates = {
    '27130': {  // Hip Arthroplasty
        implants: 3500,
        supplies: 800,
        medications: 400,
        total: 4700
    },
    '27447': {  // Knee Arthroplasty
        implants: 3200,
        supplies: 750,
        medications: 350,
        total: 4300
    },
    '45378': {  // Colonoscopy
        implants: 0,
        supplies: 150,
        medications: 100,
        total: 250
    }
};
```

Auto-populate supplies costs when CPT codes are selected.

### **2. Supplies Cost Estimation**

For procedures without itemized tracking, use industry averages:
- **Orthopedic surgeries**: 25-35% of CPT reimbursement
- **Endoscopy**: 5-10% of CPT reimbursement
- **General surgery**: 15-20% of CPT reimbursement

### **3. Vendor Integration**

Integrate with medical supply vendors for:
- Real-time pricing
- Automated ordering
- Invoice reconciliation

---

## 🎯 Priority Recommendation

**START WITH OPTION 1** (Simple Supplies Tracking)

**Why?**
1. ✅ Quick to implement (2-3 hours)
2. ✅ Immediate impact on financial accuracy
3. ✅ No complex UI changes
4. ✅ Easy to migrate to full system later
5. ✅ Provides 80% of value with 20% of effort

**Next Steps**:
1. Create database migration
2. Add input fields to surgery form
3. Update cost calculations
4. Test with real surgeries
5. Monitor accuracy improvement

---

## 📊 Expected Impact

### **Before Supplies Tracking**:
- Profit margins: **OVERSTATED** by 15-40%
- Cost visibility: **POOR**
- Financial decisions: **INACCURATE**

### **After Supplies Tracking**:
- Profit margins: **ACCURATE**
- Cost visibility: **GOOD**
- Financial decisions: **DATA-DRIVEN**

---

**Document Version**: 1.0  
**Last Updated**: December 23, 2025  
**Status**: Awaiting Implementation Decision
