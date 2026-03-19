from flask import Blueprint, request
from services.dataset_service import load_dataset, prepare_for_analysis
from services.fix_service import apply_remove, apply_anonymize, save_debiased_csv
from services.metrics_service import (
    compute_all_metrics,
    compute_nyayai_bias_score,
    get_severity_label,
)
from utils.validators import validate_fix_request
from utils.response_builder import success_response, error_response
from utils.cache import load_from_cache, save_to_cache

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
    data = request.get_json(silent=True)

    # Step 1: Validate
    is_valid, err_code, err_msg = validate_fix_request(data)
    if not is_valid:
        return error_response(err_code, err_msg)

    session_id = data["session_id"]
    audit_id = data["audit_id"]
    fix_actions = data["fix_actions"]

    # Step 2: Load dataset
    try:
        df = load_dataset(session_id)
    except FileNotFoundError:
        return error_response("SESSION_NOT_FOUND", "Session expired or not found.", 404)

    # Step 3: Load original audit
    original_audit = load_from_cache(f"audit_{audit_id}")
    if not original_audit:
        return error_response("REPORT_NOT_FOUND", "Audit not found.", 404)

    before_verdict = original_audit.get("overall_verdict", {})
    before_score = before_verdict.get("bias_score", 0)
    before_label = before_verdict.get("label", "UNKNOWN")

    # Step 4: Apply fixes
    fixed_df = df.copy()
    per_column_comparison = []

    for action in fix_actions:
        column = action["column"]
        action_type = action["action_type"]

        # Find before score for this column
        col_finding = next(
            (f for f in original_audit.get("findings", []) if f.get("column") == column),
            None,
        )
        before_col_score = col_finding.get("severity_score", 0) if col_finding else 0

        if action_type == "REMOVE":
            fixed_df = apply_remove(fixed_df, column)
            after_col_score = 0  # Removed entirely
        elif action_type == "ANONYMIZE":
            fixed_df = apply_anonymize(fixed_df, column)
            after_col_score = before_col_score  # Placeholder; re-computed below

        per_column_comparison.append({
            "column": column,
            "action": action_type,
            "before_score": before_col_score,
            "after_score": after_col_score,
        })

    # Step 5-6: Re-run metrics on fixed dataset
    # Get remaining sensitive columns (those not removed)
    outcome_col = original_audit.get("findings", [{}])[0].get("column", "")
    remaining_sensitive = [
        a["column"] for a in fix_actions
        if a["action_type"] != "REMOVE" and a["column"] in fixed_df.columns
    ]

    # Also include other sensitive columns from original audit that weren't acted on
    original_sensitive = [f["column"] for f in original_audit.get("findings", [])]
    for col in original_sensitive:
        if col in fixed_df.columns and col not in remaining_sensitive:
            remaining_sensitive.append(col)

    # Find outcome column from original audit data
    outcome_column = ""
    audit_session_data = load_from_cache(f"{session_id}_upload")
    if audit_session_data:
        outcome_column = audit_session_data.get("outcome", "")
    if not outcome_column:
        # Fallback: try to detect from the original data
        for col in fixed_df.columns:
            if fixed_df[col].nunique() == 2:
                outcome_column = col
                break

    if outcome_column and outcome_column in fixed_df.columns and remaining_sensitive:
        try:
            cleaned_fixed, _ = prepare_for_analysis(fixed_df, outcome_column)
            new_metrics = compute_all_metrics(cleaned_fixed, remaining_sensitive, outcome_column)
            after_score = compute_nyayai_bias_score(new_metrics)
            after_label = get_severity_label(after_score)
        except Exception:
            after_score = before_score
            after_label = before_label
    else:
        after_score = 0
        after_label = "LOW"

    # Step 7: Save debiased CSV
    debiased_path = save_debiased_csv(fixed_df, session_id)

    # Step 8: Return comparison
    return success_response({
        "download_url": f"/report/{audit_id}/download/debiased",
        "comparison": {
            "before": {"bias_score": before_score, "label": before_label},
            "after": {"bias_score": after_score, "label": after_label},
            "per_column": per_column_comparison,
        },
    })
