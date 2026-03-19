from flask import Blueprint, request
from services.dataset_service import (
    save_uploaded_file,
    load_dataset,
    validate_dataset,
    get_dataset_info,
    get_column_profiles,
    get_preview_rows,
)
from services.claude_service import detect_sensitive_columns
from utils.validators import validate_file_upload
from utils.response_builder import success_response, error_response
from utils.auth_middleware import get_user_id_from_token

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
    file = request.files.get("file")

    # Auth check — upload is protected
    user_id = get_user_id_from_token()
    if not user_id:
        return error_response("UNAUTHORIZED", "Please log in to upload a file.", 401)

    # Step 1: Validate
    is_valid, err_code, err_msg = validate_file_upload(file)
    if not is_valid:
        return error_response(err_code, err_msg)

    # Step 2: Save
    try:
        session_id = save_uploaded_file(file)
    except Exception as e:
        return error_response("PARSE_FAILED", f"Failed to save file: {str(e)}", 500)

    # Step 3: Load and profile
    try:
        df = load_dataset(session_id)
    except Exception as e:
        return error_response("PARSE_FAILED", f"Failed to read CSV: {str(e)}")

    # Validate dataset quality
    is_valid, err_code, err_msg = validate_dataset(df)
    if not is_valid:
        return error_response(err_code, err_msg)

    dataset_info = get_dataset_info(df)
    column_profiles = get_column_profiles(df)
    preview = get_preview_rows(df)

    # Step 4: Claude column detection (1 API call, cache-first)
    column_classifications = detect_sensitive_columns(session_id, column_profiles)

    # Step 5: Return
    return success_response({
        "session_id": session_id,
        "dataset_info": dataset_info,
        "preview": preview,
        "column_profiles": column_profiles,
        "column_classifications": column_classifications,
    })
