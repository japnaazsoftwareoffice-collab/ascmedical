-- Check CPT Codes Table Structure and Data
-- Run this in Supabase SQL Editor to diagnose the issue

-- Step 1: Check what columns exist in cpt_codes table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'cpt_codes'
ORDER BY ordinal_position;

-- Step 2: Check if average_duration column exists and has data
SELECT 
    COUNT(*) as total_codes,
    COUNT(average_duration) as codes_with_duration,
    COUNT(*) - COUNT(average_duration) as codes_missing_duration,
    MIN(average_duration) as min_duration,
    MAX(average_duration) as max_duration,
    AVG(average_duration) as avg_duration
FROM cpt_codes;

-- Step 3: Show sample of CPT codes with their durations
SELECT 
    code,
    description,
    category,
    reimbursement,
    average_duration,
    CASE 
        WHEN average_duration IS NULL THEN '❌ NULL'
        ELSE '✅ Has Value'
    END as status
FROM cpt_codes
ORDER BY reimbursement DESC
LIMIT 20;

-- Step 4: Check if there's a typo - maybe it's average_cost?
SELECT column_name 
FROM information_schema.columns
WHERE table_name = 'cpt_codes' 
AND column_name LIKE '%average%';

-- Step 5: Count by status
SELECT 
    CASE 
        WHEN average_duration IS NULL THEN 'NULL (needs update)'
        WHEN average_duration = 60 THEN 'Default 60 min'
        ELSE 'Has custom duration'
    END as duration_status,
    COUNT(*) as count
FROM cpt_codes
GROUP BY duration_status
ORDER BY count DESC;
