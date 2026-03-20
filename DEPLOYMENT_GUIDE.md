# NyayAI — Deployment Guide

> **Stack**: Firebase (Frontend) · Leapcell (Backend) · Supabase (DB + Auth) · Gemini API (AI)

---

## Prerequisites

| Tool | Install |
|------|---------|
| Node.js 18+ | https://nodejs.org |
| Python 3.10+ | https://python.org |
| Firebase CLI | `npm install -g firebase-tools` |
| Git | https://git-scm.com |

---

## 1. Supabase Setup (Database + Auth)

### 1.1 Create Project
1. Go to [supabase.com](https://supabase.com) → **New Project**
2. Choose a name (e.g. `nyayai-prod`), set a DB password, pick region `ap-south-1` (Mumbai)
3. Wait for the project to provision (~2 min)

### 1.2 Create the `audits` Table
Go to **SQL Editor** and run:

```sql
CREATE TABLE audits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  file_name TEXT NOT NULL,
  bias_score INTEGER DEFAULT 0,
  severity TEXT DEFAULT 'UNKNOWN',
  audit_json JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Row Level Security: users can only see their own audits
ALTER TABLE audits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own audits"
  ON audits FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own audits"
  ON audits FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

### 1.3 Enable Google OAuth
1. Go to **Authentication → Providers → Google**
2. Enable it and paste your **Google OAuth Client ID** and **Client Secret**
   - Get these from [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
   - Add redirect URL: `https://<YOUR_PROJECT>.supabase.co/auth/v1/callback`

### 1.4 Collect Credentials
From **Settings → API**, copy:

| Value | Where it goes |
|-------|--------------|
| **Project URL** | `SUPABASE_URL` in backend `.env` + frontend `config.js` |
| **anon public key** | `SUPABASE_ANON_KEY` in backend `.env` + frontend `config.js` |
| **JWT Secret** (under Settings → API → JWT Settings) | `SUPABASE_JWT_SECRET` in backend `.env` only |

---

## 2. Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Click **Create API Key** → copy the key
3. This goes into the backend `.env` as `GOOGLE_API_KEY`

> ⚠️ **Never put this key in frontend code.** The backend proxies all AI calls.

---

## 3. Backend Deployment (Leapcell)

### 3.1 Prepare Backend

In your `nyayai-backend/` folder, ensure these files exist:

**`Procfile`** (already exists):
```
web: gunicorn app:app
```

**`app.py`** — change the bottom to work with Gunicorn:
```python
# The create_app() function is already defined
app = create_app()

if __name__ == "__main__":
    app.run(debug=True, port=5000)
```

> Gunicorn will call `app:app` which references the module-level `app` variable. You need to add `app = create_app()` at the module level (outside the `if __name__` block).

### 3.2 Update `app.py` for Production

Add your actual Firebase hosting domain to the CORS origins list:

```python
CORS(app, origins=[
    "http://localhost:8002",
    "https://nyayai.web.app",        # ← Your Firebase domain
    "https://nyayai.firebaseapp.com", # ← Alt Firebase domain
])
```

### 3.3 Deploy to Leapcell

1. Go to [leapcell.io](https://leapcell.io) → Create a new **Web Service**
2. Connect your GitHub repo or upload the `nyayai-backend/` folder
3. Set:
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn app:app --bind 0.0.0.0:$PORT`
   - **Root Directory**: `nyayai-backend` (if deploying from monorepo)

4. Add **Environment Variables**:

| Key | Value |
|-----|-------|
| `GOOGLE_API_KEY` | Your Gemini API key |
| `SUPABASE_URL` | `https://xxxxx.supabase.co` |
| `SUPABASE_ANON_KEY` | Your anon key |
| `SUPABASE_JWT_SECRET` | Your JWT secret |
| `FLASK_ENV` | `production` |
| `FLASK_SECRET_KEY` | A random 32-character string |
| `UPLOAD_FOLDER` | `./uploads` |
| `CACHE_FOLDER` | `./cache` |

5. Deploy → note the production URL (e.g. `https://nyayai-backend.leapcell.dev`)

### 3.4 Important: Module-Level App

If `app.py` doesn't already have `app = create_app()` at module level, add it:

```python
# At the END of app.py, BEFORE the if __name__ block:
app = create_app()

if __name__ == "__main__":
    app.run(debug=True, port=5000)
```

This is required because Gunicorn imports `app` as a module-level variable.

---

## 4. Frontend Deployment (Firebase Hosting)

### 4.1 Update `config.js` for Production

Edit `nyayai-frontend/js/config.js`:

```javascript
const CONFIG = {
  // ← Change to your Leapcell backend URL
  API_BASE_URL: "https://nyayai-backend.leapcell.dev",

  // ← Change to your Firebase hosting URL (or remove if hosting auth on same domain)
  AUTH_LOGIN_URL: "https://nyayai.web.app/login.html",
  AUTH_SIGNUP_URL: "https://nyayai.web.app/signup.html",

  // ← Paste your real Supabase credentials
  SUPABASE_URL: "https://xxxxx.supabase.co",
  SUPABASE_ANON_KEY: "eyJ...",

  GEMINI_MODEL: "gemini-1.5-flash",
  GEMINI_MAX_TOKENS: 2048,
  MAX_FILE_SIZE_MB: 50,
  ACCEPTED_FILE_TYPES: [".csv"],
  CACHE_KEYS: {
    UPLOAD_RESULT: "nyayai_upload_",
    REPORT_NARRATIVE: "nyayai_narrative_",
    LAST_AUDIT_ID: "nyayai_last_audit"
  }
};
```

### 4.2 Firebase Init

```bash
cd nyayai-frontend

# Login to Firebase
firebase login

# Initialize (select Hosting, choose your project)
firebase init hosting
```

When prompted:
- **Public directory**: `.` (current directory — the HTML files are at the root)
- **Single-page app**: `No`
- **Overwrite index.html**: `No`

This creates `firebase.json` (already exists in repo).

### 4.3 Verify `firebase.json`

```json
{
  "hosting": {
    "public": ".",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "headers": [
      {
        "source": "**/*.@(js|css|html)",
        "headers": [
          { "key": "Cache-Control", "value": "max-age=3600" }
        ]
      }
    ]
  }
}
```

### 4.4 Deploy

```bash
firebase deploy --only hosting
```

Your site will be live at:
- `https://nyayai.web.app`
- `https://nyayai.firebaseapp.com`

---

## 5. Post-Deployment Checklist

### 5.1 Update Supabase Redirect URLs
In **Supabase → Authentication → URL Configuration**:
- **Site URL**: `https://nyayai.web.app`
- **Redirect URLs**: Add `https://nyayai.web.app/upload.html`

### 5.2 Update Google OAuth Redirect
In **Google Cloud Console → Credentials → OAuth 2.0 Client**:
- Add **Authorized redirect URI**: `https://<your-project>.supabase.co/auth/v1/callback`
- Add **Authorized JavaScript origin**: `https://nyayai.web.app`

### 5.3 Verify CORS
Make sure your backend's `app.py` CORS includes the Firebase domain:
```python
CORS(app, origins=[
    "https://nyayai.web.app",
    "https://nyayai.firebaseapp.com",
])
```

### 5.4 Smoke Test

| Test | URL | Expected |
|------|-----|----------|
| Landing page loads | `https://nyayai.web.app` | Hero + animated terminal |
| Health check | `https://your-backend.leapcell.dev/health` | `{"status": "healthy"}` |
| Login with Google | Click "Log In" on landing | Redirects to Google → back to upload |
| Upload CSV | Upload `sample_bias_test.csv` | Gets session_id + column preview |
| Run Audit | Configure + click "Run Bias Audit" | Report page with findings |

---

## 6. Architecture Diagram

```
┌─────────────────────────┐
│     Firebase Hosting     │
│   (nyayai.web.app)       │
│                          │
│  index.html              │
│  upload.html             │
│  report.html             │
│  dashboard.html          │
│  learn.html              │
│  js/config.js ──────┐    │
│  js/api.js           │   │
│  js/auth.js          │   │
└──────────┬───────────┘   │
           │               │
  API calls│  (fetch)      │ Supabase JS SDK
           │               │  (auth.getUser,
           ▼               │   signInWithOAuth)
┌─────────────────────┐    │
│  Leapcell Backend   │    │
│  (Flask + Gunicorn)  │    ▼
│                      │  ┌────────────────┐
│  /upload   POST      │  │   Supabase     │
│  /analyze  POST      │  │                │
│  /fix      POST      │  │  Auth (JWT)    │
│  /report   GET/POST  │  │  PostgreSQL    │
│  /history  GET       │  │  (audits table)│
│  /health   GET       │  └────────────────┘
│                      │
│  Services:           │
│  ├─ gemini_service   │──→ Google Gemini API
│  ├─ metrics_service  │    (gemini-1.5-flash)
│  ├─ dataset_service  │
│  ├─ fix_service      │
│  └─ db_service       │──→ Supabase DB
└──────────────────────┘
```

---

## 7. Environment Variable Summary

### Backend (`.env` on Leapcell)

| Variable | Source |
|----------|--------|
| `GOOGLE_API_KEY` | Google AI Studio |
| `SUPABASE_URL` | Supabase → Settings → API |
| `SUPABASE_ANON_KEY` | Supabase → Settings → API |
| `SUPABASE_JWT_SECRET` | Supabase → Settings → API → JWT Settings |
| `FLASK_SECRET_KEY` | Generate: `python -c "import secrets; print(secrets.token_hex(32))"` |
| `FLASK_ENV` | `production` |

### Frontend (`config.js`)

| Variable | Value |
|----------|-------|
| `API_BASE_URL` | Your Leapcell backend URL |
| `AUTH_LOGIN_URL` | `https://nyayai.web.app/login.html` |
| `AUTH_SIGNUP_URL` | `https://nyayai.web.app/signup.html` |
| `SUPABASE_URL` | Same as backend |
| `SUPABASE_ANON_KEY` | Same as backend (anon key is safe for client) |

---

## 8. Troubleshooting

| Issue | Fix |
|-------|-----|
| CORS error in console | Add your Firebase domain to `app.py` CORS origins |
| `401 Unauthorized` on API calls | Check Supabase JWT Secret in backend `.env` |
| Google login redirect fails | Verify redirect URL in Supabase Auth settings |
| `ModuleNotFoundError` on Leapcell | Ensure `requirements.txt` is in the root of the deployed directory |
| Gemini narrative returns empty | Verify `GOOGLE_API_KEY` is set and has quota |
| `gunicorn: app not found` | Add `app = create_app()` at module level in `app.py` |
