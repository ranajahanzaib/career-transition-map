"""Read-only API for published, versioned occupational research artifacts."""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

import duckdb
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict

DEFAULT_RELEASE_DIR = Path(__file__).resolve().parents[3] / "data" / "releases" / "current"
RELEASE_DIR = Path(os.environ.get("CTM_RELEASE_DIR", str(DEFAULT_RELEASE_DIR))).resolve()

app = FastAPI(
    title="Career Transition Map API",
    version="0.1.0",
    description="Read-only access to versioned and validated labor-market research artifacts. Raw survey records are never exposed.",
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("CTM_CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(","),
    allow_origin_regex=os.environ.get("CTM_CORS_ORIGIN_REGEX", r"^http://(localhost|127\.0\.0\.1):\d+$"),
    allow_credentials=False,
    allow_methods=["GET"],
    allow_headers=["Content-Type"],
)


class APIError(BaseModel):
    model_config = ConfigDict(extra="forbid")
    code: str
    message: str
    release_id: str | None = None


def read_artifact(name: str) -> Any:
    path = RELEASE_DIR / name
    if not path.is_file() or RELEASE_DIR not in path.resolve().parents:
        raise HTTPException(
            status_code=503,
            detail={
                "code": "dataset_not_published",
                "message": "No validated release artifact is published for this view.",
            },
        )
    try:
        return json.loads(path.read_text())
    except (OSError, json.JSONDecodeError) as exc:
        raise HTTPException(
            status_code=503,
            detail={
                "code": "artifact_unreadable",
                "message": "The published artifact could not be read.",
            },
        ) from exc


def release_manifest() -> dict[str, Any]:
    try:
        return read_artifact("manifest.json")
    except HTTPException:
        return {"release_id": None, "status": "no_release_published", "methodology_version": None}


@app.get("/api/v1/health", tags=["system"])
def health() -> dict[str, Any]:
    manifest = release_manifest()
    return {
        "status": "ok",
        "release_status": manifest.get("status"),
        "release_id": manifest.get("release_id"),
    }


@app.get("/api/v1/releases", tags=["system"])
def releases() -> list[dict[str, Any]]:
    return read_artifact("releases.json")


@app.get("/api/v1/metadata", tags=["system"])
def metadata() -> dict[str, Any]:
    return read_artifact("metadata.json")


@app.get("/api/v1/occupations", tags=["occupations"])
def occupations(
    search: str = Query(default="", max_length=100),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
) -> dict[str, Any]:
    records = read_artifact("occupations.json")
    query = search.casefold().strip()
    selected = [
        row
        for row in records
        if not query
        or query in str(row.get("title", "")).casefold()
        or query in str(row.get("code", "")).casefold()
    ]
    return {
        "items": selected[offset : offset + limit],
        "total": len(selected),
        "limit": limit,
        "offset": offset,
        "release_id": release_manifest().get("release_id"),
    }


@app.get("/api/v1/occupations/{occupation_id}", tags=["occupations"])
def occupation(occupation_id: str) -> dict[str, Any]:
    records = read_artifact("occupations.json")
    match = next((row for row in records if row.get("id") == occupation_id), None)
    if match is None:
        raise HTTPException(
            status_code=404,
            detail={
                "code": "occupation_not_found",
                "message": "No published occupation matches this identifier.",
            },
        )
    return match


@app.get("/api/v1/transitions", tags=["transitions"])
def transitions(
    origin: str | None = None,
    destination: str | None = None,
    limit: int = Query(default=100, ge=1, le=5000),
) -> dict[str, Any]:
    records = read_artifact("transitions.json")
    items = [
        row
        for row in records
        if (origin is None or row.get("origin_id") == origin)
        and (destination is None or row.get("destination_id") == destination)
    ]
    return {
        "items": items[:limit],
        "total": len(items),
        "release_id": release_manifest().get("release_id"),
    }


@app.get("/api/v1/network", tags=["network"])
def network(limit: int = Query(default=1000, ge=1, le=5000)) -> dict[str, Any]:
    data = read_artifact("network.json")
    return {
        "nodes": data.get("nodes", [])[:limit],
        "edges": data.get("edges", [])[:limit],
        "release_id": release_manifest().get("release_id"),
        "evidence_types": ["observed_transition", "profile_similarity"],
    }


@app.get("/api/v1/projections", tags=["labor-market"])
def projections(
    search: str = Query(default="", max_length=100), limit: int = Query(default=100, ge=1, le=500)
) -> dict[str, Any]:
    records = read_artifact("projections.json")
    query = search.casefold().strip()
    items = [
        row
        for row in records
        if not query
        or query in str(row.get("title", "")).casefold()
        or query in str(row.get("code", "")).casefold()
    ]
    return {
        "items": items[:limit],
        "total": len(items),
        "release_id": release_manifest().get("release_id"),
        "reference_period": "2025–2035",
    }


@app.get("/api/v1/skills", tags=["skills"])
def skills(
    occupation_id: str = Query(min_length=1, max_length=32),
    dimension: str | None = Query(default=None, max_length=40),
    limit: int = Query(default=200, ge=1, le=1000),
    offset: int = Query(default=0, ge=0),
) -> dict[str, Any]:
    return query_skills(occupation_id, dimension, limit, offset)


def query_skills(
    occupation_id: str, dimension: str | None, limit: int, offset: int
) -> dict[str, Any]:
    path = RELEASE_DIR / "skills.parquet"
    if not path.is_file() or RELEASE_DIR not in path.resolve().parents:
        raise HTTPException(
            status_code=503,
            detail={
                "code": "dataset_not_published",
                "message": "No validated occupational profile artifact is published for this view.",
            },
        )
    quoted_path = str(path).replace("'", "''")
    where = "occupation_id = ?"
    params: list[Any] = [occupation_id]
    if dimension:
        where += " AND dimension = ?"
        params.append(dimension)
    with duckdb.connect(database=":memory:", read_only=False) as connection:
        total = connection.execute(
            f"SELECT count(*) FROM read_parquet('{quoted_path}') WHERE {where}", params
        ).fetchone()[0]
        cursor = connection.execute(
            f"SELECT * FROM read_parquet('{quoted_path}') WHERE {where} ORDER BY dimension, element_id, scale_id LIMIT ? OFFSET ?",
            [*params, limit, offset],
        )
        columns = [item[0] for item in cursor.description]
        rows = [dict(zip(columns, row, strict=True)) for row in cursor.fetchall()]
    return {
        "items": rows,
        "total": total,
        "limit": limit,
        "offset": offset,
        "release_id": release_manifest().get("release_id"),
    }


@app.get("/api/v1/occupations/{occupation_id}/skills", tags=["skills"])
def occupation_skills(
    occupation_id: str,
    dimension: str | None = Query(default=None, max_length=40),
    limit: int = Query(default=200, ge=1, le=1000),
    offset: int = Query(default=0, ge=0),
) -> dict[str, Any]:
    return query_skills(occupation_id, dimension, limit, offset)


@app.get("/api/v1/quality", tags=["research"])
def quality() -> dict[str, Any]:
    return read_artifact("quality.json")


@app.get("/api/v1/methodology", tags=["research"])
def methodology() -> dict[str, Any]:
    return read_artifact("methodology.json")


@app.get("/api/v1/sources", tags=["research"])
def sources() -> dict[str, Any]:
    return read_artifact("sources.json")
