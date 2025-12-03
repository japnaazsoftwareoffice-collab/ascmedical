-- Migration to add Podiatry CPT codes
-- Category: Podiatry

INSERT INTO cpt_codes (code, description, category, reimbursement, cost, procedure_indicator) VALUES
('11721', 'Debridement nail(s) thickened, dystrophic (multiple)', 'Podiatry', 0, 0, NULL),
('11730', 'Avulsion of nail plate (partial/complete)', 'Podiatry', 0, 0, NULL),
('27634', 'Excision of soft tissue (ganglion, neuroma) ankle/foot', 'Podiatry', 1101.21, 0, 'S'),
('28080', 'Excision, metatarsal exostosis (bunionette)', 'Podiatry', 768.06, 0, 'S'),
('28230', 'Repair flexor tendon, foot or toe (simple)', 'Podiatry', 241.53, 0, 'S'),
('28285', 'Osteotomy, metatarsal, distal, with internal fixation', 'Podiatry', 1446.87, 0, 'S'),
('28292', 'Repair, hammertoe (flexor transfer, etc.)', 'Podiatry', 1446.87, 0, 'S'),
('28298', 'Arthrodesis, big toe, first metatarsophalangeal joint', 'Podiatry', 4060.98, 0, 'S'),
('28635', 'Osteotomy, calcaneus (e.g. slide, with fixation)', 'Podiatry', 768.06, 0, 'S');

-- Update the sequence to ensure new IDs don't conflict
SELECT setval('cpt_codes_id_seq', (SELECT MAX(id) FROM cpt_codes));
