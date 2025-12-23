-- Migration: Add Financial Snapshot and Supplies Tracking to Surgeries
-- This migration adds columns to track actual costs and revenue for completed surgeries
-- Also adds supplies/materials cost tracking for accurate profitability analysis

-- Add financial snapshot columns
ALTER TABLE surgeries
ADD COLUMN IF NOT EXISTS actual_room_cost DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS actual_labor_cost DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS expected_reimbursement DECIMAL(10, 2) DEFAULT 0;

-- Add supplies cost tracking columns
ALTER TABLE surgeries
ADD COLUMN IF NOT EXISTS supplies_cost DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS implants_cost DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS medications_cost DECIMAL(10, 2) DEFAULT 0;

-- Add metadata columns for tracking
ALTER TABLE surgeries
ADD COLUMN IF NOT EXISTS financial_snapshot_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS calculation_version TEXT DEFAULT 'v1.0';

-- Create index for faster queries on completed surgeries with financial data
CREATE INDEX IF NOT EXISTS idx_surgeries_status_financial 
ON surgeries(status, financial_snapshot_date) 
WHERE status = 'completed' AND financial_snapshot_date IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN surgeries.actual_room_cost IS 'Calculated OR cost based on duration using tiered pricing';
COMMENT ON COLUMN surgeries.actual_labor_cost IS 'Anesthesia and staff labor costs';
COMMENT ON COLUMN surgeries.expected_reimbursement IS 'Medicare revenue with MPPR applied';
COMMENT ON COLUMN surgeries.supplies_cost IS 'Cost of surgical supplies (sutures, gauze, etc.)';
COMMENT ON COLUMN surgeries.implants_cost IS 'Cost of implants and devices';
COMMENT ON COLUMN surgeries.medications_cost IS 'Cost of medications and drugs';
COMMENT ON COLUMN surgeries.financial_snapshot_date IS 'Timestamp when financial calculations were performed';
COMMENT ON COLUMN surgeries.calculation_version IS 'Version of calculation formulas used';
