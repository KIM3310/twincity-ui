import Link from "next/link";

const LOADING_PATHS = [
  ["상태 먼저 확인", "/api/health"],
  ["리포트 proof 보기", "/reports"],
  ["운영 콘솔로 이동", "/events"],
] as const;

export default function Loading() {
  return (
    <div className="pageStack" style={{ minHeight: "78vh", alignContent: "start" }}>
      <section className="hero heroLuxury landingHero">
        <div className="heroCopy">
          <div className="landingTrustRow" aria-label="loading landing guarantees">
            <span className="chip" data-tone="watch">
              Preparing live surface
            </span>
            <span className="chip" data-tone="calm">
              Proof path stays visible
            </span>
          </div>
          <p className="kicker">Loading</p>
          <h1 className="heroTitle">운영 화면을 준비하는 동안에도 front door는 비워두지 않습니다</h1>
          <p className="heroLead">
            지도와 최근 알림을 정리하는 중입니다. 그동안 reviewer가 먼저 볼 수 있는 경로와 현재 제품
            톤을 위에 고정해 두었습니다.
          </p>
          <div className="landingPulseRow" aria-hidden="true">
            <span className="landingPulseBlock landingPulseBlockWide" />
            <span className="landingPulseBlock" />
            <span className="landingPulseBlock" />
          </div>
        </div>

        <aside className="heroCopy landingProofRail">
          <p className="kicker">Still useful while loading</p>
          <h2 className="panelTitle">먼저 눌러볼 수 있는 경로</h2>
          <div className="landingProofGrid">
            {LOADING_PATHS.map(([label, href]) => (
              <Link key={href} className="landingProofCard" href={href}>
                <strong>{label}</strong>
                <p>첫 화면이 길게 비어 보이지 않도록 proof-first 경로를 유지합니다.</p>
                <span className="mono">{href}</span>
              </Link>
            ))}
          </div>
        </aside>
      </section>
    </div>
  );
}
