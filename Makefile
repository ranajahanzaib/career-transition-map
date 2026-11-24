.PHONY: setup data-download data-validate data-process data-estimate data-build-graphs data-build-embeddings data-publish data-rebuild test dev api

setup:
	corepack pnpm install --frozen-lockfile
	UV_CACHE_DIR=.cache/uv uv sync --locked --extra dev

data-download:
	UV_CACHE_DIR=.cache/uv uv run python scripts/data_pipeline.py download

data-validate:
	UV_CACHE_DIR=.cache/uv uv run python scripts/data_pipeline.py validate

data-process:
	UV_CACHE_DIR=.cache/uv uv run python scripts/data_pipeline.py process

data-estimate:
	UV_CACHE_DIR=.cache/uv uv run python scripts/data_pipeline.py estimate

data-build-graphs:
	UV_CACHE_DIR=.cache/uv uv run python scripts/data_pipeline.py graphs

data-build-embeddings:
	UV_CACHE_DIR=.cache/uv uv run python scripts/data_pipeline.py embeddings

data-publish:
	UV_CACHE_DIR=.cache/uv uv run python scripts/data_pipeline.py publish

data-rebuild: data-download data-validate data-process data-estimate data-publish

test:
	UV_CACHE_DIR=.cache/uv uv run pytest
	corepack pnpm exec tsc --noEmit

dev:
	corepack pnpm dev

api:
	UV_CACHE_DIR=.cache/uv uv run uvicorn services.api.app.main:app --reload --env-file .env.local --port 8000
