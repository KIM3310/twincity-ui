import { buildRuntimeMeta } from "@/lib/runtimeMeta";

type RuntimeMeta = ReturnType<typeof buildRuntimeMeta>;

export type ServiceArtifact = {
  label: string;
  href: string;
  kind: "route" | "doc" | "test" | "asset";
  note: string;
};

export type ServiceStage = {
  id: string;
  title: string;
  outcome: string;
  owner: string;
  evidence: string;
};

export type ReportSchema = {
  schema: "twincity-report-v1";
  version: 1;
  required_sections: string[];
  export_formats: string[];
  operator_rules: string[];
};

export type ControlTowerServiceMeta = {
  service: RuntimeMeta["service"];
  status: RuntimeMeta["status"];
  generated_at: string;
  mode: "demo-first" | "live-wired";
  headline: string;
  readiness_contract: "control-tower-readiness-v1";
  live_sources: RuntimeMeta["live_sources"];
  diagnostics: RuntimeMeta["diagnostics"];
  ops_contract: RuntimeMeta["ops_contract"];
  ingest_contract: RuntimeMeta["ops_contract"];
  report_contract: ReportSchema;
  evidence_counts: {
    routes: number;
    docs: number;
    tests: number;
    assets: number;
  };
  trust_boundary: string[];
  operator_rules: string[];
  strengths: string[];
  watchouts: string[];
  review_flow: string[];
  two_minute_review: string[];
  stages: ServiceStage[];
  artifacts: ServiceArtifact[];
  proof_assets: ServiceArtifact[];
  routes: string[];
  features: string[];
};

export type ControlTowerRuntimeBrief = {
  service: RuntimeMeta["service"];
  status: RuntimeMeta["status"];
  generated_at: string;
  mode: "demo-first" | "live-wired";
  headline: string;
  readiness_contract: "control-tower-runtime-brief-v1";
  live_sources: RuntimeMeta["live_sources"];
  diagnostics: RuntimeMeta["diagnostics"];
  report_contract: ReportSchema;
  evidence_counts: ControlTowerServiceMeta["evidence_counts"];
  review_flow: string[];
  two_minute_review: ControlTowerServiceMeta["two_minute_review"];
  watchouts: string[];
  proof_assets: ControlTowerServiceMeta["proof_assets"];
  route_count: number;
  links: {
    health: string;
    runtime_brief: string;
    runtime_scorecard?: string;
    meta: string;
    report_schema: string;
    report_summary: string;
    report_export: string;
    reports: string;
  };
};

const CONTROL_TOWER_STAGES: ServiceStage[] = [
  {
    id: "detect",
    title: "Detect",
    outcome: "카메라/연동 이벤트를 실시간 또는 데모 피드로 수집",
    owner: "transport layer",
    evidence: "WS -> SSE -> HTTP polling fallback",
  },
  {
    id: "normalize",
    title: "Normalize",
    outcome: "이기종 payload를 하나의 EventItem schema로 정규화",
    owner: "event adapter",
    evidence: "eventAdapter + signalChecks tests",
  },
  {
    id: "triage",
    title: "Triage",
    outcome: "맵, 리스트, 상세 패널을 동기화해 운영자가 우선순위를 판단",
    owner: "ops console",
    evidence: "events page + SLA alert panel",
  },
  {
    id: "dispatch",
    title: "Dispatch",
    outcome: "ACK / dispatch / resolve timeline으로 현장 대응을 기록",
    owner: "timeline workflow",
    evidence: "IncidentTimeline + local timeline persistence",
  },
  {
    id: "report",
    title: "Report",
    outcome: "SLA, top zones, type distribution을 CSV와 summary로 내보냄",
    owner: "reports surface",
    evidence: "/reports + twincity-report-v1 schema",
  },
];

const CONTROL_TOWER_ARTIFACTS: ServiceArtifact[] = [
  {
    label: "Health API",
    href: "/api/health",
    kind: "route",
    note: "ingest mode, readiness, review links",
  },
  {
    label: "Service Meta",
    href: "/api/meta",
    kind: "route",
    note: "control tower posture and trust boundary",
  },
  {
    label: "Runtime Brief",
    href: "/api/runtime-brief",
    kind: "route",
    note: "review-first contract for reports and operator proof",
  },
  {
    label: "Runtime Scorecard",
    href: "/api/runtime-scorecard",
    kind: "route",
    note: "ingest posture, export auth, and SLA snapshot in one compact contract",
  },
  {
    label: "Report Schema",
    href: "/api/schema/report",
    kind: "route",
    note: "incident report contract for reviewers",
  },
  {
    label: "Reports View",
    href: "/reports",
    kind: "route",
    note: "SLA metrics, exports, replay summary",
  },
  {
    label: "Report Summary API",
    href: "/api/reports/summary",
    kind: "route",
    note: "deterministic SLA and spotlight summary contract",
  },
  {
    label: "Report Export API",
    href: "/api/reports/export",
    kind: "route",
    note: "server-generated JSON and CSV report snapshots",
  },
  {
    label: "Live Integration Guide",
    href: "docs/LIVE_INTEGRATION.md",
    kind: "doc",
    note: "payload examples and transport fallbacks",
  },
  {
    label: "Runbook",
    href: "RUNBOOK.md",
    kind: "doc",
    note: "operator and release guidance",
  },
  {
    label: "Postmortem Template",
    href: "POSTMORTEM_TEMPLATE.md",
    kind: "doc",
    note: "incident follow-up surface",
  },
  {
    label: "Runtime Route Tests",
    href: "tests/runtimeRoutes.test.ts",
    kind: "test",
    note: "route contract verification",
  },
  {
    label: "Ops Console Screenshot",
    href: "public/screenshots/ops_console.png",
    kind: "asset",
    note: "reviewable operator UI proof",
  },
];

const CONTROL_TOWER_PROOF_ASSETS: ServiceArtifact[] = [
  {
    label: "Health API",
    href: "/api/health",
    kind: "route",
    note: "ingest mode, readiness, review links",
  },
  {
    label: "Service Meta",
    href: "/api/meta",
    kind: "route",
    note: "control tower posture and trust boundary",
  },
  {
    label: "Runtime Scorecard",
    href: "/api/runtime-scorecard",
    kind: "route",
    note: "ingest posture, export auth, and SLA snapshot in one compact contract",
  },
  {
    label: "Reports View",
    href: "/reports",
    kind: "route",
    note: "SLA metrics, exports, replay summary",
  },
  {
    label: "Report Summary API",
    href: "/api/reports/summary",
    kind: "route",
    note: "deterministic SLA and spotlight summary contract",
  },
  {
    label: "Report Export API",
    href: "/api/reports/export",
    kind: "route",
    note: "server-generated JSON and CSV report snapshots",
  },
  {
    label: "Ops Console Screenshot",
    href: "public/screenshots/ops_console.png",
    kind: "asset",
    note: "reviewable operator UI proof",
  },
];

export function buildControlTowerReportSchema(): ReportSchema {
  return {
    schema: "twincity-report-v1",
    version: 1,
    required_sections: [
      "time_range",
      "summary",
      "sla",
      "top_types",
      "top_zones",
      "open_incidents",
      "operator_notes",
    ],
    export_formats: ["csv", "clipboard-summary"],
    operator_rules: [
      "Always separate ACK SLA from resolve SLA.",
      "Every summary must trace back to normalized EventItem data and timeline events.",
      "Do not claim live integration unless a transport endpoint is configured and healthy.",
    ],
  };
}

export function buildControlTowerServiceMeta(now = new Date()): ControlTowerServiceMeta {
  const runtimeMeta = buildRuntimeMeta(now);
  const mode = runtimeMeta.diagnostics.ingest_mode === "demo" ? "demo-first" : "live-wired";
  const reportContract = buildControlTowerReportSchema();
  const ingestModeLabel =
    runtimeMeta.diagnostics.ingest_mode === "demo"
      ? "browser-local demo transport"
      : `${runtimeMeta.diagnostics.ingest_mode.toUpperCase()} live transport`;

  return {
    service: runtimeMeta.service,
    status: runtimeMeta.status,
    generated_at: runtimeMeta.generated_at,
    mode,
    headline:
      "Digital twin UI that makes payload -> operator decision -> report flow reviewable in one pass.",
    readiness_contract: "control-tower-readiness-v1",
    live_sources: runtimeMeta.live_sources,
    diagnostics: runtimeMeta.diagnostics,
    ops_contract: runtimeMeta.ops_contract,
    ingest_contract: runtimeMeta.ops_contract,
    report_contract: reportContract,
    evidence_counts: {
      routes: 8,
      docs: 4,
      tests: 5,
      assets: 4,
    },
    trust_boundary: [
      `ingest: ${ingestModeLabel}`,
      "normalize: provider payloads converge into EventItem",
      "state: browser-local replay and timeline persistence",
      "map: floorplan + zone polygons + optional homography",
      "validation: 3D probe routes stay optional and review-only",
    ],
    operator_rules: [
      "Keep the operator loop visible before any deep-dive debugging.",
      "Treat replay and live transport as separate trust domains.",
      "Prefer schema-backed summaries over free-form screenshots.",
    ],
    strengths: [
      "No backend is required to review the end-to-end operator loop.",
      "Payload normalization and spatial mapping are explicit, not implied.",
      "SLA metrics and exports are already present in the product surface.",
    ],
    watchouts: [
      "Demo mode can hide auth, backpressure, and noisy provider payloads.",
      "Reports currently summarize browser-local state, not a central incident store.",
      "3D validation routes are for geometry checks, not production rendering.",
    ],
    review_flow: [
      "Open /api/health to confirm ingest mode and review links.",
      "Read /api/meta to see trust boundary, stages, and evidence counts.",
      "Use /api/reports/summary to verify a deterministic SLA snapshot before UI review.",
      "Use /api/reports/export to validate server-generated JSON or CSV handoff payloads.",
      "Use /events or / to exercise triage and timeline handling.",
      "Open /reports for SLA proof and exported summary paths.",
    ],
    two_minute_review: [
      "Open /api/health to confirm whether the control tower is demo-first or live-wired.",
      "Read /api/meta for trust boundary, stage ownership, and review artifacts.",
      "Use /api/reports/summary to validate spotlight incidents and SLA posture via API.",
      "Use /api/reports/export to validate server-side handoff payloads before sharing a report.",
      "Open /reports to validate SLA proof and export posture.",
      "Use /events to inspect one alert through triage, dispatch, and timeline state.",
    ],
    stages: CONTROL_TOWER_STAGES,
    artifacts: CONTROL_TOWER_ARTIFACTS,
    proof_assets: CONTROL_TOWER_PROOF_ASSETS,
    routes: [...runtimeMeta.routes, "/api/runtime-brief", "/api/runtime-scorecard", "/api/schema/report", "/api/reports/summary", "/api/reports/export", "/reports"],
    features: runtimeMeta.features,
  };
}

export function buildControlTowerRuntimeBrief(now = new Date()): ControlTowerRuntimeBrief {
  const serviceMeta = buildControlTowerServiceMeta(now);

  return {
    service: serviceMeta.service,
    status: serviceMeta.status,
    generated_at: serviceMeta.generated_at,
    mode: serviceMeta.mode,
    headline:
      "Control tower review pack that keeps ingest mode, export contract, and operator proof visible before deep-dive debugging.",
    readiness_contract: "control-tower-runtime-brief-v1",
    live_sources: serviceMeta.live_sources,
    diagnostics: serviceMeta.diagnostics,
    report_contract: serviceMeta.report_contract,
    evidence_counts: serviceMeta.evidence_counts,
    review_flow: serviceMeta.review_flow,
    two_minute_review: serviceMeta.two_minute_review,
    watchouts: serviceMeta.watchouts,
    proof_assets: serviceMeta.proof_assets,
    route_count: serviceMeta.routes.length,
    links: {
      health: "/api/health",
      runtime_brief: "/api/runtime-brief",
      runtime_scorecard: "/api/runtime-scorecard",
      meta: "/api/meta",
      report_schema: "/api/schema/report",
      report_summary: "/api/reports/summary",
      report_export: "/api/reports/export",
      reports: "/reports",
    },
  };
}
