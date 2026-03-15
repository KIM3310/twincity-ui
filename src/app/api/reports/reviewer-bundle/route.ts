import { apiError, apiJson, resolveRequestId } from "@/lib/apiResponse";
import { readOperatorAuthStatus, validateOperatorRequest } from "@/lib/operatorAccess";
import { buildControlTowerReviewerBundle } from "@/lib/reviewerBundle";
import { parseReportSummaryFilters } from "@/lib/reportSummary";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const requestId = resolveRequestId(request);
  const operatorAuth = readOperatorAuthStatus();
  if (operatorAuth.enabled) {
    const authResult = validateOperatorRequest(request);
    if (!authResult.ok) {
      return apiError(
        authResult.reason === "missing-role"
          ? "required operator role missing for reviewer bundle"
          : "operator token required for reviewer bundle",
        {
          status: authResult.reason === "missing-role" ? 403 : 401,
          requestId,
          headers: {
            "x-required-operator-header": operatorAuth.header,
            "x-required-operator-role-header": operatorAuth.role_headers.join(", "),
          },
        }
      );
    }
  }

  const filters = parseReportSummaryFilters(new URL(request.url));
  const bundle = await buildControlTowerReviewerBundle({ filters });
  return apiJson({ ok: true, request_id: requestId, ...bundle }, { requestId });
}
