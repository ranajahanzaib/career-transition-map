import json

import polars as pl
from fastapi.testclient import TestClient

from services.api.app import main


def test_missing_release_has_explicit_unavailable_response(tmp_path, monkeypatch):
    monkeypatch.setattr(main, "RELEASE_DIR", tmp_path)
    client = TestClient(main.app)
    response = client.get("/api/v1/occupations")
    assert response.status_code == 503
    assert response.json()["detail"]["code"] == "dataset_not_published"
    assert client.get("/api/v1/health").json()["status"] == "ok"


def test_occupation_search_and_profile_query_use_published_release(tmp_path, monkeypatch):
    pl.DataFrame(
        [{"id": "15-1252.00", "code": "15-1252.00", "title": "Software Developers"}]
    ).write_json(tmp_path / "occupations.json")
    pl.DataFrame(
        [
            {
                "occupation_id": "15-1252.00",
                "dimension": "essential_skills",
                "element_id": "2.A.1.a",
                "element_name": "Reading Comprehension",
                "scale_id": "IM",
                "scale_name": "Importance",
                "value": 4.1,
            }
        ]
    ).write_parquet(tmp_path / "skills.parquet")
    (tmp_path / "manifest.json").write_text(
        json.dumps({"release_id": "test-release", "status": "partial"})
    )
    monkeypatch.setattr(main, "RELEASE_DIR", tmp_path)
    client = TestClient(main.app)
    occupations = client.get("/api/v1/occupations", params={"search": "software"})
    assert occupations.status_code == 200
    assert occupations.json()["items"][0]["id"] == "15-1252.00"
    ratings = client.get("/api/v1/occupations/15-1252.00/skills")
    assert ratings.status_code == 200
    assert ratings.json()["items"][0]["scale_name"] == "Importance"
    assert ratings.json()["release_id"] == "test-release"


def test_transitions_endpoint_filters_and_limits(tmp_path, monkeypatch):
    transitions = [
        {"origin_id": "1010", "destination_id": "1010", "weighted_population_estimate": 310000.0, "unweighted_count": 66},
        {"origin_id": "1010", "destination_id": "1020", "weighted_population_estimate": 15000.0, "unweighted_count": 4},
        {"origin_id": "2310", "destination_id": "2310", "weighted_population_estimate": 450000.0, "unweighted_count": 92},
    ]
    (tmp_path / "transitions.json").write_text(json.dumps(transitions))
    (tmp_path / "manifest.json").write_text(
        json.dumps({"release_id": "test-release-trans", "status": "partial"})
    )
    monkeypatch.setattr(main, "RELEASE_DIR", tmp_path)
    client = TestClient(main.app)

    # All transitions
    all_res = client.get("/api/v1/transitions")
    assert all_res.status_code == 200
    assert all_res.json()["total"] == 3

    # Filtered by origin
    filtered = client.get("/api/v1/transitions", params={"origin": "1010"})
    assert filtered.status_code == 200
    assert filtered.json()["total"] == 2
    assert all(item["origin_id"] == "1010" for item in filtered.json()["items"])


def test_research_endpoints_deliver_published_metadata(tmp_path, monkeypatch):
    (tmp_path / "manifest.json").write_text(json.dumps({"release_id": "meta-release", "status": "published"}))
    (tmp_path / "releases.json").write_text(json.dumps([{"id": "rel-1", "title": "Release 1"}]))
    (tmp_path / "metadata.json").write_text(json.dumps({"version": "0.2.0", "name": "CTM"}))
    (tmp_path / "quality.json").write_text(json.dumps({"release_id": "meta-release", "pipeline_version": "0.1.0"}))
    (tmp_path / "sources.json").write_text(json.dumps({"items": [{"dataset_id": "cps_test"}]}))

    monkeypatch.setattr(main, "RELEASE_DIR", tmp_path)
    client = TestClient(main.app)

    assert client.get("/api/v1/releases").status_code == 200
    assert client.get("/api/v1/metadata").status_code == 200
    assert client.get("/api/v1/quality").status_code == 200
    assert client.get("/api/v1/sources").status_code == 200


def test_occupation_not_found_returns_404(tmp_path, monkeypatch):
    (tmp_path / "occupations.json").write_text(json.dumps([]))
    (tmp_path / "manifest.json").write_text(json.dumps({"release_id": "empty", "status": "partial"}))
    monkeypatch.setattr(main, "RELEASE_DIR", tmp_path)
    client = TestClient(main.app)
    res = client.get("/api/v1/occupations/non-existent-id")
    assert res.status_code == 404
    assert res.json()["detail"]["code"] == "occupation_not_found"
