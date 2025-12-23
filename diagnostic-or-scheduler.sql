-- ============================================
-- OR SCHEDULER & DATABASE DIAGNOSTIC
-- Run this entire script in Supabase SQL Editor
-- ============================================

-- ============================================
-- SECTION 1: CHECK OR BLOCK SCHEDULE TABLE
-- ============================================

SELECT '=== OR BLOCK SCHEDULE TABLE ===' as section;

-- Check if table exists
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'or_block_schedule'
        ) THEN '✅ or_block_schedule table EXISTS'
        ELSE '❌ or_block_schedule table MISSING'
    END as table_status;

-- Show table structure
SELECT 
    column_name, 
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'or_block_schedule'
ORDER BY ordinal_position;

-- Count records
SELECT 
    COUNT(*) as total_blocks,
    COUNT(DISTINCT room_name) as unique_rooms,
    COUNT(DISTINCT provider_name) as unique_providers
FROM or_block_schedule;

-- Show sample data
SELECT * FROM or_block_schedule 
ORDER BY date DESC 
LIMIT 5;

-- ============================================
-- SECTION 2: CHECK CPT CODES TABLE
-- ============================================

SELECT '=== CPT CODES TABLE ===' as section;

-- Check if average_duration column exists
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT FROM information_schema.columns
            WHERE table_name = 'cpt_codes' 
            AND column_name = 'average_duration'
        ) THEN '✅ average_duration column EXISTS'
        ELSE '❌ average_duration column MISSING'
    END as column_status;

-- Show all columns
SELECT 
    column_name, 
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'cpt_codes'
ORDER BY ordinal_position;

-- Check duration data
SELECT 
    COUNT(*) as total_codes,
    COUNT(average_duration) as codes_with_duration,
    COUNT(*) - COUNT(average_duration) as codes_missing_duration,
    MIN(average_duration) as min_duration,
    MAX(average_duration) as max_duration,
    ROUND(AVG(average_duration), 0) as avg_duration
FROM cpt_codes;

-- Show codes by duration status
SELECT 
    CASE 
        WHEN average_duration IS NULL THEN '❌ NULL (needs update)'
        WHEN average_duration = 60 THEN '⚠️ Default 60 min'
        ELSE '✅ Has custom duration'
    END as duration_status,
    COUNT(*) as count
FROM cpt_codes
GROUP BY duration_status
ORDER BY count DESC;

-- Show top 10 procedures by duration
SELECT 
    code,
    description,
    category,
    average_duration,
    reimbursement
FROM cpt_codes
WHERE average_duration IS NOT NULL
ORDER BY average_duration DESC
LIMIT 10;

-- ============================================
-- SECTION 3: CHECK SURGERIES TABLE
-- ============================================

SELECT '=== SURGERIES TABLE ===' as section;

-- Check if or_room column exists
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT FROM information_schema.columns
            WHERE table_name = 'surgeries' 
            AND column_name = 'or_room'
        ) THEN '✅ or_room column EXISTS'
        ELSE '❌ or_room column MISSING'
    END as column_status;

-- Show table structure
SELECT 
    column_name, 
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'surgeries'
ORDER BY ordinal_position;

-- Count surgeries
SELECT 
    COUNT(*) as total_surgeries,
    COUNT(DISTINCT surgeon_id) as unique_surgeons,
    COUNT(DISTINCT patient_id) as unique_patients
FROM surgeries;

-- ============================================
-- SECTION 4: CHECK SURGEONS TABLE
-- ============================================

SELECT '=== SURGEONS TABLE ===' as section;

-- Show table structure
SELECT 
    column_name, 
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'surgeons'
ORDER BY ordinal_position;

-- Count surgeons
SELECT 
    COUNT(*) as total_surgeons,
    COUNT(DISTINCT specialty) as unique_specialties,
    SUM(CASE WHEN is_cosmetic_surgeon THEN 1 ELSE 0 END) as cosmetic_surgeons
FROM surgeons;

-- Show sample surgeons
SELECT id, name, specialty, is_cosmetic_surgeon
FROM surgeons
LIMIT 5;

-- ============================================
-- SECTION 5: CHECK PATIENTS TABLE
-- ============================================

SELECT '=== PATIENTS TABLE ===' as section;

-- Show table structure
SELECT 
    column_name, 
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'patients'
ORDER BY ordinal_position;

-- Count patients
SELECT 
    COUNT(*) as total_patients,
    COUNT(insurance_provider) as patients_with_insurance
FROM patients;

-- ============================================
-- SECTION 6: SUMMARY
-- ============================================

SELECT '=== SUMMARY ===' as section;

-- Overall status
SELECT 
    'or_block_schedule' as table_name,
    CASE WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'or_block_schedule') 
        THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
UNION ALL
SELECT 
    'cpt_codes',
    CASE WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'cpt_codes') 
        THEN '✅ EXISTS' ELSE '❌ MISSING' END
UNION ALL
SELECT 
    'cpt_codes.average_duration',
    CASE WHEN EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'cpt_codes' AND column_name = 'average_duration') 
        THEN '✅ EXISTS' ELSE '❌ MISSING' END
UNION ALL
SELECT 
    'surgeries',
    CASE WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'surgeries') 
        THEN '✅ EXISTS' ELSE '❌ MISSING' END
UNION ALL
SELECT 
    'surgeries.or_room',
    CASE WHEN EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'surgeries' AND column_name = 'or_room') 
        THEN '✅ EXISTS' ELSE '❌ MISSING' END
UNION ALL
SELECT 
    'surgeons',
    CASE WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'surgeons') 
        THEN '✅ EXISTS' ELSE '❌ MISSING' END
UNION ALL
SELECT 
    'patients',
    CASE WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'patients') 
        THEN '✅ EXISTS' ELSE '❌ MISSING' END;

-- ============================================
-- END OF DIAGNOSTIC
-- ============================================

SELECT '=== DIAGNOSTIC COMPLETE ===' as section;
SELECT 'Review the results above to identify any missing tables or columns' as instructions;
