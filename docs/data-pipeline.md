# Data pipeline

The pipeline in `scripts/data_pipeline.py` acquires source files, validates their release-specific layouts, transforms supported tables, estimates CPS transition cells, and publishes immutable release artifacts.

## Commands

Run the supported partial-release workflow:

```bash
make data-download
make data-validate
make data-process
make data-estimate
make data-publish
```

`make data-download` attempts all registered sources. CPS and O\*NET are required for the current release. A BLS download failure is recorded as an unavailable optional source and does not prevent the other datasets from downloading. Commands exit with an error if a required source is unavailable or fails validation.

`make data-validate` checks the CPS gzip container and fixed-width records, tabular schemas in the O*NET archive, and workbook structure for BLS when available. `make data-process` transforms the O*NET occupation table and six profile dimensions into JSON and Parquet. `make data-estimate` creates weighted retrospective CPS occupation cells with `PWTENWGT`. `make data-publish` copies available artifacts into a new immutable release and updates `data/releases/current` after generation succeeds.

The CPS parser and estimators are described in [statistical methodology](statistical-methodology.md). Replicate-weight standard errors are unavailable until the official replicate file is acquired and joined. CPS occupation codes are not joined to O\*NET-SOC in the current release.

## Provenance and generated files

`data/manifests/` records source identifiers, publishers, release versions, reference periods, file checksums, and validation states. Validation reports are generated in `data/interim/validation/`. Raw, interim, processed, and release artifacts are excluded from Git because they are reproducible data products and may have separate distribution terms.

Release directories are immutable. Re-running publication produces a new release identifier from its inputs and outputs; it does not edit an existing release. The API reads the current release by default or an explicit path set with `CTM_RELEASE_DIR`.

Network graph construction and occupational embeddings are not implemented in this release. Their command entry points report that status rather than generating unsupported artifacts.
