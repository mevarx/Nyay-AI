<p align="center">
  <h1 align="center">⚖️ NyayAI</h1>
  <p align="center"><strong>AI-powered bias detection suite for fairer decision-making in India.</strong></p>
</p>

<p align="center">
  <a href="https://nyayai.web.app">🌐 Live Demo</a> &nbsp;·&nbsp;
  <a href="#">🎬 Demo Video</a> <em>(add before submission)</em>
</p>

---

## 📌 Problem Statement

AI systems used in hiring, lending, and admissions across India often inherit and amplify deep-rooted societal biases around gender, caste, and religion. These biases silently disadvantage millions, and most organizations lack accessible tools to detect them. Without proactive auditing, algorithmic unfairness becomes institutionalized at scale.

## 💡 Solution

NyayAI lets anyone upload a tabular dataset and instantly receive a comprehensive fairness audit. It combines statistical bias metrics (via Fairlearn) with plain-English AI-generated explanations (via Gemini) to make bias detection accessible to non-technical stakeholders — no data science degree required.

---

## 🛠️ Tech Stack

| Layer | Technologies | Hosting |
|-------|-------------|---------|
| **Frontend** | HTML, CSS, JavaScript, Chart.js | Firebase Hosting |
| **Backend** | Python, Flask, Fairlearn, pandas, scikit-learn | Leapcell |
| **Database** | Supabase (PostgreSQL) | Supabase Cloud |
| **Auth** | Supabase Auth (Google OAuth + Email/Password) | Supabase Cloud |
| **AI** | Gemini API (Google AI Studio) | Google Cloud |

---

## ✨ Features

- **One-Click Bias Audits** — Upload a CSV and get a full fairness report in seconds.
- **AI-Powered Narratives** — Gemini generates plain-English explanations of every detected bias, making results accessible to non-technical users.
- **Disparate Impact Analysis** — Calculates selection rate ratios across sensitive features like gender, caste, and religion using Fairlearn.
- **Data Fix Recommendations** — Suggests and simulates pre-processing interventions to improve upstream dataset fairness.
- **Interactive Learn Module** — Built-in educational content on AI bias, fairness metrics, and Indian anti-discrimination law.
- **Secure & Stateless** — API keys stay server-side, datasets are never stored permanently, and all sessions are transient.

---

## 💻 How to Run Locally

### Backend

```bash
cd nyayai-backend

# Create and activate a virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS / Linux

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# Edit .env and add your GOOGLE_API_KEY, SUPABASE_URL, SUPABASE_KEY

# Start the server
python app.py
# → Running on http://127.0.0.1:5000
```

### Frontend

```bash
cd nyayai-frontend

# Serve static files
python -m http.server 8000
# → Open http://localhost:8000 in your browser
```

> **Note:** Update `js/config.js` to point `API_BASE_URL` to `http://127.0.0.1:5000` for local development.

---

## 📁 Project Structure

```
Nyay AI/
├── nyayai-frontend/                # Static web application
│   ├── index.html                  # Landing page
│   ├── dashboard.html              # User dashboard
│   ├── upload.html                 # CSV upload & audit config
│   ├── report.html                 # Bias audit report
│   ├── learn.html                  # Educational module
│   ├── login.html                  # Login page
│   ├── signup.html                 # Signup page
│   ├── css/                        # Modular stylesheets
│   │   ├── base.css, variables.css
│   │   ├── landing.css, dashboard.css
│   │   ├── upload.css, report.css
│   │   └── auth.css, navbar.css, ...
│   ├── js/                         # Client-side logic
│   │   ├── config.js, api.js, auth.js
│   │   ├── upload.js, report.js
│   │   ├── dashboard.js, learn.js
│   │   └── animations.js, gemini.js, ...
│   └── assets/                     # Images & static assets
│
├── nyayai-backend/                 # Flask API server
│   ├── app.py                      # Entry point
│   ├── config.py                   # Environment & API config
│   ├── requirements.txt            # Python dependencies
│   ├── Procfile                    # Deployment process file
│   ├── routes/                     # API endpoints
│   │   ├── upload_routes.py
│   │   ├── analyze_routes.py
│   │   ├── report_routes.py
│   │   ├── fix_routes.py
│   │   └── history_routes.py
│   ├── services/                   # Core business logic
│   │   ├── gemini_service.py
│   │   ├── metrics_service.py
│   │   ├── dataset_service.py
│   │   ├── fix_service.py
│   │   └── db_service.py
│   └── utils/                      # Helpers & middleware
│       ├── validators.py
│       ├── auth_middleware.py
│       ├── cache.py
│       └── response_builder.py
│
└── PRDs/                           # Product docs & sample data
```

---

## 👩‍💻 Team

| Name | Role | College |
|------|------|---------|
| *Your Name* | Full-Stack Developer | *Your College* |

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

<p align="center"><em>Built for the <a href="https://vision.hack2skill.com/event/build-with-ai">Build with AI</a> Hackathon 2026</em></p>
