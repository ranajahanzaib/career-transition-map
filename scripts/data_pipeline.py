"""Source acquisition and release validation; no estimate is published by download alone."""

from __future__ import annotations

import csv
import gzip
import hashlib
import io
import json
import os
import shutil
import sys
import tempfile
import time
import urllib.error
import urllib.request
import zipfile
from datetime import UTC, datetime
from pathlib import Path
from urllib.parse import urlparse

import polars as pl
from openpyxl import load_workbook

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "raw"
MANIFESTS = ROOT / "data" / "manifests"
REPORTS = ROOT / "data" / "interim" / "validation"
PROCESSED = ROOT / "data" / "processed"

SOURCES = {
    "cps_dwjt_2026": {
        "dataset_name": "January 2026 Displaced Worker, Employee Tenure, and Occupational Mobility Supplement",
        "publisher": "U.S. Census Bureau",
        "url": "https://www2.census.gov/programs-surveys/cps/datasets/2026/supp/jan26pub.dat.gz",
        "release_version": "January 2026 public-use supplement",
        "reference_period": "January 2026; retrospective occupational reference period per questionnaire",
        "documentation_url": "https://www.census.gov/data/datasets/time-series/demo/cps/cps-supp_cps-repwgt/cps-displaced-workers.2026.html",
        "license": "U.S. Census Bureau public-use data; consult source terms and technical documentation",
        "schema_version": "cps-dwjt-2026-record-layout-v1",
    },
    "onet_31_0": {
        "dataset_name": "O*NET Database",
        "publisher": "National Center for O*NET Development",
        "url": "https://www.onetcenter.org/dl_files/database/db_31_0_csv.zip",
        "release_version": "O*NET 31.0",
        "reference_period": "August 2026 release",
        "documentation_url": "https://www.onetcenter.org/db_releases.html",
        "license": "CC BY 4.0; credit the O*NET 31.0 Database and U.S. Department of Labor, Employment and Training Administration; identify adaptations; O*NET® is a USDOL/ETA trademark",
        "schema_version": "onet-tabular-release-31.0",
    },
    "bls_projections_2025_2035": {
        "dataset_name": "Occupational projections and worker characteristics",
        "publisher": "U.S. Bureau of Labor Statistics",
        "url": "https://www.bls.gov/emp/ind-occ-matrix/occupation.xlsx",
        "release_version": "2025 National Employment Matrix",
        "reference_period": "2025 base year to 2035 projections; 2025 wages",
        "documentation_url": "https://www.bls.gov/emp/tables/occupational-projections-and-characteristics.htm",
        "license": "U.S. government public data; consult BLS terms",
        "schema_version": "bls-occupation-projections-2025",
    },
}


def digest(path: Path) -> str:
    sha = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            sha.update(block)
    return sha.hexdigest()


def download_one(dataset: str, spec: dict[str, str]) -> Path:
    RAW.mkdir(parents=True, exist_ok=True)
    MANIFESTS.mkdir(parents=True, exist_ok=True)
    suffix = Path(urlparse(spec["url"]).path).suffix or ".bin"
    target = RAW / f"{dataset}{suffix}"
    manifest_path = MANIFESTS / f"{dataset}.json"
    if target.exists():
        return target
    last_error: Exception | None = None
    for attempt in range(4):
        temporary: Path | None = None
        try:
            request = urllib.request.Request(
                spec["url"],
                headers={"User-Agent": "CareerTransitionMap/0.1 research-data pipeline"},
            )
            with (
                urllib.request.urlopen(request, timeout=90) as response,
                tempfile.NamedTemporaryFile(dir=RAW, delete=False) as tmp,
            ):
                temporary = Path(tmp.name)
                shutil.copyfileobj(response, tmp)
            assert temporary is not None
            os.replace(temporary, target)
            manifest = {
                "dataset_id": dataset,
                **spec,
                "retrieved_at": datetime.now(UTC).isoformat(),
                "file_name": target.name,
                "file_size_bytes": target.stat().st_size,
                "sha256": digest(target),
                "record_count": None,
                "processing_status": "downloaded_not_validated",
            }
            manifest_path.write_text(json.dumps(manifest, indent=2) + "\n")
            print(f"Downloaded {dataset}: {target.stat().st_size:,} bytes")
            return target
        except (urllib.error.URLError, TimeoutError, OSError) as exc:
            last_error = exc
            if temporary is not None:
                temporary.unlink(missing_ok=True)
            time.sleep(2**attempt)
    raise RuntimeError(f"Could not download {dataset} after 4 attempts: {last_error}")


def count_gzip_records(path: Path) -> int:
    with gzip.open(path, "rb") as stream:
        return sum(1 for _ in stream)


def validate_cps(path: Path) -> dict:
    if path.suffix != ".gz":
        return {
            "status": "unsupported_container",
            "message": "Expected the documented .dat.gz public-use file.",
        }
    rows = count_gzip_records(path)
    malformed = 0
    eligible = 0
    valid_transitions = 0
    with gzip.open(path, "rb") as stream:
        for record in stream:
            record = record.rstrip(b"\r\n")
            if len(record) != 1222:
                malformed += 1
                continue
            text = record.decode("ascii")
            if text[1200:1202].strip() == "2":
                eligible += 1
                if text[1176:1178].strip() in {"1", "2"}:
                    valid_transitions += 1
    if rows != 121168 or malformed:
        raise ValueError(f"Unexpected CPS file layout: {rows} records, {malformed} malformed records.")
    return {
        "status": "fixed_width_layout_validated",
        "record_count": rows,
        "record_length": 1222,
        "malformed_record_count": malformed,
        "tenure_mobility_interview_count": eligible,
        "answered_same_work_last_year_count": valid_transitions,
        "message": "Gzip integrity, record length, and documented January 2026 CPS field positions validated.",
    }


def parse_cps_transition_records(path: Path) -> list[dict[str, object]]:
    """Parse the documented CPS Jan 2026 retrospective occupation responses."""
    rows: list[dict[str, object]] = []
    with gzip.open(path, "rb") as stream:
        for line_number, raw in enumerate(stream, 1):
            raw = raw.rstrip(b"\r\n")
            if len(raw) != 1222:
                raise ValueError(f"CPS line {line_number} is not a 1,222-character record.")
            text = raw.decode("ascii")
            if text[1200:1202].strip() != "2":
                continue
            answer = text[1176:1178].strip()
            if answer not in {"1", "2"}:
                continue
            current, previous = text[859:863].strip(), text[1170:1174].strip()
            if answer == "1":
                previous = current
            if not (current.isdigit() and previous.isdigit()):
                continue
            if not (10 <= int(current) <= 9990 and 10 <= int(previous) <= 9990):
                continue
            scaled_weight = text[1202:1212].strip()
            if not scaled_weight.isdigit() or int(scaled_weight) <= 0:
                continue
            rows.append({
                "origin": previous.zfill(4),
                "destination": current.zfill(4),
                "weight": int(scaled_weight) / 10000,
                "eligible": True,
                "occupational_changer": answer == "2",
            })
    return rows


def command_estimate() -> None:
    """Publish weighted CPS cell estimates; replicate variance awaits its file join."""
    sys.path.insert(0, str(ROOT))
    from pipelines.estimation.transitions import TransitionObservation, estimate_transition_cells

    source = RAW / "cps_dwjt_2026.gz"
    if not source.is_file():
        raise RuntimeError("Download the official January 2026 CPS supplement first.")
    observations = [TransitionObservation(**row) for row in parse_cps_transition_records(source)]
    result = estimate_transition_cells(observations)
    output = PROCESSED / "cps-dwjt-2026"
    output.mkdir(parents=True, exist_ok=True)
    (output / "transitions.json").write_text(json.dumps(result, indent=2) + "\n")
    summary = {
        "source_sha256": digest(source),
        "transition_cell_count": len(result),
        "respondent_count": sum(int(row["unweighted_count"]) for row in result),
        "weighted_population_estimate": sum(float(row["weighted_population_estimate"]) for row in result),
        "weight_variable": "PWTENWGT",
        "weight_scale": 10000,
        "reference_period": "January 2025 to January 2026",
        "occupation_classification": "2018 Census occupation codes (crosswalk to O*NET-SOC not applied)",
        "uncertainty_status": "unavailable_replicate_weight_archive_not_downloaded",
    }
    (output / "manifest.json").write_text(json.dumps(summary, indent=2) + "\n")
    print(json.dumps(summary, indent=2))


def validate_onet(path: Path) -> dict:
    with zipfile.ZipFile(path) as archive:
        bad = archive.testzip()
        if bad:
            raise ValueError(f"Corrupt O*NET archive member: {bad}")
        members = [item for item in archive.infolist() if not item.is_dir()]
        headers: dict[str, list[str]] = {}
        counts: dict[str, int] = {}
        malformed: dict[str, int] = {}
        for member in members:
            if member.filename.lower().endswith((".txt", ".csv")):
                with archive.open(member) as raw:
                    text = io.TextIOWrapper(raw, encoding="utf-8-sig", newline="")
                    delimiter = "," if member.filename.lower().endswith(".csv") else "\t"
                    reader = csv.reader(text, delimiter=delimiter, strict=True)
                    header = next(reader, [])
                    bad_rows, count = 0, 0
                    for row in reader:
                        if not row or all(not field.strip() for field in row):
                            continue
                        count += 1
                        if len(row) != len(header):
                            bad_rows += 1
                    headers[member.filename] = header
                    counts[member.filename] = count
                    malformed[member.filename] = bad_rows
        if any(malformed.values()):
            raise ValueError(f"O*NET source has rows that do not match their headers: {malformed}")
        return {
            "status": "archive_and_tabular_schemas_validated",
            "file_count": len(members),
            "tables": {
                name: {
                    "header": headers.get(name, []),
                    "record_count": counts.get(name),
                    "malformed_record_count": malformed.get(name, 0),
                }
                for name in headers
            },
        }


def validate_bls(path: Path) -> dict:
    workbook = load_workbook(path, read_only=True, data_only=True)
    sheets = []
    for sheet in workbook.worksheets:
        rows = sheet.iter_rows(values_only=True)
        first = next(rows, ())
        count = 1 + sum(1 for _ in rows) if first else 0
        sheets.append(
            {
                "name": sheet.title,
                "row_count_including_header": count,
                "first_row": [str(value) if value is not None else None for value in first],
            }
        )
    workbook.close()
    return {"status": "workbook_readable_schema_review_required", "sheets": sheets}


def command_validate() -> None:
    validators = {
        "cps_dwjt_2026": validate_cps,
        "onet_31_0": validate_onet,
        "bls_projections_2025_2035": validate_bls,
    }
    REPORTS.mkdir(parents=True, exist_ok=True)
    report = {
        "generated_at": datetime.now(UTC).isoformat(),
        "pipeline_version": "0.1.0",
        "datasets": {},
    }
    for dataset, spec in SOURCES.items():
        path = RAW / f"{dataset}{Path(urlparse(spec['url']).path).suffix}"
        if not path.exists():
            manifest_path = MANIFESTS / f"{dataset}.json"
            prior = json.loads(manifest_path.read_text()) if manifest_path.exists() else {}
            report["datasets"][dataset] = {
                "status": prior.get("processing_status", "not_acquired"),
                "source_url": spec["url"],
                "error": None,
            }
            continue
        result = validators[dataset](path)
        report["datasets"][dataset] = {
            **result,
            "file_size_bytes": path.stat().st_size,
            "sha256": digest(path),
        }
        manifest_path = MANIFESTS / f"{dataset}.json"
        manifest = (
            json.loads(manifest_path.read_text())
            if manifest_path.exists()
            else {"dataset_id": dataset, **spec}
        )
        manifest["record_count"] = result.get("record_count")
        manifest["record_count_kind"] = (
            "physical_line_count_not_eligible_respondents" if dataset == "cps_dwjt_2026" else None
        )
        if "tables" in result:
            manifest["table_record_counts"] = {
                name: table["record_count"] for name, table in result["tables"].items()
            }
            manifest["record_count"] = sum(manifest["table_record_counts"].values())
            manifest["record_count_kind"] = (
                "rows_across_release_tables_including_nonanalytic_reference_tables"
            )
        manifest["processing_status"] = result["status"]
        manifest["validation_report"] = str((REPORTS / "latest.json").relative_to(ROOT))
        manifest_path.write_text(json.dumps(manifest, indent=2) + "\n")
    (REPORTS / "latest.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))


def command_download() -> None:
    failures = []
    for dataset, spec in SOURCES.items():
        try:
            download_one(dataset, spec)
        except RuntimeError as exc:
            failures.append(dataset)
            MANIFESTS.mkdir(parents=True, exist_ok=True)
            (MANIFESTS / f"{dataset}.json").write_text(
                json.dumps(
                    {
                        "dataset_id": dataset,
                        **spec,
                        "file_name": None,
                        "file_size_bytes": None,
                        "sha256": None,
                        "record_count": None,
                        "processing_status": "not_acquired",
                        "error": str(exc),
                    },
                    indent=2,
                )
                + "\n"
            )
            print(str(exc), file=sys.stderr)
    required_failures = [name for name in failures if name in {"cps_dwjt_2026", "onet_31_0"}]
    if required_failures:
        raise RuntimeError(
            "Required sources could not be downloaded: " + ", ".join(required_failures)
        )


def command_process() -> None:
    report_path = REPORTS / "latest.json"
    if not report_path.exists():
        raise RuntimeError("Run data-validate before processing.")
    report = json.loads(report_path.read_text())
    onet = report["datasets"].get("onet_31_0", {})
    if onet.get("status") != "archive_and_tabular_schemas_validated":
        raise RuntimeError("O*NET source schema has not passed archive and table validation.")
    archive_path = RAW / "onet_31_0.zip"
    output = PROCESSED / "onet-31.0"
    output.mkdir(parents=True, exist_ok=True)
    expected = {
        "essential_skills.csv": "essential_skills",
        "transferable_skills.csv": "transferable_skills",
        "knowledge.csv": "knowledge",
        "abilities.csv": "abilities",
        "work_activities.csv": "work_activities",
        "work_context.csv": "work_context",
    }
    with zipfile.ZipFile(archive_path) as archive:
        names = {
            Path(name).name.casefold(): name
            for name in archive.namelist()
            if not name.endswith("/")
        }
        occupation_name = names.get("occupation_data.csv")
        if not occupation_name:
            raise ValueError(
                "O*NET release does not contain the expected occupation_data.csv table."
            )
        scale_name = names.get("scales_reference.csv")
        if not scale_name:
            raise ValueError("O*NET release is missing scales_reference.csv.")
        with archive.open(scale_name) as raw:
            scales = pl.read_csv(raw, infer_schema_length=10000)
        if not {"Scale ID", "Minimum", "Maximum"}.issubset(scales.columns):
            raise ValueError(f"Unexpected O*NET scale reference schema: {scales.columns}")
        scales = scales.select(
            pl.col("Scale ID").cast(pl.String).alias("scale_id"),
            pl.col("Minimum").cast(pl.Float64, strict=False).alias("scale_minimum"),
            pl.col("Maximum").cast(pl.Float64, strict=False).alias("scale_maximum"),
        )
        occupations = []
        with archive.open(occupation_name) as raw:
            reader = csv.DictReader(io.TextIOWrapper(raw, encoding="utf-8-sig", newline=""))
            required = {"O*NET-SOC Code", "Title", "Description"}
            if not required.issubset(reader.fieldnames or []):
                raise ValueError(f"Unexpected O*NET occupation schema: {reader.fieldnames}")
            for row in reader:
                code, title = row["O*NET-SOC Code"].strip(), row["Title"].strip()
                if not code or not title:
                    raise ValueError(
                        "O*NET occupation row is missing its code or title; no row was discarded."
                    )
                occupations.append(
                    {
                        "id": code,
                        "code": code,
                        "title": title,
                        "description": row["Description"].strip(),
                        "classification": "O*NET-SOC",
                        "release": "31.0",
                    }
                )
        rating_frames = []
        for filename, dimension in expected.items():
            archive_name = names.get(filename)
            if not archive_name:
                raise ValueError(f"O*NET release is missing required rating table {filename}.")
            with archive.open(archive_name) as raw:
                frame = pl.read_csv(raw, infer_schema_length=10000, null_values=[""])
            required = {
                "O*NET-SOC Code",
                "Element ID",
                "Element Name",
                "Scale ID",
                "Scale Name",
                "Data Value",
            }
            if not required.issubset(frame.columns):
                raise ValueError(f"Unexpected O*NET rating schema for {filename}: {frame.columns}")
            frame = frame.with_columns(pl.col("Scale ID").cast(pl.String)).join(
                scales, left_on="Scale ID", right_on="scale_id", how="left"
            )
            optional_fields = {
                "N": "sample_n",
                "Standard Error": "standard_error",
                "Lower CI Bound": "lower_ci_bound",
                "Upper CI Bound": "upper_ci_bound",
            }
            select_exprs = [
                pl.col("O*NET-SOC Code").cast(pl.String).alias("occupation_id"),
                pl.lit(dimension).alias("dimension"),
                pl.col("Element ID").cast(pl.String).alias("element_id"),
                pl.col("Element Name").cast(pl.String).alias("element_name"),
                pl.col("Scale ID").cast(pl.String).alias("scale_id"),
                pl.col("Scale Name").cast(pl.String).alias("scale_name"),
                pl.col("scale_minimum"),
                pl.col("scale_maximum"),
                pl.col("Data Value").cast(pl.Float64, strict=False).alias("value"),
                pl.col("Date").cast(pl.String).alias("date")
                if "Date" in frame.columns
                else pl.lit(None, dtype=pl.String).alias("date"),
                pl.col("Domain Source").cast(pl.String).alias("domain_source")
                if "Domain Source" in frame.columns
                else pl.lit(None, dtype=pl.String).alias("domain_source"),
                pl.col("Recommend Suppress").cast(pl.String).alias("recommend_suppress")
                if "Recommend Suppress" in frame.columns
                else pl.lit(None, dtype=pl.String).alias("recommend_suppress"),
                pl.col("Not Relevant").cast(pl.String).alias("not_relevant")
                if "Not Relevant" in frame.columns
                else pl.lit(None, dtype=pl.String).alias("not_relevant"),
                pl.lit("31.0").alias("release"),
            ]
            for source, target in optional_fields.items():
                select_exprs.append(
                    pl.col(source).cast(pl.Float64, strict=False).alias(target)
                    if source in frame.columns
                    else pl.lit(None, dtype=pl.Float64).alias(target)
                )
            rating_frames.append(frame.select(select_exprs))
    ratings = pl.concat(rating_frames, how="vertical_relaxed")
    valid_codes = {item["id"] for item in occupations}
    unmatched = ratings.filter(~pl.col("occupation_id").is_in(valid_codes)).height
    if unmatched:
        raise ValueError(
            f"O*NET rating rows refer to {unmatched} occupation codes absent from the occupation table."
        )
    (output / "occupations.json").write_text(json.dumps(occupations, ensure_ascii=False) + "\n")
    ratings.write_parquet(output / "skills.parquet", compression="zstd", statistics=True)
    result = {
        "dataset_id": "onet_31_0",
        "release": "31.0",
        "source_sha256": digest(archive_path),
        "occupation_count": len(occupations),
        "profile_rating_count": ratings.height,
        "dimensions": sorted(expected.values()),
        "processing_status": "processed_unpublished",
        "profile_file": "skills.parquet",
        "profile_sha256": digest(output / "skills.parquet"),
        "methodology_note": "Raw O*NET scale values preserved; importance and level have not been normalized or substituted.",
    }
    (output / "manifest.json").write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps(result, indent=2))


def command_not_ready(name: str) -> None:
    raise RuntimeError(
        f"{name} is not part of the current release because its source artifacts and validated methods are not available."
    )


def command_publish() -> None:
    processed = PROCESSED / "onet-31.0"
    required = (
        processed / "occupations.json",
        processed / "skills.parquet",
        processed / "manifest.json",
    )
    if not all(path.is_file() for path in required):
        raise RuntimeError(
            "Process the validated O*NET release before publishing occupational profiles."
        )
    cps_processed = PROCESSED / "cps-dwjt-2026"
    transitions_path = cps_processed / "transitions.json"
    if transitions_path.is_file():
        transitions_manifest = json.loads((cps_processed / "manifest.json").read_text())
    else:
        transitions_manifest = None
    validation_path = REPORTS / "latest.json"
    if not validation_path.is_file():
        raise RuntimeError("Run data-validate before publication.")
    validation = json.loads(validation_path.read_text())
    onet_manifest = json.loads((processed / "manifest.json").read_text())
    sources = []
    for dataset, spec in SOURCES.items():
        raw_manifest_path = MANIFESTS / f"{dataset}.json"
        raw_manifest = (
            json.loads(raw_manifest_path.read_text()) if raw_manifest_path.exists() else {}
        )
        source_validation = validation["datasets"].get(dataset, {})
        sources.append(
            {
                "dataset_id": dataset,
                "dataset_name": spec["dataset_name"],
                "publisher": spec["publisher"],
                "release_version": spec["release_version"],
                "reference_period": spec["reference_period"],
                "source_url": spec["url"],
                "license": spec["license"],
                "documentation_url": spec.get("documentation_url"),
                "retrieved_at": raw_manifest.get("retrieved_at"),
                "file_size_bytes": raw_manifest.get("file_size_bytes"),
                "sha256": raw_manifest.get("sha256"),
                "status": (
                    "processed_published"
                    if dataset == "onet_31_0"
                    else "weighted_transition_estimates_published_no_replicate_uncertainty"
                    if dataset == "cps_dwjt_2026" and transitions_manifest
                    else source_validation.get(
                        "status", raw_manifest.get("processing_status", "not_downloaded")
                    )
                ),
                "error": None,
                "record_count": raw_manifest.get("record_count"),
                "record_count_kind": raw_manifest.get("record_count_kind"),
                "validation": source_validation,
            }
        )
    artifact_checksums = {
        "occupations.json": digest(processed / "occupations.json"),
        "skills.parquet": digest(processed / "skills.parquet"),
    }
    if transitions_manifest:
        artifact_checksums["transitions.json"] = digest(transitions_path)
    release_fingerprint = {
        "methodology_version": "0.2.0",
        "sources": [
            {
                "dataset_id": item["dataset_id"],
                "sha256": item["sha256"],
                "status": item["status"],
                "license": item["license"],
            }
            for item in sources
        ],
        "artifacts": artifact_checksums,
    }
    release_hash = hashlib.sha256(
        json.dumps(release_fingerprint, sort_keys=True, separators=(",", ":")).encode()
    ).hexdigest()[:16]
    release_id = f"ctm-v0.2.0-{release_hash}"
    release_root = ROOT / "data" / "releases"
    release_root.mkdir(parents=True, exist_ok=True)
    release = release_root / release_id
    if release.exists():
        existing = json.loads((release / "manifest.json").read_text())
        if existing.get("artifact_checksums") != artifact_checksums:
            raise FileExistsError(f"Immutable release ID collision: {release_id}.")
        current = release_root / "current"
        link_temp = release_root / ".current-new"
        link_temp.unlink(missing_ok=True)
        os.symlink(release_id, link_temp)
        os.replace(link_temp, current)
        print(json.dumps(existing, indent=2))
        return
    staging = Path(tempfile.mkdtemp(prefix=f".{release_id}-", dir=release_root))
    try:
        shutil.copy2(processed / "occupations.json", staging / "occupations.json")
        shutil.copy2(processed / "skills.parquet", staging / "skills.parquet")
        if transitions_manifest:
            shutil.copy2(transitions_path, staging / "transitions.json")
        manifest = {
            "release_id": release_id,
            "status": "partial",
            "created_at": datetime.now(UTC).isoformat(),
            "available_datasets": ["onet_31_0"] + (["cps_dwjt_2026"] if transitions_manifest else []),
            "unavailable_datasets": ([] if transitions_manifest else ["cps_dwjt_2026"]) + ["bls_projections_2025_2035"],
            "occupation_count": onet_manifest["occupation_count"],
            "profile_rating_count": onet_manifest["profile_rating_count"],
            "methodology_version": "0.2.0",
            "source_checksums": {s["dataset_id"]: s["sha256"] for s in sources},
            "artifact_checksums": artifact_checksums,
        }
        if transitions_manifest:
            manifest["transition_cell_count"] = transitions_manifest["transition_cell_count"]
            manifest["transition_uncertainty_status"] = transitions_manifest["uncertainty_status"]
        quality = {
            "release_id": release_id,
            "generated_at": validation["generated_at"],
            "pipeline_version": validation["pipeline_version"],
            "source_checks": validation["datasets"],
            "published_profile": {
                "occupation_count": onet_manifest["occupation_count"],
                "profile_rating_count": onet_manifest["profile_rating_count"],
                "dimensions": onet_manifest["dimensions"],
            },
            "published_transitions": (
                {
                    "cell_count": transitions_manifest["transition_cell_count"],
                    "respondent_count": transitions_manifest["respondent_count"],
                    "uncertainty_status": transitions_manifest["uncertainty_status"],
                    "weight_variable": transitions_manifest["weight_variable"],
                }
                if transitions_manifest
                else None
            ),
        }
        (staging / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
        (staging / "metadata.json").write_text(json.dumps(manifest, indent=2) + "\n")
        (staging / "releases.json").write_text(json.dumps([manifest], indent=2) + "\n")
        (staging / "sources.json").write_text(
            json.dumps({"items": sources, "release_id": release_id}, indent=2) + "\n"
        )
        (staging / "quality.json").write_text(json.dumps(quality, indent=2) + "\n")
        os.replace(staging, release)
        current = release_root / "current"
        link_temp = release_root / ".current-new"
        link_temp.unlink(missing_ok=True)
        os.symlink(release_id, link_temp)
        os.replace(link_temp, current)
    except Exception:
        shutil.rmtree(staging, ignore_errors=True)
        raise
    print(json.dumps(manifest, indent=2))


def main() -> None:
    commands = {
        "download": command_download,
        "validate": command_validate,
        "process": command_process,
        "estimate": command_estimate,
        "graphs": lambda: command_not_ready("Network construction"),
        "embeddings": lambda: command_not_ready("Occupational embeddings"),
        "publish": command_publish,
    }
    if len(sys.argv) != 2 or sys.argv[1] not in commands:
        raise SystemExit(f"Usage: {Path(sys.argv[0]).name} {{{','.join(commands)}}}")
    commands[sys.argv[1]]()


if __name__ == "__main__":
    main()
