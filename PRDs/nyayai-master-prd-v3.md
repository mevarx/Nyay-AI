# NyayAI — Master Deployment PRD
**Version:** 3.0  
**Stack:** Firebase (Frontend) · Leapcell (Backend) · Supabase (Auth + Database)  
**AI:** Gemini API (AI Studio) — frontend narrative + backend reasoning  
**IDE:** Google Antigravity (Claude Opus handles all implementation)  
**Last Updated:** March 2026

---

## How to Use This Document

Each section contains:
- What needs to happen
- The exact prompt to paste into Antigravity
- What "done" looks like so you can verify before moving on

Work top to bottom. Do not skip sections.

---

## Section 0 — Project Setup

### 0.1 Folder Structure to Create

Tell Antigravity to scaffold this before anything else.

**Prompt:**
```
Create the following folder and file structure for a project called NyayAI. 
Create empty files where listed — do not write any content yet.

nyayai/
├── backend/
│   ├── app.py
│   ├── config.py
│   ├── requirements.txt
│   ├── .env.example
│   ├── Procfile
│   ├── utils/
│   │   ├── __init__.py
│   │   ├── response_builder.py
│   │   ├── cache.py
│   │   └── auth_middleware.py
│   ├── services/
│   │   ├── __init__.py
│   │   ├── gemini_service.py
│   │   ├── dataset_service.py
│   │   ├── metrics_service.py
│   │   ├── db_service.py
│   │   └── fix_service.py
│   ├── routes/
│   │   ├── __init__.py
│   │   ├── upload_routes.py
│   │   ├── analyze_routes.py
│   │   ├── fix_routes.py
│   │   └── history_routes.py
│   ├── uploads/
│   └── cache/
│
└── frontend/
    ├── index.html
    ├── login.html
    ├── signup.html
    ├── upload.html
    ├── report.html
    ├── dashboard.html
    ├── learn.html
    ├── .firebaserc
    ├── firebase.json
    ├── js/
    │   ├── config.js
    │   ├── cache.js
    │   ├── auth.js
    │   ├── api.js
    │   ├── gemini.js
    │   ├── upload.js
    │   ├── report.js
    │   └── dashboard.js
    ├── css/
    │   ├── variables.css
    │   ├── base.css
    │   ├── navbar.css
    │   ├── landing.css
    │   ├── auth.css
    │   ├── upload.css
    │   ├── report.css
    │   └── dashboard.css
    └── assets/
        └── sample_data/
            ├── hr_india.csv
            └── loan_india.csv
```

---

### 0.2 Environment Variables

**Fill these before giving any build prompts to Antigravity.**

Backend `.env` values (Antigravity will ask for these):
```
GEMINI_API_KEY=        ← from aistudio.google.com/app/apikey
FLASK_SECRET_KEY=      ← any random string you type
SUPABASE_URL=          ← from Supabase project settings
SUPABASE_ANON_KEY=     ← from Supabase project settings → API
SUPABASE_JWT_SECRET=   ← from Supabase project settings → API → JWT Secret
UPLOAD_FOLDER=./uploads
CACHE_FOLDER=./cache
USE_DEV_MODEL=true
```

Frontend `js/config.js` values (fill manually after file is generated):
```
API_BASE_URL=          ← your Leapcell backend URL (get after deploying backend)
GEMINI_API_KEY=        ← same key as backend
SUPABASE_URL=          ← same as backend
SUPABASE_ANON_KEY=     ← same as backend
```

---

## Section 1 — Supabase Setup

Do this manually in the Supabase dashboard. No Antigravity needed here.

### 1.1 Create Project
- Go to `supabase.com` → New Project
- Name: `nyayai`
- Region: `ap-south-1` (Mumbai — lowest latency for India)
- Save the Project URL and Anon Key

### 1.2 Enable Google OAuth
- Authentication → Providers → Google → Enable
- Go to `console.cloud.google.com` → APIs & Services → Credentials
- Create OAuth 2.0 Client ID → Web Application
- Authorized redirect URI: `https://yourproject.supabase.co/auth/v1/callback`
- Paste Client ID and Secret back into Supabase

### 1.3 Create Audits Table
Run this SQL in Supabase → SQL Editor:

```sql
create table audits (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users not null,
  file_name   text,
  bias_score  integer,
  severity    text,
  audit_json  jsonb,
  created_at  timestamptz default now()
);

alter table audits enable row level security;

create policy "Users manage own audits"
on audits for all
using (auth.uid() = user_id);
```

**Done when:** Table appears in Supabase Table Editor with RLS badge enabled.

---

## Section 2 — Backend Build (Leapcell + Flask + Gemini)

### 2.1 Dependencies and Config

**Prompt:**
```
In backend/requirements.txt write these exact dependencies:

flask==3.0.3
flask-cors==4.0.1
python-dotenv==1.0.1
pandas==2.2.2
scikit-learn==1.5.0
fairlearn==0.10.0
werkzeug==3.0.3
scipy==1.13.1
numpy==1.26.4
PyJWT==2.8.0
supabase==2.4.2
gunicorn==21.2.0
google-generativeai==0.7.2

In backend/Procfile write:
web: gunicorn app:app

In backend/.env.example write the environment variable names listed in 
Section 0.2 of this PRD with placeholder values.

In backend/config.py load all environment variables from .env using 
python-dotenv. Expose these constants:
- GEMINI_API_KEY, GEMINI_MODEL (default "gemini-1.5-flash"), 
  GEMINI_MAX_TOKENS_UPLOAD=2048, GEMINI_MAX_TOKENS_ANALYZE=4096
- FLASK_SECRET_KEY
- MAX_UPLOAD_SIZE_BYTES (50MB), UPLOAD_FOLDER, CACHE_FOLDER
- SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_JWT_SECRET
- MIN_ROWS_REQUIRED=50, MIN_COLUMNS_REQUIRED=3
- BIAS thresholds: LOW_MAX=30, MODERATE_MAX=60, HIGH_MAX=80
```

---

### 2.2 Utilities

**Prompt:**
```
In backend/utils/ implement these four files:

response_builder.py:
  Two functions:
  - success_response(data: dict, status_code=200) → wraps data in 
    {"status":"success", ...data} and returns Flask jsonify response
  - error_response(code, message, status_code=400, details="") → wraps in 
    {"status":"error","code":code,"message":message} and returns Flask jsonify

cache.py:
  Three functions using the CACHE_FOLDER path from config:
  - save_to_cache(key, data) → writes data as JSON file named {key}.json
  - load_from_cache(key) → reads and returns dict, or None if file missing
  - cache_exists(key) → returns bool

auth_middleware.py:
  One function:
  - get_user_id_from_token() → reads "Authorization: Bearer <token>" header 
    from the current Flask request, decodes it as a Supabase JWT using 
    SUPABASE_JWT_SECRET and HS256 algorithm with verify_aud=False, 
    returns the "sub" claim string (user UUID) or None if missing/invalid/expired
```

---

### 2.3 Gemini Service

**Prompt:**
```
In backend/services/gemini_service.py implement the Gemini API integration.

Rules to follow strictly:
- Use google.generativeai library configured with GEMINI_API_KEY from config
- Temperature 0.2 for consistent JSON output
- ALWAYS check cache before calling Gemini — cache hit means zero API credits spent
- ALWAYS save result to cache after a successful call
- NEVER call Gemini in a loop
- On any failure return a safe fallback dict so the app never crashes
- Strip markdown fences from response before JSON parsing

Implement exactly two functions:

Function 1 — detect_sensitive_columns(session_id, column_profiles):
  Cache key: {session_id}_upload
  Max tokens: GEMINI_MAX_TOKENS_UPLOAD
  
  Prompt to send to Gemini (build this inside the function):
  "You are a data bias expert specializing in Indian socioeconomic contexts.
   Respond with valid JSON ONLY. No explanation, no markdown, no preamble.
   
   Analyze these dataset columns and classify each one.
   
   Sensitive columns in India include: caste, religion, gender, native state,
   home district, mother tongue, language, region, community, surname (caste proxy),
   school board (class proxy), family income bracket, disability, marital status,
   age, pin code (region proxy).
   
   Column profiles:
   {json.dumps(column_profiles)}
   
   Return ONLY this JSON:
   {
     'sensitive': ['col1'],
     'outcome': 'col_name_or_null',
     'features': ['col2'],
     'reasoning': {'col1': 'one sentence why sensitive'}
   }"
   
  Fallback if Gemini fails:
  {"sensitive": [], "outcome": null, "features": [all col names], "reasoning": {}}

Function 2 — analyze_bias(session_id, metrics_results, column_profiles):
  Cache key: {session_id}_analyze
  Max tokens: GEMINI_MAX_TOKENS_ANALYZE
  
  Before sending, build a lean_metrics list from metrics_results containing
  only: column, demographic_parity_diff, disparate_impact_ratio, 
  equalized_odds_diff, selection_rates, most_disadvantaged_group, 
  most_advantaged_group, legally_significant.
  
  Build a lean_profiles list from column_profiles containing only:
  name, dtype, sample_values.
  
  Prompt to send to Gemini (build this inside the function):
  "You are an expert in algorithmic fairness and anti-discrimination law in India.
   Respond with valid JSON ONLY. No explanation, no markdown, no preamble.
   
   For each sensitive column below provide root cause, proxy variables, 
   legal flag under Article 15, two fix suggestions with difficulty, 
   and an overall verdict.
   
   Metric findings: {json.dumps(lean_metrics)}
   Column profiles: {json.dumps(lean_profiles)}
   
   Return ONLY this JSON:
   {
     'findings': [{
       'column': 'col_name',
       'severity': 'HIGH',
       'severity_score': 82,
       'root_cause': 'one sentence',
       'proxy_variables': ['col_x'],
       'legal_flag': true,
       'legal_note': 'one sentence',
       'fix_suggestions': [
         {'action': 'what to do', 'difficulty': 'EASY', 
          'expected_improvement': 'brief description'},
         {'action': 'alternative', 'difficulty': 'MEDIUM',
          'expected_improvement': 'brief description'}
       ]
     }],
     'proxy_alert': {'detected': true, 'details': 'one sentence'},
     'overall_verdict': {
       'bias_score': 72,
       'label': 'HIGH',
       'top_priority_fix': 'col_name'
     }
   }"
   
  Fallback if Gemini fails:
  {"findings": [], "proxy_alert": {"detected": false, "details": ""},
   "overall_verdict": {"bias_score": 0, "label": "UNKNOWN", "top_priority_fix": ""}}
```

---

### 2.4 Dataset, Metrics, DB, Fix Services

**Prompt:**
```
In backend/services/ implement these four files:

dataset_service.py — pure pandas, no AI calls:
  - save_uploaded_file(file) → saves to UPLOAD_FOLDER with uuid4 filename, 
    returns session_id string
  - load_dataset(session_id) → loads CSV from UPLOAD_FOLDER, raises 
    FileNotFoundError if missing
  - get_dataset_info(df) → returns {rows, columns, column_names}
  - get_column_profiles(df) → returns list of {name, dtype, unique_count, 
    sample_values} for each column. dtype is "numeric", "categorical", or 
    "binary". sample_values capped at 5 items.
  - get_preview_rows(df, n=10) → first n rows as list of dicts, NaN → None
  - prepare_for_analysis(df, outcome_column) → drops null outcome rows, 
    encodes outcome as binary int (0/1), returns (cleaned_df, rows_dropped_count)

metrics_service.py — pure Fairlearn, no AI calls:
  - compute_metrics_for_column(df, sensitive_col, outcome_col) → returns dict 
    with: column, demographic_parity_difference, equalized_odds_difference, 
    disparate_impact_ratio (min_rate/max_rate), selection_rates (dict of 
    group→rate), most_advantaged_group, most_disadvantaged_group, 
    legally_significant (bool: disparate_impact_ratio < 0.8)
  - compute_all_metrics(df, sensitive_columns, outcome_col) → calls above 
    for each column, returns list of dicts
  - compute_nyayai_bias_score(metrics_list) → int 0-100 using formula:
    (0.40 * worst_dp_normalized + 0.30 * worst_di_normalized + 
     0.20 * worst_eo_normalized + 0.10 * legal_penalty) * 100
    where legal_penalty = 0.5 if any column has legally_significant=True
  - get_severity_label(score) → "LOW" ≤30, "MODERATE" ≤60, "HIGH" ≤80, 
    "CRITICAL" >80

db_service.py — Supabase operations using supabase-py:
  Initialize Supabase client with SUPABASE_URL and SUPABASE_ANON_KEY.
  - save_audit(user_id, file_name, bias_score, severity, audit_json) → 
    inserts row into "audits" table, returns new row id or None on failure
  - get_user_audits(user_id) → selects id, file_name, bias_score, severity, 
    created_at from audits where user_id matches, ordered by created_at desc
  - get_audit_by_id(audit_id, user_id) → single row with all columns, 
    filtered by both audit_id and user_id for security

fix_service.py — pure pandas, no AI calls:
  - apply_remove(df, column) → drops column, returns new df
  - apply_anonymize(df, column) → replaces values with Group_A, Group_B etc, 
    returns new df
  - save_debiased_csv(df, session_id) → saves to UPLOAD_FOLDER as 
    {session_id}_debiased.csv, returns file path
```

---

### 2.5 Routes and App Entry Point

**Prompt:**
```
In backend/routes/ implement four Blueprint files and in backend/app.py 
implement the Flask entry point.

upload_routes.py — Blueprint name "upload", route POST /upload:
  1. Call get_user_id_from_token() — return 401 UNAUTHORIZED if None
  2. Validate file exists, is .csv, under MAX_UPLOAD_SIZE_BYTES — 
     return appropriate error codes: NO_FILE, INVALID_FILE_TYPE, FILE_TOO_LARGE
  3. save_uploaded_file, load_dataset
  4. Validate min rows and columns — return INSUFFICIENT_DATA, TOO_FEW_COLUMNS
  5. get_column_profiles, detect_sensitive_columns(session_id, profiles)
  6. Return success with: session_id, file_name, dataset_info, preview, 
     column_classifications

analyze_routes.py — Blueprint name "analyze", route POST /analyze:
  Request body: session_id, sensitive_columns, outcome_column, file_name
  1. Auth check — 401 if no user
  2. Validate required fields
  3. load_dataset — 404 SESSION_NOT_FOUND if missing
  4. prepare_for_analysis
  5. compute_all_metrics, compute_nyayai_bias_score, get_severity_label
  6. get_column_profiles, analyze_bias(session_id, metrics, profiles)
  7. Merge metrics + Gemini findings into a findings list where each item has:
     column, severity, severity_score, metrics (the raw metrics dict), 
     root_cause, proxy_variables, legal_flag, legal_note, fix_suggestions
  8. Build full audit_result dict with: audit_id (uuid4), session_id, 
     completed_at (ISO timestamp), dataset_summary, overall_verdict, 
     findings, proxy_alert
  9. save_audit to Supabase, attach db_audit_id to result
  10. save_to_cache("report_{audit_id}", audit_result)
  11. Return success with full audit_result

fix_routes.py — Blueprint name "fix":
  Route POST /fix:
  1. Auth check
  2. Load original audit from cache to get before scores
  3. load_dataset, apply each fix action (REMOVE or ANONYMIZE)
  4. Re-run metrics on fixed dataset, compute new bias score
  5. save_debiased_csv
  6. Return: download_url, comparison {before, after, per_column}
  
  Route GET /report/<session_id>/download/debiased:
  1. Auth check
  2. Stream the debiased CSV file using Flask send_file

history_routes.py — Blueprint name "history":
  Route GET /history: auth check, return get_user_audits(user_id)
  Route GET /report/<audit_id>: auth check, try cache first then 
    get_audit_by_id, return 404 REPORT_NOT_FOUND if missing

app.py:
  create_app() function that:
  - Creates Flask app with FLASK_SECRET_KEY
  - Configures CORS — allow origins: localhost:5500, localhost:3000, 
    and https://nyayai.web.app (update before deploy)
  - Creates uploads/ and cache/ folders if missing
  - Registers all four blueprints
  - Adds GET /health route returning {"status":"healthy","ai":"gemini"}
  - if __name__ == "__main__": runs on port 5000 debug=True
```

**Done when:** Running `python app.py` starts the server and `GET /health` returns `{"status":"healthy"}` in the browser.

---

## Section 3 — Frontend Build (Firebase + Gemini)

### 3.1 Shared JS Files

**Prompt:**
```
In frontend/js/ implement these five files. These are shared across all pages.

config.js:
  A const CONFIG object with these keys:
  API_BASE_URL: "http://localhost:5000"  (placeholder, updated before deploy)
  GEMINI_API_KEY: "your_key_here"
  GEMINI_MODEL: "gemini-1.5-flash"
  GEMINI_MAX_TOKENS: 2048
  SUPABASE_URL: "your_url_here"
  SUPABASE_ANON_KEY: "your_key_here"
  MAX_FILE_SIZE_MB: 50
  CACHE: object with keys REPORT_NARRATIVE, UPLOAD_RESULT, LAST_SESSION, 
         LAST_AUDIT — each a string prefix used as sessionStorage key

cache.js:
  A const Cache object with four methods:
  - save(key, data): JSON.stringify to sessionStorage, silent fail
  - load(key): parse from sessionStorage, return null if missing or error
  - exists(key): boolean check
  - clear(key): removes from sessionStorage

auth.js (ES Module — uses import from Supabase CDN):
  Import createClient from https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm
  Create supabase client using CONFIG values.
  Expose window._supabase = supabase for api.js to read session token.
  Implement these functions (regular functions not arrow, so they are globally 
  accessible from HTML onclick):
  - signUp(email, password, fullName)
  - signIn(email, password)  
  - signInWithGoogle() — redirectTo: window.location.origin + "/upload.html"
  - logout() — signOut then redirect to index.html
  - getCurrentUser() — returns user or null
  - getSessionToken() — returns access_token string or null
  - requireAuth() — calls getCurrentUser, if null redirects to login.html, 
    else returns user
  - populateUserInfo() — sets text of #nav-user-name element if it exists

api.js:
  A const API object. All fetch() calls to Flask backend live here only.
  Internal helper _headers(isFormData=false) reads token from 
  window._supabase session and returns headers object with Content-Type 
  (skip for FormData) and Authorization Bearer token.
  Methods:
  - uploadFile(file) — POST /upload with FormData
  - analyzeDataset(sessionId, sensitiveColumns, outcomeColumn, fileName) — 
    POST /analyze
  - fixDataset(sessionId, auditId, fixActions) — POST /fix
  - getReport(auditId) — GET /report/:auditId
  - getHistory() — GET /history
  - debiasedDownloadURL(sessionId) — returns URL string only, no fetch

gemini.js:
  A const Gemini object with one method:
  generateReportNarrative(auditData):
    1. Check Cache for CACHE.REPORT_NARRATIVE + auditData.audit_id — return 
       cached value if exists (zero API credits)
    2. Build a lean payload from auditData containing only:
       overall_verdict and findings array where each finding has only:
       column, severity, severity_score, most_disadvantaged_group, 
       most_advantaged_group, disparate_impact_ratio, selection_rates, 
       legal_flag, root_cause, fix_suggestions
    3. Build this prompt:
       "You are writing a bias audit report for an Indian organization.
        Audience is a non-technical HR manager or NGO worker.
        Write clearly — no jargon, no statistics terms.
        Respond with valid JSON ONLY. No preamble, no markdown fences.
        
        Audit data: {JSON.stringify(payload)}
        
        Return ONLY:
        {
          executive_summary: '3-4 sentences: bias level, biggest problem, 
                              one recommendation. Direct and specific.',
          story: '3-5 paragraphs separated by double newline. 
                  Journalist style. Specific groups and numbers.',
          card_explanations: {column_name: '2 plain sentences'},
          fix_narratives: {column_name: '2 plain sentences'}
        }"
    4. POST to Gemini REST API:
       https://generativelanguage.googleapis.com/v1beta/models/
       {CONFIG.GEMINI_MODEL}:generateContent?key={CONFIG.GEMINI_API_KEY}
       with body {contents:[{parts:[{text:prompt}]}], 
                  generationConfig:{maxOutputTokens:CONFIG.GEMINI_MAX_TOKENS, 
                                    temperature:0.3}}
    5. Parse response: candidates[0].content.parts[0].text
    6. Strip markdown fences, JSON.parse
    7. Cache.save with narrative key
    8. Return narrative
    9. On any error return fallback:
       {executive_summary: "Narrative unavailable. Review scores below.",
        story: "", card_explanations: {}, fix_narratives: {}}
```

---

### 3.2 CSS Design System

**Prompt:**
```
In frontend/css/ implement the design system.

variables.css — CSS custom properties only:
  Colors:
    --color-primary: #1A237E (deep indigo)
    --color-accent: #FF6F00 (amber)
    --color-success: #2E7D32
    --color-warning: #F9A825
    --color-danger: #C62828
    --color-bg: #F8F9FA
    --color-surface: #FFFFFF
    --color-text: #1C1C1C
    --color-text-muted: #6B7280
    --color-border: #E5E7EB
    --color-primary-light: #E8EAF6

  Typography:
    --font-main: 'Inter', sans-serif
    Font size scale from --text-xs (0.75rem) to --text-5xl (3rem)

  Spacing scale: --space-1 through --space-24

  Layout: --container-max: 1200px, --sidebar-width: 240px, 
          --navbar-height: 64px

  Border radius: --radius-sm, --radius-md, --radius-lg, --radius-full
  Shadows: --shadow-sm, --shadow-md, --shadow-lg

base.css — imports variables.css plus:
  Reset (box-sizing, margin, padding), body styles, .container class,
  utility classes: .btn-primary (amber filled), .btn-secondary (outlined),
  .badge (pill label), .card (white rounded shadow), .spinner (CSS animation),
  .error-banner (red), .success-banner (green), .text-muted, .skeleton-line

navbar.css — fixed top navbar with glass effect:
  .navbar: fixed, full width, glass backdrop-filter, z-index high
  .navbar__inner: flex, space-between, container max-width
  .navbar__logo: NyayAI text logo styling
  .navbar__links: horizontal flex, gap, hidden on mobile
  .navbar__actions: flex gap, hidden on mobile
  .navbar__hamburger: visible only on mobile
  .navbar__mobile-drawer: full width dropdown, hidden by default, 
    shown when .open class added

landing.css — index.html specific:
  .hero: full viewport height, split two-column layout
  .hero__headline: large bold text, indigo color
  .hero__tag: small pill badge
  .hero__trust-badges: small flex row of checkmarks
  .problem section: dark indigo background
  .problem__cards: three-column grid, glassmorphism cards with hover glow
  .steps: three-column with connecting line between steps
  .features__grid: 2x3 grid of cards
  .faq__item: accordion with border, question/answer toggle

auth.css — login and signup pages:
  .auth-page: centered vertically and horizontally, light bg
  .auth-card: white card, max-width 420px, rounded, shadow
  .form-group: label + input stacked with gap
  .password-wrapper: relative with show/hide button
  .password-strength-bar + .strength-fill: animated width bar
  .btn-google: white button with border and Google icon
  .auth-divider: horizontal rule with text

upload.css:
  .wizard-progress: three-step indicator bar
  .wizard-step: step pill, active (indigo), completed (green), inactive (grey)
  .upload-zone: large dashed border box, centered, hover state changes border color
  .upload-zone.drag-over: highlighted state
  .configure-layout: two-column on desktop, single on mobile
  .toggle-item: flex row with column name and toggle switch
  .toggle-switch: custom CSS toggle

report.css:
  .verdict-banner: full-width colored banner with score and summary
  .verdict-banner--low: green, --moderate: yellow, --high: orange, 
    --critical: red
  .finding-card: white card with header, chart canvas, explanation, 
    legal flag, proxy alert, expandable metric details
  .fix-item: checkbox card with action details
  .legal-flag: amber background pill
  .proxy-alert: light blue background pill

dashboard.css:
  .app-layout: sidebar + main content two-column
  .sidebar: fixed left, indigo background, nav links
  .sidebar__link: white text, hover background, active state
  .stats-row: four equal cards in a row
  .audit-table: full width table with hover rows
```

---

### 3.3 HTML Pages

**Prompt:**
```
Build all frontend HTML pages for NyayAI. Each page must:
- Link config.js, cache.js, auth.js in <head> as type="module" where needed
- Use the CSS files from /css/ folder
- Use Chart.js from CDN for any charts
- Be fully mobile responsive

index.html — Landing page:
  Navbar (see navbar.css for structure) with links: Home, How It Works, 
  Features, About Us, Learn More. Right side: Log In ghost button → login.html, 
  Get Started Free amber button → signup.html. Hamburger for mobile.
  
  Hero section: full viewport height, two columns.
  Left: 🇮🇳 Built for India pill, H1 "Is Your AI Treating Everyone Fairly?",
  subtext about auditing Indian datasets, two CTA buttons (Audit Your Dataset 
  → signup.html, See How It Works → scroll), three trust badges.
  Right: animated CSS sphere or geometric shape in amber/indigo gradients.
  
  Problem section: dark indigo bg, headline "Bias is Already in Your Data. 
  You Just Can't See It.", three glassmorphism cards: Hiring, Lending, Admissions 
  with real Indian examples.
  
  How It Works: three numbered steps with connecting line:
  01 Upload Dataset → 02 NyayAI Audits It (Gemini) → 03 Get Your Report.
  
  Features: 2x3 grid of six cards:
  🇮🇳 Indian Context Aware, 🤖 Powered by Gemini, 📝 Plain Language Reports,
  🔧 Actionable Fix Suggestions, 📊 Visual Bias Dashboard, 📄 PDF Export.
  
  About Us: split layout, left text with three paragraphs about Indian motivation,
  mission statement box, right side team card.
  
  Learn More teaser: amber gradient banner with CTA to learn.html.
  
  FAQ: accordion with these eight questions:
  1. What datasets can I upload?
  2. Is my data stored? (No, deleted after 24 hours)
  3. Do I need ML knowledge? (No)
  4. What Indian attributes does NyayAI detect?
  5. Is it free?
  6. How is it different from IBM AIF360?
  7. What is disparate impact?
  8. Can I audit a trained model?
  
  Footer: four columns — Brand+socials, Product links, Resources, Company.
  Bottom bar: © 2026 NyayAI. Built with ❤️ in India.

login.html:
  Centered auth card. Logo. "Welcome Back" heading.
  Google OAuth button calling signInWithGoogle().
  Divider. Email + password inputs. Forgot password link.
  Error banner div (hidden by default).
  Log In button with loading spinner state — on click calls signIn(), 
  on success redirects to upload.html, on error shows error banner.
  Link to signup.html.

signup.html:
  Centered auth card. Logo. "Create Your Account" heading. Subtext: free for 
  students and NGOs.
  Google button calling signInWithGoogle().
  Divider. Full name, email, organization/college, password with strength bar,
  confirm password, terms checkbox.
  Error banner div (hidden).
  Create Account button with spinner — calls signUp(), on success hides form 
  and shows success state (check email message + Go to Login button), 
  on error shows error banner.
  Password strength bar updates live: weak red → fair yellow → strong green.

upload.html:
  requireAuth() called at top before anything renders.
  Navbar with user name from populateUserInfo().
  Three-step wizard progress bar.
  
  Step 1 panel: large drag-and-drop upload zone. Shows file name and size 
  after selection. Two sample dataset download links (hr_india.csv, 
  loan_india.csv). Continue button (disabled until file selected) with 
  spinner loading state. Calls API.uploadFile then shows step 2.
  
  Step 2 panel: two columns.
  Left: dataset preview table with column type badges (Sensitive/Outcome/Feature).
  Right: confirmed sensitive columns list with toggle switches (pre-checked 
  from Gemini detection), manual add-column dropdown, outcome column select, 
  Run Bias Audit button with spinner. On click calls API.analyzeDataset, 
  on success redirects to report.html?audit_id=...

report.html:
  requireAuth() at top.
  Sticky top bar: report filename, date, Download PDF button, New Audit button.
  
  Section A — Verdict Banner: overall bias score as Chart.js doughnut gauge 
  (half circle, 0-100), severity label badge, loading skeleton then 
  Gemini executive summary text injected after Gemini call.
  
  Section B — Story: heading "What Your Data Is Saying", loading skeleton 
  then Gemini story paragraphs injected.
  
  Section C — Findings Grid: one card per sensitive column. Each card has 
  column name, severity badge, Chart.js horizontal bar chart of group selection 
  rates (most disadvantaged group highlighted in red), loading skeleton then 
  Gemini card explanation injected, legal flag pill if applicable, proxy 
  variables pill if applicable, expandable raw metrics section.
  
  Section D — Fix Recommendations: checkbox list of fix suggestions. Each has 
  column name, difficulty badge (EASY/MEDIUM/HARD), action text, expected 
  improvement text, Gemini fix narrative. Apply Selected Fixes button calls 
  API.fixDataset, shows before/after comparison.
  
  Section E — Download: Download PDF button (uses window.print or jsPDF), 
  Download Debiased Dataset link.
  
  On page load: fetch audit, render charts, then ONE Gemini call, inject narrative.

dashboard.html:
  requireAuth() at top.
  Sidebar navigation: NyayAI logo, links (Dashboard, New Audit → upload.html,
  My Reports, Learn → learn.html, Log Out calling logout()), 
  user name at bottom from getCurrentUser().
  
  Main area: 
  Top bar with "Dashboard" title and "+ New Audit" button.
  Stats row: four cards showing Total Audits, High Bias Found, Last Audit Date, 
  Datasets Fixed — populated from API.getHistory().
  
  Recent Audits table: columns File Name, Bias Score (colored badge), 
  Severity, Date, Action (View Report button → report.html?audit_id=...).
  Empty state if no audits: illustration + "No audits yet" text + Start Audit button.
  
  Populate all data from API.getHistory() on page load.

learn.html:
  Public page — no auth required.
  Navbar same as landing.
  Clean article layout, centered narrow column.
  Four sections with headings, short paragraphs, and key takeaway boxes:
  1. What is Algorithmic Bias?
  2. Why India is Different (caste, religion, region axes)
  3. How Bias Enters Your Data (4 types)
  4. How to Measure Bias (3 metrics in plain language)
  Bottom CTA banner → signup.html.
```

**Done when:** Opening `index.html` in browser shows a full styled landing page. Opening `login.html` shows the auth card. All internal links work.

---

## Section 4 — Leapcell Deployment (Backend)

### 4.1 Deploy Steps

1. Push `backend/` folder to a GitHub repository
2. Go to `leapcell.io` → New Service → Connect GitHub
3. Select your repo and the `backend/` folder as root
4. Runtime: Python
5. Build command: `pip install -r requirements.txt`
6. Start command: `gunicorn app:app`
7. Add all environment variables from `.env` in the Leapcell dashboard
8. Deploy → copy the provided URL (e.g. `https://nyayai-xxx.leapcell.dev`)

### 4.2 Update Frontend Config After Deploy

**Prompt:**
```
In frontend/js/config.js update API_BASE_URL from "http://localhost:5000" 
to "https://your-leapcell-url.leapcell.dev" (replace with real URL).

In backend/app.py update the CORS origins list to include the real 
Leapcell URL and Firebase URL.
```

**Done when:** `GET https://your-leapcell-url.leapcell.dev/health` returns `{"status":"healthy"}`.

---

## Section 5 — Firebase Deployment (Frontend)

### 5.1 Firebase Config Files

**Prompt:**
```
In frontend/ create these two Firebase config files:

firebase.json:
{
  "hosting": {
    "public": ".",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [{"source": "**", "destination": "/index.html"}]
  }
}

.firebaserc:
{
  "projects": {
    "default": "your-firebase-project-id"
  }
}
Replace "your-firebase-project-id" with the actual Firebase project ID.
```

### 5.2 Deploy Steps

```bash
npm install -g firebase-tools
firebase login
cd frontend/
firebase init hosting
firebase deploy
```

URL will be: `https://nyayai.web.app`

**Done when:** Landing page loads at the Firebase URL with all styles intact.

---

## Section 6 — End-to-End Test Checklist

Run through this after full deployment. Every item must pass before submitting.

### Auth
- [ ] Sign up with email → confirmation email arrives in inbox
- [ ] Click confirmation link → account activated
- [ ] Log in with email/password → lands on upload.html
- [ ] Log in with Google → lands on upload.html
- [ ] Visit upload.html without logging in → redirected to login.html
- [ ] Log out → session cleared, redirected to index.html

### Upload + Analysis
- [ ] Upload `hr_india.csv` sample → preview table shows with column badges
- [ ] Gemini correctly detects at least one sensitive column
- [ ] Step 2 shows sensitive toggles and outcome dropdown
- [ ] Click Run Audit → loading state shows
- [ ] Redirected to report.html with ?audit_id in URL

### Report Page
- [ ] Verdict banner shows bias score and severity label
- [ ] Chart.js doughnut gauge renders
- [ ] Gemini executive summary appears (not skeleton)
- [ ] Gemini story paragraphs appear
- [ ] Finding cards show bar charts with group rates
- [ ] Gemini card explanations appear
- [ ] Fix section shows with difficulty badges
- [ ] Refresh page → Gemini does NOT re-call (loads from cache)

### Database
- [ ] After analysis, row appears in Supabase audits table
- [ ] Dashboard shows audit in history table
- [ ] View Report button on dashboard opens correct report

### Fix + Download
- [ ] Check a fix action → Apply Fixes → before/after comparison shows
- [ ] Download Debiased Dataset → CSV file downloads

### Deployment
- [ ] Backend health check returns 200 on Leapcell URL
- [ ] Frontend loads correctly on Firebase URL
- [ ] CORS not blocking — no browser console errors on API calls

---

## Section 7 — Demo Video Script

Follow this sequence when recording. Total target: under 3 minutes.

| Timestamp | Action |
|-----------|--------|
| 0:00–0:05 | Show landing page hero — read headline aloud |
| 0:05–0:15 | Scroll through problem cards and features briefly |
| 0:15–0:25 | Click Get Started → signup → show Google login |
| 0:25–0:40 | Upload hr_india.csv — show column detection step |
| 0:40–0:55 | Show Step 2 configure — point out Gemini detected native_state |
| 0:55–1:15 | Click Run Audit — show loading → report page loads |
| 1:15–1:35 | Read out the Gemini executive summary sentence |
| 1:35–1:50 | Show the bar chart — highlight disadvantaged group in red |
| 1:50–2:05 | Show fix recommendations section |
| 2:05–2:20 | Apply a fix — show before/after bias score comparison |
| 2:20–2:30 | Show audit row in dashboard history |
| 2:30–2:45 | Back to landing — end on the tagline "Justice through Data" |

---

## Section 8 — Phase 1 Submission Checklist

- [ ] Registration on hack2skill platform completed
- [ ] GitHub repo is public with clean README.md
- [ ] Live prototype link works (Firebase URL)
- [ ] Project deck uploaded (7 slides max)
- [ ] Demo video link ready (Loom or YouTube unlisted, under 3 min)
- [ ] Problem statement write-up (1 paragraph about Indian bias context)
- [ ] Solution overview write-up (1 paragraph about NyayAI)

---

*End of NyayAI Master Deployment PRD v3.0*
