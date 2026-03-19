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
