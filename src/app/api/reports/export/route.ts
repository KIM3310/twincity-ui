import { apiError, apiJson, noStoreHeaders, resolveRequestId } from "@/lib/apiResponse";
import { authorizeOperatorRequest, readOperatorAuthStatus } from "@/lib/operatorAccess";
import {
  buildControlTowerReportCsv,
  buildControlTowerReportExport,
  parseReportSummaryFilters,
} from "@/lib/reportSummary";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const requestId = resolveRequestId(request);
  const url = new URL(request.url);
  const filters = parseReportSummaryFilters(url);
  const format = String(url.searchParams.get("format") || "json").trim().toLowerCase();
  const operatorAuth = readOperatorAuthStatus();

  if (format !== "json" && format !== "csv") {
    return apiError("format must be either 'json' or 'csv'", { status: 400, requestId });
  }

  if (operatorAuth.enabled && !authorizeOperatorRequest(request)) {
    return apiError("operator token required for export", {
      status: 401,
      requestId,
      headers: {
        "x-required-operator-header": operatorAuth.header,
      },
    });
  }

  if (format === "csv") {
    return new Response(buildControlTowerReportCsv({ filters }), {
      status: 200,
      headers: noStoreHeaders(requestId, {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="twincity-report-${new Date().toISOString().slice(0, 10)}.csv"`,
      }),
    });
  }

  return apiJson(
    {
      ok: true,
      request_id: requestId,
      operator_auth: operatorAuth,
      ...buildControlTowerReportExport({ filters }),
    },
    { requestId }
  );
}
