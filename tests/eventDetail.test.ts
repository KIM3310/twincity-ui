import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";

import EventDetail from "@/components/EventDetail";

describe("event detail next step guidance", () => {
  test("shows the next-step card for a new incident", () => {
    const html = renderToStaticMarkup(
      EventDetail({
        event: {
          id: "evt-1",
          store_id: "store-a",
          detected_at: Date.now(),
          ingested_at: Date.now(),
          latency_ms: 200,
          type: "fall",
          severity: 2,
          confidence: 0.86,
          zone_id: "zone-a",
          source: "camera",
          incident_status: "new",
          x: 0.4,
          y: 0.5,
        },
      })
    );

    expect(html).toContain("다음 권장 단계");
    expect(html).toContain("먼저 확인 처리로 담당자가 이 건을 잡았다는 신호를 남기고");
    expect(html).toContain("상태 변경은 확인 → 직원 호출 → 처리 종료 순서");
  });

  test("shows evidence-first guidance for a low-confidence incident", () => {
    const html = renderToStaticMarkup(
      EventDetail({
        event: {
          id: "evt-low",
          store_id: "store-a",
          detected_at: Date.now(),
          ingested_at: Date.now(),
          latency_ms: 220,
          type: "fall",
          severity: 2,
          confidence: 0.72,
          zone_id: "zone-a",
          source: "camera",
          incident_status: "new",
          x: 0.4,
          y: 0.5,
        },
      })
    );

    expect(html).toContain("신뢰도가 낮아서");
    expect(html).toContain("operator handoff는 현장 확인 뒤에");
  });
});
