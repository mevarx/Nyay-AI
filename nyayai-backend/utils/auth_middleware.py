from flask import request
import jwt
from config import SUPABASE_JWT_SECRET


def get_user_id_from_token() -> str | None:
    """
    Extracts and verifies the Supabase JWT from the Authorization header.
    Returns the user_id (UUID string) if valid.
    Returns None if token is missing, expired, or invalid.

    Call this at the start of every protected route handler.
    If it returns None, return a 401 error response immediately.
    """
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None

    token = auth_header.replace("Bearer ", "").strip()

    try:
        decoded = jwt.decode(
            token,
            SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            options={"verify_aud": False}  # Supabase doesn't always include aud
        )
        return decoded.get("sub")  # sub is the user UUID in Supabase JWTs
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None
