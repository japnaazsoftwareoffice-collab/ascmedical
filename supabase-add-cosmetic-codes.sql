-- Add Cosmetic Surgery Codes to CPT Codes Table
-- These are custom codes for cosmetic procedures based on time duration

-- CSC Facility Fees
INSERT INTO cpt_codes (code, description, reimbursement, cost, category, procedure_indicator) VALUES
('COSM-30', 'Cosmetic Surgery - 0.5 hour (30 min) - Facility Fee', 750.00, 0, 'Cosmetic', 'Time-Based'),
('COSM-60', 'Cosmetic Surgery - 1.0 hour (60 min) - Facility Fee', 1500.00, 0, 'Cosmetic', 'Time-Based'),
('COSM-90', 'Cosmetic Surgery - 1.5 hours (90 min) - Facility Fee', 1800.00, 0, 'Cosmetic', 'Time-Based'),
('COSM-120', 'Cosmetic Surgery - 2.0 hours (120 min) - Facility Fee', 2100.00, 0, 'Cosmetic', 'Time-Based'),
('COSM-150', 'Cosmetic Surgery - 2.5 hours (150 min) - Facility Fee', 2500.00, 0, 'Cosmetic', 'Time-Based'),
('COSM-180', 'Cosmetic Surgery - 3.0 hours (180 min) - Facility Fee', 2900.00, 0, 'Cosmetic', 'Time-Based'),
('COSM-210', 'Cosmetic Surgery - 3.5 hours (210 min) - Facility Fee', 3300.00, 0, 'Cosmetic', 'Time-Based'),
('COSM-240', 'Cosmetic Surgery - 4.0 hours (240 min) - Facility Fee', 3700.00, 0, 'Cosmetic', 'Time-Based'),
('COSM-270', 'Cosmetic Surgery - 4.5 hours (270 min) - Facility Fee', 4100.00, 0, 'Cosmetic', 'Time-Based'),
('COSM-300', 'Cosmetic Surgery - 5.0 hours (300 min) - Facility Fee', 4500.00, 0, 'Cosmetic', 'Time-Based'),
('COSM-330', 'Cosmetic Surgery - 5.5 hours (330 min) - Facility Fee', 4900.00, 0, 'Cosmetic', 'Time-Based'),
('COSM-360', 'Cosmetic Surgery - 6.0 hours (360 min) - Facility Fee', 5300.00, 0, 'Cosmetic', 'Time-Based'),
('COSM-390', 'Cosmetic Surgery - 6.5 hours (390 min) - Facility Fee', 5700.00, 0, 'Cosmetic', 'Time-Based'),
('COSM-420', 'Cosmetic Surgery - 7.0 hours (420 min) - Facility Fee', 6100.00, 0, 'Cosmetic', 'Time-Based'),
('COSM-480', 'Cosmetic Surgery - 7.5 hours (480 min) - Facility Fee', 6500.00, 0, 'Cosmetic', 'Time-Based'),
('COSM-540', 'Cosmetic Surgery - 8.0 hours (540 min) - Facility Fee', 6900.00, 0, 'Cosmetic', 'Time-Based')
ON CONFLICT (code) DO NOTHING;

-- Quantum Anesthesia Fees
INSERT INTO cpt_codes (code, description, reimbursement, cost, category, procedure_indicator) VALUES
('ANESTH-30', 'Quantum Anesthesia - 0.5 hour (30 min)', 600.00, 0, 'Cosmetic', 'Anesthesia'),
('ANESTH-60', 'Quantum Anesthesia - 1.0 hour (60 min)', 750.00, 0, 'Cosmetic', 'Anesthesia'),
('ANESTH-90', 'Quantum Anesthesia - 1.5 hours (90 min)', 900.00, 0, 'Cosmetic', 'Anesthesia'),
('ANESTH-120', 'Quantum Anesthesia - 2.0 hours (120 min)', 1050.00, 0, 'Cosmetic', 'Anesthesia'),
('ANESTH-150', 'Quantum Anesthesia - 2.5 hours (150 min)', 1200.00, 0, 'Cosmetic', 'Anesthesia'),
('ANESTH-180', 'Quantum Anesthesia - 3.0 hours (180 min)', 1350.00, 0, 'Cosmetic', 'Anesthesia'),
('ANESTH-210', 'Quantum Anesthesia - 3.5 hours (210 min)', 1500.00, 0, 'Cosmetic', 'Anesthesia'),
('ANESTH-240', 'Quantum Anesthesia - 4.0 hours (240 min)', 1650.00, 0, 'Cosmetic', 'Anesthesia'),
('ANESTH-270', 'Quantum Anesthesia - 4.5 hours (270 min)', 1800.00, 0, 'Cosmetic', 'Anesthesia'),
('ANESTH-300', 'Quantum Anesthesia - 5.0 hours (300 min)', 1950.00, 0, 'Cosmetic', 'Anesthesia'),
('ANESTH-330', 'Quantum Anesthesia - 5.5 hours (330 min)', 2100.00, 0, 'Cosmetic', 'Anesthesia'),
('ANESTH-360', 'Quantum Anesthesia - 6.0 hours (360 min)', 2250.00, 0, 'Cosmetic', 'Anesthesia'),
('ANESTH-390', 'Quantum Anesthesia - 6.5 hours (390 min)', 2400.00, 0, 'Cosmetic', 'Anesthesia'),
('ANESTH-420', 'Quantum Anesthesia - 7.0 hours (420 min)', 2550.00, 0, 'Cosmetic', 'Anesthesia'),
('ANESTH-480', 'Quantum Anesthesia - 7.5 hours (480 min)', 2700.00, 0, 'Cosmetic', 'Anesthesia'),
('ANESTH-540', 'Quantum Anesthesia - 8.0 hours (540 min)', 2850.00, 0, 'Cosmetic', 'Anesthesia')
ON CONFLICT (code) DO NOTHING;
