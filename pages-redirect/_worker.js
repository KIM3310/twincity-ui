const STATIC_ASSET_PATHS = new Set([
  "/",
  "/ads.txt",
  "/architecture",
  "/architecture.html",
  "/guide",
  "/guide.html",
  "/index.html",
  "/llms.txt",
  "/privacy",
  "/privacy/",
  "/publisher",
  "/publisher.html",
  "/robots.txt",
  "/service-offer.json",
  "/sitemap.xml",
  "/terms",
  "/terms/",
  "/verification",
  "/verification.html",
]);

const RECORDED_APP_ROUTES = [
  "/about",
  "/brand",
  "/compliance",
  "/contact",
  "/events",
  "/explore",
  "/journal",
  "/reports",
  "/services",
];

function staticAssetRequest(request, pathname) {
  if (pathname === "/privacy" || pathname === "/privacy/") {
    return new Request(new URL("/privacy/", request.url), request);
  }
  if (pathname === "/terms" || pathname === "/terms/") {
    return new Request(new URL("/terms/", request.url), request);
  }
  return request;
}

function isRecordedAppRoute(pathname) {
  return RECORDED_APP_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

const worker = {
  async fetch(request, env) {
    const incomingUrl = new URL(request.url);
    if (STATIC_ASSET_PATHS.has(incomingUrl.pathname)) {
      return env.ASSETS.fetch(staticAssetRequest(request, incomingUrl.pathname));
    }

    if (incomingUrl.pathname === "/api" || incomingUrl.pathname.startsWith("/api/")) {
      return Response.json(
        {
          code: "HOSTED_RUNTIME_RETIRED",
          message: "The public site runs in recorded review mode. Start the repository locally for API routes.",
          status: "offline",
        },
        {
          headers: { "cache-control": "no-store" },
          status: 410,
        },
      );
    }

    if (isRecordedAppRoute(incomingUrl.pathname)) {
      const fallback = new URL("/", request.url);
      fallback.searchParams.set("route", incomingUrl.pathname);
      fallback.hash = "recorded-demo";
      return Response.redirect(fallback, 302);
    }

    return env.ASSETS.fetch(request);
  },
};

export default worker;
