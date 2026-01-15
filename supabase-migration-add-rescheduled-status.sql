-- Migration to add 'rescheduled' to the allowed status values for surgeries
-- This uses a safe approach to update the check constraint

-- 1. Drop the existing check constraint
ALTER TABLE surgeries DROP CONSTRAINT IF EXISTS surgeries_status_check;

-- 2. Add the new check constraint with 'rescheduled' included
ALTER TABLE surgeries 
  ADD CONSTRAINT surgeries_status_check 
  CHECK (status IN ('scheduled', 'in-progress', 'completed', 'cancelled', 'rescheduled'));

-- 3. Comment to document the change
COMMENT ON COLUMN surgeries.status IS 'Status: scheduled, in-progress, completed, cancelled, rescheduled';
