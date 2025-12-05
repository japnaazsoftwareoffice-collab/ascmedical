# Patient Insurance Management - Setup Guide

## Overview
This guide explains how to set up comprehensive insurance tracking for patients in the Hospital Management System.

## Database Changes Required

### New Fields Added to `patients` Table:

#### Primary Insurance Fields:
- `insurance_group_number` (TEXT) - Insurance group ID
- `insurance_type` (TEXT) - Type: Primary, Secondary, Medicare, Medicaid, Private
- `subscriber_name` (TEXT) - Policy holder's name
- `subscriber_relationship` (TEXT) - Relationship: Self, Spouse, Child, Parent, Other
- `insurance_effective_date` (DATE) - Coverage start date
- `insurance_expiration_date` (DATE) - Coverage end date
- `copay_amount` (DECIMAL) - Patient copay amount
- `deductible_amount` (DECIMAL) - Annual deductible

#### Secondary Insurance Fields:
- `secondary_insurance_provider` (TEXT) - Secondary insurance company
- `secondary_insurance_policy_number` (TEXT) - Secondary policy/member ID
- `secondary_insurance_group_number` (TEXT) - Secondary group number

## Setup Instructions

### Step 1: Run the Migration Script

1. Open your **Supabase Dashboard**
2. Navigate to **SQL Editor**
3. Open the file: `supabase-migration-add-insurance-fields.sql`
4. Copy the entire content
5. Paste it into the Supabase SQL Editor
6. Click **Run** to execute the migration

### Step 2: Verify the Changes

Run this query to verify all fields were added:

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'patients'
ORDER BY ordinal_position;
```

You should see all the new insurance fields listed.

### Step 3: Test the Application

1. Navigate to **Patient Management** in your application
2. Click **"+ Add Patient"** or edit an existing patient
3. You should see the enhanced form with:
   - Basic Information section
   - Contact Information section
   - Primary Insurance section (with all new fields)
   - Secondary Insurance section (optional)

## Features

### Primary Insurance Tracking
- Complete insurance provider information
- Policy and group numbers
- Subscriber details and relationship
- Coverage dates (effective and expiration)
- Financial details (copay and deductible)

### Secondary Insurance Support
- Optional secondary insurance provider
- Policy and group numbers
- Supports dual coverage scenarios

### User Interface
- **Organized Sections**: Form divided into logical sections
- **Visual Hierarchy**: Colored headers and icons for each section
- **Required Fields**: Marked with asterisks (*)
- **Currency Fields**: Automatic $ symbol for monetary amounts
- **Dropdown Menus**: Pre-defined options for insurance type and relationships

## Data Validation

### Required Fields:
- Full Name *
- Date of Birth *
- MRN *
- Phone *

### Optional Fields:
- All insurance fields are optional
- Email and address are optional

### Field Constraints:
- Copay and deductible must be >= 0
- Dates must be valid date format
- Phone must match pattern: `[0-9()\-\s+]+`

## Usage Examples

### Adding a Patient with Primary Insurance:
1. Fill in basic information (name, DOB, MRN, phone)
2. Add contact info (email, address)
3. Enter primary insurance details:
   - Provider: "Blue Cross Blue Shield"
   - Policy Number: "BC123456789"
   - Group Number: "GRP001"
   - Type: "Primary"
   - Subscriber: "John Doe"
   - Relationship: "Self"
   - Effective Date: "2024-01-01"
   - Copay: "$25.00"
   - Deductible: "$1500.00"

### Adding Secondary Insurance:
1. Complete primary insurance section
2. Scroll to "Secondary Insurance (Optional)"
3. Enter secondary insurance details:
   - Provider: "Aetna"
   - Policy Number: "AE987654321"
   - Group Number: "GRP002"

## Benefits

1. **Complete Insurance Records**: Track all necessary insurance information in one place
2. **Billing Accuracy**: Copay and deductible information readily available
3. **Coverage Verification**: Effective and expiration dates help verify active coverage
4. **Dual Coverage Support**: Handle patients with primary and secondary insurance
5. **Subscriber Tracking**: Know who the policy holder is and patient's relationship

## Database Schema

```sql
-- Updated patients table structure
CREATE TABLE patients (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  dob DATE NOT NULL,
  mrn TEXT UNIQUE NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  
  -- Primary Insurance
  insurance_provider TEXT,
  insurance_policy_number TEXT,
  insurance_group_number TEXT,
  insurance_type TEXT DEFAULT 'Primary',
  subscriber_name TEXT,
  subscriber_relationship TEXT DEFAULT 'Self',
  insurance_effective_date DATE,
  insurance_expiration_date DATE,
  copay_amount DECIMAL(10, 2),
  deductible_amount DECIMAL(10, 2),
  
  -- Secondary Insurance
  secondary_insurance_provider TEXT,
  secondary_insurance_policy_number TEXT,
  secondary_insurance_group_number TEXT,
  
  -- Emergency Contact
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Troubleshooting

### Issue: Fields not saving to database
**Solution**: Make sure you've run the migration script in Supabase SQL Editor

### Issue: Form not displaying new fields
**Solution**: Clear browser cache and refresh the page

### Issue: Data not loading for existing patients
**Solution**: Existing patients will have NULL values for new fields - this is normal. Edit and save to populate.

## Future Enhancements

Consider adding:
- Insurance card image upload
- Insurance verification status tracking
- Claims history
- Pre-authorization tracking
- Insurance eligibility check integration

## Support

For issues or questions:
1. Check the migration script ran successfully
2. Verify database permissions
3. Check browser console for errors
4. Review Supabase logs for database errors
