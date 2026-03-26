import { apiJson, resolveRequestId } from "@/lib/apiResponse";
import { buildProofRouteMap } from "@/lib/proofRouteMap";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const requestId = resolveRequestId(request);
  return apiJson(
    {
      ok: true,
      request_id: requestId,
      service: "twincity-ui",
      ...buildProofRouteMap(),
    },
    { requestId }
  );
}
