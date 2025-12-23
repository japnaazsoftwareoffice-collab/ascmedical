-- Add High-Paying Orthopedic CPT Codes to Supabase Database
-- Run this in your Supabase SQL Editor

-- First, let's clear any existing test data (optional)
-- DELETE FROM cpt_codes WHERE code IN ('0266T', '0267T');

-- === HIGH-PAYING ORTHOPEDIC SURGERIES ===

-- Joint Replacements (Highest Revenue)
INSERT INTO cpt_codes (code, description, reimbursement, category, procedure_indicator) VALUES
('27130', 'Total Hip Replacement', 15000, 'Orthopedics', 'S'),
('27447', 'Total Knee Replacement', 14500, 'Orthopedics', 'S'),
('23472', 'Total Shoulder Replacement', 14200, 'Orthopedics', 'S'),
('27134', 'Revision Total Hip Replacement', 18000, 'Orthopedics', 'S'),
('27486', 'Revision Total Knee Replacement', 17500, 'Orthopedics', 'S')
ON CONFLICT (code) DO UPDATE SET
    description = EXCLUDED.description,
    reimbursement = EXCLUDED.reimbursement,
    category = EXCLUDED.category,
    procedure_indicator = EXCLUDED.procedure_indicator;

-- Spine Surgeries (Very High Revenue)
INSERT INTO cpt_codes (code, description, reimbursement, category, procedure_indicator) VALUES
('22612', 'Lumbar Fusion (Single Level)', 16500, 'Orthopedics', 'S'),
('22614', 'Lumbar Fusion (Additional Level)', 8200, 'Orthopedics', 'A'),
('22630', 'Lumbar Interbody Fusion', 17200, 'Orthopedics', 'S'),
('63030', 'Lumbar Laminectomy (Single Level)', 12500, 'Orthopedics', 'S'),
('63047', 'Lumbar Laminectomy (Additional Level)', 6200, 'Orthopedics', 'A')
ON CONFLICT (code) DO UPDATE SET
    description = EXCLUDED.description,
    reimbursement = EXCLUDED.reimbursement,
    category = EXCLUDED.category,
    procedure_indicator = EXCLUDED.procedure_indicator;

-- Shoulder Arthroscopy & Repairs
INSERT INTO cpt_codes (code, description, reimbursement, category, procedure_indicator) VALUES
('29827', 'Arthroscopy Shoulder with Rotator Cuff Repair', 8500, 'Orthopedics', 'S'),
('29826', 'Arthroscopy Shoulder with Decompression', 6800, 'Orthopedics', 'S'),
('29824', 'Arthroscopy Shoulder with Distal Clavicle Excision', 6200, 'Orthopedics', 'S'),
('29806', 'Arthroscopy Shoulder Diagnostic', 4500, 'Orthopedics', 'S'),
('23430', 'Biceps Tenodesis', 5800, 'Orthopedics', 'S')
ON CONFLICT (code) DO UPDATE SET
    description = EXCLUDED.description,
    reimbursement = EXCLUDED.reimbursement,
    category = EXCLUDED.category,
    procedure_indicator = EXCLUDED.procedure_indicator;

-- Knee Arthroscopy & Repairs
INSERT INTO cpt_codes (code, description, reimbursement, category, procedure_indicator) VALUES
('29881', 'Arthroscopy Knee with Meniscectomy', 5500, 'Orthopedics', 'S'),
('29888', 'Arthroscopy Knee with Meniscus Repair', 6800, 'Orthopedics', 'S'),
('29882', 'Arthroscopy Knee with Meniscectomy (Medial & Lateral)', 6200, 'Orthopedics', 'S'),
('29879', 'Arthroscopy Knee with Abrasion Arthroplasty', 5800, 'Orthopedics', 'S'),
('29877', 'Arthroscopy Knee with Debridement', 4800, 'Orthopedics', 'S')
ON CONFLICT (code) DO UPDATE SET
    description = EXCLUDED.description,
    reimbursement = EXCLUDED.reimbursement,
    category = EXCLUDED.category,
    procedure_indicator = EXCLUDED.procedure_indicator;

-- ACL/PCL Repairs (Sports Medicine)
INSERT INTO cpt_codes (code, description, reimbursement, category, procedure_indicator) VALUES
('27407', 'PCL Reconstruction', 9200, 'Orthopedics', 'S'),
('27427', 'Ligamentous Reconstruction (MCL)', 7800, 'Orthopedics', 'S')
ON CONFLICT (code) DO UPDATE SET
    description = EXCLUDED.description,
    reimbursement = EXCLUDED.reimbursement,
    category = EXCLUDED.category,
    procedure_indicator = EXCLUDED.procedure_indicator;

-- Note: 29888 is used for both ACL Reconstruction and Meniscus Repair
-- Update the existing one to ACL if needed
UPDATE cpt_codes SET 
    description = 'ACL Reconstruction',
    reimbursement = 9500
WHERE code = '29888';

-- Hand & Wrist Surgeries
INSERT INTO cpt_codes (code, description, reimbursement, category, procedure_indicator) VALUES
('25447', 'Arthroplasty with Implant (Wrist)', 8200, 'Orthopedics', 'S'),
('64721', 'Carpal Tunnel Release', 3800, 'Orthopedics', 'S'),
('26055', 'Trigger Finger Release', 2800, 'Orthopedics', 'S'),
('26160', 'Excision Tendon Lesion', 3200, 'Orthopedics', 'S'),
('25111', 'Excision Ganglion Cyst (Wrist)', 3500, 'Orthopedics', 'S')
ON CONFLICT (code) DO UPDATE SET
    description = EXCLUDED.description,
    reimbursement = EXCLUDED.reimbursement,
    category = EXCLUDED.category,
    procedure_indicator = EXCLUDED.procedure_indicator;

-- Foot & Ankle Surgeries
INSERT INTO cpt_codes (code, description, reimbursement, category, procedure_indicator) VALUES
('28297', 'Bunionectomy with Metatarsal Osteotomy', 5200, 'Orthopedics', 'S'),
('28725', 'Arthrodesis (Ankle)', 7800, 'Orthopedics', 'S'),
('27870', 'Arthroscopy Ankle Surgical', 5500, 'Orthopedics', 'S'),
('28292', 'Hallux Valgus Correction', 4800, 'Orthopedics', 'S')
ON CONFLICT (code) DO UPDATE SET
    description = EXCLUDED.description,
    reimbursement = EXCLUDED.reimbursement,
    category = EXCLUDED.category,
    procedure_indicator = EXCLUDED.procedure_indicator;

-- Fracture Repairs (ORIF)
INSERT INTO cpt_codes (code, description, reimbursement, category, procedure_indicator) VALUES
('27244', 'ORIF Femoral Fracture', 11500, 'Orthopedics', 'S'),
('27759', 'ORIF Tibial Fracture', 10200, 'Orthopedics', 'S'),
('23615', 'ORIF Proximal Humerus Fracture', 9800, 'Orthopedics', 'S'),
('25607', 'ORIF Distal Radius Fracture', 7500, 'Orthopedics', 'S')
ON CONFLICT (code) DO UPDATE SET
    description = EXCLUDED.description,
    reimbursement = EXCLUDED.reimbursement,
    category = EXCLUDED.category,
    procedure_indicator = EXCLUDED.procedure_indicator;

-- Injections & Minor Procedures
INSERT INTO cpt_codes (code, description, reimbursement, category, procedure_indicator) VALUES
('20610', 'Arthrocentesis, Major Joint', 2500, 'Orthopedics', 'S'),
('20605', 'Arthrocentesis, Intermediate Joint', 1800, 'Orthopedics', 'S')
ON CONFLICT (code) DO UPDATE SET
    description = EXCLUDED.description,
    reimbursement = EXCLUDED.reimbursement,
    category = EXCLUDED.category,
    procedure_indicator = EXCLUDED.procedure_indicator;

-- === OTHER SPECIALTIES ===

-- Gastroenterology
INSERT INTO cpt_codes (code, description, reimbursement, category, procedure_indicator) VALUES
('43239', 'EGD with Biopsy', 3000, 'Gastroenterology', 'S'),
('45378', 'Colonoscopy, Flexible', 3200, 'Gastroenterology', 'S'),
('45380', 'Colonoscopy with Biopsy', 3800, 'Gastroenterology', 'S'),
('45385', 'Colonoscopy with Polypectomy', 4200, 'Gastroenterology', 'S')
ON CONFLICT (code) DO UPDATE SET
    description = EXCLUDED.description,
    reimbursement = EXCLUDED.reimbursement,
    category = EXCLUDED.category,
    procedure_indicator = EXCLUDED.procedure_indicator;

-- Ophthalmology
INSERT INTO cpt_codes (code, description, reimbursement, category, procedure_indicator) VALUES
('66984', 'Cataract Surgery with IOL', 4000, 'Ophthalmology', 'S'),
('67028', 'Vitrectomy', 5500, 'Ophthalmology', 'S')
ON CONFLICT (code) DO UPDATE SET
    description = EXCLUDED.description,
    reimbursement = EXCLUDED.reimbursement,
    category = EXCLUDED.category,
    procedure_indicator = EXCLUDED.procedure_indicator;

-- General Surgery
INSERT INTO cpt_codes (code, description, reimbursement, category, procedure_indicator) VALUES
('10060', 'Incision and Drainage of Abscess', 2000, 'General', 'S'),
('11102', 'Tangential Biopsy of Skin', 1800, 'General', 'S'),
('11730', 'Avulsion of Nail Plate', 1600, 'General', 'S'),
('12001', 'Simple Repair of Superficial Wounds', 2200, 'General', 'S'),
('17000', 'Destruction of Premalignant Lesions', 1900, 'General', 'S'),
('19120', 'Excision Breast Lesion', 4500, 'General', 'S'),
('49505', 'Inguinal Hernia Repair', 5800, 'General', 'S'),
('47562', 'Laparoscopic Cholecystectomy', 6200, 'General', 'S')
ON CONFLICT (code) DO UPDATE SET
    description = EXCLUDED.description,
    reimbursement = EXCLUDED.reimbursement,
    category = EXCLUDED.category,
    procedure_indicator = EXCLUDED.procedure_indicator;

-- Verify the data was inserted
SELECT COUNT(*) as total_cpt_codes FROM cpt_codes;
SELECT category, COUNT(*) as count FROM cpt_codes GROUP BY category ORDER BY count DESC;
