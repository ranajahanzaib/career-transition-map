"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { VisualShell } from "../_visual-shell";

type Cell = {
  origin_id: string;
  destination_id: string;
  unweighted_count: number;
  weighted_population_estimate: number;
  origin_cohort_share: number | null;
  mover_only_destination_share: number | null;
  uncertainty_status: string;
};
const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export default function Page() {
  const [cells, setCells] = useState<Cell[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch(`${api}/transitions?limit=5000`)
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok)
          throw new Error(
            body?.detail?.message ?? "No transition release is published.",
          );
        setCells(body.items ?? []);
      })
      .catch((reason) =>
        setError(
          reason instanceof Error
            ? reason.message
            : "Transition data could not be loaded.",
        ),
      )
      .finally(() => setLoading(false));
  }, []);
  const filtered = useMemo(() => {
    const q = query.trim();
    return cells
      .filter(
        (cell) =>
          !q || cell.origin_id.includes(q) || cell.destination_id.includes(q),
      )
      .sort(
        (a, b) =>
          b.weighted_population_estimate - a.weighted_population_estimate,
      );
  }, [cells, query]);
  return (
    <VisualShell active="matrix">
      <section className="unavailable-heading">
        <div>
          <div className="uv-eyebrow">
            <i /> RESEARCH VISUALIZATION{" "}
            <span>UNITED STATES · CPS JAN 2026</span>
          </div>
          <h1>Transition Matrix</h1>
          <p>
            Observed retrospective occupation changes between January 2025 and
            January 2026. The origin cohort and mover-only shares use distinct
            denominators.
          </p>
        </div>
        <div className="uv-status">
          <i /> WEIGHTED ESTIMATES · NO INTERVALS
        </div>
      </section>
      <section className="matrix-workspace">
        <div className="matrix-toolbar">
          <label>
            Filter 2018 Census occupation codes{" "}
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="e.g. 1010"
              aria-label="Filter occupation codes"
            />
          </label>
          <span>
            {loading
              ? "Loading estimates…"
              : `${filtered.length.toLocaleString()} of ${cells.length.toLocaleString()} cells`}
          </span>
        </div>
        {error ? (
          <div className="uv-empty">
            <h2>Transition data is unavailable.</h2>
            <p>{error}</p>
            <Link href="/sources">Review source status →</Link>
          </div>
        ) : (
          <>
            <div className="matrix-warning">
              Weighted CPS estimate · PWTENWGT · n is the unweighted response
              count. Replicate-weight confidence intervals are not available in
              this release.
            </div>
            <div className="matrix-table-wrap">
              <table className="matrix-table">
                <thead>
                  <tr>
                    <th>Origin code</th>
                    <th>Destination code</th>
                    <th>Weighted estimate</th>
                    <th>Origin cohort share</th>
                    <th>Mover-only share</th>
                    <th>Responses</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((cell) => (
                    <tr key={`${cell.origin_id}-${cell.destination_id}`}>
                      <td>{cell.origin_id}</td>
                      <td>{cell.destination_id}</td>
                      <td>
                        {Math.round(
                          cell.weighted_population_estimate,
                        ).toLocaleString()}
                      </td>
                      <td>
                        {cell.origin_cohort_share == null
                          ? "—"
                          : `${(cell.origin_cohort_share * 100).toFixed(1)}%`}
                      </td>
                      <td>
                        {cell.mover_only_destination_share == null
                          ? "—"
                          : `${(cell.mover_only_destination_share * 100).toFixed(1)}%`}
                      </td>
                      <td>{cell.unweighted_count.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="matrix-footnote">
              Occupation codes use the 2018 Census classification. They are not
              joined to O*NET-SOC occupations. Estimates describe respondents
              who reported the same or different kind of work a year earlier and
              have valid occupation codes; they do not cover all workers ever
              employed in the origin occupation.
            </p>
          </>
        )}
      </section>
    </VisualShell>
  );
}
