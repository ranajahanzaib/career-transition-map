# Statistical methodology

## Transition cells

For eligible respondents with valid origin and destination occupations, the weighted cell total is `T(a,b) = Σᵢ wᵢ I(originᵢ=a, destinationᵢ=b)`. The weight must be the supplement weight documented for that release. Record counts and weighted population totals are separate values.

The origin-cohort share divides `T(a,b)` by all eligible weighted observations originating in `a`, including justified retention observations. The mover-only destination share divides by eligible weighted changers from `a`. Each chart must identify its denominator. Neither measure is an unconditional probability for everyone who has ever worked in `a`.

## January 2026 CPS implementation

The parser uses the January 2026 CPS fixed-width supplement layout. It selects records with `PRTENSAT = 2`, a valid `PEST20` answer, valid current primary occupation `PTIO1OCD`, valid prior occupation `PES2OCD` when the respondent reports different work, and a positive `PWTENWGT`. A “same kind of work” answer uses the current occupation for both ends. A “different kind” answer uses the prior-year occupation from `PES2OCD`. Weight values have four implied decimals and are divided by 10,000. This is a retrospective January-to-January estimate, not a longitudinal matched-person panel.

Occupation IDs are 2018 Census occupation codes. The official documentation provides their 2018 SOC equivalents, but this release does not yet include the verified crosswalk to O*NET-SOC. Consequently transition codes are not joined to the O*NET atlas.

## Variance

The documented method is Fay-modified balanced repeated replication using 160 replicate weights and Fay factor `k = 0.5`. The replicate-weight file has not been acquired and joined, so replicate estimates and confidence intervals are unavailable. Once the records are joined, recompute each ratio for every replicate and calculate `Var(θ) = (4 / 160) × Σᵣ(θᵣ − θ)²`; the standard error is the square root of that variance. Here `θ` is the full-sample estimate and `θᵣ` is the estimate from replicate `r`. A simple-random-sample standard error is not an appropriate substitute.

## Publication policy

Official suppression rules and project-defined cell-support policies must be reported separately. A missing or suppressed estimate is not evidence that a transition never occurs. A reliability threshold must be documented and versioned before release.

See the [Census January 2026 technical documentation](https://www2.census.gov/programs-surveys/cps/techdocs/cpsjan26.pdf) and the [official replicate-weight layout](https://www2.census.gov/programs-surveys/cps/datasets/2026/supp/cps_tenure_repwgt_jan26.sas) for source-specific details.
