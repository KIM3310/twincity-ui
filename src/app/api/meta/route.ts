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
        report_schema: "/api/schema/report",
        report_summary: "/api/reports/summary",
        reports: "/reports",
      },
    },
    { requestId }
  );
}
