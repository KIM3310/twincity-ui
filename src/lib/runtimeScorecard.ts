import { buildControlTowerReportSummary } from "@/lib/reportSummary";
import { buildRuntimeMeta } from "@/lib/runtimeMeta";
import { readOperatorAuthStatus } from "@/lib/operatorAccess";

export function buildControlTowerRuntimeScorecard(now = new Date()) {
  const nowMs = now.getTime();
  const runtimeMeta = buildRuntimeMeta(now);
  const reportSummary = buildControlTowerReportSummary({
    now: nowMs,
    filters: {
      range: "all",
      severity: "all",
      incident_status: "all",
      zone: "all",
    },
  });
  const operatorAuth = readOperatorAuthStatus();

  return {
    service: runtimeMeta.service,
    status: runtimeMeta.status,
    generated_at: now.toISOString(),
    readiness_contract: "twincity-runtime-scorecard-v1",
    headline:
      "Runtime scorecard for ingest posture, report export governance, and deterministic SLA review in the control tower.",
    runtime: {
      execution_model: "edge",
      live_sources: runtimeMeta.live_sources,
      diagnostics: runtimeMeta.diagnostics,
      operator_auth: operatorAuth,
      review_routes: [
        "/api/health",
        "/api/meta",
        "/api/runtime-brief",
        "/api/runtime-scorecard",
        "/api/reports/summary",
        "/api/reports/export",
      ],
    },
    summary: {
      total_incidents: reportSummary.summary.total_incidents,
      critical_incidents: reportSummary.summary.critical_incidents,
      open_incidents: reportSummary.summary.open_incidents,
      top_zone: reportSummary.top_zones[0]?.zone_id ?? null,
      top_type: reportSummary.top_types[0]?.type ?? null,
      export_auth_enabled: operatorAuth.enabled,
    },
    spotlight: reportSummary.spotlight_incidents[0] ?? null,
    recommendations: [
      operatorAuth.enabled
        ? "Use the operator token before exporting JSON or CSV snapshots for reviewer handoff."
        : "Exports are open in demo mode; keep them tied to deterministic report summary output.",
      "Verify report summary before sharing export artifacts with reviewers.",
      "Keep ingest-mode posture and SLA snapshot paired during walkthroughs.",
    ],
    links: {
      health: "/api/health",
      meta: "/api/meta",
      runtime_brief: "/api/runtime-brief",
      runtime_scorecard: "/api/runtime-scorecard",
      report_summary: "/api/reports/summary",
      report_export: "/api/reports/export",
      reports: "/reports",
    },
  };
}
