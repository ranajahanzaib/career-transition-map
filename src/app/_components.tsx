"use client";
import {
  ArrowRight,
  BookOpen,
  Database,
  FileSearch,
  GitBranch,
  Orbit,
  TriangleAlert,
} from "lucide-react";
import Link from "next/link";
import { FormEvent, useState } from "react";

const nav = [
  { href: "/atlas", title: "Atlas" },
  { href: "/pathways", title: "Pathways" },
  { href: "/skills", title: "Skill space" },
  { href: "/outlook", title: "Outlook" },
  { href: "/quality", title: "Data quality" },
  { href: "/methodology", title: "Methods" },
  { href: "/sources", title: "Sources" },
];
export function AppHeader() {
  return (
    <header className="topbar">
      <Link className="brand" href="/">
        <span className="brand-mark">
          <Orbit size={16} />
        </span>
        <span>
          CAREER <b>TRANSITION MAP</b>
        </span>
      </Link>
      <nav>
        {nav.slice(0, 5).map((item) => (
          <Link href={item.href} key={item.href}>
            {item.title}
          </Link>
        ))}
      </nav>
      <Link className="top-cta" href="/">
        Home <ArrowRight size={14} />
      </Link>
    </header>
  );
}
export function AppFooter() {
  return (
    <footer className="footer">
      <Link className="brand footer-brand" href="/">
        <span className="brand-mark">
          <Orbit size={16} />
        </span>
        <span>
          CAREER <b>TRANSITION MAP</b>
        </span>
      </Link>
      <span>The invisible connections between careers.</span>
      <div>
        {nav.slice(4).map((x) => (
          <Link key={x.href} href={x.href}>
            {x.title}
          </Link>
        ))}
      </div>
      <span className="footer-copy">
        Independent research platform · No agency endorsement implied
      </span>
    </footer>
  );
}
export type PageType = "atlas" | "pathways" | "skills" | "outlook";
const configurations = {
  atlas: {
    title: "Occupational atlas",
    kicker: "OCCUPATION CLASSIFICATION",
    lede: "Explore occupations in the O*NET classification and inspect the source profile for each occupation.",
    heading: "Occupation profiles are available in the atlas.",
    message:
      "The atlas displays the O*NET occupation classification. It does not currently overlay CPS mobility edges.",
    icon: Orbit,
    command: "O*NET 31.0 · occupation structure",
  },
  pathways: {
    title: "Pathway explorer",
    kicker: "EXPLAINABLE ROUTES",
    lede: "Investigate routes between occupations while keeping observed transitions distinct from profile similarity. A route is a research result, not an individual prediction.",
    heading: "Pathway view is not available in this release.",
    message:
      "Weighted CPS transition cells are available in the Transition Matrix. A pathway view requires validated occupation mappings and supported edges.",
    icon: GitBranch,
    command: "See the Transition Matrix · /matrix",
  },
  skills: {
    title: "Skill space",
    kicker: "OCCUPATIONAL PROFILES",
    lede: "Inspect occupational ratings from O*NET 31.0. Importance and level are separate scales; this view preserves each rating scale and does not imply an individual has the listed skills.",
    heading: "Search an occupation to inspect its profile.",
    message:
      "The current release contains O*NET occupational profiles. Profile-similarity scores are not part of this release.",
    icon: FileSearch,
    command: "O*NET 31.0 · source scales preserved",
  },
  outlook: {
    title: "Employment outlook",
    kicker: "LONG-RANGE PROJECTIONS",
    lede: "Employment projections describe modeled future employment and are not current vacancies.",
    heading: "Employment projections are not available in this release.",
    message:
      "BLS projection and wage data have not passed acquisition and schema validation for the current release.",
    icon: Database,
    command: "Review the source register · /sources",
  },
} satisfies Record<
  PageType,
  {
    title: string;
    kicker: string;
    lede: string;
    heading: string;
    message: string;
    icon: typeof Orbit;
    command: string;
  }
>;
export function ResearchWorkspace({ kind }: { kind: PageType }) {
  const c = configurations[kind];
  const Icon = c.icon;
  const [term, setTerm] = useState("");
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const apiBase = (
    process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1"
  ).replace(/\/$/, "");
  async function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setItems([]);
    let url = "";
    if (kind === "atlas" || kind === "skills")
      url = `${apiBase}/occupations?search=${encodeURIComponent(term)}&limit=25`;
    else if (kind === "outlook")
      url = `${apiBase}/projections?search=${encodeURIComponent(term)}&limit=25`;
    else
      url = `${apiBase}/transitions?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&limit=50`;
    try {
      const response = await fetch(url);
      const body = await response.json();
      if (!response.ok)
        throw new Error(
          body?.detail?.message ?? "Research artifacts are not available.",
        );
      const rows = Array.isArray(body.items) ? body.items : [];
      setItems(rows);
      setMessage(
        rows.length
          ? `${rows.length} published records returned.`
          : "No records match these filters in this release.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to reach the research API.",
      );
    } finally {
      setLoading(false);
    }
  }
  async function loadProfile(id: string, title: string) {
    setLoading(true);
    setMessage("");
    setItems([]);
    try {
      const response = await fetch(
        `${apiBase}/occupations/${encodeURIComponent(id)}/skills?limit=1000`,
      );
      const body = await response.json();
      if (!response.ok)
        throw new Error(
          body?.detail?.message ?? "Profile ratings are unavailable.",
        );
      const rows = Array.isArray(body.items) ? body.items : [];
      setItems(rows);
      setMessage(
        `${title} · showing ${rows.length} of ${body.total} source ratings across the published profile.`,
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to load the occupational profile.",
      );
    } finally {
      setLoading(false);
    }
  }
  return (
    <>
      <AppHeader />
      <main className="inner-page">
        <Link href="/" className="nav-return">
          ← Back to overview
        </Link>
        <div className="eyebrow">
          <i /> {c.kicker}
        </div>
        <h1>{c.title}</h1>
        <p className="inner-lede">{c.lede}</p>
        <section className="workspace">
          <div className="workspace-head">
            <h2>RELEASED RESEARCH ARTIFACTS</h2>
            <span className="status-pill">O*NET PROFILE RELEASE · PARTIAL</span>
          </div>
          <form className="search-form" onSubmit={search}>
            <label htmlFor="research-query">
              {kind === "pathways"
                ? "Origin occupation ID"
                : "Search by occupation name or code"}
            </label>
            {kind === "pathways" ? (
              <div className="query-row">
                <input
                  id="research-origin"
                  aria-label="Origin occupation ID"
                  placeholder="Origin occupation ID"
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                  required
                />
                <input
                  aria-label="Destination occupation ID"
                  placeholder="Destination occupation ID"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  required
                />
                <button
                  className="button-primary"
                  type="submit"
                  disabled={loading}
                >
                  {loading ? "Searching…" : "Inspect transitions"}
                </button>
              </div>
            ) : (
              <div className="query-row">
                <input
                  id="research-query"
                  placeholder="e.g. occupation title or SOC code"
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  required
                />
                <button
                  className="button-primary"
                  type="submit"
                  disabled={loading}
                >
                  {loading
                    ? "Searching…"
                    : kind === "outlook"
                      ? "Search projections"
                      : "Search occupations"}
                </button>
              </div>
            )}
          </form>
          {message ? (
            <p className="query-message" role="status">
              {message}
            </p>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">
                <Icon size={20} />
              </div>
              <h3>{c.heading}</h3>
              <p>{c.message}</p>
              <code>{c.command}</code>
            </div>
          )}
          {items.length > 0 && (
            <div className="result-table-wrap">
              <table className="source-table">
                <thead>
                  <tr>
                    {Object.keys(items[0]).map((key) => (
                      <th key={key}>{key.replaceAll("_", " ")}</th>
                    ))}
                    {kind === "skills" && <th>Profile ratings</th>}
                  </tr>
                </thead>
                <tbody>
                  {items.map((row, i) => (
                    <tr key={String(row.id ?? row.code ?? i)}>
                      {Object.entries(row).map(([key, v]) => (
                        <td key={key}>
                          {typeof v === "object"
                            ? JSON.stringify(v)
                            : String(v ?? "—")}
                        </td>
                      ))}
                      {kind === "skills" && typeof row.id === "string" && (
                        <td>
                          <button
                            className="profile-button"
                            type="button"
                            onClick={() =>
                              loadProfile(
                                String(row.id),
                                String(row.title ?? row.id),
                              )
                            }
                          >
                            Inspect ratings
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        <div className="content-grid">
          <article className="info-card">
            <h3>Read the methodology</h3>
            <p>
              Each visualization is governed by a published definition of its
              population, unit, denominator, and release. Review the analysis
              before interpreting a relationship.
            </p>
            <Link className="research-link" href="/methodology">
              Open methods <ArrowRight size={14} />
            </Link>
          </article>
          <article className="info-card">
            <h3>Inspect source coverage</h3>
            <p>
              Find the official publisher, reference period, version, source
              file, and processing status for each dataset used by this
              platform.
            </p>
            <Link className="research-link" href="/sources">
              Browse sources <ArrowRight size={14} />
            </Link>
          </article>
        </div>
      </main>
      <AppFooter />
    </>
  );
}
export function StandardPage({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppHeader />
      {children}
      <AppFooter />
    </>
  );
}
export function ResearchWarning() {
  return (
    <div
      className="info-card"
      style={{
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
        marginTop: 16,
      }}
    >
      <TriangleAlert size={17} color="#a5793d" />
      <p style={{ margin: 0 }}>
        A public source page confirms that a release exists; it does not
        establish that this application has downloaded, parsed, validated, or
        published the release.
      </p>
    </div>
  );
}
export function MethodIcon() {
  return <BookOpen size={16} />;
}
