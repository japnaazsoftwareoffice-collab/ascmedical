-- Check if supplies cost and labor cost columns exist in surgeries table
-- Run this in Supabase SQL Editor

-- Check surgeries table structure
SELECT 
    column_name, 
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'surgeries'
ORDER BY ordinal_position;

-- Check specifically for cost-related columns
SELECT 
    column_name,
    CASE 
        WHEN column_name IN ('supplies_cost', 'implants_cost', 'medications_cost', 'labor_cost') 
        THEN '✅ EXISTS'
        ELSE 'Column'
    END as status
FROM information_schema.columns
WHERE table_name = 'surgeries'
AND column_name LIKE '%cost%'
ORDER BY column_name;

-- Show sample data with cost columns
SELECT 
    id,
    date,
    doctor_name,
    supplies_cost,
    implants_cost,
    medications_cost,
    duration_minutes
FROM surgeries
LIMIT 5;
