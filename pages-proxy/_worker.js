const STATIC_ASSET_PATHS = new Set(["/llms.txt", "/service-offer.json"]);

const worker = {
  async fetch(request, env) {
    const incomingUrl = new URL(request.url);
    if (STATIC_ASSET_PATHS.has(incomingUrl.pathname)) {
      return env.ASSETS.fetch(request);
    }

    return Response.json(
      {
        code: "LEGACY_PROXY_RETIRED",
        message: "Deploy pages-redirect for the recorded public review surface.",
      },
      { status: 410 },
    );
  },
};

export default worker;
