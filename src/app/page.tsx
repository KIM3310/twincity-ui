import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "상황판",
};

const PROOF_PATHS = [
  {
    href: "/api/health",
    title: "01 · 상태 확인",
    body: "실시간 소스 연결 상태와 reviewer-safe 링크를 먼저 확인합니다.",
    meta: "/api/health",
  },
  {
    href: "/reports",
    title: "02 · 리포트 proof",
    body: "dispatch · handoff · export가 같은 이야기인지 한 화면에서 검토합니다.",
    meta: "/reports",
  },
  {
    href: "/events",
    title: "03 · 운영 콘솔",
    body: "그 다음에 실제 이벤트 큐와 timeline으로 내려가 operator 흐름을 확인합니다.",
    meta: "/events",
  },
] as const;

const DEFAULT_PROOF_PATH = PROOF_PATHS[0];

const LANDING_SIGNALS = [
  {
    label: "기본 모드",
    value: "Demo-first honesty",
    note: "live 소스가 없어도 blank 화면 대신 운영 루프와 evidence path를 먼저 보여줍니다.",
  },
  {
    label: "첫 클릭",
    value: "Proof before polish",
    note: "health → reports → events 순서로 recruiter와 reviewer가 바로 읽을 수 있게 정리했습니다.",
  },
  {
    label: "handoff 톤",
    value: "Operator story 유지",
    note: "과장된 control room 연출보다 dispatch · handoff · SLA proof 흐름을 앞세웁니다.",
  },
] as const;

export default function DashboardPage() {
  return (
    <div className="pageStack">
      <section className="hero heroLuxury reveal in-view landingHero">
        <div className="heroCopy">
          <div className="landingTrustRow" aria-label="landing guarantees">
            <span className="chip" data-tone="watch">
              Demo-first
            </span>
            <span className="chip" data-tone="calm">
              Reviewer-safe routes
            </span>
            <span className="chip" data-tone="critical">
              Handoff-aware
            </span>
          </div>

          <p className="kicker">TwinCity operator front door</p>
          <h1 className="heroTitle">첫 화면에서 바로 운영 맥락과 검증 경로가 보이는 홈</h1>
          <p className="heroLead">
            실시간 연결이 비어 있어도 첫 화면을 빈 상태로 두지 않고, 지금 바로 확인할 수 있는 운영 맥락과
            proof path를 먼저 보여줍니다. 과장된 control room 연출보다 reviewer가 바로 따라갈 수 있는
            health → reports → events 순서를 앞세웠습니다.
          </p>

          <div className="landingStatGrid">
            {LANDING_SIGNALS.map((item) => (
              <article key={item.label} className="landingStatCard">
                <span>{item.label}</span>
                <strong>{item.value}</strong>
                <p>{item.note}</p>
              </article>
            ))}
          </div>

          <div className="landingHonestyCard">
            <p className="kicker">Recommended first click</p>
            <strong>{DEFAULT_PROOF_PATH.title}</strong>
            <p>{DEFAULT_PROOF_PATH.body}</p>
            <span className="mono">{DEFAULT_PROOF_PATH.meta}</span>
          </div>

          <div className="ctaRow">
            <Link className="button" href="/api/health">
              상태 먼저 확인
            </Link>
            <Link className="button buttonGhost" href="/reports">
              리포트 proof 보기
            </Link>
            <Link className="button buttonGhost" href="/events">
              운영 콘솔 보기
            </Link>
          </div>
        </div>

        <aside className="heroCopy landingProofRail">
          <p className="kicker">First-click proof path</p>
          <h2 className="panelTitle">1분 안에 제품의 진짜 이야기를 확인하는 순서</h2>
          <p className="landingProofLead">
            채용 담당자나 reviewer가 처음 열었을 때도, 무엇이 live이고 무엇이 staged인지 바로 읽을 수
            있는 순서만 남겼습니다.
          </p>

          <div className="landingProofGrid">
            {PROOF_PATHS.map((item) => (
              <Link key={item.href} className="landingProofCard" href={item.href}>
                <strong>{item.title}</strong>
                <p>{item.body}</p>
                <span className="mono">{item.meta}</span>
              </Link>
            ))}
          </div>

          <div className="landingHonestyCard">
            <p className="kicker">Operator-story honesty</p>
            <ul className="textList landingHonestyList">
              <li>실시간 소스가 없으면 demo 데이터를 숨기지 않고 그대로 설명합니다.</li>
              <li>첫 화면은 visual spectacle보다 dispatch · handoff proof를 우선합니다.</li>
              <li>첫 클릭 이후엔 기존 운영 콘솔과 리포트 surface로 자연스럽게 이어집니다.</li>
            </ul>
          </div>
        </aside>
      </section>

      <section className="panel reveal in-view landingSupportPanel">
        <div className="landingSupportHead">
          <div>
            <p className="kicker">Why this landing exists</p>
            <h2 className="panelTitle">빈 첫 화면 대신, 읽히는 front door를 남겼습니다</h2>
          </div>
          <span className="chip" data-tone="calm">
            bounded Wave A
          </span>
        </div>
        <div className="landingSupportGrid">
          <article className="landingSupportCard">
            <strong>브라우저 첫 인상</strong>
            <p>SSR 단계에서 바로 읽히는 홈 카피와 proof 링크를 먼저 렌더링합니다.</p>
          </article>
          <article className="landingSupportCard">
            <strong>채용 / 리뷰어 가시성</strong>
            <p>health, reports, events로 이어지는 첫 클릭 경로를 한 섹션에 묶었습니다.</p>
          </article>
          <article className="landingSupportCard">
            <strong>제품 정직성</strong>
            <p>완전한 live 제어실처럼 포장하지 않고, 현재 강한 surface를 앞세웠습니다.</p>
          </article>
        </div>
      </section>
    </div>
  );
}
