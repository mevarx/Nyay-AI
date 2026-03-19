from flask import Blueprint, request
from services.dataset_service import (
    load_dataset,
    prepare_for_analysis,
    get_column_profiles,
)
from services.metrics_service import (
    compute_all_metrics,
    compute_nyayai_bias_score,
    get_severity_label,
)
from services.claude_service import analyze_bias
from utils.validators import validate_analyze_request
from utils.response_builder import success_response, error_response
from utils.auth_middleware import get_user_id_from_token
from services.db_service import save_audit
from utils.cache import save_to_cache
import uuid
from datetime import datetime, timezone

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
    data = request.get_json(silent=True)

    # Auth check
    user_id = get_user_id_from_token()
    if not user_id:
        return error_response("UNAUTHORIZED", "Please log in to run an audit.", 401)

    # Step 1: Validate
    is_valid, err_code, err_msg = validate_analyze_request(data)
    if not is_valid:
        return error_response(err_code, err_msg)

    session_id = data["session_id"]
    sensitive_columns = data["sensitive_columns"]
    outcome_column = data["outcome_column"]

    # Step 2: Load dataset
    try:
        df = load_dataset(session_id)
    except FileNotFoundError:
        return error_response("SESSION_NOT_FOUND", "Session expired or not found.", 404)

    # Step 3: Prepare for analysis
    try:
        cleaned_df, dropped_indices = prepare_for_analysis(df, outcome_column)
    except ValueError as e:
        return error_response("INVALID_OUTCOME_COLUMN", str(e))

    # Step 4: Compute Fairlearn metrics
    metrics_results = compute_all_metrics(cleaned_df, sensitive_columns, outcome_column)

    # Step 5: Composite bias score
    bias_score = compute_nyayai_bias_score(metrics_results)
    severity_label = get_severity_label(bias_score)

    # Step 6: Claude reasoning (1 API call, cache-first)
    column_profiles = get_column_profiles(df)
    claude_reasoning = analyze_bias(session_id, metrics_results, column_profiles)

    # Step 7: Merge metrics + Claude reasoning
    findings = []
    for metric in metrics_results:
        finding = {**metric}

        # Try to merge Claude's reasoning for this column
        claude_finding = next(
            (f for f in claude_reasoning.get("findings", []) if f.get("column") == metric["column"]),
            None,
        )
        if claude_finding:
            finding["root_cause"] = claude_finding.get("root_cause", "")
            finding["proxy_variables"] = claude_finding.get("proxy_variables", [])
            finding["legal_flag"] = claude_finding.get("legal_flag", metric["legally_significant"])
            finding["legal_note"] = claude_finding.get("legal_note", "")
            finding["fix_suggestions"] = claude_finding.get("fix_suggestions", [])
            finding["severity"] = claude_finding.get("severity", severity_label)
            finding["severity_score"] = claude_finding.get("severity_score", bias_score)
        else:
            finding["root_cause"] = ""
            finding["proxy_variables"] = []
            finding["legal_flag"] = metric["legally_significant"]
            finding["legal_note"] = ""
            finding["fix_suggestions"] = []
            finding["severity"] = severity_label
            finding["severity_score"] = bias_score

        # Nest metrics under a "metrics" key to match PRD format
        finding["metrics"] = {
            "demographic_parity_difference": metric["demographic_parity_difference"],
            "disparate_impact_ratio": metric["disparate_impact_ratio"],
            "equalized_odds_difference": metric["equalized_odds_difference"],
            "selection_rates": metric["selection_rates"],
            "most_disadvantaged_group": metric["most_disadvantaged_group"],
            "most_advantaged_group": metric["most_advantaged_group"],
            "legally_significant": metric["legally_significant"],
        }

        findings.append(finding)

    # Step 8: Generate audit_id and build result
    audit_id = f"audit_{uuid.uuid4().hex[:12]}"
    completed_at = datetime.now(timezone.utc).isoformat()

    overall_verdict = claude_reasoning.get("overall_verdict", {
        "bias_score": bias_score,
        "label": severity_label,
        "top_priority_fix": sensitive_columns[0] if sensitive_columns else "",
    })
    # Override with computed score if Claude didn't provide one
    if overall_verdict.get("bias_score", 0) == 0:
        overall_verdict["bias_score"] = bias_score
        overall_verdict["label"] = severity_label

    result = {
        "audit_id": audit_id,
        "session_id": session_id,
        "completed_at": completed_at,
        "dataset_summary": {
            "total_rows": len(df),
            "rows_analyzed": len(cleaned_df),
            "rows_dropped": len(dropped_indices),
        },
        "overall_verdict": overall_verdict,
        "findings": findings,
        "proxy_alert": claude_reasoning.get("proxy_alert", {"detected": False, "details": ""}),
    }

    # Save full audit result to cache
    save_to_cache(f"audit_{audit_id}", result)
    save_to_cache(f"{session_id}_audit_id", {"audit_id": audit_id})

    # Save audit to Supabase DB (non-blocking — failure doesn't break response)
    db_audit_id = save_audit(
        user_id=user_id,
        file_name=data.get("file_name", "unknown.csv"),
        bias_score=overall_verdict.get("bias_score", bias_score),
        severity=overall_verdict.get("label", severity_label),
        audit_json=result
    )
    if db_audit_id:
        result["db_audit_id"] = db_audit_id

    return success_response(result)
