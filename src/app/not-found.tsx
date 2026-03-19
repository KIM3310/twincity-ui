import Link from "next/link";

export default function NotFound() {
  return (
    <div className="pageStack">
      <section className="panel reveal in-view" style={{ padding: "1.2rem" }}>
        <p className="kicker">404</p>
        <h1 className="pageTitle">찾을 수 없는 페이지입니다</h1>
        <p className="pageLead">
          주소가 바뀌었거나 삭제되었을 수 있어요. 상황판으로 돌아가서 다시 선택해 주세요.
        </p>

        <div style={{ display: "grid", gap: "0.6rem", marginTop: "1rem" }}>
          <div className="landingProofGrid" style={{ maxWidth: "560px" }}>
            <Link className="landingProofCard" href="/">
              <strong>상황판으로</strong>
              <p>운영 화면에서 다시 시작합니다.</p>
              <span className="mono">/</span>
            </Link>
            <Link className="landingProofCard" href="/reports">
              <strong>리포트 proof 보기</strong>
              <p>dispatch, handoff, export를 한 화면에서 확인합니다.</p>
              <span className="mono">/reports</span>
            </Link>
          </div>
        </div>

        <div className="ctaRow" style={{ marginTop: "1.1rem" }}>
          <Link className="button" href="/">
            상황판으로
          </Link>
          <Link className="button buttonGhost" href="/brand">
            서비스 소개
          </Link>
        </div>
      </section>
    </div>
  );
}

