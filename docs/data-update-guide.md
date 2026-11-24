# Data update guide

1. Review the publisher's new release notes and license.
2. Update source URLs, expected version, and schema identifier in the pipeline configuration.
3. Download into a clean environment and retain raw checksums/manifests.
4. Inspect actual questionnaire, file layouts, coding, weights, and crosswalk changes.
5. Update versioned parsers and rerun deterministic validation.
6. Recompute estimates only with the documented variance procedure for the wave.
7. Compare outputs against official benchmark tables where available.
8. Review suppression, mapping coverage, and release comparability.
9. Publish an immutable release only after reports pass review.

When additional survey waves are added, assess questionnaire, population, occupation coding, and weight comparability before making historical comparisons. Do not pool or interpolate waves by default, and keep raw counts distinct from weighted population estimates.
