-- Migration: Link Claims to Billing
-- Run this SQL in your Supabase SQL Editor

-- Add claim_id to billing table
ALTER TABLE billing 
ADD COLUMN IF NOT EXISTS claim_id BIGINT REFERENCES insurance_claims(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_billing_claim_id ON billing(claim_id);

-- Update comment
COMMENT ON COLUMN billing.claim_id IS 'Reference to the insurance claim associated with this bill';
