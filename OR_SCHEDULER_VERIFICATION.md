# ✅ OR Scheduler & Database Verification Checklist

**Date**: December 23, 2025  
**Purpose**: Verify OR Scheduler functionality and database schema completeness

---

## 🔍 **OR SCHEDULER VERIFICATION**

### **✅ Component Status**

#### **1. OR Block Schedule Component** (`ORBlockSchedule.jsx`)
- ✅ Component exists and is complete
- ✅ Database integration working
- ✅ Mock data fallback implemented
- ✅ CRUD operations (Create, Read, Update, Delete)
- ✅ Month navigation
- ✅ Surgeon dropdown integration
- ✅ Time format conversion (HHMM ↔ HH:MM)
- ✅ Day of week and week of month calculation

#### **2. Database Functions** (`supabase.js`)
- ✅ `getORBlockSchedule()` - Fetch all blocks
- ✅ `addORBlockSchedule()` - Create new block
- ✅ `updateORBlockSchedule()` - Update existing block
- ✅ `deleteORBlockSchedule()` - Delete block

#### **3. Features**
- ✅ 5 Rooms: OR 1, OR 2, OR 3, OR 4, Procedure Room
- ✅ Grouped by weekday (Monday-Friday)
- ✅ Week of month labels (First, Second, Third, Fourth, Fifth)
- ✅ Click to add/edit blocks
- ✅ Surgeon selection from database
- ✅ Time range selection
- ✅ Date picker for flexible scheduling
- ✅ Delete/clear blocks

---

## 📊 **DATABASE SCHEMA VERIFICATION**

### **Required Tables**

#### **1. ✅ `or_block_schedule` Table**
```sql
CREATE TABLE or_block_schedule (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    room_name TEXT NOT NULL,
    day_of_week TEXT,
    week_of_month TEXT,
    provider_name TEXT NOT NULL,
    start_time TEXT NOT NULL,  -- HHMM format
    end_time TEXT NOT NULL,    -- HHMM format
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

**Migration File**: ✅ `supabase-migration-or-schedule.sql`

---

#### **2. ✅ `cpt_codes` Table**
```sql
CREATE TABLE cpt_codes (
    id SERIAL PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    description TEXT NOT NULL,
    reimbursement NUMERIC NOT NULL,
    category TEXT,
    procedure_indicator TEXT,
    body_part TEXT,
    average_duration INTEGER,  -- ← NEW COLUMN
    created_at TIMESTAMP DEFAULT NOW()
);
```

**Required Columns**:
- ✅ `id`
- ✅ `code`
- ✅ `description`
- ✅ `reimbursement`
- ✅ `category`
- ✅ `procedure_indicator`
- ✅ `body_part`
- ⚠️ `average_duration` - **NEEDS TO BE ADDED/POPULATED**

**Migration Files**:
- ✅ `supabase-schema.sql` (base table)
- ✅ `supabase-migration-add-average-duration.sql` (add column)
- ✅ `add-cpt-durations.sql` (populate values)

---

#### **3. ✅ `surgeries` Table**
```sql
CREATE TABLE surgeries (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES patients(id),
    surgeon_id INTEGER REFERENCES surgeons(id),
    doctor_name TEXT,
    date DATE NOT NULL,
    start_time TEXT,
    duration_minutes INTEGER,
    cpt_codes TEXT[],  -- Array of CPT codes
    status TEXT DEFAULT 'scheduled',
    or_room INTEGER,  -- ← OR room assignment
    notes TEXT,
    supplies_cost NUMERIC,
    implants_cost NUMERIC,
    medications_cost NUMERIC,
    created_at TIMESTAMP DEFAULT NOW()
);
```

**Required Columns**:
- ✅ All base columns exist
- ✅ `or_room` for OR assignment
- ✅ Cost tracking columns

---

#### **4. ✅ `surgeons` Table**
```sql
CREATE TABLE surgeons (
    id SERIAL PRIMARY KEY,
    firstname TEXT,
    lastname TEXT,
    name TEXT,  -- Full name
    specialty TEXT,
    license_number TEXT,
    email TEXT,
    phone TEXT,
    is_cosmetic_surgeon BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);
```

**Required Columns**:
- ✅ All columns exist
- ✅ `is_cosmetic_surgeon` flag

---

#### **5. ✅ `patients` Table**
```sql
CREATE TABLE patients (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    dob DATE,
    mrn TEXT UNIQUE,
    phone TEXT,
    email TEXT,
    address TEXT,
    insurance_provider TEXT,
    insurance_policy_number TEXT,
    insurance_group_number TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

**Required Columns**:
- ✅ All base columns exist
- ✅ Insurance fields

---

## ⚠️ **CRITICAL: Database Changes Needed**

### **1. Add `average_duration` Column to `cpt_codes`**

**Status**: ⚠️ **NEEDS TO BE RUN**

**SQL to Run**:
```sql
-- Run this in Supabase SQL Editor
ALTER TABLE cpt_codes 
ADD COLUMN IF NOT EXISTS average_duration INTEGER;
```

**File**: `supabase-migration-add-average-duration.sql` (line 1-3)

---

### **2. Populate `average_duration` Values**

**Status**: ⚠️ **NEEDS TO BE RUN**

**SQL to Run**:
```sql
-- Run this in Supabase SQL Editor
-- Copy from: add-cpt-durations.sql
UPDATE cpt_codes SET average_duration = 180 WHERE code = '27134';
UPDATE cpt_codes SET average_duration = 120 WHERE code = '27130';
-- ... (see add-cpt-durations.sql for complete list)
```

**File**: `add-cpt-durations.sql`

---

## 🔧 **VERIFICATION STEPS**

### **Step 1: Check OR Block Schedule Table**

Run in Supabase SQL Editor:
```sql
-- Check if table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = 'or_block_schedule'
);

-- Check table structure
SELECT column_name, data_type 
FROM information_schema.columns
WHERE table_name = 'or_block_schedule'
ORDER BY ordinal_position;

-- Check sample data
SELECT * FROM or_block_schedule LIMIT 5;
```

**Expected Result**: ✅ Table exists with correct columns

---

### **Step 2: Check CPT Codes Table**

Run in Supabase SQL Editor:
```sql
-- Check if average_duration column exists
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'cpt_codes' 
AND column_name = 'average_duration';

-- Check how many codes have durations
SELECT 
    COUNT(*) as total_codes,
    COUNT(average_duration) as codes_with_duration,
    COUNT(*) - COUNT(average_duration) as codes_missing_duration
FROM cpt_codes;

-- Show sample with durations
SELECT code, description, reimbursement, average_duration, category
FROM cpt_codes
WHERE average_duration IS NOT NULL
ORDER BY average_duration DESC
LIMIT 10;
```

**Expected Result**: 
- ✅ Column exists
- ⚠️ If all NULL → Run `add-cpt-durations.sql`

---

### **Step 3: Check Surgeries Table**

Run in Supabase SQL Editor:
```sql
-- Check table structure
SELECT column_name, data_type 
FROM information_schema.columns
WHERE table_name = 'surgeries'
ORDER BY ordinal_position;

-- Check if or_room column exists
SELECT column_name 
FROM information_schema.columns
WHERE table_name = 'surgeries' 
AND column_name = 'or_room';
```

**Expected Result**: ✅ All columns exist including `or_room`

---

### **Step 4: Test OR Scheduler in App**

**Manual Testing**:
1. ✅ Open app → Go to Surgery Scheduler
2. ✅ Click "OR Block Schedule" tab
3. ✅ Verify month grid displays
4. ✅ Click a cell to add block
5. ✅ Select surgeon from dropdown
6. ✅ Set start/end time
7. ✅ Save block
8. ✅ Verify block appears in grid
9. ✅ Click block to edit
10. ✅ Delete block
11. ✅ Navigate to different months

**Expected Result**: ✅ All operations work smoothly

---

## 📋 **QUICK CHECKLIST**

### **Code Files**
- ✅ `src/components/ORBlockSchedule.jsx` - Complete
- ✅ `src/components/ORBlockSchedule.css` - Exists
- ✅ `src/lib/supabase.js` - Has OR schedule functions
- ✅ `src/components/SurgeryScheduler.jsx` - Integrates OR schedule

### **Database Tables**
- ✅ `or_block_schedule` - Should exist
- ✅ `cpt_codes` - Should exist
- ⚠️ `cpt_codes.average_duration` - **NEEDS VERIFICATION**
- ✅ `surgeries` - Should exist
- ✅ `surgeons` - Should exist
- ✅ `patients` - Should exist

### **SQL Migration Files**
- ✅ `supabase-schema.sql` - Base schema
- ✅ `supabase-migration-or-schedule.sql` - OR schedule table
- ✅ `supabase-migration-add-average-duration.sql` - Add duration column
- ✅ `add-cpt-durations.sql` - Populate durations
- ✅ `check-cpt-durations.sql` - Diagnostic queries

---

## 🚨 **ACTION REQUIRED**

### **Priority 1: Add average_duration Column**

**If not already done**, run in Supabase:
```sql
ALTER TABLE cpt_codes 
ADD COLUMN IF NOT EXISTS average_duration INTEGER;
```

### **Priority 2: Populate Duration Values**

Run the complete SQL from `add-cpt-durations.sql`:
- Updates 60+ common procedures
- Sets default 60 min for remaining codes

### **Priority 3: Verify OR Block Schedule**

Check if `or_block_schedule` table exists:
```sql
SELECT * FROM or_block_schedule LIMIT 1;
```

If error → Run `supabase-migration-or-schedule.sql`

---

## ✅ **VERIFICATION SUMMARY**

| Component | Status | Action Needed |
|-----------|--------|---------------|
| **OR Scheduler Code** | ✅ Complete | None |
| **Database Functions** | ✅ Complete | None |
| **or_block_schedule Table** | ⚠️ Unknown | Verify exists |
| **cpt_codes.average_duration** | ⚠️ Unknown | Add & populate |
| **Other Tables** | ✅ Should exist | Verify |

---

## 🎯 **NEXT STEPS**

1. **Run Diagnostic Queries** (Step 1-3 above)
2. **Run Missing Migrations** (if needed)
3. **Test OR Scheduler** (Step 4 above)
4. **Report Results** (Share findings)

---

## 📞 **SUPPORT**

If any verification fails:
1. Share the error message
2. Share diagnostic query results
3. I'll provide exact fix

**Status**: ⚠️ **VERIFICATION NEEDED**
