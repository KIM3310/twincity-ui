import { apiJson, resolveRequestId } from "@/lib/apiResponse";
import {
  buildControlTowerResponsePlaybook,
  parseReportSummaryFilters,
} from "@/lib/reportSummary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const requestId = resolveRequestId(request);
  const url = new URL(request.url);
  const filters = parseReportSummaryFilters(url);
  const playbook = buildControlTowerResponsePlaybook({ filters });

  return apiJson(
    {
      ok: true,
      request_id: requestId,
      ...playbook,
    },
    { requestId }
  );
}
