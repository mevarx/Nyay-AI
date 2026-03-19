import os
from config import ALLOWED_EXTENSIONS, MAX_UPLOAD_SIZE_BYTES


def _allowed_file(filename: str) -> bool:
    """Check if file extension is in the allowed set."""
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def validate_file_upload(file) -> tuple:
    """
    Checks: file exists, is CSV, under size limit.
    Returns: (is_valid: bool, error_code: str, error_message: str)
    """
    if file is None or file.filename == "":
        return False, "INVALID_FILE_TYPE", "No file provided."

    if not _allowed_file(file.filename):
        return False, "INVALID_FILE_TYPE", "Only CSV files are accepted."

    # Check file size by reading into memory briefly
    file.seek(0, os.SEEK_END)
    size = file.tell()
    file.seek(0)  # Reset for later reading

    if size > MAX_UPLOAD_SIZE_BYTES:
        return (
            False,
            "FILE_TOO_LARGE",
            f"File exceeds the {MAX_UPLOAD_SIZE_BYTES // (1024*1024)}MB upload limit.",
        )

    if size == 0:
        return False, "EMPTY_DATASET", "The uploaded file is empty."

    return True, "", ""


def validate_analyze_request(data: dict) -> tuple:
    """
    Checks: session_id exists, sensitive_columns is a non-empty list,
    outcome_column is a string, analysis_depth is one of allowed values.
    Returns: (is_valid: bool, error_code: str, error_message: str)
    """
    if not data:
        return False, "INVALID_REQUEST", "Request body is required."

    if not data.get("session_id"):
        return False, "INVALID_REQUEST", "session_id is required."

    sensitive = data.get("sensitive_columns")
    if not sensitive or not isinstance(sensitive, list) or len(sensitive) == 0:
        return (
            False,
            "INVALID_REQUEST",
            "sensitive_columns must be a non-empty list.",
        )

    if not data.get("outcome_column") or not isinstance(
        data["outcome_column"], str
    ):
        return False, "INVALID_REQUEST", "outcome_column must be a non-empty string."

    allowed_depths = {"quick", "full"}
    depth = data.get("analysis_depth", "full")
    if depth not in allowed_depths:
        return (
            False,
            "INVALID_REQUEST",
            f"analysis_depth must be one of: {', '.join(allowed_depths)}",
        )

    return True, "", ""


def validate_fix_request(data: dict) -> tuple:
    """
    Checks: session_id exists, audit_id exists, fix_actions is a non-empty list,
    each fix_action has column and action_type fields,
    action_type is one of: REMOVE, ANONYMIZE.
    Returns: (is_valid: bool, error_code: str, error_message: str)
    """
    if not data:
        return False, "INVALID_REQUEST", "Request body is required."

    if not data.get("session_id"):
        return False, "INVALID_REQUEST", "session_id is required."

    if not data.get("audit_id"):
        return False, "INVALID_REQUEST", "audit_id is required."

    actions = data.get("fix_actions")
    if not actions or not isinstance(actions, list) or len(actions) == 0:
        return False, "INVALID_REQUEST", "fix_actions must be a non-empty list."

    allowed_action_types = {"REMOVE", "ANONYMIZE"}
    for i, action in enumerate(actions):
        if not action.get("column"):
            return (
                False,
                "INVALID_REQUEST",
                f"fix_actions[{i}] is missing 'column' field.",
            )
        if action.get("action_type") not in allowed_action_types:
            return (
                False,
                "INVALID_REQUEST",
                f"fix_actions[{i}].action_type must be one of: {', '.join(allowed_action_types)}",
            )

    return True, "", ""
