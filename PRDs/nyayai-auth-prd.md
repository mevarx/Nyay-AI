# NyayAI — Authentication PRD
**Module:** Auth System — Google OAuth + Email/Password
**Version:** 1.0 (Phase 1 MVP)
**Stack:** Supabase Auth, HTML/CSS/JS (Frontend), Flask + PyJWT (Backend)
**Last Updated:** March 2026

---

## 1. Overview

NyayAI's auth system uses **Supabase Authentication** as the sole provider.
It handles Google OAuth and email/password login with zero custom auth infrastructure.
The frontend talks directly to Supabase for login/signup.
The backend verifies the Supabase JWT token on every protected API call.

---

## 2. Auth Flow Diagram

```
Landing Page
     ↓
"Get Started Free" CTA
     ↓
signup.html
     ↓
┌──────────────────────────────┐
│  Option A: Google OAuth      │  → Supabase redirects to Google
│  Option B: Email + Password  │  → Supabase creates account
└──────────────────────────────┘
     ↓
Supabase sends confirmation email (Option B only)
     ↓
User confirms email → login.html
     ↓
Supabase returns session token (JWT)
     ↓
Token stored in browser (Supabase handles this automatically)
     ↓
upload.html loads → requireAuth() checks token
     ↓
If no token → redirect to login.html
If token valid → user can use the app
     ↓
Every API call to Flask → token sent in Authorization header
     ↓
Flask verifies token → extracts user_id → saves audit to Supabase DB
```

---

## 3. Supabase Project Setup

Do this once before writing any code.

### Step 1 — Create Supabase Project
- Go to `supabase.com` → New Project
- Name it `nyayai`
- Choose region: `ap-south-1` (closest to India)
- Save the **Project URL** and **Anon Key** — you will need both

### Step 2 — Enable Google OAuth Provider
- In Supabase dashboard → Authentication → Providers → Google → Enable
- You need a Google OAuth Client ID and Secret:
  - Go to `console.cloud.google.com`
  - APIs & Services → Credentials → Create OAuth 2.0 Client ID
  - Application type: **Web application**
  - Authorized redirect URI: `https://yourproject.supabase.co/auth/v1/callback`
  - Copy Client ID and Client Secret into Supabase Google provider settings
  - Save

### Step 3 — Enable Email Provider
- Authentication → Providers → Email → already enabled by default
- Enable "Confirm email" — users must verify email before logging in
- No extra config needed

### Step 4 — Create Audits Table
- Go to Supabase → Table Editor → New Table
- Table name: `audits`
- Columns:

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid | gen_random_uuid() | Primary key |
| user_id | uuid | — | References auth.users |
| file_name | text | — | Original CSV filename |
| bias_score | integer | — | NyayAI composite score 0-100 |
| severity | text | — | LOW / MODERATE / HIGH / CRITICAL |
| audit_json | jsonb | — | Full audit result stored here |
| created_at | timestamptz | now() | Auto set |

- Enable Row Level Security (RLS) on this table
- Add RLS policy: Users can only read/write their own rows:
  ```sql
  create policy "Users can manage own audits"
  on audits
  for all
  using (auth.uid() = user_id);
  ```

### Step 5 — Add to Frontend Config
Add to `js/config.js`:
```javascript
SUPABASE_URL: "https://yourproject.supabase.co",
SUPABASE_ANON_KEY: "your_anon_key_here"
```

### Step 6 — Add to Backend `.env`
```
SUPABASE_URL=https://yourproject.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_JWT_SECRET=your_jwt_secret_here
```
JWT secret is found in Supabase → Settings → API → JWT Secret.

---

## 4. Files to Create — Frontend

---

### File 1: `js/auth.js`

**Purpose:** All Supabase auth calls. One file only — never write auth logic elsewhere.

**Add Supabase CDN to every HTML page that uses auth (in `<head>`):**
```html
<script type="module" src="js/auth.js"></script>
```

**Load Supabase client at top of `auth.js`:**
```javascript
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY)
```

**Functions to implement:**

---

#### `signUp(email, password, fullName)`
- Calls `supabase.auth.signUp()`
- Passes `full_name` in options.data (stored in user metadata)
- Returns `{ success: true, data }` or `{ success: false, message: error.message }`
- On success: do NOT redirect — show the "check your email" success state instead
- Supabase automatically sends a confirmation email

```javascript
async function signUp(email, password, fullName) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName }
    }
  })
  if (error) return { success: false, message: error.message }
  return { success: true, data }
}
```

---

#### `signIn(email, password)`
- Calls `supabase.auth.signInWithPassword()`
- Returns `{ success: true, data }` or `{ success: false, message: error.message }`
- On success: caller redirects to `upload.html`

```javascript
async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })
  if (error) return { success: false, message: error.message }
  return { success: true, data }
}
```

---

#### `signInWithGoogle()`
- Calls `supabase.auth.signInWithOAuth()` with Google provider
- Sets `redirectTo` to `upload.html` so user lands on app after Google login
- No return value needed — Supabase handles the redirect automatically

```javascript
async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin + '/upload.html'
    }
  })
  if (error) alert('Google login failed. Please try again.')
}
```

---

#### `logout()`
- Calls `supabase.auth.signOut()`
- Redirects to `index.html`

```javascript
async function logout() {
  await supabase.auth.signOut()
  window.location.href = 'index.html'
}
```

---

#### `getCurrentUser()`
- Calls `supabase.auth.getUser()`
- Returns user object or `null` if not logged in
- Used by `requireAuth()` and navbar display

```javascript
async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}
```

---

#### `getSessionToken()`
- Returns the JWT access token from the current session
- Used by `js/api.js` to attach token to every backend request

```javascript
async function getSessionToken() {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token || null
}
```

---

#### `requireAuth()`
- Checks if user is logged in
- If not → redirects to `login.html` immediately
- If yes → returns user object
- Call this at the top of every protected page: `upload.html`, `report.html`, `dashboard.html`

```javascript
async function requireAuth() {
  const user = await getCurrentUser()
  if (!user) {
    window.location.href = 'login.html'
    return null
  }
  return user
}
```

---

### File 2: Updates to `login.html`

**Replace the mock login button logic with:**

```html
<!-- In <head> -->
<script src="js/config.js"></script>
<script type="module" src="js/auth.js"></script>

<!-- Google OAuth button -->
<button class="btn-google btn-full" onclick="signInWithGoogle()">
  <img src="assets/google-icon.svg" alt="Google"> Continue with Google
</button>

<div class="auth-divider">— or —</div>

<!-- Email/password form -->
<div class="form-group">
  <label for="login-email">Email Address</label>
  <input type="email" id="login-email" placeholder="you@example.com" autocomplete="email">
  <span class="field-error" id="email-error"></span>
</div>

<div class="form-group">
  <label for="login-password">Password</label>
  <div class="password-wrapper">
    <input type="password" id="login-password" placeholder="••••••••" autocomplete="current-password">
    <button type="button" class="show-hide-btn" onclick="togglePasswordVisibility('login-password', this)">
      Show
    </button>
  </div>
  <span class="field-error" id="password-error"></span>
</div>

<a href="#" class="forgot-password">Forgot Password?</a>

<div id="login-error-banner" class="error-banner" style="display:none"></div>

<button class="btn-primary btn-full" onclick="handleLogin()">
  <span id="login-btn-text">Log In</span>
  <span id="login-spinner" class="spinner" style="display:none"></span>
</button>

<script>
async function handleLogin() {
  // Clear previous errors
  document.getElementById('login-error-banner').style.display = 'none'

  const email = document.getElementById('login-email').value.trim()
  const password = document.getElementById('login-password').value

  // Validate
  if (!email || !password) {
    showLoginError('Please fill in all fields.')
    return
  }

  // Show loading state
  setLoginLoading(true)

  const result = await signIn(email, password)

  if (!result.success) {
    setLoginLoading(false)
    showLoginError(result.message)
    return
  }

  // Success — redirect
  window.location.href = 'upload.html'
}

function showLoginError(message) {
  const banner = document.getElementById('login-error-banner')
  banner.textContent = message
  banner.style.display = 'block'
}

function setLoginLoading(isLoading) {
  document.getElementById('login-btn-text').style.display = isLoading ? 'none' : 'inline'
  document.getElementById('login-spinner').style.display = isLoading ? 'inline-block' : 'none'
}

function togglePasswordVisibility(inputId, btn) {
  const input = document.getElementById(inputId)
  if (input.type === 'password') {
    input.type = 'text'
    btn.textContent = 'Hide'
  } else {
    input.type = 'password'
    btn.textContent = 'Show'
  }
}
</script>
```

---

### File 3: Updates to `signup.html`

**Replace the mock signup button logic with:**

```html
<!-- Form — hidden after successful signup -->
<div id="signup-form">

  <div class="form-group">
    <label for="signup-name">Full Name</label>
    <input type="text" id="signup-name" placeholder="Your full name">
  </div>

  <div class="form-group">
    <label for="signup-email">Email Address</label>
    <input type="email" id="signup-email" placeholder="you@college.edu">
  </div>

  <div class="form-group">
    <label for="signup-org">Organization / College Name</label>
    <input type="text" id="signup-org" placeholder="Your college or organization">
  </div>

  <div class="form-group">
    <label for="signup-password">Password</label>
    <div class="password-wrapper">
      <input type="password" id="signup-password" placeholder="Min 6 characters"
             oninput="updatePasswordStrength(this.value)">
      <button type="button" class="show-hide-btn"
              onclick="togglePasswordVisibility('signup-password', this)">Show</button>
    </div>
    <!-- Password strength bar -->
    <div class="password-strength-bar">
      <div id="strength-fill" class="strength-fill"></div>
    </div>
    <span id="strength-label" class="strength-label"></span>
  </div>

  <div class="form-group">
    <label for="signup-confirm">Confirm Password</label>
    <input type="password" id="signup-confirm" placeholder="Repeat your password">
  </div>

  <label class="checkbox-label">
    <input type="checkbox" id="terms-checkbox">
    I agree to the <a href="terms.html" target="_blank">Terms of Service</a>
    and <a href="privacy.html" target="_blank">Privacy Policy</a>
  </label>

  <div id="signup-error-banner" class="error-banner" style="display:none"></div>

  <button class="btn-primary btn-full" onclick="handleSignUp()">
    <span id="signup-btn-text">Create Account</span>
    <span id="signup-spinner" class="spinner" style="display:none"></span>
  </button>

  <div class="auth-divider">— or —</div>
  <button class="btn-google btn-full" onclick="signInWithGoogle()">
    <img src="assets/google-icon.svg" alt="Google"> Continue with Google
  </button>

</div>

<!-- Success state — shown after successful signup -->
<div id="signup-success" class="success-card" style="display:none">
  <div class="success-icon">✅</div>
  <h3>Check your email!</h3>
  <p>We sent a confirmation link to <strong id="confirmed-email"></strong>.
  Click it to activate your account.</p>
  <p class="text-muted">After confirming, come back here to log in.</p>
  <a href="login.html" class="btn-primary btn-full">Go to Login →</a>
</div>

<script>
async function handleSignUp() {
  document.getElementById('signup-error-banner').style.display = 'none'

  const name = document.getElementById('signup-name').value.trim()
  const email = document.getElementById('signup-email').value.trim()
  const password = document.getElementById('signup-password').value
  const confirm = document.getElementById('signup-confirm').value
  const termsChecked = document.getElementById('terms-checkbox').checked

  // Validation
  if (!name || !email || !password || !confirm) {
    showSignupError('Please fill in all fields.')
    return
  }
  if (password.length < 6) {
    showSignupError('Password must be at least 6 characters.')
    return
  }
  if (password !== confirm) {
    showSignupError('Passwords do not match.')
    return
  }
  if (!termsChecked) {
    showSignupError('Please agree to the Terms of Service.')
    return
  }

  setSignupLoading(true)

  const result = await signUp(email, password, name)

  setSignupLoading(false)

  if (!result.success) {
    showSignupError(result.message)
    return
  }

  // Show success state
  document.getElementById('signup-form').style.display = 'none'
  document.getElementById('confirmed-email').textContent = email
  document.getElementById('signup-success').style.display = 'block'
}

function showSignupError(message) {
  const banner = document.getElementById('signup-error-banner')
  banner.textContent = message
  banner.style.display = 'block'
}

function setSignupLoading(isLoading) {
  document.getElementById('signup-btn-text').style.display = isLoading ? 'none' : 'inline'
  document.getElementById('signup-spinner').style.display = isLoading ? 'inline-block' : 'none'
}

function updatePasswordStrength(value) {
  const fill = document.getElementById('strength-fill')
  const label = document.getElementById('strength-label')
  let strength = 0
  if (value.length >= 6) strength++
  if (value.length >= 10) strength++
  if (/[A-Z]/.test(value)) strength++
  if (/[0-9]/.test(value)) strength++
  if (/[^A-Za-z0-9]/.test(value)) strength++

  const levels = ['', 'Too short', 'Weak', 'Fair', 'Strong', 'Very Strong']
  const colors = ['', '#C62828', '#FF6F00', '#F9A825', '#2E7D32', '#1B5E20']
  const widths = ['0%', '20%', '40%', '60%', '80%', '100%']

  fill.style.width = widths[strength]
  fill.style.backgroundColor = colors[strength]
  label.textContent = levels[strength]
}
</script>
```

---

### File 4: Page Protection — Add to Protected Pages

Add this script block at the very top of `<body>` in:
- `upload.html`
- `report.html`
- `dashboard.html`

```html
<script src="js/config.js"></script>
<script type="module">
  import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'
  const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY)

  // Block access immediately if not logged in
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    window.location.href = 'login.html'
  }

  // Make user info available to the rest of the page
  window.currentUser = user
  document.getElementById('nav-user-name').textContent =
    user.user_metadata?.full_name || user.email
</script>
```

---

### File 5: Updates to `js/api.js`

Update every backend API call to include the auth token in the Authorization header:

```javascript
// Helper — gets token and builds auth headers
async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token
  return {
    "Content-Type": "application/json",
    "Authorization": token ? `Bearer ${token}` : ""
  }
}

// Updated analyzeDataset — now sends token
async analyzeDataset(sessionId, sensitiveColumns, outcomeColumn, depth = "full") {
  const headers = await getAuthHeaders()
  const response = await fetch(`${CONFIG.API_BASE_URL}/analyze`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      session_id: sessionId,
      sensitive_columns: sensitiveColumns,
      outcome_column: outcomeColumn,
      analysis_depth: depth
    })
  })
  return response.json()
},

// Updated uploadFile — also sends token
async uploadFile(file) {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token
  const formData = new FormData()
  formData.append("file", file)
  const response = await fetch(`${CONFIG.API_BASE_URL}/upload`, {
    method: "POST",
    headers: { "Authorization": token ? `Bearer ${token}` : "" },
    body: formData
    // NOTE: Do NOT set Content-Type here — browser sets it automatically for FormData
  })
  return response.json()
}
```

---

## 5. Files to Create — Backend

---

### File 1: Add to `requirements.txt`

```
PyJWT==2.8.0
supabase==2.4.2
```

---

### File 2: Updates to `config.py`

```python
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")
```

---

### File 3: Create `utils/auth_middleware.py`

**Purpose:** Verify Supabase JWT on every protected endpoint. Extract user_id.

```python
from flask import request
import jwt
from config import SUPABASE_JWT_SECRET

def get_user_id_from_token() -> str | None:
    """
    Extracts and verifies the Supabase JWT from the Authorization header.
    Returns the user_id (UUID string) if valid.
    Returns None if token is missing, expired, or invalid.

    Call this at the start of every protected route handler.
    If it returns None, return a 401 error response immediately.
    """
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None

    token = auth_header.replace("Bearer ", "").strip()

    try:
        decoded = jwt.decode(
            token,
            SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            options={"verify_aud": False}  # Supabase doesn't always include aud
        )
        return decoded.get("sub")  # sub is the user UUID in Supabase JWTs
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None
```

---

### File 4: Create `services/db_service.py`

**Purpose:** All Supabase database operations. Saves and retrieves audit results.

```python
from supabase import create_client
from config import SUPABASE_URL, SUPABASE_ANON_KEY

supabase = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)

def save_audit(user_id: str, file_name: str, bias_score: int,
               severity: str, audit_json: dict) -> str | None:
    """
    Saves a completed audit result to the audits table.
    Returns the new audit row's UUID, or None if save failed.
    """
    try:
        result = supabase.table("audits").insert({
            "user_id": user_id,
            "file_name": file_name,
            "bias_score": bias_score,
            "severity": severity,
            "audit_json": audit_json
        }).execute()
        return result.data[0]["id"]
    except Exception as e:
        print(f"DB save_audit failed: {e}")
        return None

def get_user_audits(user_id: str) -> list[dict]:
    """
    Returns all audits for a user, newest first.
    Used by the /history endpoint and dashboard.
    """
    try:
        result = supabase.table("audits")\
            .select("id, file_name, bias_score, severity, created_at")\
            .eq("user_id", user_id)\
            .order("created_at", desc=True)\
            .execute()
        return result.data
    except Exception as e:
        print(f"DB get_user_audits failed: {e}")
        return []

def get_audit_by_id(audit_id: str, user_id: str) -> dict | None:
    """
    Returns a single audit by ID.
    Requires user_id to prevent users accessing other users' audits.
    Returns None if not found or unauthorized.
    """
    try:
        result = supabase.table("audits")\
            .select("*")\
            .eq("id", audit_id)\
            .eq("user_id", user_id)\
            .single()\
            .execute()
        return result.data
    except Exception as e:
        print(f"DB get_audit_by_id failed: {e}")
        return None
```

---

### File 5: Update Route Files to Use Auth

**Update `routes/analyze_routes.py`:**

```python
from utils.auth_middleware import get_user_id_from_token
from services.db_service import save_audit
from utils.response_builder import error_response

@analyze_bp.route("/analyze", methods=["POST"])
def analyze():
    # Step 1: Verify auth token
    user_id = get_user_id_from_token()
    if not user_id:
        return error_response("UNAUTHORIZED", "Please log in to run an audit.", 401)

    # ... rest of your existing analyze logic ...

    # Final step: Save audit to Supabase DB
    db_audit_id = save_audit(
        user_id=user_id,
        file_name=data.get("file_name", "unknown.csv"),
        bias_score=audit_result["overall_verdict"]["bias_score"],
        severity=audit_result["overall_verdict"]["label"],
        audit_json=audit_result
    )

    # Return result with DB ID
    audit_result["db_audit_id"] = db_audit_id
    return success_response(audit_result)
```

**Update `routes/upload_routes.py`:**

```python
from utils.auth_middleware import get_user_id_from_token

@upload_bp.route("/upload", methods=["POST"])
def upload():
    # Auth check — upload is also protected
    user_id = get_user_id_from_token()
    if not user_id:
        return error_response("UNAUTHORIZED", "Please log in to upload a file.", 401)

    # ... rest of your existing upload logic ...
```

**Add new `routes/history_routes.py`:**

```python
from flask import Blueprint
from utils.auth_middleware import get_user_id_from_token
from services.db_service import get_user_audits, get_audit_by_id
from utils.response_builder import success_response, error_response

history_bp = Blueprint("history", __name__)

@history_bp.route("/history", methods=["GET"])
def get_history():
    user_id = get_user_id_from_token()
    if not user_id:
        return error_response("UNAUTHORIZED", "Please log in.", 401)

    audits = get_user_audits(user_id)
    return success_response({"audits": audits})

@history_bp.route("/report/<audit_id>", methods=["GET"])
def get_report(audit_id):
    user_id = get_user_id_from_token()
    if not user_id:
        return error_response("UNAUTHORIZED", "Please log in.", 401)

    audit = get_audit_by_id(audit_id, user_id)
    if not audit:
        return error_response("REPORT_NOT_FOUND", "Audit not found.", 404)

    return success_response(audit)
```

**Register new blueprint in `app.py`:**

```python
from routes.history_routes import history_bp
app.register_blueprint(history_bp)
```

---

## 6. Auth Error Codes

| Code | HTTP | Meaning |
|------|------|---------|
| `UNAUTHORIZED` | 401 | No token or invalid token — must log in |
| `TOKEN_EXPIRED` | 401 | Token expired — must log in again |

---

## 7. Build Sequence Checklist

Follow in order:

- [ ] Create Supabase project, save URL and Anon Key
- [ ] Enable Google OAuth provider in Supabase
- [ ] Create Google OAuth credentials in Google Cloud Console
- [ ] Create `audits` table with RLS policy in Supabase
- [ ] Add Supabase credentials to `js/config.js` and backend `.env`
- [ ] Create `js/auth.js` with all 6 functions
- [ ] Update `login.html` — wire up Google button and email form
- [ ] Update `signup.html` — wire up form with password strength indicator
- [ ] Add page protection script to `upload.html`, `report.html`, `dashboard.html`
- [ ] Update `js/api.js` — add auth headers to all fetch calls
- [ ] Add `PyJWT` and `supabase` to `requirements.txt` and install
- [ ] Add Supabase config to `config.py`
- [ ] Create `utils/auth_middleware.py`
- [ ] Create `services/db_service.py`
- [ ] Update `routes/analyze_routes.py` — add auth check + save to DB
- [ ] Update `routes/upload_routes.py` — add auth check
- [ ] Create `routes/history_routes.py`
- [ ] Register `history_bp` in `app.py`
- [ ] Test full flow: Signup → Confirm email → Login → Upload → Analyze → Check DB

---

## 8. Testing Checklist

- [ ] Sign up with email → confirmation email arrives
- [ ] Click confirmation link → redirected to login
- [ ] Log in with email/password → lands on upload.html
- [ ] Log in with Google → lands on upload.html
- [ ] Visit upload.html without logging in → redirected to login.html
- [ ] Run an audit → row appears in Supabase audits table
- [ ] Log out → session cleared, upload.html redirects to login
- [ ] Wrong password → error message shown, not redirected
- [ ] Mismatched passwords on signup → error shown inline

---

*End of Auth PRD*
