import { apiJson, resolveRequestId } from "@/lib/apiResponse";
import { buildControlTowerRuntimeBrief } from "@/lib/serviceMeta";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const requestId = resolveRequestId(request);
  const runtimeBrief = buildControlTowerRuntimeBrief();

  return apiJson(
    {
      ok: true,
      request_id: requestId,
      ...runtimeBrief,
      links: {
        ...runtimeBrief.links,
        runtime_scorecard: "/api/runtime-scorecard",
      },
    },
    { requestId }
  );
}
