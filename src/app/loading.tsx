export default function Loading() {
  return (
    <div
      className="pageStack"
      style={{ minHeight: "78vh", alignContent: "start", padding: "min(5vw, 40px) 0" }}
    >
      <section
        className="panel reveal in-view"
        style={{
          maxWidth: 760,
          margin: "0 auto",
          padding: "1.4rem",
          background: "rgba(255,255,255,0.9)",
          border: "1px solid rgba(34,44,58,0.12)",
          boxShadow: "0 20px 44px rgba(22, 30, 43, 0.12)",
        }}
      >
        <p className="kicker">Loading</p>
        <h1 className="pageTitle">화면을 준비하고 있어요</h1>
        <p className="pageLead">지도를 불러오고 최근 알림을 정리하는 중입니다.</p>
        <p
          style={{
            marginTop: "0.8rem",
            fontSize: "0.92rem",
            color: "rgba(53, 64, 79, 0.84)",
            lineHeight: 1.6,
          }}
        >
          첫 화면이 오래 비어 보이지 않도록, 기본 운영 계약과 최근 surface를 먼저 정리해두고
          있습니다.
        </p>
      </section>
    </div>
  );
}
