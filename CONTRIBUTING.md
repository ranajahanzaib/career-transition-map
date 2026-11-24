# Contributing

Contributions that improve data quality, documentation, accessibility, or the research interface are welcome.

## Development setup

Install the required tools listed in the [README](README.md), then run:

```bash
make setup
```

Use separate terminals for `make dev` and `make api`. Copy `.env.example` to `.env.local` to configure local API and release paths. Do not commit credentials, local environment files, raw survey records, or generated release data.

## Changes and review

- Keep source observations, derived estimates, and visual encodings distinguishable.
- Preserve source provenance and update the relevant methodology or data documentation when definitions change.
- Include or update tests for parser, estimator, API, and user-visible behavior changes.
- Run `make test`, `UV_CACHE_DIR=.cache/uv uv run ruff check scripts services pipelines tests`, and `corepack pnpm build` before opening a pull request.
- Describe the affected data sources, validation performed, and known limitations in the pull request.

Open an issue for a defect or a proposed change that affects methodology, data scope, or public API behavior. Pull requests should explain the change and link the related issue when one exists.
