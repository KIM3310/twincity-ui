export function buildProofRouteMap() {
  return {
    contract_version: "twincity-proof-route-map-v1",
    headline:
      "Front-door route map for choosing the right TwinCity proof lane before opening the full operator console.",
    reviewer_fast_path: [
      "/api/proof-route-map",
      "/api/health",
      "/api/meta",
      "/api/runtime-scorecard",
      "/reports",
      "/events",
    ],
    route_groups: {
      posture: ["/api/health", "/api/meta", "/api/runtime-scorecard"],
      reviewer: ["/api/reports/summary", "/api/reports/handoff", "/api/reports/export", "/reports"],
      operator: ["/events"],
    },
    decision_support: [
      {
        need: "연결 신호와 live/demo 경계를 먼저 설명해야 할 때",
        route: "/api/health",
      },
      {
        need: "handoff / export proof를 먼저 설명해야 할 때",
        route: "/reports",
      },
      {
        need: "실제 운영 큐와 timeline 흐름을 바로 보여줘야 할 때",
        route: "/events",
      },
    ],
  };
}
