import { apiError, apiJson, resolveRequestId } from "@/lib/apiResponse";
import { readOperatorAuthStatus, validateOperatorRequest } from "@/lib/operatorAccess";
import { verifyControlTowerReviewerBundle } from "@/lib/reviewerBundle";
import { parseReportSummaryFilters } from "@/lib/reportSummary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const requestId = resolveRequestId(request);
  const operatorAuth = readOperatorAuthStatus();
  if (operatorAuth.enabled) {
    const authResult = validateOperatorRequest(request);
    if (!authResult.ok) {
      return apiError(
        authResult.reason === "missing-role"
          ? "required operator role missing for status bundle verification"
          : "operator token required for status bundle verification",
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

  const url = new URL(request.url);
  const filters = parseReportSummaryFilters(url);
  const verification = await verifyControlTowerReviewerBundle({
    digest: url.searchParams.get("digest"),
    filters,
  });
  return apiJson({ ok: true, request_id: requestId, ...verification }, { requestId });
}
