-- FIX ALL DATABASE SCHEMA ISSUES
-- Run this entire script in your Supabase SQL Editor to ensure all features work correctly.

-- 1. Fix OR Block Schedule Table (Crucial for Calendar to work)
ALTER TABLE or_block_schedule ADD COLUMN IF NOT EXISTS date DATE;
ALTER TABLE or_block_schedule ALTER COLUMN day_of_week DROP NOT NULL;
ALTER TABLE or_block_schedule ALTER COLUMN week_of_month DROP NOT NULL;

-- 2. Fix Surgeons Table (Crucial for Cosmetic Surgery features)
ALTER TABLE surgeons ADD COLUMN IF NOT EXISTS is_cosmetic_surgeon BOOLEAN DEFAULT false;

-- 3. Fix CPT Codes Table (Crucial for Procedure Indicators)
ALTER TABLE cpt_codes ADD COLUMN IF NOT EXISTS procedure_indicator TEXT;

-- 4. Verify/Create Indexes (For performance)
CREATE INDEX IF NOT EXISTS idx_or_schedule_date ON or_block_schedule(date);
