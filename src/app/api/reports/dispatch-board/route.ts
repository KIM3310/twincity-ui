import { apiJson, resolveRequestId } from "@/lib/apiResponse";
import {
  buildControlTowerDispatchBoard,
  parseDispatchBoardFilters,
} from "@/lib/reportSummary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const requestId = resolveRequestId(request);
  const url = new URL(request.url);
  const filters = parseDispatchBoardFilters(url);
  const board = buildControlTowerDispatchBoard({ filters });

  return apiJson(
    {
      ok: true,
      request_id: requestId,
      ...board,
    },
    { requestId }
  );
}
