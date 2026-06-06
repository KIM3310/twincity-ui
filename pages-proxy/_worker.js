const TARGET_ORIGIN = "https://twincity-ui-app-811356341663.asia-northeast3.run.app";

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

async function injectMainLandmark(response) {
  const headers = new Headers(response.headers);
  headers.delete("content-encoding");
  headers.delete("content-length");

  const html = await response.text();
  if (/<main[\s>]/i.test(html)) {
    return new Response(html, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }

  const withMain = html
    .replace(/<body([^>]*)>/i, '<body$1><main id="main-content" role="main">')
    .replace(/<\/body>/i, "</main></body>");

  return new Response(withMain, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export default {
  async fetch(request) {
    const targetUrl = proxiedUrl(request.url);
    const headers = new Headers(request.headers);
    headers.delete("host");
    headers.set("x-forwarded-host", new URL(request.url).host);

    const init = {
      body: ["GET", "HEAD"].includes(request.method) ? undefined : request.body,
      headers,
      method: request.method,
      redirect: "manual",
    };

    const response = await fetch(targetUrl, init);
    const responseHeaders = new Headers(response.headers);

    if (response.status >= 300 && response.status < 400) {
      responseHeaders.set(
        "location",
        rewriteLocation(responseHeaders.get("location"), new URL(request.url).origin),
      );
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
      });
    }

    const contentType = responseHeaders.get("content-type") || "";
    if (request.method !== "HEAD" && contentType.includes("text/html")) {
      return injectMainLandmark(response);
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  },
};
