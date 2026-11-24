"use client";

import { ArrowUpRight, Search } from "lucide-react";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { VisualShell } from "../_visual-shell";

type Occupation = { id: string; code: string; title: string };
type Rating = {
  element_id: string;
  element_name: string;
  value: number | null;
  scale_id: string;
  scale_name: string;
  scale_minimum: number;
  scale_maximum: number;
  recommend_suppress: string | null;
  not_relevant: string | null;
};

export function SkillUniverse() {
  const api = (
    process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1"
  ).replace(/\/$/, "");
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<Occupation[]>([]);
  const [selected, setSelected] = useState<Occupation | null>(null);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [message, setMessage] = useState(
    "Search for an occupation to explore its published O*NET skill profile.",
  );
  const [loading, setLoading] = useState(false);

  async function search(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setSelected(null);
    setRatings([]);
    try {
      const r = await fetch(
        `${api}/occupations?search=${encodeURIComponent(query)}&limit=20`,
      );
      const body = await r.json();
      if (!r.ok)
        throw new Error(
          body?.detail?.message ?? "Occupation data is unavailable.",
        );
      setMatches(body.items ?? []);
      setMessage(
        `${body.total} matching occupation${body.total === 1 ? "" : "s"} in O*NET 31.0.`,
      );
    } catch (err) {
      setMatches([]);
      setMessage(
        err instanceof Error ? err.message : "Unable to load occupations.",
      );
    } finally {
      setLoading(false);
    }
  }
  async function inspect(o: Occupation) {
    setLoading(true);
    setSelected(o);
    setMatches([]);
    setRatings([]);
    try {
      const r = await fetch(
        `${api}/occupations/${encodeURIComponent(o.id)}/skills?dimension=essential_skills&limit=1000`,
      );
      const body = await r.json();
      if (!r.ok)
        throw new Error(
          body?.detail?.message ?? "Skill ratings are unavailable.",
        );
      const rows = (body.items ?? []).filter(
        (x: Rating) => x.scale_id === "IM" && x.value !== null,
      );
      setRatings(rows);
      setMessage(
        `${rows.length} importance ratings · source scale ${rows[0]?.scale_minimum ?? 1}–${rows[0]?.scale_maximum ?? 5}`,
      );
    } catch (err) {
      setMessage(
        err instanceof Error
          ? err.message
          : "Unable to load the skill profile.",
      );
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("occupation");
    if (!id) return;
    fetch(`${api}/occupations/${encodeURIComponent(id)}`)
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok)
          throw new Error(body?.detail?.message ?? "Occupation not found.");
        return body as Occupation;
      })
      .then((o) => {
        setQuery(o.title);
        return inspect(o);
      })
      .catch((err) =>
        setMessage(
          err instanceof Error
            ? err.message
            : "Unable to open occupation profile.",
        ),
      );
  }, []);
  const chart = useMemo(
    () =>
      [...ratings].sort((a, b) => (b.value ?? 0) - (a.value ?? 0)).slice(0, 18),
    [ratings],
  );

  return (
    <VisualShell active="skills">
      <section className="skills-heading">
        <div>
          <div className="uv-eyebrow">
            <i /> OCCUPATIONAL SKILL PROFILES{" "}
            <span>UNITED STATES · O*NET-SOC 31.0</span>
          </div>
          <h1>Skill Universe</h1>
          <p>
            Explore source-reported occupational skill importance. Values
            describe an occupation profile; they are not an assessment of any
            individual worker.
          </p>
        </div>
        <div className="skills-release">
          O*NET 31.0<small>RAW SOURCE SCALES RETAINED</small>
        </div>
      </section>
      <section className="skills-workspace">
        <div className="skills-main">
          <form className="skills-form" onSubmit={search}>
            <input
              aria-label="Search occupations"
              placeholder="Search occupation title or SOC code"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button type="submit" disabled={loading}>
              <Search size={12} /> {loading ? "Loading…" : "Search"}
            </button>
          </form>
          {matches.length > 0 && (
            <>
              <p className="skills-message">
                {message} Choose an occupation to inspect its profile.
              </p>
              <div className="occupation-matches">
                {matches.map((o) => (
                  <button key={o.id} onClick={() => inspect(o)}>
                    {o.title}
                    <small>{o.code}</small>
                  </button>
                ))}
              </div>
            </>
          )}
          {selected && (
            <>
              <div className="skill-chart-title">
                <h2>{selected.title}</h2>
                <span>ESSENTIAL SKILLS · IMPORTANCE</span>
              </div>
              <p className="skills-message" role="status">
                {loading ? "Loading source profile…" : message}
              </p>
              {chart.length > 0 && (
                <div
                  className="skill-rows"
                  aria-label="Highest occupational skill importance ratings"
                >
                  {chart.map((row) => (
                    <div className="skill-row" key={row.element_id}>
                      <span title={row.element_name}>{row.element_name}</span>
                      <div className="skill-track">
                        <i
                          style={{
                            width: `${Math.max(0, Math.min(100, ((row.value ?? 0) / row.scale_maximum) * 100))}%`,
                          }}
                        />
                      </div>
                      <b>{row.value?.toFixed(2)}</b>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
          {!selected && matches.length === 0 && (
            <p className="skills-message" role="status">
              {message}
            </p>
          )}
        </div>
        <aside className="skills-aside">
          <h3>HOW TO READ THIS VIEW</h3>
          <p>
            Bars show O*NET importance ratings on the published 1–5 scale. Each
            row is an occupational descriptor, not a worker skill score.
          </p>
          <div>
            <span>PROFILE DIMENSION</span>
            <b>Essential skills</b>
          </div>
          <div>
            <span>MEASURE</span>
            <b>Importance rating · 1–5</b>
          </div>
          <div>
            <span>SOURCE VERSION</span>
            <b>O*NET 31.0 · reference 08/2025</b>
          </div>
          <p>
            Level ratings and other profile dimensions remain separate so unlike
            scales are not mixed.
          </p>
          <Link href="/sources">
            Source and quality details <ArrowUpRight size={12} />
          </Link>
        </aside>
      </section>
    </VisualShell>
  );
}
