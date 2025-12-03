-- Migration: Split surgeon names into first_name and last_name
-- Run this SQL in your Supabase SQL Editor

-- 1. Add new columns
ALTER TABLE surgeons 
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT;

-- 2. Populate new columns from existing 'name' column
-- This is a best-effort split assuming "Dr. FirstName LastName" or "FirstName LastName"
UPDATE surgeons 
SET 
  first_name = CASE 
    -- If name starts with "Dr. ", remove it and take the first word
    WHEN name LIKE 'Dr. %' THEN split_part(substring(name from 5), ' ', 1)
    -- Otherwise just take the first word
    ELSE split_part(name, ' ', 1)
  END,
  last_name = CASE 
    -- If name starts with "Dr. ", remove it and take the rest
    WHEN name LIKE 'Dr. %' THEN substring(substring(name from 5) from position(' ' in substring(name from 5)) + 1)
    -- Otherwise take the rest
    ELSE substring(name from position(' ' in name) + 1)
  END
WHERE first_name IS NULL;

-- 3. Make 'name' nullable to allow inserts that only provide first_name/last_name
ALTER TABLE surgeons ALTER COLUMN name DROP NOT NULL;

-- 4. Add 'is_cosmetic_surgeon' flag if not exists (from previous context)
ALTER TABLE surgeons 
ADD COLUMN IF NOT EXISTS is_cosmetic_surgeon BOOLEAN DEFAULT FALSE;

-- 5. Update specific surgeons as cosmetic if needed (example)
UPDATE surgeons SET is_cosmetic_surgeon = TRUE WHERE name LIKE '%Plastic%' OR name LIKE '%Cosmetic%';
