from supabase import create_client
from config import SUPABASE_URL, SUPABASE_ANON_KEY

# Initialize Supabase client (lazy — only connects when first called)
_supabase = None


def _get_client():
    global _supabase
    if _supabase is None:
        if SUPABASE_URL and SUPABASE_ANON_KEY:
            _supabase = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
        else:
            print("WARNING: Supabase credentials not configured. DB operations will fail.")
            return None
    return _supabase


def save_audit(user_id: str, file_name: str, bias_score: int,
               severity: str, audit_json: dict) -> str | None:
    """
    Saves a completed audit result to the audits table.
    Returns the new audit row's UUID, or None if save failed.
    """
    client = _get_client()
    if not client:
        return None
    try:
        result = client.table("audits").insert({
            "user_id": user_id,
            "file_name": file_name,
            "bias_score": bias_score,
            "severity": severity,
            "audit_json": audit_json
        }).execute()
        return result.data[0]["id"]
    except Exception as e:
        print(f"DB save_audit failed: {e}")
        return None


def get_user_audits(user_id: str) -> list[dict]:
    """
    Returns all audits for a user, newest first.
    Used by the /history endpoint and dashboard.
    """
    client = _get_client()
    if not client:
        return []
    try:
        result = client.table("audits") \
            .select("id, file_name, bias_score, severity, created_at") \
            .eq("user_id", user_id) \
            .order("created_at", desc=True) \
            .execute()
        return result.data
    except Exception as e:
        print(f"DB get_user_audits failed: {e}")
        return []


def get_audit_by_id(audit_id: str, user_id: str) -> dict | None:
    """
    Returns a single audit by ID.
    Requires user_id to prevent users accessing other users' audits.
    Returns None if not found or unauthorized.
    """
    client = _get_client()
    if not client:
        return None
    try:
        result = client.table("audits") \
            .select("*") \
            .eq("id", audit_id) \
            .eq("user_id", user_id) \
            .single() \
            .execute()
        return result.data
    except Exception as e:
        print(f"DB get_audit_by_id failed: {e}")
        return None
