-- Add Manager user
INSERT INTO public.users (email, password, role, full_name)
VALUES 
  ('manager@hospital.com', 'manager123', 'manager', 'Case Manager')
ON CONFLICT (email) DO NOTHING;

-- Add Surgeon demo user (if missing)
INSERT INTO public.users (email, password, role, full_name, surgeon_id)
VALUES 
  ('surgeon@hospital.com', 'surgeon123', 'surgeon', 'Dr. Sarah Williams', 1)
ON CONFLICT (email) DO NOTHING;

-- Add Patient demo user (if missing)
INSERT INTO public.users (email, password, role, full_name, patient_id)
VALUES 
  ('patient@hospital.com', 'patient123', 'patient', 'John Doe', 1)
ON CONFLICT (email) DO NOTHING;
