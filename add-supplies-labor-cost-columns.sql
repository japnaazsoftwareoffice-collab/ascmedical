-- ============================================
-- ADD SUPPLIES AND LABOR COST COLUMNS
-- Run this in Supabase SQL Editor
-- ============================================

-- Add supplies cost tracking columns
ALTER TABLE surgeries
ADD COLUMN IF NOT EXISTS supplies_cost DECIMAL(10, 2) DEFAULT 0;

ALTER TABLE surgeries
ADD COLUMN IF NOT EXISTS implants_cost DECIMAL(10, 2) DEFAULT 0;

ALTER TABLE surgeries
ADD COLUMN IF NOT EXISTS medications_cost DECIMAL(10, 2) DEFAULT 0;

-- Add labor cost column
ALTER TABLE surgeries
ADD COLUMN IF NOT EXISTS actual_labor_cost DECIMAL(10, 2) DEFAULT 0;

-- Add other financial columns
ALTER TABLE surgeries
ADD COLUMN IF NOT EXISTS actual_room_cost DECIMAL(10, 2) DEFAULT 0;

ALTER TABLE surgeries
ADD COLUMN IF NOT EXISTS expected_reimbursement DECIMAL(10, 2) DEFAULT 0;

-- Add metadata columns
ALTER TABLE surgeries
ADD COLUMN IF NOT EXISTS financial_snapshot_date TIMESTAMP WITH TIME ZONE;

ALTER TABLE surgeries
ADD COLUMN IF NOT EXISTS calculation_version TEXT DEFAULT 'v1.0';

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_surgeries_status_financial 
ON surgeries(status, financial_snapshot_date) 
WHERE status = 'completed' AND financial_snapshot_date IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN surgeries.supplies_cost IS 'Cost of surgical supplies (sutures, gauze, etc.)';
COMMENT ON COLUMN surgeries.implants_cost IS 'Cost of implants and devices';
COMMENT ON COLUMN surgeries.medications_cost IS 'Cost of medications and drugs';
COMMENT ON COLUMN surgeries.actual_labor_cost IS 'Anesthesia and staff labor costs';
COMMENT ON COLUMN surgeries.actual_room_cost IS 'Calculated OR cost based on duration using tiered pricing';
COMMENT ON COLUMN surgeries.expected_reimbursement IS 'Medicare revenue with MPPR applied';
COMMENT ON COLUMN surgeries.financial_snapshot_date IS 'Timestamp when financial calculations were performed';
COMMENT ON COLUMN surgeries.calculation_version IS 'Version of calculation formulas used';

-- Verify columns were added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'surgeries'
AND column_name IN (
    'supplies_cost', 
    'implants_cost', 
    'medications_cost', 
    'actual_labor_cost',
    'actual_room_cost',
    'expected_reimbursement',
    'financial_snapshot_date',
    'calculation_version'
)
ORDER BY column_name;

-- Show success message
SELECT '✅ All cost tracking columns added successfully!' as status;
