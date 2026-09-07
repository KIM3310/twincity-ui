import { createServer } from "node:http";
import { once } from "node:events";
import { expect, it } from "vitest";
import { startLiveFeed } from "../src/lib/liveFeed";

it("recovers from a real refused WebSocket upgrade to an actual HTTP feed", async () => {
  const server = createServer((request, response) => {
    if (request.url === "/feed") {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ id: "http-recovered", source: "local-fixture" }));
    } else { response.writeHead(503); response.end("stream unavailable"); }
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") throw Error("missing server address");
  const base = `127.0.0.1:${address.port}`;
  let stop: (() => void) | undefined;
  try {
    const payload = await new Promise<unknown>((resolve, reject) => {
      const deadline = setTimeout(() => reject(Error("recovery deadline")), 3000);
      stop = startLiveFeed({ websocketUrl: `ws://${base}/unavailable`, sseUrl: `http://${base}/sse`, pollUrl: `http://${base}/feed`,
        onPayload: value => { clearTimeout(deadline); resolve(value); }, onState: () => {}, timeoutMs: 300 }, {
        socket: url => new WebSocket(url), stream: () => { throw Error("SSE unavailable in Node fixture"); }, fetch,
      });
    });
    expect(payload).toEqual({ id: "http-recovered", source: "local-fixture" });
  } finally { stop?.(); server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); }
});
