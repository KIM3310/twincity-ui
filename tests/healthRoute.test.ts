import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { GET as getHealthRoute } from "@/app/api/health/route";

const ENV_KEYS = [
  "NEXT_PUBLIC_EVENT_WS_URL",
  "NEXT_PUBLIC_EVENT_STREAM_URL",
  "NEXT_PUBLIC_EVENT_API_URL",
  "NEXT_PUBLIC_EVENT_POLL_MS",
] as const;

type EnvSnapshot = Partial<Record<(typeof ENV_KEYS)[number], string | undefined>>;

let snapshot: EnvSnapshot = {};

beforeEach(() => {
  snapshot = {};
  for (const key of ENV_KEYS) {
    snapshot[key] = process.env[key];
    delete process.env[key];
  }
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    const value = snapshot[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
});

describe("health route", () => {
  test("reports live-ready mode and clamps poll interval", async () => {
    process.env.NEXT_PUBLIC_EVENT_WS_URL = "wss://example.com/events";
    process.env.NEXT_PUBLIC_EVENT_POLL_MS = "900";

    const response = await getHealthRoute(new Request("https://example.com/api/health"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.mode).toBe("live-ready");
    expect(body.live_sources).toMatchObject({
      ws: true,
      sse: false,
      http: false,
      configured_count: 1,
      poll_ms: 900,
      poll_ms_effective: 1200,
    });
    expect(body.warnings).toContain(
      "NEXT_PUBLIC_EVENT_POLL_MS is out of range. Clamped to 1200ms (1200-30000ms)."
    );
  });

  test("reports demo-only mode and defaults invalid poll interval", async () => {
    process.env.NEXT_PUBLIC_EVENT_POLL_MS = "not-a-number";

    const response = await getHealthRoute(new Request("https://example.com/api/health"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.mode).toBe("demo-only");
    expect(body.live_sources).toMatchObject({
      ws: false,
      sse: false,
      http: false,
      configured_count: 0,
      poll_ms: 5000,
      poll_ms_effective: 5000,
    });
    expect(body.warnings).toContain("NEXT_PUBLIC_EVENT_POLL_MS is invalid. Using default 5000ms.");
    expect(body.warnings).toContain("No live event source is configured. Demo mode only.");
  });
});
