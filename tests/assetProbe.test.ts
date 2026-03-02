import { afterEach, describe, expect, test, vi } from "vitest";

import { clearAssetProbeCache, resolveFirstAvailableAsset } from "@/lib/assetProbe";

afterEach(() => {
  clearAssetProbeCache();
  vi.unstubAllGlobals();
});

describe("assetProbe", () => {
  test("resolves first available candidate and reuses cached result", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 404 }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }));

    vi.stubGlobal("fetch", fetchMock);

    const request = new Request("https://example.com/api/3d-test/status");
    const candidates = ["/a.png", "/b.png"];

    const first = await resolveFirstAvailableAsset(request, candidates, 30_000);
    const second = await resolveFirstAvailableAsset(request, candidates, 30_000);

    expect(first).toEqual({ exists: true, path: "/b.png" });
    expect(second).toEqual({ exists: true, path: "/b.png" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  test("falls back to GET when HEAD is not supported", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 405 }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }));

    vi.stubGlobal("fetch", fetchMock);

    const request = new Request("https://example.com/api/3d-test/model");
    const result = await resolveFirstAvailableAsset(request, ["/store.glb"], 0);

    expect(result).toEqual({ exists: true, path: "/store.glb" });
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "https://example.com/store.glb",
      expect.objectContaining({ method: "HEAD", cache: "no-store" })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://example.com/store.glb",
      expect.objectContaining({ cache: "no-store" })
    );
  });

  test("returns fallback path when no candidate is reachable", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("network"))
      .mockRejectedValueOnce(new Error("network"))
      .mockRejectedValueOnce(new Error("network"))
      .mockRejectedValueOnce(new Error("network"));

    vi.stubGlobal("fetch", fetchMock);

    const request = new Request("https://example.com/api/3d-test/status");
    const result = await resolveFirstAvailableAsset(request, ["/first.png", "/second.png"], 0);

    expect(result).toEqual({ exists: false, path: "/first.png" });
  });
});
