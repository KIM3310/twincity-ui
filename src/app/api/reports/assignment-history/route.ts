import { apiJson, resolveRequestId } from "@/lib/apiResponse";
import {
  buildControlTowerAssignmentHistory,
  parseReportSummaryFilters,
} from "@/lib/reportSummary";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const requestId = resolveRequestId(request);
  const url = new URL(request.url);
  const filters = parseReportSummaryFilters(url);
  const history = buildControlTowerAssignmentHistory({ filters });

  return apiJson(
    {
      ok: true,
      request_id: requestId,
      ...history,
    },
    { requestId }
  );
}
