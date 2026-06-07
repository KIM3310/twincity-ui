import { apiJson, resolveRequestId } from "@/lib/apiResponse";
import { buildKoreanPublicApiReadiness } from "@/lib/koreanPublicApis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const requestId = resolveRequestId(request);

  return apiJson(
    {
      ok: true,
      request_id: requestId,
      ...buildKoreanPublicApiReadiness(),
      links: {
        health: "/api/health",
        meta: "/api/meta",
        runtime_brief: "/api/runtime-brief",
        runtime_scorecard: "/api/runtime-scorecard",
        source_catalog: "https://github.com/yybmion/public-apis-4Kr",
      },
    },
    { requestId }
  );
}
