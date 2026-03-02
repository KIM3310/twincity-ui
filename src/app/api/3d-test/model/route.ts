import { apiError, noStoreHeaders, resolveRequestId } from "@/lib/apiResponse";
import { resolveFirstAvailableAsset } from "@/lib/assetProbe";

export const runtime = "edge";
export const dynamic = "force-dynamic";

// Optional: if a GLB is added under public/, this endpoint will serve it.
const CANDIDATE_MODEL_PATHS = [
  "/3d/models/store_13x13.glb",
  "/models/store_13x13.glb",
  "/store_13x13.glb",
  "/store.glb",
];

export async function GET(request: Request) {
  const requestId = resolveRequestId(request);
  const resolved = await resolveFirstAvailableAsset(request, CANDIDATE_MODEL_PATHS);
  if (!resolved.exists) {
    return apiError("model not found", { status: 404, requestId });
  }

  const location = new URL(resolved.path, request.url).toString();
  return new Response(null, {
    status: 307,
    headers: noStoreHeaders(requestId, {
      location,
    }),
  });
}
