import json
import os
from config import CACHE_FOLDER


def save_to_cache(cache_key: str, data: dict) -> None:
    """
    Saves Claude response dict to a JSON file.
    cache_key should be: session_id + "_" + call_type
    Example: "abc123_upload" or "abc123_analyze"
    """
    os.makedirs(CACHE_FOLDER, exist_ok=True)
    file_path = os.path.join(CACHE_FOLDER, f"{cache_key}.json")
    with open(file_path, "w") as f:
        json.dump(data, f, indent=2)


def load_from_cache(cache_key: str) -> dict | None:
    """
    Loads cached Claude response if it exists.
    Returns None if cache miss.
    Always check this before calling Claude.
    """
    file_path = os.path.join(CACHE_FOLDER, f"{cache_key}.json")
    if os.path.exists(file_path):
        with open(file_path, "r") as f:
            return json.load(f)
    return None


def cache_exists(cache_key: str) -> bool:
    """Quick check before loading."""
    file_path = os.path.join(CACHE_FOLDER, f"{cache_key}.json")
    return os.path.exists(file_path)
