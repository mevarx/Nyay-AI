from flask import Blueprint, send_file
from utils.cache import load_from_cache
from utils.response_builder import success_response, error_response
import os
from services.gemini_service import generate_narrative
from config import UPLOAD_FOLDER
from utils.auth_middleware import get_user_id_from_token

report_bp = Blueprint("report", __name__)


@report_bp.route("/report/<audit_id>", methods=["GET"])
def get_report(audit_id):
    """
    Loads audit result from cache by audit_id.
    Returns the same JSON structure as /analyze response.
    """
    result = load_from_cache(f"report_{audit_id}")
    if not result:
        return error_response("REPORT_NOT_FOUND", "Audit report not found.", 404)

    # Auth & Ownership check
    user_id = get_user_id_from_token()
    if not user_id:
        return error_response("UNAUTHORIZED", "Please log in.", 401)
    
    audit_owner = result.get("user_id")
    if audit_owner and audit_owner != user_id:
        return error_response("UNAUTHORIZED", "You do not have permission to view this report.", 403)

    return success_response(result)


@report_bp.route("/report/<audit_id>/download/debiased", methods=["GET"])
def download_debiased(audit_id):
    """
    Streams the debiased CSV file for download.
    Looks up session_id from audit cache, then finds the debiased file.
    """
    audit = load_from_cache(f"report_{audit_id}")
    if not audit:
        return error_response("REPORT_NOT_FOUND", "Audit report not found.", 404)

    # Auth & Ownership check
    user_id = get_user_id_from_token()
    if not user_id:
        return error_response("UNAUTHORIZED", "Please log in.", 401)
    
    audit_owner = audit.get("user_id")
    if audit_owner and audit_owner != user_id:
        return error_response("UNAUTHORIZED", "You do not have permission to download this file.", 403)

    session_id = audit.get("session_id", "")
    debiased_path = os.path.join(UPLOAD_FOLDER, f"{session_id}_debiased.csv")

    if not os.path.exists(debiased_path):
        return error_response(
            "REPORT_NOT_FOUND",
            "Debiased file not found. Run /fix first.",
            404,
        )

    return send_file(
        debiased_path,
        mimetype="text/csv",
        as_attachment=True,
        download_name=f"nyayai_debiased_{session_id[:8]}.csv",
    )


@report_bp.route("/report/<audit_id>/narrative", methods=["POST"])
def get_report_narrative(audit_id):
    """
    Generates the human-readable narrative story for the audit report safely
    from the backend to protect the API key.
    """
    audit = load_from_cache(f"report_{audit_id}")
    if not audit:
        return error_response("REPORT_NOT_FOUND", "Audit report not found.", 404)
        
    # Auth & Ownership check
    user_id = get_user_id_from_token()
    if not user_id:
        return error_response("UNAUTHORIZED", "Please log in.", 401)
    
    audit_owner = audit.get("user_id")
    if audit_owner and audit_owner != user_id:
        return error_response("UNAUTHORIZED", "You do not have permission to access this narrative.", 403)

    narrative = generate_narrative(audit_id, audit)
    return success_response({"narrative": narrative})
