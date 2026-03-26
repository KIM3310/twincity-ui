import { apiError, noStoreHeaders, resolveRequestId } from "@/lib/apiResponse";
import { resolveFirstAvailableAsset } from "@/lib/assetProbe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CANDIDATE_FLOORPLAN_PATHS = [
  "/3d/floorplan_wireframe_20241027_clean.png",
  "/floorplan_wireframe_20241027_clean.png",
  "/3d/floorplan_wireframe_20241027.png",
  "/floorplan_wireframe_20241027.png",
  "/floorplan_s001.png",
];

export async function GET(request: Request) {
  const requestId = resolveRequestId(request);
  const resolved = await resolveFirstAvailableAsset(request, CANDIDATE_FLOORPLAN_PATHS);
  if (!resolved.exists) {
    return apiError("floorplan not found", { status: 404, requestId });
  }

  const location = new URL(resolved.path, request.url).toString();
  return new Response(null, {
    status: 307,
    headers: noStoreHeaders(requestId, {
      location,
    }),
  });
}
