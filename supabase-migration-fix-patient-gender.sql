-- Migration: Add Missing Columns to Patients Table
-- Run this SQL in your Supabase SQL Editor to fix the "Cloud Save Failed" (missing gender column) error

-- 1. Add Gender column
ALTER TABLE patients 
ADD COLUMN IF NOT EXISTS gender TEXT;

-- 2. Add Address column (just in case it was missed in some setups)
-- ALTER TABLE patients 
-- ADD COLUMN IF NOT EXISTS address TEXT;

-- 3. Add any other fields from the management form
-- ALTER TABLE patients 
-- ADD COLUMN IF NOT EXISTS middle_name TEXT,
-- ADD COLUMN IF NOT EXISTS preferred_language TEXT;

-- 4. Ensure Row Level Security is updated if needed (usually true if all operations enabled)
-- The existing policy "Enable all operations for patients" ON patients FOR ALL USING (true) WITH CHECK (true) 
-- will automatically cover these new columns.

-- Optional: Add comments
COMMENT ON COLUMN patients.gender IS 'Patient gender: Male, Female, Non-Binary, Prefer not to say';
-- COMMENT ON COLUMN patients.address IS 'Full mailing address';
