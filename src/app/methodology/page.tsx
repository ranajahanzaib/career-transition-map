import { VisualShell } from "../_visual-shell";

const sections = [
  [
    "Population and observation window",
    "The CPS mobility supplement asks respondents about work at two retrospective reference points. Its eligible population and questionnaire skips determine who contributes to a transition estimate. It does not observe every intermediate job change, and it does not describe unconditional career probabilities for all people who ever held an occupation.",
  ],
  [
    "Transitions and retention",
    "The January 2026 CPS measure asks whether an employed respondent did the same kind of work a year earlier. A same-work answer uses the current occupation at both ends; a different-work answer uses the reported prior-year occupation and current primary occupation.",
  ],
  [
    "Survey weights and uncertainty",
    "The current cells use the CPS job-tenure and occupational-mobility supplement weight, PWTENWGT, with its four implied decimal places. Origin-cohort shares include valid same-work responses; mover-only shares use responses reporting different work. Standard errors and intervals are not available because the replicate-weight records have not been joined.",
  ],
  [
    "Classification harmonization",
    "Census occupation codes, SOC, O*NET-SOC, and National Employment Matrix codes are not interchangeable. Ambiguous one-to-many mappings are not expanded into duplicated worker weights or assigned to a first-match occupation.",
  ],
  [
    "Skills and profile similarity",
    "O*NET importance and level ratings describe different constructs and remain separate. A profile similarity score compares occupational requirements; it does not measure an individual worker's skills or readiness.",
  ],
  [
    "Network and constructed pathways",
    "Observed transition edges and profile-similarity edges are separate evidence types. Multi-step paths are constructed sequences of supported edges, not empirical evidence that a worker followed that exact route.",
  ],
  [
    "Wages and projections",
    "BLS median wages have a stated reference year, scope, and occupation classification. Long-range employment projections are modeled estimates; annual occupational openings are not current job vacancies.",
  ],
  [
    "Historical comparison and suppression",
    "Survey waves are compared only after questionnaire, population, classification, and weight compatibility checks. Missing waves are not interpolated.",
  ],
];

export default function Page() {
  return (
    <VisualShell active="methodology">
      <section className="unavailable-heading">
        <div>
          <div className="uv-eyebrow">
            <i /> RESEARCH FRAMEWORK <span>STATISTICAL RULES</span>
          </div>
          <h1>Methodology &amp; Standards</h1>
          <p>
            Dataset-specific inclusion rules, denominators, uncertainty methods,
            crosswalks, and version details governing all published measures.
          </p>
        </div>
        <div className="uv-status">
          <i /> EVIDENCE STANDARDS
        </div>
      </section>
      <div style={{ margin: "0 30px 40px" }}>
        <div className="workspace">
          <div className="workspace-head">
            <h2>RELEASE CTM v0.2 · RESEARCH RULES</h2>
            <span className="status-pill">
              WEIGHTED ESTIMATES · UNCERTAINTY UNAVAILABLE
            </span>
          </div>
          {sections.map(([title, body], i) => (
            <section
              className="method-section"
              id={`method-${i + 1}`}
              key={title}
            >
              <h2>{title}</h2>
              <p>{body}</p>
              {i === 2 && (
                <div className="formula">
                  T(a→b) = Σᵢ wᵢ · 1(originᵢ=a, destinationᵢ=b)
                  <br />
                  Origin share = T(a→b) / eligible weighted total(a)
                  <br />
                  Mover share = T(a→b) / eligible weighted changers(a)
                </div>
              )}
            </section>
          ))}
        </div>
      </div>
    </VisualShell>
  );
}
