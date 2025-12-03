-- Hospital Management System Database Schema
-- Run this SQL in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Surgeons Table (Must be created before Users and Surgeries)
CREATE TABLE IF NOT EXISTS surgeons (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  specialty TEXT NOT NULL,
  license_number TEXT,
  email TEXT,
  phone TEXT,
  years_of_experience INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Patients Table (Must be created before Users and Surgeries)
CREATE TABLE IF NOT EXISTS patients (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  dob DATE NOT NULL,
  mrn TEXT UNIQUE NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  insurance_provider TEXT,
  insurance_policy_number TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Users Table (References Surgeons and Patients)
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL, -- In production, use Supabase Auth instead
  role TEXT NOT NULL CHECK (role IN ('admin', 'surgeon', 'patient')),
  full_name TEXT NOT NULL,
  surgeon_id BIGINT REFERENCES surgeons(id) ON DELETE SET NULL,
  patient_id BIGINT REFERENCES patients(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. CPT Codes Table
CREATE TABLE IF NOT EXISTS cpt_codes (
  id BIGSERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  reimbursement DECIMAL(10, 2) NOT NULL,
  cost DECIMAL(10, 2) DEFAULT 0,
  category TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Surgeries Table (References Patients and Surgeons)
CREATE TABLE IF NOT EXISTS surgeries (
  id BIGSERIAL PRIMARY KEY,
  patient_id BIGINT REFERENCES patients(id) ON DELETE CASCADE,
  surgeon_id BIGINT REFERENCES surgeons(id) ON DELETE SET NULL,
  doctor_name TEXT NOT NULL,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  duration_minutes INTEGER NOT NULL,
  cpt_codes TEXT[] NOT NULL, -- Array of CPT code strings
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in-progress', 'completed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Billing Table (References Patients and Surgeries)
CREATE TABLE IF NOT EXISTS billing (
  id BIGSERIAL PRIMARY KEY,
  patient_id BIGINT REFERENCES patients(id) ON DELETE CASCADE,
  surgery_id BIGINT REFERENCES surgeries(id) ON DELETE SET NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  insurance_covered DECIMAL(10, 2) DEFAULT 0,
  patient_responsibility DECIMAL(10, 2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'partially-paid', 'overdue')),
  due_date DATE,
  paid_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. OR Block Schedule Table
CREATE TABLE IF NOT EXISTS or_block_schedule (
  id BIGSERIAL PRIMARY KEY,
  room_name TEXT NOT NULL, -- 'Procedure Room', 'OR 1', 'OR 2', 'OR 3'
  day_of_week TEXT NOT NULL, -- 'Monday', 'Tuesday', etc.
  week_of_month TEXT NOT NULL, -- 'First', 'Second', 'Third', 'Fourth', 'Fifth'
  provider_name TEXT,
  start_time TEXT, -- '1200' or '0730'
  end_time TEXT, -- '1600' or '1300'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_patients_mrn ON patients(mrn);
CREATE INDEX IF NOT EXISTS idx_patients_email ON patients(email);
CREATE INDEX IF NOT EXISTS idx_surgeons_specialty ON surgeons(specialty);
CREATE INDEX IF NOT EXISTS idx_surgeons_email ON surgeons(email);
CREATE INDEX IF NOT EXISTS idx_cpt_codes_category ON cpt_codes(category);
CREATE INDEX IF NOT EXISTS idx_surgeries_date ON surgeries(date);
CREATE INDEX IF NOT EXISTS idx_surgeries_patient_id ON surgeries(patient_id);
CREATE INDEX IF NOT EXISTS idx_surgeries_surgeon_id ON surgeries(surgeon_id);
CREATE INDEX IF NOT EXISTS idx_surgeries_status ON surgeries(status);
CREATE INDEX IF NOT EXISTS idx_billing_patient_id ON billing(patient_id);
CREATE INDEX IF NOT EXISTS idx_billing_status ON billing(status);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_or_schedule_room ON or_block_schedule(room_name);
CREATE INDEX IF NOT EXISTS idx_or_schedule_day ON or_block_schedule(day_of_week);

-- Insert initial surgeons (must be first due to foreign key constraints)
INSERT INTO surgeons (name, specialty, license_number, email, phone, years_of_experience) VALUES
  ('Dr. Sarah Williams', 'Orthopedics', 'MD-45678', 'surgeon@hospital.com', '(555) 123-4567', 15),
  ('Dr. Michael Davis', 'Gastroenterology', 'MD-78901', 'mdavis@hospital.com', '(555) 234-5678', 12),
  ('Dr. Emily Chen', 'Ophthalmology', 'MD-34567', 'echen@hospital.com', '(555) 345-6789', 10)
ON CONFLICT DO NOTHING;

-- Insert initial patients
INSERT INTO patients (name, dob, mrn, phone, email, address, insurance_provider, insurance_policy_number, emergency_contact_name, emergency_contact_phone) VALUES
  ('John Doe', '1980-05-15', 'MRN001', '(555) 111-2222', 'patient@hospital.com', '123 Oak Street, Naples, FL', 'Blue Cross', 'BC123456', 'Mary Doe', '(555) 111-3333'),
  ('Jane Smith', '1992-11-23', 'MRN002', '(555) 333-4444', 'jane.smith@email.com', '456 Pine Avenue, Naples, FL', 'Aetna', 'AE789012', 'Bob Smith', '(555) 333-5555'),
  ('Robert Johnson', '1975-03-10', 'MRN003', '(555) 555-6666', 'robert.j@email.com', '789 Maple Drive, Naples, FL', 'United Healthcare', 'UH345678', 'Linda Johnson', '(555) 555-7777')
ON CONFLICT (mrn) DO NOTHING;

-- Insert initial CPT codes
INSERT INTO cpt_codes (code, description, reimbursement, cost, category) VALUES
  ('10060', 'Incision and drainage of abscess', 2000, 800, 'General'),
  ('11102', 'Tangential biopsy of skin', 1800, 700, 'General'),
  ('11730', 'Avulsion of nail plate', 1600, 600, 'General'),
  ('12001', 'Simple repair of superficial wounds', 2200, 900, 'General'),
  ('17000', 'Destruction of premalignant lesions', 1900, 750, 'General'),
  ('20610', 'Arthrocentesis, major joint/bursa', 2500, 1000, 'Orthopedics'),
  ('27130', 'Arthroplasty, hip', 15000, 8000, 'Orthopedics'),
  ('27447', 'Arthroplasty, knee', 14500, 7500, 'Orthopedics'),
  ('29881', 'Arthroscopy, knee, with meniscectomy', 5500, 2500, 'Orthopedics'),
  ('43239', 'EGD with biopsy', 3000, 1200, 'Gastroenterology'),
  ('45378', 'Colonoscopy, flexible', 3200, 1300, 'Gastroenterology'),
  ('66984', 'Cataract surgery with IOL', 4000, 1800, 'Ophthalmology')
ON CONFLICT (code) DO NOTHING;

-- Insert sample users (password is hashed in production, here using plain text for demo)
INSERT INTO users (email, password, role, full_name, surgeon_id, patient_id) VALUES
  ('admin@hospital.com', 'admin123', 'admin', 'Admin User', NULL, NULL),
  ('surgeon@hospital.com', 'surgeon123', 'surgeon', 'Dr. Sarah Williams', 1, NULL),
  ('patient@hospital.com', 'patient123', 'patient', 'John Doe', NULL, 1)
ON CONFLICT (email) DO NOTHING;

-- Insert sample surgeries (for today's date)
INSERT INTO surgeries (patient_id, surgeon_id, doctor_name, date, start_time, duration_minutes, cpt_codes, status) VALUES
  (1, 1, 'Dr. Sarah Williams', CURRENT_DATE, '08:00', 150, ARRAY['27130', '20610'], 'scheduled'),
  (2, 2, 'Dr. Michael Davis', CURRENT_DATE, '11:00', 45, ARRAY['45378'], 'scheduled'),
  (3, 1, 'Dr. Sarah Williams', CURRENT_DATE + INTERVAL '1 day', '09:00', 120, ARRAY['29881'], 'scheduled')
ON CONFLICT DO NOTHING;

-- Insert sample billing records
INSERT INTO billing (patient_id, surgery_id, total_amount, insurance_covered, patient_responsibility, status, due_date) VALUES
  (1, 1, 17500, 14000, 3500, 'pending', CURRENT_DATE + INTERVAL '30 days'),
  (2, 2, 3200, 2560, 640, 'paid', CURRENT_DATE + INTERVAL '30 days')
ON CONFLICT DO NOTHING;

-- Insert sample OR Block Schedule data
INSERT INTO or_block_schedule (room_name, day_of_week, week_of_month, provider_name, start_time, end_time) VALUES
  ('OR 1', 'Monday', 'First', 'Burmiester', '1200', '1600'),
  ('OR 1', 'Monday', 'Second', 'Burmiester', '1200', '1600'),
  ('OR 1', 'Monday', 'Third', 'Burmiester', '1200', '1600'),
  ('OR 1', 'Monday', 'Fourth', 'Burmiester', '1200', '1600'),
  ('OR 1', 'Monday', 'Fifth', 'Burmiester', '1200', '1600'),
  ('OR 2', 'Monday', 'First', 'Prysi', '0730', '1300'),
  ('OR 2', 'Monday', 'Second', 'Prysi', '0730', '1300'),
  ('OR 2', 'Monday', 'Third', 'Prysi', '0730', '1300'),
  ('OR 2', 'Monday', 'Fourth', 'Prysi', '0730', '1300'),
  ('OR 2', 'Monday', 'Fifth', 'Prysi', '0730', '1300'),
  ('OR 1', 'Tuesday', 'First', 'McGee', '0730', '1600'),
  ('OR 2', 'Tuesday', 'First', 'Naples Plastic', '0730', '1600')
ON CONFLICT DO NOTHING;

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE surgeons ENABLE ROW LEVEL SECURITY;
ALTER TABLE cpt_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE surgeries ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing ENABLE ROW LEVEL SECURITY;
ALTER TABLE or_block_schedule ENABLE ROW LEVEL SECURITY;

-- Create policies to allow all operations (adjust based on your auth requirements)
CREATE POLICY "Enable all operations for users" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all operations for patients" ON patients FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all operations for surgeons" ON surgeons FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all operations for cpt_codes" ON cpt_codes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all operations for surgeries" ON surgeries FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all operations for billing" ON billing FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all operations for or_block_schedule" ON or_block_schedule FOR ALL USING (true) WITH CHECK (true);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers to update updated_at automatically
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON patients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_surgeons_updated_at BEFORE UPDATE ON surgeons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cpt_codes_updated_at BEFORE UPDATE ON cpt_codes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_surgeries_updated_at BEFORE UPDATE ON surgeries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_billing_updated_at BEFORE UPDATE ON billing
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_or_block_schedule_updated_at BEFORE UPDATE ON or_block_schedule
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
