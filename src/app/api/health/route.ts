import { apiJson, resolveRequestId } from "@/lib/apiResponse";
import { buildRuntimeMeta } from "@/lib/runtimeMeta";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const requestId = resolveRequestId(request);
  const runtimeMeta = buildRuntimeMeta();

  return apiJson(
    {
      ok: true,
      request_id: requestId,
      service: runtimeMeta.service,
      status: runtimeMeta.status,
      now: runtimeMeta.generated_at,
      live_sources: runtimeMeta.live_sources,
      diagnostics: runtimeMeta.diagnostics,
      ops_contract: runtimeMeta.ops_contract,
      links: {
        meta: "/api/meta",
      },
    },
    { requestId }
  );
}
