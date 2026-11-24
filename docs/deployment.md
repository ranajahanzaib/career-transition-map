# Deployment

Deploy the Next.js frontend and FastAPI service independently. Set `NEXT_PUBLIC_API_URL` at frontend build time. Configure `CTM_RELEASE_DIR` and an explicit `CTM_CORS_ORIGINS` allowlist in the API environment. Terminate TLS at the hosting layer and expose only the aggregate API. Raw CPS files are not required by the running API and should not be mounted into a public application container.

The API responds to `/api/v1/health` even before a release exists. Data endpoints return HTTP 503 with `dataset_not_published` until the required artifact is present. Publish immutable, validated release directories and switch the configured current release atomically. The current data release is partial: it does not include replicate-weight uncertainty, validated CPS-to-O\*NET crosswalks, or BLS projections and wage measures.
