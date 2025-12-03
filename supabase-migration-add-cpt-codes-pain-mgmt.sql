-- Migration to add Pain Management CPT codes
-- Category: Pain Management

INSERT INTO cpt_codes (code, description, category, reimbursement, cost, procedure_indicator) VALUES
('20999', '(unlisted spine or sacroiliac joint injections) — sometimes used as placeholders', 'Pain Management', 0, 0, NULL),
('27096', '(unlisted spine or sacroiliac joint injections) — sometimes used as placeholders', 'Pain Management', 0, 0, NULL),
('64378', 'Injection, anesthetic/steroid, pleuroneurial joint (shoulder)', 'Pain Management', 0, 0, NULL),
('64479', 'Injection, anesthetic agent, spinal (cervical or thoracic) epidural, with imaging guidance', 'Pain Management', 437.9, 0, 'S'),
('64490', 'Injection, diagnostic or therapeutic (facet joint), lumbar; single level', 'Pain Management', 437.9, 0, 'S'),
('64493', 'Injection, facet joint, lumbar; each additional level', 'Pain Management', 437.9, 0, 'S'),
('64494', 'Injection, sacroiliac joint, diagnostic or therapeutic', 'Pain Management', 0, 0, NULL),
('64530', 'Insertion of neurostimulator electrode array, spinal—trial', 'Pain Management', 437.9, 0, 'S'),
('64633', 'Destruction, radiofrequency, lumbar facet joint, unilateral', 'Pain Management', 847.44, 0, 'S'),
('64635', 'Destruction (e.g. radiofrequency) of lumbar facet joint nerves, bilateral', 'Pain Management', 847.44, 0, 'S');

-- Update the sequence to ensure new IDs don't conflict
SELECT setval('cpt_codes_id_seq', (SELECT MAX(id) FROM cpt_codes));
