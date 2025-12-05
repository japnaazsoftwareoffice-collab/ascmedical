# Settings Module - Setup Guide

## Overview
The Settings module allows you to manage facility information that appears on HCFA-1500 claim forms and other billing documents. This eliminates hardcoded values and makes your system adaptable to different facilities.

## Setup Steps

### 1. Run the Database Migration

Execute the following SQL script in your Supabase SQL Editor:

**File:** `supabase-migration-add-settings.sql`

This creates:
- A `settings` table with facility information fields
- Default values (Naples Surgery Center)
- Row Level Security (RLS) policies

### 2. Access Settings

1. Log in as an **Admin** user
2. Click **Settings** (🔧) in the sidebar (bottom of the menu)
3. Update the facility information:
   - Facility Name
   - Street Address
   - City, State, ZIP
   - Phone Number
   - Federal Tax ID (EIN)
   - NPI Number (optional)

### 3. Save Changes

Click **Save Settings** to update the database.

## How It Works

### Database Structure

```sql
settings (
    id BIGINT PRIMARY KEY,
    facility_name TEXT,
    facility_address TEXT,
    facility_city TEXT,
    facility_state TEXT,
    facility_zip TEXT,
    facility_phone TEXT,
    tax_id TEXT,
    npi TEXT,
    updated_at TIMESTAMP
)
```

### Integration Points

**HCFA-1500 Form (Box Mapping):**
- **Box 25**: Federal Tax ID → `tax_id`
- **Box 32**: Service Facility → `facility_name`, `facility_address`, `facility_city`, `facility_state`, `facility_zip`
- **Box 33**: Billing Provider → `facility_name`, `facility_phone`

### Files Modified

1. **`src/lib/supabase.js`**
   - Added `getSettings()` - Fetch facility settings
   - Added `updateSettings(updates)` - Update facility settings

2. **`src/components/Settings.jsx`** (NEW)
   - Settings management UI
   - Form validation
   - Real-time updates

3. **`src/components/HCFA1500Form.jsx`**
   - Loads settings on mount
   - Uses dynamic values instead of hardcoded strings
   - Falls back to defaults if settings not available

4. **`src/components/Sidebar.jsx`**
   - Added Settings menu item for admins

5. **`src/App.jsx`**
   - Imported Settings component
   - Added routing for settings view

## Usage Example

### Before (Hardcoded):
```jsx
<div>NAPLES SURGERY CENTER</div>
<div>123 MEDICAL BLVD</div>
<div>NAPLES, FL 34102</div>
```

### After (Dynamic):
```jsx
<div>{settings?.facility_name?.toUpperCase()}</div>
<div>{settings?.facility_address?.toUpperCase()}</div>
<div>{settings?.facility_city?.toUpperCase()}, {settings?.facility_state?.toUpperCase()} {settings?.facility_zip}</div>
```

## Benefits

✅ **Multi-Facility Support**: Easily switch between facilities
✅ **Compliance**: Accurate facility info on all claims
✅ **Flexibility**: Update information without code changes
✅ **Professional**: No hardcoded test data in production

## Testing

1. **Update Settings**:
   - Go to Settings page
   - Change facility name to "Your Facility Name"
   - Save

2. **Generate HCFA Form**:
   - Go to Claims Management
   - Click the printer icon on any claim
   - Verify Box 25, 32, and 33 show your updated information

3. **Verify Persistence**:
   - Refresh the page
   - Check that settings are still saved

## Troubleshooting

### Settings Not Loading
- Ensure migration was run successfully
- Check browser console for errors
- Verify RLS policies allow read access

### Settings Not Saving
- Check that you're logged in as admin
- Verify all required fields are filled
- Check browser console for errors

### HCFA Form Shows Defaults
- Ensure settings were saved
- Refresh the HCFA form modal
- Check that `db.getSettings()` is returning data

## Future Enhancements

- **Multi-Facility**: Support multiple facilities with selection
- **Provider Settings**: Individual provider NPI and signatures
- **Billing Settings**: Default payment terms, late fees
- **Email Templates**: Customizable notification templates

---

**Status**: ✅ Complete and Ready for Testing
