import { apiJson, resolveRequestId } from "@/lib/apiResponse";
import { buildRuntimeMeta } from "@/lib/runtimeMeta";
import { buildControlTowerServiceMeta } from "@/lib/serviceMeta";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const requestId = resolveRequestId(request);
  const runtimeMeta = buildRuntimeMeta();
  const serviceMeta = buildControlTowerServiceMeta();

  return apiJson(
    {
      ok: true,
      request_id: requestId,
      service: runtimeMeta.service,
      status: runtimeMeta.status,
      now: runtimeMeta.generated_at,
      live_sources: runtimeMeta.live_sources,
      diagnostics: runtimeMeta.diagnostics,
      ops_contract: runtimeMeta.ops_contract,
      capabilities: [
        "service-metadata-surface",
        "runtime-brief-surface",
        "runtime-scorecard-surface",
        "report-schema-surface",
        "report-summary-surface",
        "dispatch-board-surface",
        "handoff-brief-surface",
      ],
      service_grade: {
        readiness: serviceMeta.readiness_contract,
        runtime_brief: "/api/runtime-brief",
        runtime_scorecard: "/api/runtime-scorecard",
        report_schema: "/api/schema/report",
        report_summary: "/api/reports/summary",
        dispatch_board: "/api/reports/dispatch-board",
        report_handoff: "/api/reports/handoff",
        report_export: "/api/reports/export",
      },
      links: {
        meta: "/api/meta",
        runtime_brief: "/api/runtime-brief",
        runtime_scorecard: "/api/runtime-scorecard",
        report_schema: "/api/schema/report",
        report_summary: "/api/reports/summary",
        dispatch_board: "/api/reports/dispatch-board",
        report_handoff: "/api/reports/handoff",
        report_export: "/api/reports/export",
        reports: "/reports",
      },
    },
    { requestId }
  );
}
