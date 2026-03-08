"use client";

import { buildControlTowerReportSchema, buildControlTowerServiceMeta } from "@/lib/serviceMeta";

type ControlTowerReadinessProps = {
  variant?: "full" | "compact";
};

function artifactLabel(kind: "route" | "doc" | "test" | "asset") {
  if (kind === "route") return "route";
  if (kind === "doc") return "doc";
  if (kind === "test") return "test";
  return "asset";
}

export default function ControlTowerReadiness({
  variant = "full",
}: ControlTowerReadinessProps) {
  const meta = buildControlTowerServiceMeta();
  const schema = buildControlTowerReportSchema();
  const compact = variant === "compact";
  const stages = compact ? meta.stages.slice(0, 3) : meta.stages;
  const artifacts = compact ? meta.artifacts.slice(0, 4) : meta.artifacts;
  const proofAssets = compact ? meta.proof_assets.slice(0, 3) : meta.proof_assets;
  const twoMinuteReview = compact ? meta.two_minute_review.slice(0, 3) : meta.two_minute_review;

  return (
    <section className={"panel readinessBoard" + (compact ? " compact" : "")}>
      <div className="readinessHead">
        <div className="readinessLead">
          <p className="kicker">Control Tower Readiness</p>
          <h2 className="panelTitle">Operator contract, trust boundary, and report proof</h2>
          <p>
            TwinCity UI가 단순한 디지털 트윈 데모가 아니라, 이벤트 정규화부터 triage,
            timeline, SLA 리포트까지 이어지는 운영 루프를 보여준다는 점을 먼저 드러냅니다.
          </p>
        </div>

        <div className="readinessMetricStrip" aria-label="service readiness metrics">
          <article className="readinessMetricCard">
            <span>Mode</span>
            <strong>{meta.mode === "demo-first" ? "Demo-first" : "Live-wired"}</strong>
            <small>{meta.diagnostics.ingest_mode}</small>
          </article>
          <article className="readinessMetricCard">
            <span>Evidence</span>
            <strong>{meta.evidence_counts.tests + meta.evidence_counts.docs}</strong>
            <small>{meta.evidence_counts.tests} tests + {meta.evidence_counts.docs} docs</small>
          </article>
          <article className="readinessMetricCard">
            <span>Report Schema</span>
            <strong>{schema.required_sections.length}</strong>
            <small>{schema.schema}</small>
          </article>
        </div>
      </div>

      <div className="readinessTagRow">
        <span className="chip" data-tone="calm">
          {meta.readiness_contract}
        </span>
        <span className="chip" data-tone="watch">
          {meta.ingest_contract.schema}
        </span>
        <span className="chip" data-tone="critical">
          {schema.schema}
        </span>
      </div>

      <div className="readinessTagRow">
        {meta.trust_boundary.map((item) => (
          <span key={item} className="readinessTag">
            {item}
          </span>
        ))}
      </div>

      <div className="readinessSplit">
        <article className="readinessListCard">
          <div className="readinessSectionHead">
            <h3>Review Flow</h3>
            <small>what reviewers should do first</small>
          </div>
          <div className="readinessList">
            {meta.review_flow.map((item) => (
              <div key={item} className="readinessListItem">
                {item}
              </div>
            ))}
          </div>
        </article>

        <article className="readinessListCard">
          <div className="readinessSectionHead">
            <h3>Operator Rules</h3>
            <small>guardrails for decision surfaces</small>
          </div>
          <div className="readinessList">
            {meta.operator_rules.map((item) => (
              <div key={item} className="readinessListItem">
                {item}
              </div>
            ))}
          </div>
        </article>

        <article className="readinessListCard">
          <div className="readinessSectionHead">
            <h3>2-Minute Review</h3>
            <small>fast reviewer path through the product</small>
          </div>
          <div className="readinessList">
            {twoMinuteReview.map((item) => (
              <div key={item} className="readinessListItem">
                {item}
              </div>
            ))}
          </div>
        </article>
      </div>

      {!compact ? (
        <div className="readinessStageGrid">
          {stages.map((stage) => (
            <article key={stage.id} className="readinessStageCard">
              <div className="readinessSectionHead">
                <h3>{stage.title}</h3>
                <small>{stage.owner}</small>
              </div>
              <p>{stage.outcome}</p>
              <span>{stage.evidence}</span>
            </article>
          ))}
        </div>
      ) : null}

      <div className="readinessArtifactCard">
        <div className="readinessSectionHead">
          <h3>{compact ? "Key Artifacts" : "Evidence Artifacts"}</h3>
          <small>{compact ? "first-pass review surfaces" : "routes, docs, tests, and UI proof"}</small>
        </div>
        <div className="readinessList">
          {artifacts.map((artifact) => (
            <div key={`${artifact.kind}:${artifact.href}`} className="readinessArtifactRow">
              <div>
                <strong>{artifact.label}</strong>
                <p>{artifact.note}</p>
              </div>
              <div className="readinessArtifactMeta">
                <span className="readinessArtifactKind">{artifactLabel(artifact.kind)}</span>
                <span className="mono">{artifact.href}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {!compact ? (
        <article className="readinessListCard">
          <div className="readinessSectionHead">
            <h3>Proof Assets</h3>
            <small>short reviewer bundle for the first pass</small>
          </div>
          <div className="readinessList">
            {proofAssets.map((artifact) => (
              <div key={`${artifact.kind}:${artifact.href}`} className="readinessListItem">
                {artifact.label} {"->"} {artifact.href}
              </div>
            ))}
          </div>
        </article>
      ) : null}

      {!compact ? (
        <article className="readinessListCard">
          <div className="readinessSectionHead">
            <h3>Current Watchouts</h3>
            <small>scope boundaries reviewers should understand</small>
          </div>
          <div className="readinessList">
            {meta.watchouts.map((item) => (
              <div key={item} className="readinessListItem">
                {item}
              </div>
            ))}
          </div>
        </article>
      ) : null}
    </section>
  );
}
