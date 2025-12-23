-- Add average_duration column to cpt_codes table and populate with realistic surgical times
-- Run this in your Supabase SQL Editor

-- Step 1: Add the average_duration column (if it doesn't exist)
ALTER TABLE cpt_codes 
ADD COLUMN IF NOT EXISTS average_duration INTEGER;

-- Step 2: Update with realistic surgical durations (in minutes)

-- Joint Replacements
UPDATE cpt_codes SET average_duration = 120 WHERE code = '27130'; -- Total Hip
UPDATE cpt_codes SET average_duration = 110 WHERE code = '27447'; -- Total Knee
UPDATE cpt_codes SET average_duration = 120 WHERE code = '23472'; -- Total Shoulder
UPDATE cpt_codes SET average_duration = 180 WHERE code = '27134'; -- Revision Hip
UPDATE cpt_codes SET average_duration = 165 WHERE code = '27486'; -- Revision Knee

-- Spine Surgeries
UPDATE cpt_codes SET average_duration = 150 WHERE code = '22612'; -- Lumbar Fusion Single
UPDATE cpt_codes SET average_duration = 45 WHERE code = '22614'; -- Lumbar Fusion Additional
UPDATE cpt_codes SET average_duration = 165 WHERE code = '22630'; -- Lumbar Interbody Fusion
UPDATE cpt_codes SET average_duration = 90 WHERE code = '63030'; -- Lumbar Laminectomy Single
UPDATE cpt_codes SET average_duration = 30 WHERE code = '63047'; -- Lumbar Laminectomy Additional

-- Shoulder Arthroscopy & Repairs
UPDATE cpt_codes SET average_duration = 90 WHERE code = '29827'; -- Rotator Cuff Repair
UPDATE cpt_codes SET average_duration = 60 WHERE code = '29826'; -- Shoulder Decompression
UPDATE cpt_codes SET average_duration = 55 WHERE code = '29824'; -- Distal Clavicle Excision
UPDATE cpt_codes SET average_duration = 35 WHERE code = '29806'; -- Shoulder Diagnostic
UPDATE cpt_codes SET average_duration = 50 WHERE code = '23430'; -- Biceps Tenodesis

-- Knee Arthroscopy & Repairs
UPDATE cpt_codes SET average_duration = 45 WHERE code = '29881'; -- Meniscectomy
UPDATE cpt_codes SET average_duration = 60 WHERE code = '29888'; -- Meniscus Repair / ACL
UPDATE cpt_codes SET average_duration = 55 WHERE code = '29882'; -- Meniscectomy M&L
UPDATE cpt_codes SET average_duration = 50 WHERE code = '29879'; -- Abrasion Arthroplasty
UPDATE cpt_codes SET average_duration = 40 WHERE code = '29877'; -- Debridement

-- ACL/PCL Repairs
UPDATE cpt_codes SET average_duration = 105 WHERE code = '27407'; -- PCL Reconstruction
UPDATE cpt_codes SET average_duration = 90 WHERE code = '27427'; -- MCL Reconstruction

-- Hand & Wrist
UPDATE cpt_codes SET average_duration = 75 WHERE code = '25447'; -- Wrist Arthroplasty
UPDATE cpt_codes SET average_duration = 20 WHERE code = '64721'; -- Carpal Tunnel
UPDATE cpt_codes SET average_duration = 15 WHERE code = '26055'; -- Trigger Finger
UPDATE cpt_codes SET average_duration = 25 WHERE code = '26160'; -- Tendon Lesion
UPDATE cpt_codes SET average_duration = 30 WHERE code = '25111'; -- Ganglion Cyst

-- Foot & Ankle
UPDATE cpt_codes SET average_duration = 60 WHERE code = '28297'; -- Bunionectomy
UPDATE cpt_codes SET average_duration = 90 WHERE code = '28725'; -- Ankle Arthrodesis
UPDATE cpt_codes SET average_duration = 55 WHERE code = '27870'; -- Ankle Arthroscopy
UPDATE cpt_codes SET average_duration = 50 WHERE code = '28292'; -- Hallux Valgus

-- Fracture Repairs (ORIF)
UPDATE cpt_codes SET average_duration = 120 WHERE code = '27244'; -- ORIF Femoral
UPDATE cpt_codes SET average_duration = 105 WHERE code = '27759'; -- ORIF Tibial
UPDATE cpt_codes SET average_duration = 95 WHERE code = '23615'; -- ORIF Humerus
UPDATE cpt_codes SET average_duration = 75 WHERE code = '25607'; -- ORIF Radius

-- Injections & Minor
UPDATE cpt_codes SET average_duration = 10 WHERE code = '20610'; -- Arthrocentesis Major
UPDATE cpt_codes SET average_duration = 10 WHERE code = '20605'; -- Arthrocentesis Intermediate

-- Gastroenterology
UPDATE cpt_codes SET average_duration = 30 WHERE code = '43239'; -- EGD with Biopsy
UPDATE cpt_codes SET average_duration = 35 WHERE code = '45378'; -- Colonoscopy
UPDATE cpt_codes SET average_duration = 40 WHERE code = '45380'; -- Colonoscopy with Biopsy
UPDATE cpt_codes SET average_duration = 45 WHERE code = '45385'; -- Colonoscopy with Polypectomy

-- Ophthalmology
UPDATE cpt_codes SET average_duration = 25 WHERE code = '66984'; -- Cataract
UPDATE cpt_codes SET average_duration = 60 WHERE code = '67028'; -- Vitrectomy

-- General Surgery
UPDATE cpt_codes SET average_duration = 20 WHERE code = '10060'; -- I&D Abscess
UPDATE cpt_codes SET average_duration = 15 WHERE code = '11102'; -- Skin Biopsy
UPDATE cpt_codes SET average_duration = 15 WHERE code = '11730'; -- Nail Avulsion
UPDATE cpt_codes SET average_duration = 20 WHERE code = '12001'; -- Wound Repair
UPDATE cpt_codes SET average_duration = 15 WHERE code = '17000'; -- Lesion Destruction
UPDATE cpt_codes SET average_duration = 45 WHERE code = '19120'; -- Breast Lesion
UPDATE cpt_codes SET average_duration = 60 WHERE code = '49505'; -- Hernia Repair
UPDATE cpt_codes SET average_duration = 75 WHERE code = '47562'; -- Cholecystectomy

-- Step 3: Set default duration for any remaining NULL values
UPDATE cpt_codes 
SET average_duration = 60 
WHERE average_duration IS NULL;

-- Step 4: Verify the updates
SELECT code, description, average_duration, category 
FROM cpt_codes 
ORDER BY category, average_duration DESC
LIMIT 20;

-- Step 5: Check statistics
SELECT 
    category,
    COUNT(*) as total_procedures,
    AVG(average_duration) as avg_duration,
    MIN(average_duration) as min_duration,
    MAX(average_duration) as max_duration
FROM cpt_codes
GROUP BY category
ORDER BY avg_duration DESC;
