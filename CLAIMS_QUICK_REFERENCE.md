# Insurance Claims Submission - Quick Reference

## 📋 What You've Built

A complete **Insurance Claims Management System** that allows you to:

✅ **Create Claims** - From surgeries or manually  
✅ **Submit Claims** - To insurance providers  
✅ **Track Status** - Through entire lifecycle  
✅ **Monitor Payments** - Track what's been paid  
✅ **Manage Denials** - Handle rejections and appeals  
✅ **View Analytics** - Dashboard with key metrics  

---

## 🚀 Quick Start (3 Steps)

### Step 1: Run Database Migration
```sql
-- In Supabase SQL Editor, run:
supabase-migration-add-claims-management.sql
```

### Step 2: Add to App.jsx
```javascript
import ClaimsManagement from './components/ClaimsManagement';

// Add navigation item
{ label: 'Claims', view: 'claims', icon: '📄' }

// Add to render
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

### Step 3: Test It!
1. Navigate to Claims Management
2. Click "+ Create Claim"
3. Select a patient and surgery
4. Click "Save" then "Submit"

---

## 📊 How Claims Work

### Claim Lifecycle
```
1. CREATE → 2. REVIEW → 3. SUBMIT → 4. TRACK → 5. PAYMENT
```

### Status Flow
```
Draft
  ↓
Submitted (sent to insurance)
  ↓
Pending (received by insurance)
  ↓
In Review (being processed)
  ↓
Approved ✅ → Paid 💰
  OR
Denied ❌ → Appeal 🔄
```

---

## 💡 Common Use Cases

### Use Case 1: Submit Claim After Surgery
```
1. Patient has surgery
2. Go to Claims Management
3. Click "+ Create Claim"
4. Select patient → Select surgery
5. Insurance info auto-fills
6. Procedure codes auto-populate
7. Click "Save Claim"
8. Click "Submit" button
```

### Use Case 2: Track Claim Status
```
1. Go to Claims Management
2. Filter by status (e.g., "Submitted")
3. View submission date
4. Monitor for status changes
5. Check for payments
```

### Use Case 3: Handle Denial
```
1. Claim shows status "Denied"
2. Click "Edit" to view details
3. Review denial reason
4. Gather supporting documents
5. Change status to "Appealed"
6. Add notes with appeal information
7. Resubmit
```

---

## 🎯 Key Features

### Dashboard Statistics
- **Total Claims** - All claims in system
- **Submitted** - Claims sent to insurance
- **Approved** - Claims accepted
- **Denied** - Claims rejected
- **Total Billed** - Sum of all charges
- **Total Paid** - Sum of all payments

### Auto-Population
When you select a **Patient**:
- Insurance provider fills automatically
- Policy number fills automatically
- Group number fills automatically
- Subscriber info fills automatically

When you select a **Surgery**:
- Service date fills automatically
- Procedure codes fill automatically
- Related diagnosis info available

### Status Filtering
Filter claims by:
- All Claims
- Draft
- Submitted
- Pending
- In Review
- Approved
- Denied
- Paid

---

## 📝 Required Information for Claims

### Minimum Required Fields:
- ✅ Patient (select from dropdown)
- ✅ Service Date
- ✅ Insurance Provider
- ✅ Policy Number
- ✅ Total Charges

### Optional But Recommended:
- Related Surgery (auto-fills data)
- Group Number
- Diagnosis Codes (ICD-10)
- Procedure Codes (CPT)
- Place of Service
- Notes

---

## 🔄 Integration Points

### With Patient Management:
- Pull insurance information
- Auto-populate subscriber details
- Link to patient records

### With Surgery Scheduler:
- Link claims to surgeries
- Auto-fill service dates
- Auto-populate CPT codes

### With Billing:
- Track payments
- Calculate patient responsibility
- Generate statements

---

## 📤 Electronic Submission Options

### Option 1: Clearinghouse (Recommended)
Popular clearinghouses:
- **Change Healthcare**
- **Availity**
- **Trizetto**
- **Office Ally**

Benefits:
- Submit to multiple payers
- Automated status updates
- Error checking
- Reporting

### Option 2: Direct to Payer
Some insurance companies accept direct submission:
- Medicare (via CMS portal)
- Medicaid (state-specific)
- Major commercial payers

### Option 3: Paper Claims (HCFA-1500)
For payers that don't accept electronic:
- Generate HCFA-1500 form
- Print and mail
- Track via certified mail

---

## ⚠️ Common Mistakes to Avoid

❌ **Don't** submit without verifying insurance  
✅ **Do** check eligibility first

❌ **Don't** use incorrect CPT codes  
✅ **Do** match codes to documentation

❌ **Don't** miss filing deadlines  
✅ **Do** submit within 90 days

❌ **Don't** ignore denials  
✅ **Do** review and appeal if appropriate

❌ **Don't** forget to follow up  
✅ **Do** check status weekly

---

## 🎓 Best Practices

### Before Submitting:
1. ✅ Verify patient insurance is active
2. ✅ Confirm coverage for services
3. ✅ Check copay and deductible
4. ✅ Obtain pre-authorization if needed
5. ✅ Verify all codes are correct

### After Submitting:
1. ✅ Track submission date
2. ✅ Follow up in 14-30 days
3. ✅ Monitor for status changes
4. ✅ Review EOB when received
5. ✅ Post payments promptly

### For Denials:
1. ✅ Review denial reason carefully
2. ✅ Check for coding errors
3. ✅ Verify patient eligibility
4. ✅ Gather supporting documentation
5. ✅ Submit appeal within timeframe

---

## 📞 Next Steps

### Immediate Actions:
1. **Run the database migration**
2. **Add ClaimsManagement component to your app**
3. **Test with a sample claim**
4. **Review the full guide** (`CLAIMS_MANAGEMENT_GUIDE.md`)

### Future Enhancements:
- Set up clearinghouse integration
- Implement eligibility verification
- Add automated reminders
- Create custom reports
- Build patient portal

---

## 📚 Additional Resources

**Files Created:**
- `supabase-migration-add-claims-management.sql` - Database schema
- `ClaimsManagement.jsx` - React component
- `CLAIMS_MANAGEMENT_GUIDE.md` - Complete documentation
- `CLAIMS_QUICK_REFERENCE.md` - This file

**External Resources:**
- [CMS HCFA-1500 Instructions](https://www.cms.gov/Medicare/CMS-Forms/CMS-Forms/CMS-Forms-Items/CMS1188854)
- [ICD-10 Codes](https://www.icd10data.com/)
- [CPT Codes](https://www.aapc.com/codes/cpt-codes-range/)

---

## 💬 Questions?

**Q: How do I submit claims electronically?**  
A: You'll need to integrate with a clearinghouse or use the payer's direct submission portal. See the full guide for details.

**Q: What if a claim is denied?**  
A: Review the denial reason, correct any errors, gather supporting documentation, and submit an appeal.

**Q: How long does it take to get paid?**  
A: Typically 14-30 days for electronic claims, 30-60 days for paper claims.

**Q: Can I track multiple claims at once?**  
A: Yes! Use the status filter to view all claims in a specific status.

**Q: What happens to draft claims?**  
A: They're saved but not submitted. You can edit and submit them later.

---

## ✅ Success Checklist

- [ ] Database migration completed
- [ ] ClaimsManagement component added to app
- [ ] Navigation updated with Claims option
- [ ] Test claim created successfully
- [ ] Test claim submitted successfully
- [ ] Dashboard statistics displaying correctly
- [ ] Status filtering working
- [ ] Patient insurance auto-populating
- [ ] Surgery data auto-populating
- [ ] Ready for production use!

---

**🎉 Congratulations!** You now have a complete insurance claims management system integrated with your patient and surgery data!
