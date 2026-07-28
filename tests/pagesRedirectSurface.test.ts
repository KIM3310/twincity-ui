import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, test, vi } from "vitest";
import worker from "../pages-redirect/_worker.js";

const redirectRoot = resolve(process.cwd(), "pages-redirect");
const adsenseClient = "ca-pub-4973160293737562";
const adsTxtRecord = "google.com, pub-4973160293737562, DIRECT, f08c47fec0942fa0\n";

describe("Cloudflare Pages redirect surface", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("serves AdSense, policy, robots, and sitemap files from the redirect root", () => {
    expect(readFileSync(resolve(redirectRoot, "ads.txt"), "utf8")).toBe(adsTxtRecord);
    expect(readFileSync(resolve(redirectRoot, "robots.txt"), "utf8")).toContain(
      "Sitemap: https://twincity-ui.pages.dev/sitemap.xml",
    );

    const sitemap = readFileSync(resolve(redirectRoot, "sitemap.xml"), "utf8");
    for (const route of ["/", "/privacy/", "/terms/", "/service-offer.json", "/llms.txt", "/ads.txt"]) {
      expect(sitemap).toContain(`https://twincity-ui.pages.dev${route === "/" ? "/" : route}`);
    }

    for (const file of ["index.html", "privacy/index.html", "terms/index.html"]) {
      const html = readFileSync(resolve(redirectRoot, file), "utf8");
      expect(html).toContain(`name="google-adsense-account" content="${adsenseClient}"`);
    }

    const loader =
      `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClient}`;
    expect(readFileSync(resolve(redirectRoot, "index.html"), "utf8")).toContain(loader);
    expect(readFileSync(resolve(redirectRoot, "privacy/index.html"), "utf8")).not.toContain(loader);
    expect(readFileSync(resolve(redirectRoot, "terms/index.html"), "utf8")).not.toContain(loader);
  });

  test("keeps worker static exceptions explicit", () => {
    const worker = readFileSync(resolve(redirectRoot, "_worker.js"), "utf8");
    for (const route of ["/", "/ads.txt", "/robots.txt", "/sitemap.xml", "/privacy", "/terms"]) {
      expect(worker).toContain(`"${route}"`);
    }
    expect(worker).toContain('redirect: "manual"');
    expect(worker).toContain("rewriteLocation");
  });

  test("serves static policy and monetization files from Pages assets first", async () => {
    const assetsFetch = vi.fn(async (request: Request) => {
      return new Response(new URL(request.url).pathname, { status: 200 });
    });
    const upstreamFetch = vi.spyOn(globalThis, "fetch");

    const response = await worker.fetch(new Request("https://twincity-ui.pages.dev/ads.txt"), {
      ASSETS: { fetch: assetsFetch },
    });

    await expect(response.text()).resolves.toBe("/ads.txt");
    expect(assetsFetch).toHaveBeenCalledOnce();
    expect(upstreamFetch).not.toHaveBeenCalled();
  });

  test("serves clean policy routes from directory assets without an upstream redirect", async () => {
    const assetsFetch = vi.fn(async (request: Request) => {
      return new Response(new URL(request.url).pathname, { status: 200 });
    });
    const upstreamFetch = vi.spyOn(globalThis, "fetch");

    const response = await worker.fetch(new Request("https://twincity-ui.pages.dev/privacy"), {
      ASSETS: { fetch: assetsFetch },
    });

    expect(response.status).toBe(200);
    await expect(response.text()).resolves.toBe("/privacy/");
    expect(assetsFetch).toHaveBeenCalledOnce();
    expect(upstreamFetch).not.toHaveBeenCalled();
  });

  test("proxies app routes with same-origin 200 content instead of redirecting to Cloud Run", async () => {
    const upstreamFetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("<main>TwinCity app</main>", {
        headers: { "content-type": "text/html" },
        status: 200,
      }),
    );

    const response = await worker.fetch(new Request("https://twincity-ui.pages.dev/services?mode=ops"), {
      ASSETS: { fetch: vi.fn() },
    });

    expect(response.status).toBe(200);
    await expect(response.text()).resolves.toContain("TwinCity app");
    expect(upstreamFetch).toHaveBeenCalledOnce();
    expect(String(upstreamFetch.mock.calls[0]?.[0])).toBe(
      "https://twincity-ui-app-811356341663.asia-northeast3.run.app/services?mode=ops",
    );
  });

  test("rewrites upstream Cloud Run redirects back to the Pages origin", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(null, {
        headers: {
          location: "https://twincity-ui-app-811356341663.asia-northeast3.run.app/reports?ok=1",
        },
        status: 302,
      }),
    );

    const response = await worker.fetch(new Request("https://twincity-ui.pages.dev/reporting"), {
      ASSETS: { fetch: vi.fn() },
    });

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("https://twincity-ui.pages.dev/reports?ok=1");
  });
});
