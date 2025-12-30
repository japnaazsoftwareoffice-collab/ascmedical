-- 1. Drop the existing check constraint that restricts roles
ALTER TABLE public.users DROP CONSTRAINT users_role_check;

-- 2. Add the updated check constraint including 'manager' validation
ALTER TABLE public.users ADD CONSTRAINT users_role_check CHECK (
  role = ANY (ARRAY['admin'::text, 'surgeon'::text, 'patient'::text, 'manager'::text])
);

-- 3. Now insert the Manager user safely
INSERT INTO public.users (email, password, role, full_name)
VALUES 
  ('manager@hospital.com', 'manager123', 'manager', 'Case Manager')
ON CONFLICT (email) DO NOTHING;
