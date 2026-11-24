# Data dictionary

The API exposes only aggregate release artifacts. It does not expose CPS respondent-level records or join keys.

## Transition cells

| Field                          | Meaning                                                                                                                     |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| `origin_id`                    | Four-digit 2018 Census occupation code for the prior-year occupation                                                        |
| `destination_id`               | Four-digit 2018 Census occupation code for the current primary occupation                                                   |
| `unweighted_count`             | Number of valid CPS responses in the cell                                                                                   |
| `weighted_population_estimate` | Sum of `PWTENWGT` for responses in the cell; source values are divided by 10,000                                            |
| `origin_cohort_share`          | Cell estimate divided by all valid weighted observations with the same origin, including retained occupation where reported |
| `origin_cohort_denominator`    | Weighted total used for `origin_cohort_share`                                                                               |
| `mover_only_destination_share` | Cell estimate for respondents reporting different work, divided by all such valid weighted responses with the same origin   |
| `mover_only_denominator`       | Weighted total used for `mover_only_destination_share`                                                                      |
| `unweighted_mover_count`       | Unweighted responses reporting different work in the cell                                                                   |
| `unweighted_mover_only_share`  | Unweighted cell count divided by the origin's responses reporting different work                                            |
| `standard_error`               | `null` until replicate weights are joined and release-specific variance is calculated                                       |
| `confidence_interval`          | `null` until replicate weights are joined and release-specific variance is calculated                                       |
| `uncertainty_status`           | Release-level reason uncertainty is unavailable                                                                             |

The questionnaire asks whether a respondent did the same kind of work a year earlier. This measure is not a matched monthly panel or a complete record of job changes during the year. See [statistical methodology](statistical-methodology.md) for population and inclusion rules.

## Source manifests

| Field               | Meaning                                                                          |
| ------------------- | -------------------------------------------------------------------------------- |
| `dataset_id`        | Stable project identifier for an input release                                   |
| `publisher`         | Official data publisher                                                          |
| `url`               | Source file URL used by the acquisition step                                     |
| `release_version`   | Publisher release identifier                                                     |
| `reference_period`  | Period described by the source                                                   |
| `retrieved_at`      | UTC time when a source file was downloaded, when available                       |
| `file_name`         | Downloaded source file name, when available                                      |
| `file_size_bytes`   | Download size, when available                                                    |
| `sha256`            | Content checksum, when available                                                 |
| `record_count`      | Source record count when established by validation                               |
| `schema_version`    | Expected source schema identifier                                                |
| `license`           | Source license or attribution information                                        |
| `processing_status` | Pipeline validation or processing state; it does not by itself imply publication |
