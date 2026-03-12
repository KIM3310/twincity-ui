"use client";

import Link from "next/link";
import { buildControlTowerReportSchema, buildControlTowerServiceMeta } from "@/lib/serviceMeta";

type ControlTowerReadinessProps = {
  variant?: "full" | "compact";
};

function artifactLabel(kind: "route" | "doc" | "test" | "asset") {
  if (kind === "route") return "경로";
  if (kind === "doc") return "문서";
  if (kind === "test") return "테스트";
  return "화면";
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
          <p className="kicker">첫 화면 체크포인트</p>
          <h2 className="panelTitle">운영 계약과 리포트 근거를 1분 안에 확인합니다</h2>
          <p>
            처음 보는 사람도 ingest → triage → timeline → SLA proof 순서를 바로 읽을 수
            있도록, 핵심 운영 루프를 한 보드에 압축해 보여줍니다.
          </p>
        </div>

        <div className="readinessMetricStrip" aria-label="service readiness metrics">
          <article className="readinessMetricCard">
            <span>운영 모드</span>
            <strong>{meta.mode === "demo-first" ? "Demo-first" : "Live-wired"}</strong>
            <small>{meta.diagnostics.ingest_mode}</small>
          </article>
          <article className="readinessMetricCard">
            <span>검증 근거</span>
            <strong>{meta.evidence_counts.tests + meta.evidence_counts.docs}</strong>
            <small>{meta.evidence_counts.tests} tests + {meta.evidence_counts.docs} docs</small>
          </article>
          <article className="readinessMetricCard">
            <span>리포트 구성</span>
            <strong>{schema.required_sections.length}</strong>
            <small>{schema.schema}</small>
          </article>
        </div>
      </div>

      <div className="readinessQuickActions" aria-label="빠른 이동">
        <Link className="readinessQuickLink" href="/events">
          <strong>실시간 알림 보기</strong>
          <span className="readinessQuickMeta">지금 들어온 이벤트와 처리 기록을 바로 확인</span>
        </Link>
        <Link className="readinessQuickLink" href="/reports">
          <strong>리포트 열기</strong>
          <span className="readinessQuickMeta">handoff, dispatch, export 흐름을 빠르게 검토</span>
        </Link>
        <Link className="readinessQuickLink" href="/api/runtime-brief">
          <strong>운영 계약 확인</strong>
          <span className="readinessQuickMeta">reviewer가 바로 읽을 수 있는 JSON 근거 surface</span>
        </Link>
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
            <h3>처음 확인할 순서</h3>
            <small>처음 보는 사람도 바로 따라갈 수 있는 흐름</small>
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
            <h3>운영 원칙</h3>
            <small>판단 전에 꼭 지켜야 할 기준</small>
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
            <h3>2분 빠른 검토</h3>
            <small>핵심 화면만 빠르게 훑는 경로</small>
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
          <h3>{compact ? "핵심 근거" : "증거 묶음"}</h3>
          <small>{compact ? "첫 검토에 필요한 surface" : "route, 문서, 테스트, 화면 근거"}</small>
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
            <h3>함께 보면 좋은 파일</h3>
            <small>첫 검토 때 바로 열어볼 묶음</small>
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
            <h3>지금 알아둘 점</h3>
            <small>범위와 한계를 먼저 공유합니다</small>
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
