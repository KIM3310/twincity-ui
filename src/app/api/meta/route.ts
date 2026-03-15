import { apiJson, resolveRequestId } from "@/lib/apiResponse";
import { buildControlTowerServiceMeta } from "@/lib/serviceMeta";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const requestId = resolveRequestId(request);
  const runtimeMeta = buildControlTowerServiceMeta();

  return apiJson(
    {
      ok: true,
      request_id: requestId,
      ...runtimeMeta,
      links: {
        health: "/api/health",
        runtime_brief: "/api/runtime-brief",
        runtime_scorecard: "/api/runtime-scorecard",
        report_schema: "/api/schema/report",
        report_summary: "/api/reports/summary",
        dispatch_board: "/api/reports/dispatch-board",
        report_handoff: "/api/reports/handoff",
        report_export: "/api/reports/export",
        reviewer_bundle: "/api/reports/reviewer-bundle",
        reviewer_bundle_verify: "/api/reports/reviewer-bundle/verify",
        reports: "/reports",
      },
    },
    { requestId }
  );
}
