import {
  buildControlTowerDispatchBoard,
  buildControlTowerResponsePlaybook,
  buildControlTowerReportSummary,
} from "@/lib/reportSummary";
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
  const dispatchBoard = buildControlTowerDispatchBoard({
    now: nowMs,
    filters: {
      range: "all",
      severity: "all",
      incident_status: "all",
      zone: "all",
      lane: "all",
    },
  });
  const responsePlaybook = buildControlTowerResponsePlaybook({
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
        "/api/reports/dispatch-board",
        "/api/reports/assignment-history",
        "/api/reports/handoff",
        "/api/reports/response-playbook",
        "/api/reports/export",
        "/api/reports/reviewer-bundle",
        "/api/reports/reviewer-bundle/verify",
      ],
    },
    summary: {
      total_incidents: reportSummary.summary.total_incidents,
      critical_incidents: reportSummary.summary.critical_incidents,
      open_incidents: reportSummary.summary.open_incidents,
      attention_incidents: dispatchBoard.summary.attention_count,
      dispatch_lane_incidents: dispatchBoard.summary.dispatch_count,
      response_focus_lane: responsePlaybook.focus_lane,
      response_drills_required: responsePlaybook.summary.drills_required,
      top_zone: reportSummary.top_zones[0]?.zone_id ?? null,
      top_type: reportSummary.top_types[0]?.type ?? null,
      export_auth_enabled: operatorAuth.enabled,
    },
    spotlight: reportSummary.spotlight_incidents[0] ?? null,
    recommendations: [
      operatorAuth.enabled
        ? "Use the operator token before exporting JSON or CSV snapshots for reviewer handoff."
        : "Exports are open in demo mode; keep them tied to deterministic report summary output.",
      "Use the dispatch board to confirm unresolved queue posture before sharing a report snapshot.",
      "Use the shift handoff brief to highlight overdue queue risk before reviewer handoff.",
      "Use the response playbook to confirm escalation owner and next checkpoint timing before actioning incidents.",
      "Generate and verify the status bundle digest when export integrity matters.",
      "Verify report summary before sharing export artifacts with reviewers.",
      "Keep ingest-mode posture and SLA snapshot paired during walkthroughs.",
    ],
    links: {
      health: "/api/health",
      meta: "/api/meta",
      runtime_brief: "/api/runtime-brief",
      runtime_scorecard: "/api/runtime-scorecard",
      report_summary: "/api/reports/summary",
      dispatch_board: "/api/reports/dispatch-board",
      assignment_history: "/api/reports/assignment-history",
      report_handoff: "/api/reports/handoff",
      response_playbook: "/api/reports/response-playbook",
      report_export: "/api/reports/export",
      reviewer_bundle: "/api/reports/reviewer-bundle",
      reviewer_bundle_verify: "/api/reports/reviewer-bundle/verify",
      reports: "/reports",
    },
  };
}
