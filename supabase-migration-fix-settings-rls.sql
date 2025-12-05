-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow read access to authenticated users" ON settings;
DROP POLICY IF EXISTS "Allow update access to authenticated users" ON settings;
DROP POLICY IF EXISTS "Allow insert access to authenticated users" ON settings;

-- Disable RLS temporarily to insert default data
ALTER TABLE settings DISABLE ROW LEVEL SECURITY;

-- Clear existing data
TRUNCATE TABLE settings;

-- Insert default row
INSERT INTO settings (facility_name, facility_address, facility_city, facility_state, facility_zip, facility_phone, tax_id, npi)
VALUES ('Naples Surgery Center', '123 Medical Blvd', 'Naples', 'FL', '34102', '(555) 123-4567', '59-1234567', '1234567890');

-- Re-enable RLS
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Create more permissive policies
CREATE POLICY "Allow all read access" ON settings
    FOR SELECT USING (true);

CREATE POLICY "Allow authenticated update" ON settings
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert" ON settings
    FOR INSERT TO authenticated WITH CHECK (true);
