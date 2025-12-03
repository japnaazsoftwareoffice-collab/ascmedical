-- Migration to add Spine CPT codes
-- Category: Spine

INSERT INTO cpt_codes (code, description, category, reimbursement, cost, procedure_indicator) VALUES
('22820', 'Arthrodesis, posterior, single-level, lumbar (with posterior instrumentation) — some centers push it', 'Spine', 0, 0, NULL),
('22845', 'Anterior fusion, lumbar (single level)', 'Spine', 0, 0, NULL),
('62287', 'Endoscopic decompression, lumbar spine', 'Spine', 847.44, 0, 'S'),
('63020', 'Laminectomy, cervical or thoracic, single level', 'Spine', 3216.72, 0, 'S'),
('63047', 'Laminectomy, facetectomy + foraminotomy (single level, lumbar)', 'Spine', 3216.72, 0, 'S'),
('63075', 'Laminotomy, percutaneous, endoscopic, lumbar', 'Spine', 0, 0, NULL),
('63650', 'Percutaneous implantation of neurostimulator electrode array, epidural', 'Spine', 4658.31, 0, 'S'),
('63655', 'Revision, removal, or replacement of neurostimulator electrode, spinal', 'Spine', 10587.94, 0, 'S');

-- Update the sequence to ensure new IDs don't conflict
SELECT setval('cpt_codes_id_seq', (SELECT MAX(id) FROM cpt_codes));
