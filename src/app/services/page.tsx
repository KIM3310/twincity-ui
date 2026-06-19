import type { Metadata } from "next";
import Link from "next/link";
import serviceOffer from "../../../public/service-offer.json";

export const metadata: Metadata = {
  title: "서비스",
  description:
    "TwinCity UI service offer with a free public demo, private workspace boundary, event ingestion, and monthly readiness reports.",
  alternates: {
    canonical: "/services",
  },
};

const meteringHooks = serviceOffer.monetization_boundary.metering_hooks;
const costGuardrails = serviceOffer.monetization_boundary.cost_guardrails;

export default function ServicesPage() {
  return (
    <div className="pageStack">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(serviceOffer.structured_data),
        }}
      />

      <header className="pageHeading reveal">
        <p className="kicker">Service</p>
        <h1 className="pageTitle">무료 데모에서 private workspace로 이어지는 운영 서비스</h1>
        <p className="pageLead">
          TwinCity UI는 synthetic event demo를 먼저 공개하고, 실제 수익화는 private map, event ingestion,
          monthly readiness report처럼 고객 데이터와 반복 운영 가치가 생기는 지점에서 시작합니다.
        </p>
      </header>

      <section className="sectionBlock reveal delay-1">
        <div className="sectionHead">
          <p className="kicker">Offer boundary</p>
          <h2>검색 가능한 무료 표면과 유료 전환 지점</h2>
        </div>

        <div className="metricGrid">
          <article className="metricCard">
            <p className="metricLabel">Free entry</p>
            <p className="metricValue">Demo</p>
            <p className="metricNote">{serviceOffer.free_lead_magnet}</p>
          </article>
          <article className="metricCard">
            <p className="metricLabel">Paid boundary</p>
            <p className="metricValue">Workspace</p>
            <p className="metricNote">{serviceOffer.first_paid_sku}</p>
          </article>
          <article className="metricCard">
            <p className="metricLabel">Primary query</p>
            <p className="metricValue">Search</p>
            <p className="metricNote">{serviceOffer.search_positioning.primary_query}</p>
          </article>
        </div>
      </section>

      <section className="splitBlock reveal delay-2">
        <article className="panel">
          <h2 className="panelTitle">Metering hooks</h2>
          <div className="principleGrid">
            {meteringHooks.map((hook) => (
              <article key={hook} className="principleCard">
                <h3>{hook}</h3>
                <p>Plan, quota, export, and lead-source state can attach here before payment is connected.</p>
              </article>
            ))}
          </div>
        </article>

        <article className="panel">
          <h2 className="panelTitle">Cost guardrails</h2>
          <div className="principleGrid">
            {costGuardrails.map((guardrail) => (
              <article key={guardrail} className="principleCard">
                <h3>{guardrail}</h3>
                <p>Keep the public surface lightweight until a private workspace or recurring report proves demand.</p>
              </article>
            ))}
          </div>
        </article>
      </section>

      <section className="contactPanel reveal delay-3">
        <h2>Service artifacts</h2>
        <div className="contactGrid">
          <article className="contactCard">
            <p>Architecture</p>
            <strong>docs/system-architecture.md</strong>
          </article>
          <article className="contactCard">
            <p>Revenue path</p>
            <strong>docs/revenue-architecture.md</strong>
          </article>
          <article className="contactCard">
            <p>Machine readable</p>
            <strong>/service-offer.json</strong>
          </article>
        </div>
        <div className="ctaRow" style={{ marginTop: "1rem" }}>
          <a className="button" href={serviceOffer.lead_capture_url}>
            Private workspace 문의
          </a>
          <Link className="button" href="/">
            상황판 열기
          </Link>
          <a className="button buttonGhost" href={serviceOffer.revenue_architecture_url}>
            Revenue architecture
          </a>
          <a className="button buttonGhost" href={serviceOffer.repository_url}>
            Repository
          </a>
        </div>
      </section>
    </div>
  );
}
