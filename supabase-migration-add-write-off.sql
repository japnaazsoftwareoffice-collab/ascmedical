-- ============================================
-- ADD WRITE-OFF COLUMN TO SURGERIES TABLE
-- Run this in Supabase SQL Editor
-- ============================================

-- Add write_off column to track discounts and adjustments
ALTER TABLE surgeries
ADD COLUMN IF NOT EXISTS write_off DECIMAL(10, 2) DEFAULT 0;

-- Optionally, you can add a comment for documentation
COMMENT ON COLUMN surgeries.write_off IS 'Amount subtracted from total revenue for charity care, adjustments, or discounts';

-- Verify column was added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'surgeries'
AND column_name = 'write_off';

-- Show success message
SELECT '✅ Write-off column added successfully to surgeries table!' as status;
