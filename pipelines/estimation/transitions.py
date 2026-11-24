"""Reusable weighted transition estimators; this module does not define CPS eligibility."""

from __future__ import annotations

import math
from collections import defaultdict
from collections.abc import Iterable
from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class TransitionObservation:
    origin: str
    destination: str
    weight: float
    eligible: bool
    occupational_changer: bool


def estimate_transition_cells(
    observations: Iterable[TransitionObservation],
) -> list[dict[str, object]]:
    """Estimate descriptive cell totals and both denominators from eligible records.

    Caller must resolve survey eligibility, missing occupation rules, and weight scaling from
    the source release before passing records here. This function is not a CPS file parser.
    """
    cells: dict[tuple[str, str], dict[str, float]] = defaultdict(
        lambda: {"count": 0, "weighted": 0.0, "mover_count": 0, "mover_weighted": 0.0}
    )
    cohort: dict[str, float] = defaultdict(float)
    movers: dict[str, float] = defaultdict(float)
    for row in observations:
        if not row.eligible:
            continue
        if not row.origin or not row.destination:
            raise ValueError("Eligible transition observations require both occupation codes.")
        if not math.isfinite(row.weight) or row.weight < 0:
            raise ValueError("Weights must be finite and nonnegative.")
        bucket = cells[(row.origin, row.destination)]
        bucket["count"] += 1
        bucket["weighted"] += row.weight
        cohort[row.origin] += row.weight
        if row.occupational_changer:
            bucket["mover_count"] += 1
            bucket["mover_weighted"] += row.weight
            movers[row.origin] += row.weight
    estimates = []
    for (origin, destination), bucket in sorted(cells.items()):
        total = bucket["weighted"]
        mover_total = bucket["mover_weighted"]
        estimates.append(
            {
                "origin_id": origin,
                "destination_id": destination,
                "unweighted_count": int(bucket["count"]),
                "weighted_population_estimate": total,
                "origin_cohort_share": total / cohort[origin] if cohort[origin] else None,
                "origin_cohort_denominator": cohort[origin],
                "mover_only_destination_share": mover_total / movers[origin]
                if movers[origin]
                else None,
                "mover_only_denominator": movers[origin],
                "unweighted_mover_count": int(bucket["mover_count"]),
                "unweighted_mover_only_share": int(bucket["mover_count"])
                / sum(
                    int(value["mover_count"])
                    for (key_origin, _), value in cells.items()
                    if key_origin == origin
                )
                if any(
                    key_origin == origin and int(value["mover_count"])
                    for (key_origin, _), value in cells.items()
                )
                else None,
                "standard_error": None,
                "confidence_interval": None,
                "uncertainty_status": "unavailable_replicate_weights_not_joined",
            }
        )
    return estimates


def replicate_variance(
    full_sample_estimate: float, replicate_estimates: Iterable[float], multiplier: float
) -> float:
    """Generic replicate variance; caller must provide the release-documented multiplier."""
    values = list(replicate_estimates)
    if not values:
        raise ValueError("At least one replicate estimate is required.")
    if not math.isfinite(multiplier) or multiplier <= 0:
        raise ValueError("A positive finite release-documented variance multiplier is required.")
    if not math.isfinite(full_sample_estimate) or any(not math.isfinite(value) for value in values):
        raise ValueError("Replicate estimates must be finite.")
    return multiplier * sum((value - full_sample_estimate) ** 2 for value in values)


def reliability_status(
    unweighted_count: int, rse: float | None, minimum_count: int, maximum_rse: float | None
) -> str:
    """Apply configured project thresholds without conflating unavailable RSE with zero."""
    if unweighted_count < 0 or minimum_count < 0:
        raise ValueError("Cell counts and configured minimum must be nonnegative.")
    if unweighted_count < minimum_count:
        return "below_project_minimum_support"
    if rse is None:
        return "uncertainty_unavailable"
    if rse < 0 or not math.isfinite(rse):
        raise ValueError("Relative standard error must be a finite nonnegative value.")
    if maximum_rse is not None and rse > maximum_rse:
        return "above_project_maximum_rse"
    return "meets_configured_project_thresholds"
