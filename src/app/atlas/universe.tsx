"use client";

import {
  ArrowDownLeft,
  ArrowUpRight,
  CircleHelp,
  Maximize2,
  Minus,
  Orbit,
  Plus,
  Search,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import "./universe.css";

type Occupation = {
  id: string;
  code: string;
  title: string;
  description: string;
};
type Point = Occupation & {
  x: number;
  y: number;
  group: string;
  color: string;
};

const palette: Record<string, string> = {
  "11": "#f0ad4e",
  "13": "#e8c35b",
  "15": "#51b5db",
  "17": "#7d9af2",
  "19": "#a68bf0",
  "21": "#42c9aa",
  "23": "#69c787",
  "25": "#b2cc64",
  "27": "#d88f54",
  "29": "#ed7189",
  "31": "#55c4b3",
  "33": "#d776a8",
  "35": "#dca35c",
  "37": "#8bb868",
  "39": "#e88b58",
  "41": "#63addc",
  "43": "#8b9cd1",
  "45": "#50b9a2",
  "47": "#c09a59",
  "49": "#6db5ce",
  "51": "#db7865",
  "53": "#a8bd61",
  "55": "#ab83d6",
};
const groupNames: Record<string, string> = {
  "11": "Management",
  "13": "Business & finance",
  "15": "Computer & math",
  "17": "Architecture & engineering",
  "19": "Science",
  "21": "Community & social service",
  "23": "Legal",
  "25": "Education",
  "27": "Arts & media",
  "29": "Healthcare practitioners",
  "31": "Healthcare support",
  "33": "Protective service",
  "35": "Food preparation",
  "37": "Building & grounds",
  "39": "Personal care",
  "41": "Sales",
  "43": "Office & administration",
  "45": "Farming & forestry",
  "47": "Construction",
  "49": "Installation & repair",
  "51": "Production",
  "53": "Transportation",
  "55": "Military",
};
const positions: Record<string, [number, number]> = {
  "11": [190, 125],
  "13": [355, 100],
  "15": [535, 100],
  "17": [730, 125],
  "19": [850, 235],
  "21": [135, 280],
  "23": [320, 250],
  "25": [500, 235],
  "27": [700, 270],
  "29": [860, 390],
  "31": [170, 430],
  "33": [360, 405],
  "35": [555, 405],
  "37": [750, 435],
  "39": [100, 540],
  "41": [295, 555],
  "43": [495, 535],
  "45": [690, 560],
  "47": [875, 540],
  "49": [260, 665],
  "51": [495, 670],
  "53": [735, 660],
  "55": [910, 110],
};

function hash(value: string) {
  let h = 2166136261;
  for (const c of value) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}

export function OccupationalUniverse() {
  const [records, setRecords] = useState<Occupation[]>([]);
  const [selected, setSelected] = useState<Occupation | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [zoom, setZoom] = useState(1);
  const [view, setView] = useState<"map" | "list">("map");
  const apiBase = (
    process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1"
  ).replace(/\/$/, "");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const first = await fetch(`${apiBase}/occupations?limit=200`);
        const initial = await first.json();
        if (!first.ok)
          throw new Error(
            initial?.detail?.message ?? "Occupation release is unavailable.",
          );
        const pages = await Promise.all(
          Array.from(
            { length: Math.ceil(Math.max(0, initial.total - 200) / 200) },
            (_, i) =>
              fetch(
                `${apiBase}/occupations?limit=200&offset=${(i + 1) * 200}`,
              ).then((r) => {
                if (!r.ok)
                  throw new Error(
                    "Unable to load the complete occupation release.",
                  );
                return r.json();
              }),
          ),
        );
        if (active)
          setRecords([
            ...(initial.items ?? []),
            ...pages.flatMap((p) => p.items ?? []),
          ]);
      } catch (e) {
        if (active)
          setError(
            e instanceof Error
              ? e.message
              : "Unable to load occupational data.",
          );
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [apiBase]);

  const points = useMemo(() => {
    const queryText = query.trim().toLowerCase();
    const visible = records.filter(
      (o) =>
        !queryText ||
        o.title.toLowerCase().includes(queryText) ||
        o.code.includes(queryText),
    );
    const groups: Record<string, Occupation[]> = {};
    for (const o of visible) {
      const g = o.code.slice(0, 2);
      (groups[g] ??= []).push(o);
    }
    return Object.entries(groups).flatMap(([group, list]) =>
      list.map((o, i): Point => {
        const [cx, cy] = positions[group] ?? [500, 390];
        const seed = hash(o.code),
          angle = ((seed % 3600) / 3600) * Math.PI * 2;
        const distance =
          12 + Math.sqrt(i / Math.max(1, list.length)) * (25 + (seed % 38));
        return {
          ...o,
          group,
          color: palette[group] ?? "#9babb0",
          x: cx + Math.cos(angle) * distance,
          y: cy + Math.sin(angle) * distance * 0.7,
        };
      }),
    );
  }, [records, query]);
  const selectedPoint = selected
    ? points.find((p) => p.id === selected.id)
    : null;
  const filtered = points;

  return (
    <main className="universe-shell">
      <header className="universe-topbar">
        <Link className="universe-brand" href="/">
          <span className="universe-mark">
            <Orbit size={16} />
          </span>{" "}
          CAREER TRANSITION <b>MAP</b>
        </Link>
        <nav aria-label="Dashboard views" className="universe-nav">
          <Link className="active" href="/">
            Universe
          </Link>
          <Link href="/matrix">Transition matrix</Link>
          <Link href="/skills">Skill profiles</Link>
          <Link href="/quality">Data quality</Link>
          <Link href="/sources">Sources</Link>
          <Link href="/methodology">Methodology</Link>
        </nav>
      </header>
      <section className="universe-titlebar">
        <div>
          <div className="u-eyebrow">
            <i /> OCCUPATIONAL ATLAS <span>UNITED STATES · O*NET-SOC 31.0</span>
          </div>
          <h1>Occupational Universe</h1>
          <p>
            Explore the structure of work across{" "}
            <b>{loading ? "…" : records.length.toLocaleString()}</b>{" "}
            occupations.
          </p>
        </div>
        <div className="universe-source">
          <span className="live-dot" /> RELEASED SOURCE DATA{" "}
          <small>O*NET 31.0 · 2025</small>
        </div>
      </section>
      <section className="atlas-frame">
        <div className="atlas-toolbar">
          <label className="atlas-search">
            <Search size={15} />
            <input
              aria-label="Find an occupation"
              placeholder="Find occupation or SOC code"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <kbd>⌘ K</kbd>
          </label>
          <div className="atlas-toolbar-right">
            <span className="atlas-count">
              {loading
                ? "Loading release…"
                : `${points.length.toLocaleString()} occupations`}
            </span>
            <span className="toolbar-divider" />
            <button
              className={view === "map" ? "selected" : ""}
              onClick={() => setView("map")}
            >
              Map
            </button>
            <button
              className={view === "list" ? "selected" : ""}
              onClick={() => setView("list")}
            >
              List
            </button>
          </div>
        </div>
        {error ? (
          <div className="atlas-error" role="status">
            {error}
          </div>
        ) : view === "map" ? (
          <div className="atlas-map-layout">
            <div
              className="atlas-canvas"
              role="img"
              aria-label="Occupation groups positioned by standard occupational classification. Nodes are occupations; colors identify major groups. No mobility edges are shown because worker transition estimates are not published."
            >
              <svg
                viewBox={`${500 - 500 / zoom} ${390 - 390 / zoom} ${1000 / zoom} ${780 / zoom}`}
                aria-hidden="true"
              >
                <defs>
                  <pattern
                    id="atlas-grid"
                    width="34"
                    height="34"
                    patternUnits="userSpaceOnUse"
                  >
                    <path
                      d="M 34 0 L 0 0 0 34"
                      fill="none"
                      stroke="#ffffff"
                      strokeOpacity=".035"
                      strokeWidth=".7"
                    />
                  </pattern>
                </defs>
                <rect
                  x="0"
                  y="0"
                  width="1000"
                  height="780"
                  fill="url(#atlas-grid)"
                />
                {Object.entries(groupNames).map(([group, name]) => {
                  const [x, y] = positions[group];
                  const color = palette[group];
                  return (
                    <g key={group}>
                      <circle
                        cx={x}
                        cy={y}
                        r="74"
                        fill={color}
                        fillOpacity=".035"
                      />
                      <circle
                        cx={x}
                        cy={y}
                        r="74"
                        fill="none"
                        stroke={color}
                        strokeOpacity=".15"
                        strokeWidth=".7"
                        strokeDasharray="2 5"
                      />
                      <text
                        x={x}
                        y={y - 82}
                        textAnchor="middle"
                        fill={color}
                        fontSize="9"
                        letterSpacing="1.2"
                        opacity=".82"
                      >
                        {group} · {name.toUpperCase()}
                      </text>
                    </g>
                  );
                })}
                {filtered.map((point) => (
                  <circle
                    key={point.id}
                    cx={point.x}
                    cy={point.y}
                    r={selected?.id === point.id ? 4.8 : 2.8}
                    fill={point.color}
                    fillOpacity={selected?.id === point.id ? 1 : 0.79}
                    stroke={selected?.id === point.id ? "#f7fafb" : "none"}
                    strokeWidth="1.2"
                    className="occupation-node"
                    onClick={() => setSelected(point)}
                  >
                    <title>
                      {point.title} · {point.code}
                    </title>
                  </circle>
                ))}
              </svg>
              <div className="atlas-map-foot">
                <span>POSITIONED BY SOC MAJOR GROUP</span>
                <span>CLASSIFICATION STRUCTURE · NO MOBILITY EDGES</span>
              </div>
              <div className="atlas-zoom">
                <button
                  aria-label="Zoom in"
                  onClick={() => setZoom((z) => Math.min(2.2, z * 1.2))}
                >
                  <Plus size={15} />
                </button>
                <button
                  aria-label="Zoom out"
                  onClick={() => setZoom((z) => Math.max(0.75, z / 1.2))}
                >
                  <Minus size={15} />
                </button>
                <button aria-label="Reset zoom" onClick={() => setZoom(1)}>
                  <Maximize2 size={14} />
                </button>
              </div>
            </div>
            <aside className="atlas-sidebar">
              <div className="atlas-side-heading">
                <span>
                  {selected ? "OCCUPATION DETAIL" : "OCCUPATION GROUPS"}
                </span>
                <CircleHelp size={14} />
              </div>
              {selected ? (
                <div className="occupation-detail">
                  <button
                    className="detail-back"
                    onClick={() => setSelected(null)}
                  >
                    ← All groups
                  </button>
                  <span
                    className="detail-soc"
                    style={{ color: selectedPoint?.color }}
                  >
                    SOC {selected.code}
                  </span>
                  <h2>{selected.title}</h2>
                  <p>
                    {selected.description ||
                      "No description is available in this source release."}
                  </p>
                  <Link
                    href={`/skills?occupation=${encodeURIComponent(selected.id)}`}
                    className="detail-action"
                  >
                    Inspect profile <ArrowUpRight size={13} />
                  </Link>
                  <div className="detail-meta">
                    <span>CLASSIFICATION</span>
                    <b>O*NET-SOC 31.0</b>
                  </div>
                </div>
              ) : (
                <div className="group-list">
                  {Object.entries(groupNames).map(([code, name]) => {
                    const count = points.filter((p) => p.group === code).length;
                    return (
                      <button
                        key={code}
                        onClick={() => setQuery(query === code ? "" : code)}
                        className="group-row"
                      >
                        <i style={{ background: palette[code] }} />
                        <span>{name}</span>
                        <b>{count}</b>
                        <ArrowDownLeft size={12} />
                      </button>
                    );
                  })}
                </div>
              )}
              <div className="atlas-legend">
                <span className="legend-title">READING THE MAP</span>
                <div>
                  <i className="legend-node" />
                  One dot represents one occupation
                </div>
                <div>
                  <i className="legend-ring" />
                  Color groups follow SOC major groups
                </div>
                <p>
                  Positions show classification, not worker movement or skill
                  similarity.
                </p>
              </div>
            </aside>
          </div>
        ) : (
          <div className="occupation-list-panel">
            <p>
              {points.length} occupations in this release. Select one to inspect
              its source profile.
            </p>
            {points.slice(0, 200).map((point) => (
              <button
                key={point.id}
                onClick={() => {
                  setSelected(point);
                  setView("map");
                }}
              >
                <i style={{ background: point.color }} />
                <span>{point.title}</span>
                <code>{point.code}</code>
              </button>
            ))}
          </div>
        )}
        <div className="atlas-evidence">
          <span>
            <i /> O*NET OCCUPATION TAXONOMY
          </span>
          <span>
            DIRECTED MOBILITY TRANSITIONS ARE NOT AVAILABLE IN THIS RELEASE
          </span>
          <Link href="/sources">
            Source details <ArrowUpRight size={12} />
          </Link>
        </div>
      </section>
      <footer className="universe-footer">
        <span>CAREER TRANSITION MAP</span>
        <span>RESEARCH INTERFACE · RELEASE CTM v0.1.1</span>
        <Link href="/">Overview</Link>
      </footer>
    </main>
  );
}
