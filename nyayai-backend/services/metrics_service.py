import pandas as pd
import numpy as np
from fairlearn.metrics import (
    demographic_parity_difference,
    equalized_odds_difference,
    selection_rate,
)
from config import BIAS_LOW_MAX, BIAS_MODERATE_MAX, BIAS_HIGH_MAX


def compute_metrics_for_column(
    df: pd.DataFrame, sensitive_column: str, outcome_column: str
) -> dict:
    """
    Runs all fairness metrics for one sensitive column.
    Returns a dict containing metric scores and group-level stats.
    """
    y_true = df[outcome_column].values
    sensitive = df[sensitive_column].values

    # Get selection rates per group
    groups = df[sensitive_column].dropna().unique()
    rates = {}
    for group in groups:
        mask = df[sensitive_column] == group
        group_outcomes = df.loc[mask, outcome_column]
        if len(group_outcomes) > 0:
            rates[str(group)] = round(float(group_outcomes.mean()), 4)

    if len(rates) < 2:
        # Not enough groups to compare
        return {
            "column": sensitive_column,
            "demographic_parity_difference": 0.0,
            "equalized_odds_difference": 0.0,
            "disparate_impact_ratio": 1.0,
            "selection_rates": rates,
            "most_disadvantaged_group": "",
            "most_advantaged_group": "",
            "legally_significant": False,
            "_skipped": "Column has fewer than 2 groups with data.",
        }

    # Fairlearn metrics
    try:
        dpd = float(demographic_parity_difference(y_true, y_true, sensitive_features=sensitive))
    except Exception:
        dpd = 0.0

    try:
        eod = float(equalized_odds_difference(y_true, y_true, sensitive_features=sensitive))
    except Exception:
        eod = 0.0

    # Disparate impact ratio: min_rate / max_rate
    rate_values = list(rates.values())
    max_rate = max(rate_values) if rate_values else 1.0
    min_rate = min(rate_values) if rate_values else 1.0
    dir_ratio = round(min_rate / max_rate, 4) if max_rate > 0 else 0.0

    # Find most/least advantaged groups
    most_advantaged = max(rates, key=rates.get)
    most_disadvantaged = min(rates, key=rates.get)

    return {
        "column": sensitive_column,
        "demographic_parity_difference": round(abs(dpd), 4),
        "equalized_odds_difference": round(abs(eod), 4),
        "disparate_impact_ratio": dir_ratio,
        "selection_rates": rates,
        "most_disadvantaged_group": most_disadvantaged,
        "most_advantaged_group": most_advantaged,
        "legally_significant": dir_ratio < 0.8,
    }


def compute_all_metrics(
    df: pd.DataFrame, sensitive_columns: list, outcome_column: str
) -> list:
    """
    Calls compute_metrics_for_column for each sensitive column.
    Returns list of metric dicts. This is what gets sent to Claude.
    """
    results = []
    for col in sensitive_columns:
        if col in df.columns:
            metrics = compute_metrics_for_column(df, col, outcome_column)
            results.append(metrics)
    return results


def compute_nyayai_bias_score(metrics_list: list) -> int:
    """
    NyayAI composite score formula:
    score = (
      0.40 * worst_demographic_parity_normalized +
      0.30 * worst_disparate_impact_normalized +
      0.20 * worst_equalized_odds_normalized +
      0.10 * proxy_penalty
    ) * 100

    proxy_penalty = 0.5 if any column has legally_significant=True else 0.0
    Normalize each metric to 0-1 range before applying weights.
    Returns integer 0-100.
    """
    if not metrics_list:
        return 0

    # Get worst values across all sensitive columns
    worst_dpd = max(m.get("demographic_parity_difference", 0) for m in metrics_list)
    worst_eod = max(m.get("equalized_odds_difference", 0) for m in metrics_list)

    # Disparate impact: lower ratio = worse, so invert
    worst_dir = min(m.get("disparate_impact_ratio", 1.0) for m in metrics_list)
    dir_normalized = 1.0 - worst_dir  # 0.4 ratio -> 0.6 normalized

    # Clamp all values to [0, 1]
    dpd_norm = min(worst_dpd, 1.0)
    eod_norm = min(worst_eod, 1.0)
    dir_norm = min(dir_normalized, 1.0)

    # Proxy penalty
    any_legal = any(m.get("legally_significant", False) for m in metrics_list)
    proxy_penalty = 0.5 if any_legal else 0.0

    score = (
        0.40 * dpd_norm
        + 0.30 * dir_norm
        + 0.20 * eod_norm
        + 0.10 * proxy_penalty
    ) * 100

    return min(int(round(score)), 100)


def get_severity_label(bias_score: int) -> str:
    """
    0-30   -> LOW
    31-60  -> MODERATE
    61-80  -> HIGH
    81-100 -> CRITICAL
    """
    if bias_score <= BIAS_LOW_MAX:
        return "LOW"
    elif bias_score <= BIAS_MODERATE_MAX:
        return "MODERATE"
    elif bias_score <= BIAS_HIGH_MAX:
        return "HIGH"
    else:
        return "CRITICAL"
