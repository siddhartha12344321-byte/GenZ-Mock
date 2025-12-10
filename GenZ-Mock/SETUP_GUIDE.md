# 🚀 Gen-Z Mocks - Complete Setup Guide

This guide will help you set up **Supabase** (database) and **Vercel** (deployment) for your Gen-Z Mocks platform.

---

## 📋 Table of Contents

1. [Supabase Setup](#1-supabase-setup)
2. [Database Schema](#2-database-schema)
3. [Vercel Deployment](#3-vercel-deployment)
4. [Generate Access Keys](#4-generate-access-keys)
5. [Create Mock Tests](#5-create-mock-tests)
6. [Connect Frontend to Supabase](#6-connect-frontend-to-supabase)

---

## 1. Supabase Setup

### Step 1: Create Account
1. Go to [supabase.com](https://supabase.com)
2. Click **"Start your project"**
3. Sign up with GitHub (recommended) or email

### Step 2: Create New Project
1. Click **"New Project"**
2. Fill in:
   - **Name**: `genz-mocks`
   - **Database Password**: Create a strong password (SAVE THIS!)
   - **Region**: Choose closest to your users (e.g., Mumbai for India)
3. Click **"Create new project"**
4. Wait 2-3 minutes for setup

### Step 3: Get Your Credentials
After project is created:
1. Go to **Settings** → **API**
2. Copy and save:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6...`

---

## 2. Database Schema

### Step 1: Open SQL Editor
1. In Supabase dashboard, click **SQL Editor** (left sidebar)
2. Click **"New Query"**

### Step 2: Create Tables
Paste this SQL and click **"Run"**:

```sql
-- Access Keys Table
CREATE TABLE access_keys (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    key VARCHAR(20) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    used_count INTEGER DEFAULT 0,
    created_by VARCHAR(100),
    notes TEXT
);

-- User Sessions Table
CREATE TABLE user_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    access_key VARCHAR(20) REFERENCES access_keys(key),
    session_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    session_expires TIMESTAMP WITH TIME ZONE,
    device_info TEXT,
    ip_address VARCHAR(50)
);

-- Subjects Table
CREATE TABLE subjects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name_en VARCHAR(100) NOT NULL,
    name_hi VARCHAR(100),
    icon VARCHAR(10),
    color VARCHAR(20),
    question_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Mock Tests Table
CREATE TABLE mock_tests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title_en VARCHAR(200) NOT NULL,
    title_hi VARCHAR(200),
    subject_id UUID REFERENCES subjects(id),
    total_questions INTEGER NOT NULL,
    time_limit_minutes INTEGER NOT NULL,
    mark_correct DECIMAL(4,2) DEFAULT 2.00,
    mark_wrong DECIMAL(4,2) DEFAULT -0.66,
    difficulty VARCHAR(20) DEFAULT 'moderate',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Questions Table
CREATE TABLE questions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    test_id UUID REFERENCES mock_tests(id) ON DELETE CASCADE,
    question_number INTEGER NOT NULL,
    question_en TEXT NOT NULL,
    question_hi TEXT,
    option_a_en TEXT NOT NULL,
    option_a_hi TEXT,
    option_b_en TEXT NOT NULL,
    option_b_hi TEXT,
    option_c_en TEXT NOT NULL,
    option_c_hi TEXT,
    option_d_en TEXT NOT NULL,
    option_d_hi TEXT,
    correct_option CHAR(1) NOT NULL,
    explanation_en TEXT,
    explanation_hi TEXT,
    topic VARCHAR(100),
    difficulty VARCHAR(20)
);

-- Test Attempts Table
CREATE TABLE test_attempts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    test_id UUID REFERENCES mock_tests(id),
    access_key VARCHAR(20) REFERENCES access_keys(key),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    time_taken_seconds INTEGER,
    score DECIMAL(6,2),
    correct_count INTEGER,
    wrong_count INTEGER,
    skipped_count INTEGER,
    answers JSONB
);

-- Insert default subjects
INSERT INTO subjects (name_en, name_hi, icon, color) VALUES
    ('Indian Polity', 'भारतीय राजव्यवस्था', '⚖️', '#3b82f6'),
    ('History', 'इतिहास', '📜', '#f59e0b'),
    ('Geography', 'भूगोल', '🌍', '#10b981'),
    ('Economy', 'अर्थव्यवस्था', '📊', '#8b5cf6'),
    ('Environment', 'पर्यावरण', '🌱', '#22c55e'),
    ('Science & Tech', 'विज्ञान एवं प्रौद्योगिकी', '🔬', '#06b6d4'),
    ('Current Affairs', 'समसामयिकी', '📰', '#ef4444'),
    ('Art & Culture', 'कला एवं संस्कृति', '🎨', '#ec4899');

-- Insert default access keys
INSERT INTO access_keys (key, notes) VALUES
    ('GENZ-2024-MOCK', 'Default demo key'),
    ('TEST-1234-5678', 'Test key'),
    ('DEMO-ACCESS-KEY', 'Demo access key');
```

### Step 3: Enable Row Level Security (RLS)
Run this SQL:

```sql
-- Enable RLS
ALTER TABLE access_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE mock_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

-- Allow public read access to active tests
CREATE POLICY "Public can view active tests" ON mock_tests
    FOR SELECT USING (is_active = true);

CREATE POLICY "Public can view questions" ON questions
    FOR SELECT USING (true);

-- Allow key validation
CREATE POLICY "Public can validate keys" ON access_keys
    FOR SELECT USING (is_active = true);
```

---

## 3. Vercel Deployment

### Step 1: Prepare Your Code
1. Create a new folder or use existing `mcq-platform` folder
2. Make sure all files are ready

### Step 2: Create GitHub Repository
1. Go to [github.com](https://github.com)
2. Click **"New repository"**
3. Name it `genz-mocks`
4. Click **"Create repository"**

### Step 3: Push Code to GitHub
Open terminal in your project folder:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/genz-mocks.git
git push -u origin main
```

### Step 4: Deploy on Vercel
1. Go to [vercel.com](https://vercel.com)
2. Sign up with GitHub
3. Click **"Import Project"**
4. Select your `genz-mocks` repository
5. Click **"Deploy"**
6. Wait for deployment (1-2 minutes)

### Step 5: Get Your Live URL
After deployment, Vercel gives you:
- Production URL: `https://genz-mocks.vercel.app`
- You can add custom domain later

---

## 4. Generate Access Keys

### Option A: From Admin Panel (Current Method)
1. Open your site → Go to `/admin/index.html`
2. Click **"🔑 Access Keys"** in sidebar
3. Click **"➕ Generate New Key"**
4. Copy the key and share with users

### Option B: From Supabase Dashboard
1. Go to Supabase → **Table Editor**
2. Select `access_keys` table
3. Click **"Insert"** → **"Insert row"**
4. Fill in:
   - `key`: Your custom key (e.g., `MY-CUSTOM-KEY`)
   - `is_active`: `true`
   - `notes`: Any description
5. Click **"Save"**

### Option C: Using SQL
In Supabase SQL Editor:

```sql
INSERT INTO access_keys (key, notes) VALUES
    ('MY-CUSTOM-KEY', 'For student group A'),
    ('BATCH-2024-01', 'January 2024 batch');
```

---

## 5. Create Mock Tests

### Option A: From Admin Panel
1. Open `/admin/index.html`
2. Click **"➕ Create New Test"**
3. Fill in details:
   - Test name (English & Hindi)
   - Subject
   - Number of questions
   - Time limit
   - Marking scheme
4. Click **"Save Test"**

### Option B: Import from PDF
1. Use the `tools/extract_mcq.py` script:
   ```bash
   python tools/extract_mcq.py your_pdf.pdf -o questions.json
   ```
2. In Admin panel, click **"📥 Import PDF"**
3. Paste the JSON output
4. Click **"Import Questions"**

### Option C: Direct Database Insert
In Supabase SQL Editor:

```sql
-- Create a test
INSERT INTO mock_tests (title_en, title_hi, subject_id, total_questions, time_limit_minutes)
VALUES (
    'Polity Mock Test 1',
    'राजव्यवस्था मॉक टेस्ट 1',
    (SELECT id FROM subjects WHERE name_en = 'Indian Polity'),
    100,
    120
) RETURNING id;

-- Add questions (use the returned test_id)
INSERT INTO questions (
    test_id, question_number, question_en, question_hi,
    option_a_en, option_b_en, option_c_en, option_d_en,
    correct_option, explanation_en
) VALUES (
    'YOUR_TEST_ID_HERE',
    1,
    'What is the supreme law of India?',
    'भारत का सर्वोच्च कानून क्या है?',
    'Constitution', 'Parliament', 'Supreme Court', 'President',
    'a',
    'The Constitution of India is the supreme law of the land.'
);
```

---

## 6. Connect Frontend to Supabase

### Step 1: Create Config File
Create `js/supabase-config.js`:

```javascript
// Supabase Configuration
const SUPABASE_URL = 'https://YOUR_PROJECT.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';

// Initialize Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Validate access key
async function validateKey(key) {
    const { data, error } = await supabase
        .from('access_keys')
        .select('key, is_active')
        .eq('key', key)
        .eq('is_active', true)
        .single();
    
    return !error && data;
}

// Get mock tests
async function getMockTests(subjectId = null) {
    let query = supabase
        .from('mock_tests')
        .select(`*, subjects(name_en, icon)`)
        .eq('is_active', true);
    
    if (subjectId) {
        query = query.eq('subject_id', subjectId);
    }
    
    const { data, error } = await query;
    return error ? [] : data;
}

// Get questions for a test
async function getQuestions(testId) {
    const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('test_id', testId)
        .order('question_number');
    
    return error ? [] : data;
}

// Save test attempt
async function saveAttempt(attemptData) {
    const { data, error } = await supabase
        .from('test_attempts')
        .insert(attemptData);
    
    return !error;
}
```

### Step 2: Add Script to HTML
Add to your HTML files (before closing `</body>`):

```html
<!-- Supabase Client -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="js/supabase-config.js"></script>
```

### Step 3: Update Key Validation
Replace the local key validation with Supabase:

```javascript
// Instead of checking local array
async function validateAccessKey(key) {
    const isValid = await validateKey(key);
    if (isValid) {
        grantAccess(key);
        window.location.href = 'dashboard.html';
    } else {
        showError('Invalid access key');
    }
}
```

---

## 📱 Quick Reference

| Task | Where |
|------|-------|
| Generate Keys | Admin Panel → Access Keys |
| Create Tests | Admin Panel → Create New Test |
| Import Questions | Admin Panel → Import PDF |
| View Analytics | Supabase Dashboard |
| Deploy Updates | Push to GitHub (auto-deploys) |

---

## 🔗 Important Links

- **Supabase Dashboard**: https://app.supabase.com
- **Vercel Dashboard**: https://vercel.com/dashboard
- **GitHub Repository**: Your repository URL
- **Admin Contact**: [t.me/the_siddhartha](https://t.me/the_siddhartha)

---

## ❓ Troubleshooting

### "Key not working"
- Check if key exists in `access_keys` table
- Ensure `is_active` is `true`
- Keys are case-sensitive

### "Tests not showing"
- Check if `is_active` is `true` in `mock_tests`
- Verify questions are linked to the test

### "Deployment failed"
- Check Vercel logs for errors
- Ensure all files are committed to GitHub

---

Need help? Contact: [t.me/the_siddhartha](https://t.me/the_siddhartha)
