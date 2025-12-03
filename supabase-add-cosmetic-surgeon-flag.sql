-- Add is_cosmetic_surgeon flag to surgeons table
ALTER TABLE surgeons ADD COLUMN IF NOT EXISTS is_cosmetic_surgeon BOOLEAN DEFAULT false;

-- Update existing cosmetic surgeons (adjust names as needed)
-- Example: UPDATE surgeons SET is_cosmetic_surgeon = true WHERE name LIKE '%Cosmetic%' OR specialty = 'Cosmetic Surgery';
