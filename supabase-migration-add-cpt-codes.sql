-- Migration to add comprehensive CPT codes from Excel file
-- This adds CPT codes for various specialties including Breast Oncology, ENT, Orthopedics, Pain Management, Podiatry, and Spine

-- Breast Oncology CPT Codes
INSERT INTO cpt_codes (code, description, category, reimbursement, cost) VALUES
('11976', 'Wire localization of breast lesion, percutaneous (but sometimes bundled)', 'Breast Oncology', 66.08, 0),
('19301', 'Mastectomy, partial (lumpectomy)', 'Breast Oncology', 1409.2, 0),
('19302', 'Mastectomy, partial, with axillary lymphadenectomy', 'Breast Oncology', 2157.68, 0),
('19303', 'Mastectomy, subcutaneous', 'Breast Oncology', 2457.68, 0),
('19307', 'Mastectomy, modified radical (only if allowed in outpatient)', 'Breast Oncology', 2457.68, 0),
('38500', 'Biopsy or excision of lymph node(s) (e.g. sentinel node)', 'Breast Oncology', 1409.2, 0),
('38510', 'Sentinel node identification, injection and imaging', 'Breast Oncology', 1409.2, 0),
('38525', 'Biopsy or excision of lymph node(s); superficial', 'Breast Oncology', 2109.2, 0),
('38792', 'Injection procedure; radioactive tracer for identification (radioisotide)', 'Breast Oncology', 0, 0),

-- ENT CPT Codes
('50730', 'Lymphoplasty or squamous resection, inferior umbilicus (infraumbilical)', 'ENT', 1277.02, 0),
('52001', 'Nasal/sinus endoscopy, diagnostic (if limited scope)', 'ENT', 95.69, 0),
('31254', 'Nasal/sinus endoscopy, surgical; with maxillary antrostomy', 'ENT', 2222.61, 0),
('31255', 'Nasal/sinus endoscopy, with ethmoidectomy', 'ENT', 2222.61, 0),
('31267', '(sphenoid/ethmoid) combo codes', 'ENT', 2222.61, 0),
('31276', 'Endoscopic maxillary antrostomy', 'ENT', 2222.61, 0),
('31579', 'Bronchoscopy (if PNT scope) or 31575/31579 (laryngoscopy)', 'ENT', 0, 0),
('42826', 'Tonsillectomy, primary or secondary, without adenoidectomy', 'ENT', 2672.95, 0),
('42820', 'Tonsillectomy with adenoidectomy', 'ENT', 1277.62, 0),

-- Orthopedics CPT Codes
('27438', 'Removal of prosthesis, partial or total, knee (if limited scope)', 'Orthopedics', 7705.48, 0),
('27704', 'Ankle arthroscopy, with synovectomy, debridement', 'Orthopedics', 8235.09, 0),
('28296', 'Correction, hallux valgus (e.g. bunionectomy, distal, with or without internal fixation)', 'Orthopedics', 1446.87, 0),
('28807', 'Arthrodesis, ankle, triple', 'Orthopedics', 1446.87, 0),
('29822', 'Arthroscopy, knee, with debridement/shaving', 'Orthopedics', 1446.87, 0),
('29824', 'Arthroscopy, knee, with lateral release', 'Orthopedics', 1446.87, 0),
('29826', 'Arthroscopy, knee, with meniscal repair', 'Orthopedics', 0, 0),
('64718', 'Neuroplasty, median nerve at carpal tunnel', 'Orthopedics', 847.44, 0),
('64718', 'Neuroplasty and/or transposition; ulnar nerve at elbow', 'Orthopedics', 847.44, 0),

-- Pain Management CPT Codes
('50990', '(unlisted spine or sacroiliac joint injections) — sometimes used as placeholders', 'Pain Mgmt', 0, 0),
('27096', '(unlisted spine or sacroiliac joint injections) — sometimes used as placeholders', 'Pain Mgmt', 0, 0),
('64378', 'Injection, anesthetic/steroid, pleuroneurial joint (shoulder)', 'Pain Mgmt', 0, 0),
('64479', 'Injection, anesthetic agent, spinal (cervical or thoracic) epidural, with imaging/x-ray/3rd sfrm epi c/t 1', 'Pain Mgmt', 437.9, 0),
('64401', 'Injection, diagnostic or therapeutic (facet joint), lumbar; single level', 'Pain Mgmt', 437.9, 0),
('64483', 'Injection, facet joint, lumbar; each additional level', 'Pain Mgmt', 437.9, 0),
('64484', 'Injection, sacroiliac joint, diagnostic or therapeutic', 'Pain Mgmt', 0, 0),
('64530', 'Insertion of neurostimulator electrode array, spinal—trial', 'Pain Mgmt', 437.9, 0),
('64561', 'Insertion of neurostimulator electrode array, epidural, intratoral', 'Pain Mgmt', 847.44, 0),
('64635', 'Destruction (e.g. radiofrequency) of lumbar facet joint nerves, bilateral', 'Pain Mgmt', 847.44, 0),

-- Podiatry CPT Codes
('11973', 'Debridement (thickened, dystrophic nails)', 'Podiatry', 0, 0),
('11730', 'Avulsion of nail plate (partial/complete)', 'Podiatry', 0, 0),
('28725', 'Excision of soft tissue (ganglion, neuroma) ankle/foot', 'Podiatry', 1101.21, 0),
('28080', 'Excision, metatarsal exostosis (bunionette)', 'Podiatry', 768.06, 0),
('28230', 'Repair flexor tendon, foot or toe (simple)', 'Podiatry', 241.53, 0),
('28285', 'Osteotomy, metatarsal, distal, with internal fixation', 'Podiatry', 1446.87, 0),
('28285', 'Repair, hammertoe (flexor transfer), 1st', 'Podiatry', 1446.87, 0),
('28298', 'Arthrodesis, big toe, first metatarsophalangeal joint', 'Podiatry', 4062.08, 0),
('28635', 'Osteotomy, calcaneus (e.g. slide, with fixation)', 'Podiatry', 768.06, 0),

-- Spine CPT Codes
('22630', 'Arthrodesis, posterior, single-level, lumbar (with posterior instrumentation)', 'Spine', 0, 0),
('22845', 'Anterior fusion, lumbar (single level)', 'Spine', 0, 0),
('62287', 'Endoscopic decompression, lumbar spine', 'Spine', 847.44, 0),
('63020', 'Laminectomy, cervical or thoracic, single level', 'Spine', 3216.72, 0),
('63047', 'Laminectomy, facetectomy + foraminotomy (single level, lumbar)', 'Spine', 3216.72, 0),
('63075', 'Laminotomy, percutaneous, endoscopic, lumbar', 'Spine', 0, 0),
('63650', 'Percutaneous implantation of neurostimulator electrode array, epidural', 'Spine', 4658.31, 0),
('63655', 'Revision, removal, or replacement of neurostimulator electrode, spinal', 'Spine', 10587.94, 0);

-- Update the sequence to ensure new IDs don't conflict
SELECT setval('cpt_codes_id_seq', (SELECT MAX(id) FROM cpt_codes));
