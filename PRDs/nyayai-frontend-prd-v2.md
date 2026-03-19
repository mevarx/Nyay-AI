# NyayAI — Frontend PRD v2
**Product:** NyayAI — India's First AI-Powered Bias Audit Tool
**Version:** 2.0 (Phase 1 MVP — Google Antigravity)
**Frontend Stack:** HTML, CSS, JavaScript, Gemini API, Chart.js, jsPDF
**Author:** NyayAI Team
**Last Updated:** March 2026

---

## ⚠️ Gemini Credit Optimization Rules
> Read this before building anything. Gemini API calls cost credits.
> Follow these rules strictly.

1. **One Gemini call per report page load** — Combine ALL narrative generation (executive summary + story + all card explanations + fix descriptions) into a single Gemini call. Never make separate calls per section.
2. **Cache Gemini output in sessionStorage** — Once Gemini generates the narrative for a report, store it in `sessionStorage` keyed by `audit_id`. If the user refreshes or revisits the report, read from sessionStorage — never re-call Gemini.
3. **Hard token limit** — Set `max_output_tokens: 2048` on every Gemini call. Never higher for Phase 1.
4. **Send only what Gemini needs** — The prompt to Gemini should contain: overall verdict, per-column findings, severity labels, group names, and disparity numbers. Never send the full raw dataset or full audit JSON.
5. **Gemini is presentation only** — Gemini writes words. It does not calculate anything. All numbers come from the backend. Gemini only wraps numbers in readable sentences.
6. **One Gemini call total per user session on the report page.** If the call fails, show the raw numbers with a "Narrative unavailable" notice. Never retry in a loop.
7. **Test prompt with Gemini Flash during development** — Switch to Gemini Pro only when the prompt is finalized and you're recording the demo video.

---

## 1. Product Overview

NyayAI's frontend is a multi-page HTML/CSS/JS website. It communicates with the Flask backend via `fetch()` API calls, receives structured JSON audit results, then makes **one Gemini API call** to convert those results into a readable narrative report displayed on a clean dashboard.

The frontend has two distinct jobs:
- **Marketing site** (Landing, About, Learn pages) — convince users the product is trustworthy
- **App** (Upload, Report, Dashboard pages) — do the actual work

---

## 2. Complete Folder & File Structure

Create this exact structure in Google Antigravity before writing any code:

```
nyayai-frontend/
│
├── index.html                    # Landing page — create this first
├── login.html                    # Login page
├── signup.html                   # Sign up page
├── dashboard.html                # User dashboard
├── upload.html                   # Upload & configure page
├── report.html                   # Audit report page
├── learn.html                    # Learn about bias page
│
├── css/
│   ├── variables.css             # CSS custom properties (colors, fonts, spacing)
│   ├── base.css                  # Reset, body, typography, global elements
│   ├── navbar.css                # Navbar + mobile hamburger styles
│   ├── footer.css                # Footer styles
│   ├── landing.css               # index.html specific styles
│   ├── auth.css                  # login.html and signup.html styles
│   ├── dashboard.css             # dashboard.html styles
│   ├── upload.css                # upload.html styles
│   ├── report.css                # report.html styles — most complex
│   └── learn.css                 # learn.html styles
│
├── js/
│   ├── config.js                 # API base URL, Gemini API key, constants
│   ├── api.js                    # All fetch() calls to backend — one place
│   ├── gemini.js                 # ALL Gemini API calls — one place only
│   ├── cache.js                  # sessionStorage read/write helpers
│   ├── navbar.js                 # Hamburger menu toggle, active link logic
│   ├── upload.js                 # Upload page logic (drag-drop, wizard steps)
│   ├── report.js                 # Report page logic (charts, narrative loading)
│   ├── dashboard.js              # Dashboard page logic
│   └── learn.js                  # Accordion toggle for learn page
│
├── assets/
│   ├── logo.svg                  # NyayAI logo
│   ├── hero-illustration.svg     # Hero section visual
│   ├── favicon.ico
│   └── sample_data/
│       ├── hr_analytics_india.csv    # Sample dataset for demo
│       └── loan_india.csv            # Sample dataset for demo
│
└── README.md
```

---

## 3. CSS Architecture — Create in This Order

---

### STEP 1 — Create `css/variables.css`

Create this file first. Every other CSS file imports from here.
Never hardcode colors or font sizes in other CSS files.

```css
:root {
  /* Colors */
  --color-primary: #1A237E;        /* Deep Indigo — navbar, headings, CTAs */
  --color-accent: #FF6F00;         /* Amber — buttons, highlights, badges */
  --color-success: #2E7D32;        /* Forest Green — low bias */
  --color-warning: #F9A825;        /* Yellow — moderate bias */
  --color-danger: #C62828;         /* Deep Red — high/critical bias */
  --color-bg: #F8F9FA;             /* Page background */
  --color-surface: #FFFFFF;        /* Cards, panels */
  --color-text: #1C1C1C;           /* Primary text */
  --color-text-muted: #6B7280;     /* Subtitles, labels */
  --color-border: #E5E7EB;         /* Dividers, card borders */
  --color-primary-light: #E8EAF6;  /* Light indigo — hover states */

  /* Typography */
  --font-main: 'Inter', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;

  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.125rem;
  --text-xl: 1.25rem;
  --text-2xl: 1.5rem;
  --text-3xl: 1.875rem;
  --text-4xl: 2.25rem;
  --text-5xl: 3rem;

  /* Spacing */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --space-12: 3rem;
  --space-16: 4rem;
  --space-24: 6rem;

  /* Layout */
  --container-max: 1200px;
  --sidebar-width: 240px;
  --navbar-height: 64px;

  /* Borders */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;
  --radius-full: 9999px;

  /* Shadows */
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.08);
  --shadow-md: 0 4px 12px rgba(0,0,0,0.1);
  --shadow-lg: 0 8px 24px rgba(0,0,0,0.12);
}
```

---

### STEP 2 — Create `css/base.css`

```css
/* Import Google Fonts */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
@import url('css/variables.css');

/* Reset */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: var(--font-main);
  font-size: var(--text-base);
  color: var(--color-text);
  background-color: var(--color-bg);
  line-height: 1.6;
}

.container {
  max-width: var(--container-max);
  margin: 0 auto;
  padding: 0 var(--space-6);
}

/* Utility classes used across all pages */
.btn-primary { /* amber filled button */ }
.btn-secondary { /* outlined ghost button */ }
.badge { /* small colored label pill */ }
.card { /* white rounded card with shadow */ }
.section-title { /* large centered heading */ }
.section-subtitle { /* muted text below section title */ }
.spinner { /* loading spinner animation */ }
.error-banner { /* red error message banner */ }
.success-banner { /* green success message banner */ }
```

---

## 4. JavaScript Architecture — Create in This Order

---

### STEP 3 — Create `js/config.js`

```javascript
// js/config.js
// All configuration constants. Change values here only, never in other files.

const CONFIG = {
  // Backend API
  API_BASE_URL: "http://localhost:5000",  // Change to Railway URL before submission

  // Gemini API
  GEMINI_API_KEY: "your_gemini_api_key",  // Replace with real key
  GEMINI_MODEL: "gemini-1.5-flash",       // Use flash during dev, switch to pro for demo
  GEMINI_MAX_TOKENS: 2048,

  // Upload limits
  MAX_FILE_SIZE_MB: 50,
  ACCEPTED_FILE_TYPES: [".csv"],

  // Cache keys
  CACHE_KEYS: {
    UPLOAD_RESULT: "nyayai_upload_",      // append session_id
    REPORT_NARRATIVE: "nyayai_narrative_", // append audit_id
    LAST_AUDIT_ID: "nyayai_last_audit"
  }
};
```

---

### STEP 4 — Create `js/cache.js`

```javascript
// js/cache.js
// sessionStorage helpers — saves Gemini responses so we never re-call API

const Cache = {
  save(key, data) {
    sessionStorage.setItem(key, JSON.stringify(data));
  },

  load(key) {
    const item = sessionStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  },

  exists(key) {
    return sessionStorage.getItem(key) !== null;
  },

  clear(key) {
    sessionStorage.removeItem(key);
  }
};
```

---

### STEP 5 — Create `js/api.js`

```javascript
// js/api.js
// All fetch() calls to the Flask backend. One function per endpoint.
// Never write fetch() calls in other JS files — always use these functions.

const API = {

  async uploadFile(file) {
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch(`${CONFIG.API_BASE_URL}/upload`, {
      method: "POST",
      body: formData
    });
    return response.json();
  },

  async analyzeDataset(sessionId, sensitiveColumns, outcomeColumn, depth = "full") {
    const response = await fetch(`${CONFIG.API_BASE_URL}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: sessionId,
        sensitive_columns: sensitiveColumns,
        outcome_column: outcomeColumn,
        analysis_depth: depth
      })
    });
    return response.json();
  },

  async fixDataset(sessionId, auditId, fixActions) {
    const response = await fetch(`${CONFIG.API_BASE_URL}/fix`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: sessionId,
        audit_id: auditId,
        fix_actions: fixActions
      })
    });
    return response.json();
  },

  async getReport(auditId) {
    const response = await fetch(`${CONFIG.API_BASE_URL}/report/${auditId}`);
    return response.json();
  },

  getDebiasedDownloadURL(auditId) {
    return `${CONFIG.API_BASE_URL}/report/${auditId}/download/debiased`;
  }
};
```

---

### STEP 6 — Create `js/gemini.js`

**This is the most important JS file. All Gemini calls live here only.**

```javascript
// js/gemini.js
// ONE function. ONE call. All narrative generation happens here.
// Always check cache before calling. Never call in a loop.

const Gemini = {

  async generateReportNarrative(auditData) {
    // STEP 1: Check cache first
    const cacheKey = CONFIG.CACHE_KEYS.REPORT_NARRATIVE + auditData.audit_id;
    const cached = Cache.load(cacheKey);
    if (cached) {
      console.log("Gemini: loaded from cache, no API call made");
      return cached;
    }

    // STEP 2: Build a lean prompt — only send what Gemini needs
    const leanPayload = {
      overall_verdict: auditData.overall_verdict,
      findings: auditData.findings.map(f => ({
        column: f.column,
        severity: f.severity,
        severity_score: f.severity_score,
        most_disadvantaged_group: f.metrics.most_disadvantaged_group,
        most_advantaged_group: f.metrics.most_advantaged_group,
        disparate_impact_ratio: f.metrics.disparate_impact_ratio,
        selection_rates: f.metrics.selection_rates,
        legal_flag: f.legal_flag,
        root_cause: f.root_cause,
        fix_suggestions: f.fix_suggestions
      }))
    };

    const prompt = `
You are writing a bias audit report for an Indian organization.
Your audience is a non-technical HR manager or NGO worker.
Write clearly and plainly — no jargon, no statistics terms.
Always respond with valid JSON only. No preamble, no markdown.

Audit data:
${JSON.stringify(leanPayload)}

Generate narrative text for each section of the report.
Respond in this exact JSON format:

{
  "executive_summary": "3-4 sentence plain English verdict. State the overall bias level, the biggest problem found, and one key recommendation. Be direct.",

  "story": "3-5 paragraph narrative explaining all the bias findings together, written like a journalist would write it. Mention specific groups and numbers. Connect the findings. Make it readable.",

  "card_explanations": {
    "column_name_1": "2-sentence plain explanation of what the bias means for this column and which groups are affected.",
    "column_name_2": "2-sentence plain explanation."
  },

  "fix_narratives": {
    "column_name_1": "2-sentence explanation of what the fix does and why it helps, written for a non-technical reader.",
    "column_name_2": "2-sentence fix explanation."
  }
}
    `;

    // STEP 3: Make the single Gemini API call
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${CONFIG.GEMINI_MODEL}:generateContent?key=${CONFIG.GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: CONFIG.GEMINI_MAX_TOKENS }
          })
        }
      );

      const data = await response.json();
      const rawText = data.candidates[0].content.parts[0].text;

      // STEP 4: Parse JSON response
      const cleanText = rawText.replace(/```json|```/g, "").trim();
      const narrative = JSON.parse(cleanText);

      // STEP 5: Save to cache — this is critical
      Cache.save(cacheKey, narrative);

      return narrative;

    } catch (error) {
      console.error("Gemini API failed:", error);
      // Return fallback so the page still loads
      return {
        executive_summary: "Narrative generation unavailable. Please review the bias scores below.",
        story: "",
        card_explanations: {},
        fix_narratives: {}
      };
    }
  }
};
```

---

## 5. Page-by-Page Specification

---

### STEP 7 — Build `index.html` (Landing Page)

Build sections in this order — top to bottom:

---

#### Navbar

**HTML elements:**
```
<nav class="navbar">
  <div class="container navbar__inner">
    <a href="index.html" class="navbar__logo">
      <span class="logo-nyay">Nyay</span><span class="logo-ai">AI</span>
      <small class="logo-tagline">Justice through Data</small>
    </a>

    <ul class="navbar__links">       <!-- desktop nav -->
      <li><a href="#about">How It Works</a></li>
      <li><a href="#problem">Problem</a></li>
      <li><a href="#features">Features</a></li>
      <li><a href="#about-us">About Us</a></li>
      <li><a href="learn.html">Learn More</a></li>
    </ul>

    <div class="navbar__actions">
      <a href="login.html" class="btn-secondary">Log In</a>
      <a href="signup.html" class="btn-primary">Get Started Free</a>
    </div>

    <button class="navbar__hamburger" id="hamburgerBtn">☰</button>
  </div>

  <!-- Mobile drawer — hidden by default, shown when hamburger clicked -->
  <div class="navbar__mobile-drawer" id="mobileDrawer">
    <!-- Same links as desktop, stacked vertically -->
    <!-- Close button at top right of drawer -->
  </div>
</nav>
```

---

#### Hero Section

```
<section class="hero" id="hero">
  <div class="container hero__inner">

    <div class="hero__left">
      <div class="hero__tag">🇮🇳 Built for India</div>
      <h1 class="hero__headline">Is Your AI Treating Everyone Fairly?</h1>
      <p class="hero__subtext">
        NyayAI audits your hiring, lending, and admissions datasets for hidden
        bias across caste, gender, region, and religion — and explains it in
        plain language.
      </p>
      <div class="hero__cta-group">
        <a href="signup.html" class="btn-primary btn-large">Audit Your Dataset →</a>
        <a href="#how-it-works" class="btn-secondary btn-large">See How It Works</a>
      </div>
      <div class="hero__trust-badges">
        <span>✓ Free for students & NGOs</span>
        <span>✓ Indian datasets supported</span>
        <span>✓ No ML expertise needed</span>
      </div>
    </div>

    <div class="hero__right">
      <!-- SVG illustration of a scale/balance with data flowing through -->
      <!-- Or: animated mockup of the report dashboard using CSS -->
      <img src="assets/hero-illustration.svg" alt="NyayAI Dashboard Preview">
    </div>

  </div>
</section>
```

---

#### Problem Statement Section

```
<section class="problem" id="problem">
  <!-- Dark indigo background -->
  <div class="container">
    <h2>Bias is Already in Your Data. You Just Can't See It.</h2>

    <div class="problem__cards">

      <div class="problem__card">
        <div class="problem__icon">🧑‍💼</div>
        <h3>Hiring</h3>
        <p>An AI trained on 10 years of hiring data learned to prefer candidates
        from metros — silently penalizing rural applicants with equal qualifications.</p>
      </div>

      <div class="problem__card">
        <div class="problem__icon">🏦</div>
        <h3>Lending</h3>
        <p>Loan approval models in India have been found to correlate repayment
        prediction with caste proxies like last names and home districts.</p>
      </div>

      <div class="problem__card">
        <div class="problem__icon">🎓</div>
        <h3>Admissions</h3>
        <p>College admission algorithms trained on historical data perpetuate
        legacy advantages, disadvantaging first-generation students from tier-2 cities.</p>
      </div>

    </div>

    <p class="problem__footer">These aren't hypotheticals. They're happening right now in India.</p>
  </div>
</section>
```

---

#### How It Works Section

```
<section class="how-it-works" id="how-it-works">
  <div class="container">
    <h2 class="section-title">Three Steps to a Fair Model</h2>

    <div class="steps">
      <div class="step">
        <div class="step__number">01</div>
        <div class="step__icon">📤</div>
        <h3>Upload Your Dataset</h3>
        <p>Upload any CSV file — hiring data, loan records, admissions data. Any format.</p>
      </div>
      <div class="step__arrow">→</div>
      <div class="step">
        <div class="step__number">02</div>
        <div class="step__icon">🔍</div>
        <h3>NyayAI Audits It</h3>
        <p>Our AI detects bias across caste, gender, region, language, and religion.</p>
      </div>
      <div class="step__arrow">→</div>
      <div class="step">
        <div class="step__number">03</div>
        <div class="step__icon">📋</div>
        <h3>Get Your Report</h3>
        <p>Plain English report with specific fixes. No statistics degree required.</p>
      </div>
    </div>

    <p class="steps__note">→ Takes less than 60 seconds</p>
  </div>
</section>
```

---

#### Features Section

```
<section class="features" id="features">
  <div class="container">
    <h2 class="section-title">Everything You Need to Audit Fairly</h2>

    <div class="features__grid">   <!-- 2x3 grid on desktop, 1 col on mobile -->

      <div class="feature-card">
        <div class="feature-card__icon">🇮🇳</div>
        <h3>Indian Context Aware</h3>
        <p>Detects caste, religion, native state, mother tongue, and region —
        not just Western categories like race.</p>
      </div>

      <div class="feature-card">
        <div class="feature-card__icon">🤖</div>
        <h3>Powered by Claude Opus</h3>
        <p>Deep reasoning engine identifies non-obvious bias patterns and
        proxy variables that simpler tools miss.</p>
      </div>

      <div class="feature-card">
        <div class="feature-card__icon">📝</div>
        <h3>Plain Language Reports</h3>
        <p>Gemini converts technical bias metrics into readable audit narratives.
        No statistics knowledge needed.</p>
      </div>

      <div class="feature-card">
        <div class="feature-card__icon">🔧</div>
        <h3>Actionable Fix Suggestions</h3>
        <p>Don't just find bias — fix it. NyayAI suggests specific interventions
        with expected improvement scores.</p>
      </div>

      <div class="feature-card">
        <div class="feature-card__icon">📊</div>
        <h3>Visual Bias Dashboard</h3>
        <p>Interactive charts show exactly which groups are being treated
        differently and by how much.</p>
      </div>

      <div class="feature-card">
        <div class="feature-card__icon">📄</div>
        <h3>Downloadable Audit PDF</h3>
        <p>Export a professional audit report to share with your team,
        board, or compliance officer.</p>
      </div>

    </div>
  </div>
</section>
```

---

#### About Us Section

```
<section class="about-us" id="about-us">
  <div class="container about-us__inner">

    <div class="about-us__text">
      <h2>Why We Built NyayAI</h2>
      <p>We are computer science students who noticed that while bias detection
      tools exist globally, none of them were built for India's unique social fabric.</p>
      <p>India has one of the world's most complex demographic landscapes — caste,
      religion, region, language, and class intersect in ways that Western fairness
      tools simply don't account for.</p>
      <p>NyayAI was built to change that. We believe every organization in India
      deserves access to tools that help them make fair decisions.</p>
      <div class="about-us__mission">
        Our mission: Make fair AI accessible to every Indian organization,
        regardless of technical expertise.
      </div>
    </div>

    <div class="about-us__team">
      <!-- Team member cards -->
      <div class="team-card">
        <div class="team-card__avatar"><!-- initials avatar or photo --></div>
        <h4>[Your Name]</h4>
        <p>Full Stack & ML</p>
        <p>First-year CSE Student</p>
        <!-- LinkedIn icon link -->
      </div>
    </div>

  </div>
</section>
```

---

#### Learn More Teaser Section

```
<section class="learn-teaser">
  <!-- Amber/saffron gradient background -->
  <div class="container learn-teaser__inner">
    <h2>New to AI Bias? Start Here.</h2>
    <p>We've built a free learning resource explaining how algorithmic bias works,
    why it matters in India, and how to fix it — no technical background needed.</p>
    <a href="learn.html" class="btn-primary btn-large">Explore the Learn Hub →</a>
  </div>
</section>
```

---

#### FAQ Section

```
<section class="faq" id="faq">
  <div class="container">
    <h2 class="section-title">Frequently Asked Questions</h2>

    <div class="faq__list">
      <!-- Each item: question button + answer panel, toggled by learn.js -->

      <div class="faq__item">
        <button class="faq__question">
          What kind of datasets can I upload?
          <span class="faq__icon">+</span>
        </button>
        <div class="faq__answer">
          Any CSV file with at least 50 rows and 3 columns. Works with hiring data,
          loan records, college admissions data, and more.
        </div>
      </div>

      <!-- Repeat for all 8 FAQ items from PRD v1 -->
    </div>
  </div>
</section>
```

---

#### Footer

```
<footer class="footer">
  <div class="container footer__grid">  <!-- 4 columns -->

    <div class="footer__brand">
      <div class="footer__logo">NyayAI</div>
      <p>India's first AI-powered bias audit platform for hiring, lending,
      and admissions.</p>
      <!-- Social icons: LinkedIn, GitHub, Twitter/X -->
    </div>

    <div class="footer__col">
      <h4>Product</h4>
      <ul>
        <li><a href="upload.html">Upload Dataset</a></li>
        <li><a href="#">View Sample Report</a></li>
      </ul>
    </div>

    <div class="footer__col">
      <h4>Resources</h4>
      <ul>
        <li><a href="learn.html">Learn About Bias</a></li>
        <li><a href="#">GitHub</a></li>
      </ul>
    </div>

    <div class="footer__col">
      <h4>Company</h4>
      <ul>
        <li><a href="#about-us">About Us</a></li>
        <li><a href="#">Contact</a></li>
        <li><a href="#">Privacy Policy</a></li>
      </ul>
    </div>

  </div>
  <div class="footer__bottom">
    <p>© 2026 NyayAI. Built with ❤️ in India.</p>
  </div>
</footer>
```

---

### STEP 8 — Build `login.html` and `signup.html`

Both pages share `css/auth.css`.

**login.html elements:**
```
<div class="auth-page">
  <div class="auth-card">
    <a href="index.html"><div class="auth-card__logo">NyayAI</div></a>
    <h2>Welcome Back</h2>
    <p class="auth-card__subtitle">Log in to access your audit dashboard</p>

    <div id="error-banner" class="error-banner" style="display:none"></div>

    <div class="form-group">
      <label>Email Address</label>
      <input type="email" id="email" placeholder="you@example.com">
      <span class="field-error" id="email-error"></span>
    </div>

    <div class="form-group">
      <label>Password</label>
      <div class="password-input-wrapper">
        <input type="password" id="password" placeholder="••••••••">
        <button class="show-hide-btn" onclick="togglePassword()">Show</button>
      </div>
      <span class="field-error" id="password-error"></span>
    </div>

    <a href="#" class="forgot-password">Forgot Password?</a>

    <button class="btn-primary btn-full" onclick="handleLogin()">Log In</button>

    <div class="auth-divider">— or —</div>

    <button class="btn-google btn-full">
      <img src="assets/google-icon.svg"> Continue with Google
    </button>

    <p class="auth-switch">
      Don't have an account? <a href="signup.html">Sign Up</a>
    </p>
  </div>
</div>
```

**signup.html elements:**
Same card structure, add:
- `Full Name` input
- `Organization / College Name` input
- Password strength bar below password field
- `Confirm Password` input
- `Terms of Service` checkbox
- Change heading to `Create Your Account`

**Note for Phase 1:** Login and signup are UI only. On click, simply redirect to `dashboard.html`. No real authentication needed for the hackathon demo.

---

### STEP 9 — Build `upload.html`

Two-step wizard controlled by `js/upload.js`.

**Wizard progress bar:**
```html
<div class="wizard-progress">
  <div class="wizard-step active" id="step-indicator-1">① Upload</div>
  <div class="wizard-divider">→</div>
  <div class="wizard-step" id="step-indicator-2">② Configure</div>
  <div class="wizard-divider">→</div>
  <div class="wizard-step" id="step-indicator-3">③ Run Audit</div>
</div>
```

**Step 1 — Upload panel:**
```html
<div id="step-1-panel" class="wizard-panel">
  <div class="upload-zone" id="uploadZone">
    <!-- Drag and drop target -->
    <div class="upload-zone__icon">☁️</div>
    <p class="upload-zone__primary">Drop your CSV file here</p>
    <p class="upload-zone__secondary">or click to browse</p>
    <p class="upload-zone__hint">.csv files only, max 50MB</p>
    <input type="file" id="fileInput" accept=".csv" style="display:none">
  </div>

  <!-- Shown after file selected -->
  <div id="file-selected" style="display:none">
    <span id="file-name"></span>
    <span id="file-size"></span>
    <span class="success-icon">✓</span>
  </div>

  <div class="sample-datasets">
    <p>Don't have a dataset?</p>
    <a href="assets/sample_data/hr_analytics_india.csv" download class="btn-secondary">
      📥 Try Hiring Dataset (India)
    </a>
    <a href="assets/sample_data/loan_india.csv" download class="btn-secondary">
      📥 Try Loan Dataset (India)
    </a>
  </div>

  <button class="btn-primary" id="continueBtn" disabled onclick="goToStep2()">
    Continue to Configure →
  </button>
</div>
```

**Step 2 — Configure panel:**
```html
<div id="step-2-panel" class="wizard-panel" style="display:none">
  <div class="configure-layout">  <!-- Two columns on desktop -->

    <div class="configure-preview">
      <h3>Dataset Preview</h3>
      <div id="preview-table-container">
        <!-- Table injected by upload.js after API response -->
        <!-- Each column header gets a color-coded type badge -->
      </div>
    </div>

    <div class="configure-controls">
      <h3>Sensitive Columns</h3>
      <p>Claude detected these as sensitive. Toggle to confirm:</p>
      <div id="sensitive-columns-list">
        <!-- Toggle switches injected by upload.js -->
      </div>

      <div class="configure-add-column">
        <label>Add a column manually:</label>
        <select id="add-column-dropdown"><!-- Options from column list --></select>
        <button onclick="addColumn()">+ Add</button>
      </div>

      <h3>Outcome Column</h3>
      <select id="outcome-column-select"><!-- Options injected by upload.js --></select>

      <h3>Analysis Depth</h3>
      <div class="radio-group">
        <label><input type="radio" name="depth" value="quick"> Quick Scan (2 metrics)</label>
        <label><input type="radio" name="depth" value="full" checked> Full Audit (5 metrics)</label>
      </div>

      <button class="btn-primary btn-full btn-large" id="runAuditBtn" onclick="runAudit()">
        🔍 Run Bias Audit
      </button>
    </div>

  </div>
</div>
```

---

### STEP 10 — Build `report.html`

This is the most important page. Build it last when styling is already consistent.

**Sticky top bar:**
```html
<div class="report-topbar">
  <h1 id="report-filename">Audit Report</h1>
  <div class="report-topbar__actions">
    <span id="report-date" class="text-muted"></span>
    <button onclick="downloadPDF()" class="btn-secondary">📥 Download PDF</button>
    <a href="upload.html" class="btn-primary">🔄 New Audit</a>
  </div>
</div>
```

**Section A — Verdict Banner:**
```html
<section class="verdict-banner" id="verdict-banner">
  <!-- Background color set by JS based on severity -->
  <div class="verdict-banner__score">
    <canvas id="biasGauge"></canvas>  <!-- Chart.js gauge -->
    <div class="verdict-banner__label" id="verdict-label">Loading...</div>
  </div>
  <div class="verdict-banner__summary">
    <div class="spinner" id="summary-spinner"></div>
    <p id="executive-summary-text">Generating report narrative...</p>
  </div>
</section>
```

**Section B — The Story:**
```html
<section class="report-story card">
  <h2>What Your Data Is Saying</h2>
  <div class="spinner" id="story-spinner"></div>
  <div id="story-text" class="story-content"></div>
  <!-- Gemini narrative paragraphs injected here by report.js -->
</section>
```

**Section C — Breakdown Cards:**
```html
<section class="findings-section">
  <h2>Findings by Column</h2>
  <div class="findings-grid" id="findings-grid">
    <!-- Cards injected by report.js, one per sensitive column -->
    <!-- Each card structure: -->
    <!--
    <div class="finding-card">
      <div class="finding-card__header">
        <h3>native_state</h3>
        <span class="badge badge-high">HIGH</span>
      </div>
      <canvas id="chart-native_state"></canvas>  Chart.js bar chart
      <p class="finding-card__explanation">Gemini explanation text</p>
      <details>
        <summary>Learn more about this metric</summary>
        <p>Technical metric details</p>
      </details>
    </div>
    -->
  </div>
</section>
```

**Section D — Fix Recommendations:**
```html
<section class="fixes-section card">
  <h2>How to Fix This</h2>
  <div id="fixes-list">
    <!-- Fix items injected by report.js -->
    <!-- Each item: title, difficulty badge, expected improvement, explanation, toggle -->
  </div>
  <button class="btn-primary" id="applyFixesBtn" onclick="applyFixes()">
    Apply Selected Fixes
  </button>
</section>
```

**Section E — Download:**
```html
<section class="download-section card">
  <h2>Download & Share</h2>
  <div class="download-buttons">
    <button onclick="downloadPDF()" class="btn-secondary">📄 Download Audit Report (PDF)</button>
    <a id="debiased-download-link" class="btn-secondary">📊 Download Debiased Dataset</a>
  </div>
</section>
```

---

### STEP 11 — Create `js/report.js`

The main logic that ties the report page together.

```javascript
// js/report.js
// Orchestrates: load audit data → render charts → call Gemini → render narrative

async function initReportPage() {
  // 1. Get audit_id from URL params: ?audit_id=xyz
  const auditId = new URLSearchParams(window.location.search).get("audit_id");

  // 2. Fetch audit data from backend
  const auditData = await API.getReport(auditId);

  // 3. Render verdict banner and charts immediately (no Gemini needed)
  renderVerdictBanner(auditData.overall_verdict);
  renderFindingCards(auditData.findings);  // Cards with charts, no text yet

  // 4. Call Gemini ONCE for all narrative text
  const narrative = await Gemini.generateReportNarrative(auditData);

  // 5. Inject Gemini text into already-rendered sections
  document.getElementById("executive-summary-text").textContent = narrative.executive_summary;
  document.getElementById("story-text").innerHTML = narrative.story
    .split("\n\n").map(p => `<p>${p}</p>`).join("");

  // 6. Update each finding card with its Gemini explanation
  auditData.findings.forEach(finding => {
    const el = document.getElementById(`explanation-${finding.column}`);
    if (el) el.textContent = narrative.card_explanations[finding.column] || "";
  });

  // 7. Render fix section
  renderFixSection(auditData.findings, narrative.fix_narratives);

  // 8. Set download link
  document.getElementById("debiased-download-link").href =
    API.getDebiasedDownloadURL(auditId);
}

// Run on page load
document.addEventListener("DOMContentLoaded", initReportPage);
```

---

### STEP 12 — Build Remaining Pages

Build these last — they are simpler than the report page.

**`dashboard.html`** — simplified version:
- Left sidebar with nav links
- Stats row (hardcoded for demo)
- Single "recent report" table row pointing to your demo audit
- `+ New Audit` button → `upload.html`

**`learn.html`** — 3 sections minimum for Phase 1:
- What is Algorithmic Bias?
- Why India is Different
- How Bias Enters Your Data
- Each section: heading + 2 paragraphs + one key takeaway box
- Bottom CTA → `upload.html`

---

## 6. Build Sequence Checklist

Follow in order. Check off before moving to next step.

- [ ] Step 1: Create full folder structure
- [ ] Step 2: Create `css/variables.css` — all design tokens
- [ ] Step 3: Create `css/base.css` — reset + utility classes
- [ ] Step 4: Create `js/config.js` — add real Gemini API key
- [ ] Step 5: Create `js/cache.js` — test save/load manually in browser console
- [ ] Step 6: Create `js/api.js` — test `/health` endpoint call
- [ ] Step 7: Create `js/gemini.js` — test single narrative call with dummy data
- [ ] Step 8: Build `index.html` section by section, style as you go
- [ ] Step 9: Build `login.html` and `signup.html`
- [ ] Step 10: Build `upload.html` — connect to backend `/upload`
- [ ] Step 11: Build `report.html` — most complex page
- [ ] Step 12: Create `js/report.js` — connects everything on the report page
- [ ] Step 13: Build `dashboard.html` — simplified version
- [ ] Step 14: Build `learn.html` — 3 sections minimum
- [ ] Step 15: Test full flow: Landing → Signup → Upload → Report
- [ ] Step 16: Test Gemini cache — verify second page load makes zero API calls
- [ ] Step 17: Make responsive — add media queries to all CSS files
- [ ] Step 18: Deploy to Firebase Hosting

---

## 7. Responsive Breakpoints

Add these to each CSS file as needed:

```css
/* Tablet */
@media (max-width: 1024px) {
  /* 2-column grids go to 1 column */
  /* Sidebar hides, top nav shows */
}

/* Mobile */
@media (max-width: 768px) {
  /* Single column everything */
  /* Hamburger menu shows */
  /* Font sizes reduce slightly */
  /* Buttons go full width */
}
```

---

## 8. Firebase Hosting Deployment

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Initialize (run from nyayai-frontend/ folder)
firebase init hosting
# Select your project
# Public directory: . (current folder)
# Single page app: No
# Overwrite index.html: No

# Deploy
firebase deploy

# Your site is live at:
# https://your-project-id.web.app
```

---

*End of Frontend PRD v2*
