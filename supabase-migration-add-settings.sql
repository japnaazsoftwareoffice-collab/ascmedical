-- Create settings table
CREATE TABLE IF NOT EXISTS settings (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    facility_name TEXT,
    facility_address TEXT,
    facility_city TEXT,
    facility_state TEXT,
    facility_zip TEXT,
    facility_phone TEXT,
    tax_id TEXT,
    npi TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default row if not exists (we only want one row)
INSERT INTO settings (facility_name, facility_address, facility_city, facility_state, facility_zip, facility_phone, tax_id, npi)
SELECT 'Naples Surgery Center', '123 Medical Blvd', 'Naples', 'FL', '34102', '(555) 123-4567', '59-1234567', '1234567890'
WHERE NOT EXISTS (SELECT 1 FROM settings);

-- Enable RLS
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Policy: Allow read access to authenticated users
CREATE POLICY "Allow read access to authenticated users" ON settings
    FOR SELECT TO authenticated USING (true);

-- Policy: Allow update access to authenticated users (or restrict to admins if roles exist)
CREATE POLICY "Allow update access to authenticated users" ON settings
    FOR UPDATE TO authenticated USING (true);

-- Policy: Allow insert (only if empty, effectively)
CREATE POLICY "Allow insert access to authenticated users" ON settings
    FOR INSERT TO authenticated WITH CHECK (true);
