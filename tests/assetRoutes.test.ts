import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("@/lib/assetProbe", () => ({
  resolveFirstAvailableAsset: vi.fn(),
}));

import { GET as getFloorplanRoute } from "@/app/api/3d-test/floorplan/route";
import { GET as getModelRoute } from "@/app/api/3d-test/model/route";
import { GET as getStatusRoute } from "@/app/api/3d-test/status/route";
import { resolveFirstAvailableAsset } from "@/lib/assetProbe";

const probeMock = vi.mocked(resolveFirstAvailableAsset);

beforeEach(() => {
  probeMock.mockReset();
});

describe("3d-test routes", () => {
  test("model route returns 404 when no model is available", async () => {
    probeMock.mockResolvedValueOnce({ exists: false, path: "/store.glb" });

    const response = await getModelRoute(new Request("https://example.com/api/3d-test/model"));
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toMatchObject({
      error: {
        message: "model not found",
      },
    });
  });

  test("model/floorplan routes redirect to resolved static assets", async () => {
    probeMock.mockResolvedValueOnce({ exists: true, path: "/models/store.glb" });
    const modelResponse = await getModelRoute(new Request("https://example.com/api/3d-test/model"));
    expect(modelResponse.status).toBe(307);
    expect(modelResponse.headers.get("location")).toBe("https://example.com/models/store.glb");

    probeMock.mockResolvedValueOnce({ exists: true, path: "/floorplan_s001.png" });
    const floorplanResponse = await getFloorplanRoute(new Request("https://example.com/api/3d-test/floorplan"));
    expect(floorplanResponse.status).toBe(307);
    expect(floorplanResponse.headers.get("location")).toBe("https://example.com/floorplan_s001.png");
  });

  test("status route reports missing/downloads/fallback sources correctly", async () => {
    probeMock
      .mockResolvedValueOnce({ exists: false, path: "/3d/floorplan_wireframe_20241027_clean.png" })
      .mockResolvedValueOnce({ exists: true, path: "/store.glb" });

    const response = await getStatusRoute(new Request("https://example.com/api/3d-test/status"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.floorplan).toMatchObject({
      exists: false,
      source: "missing",
    });
    expect(body.model).toMatchObject({
      exists: true,
      source: "fallback",
      name: "store.glb",
    });
  });
});
