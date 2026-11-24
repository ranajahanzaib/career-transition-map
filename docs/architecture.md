# Architecture

The repository separates source acquisition, analytical artifacts, a read-only FastAPI service, and a Next.js App Router client.

```text
official releases → immutable data/raw → validation reports → versioned analytical release
                                                               ↓
                                                    FastAPI read-only API
                                                               ↓
                                                Next.js research interface
```

`data/releases/current` is the API's default artifact directory. A deployment can point `CTM_RELEASE_DIR` at an immutable versioned release directory and update the symlink only after validation. The API does not expose raw respondent files. Release manifests identify the data release and current methodology version; parser, crosswalk, and visualization algorithms are not independently versioned in this release.

The API reads versioned JSON aggregates and queries profile ratings from Parquet through DuckDB. This keeps the current release self-contained without a separate database server or message broker.

The web client reports unavailable analyses explicitly and uses tables for the published transition cells and profile ratings. The homepage's network art is marked illustrative and contains no research estimates.
