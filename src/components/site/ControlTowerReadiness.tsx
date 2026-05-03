"use client";

import Link from "next/link";
import { useState } from "react";
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
  const [lens, setLens] = useState<"operator" | "reviewer" | "executive">("operator");
  const compact = variant === "compact";
  const stages = compact ? meta.stages.slice(0, 3) : meta.stages;
  const artifacts = compact ? meta.artifacts.slice(0, 4) : meta.artifacts;
  const proofAssets = compact ? meta.proof_assets.slice(0, 3) : meta.proof_assets;
  const twoMinuteReview = compact ? meta.two_minute_review.slice(0, 3) : meta.two_minute_review;
  const lensCopy = {
    operator: {
      title: "운영자 관점",
      summary: "실시간 알림 → 리포트 → 운영 계약 순으로 읽으면 현장 판단 루프가 가장 빨리 보입니다.",
      cards: [
        ["01 · 알림 우선", "이벤트와 triage 흐름부터 보고 현재 주의 포인트를 확인합니다."],
        ["02 · 리포트 확인", "dispatch / handoff / export가 같은 이야기인지 바로 검토합니다."],
        ["03 · 계약 확인", "runtime brief와 schema surface로 근거를 잠급니다."],
      ],
    },
    reviewer: {
      title: "검토 관점",
      summary: "health / meta / summary를 먼저 열고, 화면은 그 다음에 보는 편이 가장 설득력이 큽니다.",
      cards: [
        ["01 · health", "ingest mode와 review 링크를 가장 먼저 확인합니다."],
        ["02 · meta + summary", "신뢰 경계와 SLA snapshot이 함께 읽혀야 합니다."],
        ["03 · handoff", "마지막엔 다음 shift digest가 자연스럽게 이어지는지 확인합니다."],
      ],
    },
    executive: {
      title: "의사결정 관점",
      summary: "한눈에 지금 상태, 위험, handoff까지 읽히는지 보는 렌즈입니다.",
      cards: [
        ["01 · readiness", "Demo-first인지 live-wired인지 한 장에서 바로 읽어냅니다."],
        ["02 · evidence", "문서/테스트/route 근거가 실제 의사결정 surface로 이어지는지 봅니다."],
        ["03 · continuity", "shift handoff가 그냥 복사가 아니라 운영 연속성으로 보이는지 확인합니다."],
      ],
    },
  }[lens];

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

        <div className="readinessHeadAside">
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
              <span className="readinessQuickMeta">operator가 바로 읽을 수 있는 JSON 근거 surface</span>
            </Link>
          </div>

          <article className="readinessHeadNote">
            <div className="readinessSectionHead">
              <h3>검토 시작 경로</h3>
              <small>처음 30초에 확인할 항목</small>
            </div>
            <div className="readinessMiniList">
              {twoMinuteReview.slice(0, 3).map((item) => (
                <div key={item} className="readinessMiniItem">
                  {item}
                </div>
              ))}
            </div>
          </article>
        </div>
      </div>

      <div className="readinessLensPanel">
        <div className="readinessLensTabs" role="tablist" aria-label="관점 전환">
          <button
            type="button"
            className={"readinessLensBtn" + (lens === "operator" ? " active" : "")}
            onClick={() => setLens("operator")}
          >
            운영자
          </button>
          <button
            type="button"
            className={"readinessLensBtn" + (lens === "reviewer" ? " active" : "")}
            onClick={() => setLens("reviewer")}
          >
            검토
          </button>
          <button
            type="button"
            className={"readinessLensBtn" + (lens === "executive" ? " active" : "")}
            onClick={() => setLens("executive")}
          >
            의사결정
          </button>
        </div>
        <div className="readinessSectionHead">
          <div>
            <h3>{lensCopy.title}</h3>
            <small>{lensCopy.summary}</small>
          </div>
        </div>
        <div className="readinessLensGrid">
          {lensCopy.cards.map(([title, body]) => (
            <article key={title} className="readinessListCard">
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
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
