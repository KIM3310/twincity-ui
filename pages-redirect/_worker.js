const TARGET_ORIGIN = "https://twincity-ui-app-811356341663.asia-northeast3.run.app";
const STATIC_ASSET_PATHS = new Set(["/llms.txt", "/service-offer.json"]);

const worker = {
  async fetch(request, env) {
    const incomingUrl = new URL(request.url);
    if (STATIC_ASSET_PATHS.has(incomingUrl.pathname)) {
      return env.ASSETS.fetch(request);
    }

    const targetUrl = new URL(
      `${incomingUrl.pathname}${incomingUrl.search}`,
      TARGET_ORIGIN,
    );
    return Response.redirect(targetUrl, 302);
  },
};

export default worker;
