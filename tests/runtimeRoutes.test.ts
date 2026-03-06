import { afterEach, describe, expect, test } from "vitest";

import { GET as getHealthRoute } from "@/app/api/health/route";
import { GET as getMetaRoute } from "@/app/api/meta/route";

const ENV_KEYS = [
  "NEXT_PUBLIC_EVENT_WS_URL",
  "NEXT_PUBLIC_EVENT_STREAM_URL",
  "NEXT_PUBLIC_EVENT_API_URL",
  "NEXT_PUBLIC_EVENT_POLL_MS",
] as const;

function withEnv(values: Partial<Record<(typeof ENV_KEYS)[number], string>>, run: () => Promise<void>) {
  const previous = new Map<string, string | undefined>();
  for (const key of ENV_KEYS) {
    previous.set(key, process.env[key]);
    const next = values[key];
    if (typeof next === "string") {
      process.env[key] = next;
    } else {
      delete process.env[key];
    }
  }

  return run().finally(() => {
    for (const key of ENV_KEYS) {
      const current = previous.get(key);
      if (typeof current === "string") {
        process.env[key] = current;
      } else {
        delete process.env[key];
      }
    }
  });
}

afterEach(() => {
  for (const key of ENV_KEYS) {
    delete process.env[key];
  }
});

describe("runtime routes", () => {
  test("health exposes live source readiness and links to meta", async () => {
    await withEnv(
      {
        NEXT_PUBLIC_EVENT_WS_URL: "wss://events.example/ws",
        NEXT_PUBLIC_EVENT_API_URL: "https://events.example/api",
        NEXT_PUBLIC_EVENT_POLL_MS: "7000",
      },
      async () => {
        const response = await getHealthRoute(new Request("https://example.com/api/health"));
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body).toMatchObject({
          ok: true,
          service: "twincity-ui",
          live_sources: {
            ws: true,
            sse: false,
            http: true,
            poll_ms: 7000,
          },
          links: {
            meta: "/api/meta",
          },
        });
        expect(response.headers.get("x-request-id")).toBe(body.request_id);
      }
    );
  });

  test("meta exposes supported routes and feature flags", async () => {
    await withEnv(
      {
        NEXT_PUBLIC_EVENT_STREAM_URL: "https://events.example/sse",
      },
      async () => {
        const response = await getMetaRoute(new Request("https://example.com/api/meta"));
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body).toMatchObject({
          ok: true,
          service: "twincity-ui",
          live_sources: {
            ws: false,
            sse: true,
            http: false,
            poll_ms: 5000,
          },
        });
        expect(body.features).toContain("digital-twin-floor-map");
        expect(body.routes).toContain("/api/meta");
        expect(response.headers.get("x-request-id")).toBe(body.request_id);
      }
    );
  });
});
