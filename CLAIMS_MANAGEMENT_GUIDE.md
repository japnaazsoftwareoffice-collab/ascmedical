# Insurance Claims Management System - Complete Guide

## Overview
This comprehensive guide explains how to submit and track insurance claims using the Hospital Management System. The system supports electronic claim submission, status tracking, and integration with patient and surgery records.

---

## Table of Contents
1. [Setup Instructions](#setup-instructions)
2. [Database Schema](#database-schema)
3. [Features](#features)
4. [How to Submit Claims](#how-to-submit-claims)
5. [Claim Statuses](#claim-statuses)
6. [Integration with Existing Data](#integration-with-existing-data)
7. [HCFA-1500 Form Generation](#hcfa-1500-form-generation)
8. [Electronic Claims Submission](#electronic-claims-submission)
9. [Best Practices](#best-practices)
10. [Troubleshooting](#troubleshooting)

---

## Setup Instructions

### Step 1: Run Database Migration

1. Open your **Supabase Dashboard**
2. Navigate to **SQL Editor**
3. Open the file: `supabase-migration-add-claims-management.sql`
4. Copy and paste the entire SQL content
5. Click **Run** to execute the migration

This creates three new tables:
- `insurance_claims` - Main claims table
- `claim_line_items` - Detailed billing line items
- `claim_history` - Audit trail for status changes

### Step 2: Add Claims Management to Your App

Update your `App.jsx` to include the Claims Management component:

```javascript
import ClaimsManagement from './components/ClaimsManagement';

// Add state for claims
const [claims, setClaims] = useState([]);

// Add CRUD functions for claims
const handleAddClaim = async (claimData) => {
  const { data, error } = await supabase
    .from('insurance_claims')
    .insert([claimData])
    .select();
  if (error) throw error;
  setClaims([...claims, data[0]]);
};

const handleUpdateClaim = async (updatedClaim) => {
  const { data, error } = await supabase
    .from('insurance_claims')
    .update(updatedClaim)
    .eq('id', updatedClaim.id)
    .select();
  if (error) throw error;
  setClaims(claims.map(c => c.id === updatedClaim.id ? data[0] : c));
};

const handleDeleteClaim = async (id) => {
  const { error } = await supabase
    .from('insurance_claims')
    .delete()
    .eq('id', id);
  if (error) throw error;
  setClaims(claims.filter(c => c.id !== id));
};

// Add to navigation
{activeView === 'claims' && (
  <ClaimsManagement
    claims={claims}
    patients={patients}
    surgeries={surgeries}
    onAdd={handleAddClaim}
    onUpdate={handleUpdateClaim}
    onDelete={handleDeleteClaim}
  />
)}
```

### Step 3: Load Claims Data

Add this to your data loading function:

```javascript
const loadClaims = async () => {
  const { data, error } = await supabase
    .from('insurance_claims')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error loading claims:', error);
    return;
  }
  setClaims(data || []);
};

// Call in useEffect
useEffect(() => {
  loadClaims();
}, []);
```

---

## Database Schema

### insurance_claims Table

| Field | Type | Description |
|-------|------|-------------|
| id | BIGSERIAL | Primary key |
| patient_id | BIGINT | Reference to patients table |
| surgery_id | BIGINT | Reference to surgeries table (optional) |
| billing_id | BIGINT | Reference to billing table (optional) |
| claim_number | TEXT | Unique claim identifier (auto-generated) |
| claim_type | TEXT | primary, secondary, or appeal |
| insurance_provider | TEXT | Insurance company name |
| insurance_policy_number | TEXT | Policy/member ID |
| insurance_group_number | TEXT | Group number |
| subscriber_name | TEXT | Policy holder name |
| subscriber_relationship | TEXT | Patient's relationship to subscriber |
| service_date | DATE | Date of service |
| diagnosis_codes | TEXT[] | Array of ICD-10 codes |
| procedure_codes | TEXT[] | Array of CPT codes |
| place_of_service | TEXT | Where service was provided |
| total_charges | DECIMAL | Total billed amount |
| amount_paid | DECIMAL | Amount paid by insurance |
| patient_responsibility | DECIMAL | Patient's portion |
| insurance_payment | DECIMAL | Insurance payment amount |
| adjustment_amount | DECIMAL | Adjustments made |
| status | TEXT | Current claim status |
| submission_date | DATE | When claim was submitted |
| received_date | DATE | When insurance received claim |
| processed_date | DATE | When claim was processed |
| payment_date | DATE | When payment was received |
| denial_reason | TEXT | Reason for denial (if applicable) |
| denial_code | TEXT | Denial code |
| notes | TEXT | Additional notes |
| attachments_required | BOOLEAN | Whether attachments are needed |
| submitted_by | TEXT | Who submitted the claim |
| reviewed_by | TEXT | Who reviewed the claim |

---

## Features

### 1. **Dashboard Statistics**
- Total Claims count
- Submitted claims count
- Approved claims count
- Denied claims count
- Total billed amount
- Total paid amount

### 2. **Claim Creation**
- Auto-populate insurance info from patient records
- Link to existing surgeries
- Auto-fill procedure codes from surgery
- Support for primary, secondary, and appeal claims

### 3. **Status Tracking**
Track claims through their entire lifecycle:
- **Draft** - Claim being prepared
- **Submitted** - Sent to insurance
- **Pending** - Awaiting review
- **In Review** - Being processed
- **Approved** - Claim approved
- **Partially Approved** - Some items approved
- **Denied** - Claim rejected
- **Paid** - Payment received
- **Appealed** - Under appeal

### 4. **Filtering & Search**
- Filter by status
- Search by claim number
- Filter by date range
- Filter by insurance provider

### 5. **Audit Trail**
- Track all status changes
- Record who made changes
- Timestamp all actions

---

## How to Submit Claims

### Method 1: Create Claim from Surgery

1. Navigate to **Claims Management**
2. Click **"+ Create Claim"**
3. Select the **Patient**
4. Select the **Related Surgery**
   - Service date auto-fills
   - Procedure codes auto-populate
5. Insurance information auto-fills from patient record
6. Verify all information
7. Click **"Save Claim"**
8. Click **"Submit"** button to submit to insurance

### Method 2: Create Manual Claim

1. Navigate to **Claims Management**
2. Click **"+ Create Claim"**
3. Fill in all required fields:
   - Patient *
   - Service Date *
   - Insurance Provider *
   - Policy Number *
   - Total Charges *
4. Add procedure codes manually
5. Add diagnosis codes
6. Click **"Save Claim"**
7. Review and click **"Submit"**

### Claim Submission Workflow

```
Draft → Review → Submit → Pending → In Review → Approved → Paid
                                              ↓
                                           Denied → Appeal
```

---

## Claim Statuses

### Draft
- Claim is being prepared
- Can be edited freely
- Not yet submitted to insurance

### Submitted
- Claim has been sent to insurance
- Submission date recorded
- Waiting for acknowledgment

### Pending
- Insurance has received claim
- Awaiting processing
- No action required

### In Review
- Insurance is actively reviewing
- May request additional information
- Monitor for updates

### Approved
- Claim has been approved
- Payment pending
- Check for payment date

### Partially Approved
- Some line items approved
- Others denied or adjusted
- Review explanation of benefits (EOB)

### Denied
- Claim rejected by insurance
- Review denial reason and code
- Consider appeal if appropriate

### Paid
- Payment received from insurance
- Record payment date and amount
- Close claim

### Appealed
- Denial is being appealed
- Additional documentation submitted
- Awaiting appeal decision

---

## Integration with Existing Data

### Auto-Population from Patient Records

When you select a patient, the system automatically fills:
- Insurance Provider
- Policy Number
- Group Number
- Subscriber Name
- Subscriber Relationship

### Auto-Population from Surgery Records

When you select a surgery, the system automatically fills:
- Service Date
- Procedure Codes (CPT codes)
- Related diagnosis information

### Linking to Billing

Claims can be linked to billing records to:
- Track payment status
- Calculate patient responsibility
- Generate statements

---

## HCFA-1500 Form Generation

The HCFA-1500 (CMS-1500) is the standard form for professional health insurance claims.

### Form Sections Mapped from System:

**Box 1**: Insurance Type (Medicare, Medicaid, etc.)
**Box 1a**: Insured's ID Number → `insurance_policy_number`
**Box 2**: Patient's Name → `patients.name`
**Box 3**: Patient's Birth Date → `patients.dob`
**Box 4**: Insured's Name → `subscriber_name`
**Box 5**: Patient's Address → `patients.address`
**Box 6**: Patient Relationship to Insured → `subscriber_relationship`
**Box 9**: Other Insured's Name → Secondary insurance
**Box 11**: Insured's Group Number → `insurance_group_number`
**Box 12**: Patient's Signature → Electronic signature
**Box 13**: Insured's Signature → Electronic signature
**Box 21**: Diagnosis Codes → `diagnosis_codes` array
**Box 24**: Service Details → `claim_line_items`
  - Date of Service
  - CPT/HCPCS Code
  - Diagnosis Pointer
  - Charges
**Box 28**: Total Charge → `total_charges`
**Box 29**: Amount Paid → `insurance_payment`
**Box 30**: Balance Due → `patient_responsibility`

### Generating HCFA-1500 Forms

```javascript
// Future enhancement - PDF generation
const generateHCFA1500 = async (claimId) => {
  const claim = claims.find(c => c.id === claimId);
  const patient = patients.find(p => p.id === claim.patient_id);
  
  // Use PDF library to generate form
  // Map data to HCFA-1500 boxes
  // Return PDF for printing or electronic submission
};
```

---

## Electronic Claims Submission

### EDI 837 Format

For electronic submission to clearinghouses, claims need to be formatted in EDI 837 format.

### Integration Options:

#### 1. **Clearinghouse Integration**
- Connect to clearinghouses like:
  - Change Healthcare
  - Availity
  - Trizetto
  - Office Ally

#### 2. **Direct Submission**
- Some payers accept direct electronic submission
- Requires payer-specific credentials
- Follow payer's API documentation

#### 3. **Batch Processing**
- Generate EDI 837 files
- Upload to clearinghouse portal
- Track submission status

### Sample Integration Code:

```javascript
// Example: Submit to clearinghouse
const submitClaimElectronically = async (claimId) => {
  const claim = claims.find(c => c.id === claimId);
  
  // Convert to EDI 837 format
  const edi837 = convertToEDI837(claim);
  
  // Submit to clearinghouse API
  const response = await fetch('https://clearinghouse-api.com/submit', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer YOUR_API_KEY',
      'Content-Type': 'application/edi-x12'
    },
    body: edi837
  });
  
  // Update claim status
  if (response.ok) {
    await handleUpdateClaim({
      ...claim,
      status: 'submitted',
      submission_date: new Date().toISOString().split('T')[0]
    });
  }
};
```

---

## Best Practices

### 1. **Verify Patient Insurance Before Service**
- Check insurance eligibility
- Verify coverage dates
- Confirm copay and deductible amounts

### 2. **Accurate Coding**
- Use correct ICD-10 diagnosis codes
- Use appropriate CPT procedure codes
- Ensure codes match documentation

### 3. **Timely Filing**
- Submit claims within payer deadlines (typically 90-180 days)
- Track submission dates
- Set up reminders for follow-up

### 4. **Complete Documentation**
- Include all required information
- Attach supporting documents when needed
- Keep copies of all submissions

### 5. **Regular Follow-Up**
- Check claim status weekly
- Follow up on pending claims after 14-30 days
- Address denials promptly

### 6. **Track Denials**
- Document denial reasons
- Identify patterns
- Implement corrective actions

### 7. **Appeal When Appropriate**
- Review denial reasons carefully
- Gather supporting documentation
- Submit appeals within timeframe (typically 180 days)

---

## Troubleshooting

### Common Issues and Solutions

#### Issue: Claim Rejected - Invalid Policy Number
**Solution**: 
- Verify policy number with patient
- Check for typos
- Confirm insurance is active

#### Issue: Claim Denied - Not Medically Necessary
**Solution**:
- Review documentation
- Add supporting medical records
- Submit appeal with justification

#### Issue: Claim Denied - Timely Filing
**Solution**:
- Check service date vs submission date
- Review payer's filing deadline
- Submit appeal if within grace period

#### Issue: Claim Pending for Extended Period
**Solution**:
- Call insurance to check status
- Verify they received the claim
- Resubmit if necessary

#### Issue: Incorrect Payment Amount
**Solution**:
- Review EOB (Explanation of Benefits)
- Check contracted rates
- Contact insurance if discrepancy exists

---

## Future Enhancements

### Planned Features:

1. **Real-Time Eligibility Verification**
   - Check insurance coverage before service
   - Verify benefits and copays
   - Confirm active status

2. **Electronic Remittance Advice (ERA)**
   - Automatic posting of payments
   - Electronic EOB processing
   - Reconciliation automation

3. **Claim Scrubbing**
   - Pre-submission validation
   - Error detection
   - Compliance checking

4. **Analytics Dashboard**
   - Denial rate tracking
   - Average days to payment
   - Top denial reasons
   - Revenue cycle metrics

5. **Automated Appeals**
   - Template-based appeal letters
   - Document attachment
   - Tracking and follow-up

6. **Patient Portal Integration**
   - View claim status
   - Upload documents
   - Communication with billing office

---

## Support and Resources

### Helpful Links:
- [CMS HCFA-1500 Form Instructions](https://www.cms.gov/Medicare/CMS-Forms/CMS-Forms/CMS-Forms-Items/CMS1188854)
- [ICD-10 Code Lookup](https://www.icd10data.com/)
- [CPT Code Reference](https://www.aapc.com/codes/cpt-codes-range/)
- [EDI 837 Specifications](https://www.wpc-edi.com/reference/codelists/healthcare/claim-payment-information-837/)

### Contact Information:
For technical support or questions about the claims management system, contact your system administrator.

---

## Conclusion

The Insurance Claims Management System provides a comprehensive solution for creating, submitting, and tracking insurance claims. By following the workflows and best practices outlined in this guide, you can streamline your revenue cycle and improve claim acceptance rates.

**Key Takeaways:**
- ✅ Verify insurance before service
- ✅ Use accurate coding
- ✅ Submit claims timely
- ✅ Track status regularly
- ✅ Appeal denials when appropriate
- ✅ Maintain complete documentation

For additional features or customization, refer to the development documentation or contact your development team.
