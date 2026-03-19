import pandas as pd
import os
from config import UPLOAD_FOLDER


def apply_remove(df: pd.DataFrame, column: str) -> pd.DataFrame:
    """
    Drops the specified column from the dataframe.
    Returns new dataframe without that column.
    """
    if column in df.columns:
        return df.drop(columns=[column])
    return df.copy()


def apply_anonymize(df: pd.DataFrame, column: str) -> pd.DataFrame:
    """
    Replaces actual group values with anonymous codes: Group_A, Group_B, etc.
    Preserves the number of groups and distribution.
    Returns new dataframe with anonymized column.
    """
    if column not in df.columns:
        return df.copy()

    new_df = df.copy()
    unique_values = new_df[column].dropna().unique()

    # Create mapping: original value -> Group_A, Group_B, etc.
    mapping = {}
    for i, val in enumerate(sorted(unique_values, key=str)):
        letter = chr(ord("A") + i) if i < 26 else str(i)
        mapping[val] = f"Group_{letter}"

    new_df[column] = new_df[column].map(mapping)
    return new_df


def save_debiased_csv(df: pd.DataFrame, session_id: str) -> str:
    """
    Saves the fixed dataframe as a new CSV in uploads/ folder.
    Filename: {session_id}_debiased.csv
    Returns the file path.
    """
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
    file_path = os.path.join(UPLOAD_FOLDER, f"{session_id}_debiased.csv")
    df.to_csv(file_path, index=False)
    return file_path
