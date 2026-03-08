import { apiJson, resolveRequestId } from "@/lib/apiResponse";
import { buildControlTowerReportSchema } from "@/lib/serviceMeta";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const requestId = resolveRequestId(request);
  const schema = buildControlTowerReportSchema();

  return apiJson(
    {
      ok: true,
      request_id: requestId,
      service: "twincity-ui",
      generated_at: new Date().toISOString(),
      ...schema,
    },
    { requestId }
  );
}
