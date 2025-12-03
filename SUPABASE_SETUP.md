# Supabase Database Setup Guide

## 🚀 Quick Start

Follow these steps to set up your Supabase database for the Hospital Management System.

---

## Step 1: Create a Supabase Account

1. Go to [https://supabase.com](https://supabase.com)
2. Click "Start your project"
3. Sign up with GitHub, Google, or email
4. **It's completely FREE** - no credit card required!

---

## Step 2: Create a New Project

1. Click "New Project"
2. Fill in the details:
   - **Name**: `hospital-management` (or any name you like)
   - **Database Password**: Create a strong password (save this!)
   - **Region**: Choose closest to you
3. Click "Create new project"
4. Wait 1-2 minutes for setup to complete

---

## Step 3: Get Your API Credentials

1. In your Supabase project dashboard, click on the **Settings** icon (⚙️) in the left sidebar
2. Click on **API** in the settings menu
3. You'll see two important values:
   - **Project URL** (looks like: `https://xxxxxxxxxxxxx.supabase.co`)
   - **anon/public key** (a long string starting with `eyJ...`)

---

## Step 4: Configure Environment Variables

1. In your project root (`d:/Antigravity`), create a file named `.env`
2. Copy the contents from `.env.example`
3. Replace the placeholders with your actual credentials:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

4. Save the file

---

## Step 5: Create Database Tables

1. In your Supabase dashboard, click on the **SQL Editor** icon (📝) in the left sidebar
2. Click "+ New query"
3. Open the file `supabase-schema.sql` from your project root
4. **Copy ALL the SQL code** from that file
5. **Paste it** into the Supabase SQL Editor
6. Click **"Run"** (or press Ctrl+Enter)
7. You should see "Success. No rows returned" - this is good!

---

## Step 6: Verify Tables Were Created

1. Click on the **Table Editor** icon (📊) in the left sidebar
2. You should see 4 tables:
   - `surgeons` (with sample surgeons)
   - `patients` (with sample patients)
   - `users` (with sample users for auth)
   - `cpt_codes` (with CPT codes)
   - `surgeries` (with sample surgeries)
   - `billing` (with sample billing records)

---

## Step 7: Restart Your Dev Server

1. Stop your current dev server (Ctrl+C in terminal)
2. Run: `npm run dev`
3. Your app will now connect to Supabase!

---

## ✅ Verification

To verify everything is working:

1. Open your app in the browser
2. Go to **Patient Management**
3. Add a new patient
4. Refresh the page
5. **The patient should still be there!** (not disappear like before)

---

## 🎉 You're Done!

Your hospital management system now has:
- ✅ Persistent database storage
- ✅ Real-time updates
- ✅ Professional PostgreSQL database
- ✅ Free hosting (up to 500MB database)

---

## 📊 View Your Data

You can view and edit your data directly in Supabase:
1. Go to **Table Editor** in Supabase dashboard
2. Click on any table (patients, surgeons, etc.)
3. You can add, edit, or delete rows directly

---

## 🔒 Security Note

The `.env` file contains sensitive credentials:
- ✅ It's already in `.gitignore` (won't be committed to Git)
- ❌ Never share your `.env` file publicly
- ❌ Never commit it to GitHub

---

## 🆘 Troubleshooting

**Problem**: "Failed to fetch" errors
- **Solution**: Check that your `.env` file has the correct URL and key

**Problem**: "relation does not exist" errors
- **Solution**: Make sure you ran the SQL schema in Step 5

**Problem**: Data not persisting
- **Solution**: Verify your `.env` file is in the project root and restart dev server

---

## 📚 Next Steps

Once everything is working, you can:
- View real-time data in Supabase dashboard
- Set up authentication (optional)
- Add more advanced features
- Deploy your app to production

---

Need help? Check the Supabase docs: https://supabase.com/docs
