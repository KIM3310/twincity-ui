import { apiJson, resolveRequestId } from "@/lib/apiResponse";
import { buildControlTowerRuntimeScorecard } from "@/lib/runtimeScorecard";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const requestId = resolveRequestId(request);
  const scorecard = buildControlTowerRuntimeScorecard();

  return apiJson(
    {
      ok: true,
      request_id: requestId,
      ...scorecard,
    },
    { requestId }
  );
}
