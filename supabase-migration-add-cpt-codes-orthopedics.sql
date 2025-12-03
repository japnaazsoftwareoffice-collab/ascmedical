-- Migration to add Orthopedics CPT codes
-- Category: Orthopedics

INSERT INTO cpt_codes (code, description, category, reimbursement, cost, procedure_indicator) VALUES
('27438', 'Removal of prosthesis, partial or total, knee (if limited scope)', 'Orthopedics', 7705.48, 0, 'S'),
('27704', 'Ankle arthroscopy, with synovectomy, debridement', 'Orthopedics', 8155.09, 0, 'S'),
('28296', 'Correction, hallux valgus (e.g. bunionectomy, distal, with or without internal fixation)', 'Orthopedics', 1446.87, 0, 'S'),
('28807', 'Arthroscopy, shoulder, debridement (subscapular)', 'Orthopedics', 3216.72, 0, 'S'),
('29822', 'Arthroscopy, knee, with debridement/shaving', 'Orthopedics', 1446.87, 0, 'S'),
('29824', 'Arthroscopy, knee, with lateral release', 'Orthopedics', 1446.87, 0, 'S'),
('29826', 'Arthroscopy, knee, with meniscal repair', 'Orthopedics', NULL, 0, 'S'),
('64718', 'Neuroplasty, median nerve at carpal tunnel', 'Orthopedics', 847.44, 0, 'S'),
('64721', 'Neuroplasty and/or transposition; ulnar nerve at elbow', 'Orthopedics', 847.44, 0, 'S');

-- Update the sequence to ensure new IDs don't conflict
SELECT setval('cpt_codes_id_seq', (SELECT MAX(id) FROM cpt_codes));
