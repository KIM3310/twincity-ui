import { afterEach, describe, expect, test } from "vitest";

import { buildRuntimeMeta } from "../src/lib/runtimeMeta";

afterEach(() => {
  delete process.env.NEXT_PUBLIC_EVENT_WS_URL;
  delete process.env.NEXT_PUBLIC_EVENT_STREAM_URL;
  delete process.env.NEXT_PUBLIC_EVENT_API_URL;
  delete process.env.NEXT_PUBLIC_EVENT_POLL_MS;
});

describe("runtimeMeta", () => {
  test("defaults to demo mode with no live sources configured", () => {
    const meta = buildRuntimeMeta();
    expect(meta.service).toBe("twincity-ui");
    expect(meta.status).toBe("ok");
    expect(meta.live_sources.ws).toBe(false);
    expect(meta.live_sources.sse).toBe(false);
    expect(meta.live_sources.http).toBe(false);
    expect(meta.live_sources.poll_ms).toBe(5000);
    expect(meta.diagnostics.ingest_mode).toBe("demo");
    expect(meta.diagnostics.live_source_count).toBe(0);
    expect(meta.diagnostics.next_action).toContain("Configure");
  });

  test("detects ws as primary ingest mode", () => {
    process.env.NEXT_PUBLIC_EVENT_WS_URL = "wss://events.example/ws";
    const meta = buildRuntimeMeta();
    expect(meta.live_sources.ws).toBe(true);
    expect(meta.diagnostics.ingest_mode).toBe("ws");
    expect(meta.diagnostics.live_source_count).toBe(1);
  });

  test("detects sse when only SSE is configured", () => {
    process.env.NEXT_PUBLIC_EVENT_STREAM_URL = "https://events.example/sse";
    const meta = buildRuntimeMeta();
    expect(meta.diagnostics.ingest_mode).toBe("sse");
  });

  test("detects http when only HTTP API is configured", () => {
    process.env.NEXT_PUBLIC_EVENT_API_URL = "https://events.example/api";
    const meta = buildRuntimeMeta();
    expect(meta.diagnostics.ingest_mode).toBe("http");
  });

  test("ws takes priority over sse and http", () => {
    process.env.NEXT_PUBLIC_EVENT_WS_URL = "wss://events.example/ws";
    process.env.NEXT_PUBLIC_EVENT_STREAM_URL = "https://events.example/sse";
    process.env.NEXT_PUBLIC_EVENT_API_URL = "https://events.example/api";
    const meta = buildRuntimeMeta();
    expect(meta.diagnostics.ingest_mode).toBe("ws");
    expect(meta.diagnostics.live_source_count).toBe(3);
  });

  test("uses custom poll_ms from env", () => {
    process.env.NEXT_PUBLIC_EVENT_POLL_MS = "3000";
    const meta = buildRuntimeMeta();
    expect(meta.live_sources.poll_ms).toBe(3000);
  });

  test("falls back to 5000ms for non-numeric poll_ms", () => {
    process.env.NEXT_PUBLIC_EVENT_POLL_MS = "not-a-number";
    const meta = buildRuntimeMeta();
    expect(meta.live_sources.poll_ms).toBe(5000);
  });

  test("uses provided timestamp in generated_at", () => {
    const date = new Date("2026-01-15T10:00:00Z");
    const meta = buildRuntimeMeta(date);
    expect(meta.generated_at).toBe("2026-01-15T10:00:00.000Z");
  });

  test("includes required ops_contract fields", () => {
    const meta = buildRuntimeMeta();
    expect(meta.ops_contract.schema).toBe("ops-envelope-v1");
    expect(meta.ops_contract.version).toBe(1);
    expect(meta.ops_contract.required_fields).toContain("service");
    expect(meta.ops_contract.required_fields).toContain("status");
  });

  test("includes expected features and routes", () => {
    const meta = buildRuntimeMeta();
    expect(meta.features).toContain("digital-twin-floor-map");
    expect(meta.features).toContain("normalized-event-feed");
    expect(meta.routes).toContain("/api/health");
    expect(meta.routes).toContain("/api/meta");
  });

  test("ignores whitespace-only env values", () => {
    process.env.NEXT_PUBLIC_EVENT_WS_URL = "   ";
    const meta = buildRuntimeMeta();
    expect(meta.live_sources.ws).toBe(false);
    expect(meta.diagnostics.ingest_mode).toBe("demo");
  });
});
