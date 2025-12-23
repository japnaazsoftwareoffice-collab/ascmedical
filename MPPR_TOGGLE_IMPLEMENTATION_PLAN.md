# Medicare MPPR Toggle Implementation Plan

## Overview
Add a setting to enable/disable Medicare Multi-Procedure Payment Reduction (MPPR) across the entire application.

---

## Database Changes

### 1. Add Column to Settings Table
**File**: `supabase-migration-add-mppr-setting.sql`
```sql
ALTER TABLE settings
ADD COLUMN IF NOT EXISTS apply_medicare_mppr BOOLEAN DEFAULT false;
```

---

## Frontend Changes

### 2. Update Settings Component
**File**: `src/components/Settings.jsx`

**Add to state** (line 7-16):
```javascript
const [settings, setSettings] = useState({
    // ... existing fields
    apply_medicare_mppr: false  // ADD THIS
});
```

**Update handleChange** to handle checkboxes:
```javascript
const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
    }));
};
```

**Add UI toggle** (after NPI field, around line 242):
```jsx
<div className="form-row">
    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
            <input
                type="checkbox"
                name="apply_medicare_mppr"
                checked={settings.apply_medicare_mppr || false}
                onChange={handleChange}
                style={{ width: '20px', height: '20px', cursor: 'pointer' }}
            />
            <div>
                <strong>Apply Medicare Multi-Procedure Payment Reduction (MPPR)</strong>
                <div style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.25rem' }}>
                    When enabled, CPT revenue calculations will apply Medicare's 50% reduction for additional procedures.
                    When disabled, full CPT reimbursement rates will be shown.
                </div>
            </div>
        </label>
    </div>
</div>
```

---

### 3. Update App.jsx to Load Settings
**File**: `src/App.jsx`

**Add settings to state**:
```javascript
const [settings, setSettings] = useState(null);
```

**Load settings in useEffect**:
```javascript
const loadedSettings = await db.getSettings();
setSettings(loadedSettings);
```

**Pass settings to components**:
```javascript
<Dashboard settings={settings} ... />
<SurgeryScheduler settings={settings} ... />
```

---

### 4. Update Revenue Calculation Utility
**File**: `src/utils/hospitalUtils.js`

**Update `calculateMedicareRevenue` function**:
```javascript
export const calculateMedicareRevenue = (cptCodes, cptCodesList, applyMPPR = false) => {
    if (!cptCodes || cptCodes.length === 0) return 0;
    
    const sortedCodes = cptCodes
        .map(code => {
            const cpt = cptCodesList.find(c => c.code === code);
            return { code, reimbursement: cpt?.reimbursement || 0 };
        })
        .sort((a, b) => b.reimbursement - a.reimbursement);
    
    if (!applyMPPR) {
        // Return full sum without MPPR
        return sortedCodes.reduce((sum, cpt) => sum + cpt.reimbursement, 0);
    }
    
    // Apply MPPR: 100% for first, 50% for rest
    return sortedCodes.reduce((sum, cpt, index) => {
        return sum + (index === 0 ? cpt.reimbursement : cpt.reimbursement * 0.5);
    }, 0);
};
```

---

### 5. Update Components to Use Setting

#### A. **SurgeryScheduler.jsx**
**Update projectedRevenue calculation** (around line 443):
```javascript
const projectedRevenue = useMemo(() => {
    if (!formData.selectedCptCodes || formData.selectedCptCodes.length === 0 || isCosmeticSurgeon) {
        return 0;
    }
    return calculateMedicareRevenue(
        formData.selectedCptCodes, 
        cptCodes,
        settings?.apply_medicare_mppr || false  // ADD THIS
    );
}, [formData.selectedCptCodes, cptCodes, isCosmeticSurgeon, settings]);
```

**Update Surgery Log calculation** (around line 637):
```javascript
cptTotal = surgery.cpt_codes?.reduce((sum, code) => {
    const cptCode = cptCodes.find(c => c.code === code);
    return sum + (cptCode?.reimbursement || 0);
}, 0) || 0;

// If MPPR is enabled, apply reduction
if (settings?.apply_medicare_mppr && surgery.cpt_codes?.length > 1) {
    const sorted = surgery.cpt_codes
        .map(code => cptCodes.find(c => c.code === code))
        .filter(c => c)
        .sort((a, b) => b.reimbursement - a.reimbursement);
    
    cptTotal = sorted.reduce((sum, cpt, index) => {
        return sum + (index === 0 ? cpt.reimbursement : cpt.reimbursement * 0.5);
    }, 0);
}
```

#### B. **Dashboard.jsx**
Update any revenue calculations to check `settings?.apply_medicare_mppr`

#### C. **AIAnalystModal.jsx** (OR Utilization)
Update revenue calculations to check `settings?.apply_medicare_mppr`

#### D. **SurgeonScorecard.jsx**
Update revenue calculations to check `settings?.apply_medicare_mppr`

---

## Testing Checklist

- [ ] Run SQL migration in Supabase
- [ ] Settings page shows MPPR toggle
- [ ] Toggle can be saved
- [ ] **With MPPR OFF**: Full CPT totals shown everywhere
- [ ] **With MPPR ON**: Reduced totals shown (50% for 2nd+ procedures)
- [ ] Test in:
  - [ ] Surgery Scheduler form
  - [ ] Surgery Log table
  - [ ] Dashboard
  - [ ] OR Utilization (AI Analyst)
  - [ ] Surgeon Scorecard

---

## Files to Modify

1. ✅ `supabase-migration-add-mppr-setting.sql` (created)
2. ⏳ `src/components/Settings.jsx`
3. ⏳ `src/App.jsx`
4. ⏳ `src/utils/hospitalUtils.js`
5. ⏳ `src/components/SurgeryScheduler.jsx`
6. ⏳ `src/components/Dashboard.jsx`
7. ⏳ `src/components/AIAnalystModal.jsx`
8. ⏳ `src/lib/supabase.js` (if getSettings needs update)

---

## Priority Order

1. Database migration
2. Settings UI
3. App.jsx to load settings
4. hospitalUtils.js update
5. SurgeryScheduler.jsx
6. Other components

