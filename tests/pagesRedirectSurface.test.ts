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
    for (const route of [
      "/",
      "/guide",
      "/architecture",
      "/verification",
      "/publisher",
      "/privacy/",
      "/terms/",
    ]) {
      expect(sitemap).toContain(`https://twincity-ui.pages.dev${route === "/" ? "/" : route}`);
    }

    for (const file of ["index.html", "privacy/index.html", "terms/index.html"]) {
      const html = readFileSync(resolve(redirectRoot, file), "utf8");
      expect(html).toContain(`name="google-adsense-account" content="${adsenseClient}"`);
    }

    const loader =
      `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClient}`;
    expect(readFileSync(resolve(redirectRoot, "index.html"), "utf8")).not.toContain(loader);
    for (const file of ["guide.html", "architecture.html", "verification.html"]) {
      expect(readFileSync(resolve(redirectRoot, file), "utf8")).toContain(loader);
    }
    expect(readFileSync(resolve(redirectRoot, "publisher.html"), "utf8")).not.toContain(loader);
    expect(readFileSync(resolve(redirectRoot, "privacy/index.html"), "utf8")).not.toContain(loader);
    expect(readFileSync(resolve(redirectRoot, "terms/index.html"), "utf8")).not.toContain(loader);
  });

  test("keeps worker static exceptions explicit", () => {
    const worker = readFileSync(resolve(redirectRoot, "_worker.js"), "utf8");
    for (const route of [
      "/",
      "/ads.txt",
      "/architecture",
      "/guide",
      "/privacy",
      "/publisher",
      "/robots.txt",
      "/sitemap.xml",
      "/terms",
      "/verification",
    ]) {
      expect(worker).toContain(`"${route}"`);
    }
    expect(worker).toContain("HOSTED_RUNTIME_RETIRED");
    expect(worker).not.toContain("run.app");
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

  test("serves extensionless editorial routes from Pages assets", async () => {
    const assetsFetch = vi.fn(async (request: Request) => {
      return new Response(new URL(request.url).pathname, { status: 200 });
    });
    const upstreamFetch = vi.spyOn(globalThis, "fetch");

    const response = await worker.fetch(new Request("https://twincity-ui.pages.dev/guide"), {
      ASSETS: { fetch: assetsFetch },
    });

    await expect(response.text()).resolves.toBe("/guide");
    expect(assetsFetch).toHaveBeenCalledOnce();
    expect(upstreamFetch).not.toHaveBeenCalled();
  });

  test("redirects retired hosted app routes to the recorded public review", async () => {
    const upstreamFetch = vi.spyOn(globalThis, "fetch");
    const response = await worker.fetch(new Request("https://twincity-ui.pages.dev/services?mode=ops"), {
      ASSETS: { fetch: vi.fn() },
    });

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(
      "https://twincity-ui.pages.dev/?route=%2Fservices#recorded-demo",
    );
    expect(upstreamFetch).not.toHaveBeenCalled();
  });

  test("returns an explicit retired-runtime response for public API routes", async () => {
    const upstreamFetch = vi.spyOn(globalThis, "fetch");
    const response = await worker.fetch(new Request("https://twincity-ui.pages.dev/api/health"), {
      ASSETS: { fetch: vi.fn() },
    });

    expect(response.status).toBe(410);
    await expect(response.json()).resolves.toMatchObject({
      code: "HOSTED_RUNTIME_RETIRED",
      status: "offline",
    });
    expect(upstreamFetch).not.toHaveBeenCalled();
  });
});
