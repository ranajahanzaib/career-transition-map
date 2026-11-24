"use client";

import { useEffect, useState } from "react";

type Source = {
  dataset_id: string;
  dataset_name: string;
  publisher: string;
  release_version: string;
  reference_period: string;
  source_url: string;
  documentation_url?: string;
  license: string;
  status: string;
  sha256?: string | null;
  file_size_bytes?: number | null;
  record_count?: number | null;
  record_count_kind?: string | null;
};
const api = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1"
).replace(/\/$/, "");

const statusLabels: Record<string, string> = {
  weighted_transition_estimates_published_no_replicate_uncertainty:
    "Published (weighted estimates; replicate uncertainty unavailable)",
  processed_published: "Processed & published",
  not_acquired: "Not acquired (source unavailable)",
};

const countKindLabels: Record<string, string> = {
  physical_line_count_not_eligible_respondents:
    "physical lines (survey records)",
  rows_across_release_tables_including_nonanalytic_reference_tables:
    "source table rows",
};

export function SourcesReport() {
  const [items, setItems] = useState<Source[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`${api}/sources`)
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok)
          throw new Error(
            body?.detail?.message ?? "Source manifest is unavailable.",
          );
        setItems(body.items ?? []);
      })
      .catch((reason) =>
        setError(
          reason instanceof Error
            ? reason.message
            : "Could not reach the source manifest.",
        ),
      );
  }, []);

  return (
    <div className="workspace" style={{ marginTop: 18, overflowX: "auto" }}>
      <div className="workspace-head">
        <h2>DATASET REGISTER</h2>
        <span className="status-pill">
          {items ? "PIPELINE MANIFEST" : "WAITING FOR API"}
        </span>
      </div>
      {error && (
        <p className="query-message" role="status">
          {error} · Start the API after publishing a release to load its source
          register.
        </p>
      )}
      <table className="source-table">
        <thead>
          <tr>
            <th>Publisher / dataset</th>
            <th>Release and period</th>
            <th>Project status</th>
            <th>Data license</th>
            <th>Provenance</th>
          </tr>
        </thead>
        <tbody>
          {items?.map((source) => (
            <tr key={source.dataset_id}>
              <td>
                {source.publisher}
                <br />
                <span style={{ fontWeight: 400 }}>{source.dataset_name}</span>
                <br />
                {source.documentation_url && (
                  <a
                    href={source.documentation_url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Documentation ↗
                  </a>
                )}
              </td>
              <td>
                {source.release_version}
                <br />
                {source.reference_period}
              </td>
              <td>
                {statusLabels[source.status] ??
                  source.status.replaceAll("_", " ")}
                {source.record_count != null && (
                  <>
                    <br />
                    {source.record_count.toLocaleString()}{" "}
                    {countKindLabels[source.record_count_kind ?? ""] ??
                      source.record_count_kind?.replaceAll("_", " ") ??
                      "source records"}
                  </>
                )}
              </td>
              <td>
                {source.license}
                {source.dataset_id === "onet_31_0" && (
                  <>
                    <br />
                    <a
                      href="https://creativecommons.org/licenses/by/4.0/"
                      target="_blank"
                      rel="noreferrer"
                    >
                      CC BY 4.0 license ↗
                    </a>
                  </>
                )}
              </td>
              <td>
                <a href={source.source_url} target="_blank" rel="noreferrer">
                  Official source ↗
                </a>
                {source.sha256 && (
                  <small className="hash-line">SHA-256 {source.sha256}</small>
                )}
                {source.file_size_bytes != null && (
                  <small className="hash-line">
                    {source.file_size_bytes.toLocaleString()} bytes
                  </small>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="query-message">
        O*NET® attribution: This product includes information from the O*NET®
        31.0 Database by the U.S. Department of Labor, Employment and Training
        Administration. Selected tables are adapted under CC BY 4.0; the
        Department of Labor has not approved, endorsed, or tested these
        adaptations. O*NET® is a trademark of the Department.
      </p>
    </div>
  );
}
