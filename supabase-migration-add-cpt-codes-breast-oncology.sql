-- Migration to add Breast Oncology CPT codes
-- Category: Breast Oncology

INSERT INTO cpt_codes (code, description, category, reimbursement, cost, procedure_indicator) VALUES
('11976', 'Wire localization of breast lesion, percutaneous (but sometimes bundled)', 'Breast Oncology', 66.08, 0, 'S'),
('19301', 'Mastectomy, partial (lumpectomy)', 'Breast Oncology', 1409.2, 0, 'S'),
('19302', 'Mastectomy, partial, with axillary lymphadenectomy', 'Breast Oncology', 2157.68, 0, 'S'),
('19303', 'Mastectomy, subcutaneous', 'Breast Oncology', 2457.68, 0, 'S'),
('19307', 'Mastectomy, modified radical (only if allowed in outpatient)', 'Breast Oncology', 2457.68, 0, 'S'),
('38500', 'Biopsy or excision of lymph node(s) (e.g. sentinel node)', 'Breast Oncology', 1409.2, 0, 'S'),
('38510', 'Sentinel node identification, injection and imaging', 'Breast Oncology', 1409.2, 0, 'S'),
('38525', 'Biopsy or excision of lymph node(s); superficial', 'Breast Oncology', 2109.2, 0, 'S'),
('38792', 'Injection procedure; radioactive tracer for identification (radioisotide)', 'Breast Oncology', 0, 0, 'S');

-- Update the sequence to ensure new IDs don't conflict
SELECT setval('cpt_codes_id_seq', (SELECT MAX(id) FROM cpt_codes));
