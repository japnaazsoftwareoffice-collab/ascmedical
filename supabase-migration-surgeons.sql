-- Migration: Add Missing Surgeons from OR Schedule
-- Run this SQL in your Supabase SQL Editor

INSERT INTO surgeons (name, specialty, license_number, email, phone, years_of_experience) VALUES
  ('Dr. Burmiester', 'General Surgery', 'MD-99001', 'burmiester@hospital.com', '(555) 900-0001', 20),
  ('Dr. Prysi', 'Plastic Surgery', 'MD-99002', 'prysi@hospital.com', '(555) 900-0002', 18),
  ('Dr. McGee', 'Orthopedics', 'MD-99003', 'mcgee@hospital.com', '(555) 900-0003', 15),
  ('Naples Plastic', 'Plastic Surgery', 'GRP-99004', 'naples.plastic@hospital.com', '(555) 900-0004', 25),
  ('Dr. Troy-Masouras', 'Cosmetic Surgery', 'MD-99005', 'troy@hospital.com', '(555) 900-0005', 12)
ON CONFLICT DO NOTHING;
