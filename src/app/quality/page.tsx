import { VisualShell } from "../_visual-shell";
import { QualityReport } from "./report";

export default function Page() {
  return (
    <VisualShell active="quality">
      <section className="unavailable-heading">
        <div>
          <div className="uv-eyebrow">
            <i /> PIPELINE TRANSPARENCY <span>RELEASE VALIDATION</span>
          </div>
          <h1>Data Quality &amp; Pipeline Audit</h1>
          <p>
            Automated verification metrics across all registered sources. Record
            counts, schema validation states, and uncertainty disclosures are
            derived directly from pipeline manifests.
          </p>
        </div>
        <div className="uv-status">
          <i /> REPRODUCIBLE PIPELINE AUDIT
        </div>
      </section>
      <div style={{ margin: "0 30px 40px" }}>
        <QualityReport />
      </div>
    </VisualShell>
  );
}
