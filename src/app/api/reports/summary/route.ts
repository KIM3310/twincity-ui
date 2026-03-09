import { apiJson, resolveRequestId } from "@/lib/apiResponse";
import {
  buildControlTowerReportSummary,
  parseReportSummaryFilters,
} from "@/lib/reportSummary";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const requestId = resolveRequestId(request);
  const url = new URL(request.url);
  const filters = parseReportSummaryFilters(url);
  const summary = buildControlTowerReportSummary({ filters });

  return apiJson(
    {
      ok: true,
      request_id: requestId,
      ...summary,
    },
    { requestId }
  );
}
