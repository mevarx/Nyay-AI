import json
import re
import google.generativeai as genai
from config import (
    GEMINI_API_KEY,
    GEMINI_MODEL,
    GEMINI_MAX_TOKENS_UPLOAD,
    GEMINI_MAX_TOKENS_ANALYZE,
)
from utils.cache import load_from_cache, save_to_cache


MODEL_NAME = GEMINI_MODEL

# Configure the Gemini client
genai.configure(api_key=GEMINI_API_KEY)


class GeminiParseError(Exception):
    pass


def _parse_gemini_response(raw_text: str) -> dict:
    """
    Strips markdown fences if present, parses JSON.
    Raises GeminiParseError if JSON is invalid.
    """
    text = raw_text.strip()

    # Remove ```json ... ``` or ``` ... ``` fences
    text = re.sub(r"^```(?:json)?\s*\n?", "", text)
    text = re.sub(r"\n?```\s*$", "", text)
    text = text.strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError as e:
        raise GeminiParseError(
            f"Failed to parse Gemini response as JSON: {e}\nRaw: {text[:500]}"
        )


def detect_sensitive_columns(session_id: str, column_profiles: list) -> dict:
    """
    Gemini Call 1 — Column Detection (called from /upload).
    Checks cache first. If same session already ran detection, returns cached result.

    Returns dict with keys: sensitive, outcome, features, reasoning
    """
    cache_key = f"{session_id}_upload"
    cached = load_from_cache(cache_key)
    if cached is not None:
        return cached

    # Build a minimal column profile for the prompt (token-efficient)
    minimal_profiles = [
        {
            "name": p["name"],
            "dtype": p["dtype"],
            "unique_count": p["unique_count"],
            "sample_values": p["sample_values"][:5],
        }
        for p in column_profiles
    ]

    prompt = f"""You are a data bias expert specializing in Indian socioeconomic contexts.
You always respond with valid JSON only. No explanation, no markdown, no preamble.

Analyze these dataset columns and classify each one.

Sensitive columns in India include: caste, religion, gender, native state,
home district, mother tongue, language, region, community, surname,
school board type, family income bracket, disability, marital status, age,
pin code (proxy for region), home district (proxy for caste/region).

Column profiles:
{json.dumps(minimal_profiles, indent=2)}

Respond ONLY in this exact JSON format, nothing else:
{{
  "sensitive": ["col1", "col2"],
  "outcome": "col_name_or_null",
  "features": ["col3", "col4"],
  "reasoning": {{
    "col1": "one sentence why sensitive"
  }}
}}"""

    try:
        model = genai.GenerativeModel(MODEL_NAME)
        response = model.generate_content(
            prompt,
            generation_config=genai.GenerationConfig(
                max_output_tokens=GEMINI_MAX_TOKENS_UPLOAD,
                temperature=0.1,
            ),
        )
        result = _parse_gemini_response(response.text)
    except GeminiParseError:
        result = {
            "sensitive": [],
            "outcome": None,
            "features": [p["name"] for p in column_profiles],
            "reasoning": {},
            "_error": "Gemini response was not valid JSON. Manual column selection required.",
        }
    except Exception as e:
        result = {
            "sensitive": [],
            "outcome": None,
            "features": [p["name"] for p in column_profiles],
            "reasoning": {},
            "_error": f"Gemini API call failed: {str(e)}",
        }

    # Cache result
    save_to_cache(cache_key, result)
    return result


def analyze_bias(
    session_id: str, metrics_results: list, column_profiles: list
) -> dict:
    """
    Gemini Call 2 — Full Bias Reasoning (called from /analyze).
    Checks cache first. Combines ALL reasoning into one call.

    Returns dict with keys: findings, proxy_alert, overall_verdict
    """
    cache_key = f"{session_id}_analyze"
    cached = load_from_cache(cache_key)
    if cached is not None:
        return cached

    # Minimal profiles for proxy detection context
    minimal_profiles = [
        {"name": p["name"], "sample_values": p["sample_values"][:5]}
        for p in column_profiles
    ]

    prompt = f"""You are an expert in algorithmic fairness and anti-discrimination law in India.
You always respond with valid JSON only. No explanation, no markdown, no preamble.

You have been given statistical bias analysis results for an Indian dataset.

For each sensitive column finding below, provide:
1. Root cause of the bias (one sentence)
2. Proxy variables — other columns that may encode the same bias
3. Legal flag — does this meet India's disparate impact threshold?
4. Two specific fix suggestions with difficulty (EASY/MEDIUM/HARD)
5. Overall bias verdict for the whole dataset

Metric findings:
{json.dumps(metrics_results, indent=2)}

Column profiles (for proxy detection):
{json.dumps(minimal_profiles, indent=2)}

Respond ONLY in this exact JSON format:
{{
  "findings": [
    {{
      "column": "col_name",
      "severity": "HIGH|MODERATE|LOW",
      "severity_score": 0,
      "root_cause": "one sentence",
      "proxy_variables": ["col_x", "col_y"],
      "legal_flag": true,
      "legal_note": "one sentence or empty string",
      "fix_suggestions": [
        {{
          "action": "what to do",
          "difficulty": "EASY|MEDIUM|HARD",
          "expected_improvement": "projected change description"
        }},
        {{
          "action": "alternative fix",
          "difficulty": "EASY|MEDIUM|HARD",
          "expected_improvement": "projected change description"
        }}
      ]
    }}
  ],
  "proxy_alert": {{
    "detected": true,
    "details": "one sentence or empty string"
  }},
  "overall_verdict": {{
    "bias_score": 0,
    "label": "LOW|MODERATE|HIGH|CRITICAL",
    "top_priority_fix": "column_name"
  }}
}}"""

    try:
        model = genai.GenerativeModel(MODEL_NAME)
        response = model.generate_content(
            prompt,
            generation_config=genai.GenerationConfig(
                max_output_tokens=GEMINI_MAX_TOKENS_ANALYZE,
                temperature=0.1,
            ),
        )
        result = _parse_gemini_response(response.text)
    except GeminiParseError:
        result = {
            "findings": [],
            "proxy_alert": {"detected": False, "details": ""},
            "overall_verdict": {
                "bias_score": 0,
                "label": "UNKNOWN",
                "top_priority_fix": "",
            },
            "_error": "Gemini response was not valid JSON.",
        }
    except Exception as e:
        result = {
            "findings": [],
            "proxy_alert": {"detected": False, "details": ""},
            "overall_verdict": {
                "bias_score": 0,
                "label": "UNKNOWN",
                "top_priority_fix": "",
            },
            "_error": f"Gemini API call failed: {str(e)}",
        }

    save_to_cache(cache_key, result)
    return result

def generate_narrative(audit_id: str, audit_data: dict) -> dict:
    """
    Gemini Call 3 — Narrative Generation (formerly run on frontend).
    Generates structured plain-English story explaining the audit findings.
    """
    cache_key = f"{audit_id}_narrative"
    cached = load_from_cache(cache_key)
    if cached is not None:
        return cached

    lean_payload = {
        "overall_verdict": audit_data.get("overall_verdict"),
        "findings": []
    }
    
    for f in audit_data.get("findings", []):
        lean_payload["findings"].append({
            "column": f.get("column"),
            "severity": f.get("severity"),
            "root_cause": f.get("root_cause"),
        })

    prompt = f"""
You are writing a bias audit report for an Indian organization.
Your audience is a non-technical HR manager or NGO worker.
Write clearly and plainly — no jargon, no statistics terms.
Always respond with valid JSON only. No preamble, no markdown.

Audit data:
{json.dumps(lean_payload, indent=2)}

Generate narrative text for each section of the report.
Respond in this exact JSON format:

{{
  "executive_summary": "3-4 sentence plain English verdict. State the overall bias level, the biggest problem found, and one key recommendation. Be direct.",
  "story": "3-5 paragraph narrative explaining all the bias findings together, written like a journalist would write it. Mention specific groups and numbers. Connect the findings. Make it readable.",
  "card_explanations": {{
    "column_name_1": "2-sentence plain explanation of what the bias means for this column and which groups are affected."
  }},
  "fix_narratives": {{
    "column_name_1": "2-sentence explanation of what the fix does and why it helps, written for a non-technical reader."
  }}
}}
    """

    try:
        model = genai.GenerativeModel(MODEL_NAME)
        response = model.generate_content(prompt)
        result = _parse_gemini_response(response.text)
    except Exception as e:
        result = {
            "executive_summary": "Narrative generation unavailable. Please review the bias scores below.",
            "story": f"Backend Error: {str(e)}",
            "card_explanations": {},
            "fix_narratives": {}
        }
    
    save_to_cache(cache_key, result)
    return result
