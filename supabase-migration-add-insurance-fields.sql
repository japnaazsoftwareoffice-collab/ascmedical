-- Migration: Add Comprehensive Insurance Fields to Patients Table
-- Run this SQL in your Supabase SQL Editor

-- Add new insurance fields to patients table
ALTER TABLE patients
ADD COLUMN IF NOT EXISTS insurance_group_number TEXT,
ADD COLUMN IF NOT EXISTS insurance_type TEXT DEFAULT 'Primary',
ADD COLUMN IF NOT EXISTS subscriber_name TEXT,
ADD COLUMN IF NOT EXISTS subscriber_relationship TEXT DEFAULT 'Self',
ADD COLUMN IF NOT EXISTS insurance_effective_date DATE,
ADD COLUMN IF NOT EXISTS insurance_expiration_date DATE,
ADD COLUMN IF NOT EXISTS copay_amount DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS deductible_amount DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS secondary_insurance_provider TEXT,
ADD COLUMN IF NOT EXISTS secondary_insurance_policy_number TEXT,
ADD COLUMN IF NOT EXISTS secondary_insurance_group_number TEXT;

-- Create indexes for insurance fields for better query performance
CREATE INDEX IF NOT EXISTS idx_patients_insurance_provider ON patients(insurance_provider);
CREATE INDEX IF NOT EXISTS idx_patients_insurance_type ON patients(insurance_type);
CREATE INDEX IF NOT EXISTS idx_patients_secondary_insurance ON patients(secondary_insurance_provider);

-- Add comment to document the changes
COMMENT ON COLUMN patients.insurance_group_number IS 'Primary insurance group number';
COMMENT ON COLUMN patients.insurance_type IS 'Type of primary insurance: Primary, Secondary, Medicare, Medicaid, Private';
COMMENT ON COLUMN patients.subscriber_name IS 'Name of the primary insurance policy holder';
COMMENT ON COLUMN patients.subscriber_relationship IS 'Patient relationship to subscriber: Self, Spouse, Child, Parent, Other';
COMMENT ON COLUMN patients.insurance_effective_date IS 'Primary insurance coverage start date';
COMMENT ON COLUMN patients.insurance_expiration_date IS 'Primary insurance coverage end date';
COMMENT ON COLUMN patients.copay_amount IS 'Patient copay amount for visits';
COMMENT ON COLUMN patients.deductible_amount IS 'Annual deductible amount';
COMMENT ON COLUMN patients.secondary_insurance_provider IS 'Secondary insurance company name';
COMMENT ON COLUMN patients.secondary_insurance_policy_number IS 'Secondary insurance policy/member ID';
COMMENT ON COLUMN patients.secondary_insurance_group_number IS 'Secondary insurance group number';
