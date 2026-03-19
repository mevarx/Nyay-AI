# NyayAI — Backend PRD v2
**Product:** NyayAI — India's First AI-Powered Bias Audit Tool
**Version:** 2.0 (Phase 1 MVP — Google Antigravity)
**Backend Stack:** Python, Flask, pandas, Fairlearn, Claude Opus API
**Author:** NyayAI Team
**Last Updated:** March 2026

---

## ⚠️ Claude Credit Optimization Rules
> Read this before building anything. Every Claude API call costs credits.
> Follow these rules strictly so you don't run out mid-build.

1. **One call per analysis session** — Never call Claude twice for the same dataset. Combine column detection + root cause reasoning into ONE single prompt instead of separate calls.
2. **Cache every Claude response** — Save Claude's JSON output to a local `.json` file keyed by session ID. If the same session requests reasoning again, read from cache — never re-call Claude.
3. **Send only aggregated data** — Never send raw CSV rows to Claude. Only send column names, group-level statistics, and metric scores. This keeps token count low.
4. **Hard token limit** — Set `max_tokens=2048` for column detection calls and `max_tokens=4096` for full analysis calls. Never higher.
5. **Test with small datasets first** — During development, test with a 100-row CSV, not a 5000-row one. The Claude prompt is the same regardless of dataset size.
6. **One Claude call per endpoint only:**
   - `/upload` → 1 Claude call (column detection)
   - `/analyze` → 1 Claude call (full reasoning — combines root cause + proxy detection + fix suggestions + verdict all in one prompt)
   - `/fix` → 0 Claude calls (pure pandas logic, no AI needed)
7. **Never call Claude in a loop** — If you're iterating over columns, collect all results first, then make one batched Claude call.
8. **Use `claude-opus-4-6` only for final analysis** — For development and testing your prompt structure, use `claude-haiku-4-5-20251001` (much cheaper). Switch to Opus only when the prompt is finalized.

---

## 1. Project Overview

The backend receives CSV datasets, runs statistical bias analysis using Fairlearn and pandas, then makes exactly **two Claude API calls per user session** — one to detect sensitive columns, one to reason about the findings. Everything else is pure Python logic.

---

## 2. Complete Folder & File Structure

Create this exact structure in Google Antigravity before writing any code:

```
nyayai-backend/
│
├── app.py                        # Flask entry point — create this first
├── config.py                     # All constants and env variable loading
├── requirements.txt              # All dependencies listed here
├── .env                          # API keys — NEVER commit this
├── .env.example                  # Safe template to commit
├── .gitignore                    # Must include .env and uploads/
├── README.md                     # Project documentation
│
├── routes/                       # One file per endpoint group
│   ├── __init__.py               # Empty file — makes it a Python package
│   ├── upload_routes.py          # Handles POST /upload
│   ├── analyze_routes.py         # Handles POST /analyze
│   ├── fix_routes.py             # Handles POST /fix
│   └── report_routes.py          # Handles GET /report/:id
│
├── services/                     # Business logic — no Flask here
│   ├── __init__.py               # Empty file
│   ├── dataset_service.py        # CSV parsing, validation, profiling
│   ├── metrics_service.py        # All Fairlearn metric computations
│   ├── claude_service.py         # ALL Claude API calls live here only
│   └── fix_service.py            # Debiasing transformations
│
├── utils/                        # Small helper functions
│   ├── __init__.py               # Empty file
│   ├── validators.py             # Input validation
│   ├── cache.py                  # Claude response caching logic
│   └── response_builder.py      # Standard JSON response formatting
│
├── cache/                        # Claude response cache storage
│   └── .gitkeep                  # Empty file so git tracks the folder
│
├── uploads/                      # Temporary uploaded CSV storage
│   └── .gitkeep
│
└── sample_data/                  # Sample datasets for testing and demo
    ├── hr_analytics_india.csv    # Kaggle HR dataset
    ├── loan_india.csv            # Kaggle loan dataset
    └── README.md                 # Describes each dataset
```

---

## 3. Files to Create — In This Exact Order

Follow this sequence. Do not skip ahead. Test each step before moving to the next.

---

### STEP 1 — Create `.gitignore`

Create this file first before anything else so you never accidentally commit secrets.

**File: `.gitignore`**
```
.env
uploads/
cache/
__pycache__/
*.pyc
.DS_Store
venv/
*.egg-info/
```

---

### STEP 2 — Create `.env.example` and `.env`

**File: `.env.example`** (commit this)
```
ANTHROPIC_API_KEY=your_claude_api_key_here
FLASK_ENV=development
FLASK_SECRET_KEY=your_random_secret_key_here
MAX_UPLOAD_SIZE_MB=50
SESSION_EXPIRY_HOURS=24
UPLOAD_FOLDER=./uploads
CACHE_FOLDER=./cache
```

**File: `.env`** (never commit — fill in real keys)
```
ANTHROPIC_API_KEY=sk-ant-...
FLASK_ENV=development
FLASK_SECRET_KEY=nyayai_dev_secret_2026
MAX_UPLOAD_SIZE_MB=50
SESSION_EXPIRY_HOURS=24
UPLOAD_FOLDER=./uploads
CACHE_FOLDER=./cache
```

---

### STEP 3 — Create `requirements.txt`

**File: `requirements.txt`**
```
flask==3.0.3
flask-cors==4.0.1
python-dotenv==1.0.1
pandas==2.2.2
scikit-learn==1.5.0
fairlearn==0.10.0
anthropic==0.28.0
werkzeug==3.0.3
scipy==1.13.1
numpy==1.26.4
```

Install with:
```bash
pip install -r requirements.txt
```

---

### STEP 4 — Create `config.py`

**File: `config.py`**

This file loads all environment variables and defines all constants used across the project. Import from here everywhere — never hardcode values in other files.

```python
import os
from dotenv import load_dotenv

load_dotenv()

# API Keys
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")

# Flask
FLASK_ENV = os.getenv("FLASK_ENV", "development")
FLASK_SECRET_KEY = os.getenv("FLASK_SECRET_KEY", "dev_secret")

# File handling
MAX_UPLOAD_SIZE_MB = int(os.getenv("MAX_UPLOAD_SIZE_MB", 50))
MAX_UPLOAD_SIZE_BYTES = MAX_UPLOAD_SIZE_MB * 1024 * 1024
UPLOAD_FOLDER = os.getenv("UPLOAD_FOLDER", "./uploads")
CACHE_FOLDER = os.getenv("CACHE_FOLDER", "./cache")
ALLOWED_EXTENSIONS = {"csv"}

# Analysis
MIN_ROWS_REQUIRED = 50
MIN_COLUMNS_REQUIRED = 3
MIN_UNIQUE_VALUES_PER_SENSITIVE_COL = 2

# Bias score thresholds
BIAS_LOW_MAX = 30
BIAS_MODERATE_MAX = 60
BIAS_HIGH_MAX = 80
# Above 80 = CRITICAL

# Claude model config
# USE HAIKU DURING DEVELOPMENT, SWITCH TO OPUS ONLY WHEN PROMPT IS FINALIZED
CLAUDE_MODEL_DEV = "claude-haiku-4-5-20251001"
CLAUDE_MODEL_PROD = "claude-opus-4-6"
CLAUDE_MAX_TOKENS_UPLOAD = 2048
CLAUDE_MAX_TOKENS_ANALYZE = 4096
```

---

### STEP 5 — Create `utils/validators.py`

**File: `utils/validators.py`**

Purpose: All input validation logic. Called before any processing happens.

Functions to implement:

```python
def validate_file_upload(file) -> tuple[bool, str]:
    """
    Checks: file exists, is CSV, under size limit.
    Returns: (is_valid: bool, error_message: str)
    error_message is empty string if valid.
    """

def validate_analyze_request(data: dict) -> tuple[bool, str]:
    """
    Checks: session_id exists, sensitive_columns is a non-empty list,
    outcome_column is a string, analysis_depth is one of allowed values.
    Returns: (is_valid: bool, error_message: str)
    """

def validate_fix_request(data: dict) -> tuple[bool, str]:
    """
    Checks: session_id exists, audit_id exists, fix_actions is a non-empty list,
    each fix_action has column and action_type fields,
    action_type is one of: REMOVE, ANONYMIZE.
    Returns: (is_valid: bool, error_message: str)
    """
```

---

### STEP 6 — Create `utils/response_builder.py`

**File: `utils/response_builder.py`**

Purpose: Every API response uses these helpers so formatting is consistent.

```python
from flask import jsonify

def success_response(data: dict, status_code: int = 200):
    """Wraps data in standard success envelope."""
    return jsonify({"status": "success", **data}), status_code

def error_response(code: str, message: str, status_code: int = 400, details: str = ""):
    """Wraps error in standard error envelope."""
    response = {"status": "error", "code": code, "message": message}
    if details:
        response["details"] = details
    return jsonify(response), status_code
```

---

### STEP 7 — Create `utils/cache.py`

**File: `utils/cache.py`**

Purpose: Save and load Claude API responses to disk. This is your credit saver.
Every Claude response gets saved. Before calling Claude, always check cache first.

```python
import json
import os
from config import CACHE_FOLDER

def save_to_cache(cache_key: str, data: dict) -> None:
    """
    Saves Claude response dict to a JSON file.
    cache_key should be: session_id + "_" + call_type
    Example: "abc123_upload" or "abc123_analyze"
    """
    os.makedirs(CACHE_FOLDER, exist_ok=True)
    file_path = os.path.join(CACHE_FOLDER, f"{cache_key}.json")
    with open(file_path, "w") as f:
        json.dump(data, f, indent=2)

def load_from_cache(cache_key: str) -> dict | None:
    """
    Loads cached Claude response if it exists.
    Returns None if cache miss.
    Always check this before calling Claude.
    """
    file_path = os.path.join(CACHE_FOLDER, f"{cache_key}.json")
    if os.path.exists(file_path):
        with open(file_path, "r") as f:
            return json.load(f)
    return None

def cache_exists(cache_key: str) -> bool:
    """Quick check before loading."""
    file_path = os.path.join(CACHE_FOLDER, f"{cache_key}.json")
    return os.path.exists(file_path)
```

---

### STEP 8 — Create `services/dataset_service.py`

**File: `services/dataset_service.py`**

Purpose: All CSV handling. No Claude calls here. Pure pandas.

Functions to implement:

```python
import pandas as pd
import uuid
import os
from config import UPLOAD_FOLDER

def save_uploaded_file(file) -> str:
    """
    Saves uploaded file to UPLOAD_FOLDER with a UUID filename.
    Returns session_id (the UUID string).
    """

def load_dataset(session_id: str) -> pd.DataFrame:
    """
    Loads CSV from UPLOAD_FOLDER by session_id.
    Raises FileNotFoundError if session expired or doesn't exist.
    """

def get_dataset_info(df: pd.DataFrame) -> dict:
    """
    Returns basic dataset stats:
    {
      "rows": int,
      "columns": int,
      "column_names": list[str]
    }
    """

def get_column_profiles(df: pd.DataFrame) -> list[dict]:
    """
    Returns a profile for each column — used to build the Claude prompt.
    Each profile contains:
    {
      "name": str,
      "dtype": str,           # "numeric", "categorical", "binary"
      "unique_count": int,
      "sample_values": list   # First 5 unique values only
    }
    IMPORTANT: Keep sample_values to 5 items max. This keeps Claude prompt tokens low.
    """

def get_preview_rows(df: pd.DataFrame, n: int = 10) -> list[dict]:
    """
    Returns first n rows as list of dicts for frontend table preview.
    Replaces NaN with None for JSON compatibility.
    """

def prepare_for_analysis(df: pd.DataFrame, outcome_column: str) -> tuple[pd.DataFrame, list]:
    """
    Cleans dataset for Fairlearn:
    - Drops rows where outcome_column is null
    - Encodes outcome as binary int (0/1)
    - Returns (cleaned_df, list_of_dropped_row_indices)
    """
```

---

### STEP 9 — Create `services/claude_service.py`

**File: `services/claude_service.py`**

Purpose: The ONLY file that calls Claude API. All prompts live here.
Contains exactly 2 functions — one per Claude call type.

```python
import anthropic
import json
from config import ANTHROPIC_API_KEY, CLAUDE_MODEL_DEV, CLAUDE_MODEL_PROD
from config import CLAUDE_MAX_TOKENS_UPLOAD, CLAUDE_MAX_TOKENS_ANALYZE
from utils.cache import load_from_cache, save_to_cache

client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

# DEVELOPMENT FLAG: Set to False when switching to production
USE_DEV_MODEL = True
MODEL = CLAUDE_MODEL_DEV if USE_DEV_MODEL else CLAUDE_MODEL_PROD
```

---

#### Claude Call 1 — Column Detection (called from `/upload`)

**Function:** `detect_sensitive_columns(session_id, column_profiles)`

**Credit optimization:** Checks cache first. If same session already ran detection, returns cached result without calling Claude.

**Prompt design:**
```
SYSTEM:
You are a data bias expert specializing in Indian socioeconomic contexts.
You always respond with valid JSON only. No explanation, no markdown, no preamble.

USER:
Analyze these dataset columns and classify each one.

Sensitive columns in India include: caste, religion, gender, native state,
home district, mother tongue, language, region, community, surname,
school board type, family income bracket, disability, marital status, age,
pin code (proxy for region), home district (proxy for caste/region).

Column profiles:
[INSERT column_profiles JSON here — keep to name, dtype, unique_count, sample_values only]

Respond ONLY in this exact JSON format, nothing else:
{
  "sensitive": ["col1", "col2"],
  "outcome": "col_name_or_null",
  "features": ["col3", "col4"],
  "reasoning": {
    "col1": "one sentence why sensitive"
  }
}
```

**Important:** The column_profiles sent to Claude must contain ONLY the fields listed above. Do not send the full dataframe or full unique value lists. This keeps the prompt under 500 tokens.

---

#### Claude Call 2 — Full Bias Reasoning (called from `/analyze`)

**Function:** `analyze_bias(session_id, metrics_results, column_profiles)`

**Credit optimization:**
- Checks cache first using session_id + "_analyze" key
- Combines ALL reasoning into this single call: root cause + proxy detection + legal flags + fix suggestions + overall verdict
- Sends only metric scores and group statistics — not raw data rows
- Column profiles reused from upload cache — no recomputation

**Prompt design:**
```
SYSTEM:
You are an expert in algorithmic fairness and anti-discrimination law in India.
You always respond with valid JSON only. No explanation, no markdown, no preamble.

USER:
You have been given statistical bias analysis results for an Indian dataset.

For each sensitive column finding below, provide:
1. Root cause of the bias (one sentence)
2. Proxy variables — other columns that may encode the same bias
3. Legal flag — does this meet India's disparate impact threshold?
4. Two specific fix suggestions with difficulty (EASY/MEDIUM/HARD)
5. Overall bias verdict for the whole dataset

Metric findings:
[INSERT metrics_results JSON — group rates and fairness scores only]

Column profiles (for proxy detection):
[INSERT column_profiles JSON — names and sample values only]

Respond ONLY in this exact JSON format:
{
  "findings": [
    {
      "column": "col_name",
      "severity": "HIGH|MODERATE|LOW",
      "severity_score": 0-100,
      "root_cause": "one sentence",
      "proxy_variables": ["col_x", "col_y"],
      "legal_flag": true|false,
      "legal_note": "one sentence or empty string",
      "fix_suggestions": [
        {
          "action": "what to do",
          "difficulty": "EASY|MEDIUM|HARD",
          "expected_improvement": "projected change description"
        },
        {
          "action": "alternative fix",
          "difficulty": "EASY|MEDIUM|HARD",
          "expected_improvement": "projected change description"
        }
      ]
    }
  ],
  "proxy_alert": {
    "detected": true|false,
    "details": "one sentence or empty string"
  },
  "overall_verdict": {
    "bias_score": 0-100,
    "label": "LOW|MODERATE|HIGH|CRITICAL",
    "top_priority_fix": "column_name"
  }
}
```

---

#### Error handling for both functions:

```python
def _parse_claude_response(raw_text: str) -> dict:
    """
    Strips markdown fences if present, parses JSON.
    Raises ClaudeParseError if JSON is invalid.
    Never crashes the app — always returns something.
    """

class ClaudeParseError(Exception):
    pass
```

---

### STEP 10 — Create `services/metrics_service.py`

**File: `services/metrics_service.py`**

Purpose: All Fairlearn metric calculations. No Claude here. Returns clean dict.

```python
import pandas as pd
from fairlearn.metrics import (
    demographic_parity_difference,
    equalized_odds_difference,
    selection_rate
)

def compute_metrics_for_column(
    df: pd.DataFrame,
    sensitive_column: str,
    outcome_column: str
) -> dict:
    """
    Runs all fairness metrics for one sensitive column.

    Returns:
    {
      "column": str,
      "demographic_parity_difference": float,
      "equalized_odds_difference": float,
      "disparate_impact_ratio": float,   # computed manually: min_rate / max_rate
      "selection_rates": {               # one entry per unique group value
        "GroupA": float,
        "GroupB": float
      },
      "most_disadvantaged_group": str,
      "most_advantaged_group": str,
      "legally_significant": bool        # True if disparate_impact_ratio < 0.8
    }
    """

def compute_all_metrics(
    df: pd.DataFrame,
    sensitive_columns: list[str],
    outcome_column: str
) -> list[dict]:
    """
    Calls compute_metrics_for_column for each sensitive column.
    Returns list of metric dicts.
    This is what gets sent to Claude for reasoning.
    """

def compute_nyayai_bias_score(metrics_list: list[dict]) -> int:
    """
    NyayAI composite score formula:
    score = (
      0.40 * worst_demographic_parity_normalized +
      0.30 * worst_disparate_impact_normalized +
      0.20 * worst_equalized_odds_normalized +
      0.10 * proxy_penalty
    ) * 100

    proxy_penalty = 0.5 if any column has legally_significant=True else 0.0

    Normalize each metric to 0-1 range before applying weights.
    Returns integer 0-100.
    """

def get_severity_label(bias_score: int) -> str:
    """
    0-30   -> "LOW"
    31-60  -> "MODERATE"
    61-80  -> "HIGH"
    81-100 -> "CRITICAL"
    """
```

---

### STEP 11 — Create `services/fix_service.py`

**File: `services/fix_service.py`**

Purpose: Apply fixes to dataset. Pure pandas. Zero Claude calls.

```python
import pandas as pd

def apply_remove(df: pd.DataFrame, column: str) -> pd.DataFrame:
    """
    Drops the specified column from the dataframe.
    Returns new dataframe without that column.
    """

def apply_anonymize(df: pd.DataFrame, column: str) -> pd.DataFrame:
    """
    Replaces actual group values with anonymous codes: Group_A, Group_B, etc.
    Preserves the number of groups and distribution.
    Returns new dataframe with anonymized column.
    """

def save_debiased_csv(df: pd.DataFrame, session_id: str) -> str:
    """
    Saves the fixed dataframe as a new CSV in uploads/ folder.
    Filename: {session_id}_debiased.csv
    Returns the file path.
    """
```

---

### STEP 12 — Create Route Files

---

**File: `routes/upload_routes.py`**

```python
from flask import Blueprint, request
from services.dataset_service import (
    save_uploaded_file, load_dataset,
    get_dataset_info, get_column_profiles, get_preview_rows
)
from services.claude_service import detect_sensitive_columns
from utils.validators import validate_file_upload
from utils.response_builder import success_response, error_response

upload_bp = Blueprint("upload", __name__)

@upload_bp.route("/upload", methods=["POST"])
def upload():
    """
    Flow:
    1. Validate file
    2. Save file, get session_id
    3. Load df, get info + profiles + preview
    4. Call detect_sensitive_columns(session_id, profiles)
       → checks cache first, calls Claude only if cache miss
    5. Return session_id + preview + column classifications
    """
```

---

**File: `routes/analyze_routes.py`**

```python
from flask import Blueprint, request
from services.dataset_service import load_dataset, prepare_for_analysis, get_column_profiles
from services.metrics_service import compute_all_metrics, compute_nyayai_bias_score, get_severity_label
from services.claude_service import analyze_bias
from utils.validators import validate_analyze_request
from utils.response_builder import success_response, error_response
from utils.cache import load_from_cache, save_to_cache
import uuid
from datetime import datetime

analyze_bp = Blueprint("analyze", __name__)

@analyze_bp.route("/analyze", methods=["POST"])
def analyze():
    """
    Flow:
    1. Validate request body
    2. Load dataset from session
    3. Prepare dataframe (encode outcome, drop nulls)
    4. Compute Fairlearn metrics for each sensitive column
    5. Compute NyayAI composite bias score
    6. Call analyze_bias(session_id, metrics, profiles)
       → checks cache first, calls Claude only if cache miss
    7. Merge metrics + Claude reasoning into final result
    8. Generate audit_id, save full result to cache
    9. Return complete audit JSON
    """
```

---

**File: `routes/fix_routes.py`**

```python
from flask import Blueprint, request
from services.dataset_service import load_dataset, prepare_for_analysis
from services.fix_service import apply_remove, apply_anonymize, save_debiased_csv
from services.metrics_service import compute_all_metrics, compute_nyayai_bias_score
from utils.validators import validate_fix_request
from utils.response_builder import success_response, error_response
from utils.cache import load_from_cache

fix_bp = Blueprint("fix", __name__)

@fix_bp.route("/fix", methods=["POST"])
def fix():
    """
    Flow:
    1. Validate request body
    2. Load dataset from session
    3. Load original audit result from cache (to get before scores)
    4. Apply each fix action in sequence (REMOVE or ANONYMIZE)
    5. Re-run metrics on the fixed dataset
    6. Compute new bias score
    7. Build before/after comparison dict
    8. Save debiased CSV, return download URL + comparison
    NOTE: No Claude call here. Pure pandas logic only.
    """
```

---

**File: `routes/report_routes.py`**

```python
from flask import Blueprint, send_file
from utils.cache import load_from_cache
from utils.response_builder import success_response, error_response
import os
from config import UPLOAD_FOLDER

report_bp = Blueprint("report", __name__)

@report_bp.route("/report/<audit_id>", methods=["GET"])
def get_report(audit_id):
    """
    Loads audit result from cache by audit_id.
    Returns the same JSON structure as /analyze response.
    """

@report_bp.route("/report/<audit_id>/download/debiased", methods=["GET"])
def download_debiased(audit_id):
    """
    Streams the debiased CSV file for download.
    Looks up session_id from audit cache, then finds the debiased file.
    """
```

---

### STEP 13 — Create `app.py`

**File: `app.py`** — Create this last, after all routes and services exist.

```python
from flask import Flask
from flask_cors import CORS
from config import FLASK_SECRET_KEY, UPLOAD_FOLDER, CACHE_FOLDER
from routes.upload_routes import upload_bp
from routes.analyze_routes import analyze_bp
from routes.fix_routes import fix_bp
from routes.report_routes import report_bp
import os

def create_app():
    app = Flask(__name__)
    app.secret_key = FLASK_SECRET_KEY

    # Allow frontend to call backend
    CORS(app, origins=["http://localhost:3000", "https://your-firebase-domain.web.app"])

    # Ensure required folders exist
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
    os.makedirs(CACHE_FOLDER, exist_ok=True)

    # Register all route blueprints
    app.register_blueprint(upload_bp)
    app.register_blueprint(analyze_bp)
    app.register_blueprint(fix_bp)
    app.register_blueprint(report_bp)

    # Health check
    @app.route("/health")
    def health():
        return {"status": "healthy", "version": "1.0.0"}

    return app

if __name__ == "__main__":
    app = create_app()
    app.run(debug=True, port=5000)
```

---

## 4. API Reference

### POST `/upload`
**Request:** `multipart/form-data` with `file` field (CSV)

**Success Response:**
```json
{
  "status": "success",
  "session_id": "abc123",
  "dataset_info": {
    "rows": 5000,
    "columns": 12,
    "column_names": ["age", "gender", "native_state", "education", "hired"]
  },
  "preview": [{"age": 28, "gender": "F", "native_state": "Bihar", "hired": 0}],
  "column_classifications": {
    "sensitive": ["gender", "native_state"],
    "outcome": "hired",
    "features": ["age", "education"],
    "claude_reasoning": {
      "native_state": "Strong proxy for regional origin"
    }
  }
}
```

---

### POST `/analyze`
**Request:**
```json
{
  "session_id": "abc123",
  "sensitive_columns": ["gender", "native_state"],
  "outcome_column": "hired",
  "analysis_depth": "full"
}
```

**Success Response:**
```json
{
  "status": "success",
  "audit_id": "audit_xyz789",
  "session_id": "abc123",
  "completed_at": "2026-03-14T10:30:00Z",
  "dataset_summary": {
    "file_name": "hiring_data.csv",
    "total_rows": 5000,
    "rows_analyzed": 4891,
    "rows_dropped": 109
  },
  "overall_verdict": {
    "bias_score": 72,
    "label": "HIGH",
    "top_priority_fix": "native_state"
  },
  "findings": [
    {
      "column": "native_state",
      "severity": "HIGH",
      "severity_score": 82,
      "metrics": {
        "demographic_parity_difference": 0.37,
        "disparate_impact_ratio": 0.42,
        "equalized_odds_difference": 0.29,
        "selection_rates": {"Maharashtra": 0.68, "Bihar": 0.31},
        "most_disadvantaged_group": "Bihar",
        "most_advantaged_group": "Maharashtra",
        "legally_significant": true
      },
      "root_cause": "Claude's root cause text",
      "proxy_variables": ["home_district"],
      "legal_flag": true,
      "legal_note": "Claude's legal note",
      "fix_suggestions": [
        {
          "action": "Remove native_state column",
          "difficulty": "EASY",
          "expected_improvement": "Score projected to drop ~30 points"
        }
      ]
    }
  ],
  "proxy_alert": {
    "detected": true,
    "details": "home_district encodes similar regional information"
  }
}
```

---

### POST `/fix`
**Request:**
```json
{
  "session_id": "abc123",
  "audit_id": "audit_xyz789",
  "fix_actions": [
    {"column": "native_state", "action_type": "REMOVE"}
  ]
}
```

**Success Response:**
```json
{
  "status": "success",
  "download_url": "/report/audit_xyz789/download/debiased",
  "comparison": {
    "before": {"bias_score": 72, "label": "HIGH"},
    "after": {"bias_score": 41, "label": "MODERATE"},
    "per_column": [
      {
        "column": "native_state",
        "action": "REMOVE",
        "before_score": 82,
        "after_score": 0
      }
    ]
  }
}
```

---

### GET `/report/:audit_id`
Returns same structure as `/analyze` success response.

### GET `/report/:audit_id/download/debiased`
Streams debiased CSV file.

### GET `/health`
Returns `{"status": "healthy", "version": "1.0.0"}`

---

## 5. Error Codes Reference

| Code | HTTP | Meaning |
|------|------|---------|
| `INVALID_FILE_TYPE` | 400 | Non-CSV uploaded |
| `FILE_TOO_LARGE` | 400 | Over 50MB |
| `EMPTY_DATASET` | 400 | Zero data rows |
| `PARSE_FAILED` | 400 | CSV unreadable |
| `INSUFFICIENT_DATA` | 400 | Under 50 rows |
| `TOO_FEW_COLUMNS` | 400 | Under 3 columns |
| `INVALID_OUTCOME_COLUMN` | 400 | Not binary |
| `INSUFFICIENT_GROUPS` | 400 | Column has only 1 unique value |
| `SESSION_NOT_FOUND` | 404 | Session expired |
| `REPORT_NOT_FOUND` | 404 | Audit ID not found |
| `CLAUDE_API_FAILED` | 503 | Claude unavailable — returns raw metrics |

---

## 6. Build Sequence Checklist

Follow in order. Check off before moving to next step.

- [ ] Step 1: Create folder structure and `.gitignore`
- [ ] Step 2: Create `.env.example` and `.env` with real API key
- [ ] Step 3: Create `requirements.txt` and run `pip install`
- [ ] Step 4: Create `config.py` — verify all env variables load correctly
- [ ] Step 5: Create `utils/validators.py`
- [ ] Step 6: Create `utils/response_builder.py`
- [ ] Step 7: Create `utils/cache.py` — test save and load manually
- [ ] Step 8: Create `services/dataset_service.py` — test with sample CSV
- [ ] Step 9: Create `services/claude_service.py` — test DETECT call with Haiku first
- [ ] Step 10: Create `services/metrics_service.py` — test metrics on sample data
- [ ] Step 11: Create `services/fix_service.py`
- [ ] Step 12: Create all route files
- [ ] Step 13: Create `app.py` — run server, test `/health`
- [ ] Final: Test full flow with sample CSV end to end

---

*End of Backend PRD v2*
