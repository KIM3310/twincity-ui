const TARGET_ORIGIN = "https://twincity-ui-app-811356341663.asia-northeast3.run.app";
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

function staticAssetRequest(request, pathname) {
  if (pathname === "/privacy" || pathname === "/privacy/") {
    return new Request(new URL("/privacy/", request.url), request);
  }
  if (pathname === "/terms" || pathname === "/terms/") {
    return new Request(new URL("/terms/", request.url), request);
  }
  return request;
}

function proxiedUrl(requestUrl) {
  const incoming = new URL(requestUrl);
  return new URL(`${incoming.pathname}${incoming.search}`, TARGET_ORIGIN);
}

function rewriteLocation(location, publicOrigin) {
  if (!location) return location;
  const target = new URL(TARGET_ORIGIN);
  const next = new URL(location, TARGET_ORIGIN);
  if (next.origin !== target.origin) return location;
  return `${publicOrigin}${next.pathname}${next.search}${next.hash}`;
}

const worker = {
  async fetch(request, env) {
    const incomingUrl = new URL(request.url);
    if (STATIC_ASSET_PATHS.has(incomingUrl.pathname)) {
      return env.ASSETS.fetch(staticAssetRequest(request, incomingUrl.pathname));
    }

    const targetUrl = proxiedUrl(request.url);
    const headers = new Headers(request.headers);
    headers.delete("host");
    headers.set("x-forwarded-host", incomingUrl.host);

    const upstream = await fetch(targetUrl, {
      body: ["GET", "HEAD"].includes(request.method) ? undefined : request.body,
      headers,
      method: request.method,
      redirect: "manual",
    });
    const responseHeaders = new Headers(upstream.headers);

    if (upstream.status >= 300 && upstream.status < 400) {
      responseHeaders.set("location", rewriteLocation(responseHeaders.get("location"), incomingUrl.origin));
    }

    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders,
    });
  },
};

export default worker;
