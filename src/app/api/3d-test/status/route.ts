import zoneMap from "@/data/zone_map_s001.json";
import { resolveFirstAvailableAsset } from "@/lib/assetProbe";
import { apiJson, resolveRequestId } from "@/lib/apiResponse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FLOORPLAN_CANDIDATES = [
  "/3d/floorplan_wireframe_20241027_clean.png",
  "/floorplan_wireframe_20241027_clean.png",
  "/3d/floorplan_wireframe_20241027.png",
  "/floorplan_wireframe_20241027.png",
  "/floorplan_s001.png",
];

const MODEL_CANDIDATES = [
  "/3d/models/store_13x13.glb",
  "/models/store_13x13.glb",
  "/store_13x13.glb",
  "/store.glb",
];

export async function GET(request: Request) {
  const requestId = resolveRequestId(request);
  const map = zoneMap?.map ?? {};
  const world = map?.world ?? {};
  const [floorplanAsset, modelAsset] = await Promise.all([
    resolveFirstAvailableAsset(request, FLOORPLAN_CANDIDATES),
    resolveFirstAvailableAsset(request, MODEL_CANDIDATES),
  ]);
  const floorplanName = floorplanAsset.path.split("/").filter(Boolean).at(-1) ?? "floorplan_wireframe_20241027_clean.png";
  const modelName = modelAsset.path.split("/").filter(Boolean).at(-1) ?? "store_13x13.glb";

  return apiJson(
    {
      request_id: requestId,
      dir: "edge-runtime",
      zone_map: {
        exists: true,
        world: {
          width_m: Number.isFinite(Number(world?.width_m)) ? Number(world.width_m) : null,
          depth_m: Number.isFinite(Number(world?.depth_m)) ? Number(world.depth_m) : null,
        },
      },
      floorplan: {
        source: floorplanAsset.exists
          ? floorplanAsset.path.startsWith("/3d/")
            ? "downloads"
            : "fallback"
          : "missing",
        name: floorplanName,
        exists: floorplanAsset.exists,
      },
      model: {
        source: modelAsset.exists
          ? modelAsset.path.startsWith("/3d/")
            ? "downloads"
            : "fallback"
          : "missing",
        name: modelName,
        exists: modelAsset.exists,
      },
    },
    { requestId }
  );
}
