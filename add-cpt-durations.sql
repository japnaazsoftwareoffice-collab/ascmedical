-- ============================================
-- Add average_duration to CPT Codes
-- Run this in Supabase SQL Editor
-- ============================================

-- Step 1: Add the column if it doesn't exist
ALTER TABLE cpt_codes 
ADD COLUMN IF NOT EXISTS average_duration INTEGER;

-- Step 2: Update with realistic surgical durations (in minutes)

-- === ORTHOPEDIC PROCEDURES ===

-- Joint Replacements (110-180 min)
UPDATE cpt_codes SET average_duration = 180 WHERE code = '27134'; -- Revision Total Hip
UPDATE cpt_codes SET average_duration = 165 WHERE code = '27486'; -- Revision Total Knee
UPDATE cpt_codes SET average_duration = 120 WHERE code = '27130'; -- Total Hip Replacement
UPDATE cpt_codes SET average_duration = 120 WHERE code = '23472'; -- Total Shoulder Replacement
UPDATE cpt_codes SET average_duration = 110 WHERE code = '27447'; -- Total Knee Replacement

-- Spine Surgeries (30-165 min)
UPDATE cpt_codes SET average_duration = 165 WHERE code = '22630'; -- Lumbar Interbody Fusion
UPDATE cpt_codes SET average_duration = 150 WHERE code = '22612'; -- Lumbar Fusion (Single Level)
UPDATE cpt_codes SET average_duration = 90 WHERE code = '63030'; -- Lumbar Laminectomy (Single)
UPDATE cpt_codes SET average_duration = 45 WHERE code = '22614'; -- Lumbar Fusion (Additional)
UPDATE cpt_codes SET average_duration = 30 WHERE code = '63047'; -- Lumbar Laminectomy (Additional)

-- Shoulder Arthroscopy & Repairs (35-90 min)
UPDATE cpt_codes SET average_duration = 90 WHERE code = '29827'; -- Rotator Cuff Repair
UPDATE cpt_codes SET average_duration = 60 WHERE code = '29826'; -- Shoulder Decompression
UPDATE cpt_codes SET average_duration = 55 WHERE code = '29824'; -- Distal Clavicle Excision
UPDATE cpt_codes SET average_duration = 50 WHERE code = '23430'; -- Biceps Tenodesis
UPDATE cpt_codes SET average_duration = 35 WHERE code = '29806'; -- Shoulder Diagnostic

-- Knee Arthroscopy & Repairs (40-60 min)
UPDATE cpt_codes SET average_duration = 60 WHERE code = '29888'; -- Meniscus Repair / ACL
UPDATE cpt_codes SET average_duration = 55 WHERE code = '29882'; -- Meniscectomy (M&L)
UPDATE cpt_codes SET average_duration = 50 WHERE code = '29879'; -- Abrasion Arthroplasty
UPDATE cpt_codes SET average_duration = 45 WHERE code = '29881'; -- Meniscectomy
UPDATE cpt_codes SET average_duration = 40 WHERE code = '29877'; -- Knee Debridement

-- ACL/PCL Repairs (90-105 min)
UPDATE cpt_codes SET average_duration = 105 WHERE code = '27407'; -- PCL Reconstruction
UPDATE cpt_codes SET average_duration = 90 WHERE code = '27427'; -- MCL Reconstruction

-- Hand & Wrist (15-75 min)
UPDATE cpt_codes SET average_duration = 75 WHERE code = '25447'; -- Wrist Arthroplasty
UPDATE cpt_codes SET average_duration = 30 WHERE code = '25111'; -- Ganglion Cyst Excision
UPDATE cpt_codes SET average_duration = 25 WHERE code = '26160'; -- Tendon Lesion Excision
UPDATE cpt_codes SET average_duration = 20 WHERE code = '64721'; -- Carpal Tunnel Release
UPDATE cpt_codes SET average_duration = 15 WHERE code = '26055'; -- Trigger Finger Release

-- Foot & Ankle (50-90 min)
UPDATE cpt_codes SET average_duration = 90 WHERE code = '28725'; -- Ankle Arthrodesis
UPDATE cpt_codes SET average_duration = 60 WHERE code = '28297'; -- Bunionectomy
UPDATE cpt_codes SET average_duration = 55 WHERE code = '27870'; -- Ankle Arthroscopy
UPDATE cpt_codes SET average_duration = 50 WHERE code = '28292'; -- Hallux Valgus Correction

-- Fracture Repairs - ORIF (75-120 min)
UPDATE cpt_codes SET average_duration = 120 WHERE code = '27244'; -- ORIF Femoral Fracture
UPDATE cpt_codes SET average_duration = 105 WHERE code = '27759'; -- ORIF Tibial Fracture
UPDATE cpt_codes SET average_duration = 95 WHERE code = '23615'; -- ORIF Proximal Humerus
UPDATE cpt_codes SET average_duration = 75 WHERE code = '25607'; -- ORIF Distal Radius

-- Injections & Minor (10 min)
UPDATE cpt_codes SET average_duration = 10 WHERE code = '20610'; -- Arthrocentesis Major Joint
UPDATE cpt_codes SET average_duration = 10 WHERE code = '20605'; -- Arthrocentesis Intermediate

-- === GASTROENTEROLOGY PROCEDURES ===
UPDATE cpt_codes SET average_duration = 45 WHERE code = '45385'; -- Colonoscopy with Polypectomy
UPDATE cpt_codes SET average_duration = 40 WHERE code = '45380'; -- Colonoscopy with Biopsy
UPDATE cpt_codes SET average_duration = 35 WHERE code = '45378'; -- Colonoscopy, Flexible
UPDATE cpt_codes SET average_duration = 30 WHERE code = '43239'; -- EGD with Biopsy

-- === OPHTHALMOLOGY PROCEDURES ===
UPDATE cpt_codes SET average_duration = 60 WHERE code = '67028'; -- Vitrectomy
UPDATE cpt_codes SET average_duration = 25 WHERE code = '66984'; -- Cataract Surgery with IOL

-- === GENERAL SURGERY PROCEDURES ===
UPDATE cpt_codes SET average_duration = 75 WHERE code = '47562'; -- Laparoscopic Cholecystectomy
UPDATE cpt_codes SET average_duration = 60 WHERE code = '49505'; -- Inguinal Hernia Repair
UPDATE cpt_codes SET average_duration = 45 WHERE code = '19120'; -- Excision Breast Lesion
UPDATE cpt_codes SET average_duration = 20 WHERE code = '10060'; -- I&D Abscess
UPDATE cpt_codes SET average_duration = 20 WHERE code = '12001'; -- Simple Wound Repair
UPDATE cpt_codes SET average_duration = 15 WHERE code = '11102'; -- Tangential Biopsy
UPDATE cpt_codes SET average_duration = 15 WHERE code = '11730'; -- Avulsion of Nail Plate
UPDATE cpt_codes SET average_duration = 15 WHERE code = '17000'; -- Destruction of Lesions

-- Step 3: Set default duration for any remaining NULL values
UPDATE cpt_codes 
SET average_duration = 60 
WHERE average_duration IS NULL;

-- Step 4: Verify the updates
SELECT 
    code, 
    description, 
    average_duration, 
    category,
    reimbursement
FROM cpt_codes 
WHERE average_duration IS NOT NULL
ORDER BY average_duration DESC
LIMIT 20;

-- Step 5: Check statistics by category
SELECT 
    category,
    COUNT(*) as total_procedures,
    AVG(average_duration) as avg_duration,
    MIN(average_duration) as min_duration,
    MAX(average_duration) as max_duration
FROM cpt_codes
WHERE average_duration IS NOT NULL
GROUP BY category
ORDER BY avg_duration DESC;

-- Step 6: Count how many were updated
SELECT 
    COUNT(*) as total_codes,
    COUNT(average_duration) as codes_with_duration,
    COUNT(*) - COUNT(average_duration) as codes_missing_duration
FROM cpt_codes;
