import pytest

from pipelines.estimation.transitions import (
    TransitionObservation,
    estimate_transition_cells,
    reliability_status,
    replicate_variance,
)


def test_weighted_cells_keep_origin_and_mover_denominators_distinct():
    records = [
        TransitionObservation("A", "A", 2.0, True, False),
        TransitionObservation("A", "B", 3.0, True, True),
        TransitionObservation("A", "B", 1.0, True, True),
        TransitionObservation("A", "C", 50.0, False, True),
    ]
    estimates = estimate_transition_cells(records)
    assert len(estimates) == 2
    move = next(row for row in estimates if row["destination_id"] == "B")
    assert move["unweighted_count"] == 2
    assert move["weighted_population_estimate"] == 4.0
    assert move["origin_cohort_denominator"] == 6.0
    assert move["origin_cohort_share"] == pytest.approx(4 / 6)
    assert move["mover_only_denominator"] == 4.0
    assert move["mover_only_destination_share"] == pytest.approx(1.0)
    assert move["standard_error"] is None


def test_replicate_variance_requires_an_explicit_method_multiplier():
    assert replicate_variance(10, [9, 11], 0.5) == pytest.approx(1.0)
    with pytest.raises(ValueError):
        replicate_variance(10, [9, 11], 0)


def test_unavailable_uncertainty_is_not_treated_as_reliable_zero():
    assert reliability_status(8, None, 5, 0.3) == "uncertainty_unavailable"
    assert reliability_status(4, 0.01, 5, 0.3) == "below_project_minimum_support"
