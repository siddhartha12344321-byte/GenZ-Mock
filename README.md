# 🎯 UPSC Mock Test Platform

A professional UPSC mock test platform with bilingual (English/Hindi) support, set-based tests, and PDF question extraction.

![Platform Preview](docs/preview.png)

## ✨ Features

### 🎯 Mock Test Experience
- **Professional Exam Interface** - Real UPSC-like test environment
- **Question Palette** - Navigate between questions easily
- **Mark for Review** - Flag questions to revisit later
- **Countdown Timer** - Time management with warnings
- **Auto-save** - Never lose your progress

### 🌐 Bilingual Support
- **EN/HI Toggle** - Switch between English and Hindi instantly
- **Same Questions, Both Languages** - Complete bilingual experience
- **Hindi Font Support** - Proper Devanagari rendering

### 📊 Analytics & Tracking
- **Detailed Results** - Score breakdown with explanations
- **UPSC Marking Scheme** - Configurable +2/-0.66 scoring
- **Topic-wise Analysis** - Identify weak areas
- **Progress Tracking** - Track improvement over time

### 📥 PDF Import Tool
- **Automatic Extraction** - Extract questions from PDF
- **Table Support** - Handle table-based questions
- **Bilingual Detection** - Detect Hindi content automatically
- **JSON Export** - Standard format for database import

## 🚀 Quick Start

### 1. View the Platform (No Setup Required)

Simply open `index.html` in your browser:

```bash
# Navigate to project folder
cd mcq-platform

# Open in browser (Windows)
start index.html

# Open in browser (Mac)
open index.html

# Open in browser (Linux)
xdg-open index.html
```

### 2. Extract Questions from PDF

```bash
# Install dependencies
pip install pdfplumber

# Run extractor
python tools/extract_mcq.py your_test.pdf output.json --subject "Polity" --test-name "Mock Test 1"
```

### 3. Import to Platform

1. Open Admin Panel: `admin/index.html`
2. Click "Import PDF" button
3. Paste the JSON content or upload the JSON file
4. Done! Questions are imported.

## 📁 Project Structure

```
mcq-platform/
├── index.html          # Landing page with auth
├── dashboard.html      # User dashboard with tests
├── test.html           # Mock test exam interface
├── results.html        # Results with solutions
├── progress.html       # User progress tracking
├── admin/
│   └── index.html      # Admin panel for managing tests
├── css/
│   └── styles.css      # Main stylesheet
├── js/                 # JavaScript modules (for Supabase integration)
├── tools/
│   └── extract_mcq.py  # PDF extraction tool
└── README.md
```

## 🔧 PDF Extraction Tool

The Python tool extracts questions from your UPSC mock test PDFs.

### Supported PDF Format

```
Q1. Question text here?
a) Option A
b) Option B
c) Option C
d) Option D
Answer: b
Explanation: Detailed explanation here...
Source: Book Name - Chapter
Difficulty: Moderate
```

### Usage Examples

```bash
# Basic extraction
python tools/extract_mcq.py test.pdf output.json

# With metadata
python tools/extract_mcq.py polity_test.pdf polity.json \
    --subject "Indian Polity" \
    --test-name "Polity Mock Test 1" \
    --title-hi "राजव्यवस्था मॉक टेस्ट 1" \
    --time 120

# View help
python tools/extract_mcq.py --help
```

### Output JSON Format

```json
{
  "id": "uuid",
  "title_en": "Polity Mock Test 1",
  "title_hi": "राजव्यवस्था मॉक टेस्ट 1",
  "subject": "Indian Polity",
  "total_questions": 100,
  "time_limit_minutes": 120,
  "questions": [
    {
      "question_text_en": "Question in English?",
      "question_text_hi": "प्रश्न हिंदी में?",
      "option_a_en": "Option A",
      "option_b_en": "Option B",
      "option_c_en": "Option C",
      "option_d_en": "Option D",
      "correct_option": "b",
      "explanation_en": "Explanation...",
      "source": "Laxmikant",
      "difficulty": "Moderate"
    }
  ]
}
```

## ☁️ Deployment (Full Version)

For user accounts and progress tracking, you'll need to set up Supabase:

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create a free project
3. Get your Project URL and Anon Key

### 2. Run Database Schema

Run this SQL in Supabase SQL Editor:

```sql
-- Subjects
CREATE TABLE subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    name_hi TEXT,
    icon TEXT,
    color TEXT
);

-- Mock Tests
CREATE TABLE mock_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title_en TEXT NOT NULL,
    title_hi TEXT,
    subject_id UUID REFERENCES subjects(id),
    total_questions INTEGER,
    time_limit_minutes INTEGER,
    mark_correct DECIMAL DEFAULT 2,
    mark_wrong DECIMAL DEFAULT -0.66,
    difficulty TEXT DEFAULT 'moderate',
    source TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Questions
CREATE TABLE questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mock_test_id UUID REFERENCES mock_tests(id),
    question_number INTEGER,
    question_text_en TEXT NOT NULL,
    question_text_hi TEXT,
    option_a_en TEXT NOT NULL,
    option_b_en TEXT NOT NULL,
    option_c_en TEXT,
    option_d_en TEXT,
    option_a_hi TEXT,
    option_b_hi TEXT,
    option_c_hi TEXT,
    option_d_hi TEXT,
    correct_option CHAR(1) NOT NULL,
    explanation_en TEXT,
    explanation_hi TEXT,
    has_table BOOLEAN DEFAULT FALSE,
    table_html TEXT,
    source TEXT,
    difficulty TEXT DEFAULT 'moderate'
);

-- User Progress
CREATE TABLE test_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    mock_test_id UUID REFERENCES mock_tests(id),
    started_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    total_attempted INTEGER,
    correct_answers INTEGER,
    wrong_answers INTEGER,
    score DECIMAL,
    time_taken_seconds INTEGER,
    answers JSONB
);

-- Enable Row Level Security
ALTER TABLE mock_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_attempts ENABLE ROW LEVEL SECURITY;

-- Public read access for tests and questions
CREATE POLICY "Public read access" ON mock_tests FOR SELECT USING (true);
CREATE POLICY "Public read access" ON questions FOR SELECT USING (true);

-- Users can only see their own attempts
CREATE POLICY "Users can view own attempts" ON test_attempts 
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own attempts" ON test_attempts 
    FOR INSERT WITH CHECK (auth.uid() = user_id);
```

### 3. Configure Frontend

Create `js/supabase-config.js`:

```javascript
const SUPABASE_URL = 'your-project-url';
const SUPABASE_ANON_KEY = 'your-anon-key';

const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
```

### 4. Deploy to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel
```

## 📱 Screenshots

| Landing Page | Test Interface |
|-------------|----------------|
| ![Landing](docs/landing.png) | ![Test](docs/test.png) |

| Dashboard | Results |
|-----------|---------|
| ![Dashboard](docs/dashboard.png) | ![Results](docs/results.png) |

## 🛠️ Customization

### Change Colors
Edit CSS variables in `css/styles.css`:

```css
:root {
    --primary-500: #3b82f6;  /* Main blue */
    --accent-500: #f97316;   /* Orange accent */
    --success-500: #22c55e;  /* Green for correct */
    --error-500: #ef4444;    /* Red for wrong */
}
```

### Add More Subjects
Edit the subjects array in relevant HTML files:

```javascript
const subjects = [
    { id: 'polity', name: 'Indian Polity', nameHi: 'भारतीय राजव्यवस्था', icon: '⚖️' },
    { id: 'history', name: 'History', nameHi: 'इतिहास', icon: '📜' },
    // Add more...
];
```

### Modify Marking Scheme
In admin panel, set custom marks for each test:
- Correct Answer: +2 (default)
- Wrong Answer: -0.66 (default)
- Not Attempted: 0

## 📄 License

MIT License - Feel free to use for personal or commercial projects.

## 🤝 Contributing

Contributions welcome! Please read the contributing guidelines first.

## 📞 Support

For issues or questions, open a GitHub issue or contact support.

---

Made with ❤️ for UPSC Aspirants
