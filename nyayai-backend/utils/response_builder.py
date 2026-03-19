from flask import jsonify


def success_response(data: dict, status_code: int = 200):
    """Wraps data in standard success envelope."""
    return jsonify({"status": "success", **data}), status_code


def error_response(
    code: str, message: str, status_code: int = 400, details: str = ""
):
    """Wraps error in standard error envelope."""
    response = {"status": "error", "code": code, "message": message}
    if details:
        response["details"] = details
    return jsonify(response), status_code
