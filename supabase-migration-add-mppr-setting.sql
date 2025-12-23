-- Add Medicare MPPR setting to settings table
-- Run this in Supabase SQL Editor

ALTER TABLE settings
ADD COLUMN IF NOT EXISTS apply_medicare_mppr BOOLEAN DEFAULT false;

-- Add comment
COMMENT ON COLUMN settings.apply_medicare_mppr IS 'Whether to apply Medicare Multi-Procedure Payment Reduction (MPPR) to revenue calculations';

-- Verify
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'settings'
AND column_name = 'apply_medicare_mppr';
