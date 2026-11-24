import { Orbit } from "lucide-react";
import Link from "next/link";
import "./visual-shell.css";

const views = [
  ["/", "Universe", "universe"],
  ["/matrix", "Transition Matrix", "matrix"],
  ["/skills", "Skill Profiles", "skills"],
  ["/quality", "Data Quality", "quality"],
  ["/sources", "Sources", "sources"],
  ["/methodology", "Methodology", "methodology"],
] as const;

export function VisualShell({
  active,
  children,
}: {
  active: string;
  children: React.ReactNode;
}) {
  return (
    <main className="visual-shell">
      <header className="visual-shell-bar">
        <Link href="/" className="visual-shell-brand">
          <span>
            <Orbit size={15} />
          </span>{" "}
          CAREER TRANSITION <b>MAP</b>
        </Link>
        <nav aria-label="Dashboard views">
          {views.map(([href, label, key]) => (
            <Link
              key={href}
              className={active === key ? "active" : ""}
              href={href}
            >
              {label}
            </Link>
          ))}
        </nav>
      </header>
      {children}
      <footer className="visual-shell-footer">
        <span>CAREER TRANSITION MAP</span>
        <span>LABOR MARKET RESEARCH DASHBOARD · CTM v0.2.0</span>
        <Link href="/">Universe</Link>
      </footer>
    </main>
  );
}

export function UnavailableView({
  active,
  title,
  description,
  evidence,
}: {
  active: string;
  title: string;
  description: string;
  evidence: string;
}) {
  return (
    <VisualShell active={active}>
      <section className="unavailable-heading">
        <div>
          <div className="uv-eyebrow">
            <i /> RESEARCH DASHBOARD{" "}
            <span>UNITED STATES · EVIDENCE CONTROLLED</span>
          </div>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        <div className="uv-status">
          <i /> AWAITING VALIDATED DATA
        </div>
      </section>
      <section className="unavailable-panel">
        <div className="uv-panel-top">
          <span>{title.toUpperCase()}</span>
          <span>NO ESTIMATES SHOWN</span>
        </div>
        <div className="uv-empty">
          <div className="uv-orbit" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
          </div>
          <h2>This view is not populated yet.</h2>
          <p>{evidence}</p>
          <Link href="/sources">Review source status →</Link>
        </div>
        <div className="uv-panel-foot">
          <span>
            <i /> SOURCE STATUS IS SHOWN BEFORE VISUALIZATION
          </span>
          <span>NO SAMPLE DATA OR SIMULATED ESTIMATES</span>
        </div>
      </section>
    </VisualShell>
  );
}
