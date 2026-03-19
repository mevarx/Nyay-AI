import pandas as pd
import numpy as np
import uuid
import os
from config import UPLOAD_FOLDER, MIN_ROWS_REQUIRED, MIN_COLUMNS_REQUIRED


def save_uploaded_file(file) -> str:
    """
    Saves uploaded file to UPLOAD_FOLDER with a UUID filename.
    Returns session_id (the UUID string).
    """
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
    session_id = str(uuid.uuid4())
    file_path = os.path.join(UPLOAD_FOLDER, f"{session_id}.csv")
    file.save(file_path)
    return session_id


def load_dataset(session_id: str) -> pd.DataFrame:
    """
    Loads CSV from UPLOAD_FOLDER by session_id.
    Raises FileNotFoundError if session expired or doesn't exist.
    """
    file_path = os.path.join(UPLOAD_FOLDER, f"{session_id}.csv")
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Session {session_id} not found or expired.")
    return pd.read_csv(file_path)


def validate_dataset(df: pd.DataFrame) -> tuple:
    """
    Checks that the dataset meets minimum requirements.
    Returns: (is_valid: bool, error_code: str, error_message: str)
    """
    if len(df) == 0:
        return False, "EMPTY_DATASET", "The dataset contains no data rows."

    if len(df) < MIN_ROWS_REQUIRED:
        return (
            False,
            "INSUFFICIENT_DATA",
            f"Dataset has only {len(df)} rows. Minimum {MIN_ROWS_REQUIRED} required.",
        )

    if len(df.columns) < MIN_COLUMNS_REQUIRED:
        return (
            False,
            "TOO_FEW_COLUMNS",
            f"Dataset has only {len(df.columns)} columns. Minimum {MIN_COLUMNS_REQUIRED} required.",
        )

    return True, "", ""


def get_dataset_info(df: pd.DataFrame) -> dict:
    """
    Returns basic dataset stats.
    """
    return {
        "rows": len(df),
        "columns": len(df.columns),
        "column_names": list(df.columns),
    }


def get_column_profiles(df: pd.DataFrame) -> list:
    """
    Returns a profile for each column — used to build the Claude prompt.
    Keeps sample_values to 5 items max to minimize Claude token usage.
    """
    profiles = []
    for col in df.columns:
        unique_count = df[col].nunique()

        # Determine dtype category
        if pd.api.types.is_numeric_dtype(df[col]):
            if unique_count == 2:
                dtype = "binary"
            else:
                dtype = "numeric"
        else:
            if unique_count == 2:
                dtype = "binary"
            else:
                dtype = "categorical"

        # Get up to 5 sample unique values (convert to Python-native types for JSON)
        sample_values = df[col].dropna().unique()[:5].tolist()
        # Convert numpy types to native Python types
        sample_values = [
            int(v) if isinstance(v, (np.integer,)) else
            float(v) if isinstance(v, (np.floating,)) else
            str(v)
            for v in sample_values
        ]

        profiles.append({
            "name": col,
            "dtype": dtype,
            "unique_count": int(unique_count),
            "sample_values": sample_values,
        })

    return profiles


def get_preview_rows(df: pd.DataFrame, n: int = 10) -> list:
    """
    Returns first n rows as list of dicts for frontend table preview.
    Replaces NaN with None for JSON compatibility.
    """
    preview = df.head(n).replace({np.nan: None})
    return preview.to_dict(orient="records")


def prepare_for_analysis(
    df: pd.DataFrame, outcome_column: str
) -> tuple:
    """
    Cleans dataset for Fairlearn:
    - Validates outcome column exists and is binary-encodable
    - Drops rows where outcome_column is null
    - Encodes outcome as binary int (0/1)
    - Returns (cleaned_df, list_of_dropped_row_indices)
    """
    if outcome_column not in df.columns:
        raise ValueError(f"Outcome column '{outcome_column}' not found in dataset.")

    # Drop rows where outcome is null
    null_mask = df[outcome_column].isna()
    dropped_indices = df[null_mask].index.tolist()
    cleaned = df.dropna(subset=[outcome_column]).copy()

    # Encode outcome as binary 0/1
    unique_vals = cleaned[outcome_column].unique()

    if len(unique_vals) > 2:
        # Try to binarize: treat the most common value as positive class
        top_value = cleaned[outcome_column].value_counts().index[0]
        cleaned[outcome_column] = (cleaned[outcome_column] == top_value).astype(int)
    elif len(unique_vals) == 2:
        # Map to 0/1
        if set(unique_vals) <= {0, 1} or set(unique_vals) <= {"0", "1"}:
            cleaned[outcome_column] = cleaned[outcome_column].astype(int)
        else:
            mapping = {unique_vals[0]: 0, unique_vals[1]: 1}
            cleaned[outcome_column] = cleaned[outcome_column].map(mapping).astype(int)
    elif len(unique_vals) == 1:
        raise ValueError(
            f"Outcome column '{outcome_column}' has only one unique value. Cannot perform bias analysis."
        )

    return cleaned, dropped_indices
