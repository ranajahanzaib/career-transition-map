import { VisualShell } from "../_visual-shell";
import { SourcesReport } from "./report";

export default function Page() {
  return (
    <VisualShell active="sources">
      <section className="unavailable-heading">
        <div>
          <div className="uv-eyebrow">
            <i /> PROVENANCE CATALOGUE <span>SOURCE REGISTRATION</span>
          </div>
          <h1>Dataset Register &amp; Provenance</h1>
          <p>
            Official source records, cryptographic SHA-256 hashes, file
            dimensions, and licensing metadata. Raw survey data and interim
            files remain immutable and verified.
          </p>
        </div>
        <div className="uv-status">
          <i /> VERIFIED PROVENANCE
        </div>
      </section>
      <div style={{ margin: "0 30px 40px" }}>
        <SourcesReport />
      </div>
    </VisualShell>
  );
}
