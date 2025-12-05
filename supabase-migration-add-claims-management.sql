-- Migration: Add Insurance Claims Management
-- Run this SQL in your Supabase SQL Editor

-- Create insurance_claims table
CREATE TABLE IF NOT EXISTS insurance_claims (
  id BIGSERIAL PRIMARY KEY,
  
  -- References
  patient_id BIGINT REFERENCES patients(id) ON DELETE CASCADE,
  surgery_id BIGINT REFERENCES surgeries(id) ON DELETE SET NULL,
  billing_id BIGINT REFERENCES billing(id) ON DELETE SET NULL,
  
  -- Claim Information
  claim_number TEXT UNIQUE NOT NULL,
  claim_type TEXT DEFAULT 'primary' CHECK (claim_type IN ('primary', 'secondary', 'appeal')),
  
  -- Insurance Information
  insurance_provider TEXT NOT NULL,
  insurance_policy_number TEXT NOT NULL,
  insurance_group_number TEXT,
  subscriber_name TEXT,
  subscriber_relationship TEXT,
  
  -- Service Information
  service_date DATE NOT NULL,
  diagnosis_codes TEXT[] NOT NULL, -- ICD-10 codes
  procedure_codes TEXT[] NOT NULL, -- CPT codes
  place_of_service TEXT DEFAULT 'Office',
  
  -- Financial Information
  total_charges DECIMAL(10, 2) NOT NULL,
  amount_paid DECIMAL(10, 2) DEFAULT 0,
  patient_responsibility DECIMAL(10, 2) DEFAULT 0,
  insurance_payment DECIMAL(10, 2) DEFAULT 0,
  adjustment_amount DECIMAL(10, 2) DEFAULT 0,
  
  -- Claim Status
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'pending', 'in_review', 'approved', 'partially_approved', 'denied', 'paid', 'appealed')),
  submission_date DATE,
  received_date DATE,
  processed_date DATE,
  payment_date DATE,
  
  -- Additional Information
  denial_reason TEXT,
  denial_code TEXT,
  notes TEXT,
  attachments_required BOOLEAN DEFAULT false,
  
  -- Tracking
  submitted_by TEXT,
  reviewed_by TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create claim_line_items table for detailed billing
CREATE TABLE IF NOT EXISTS claim_line_items (
  id BIGSERIAL PRIMARY KEY,
  claim_id BIGINT REFERENCES insurance_claims(id) ON DELETE CASCADE,
  
  -- Line Item Details
  line_number INTEGER NOT NULL,
  service_date DATE NOT NULL,
  procedure_code TEXT NOT NULL, -- CPT code
  diagnosis_pointers TEXT[], -- Links to diagnosis codes (e.g., ['1', '2'])
  
  -- Charges
  units INTEGER DEFAULT 1,
  charge_amount DECIMAL(10, 2) NOT NULL,
  allowed_amount DECIMAL(10, 2),
  paid_amount DECIMAL(10, 2) DEFAULT 0,
  
  -- Provider Information
  rendering_provider TEXT,
  
  -- Status
  status TEXT DEFAULT 'pending',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create claim_history table for audit trail
CREATE TABLE IF NOT EXISTS claim_history (
  id BIGSERIAL PRIMARY KEY,
  claim_id BIGINT REFERENCES insurance_claims(id) ON DELETE CASCADE,
  
  -- History Details
  action TEXT NOT NULL, -- 'created', 'submitted', 'updated', 'approved', 'denied', 'paid'
  previous_status TEXT,
  new_status TEXT,
  changed_by TEXT,
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_claims_patient_id ON insurance_claims(patient_id);
CREATE INDEX IF NOT EXISTS idx_claims_surgery_id ON insurance_claims(surgery_id);
CREATE INDEX IF NOT EXISTS idx_claims_status ON insurance_claims(status);
CREATE INDEX IF NOT EXISTS idx_claims_claim_number ON insurance_claims(claim_number);
CREATE INDEX IF NOT EXISTS idx_claims_submission_date ON insurance_claims(submission_date);
CREATE INDEX IF NOT EXISTS idx_claims_insurance_provider ON insurance_claims(insurance_provider);
CREATE INDEX IF NOT EXISTS idx_claim_line_items_claim_id ON claim_line_items(claim_id);
CREATE INDEX IF NOT EXISTS idx_claim_history_claim_id ON claim_history(claim_id);

-- Add triggers to update updated_at automatically
CREATE TRIGGER update_insurance_claims_updated_at BEFORE UPDATE ON insurance_claims
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_claim_line_items_updated_at BEFORE UPDATE ON claim_line_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE insurance_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE claim_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE claim_history ENABLE ROW LEVEL SECURITY;

-- Create policies to allow all operations (adjust based on your auth requirements)
CREATE POLICY "Enable all operations for insurance_claims" ON insurance_claims FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all operations for claim_line_items" ON claim_line_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all operations for claim_history" ON claim_history FOR ALL USING (true) WITH CHECK (true);

-- Add comments to document the schema
COMMENT ON TABLE insurance_claims IS 'Stores insurance claim submissions and tracking';
COMMENT ON TABLE claim_line_items IS 'Detailed line items for each claim';
COMMENT ON TABLE claim_history IS 'Audit trail for claim status changes';

COMMENT ON COLUMN insurance_claims.claim_number IS 'Unique claim identifier (auto-generated)';
COMMENT ON COLUMN insurance_claims.claim_type IS 'Type of claim: primary, secondary, or appeal';
COMMENT ON COLUMN insurance_claims.diagnosis_codes IS 'Array of ICD-10 diagnosis codes';
COMMENT ON COLUMN insurance_claims.procedure_codes IS 'Array of CPT procedure codes';
COMMENT ON COLUMN insurance_claims.status IS 'Current status of the claim';
COMMENT ON COLUMN claim_line_items.diagnosis_pointers IS 'Links to diagnosis codes in parent claim';
