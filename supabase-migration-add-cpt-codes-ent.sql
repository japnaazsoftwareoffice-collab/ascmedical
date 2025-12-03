-- Migration to add ENT CPT codes
-- Category: ENT (Ear, Nose, and Throat)

INSERT INTO cpt_codes (code, description, category, reimbursement, cost, procedure_indicator) VALUES
('50520', 'Septoplasty or submucous resection, inferior turbinate (intranasal)', 'ENT', 1277.02, 0, 'S'),
('31231', 'Nasal/sinus endoscopy, diagnostic (if limited scope)', 'ENT', 95.69, 0, 'S'),
('31254', 'Nasal/sinus endoscopy, surgical; with maxillary antrostomy', 'ENT', 2222.61, 0, 'S'),
('31255', 'Nasal/sinus endoscopy, with ethmoidectomy', 'ENT', 2222.61, 0, 'S'),
('31267', '(sphenoid/ethmoid) combo codes', 'ENT', 2222.61, 0, 'S'),
('31276', 'Endoscopic maxillary antrostomy', 'ENT', 2222.61, 0, 'S'),
('31240', 'Bronchoscopy (if ENT scope) or 31575/31579 (laryngoscopy)', 'ENT', 0, 0, NULL),
('42820', 'Tonsillectomy, primary or secondary, without adenoidectomy', 'ENT', 2672.95, 0, 'S'),
('42826', 'Tonsillectomy with adenoidectomy', 'ENT', 1277.62, 0, 'S');

-- Update the sequence to ensure new IDs don't conflict
SELECT setval('cpt_codes_id_seq', (SELECT MAX(id) FROM cpt_codes));
