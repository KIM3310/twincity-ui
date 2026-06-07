import { afterEach, describe, expect, test } from "vitest";

import { buildKoreanPublicApiReadiness } from "../src/lib/koreanPublicApis";
import { buildRuntimeMeta } from "../src/lib/runtimeMeta";

afterEach(() => {
  delete process.env.NEXT_PUBLIC_EVENT_WS_URL;
  delete process.env.NEXT_PUBLIC_EVENT_STREAM_URL;
  delete process.env.NEXT_PUBLIC_EVENT_API_URL;
  delete process.env.NEXT_PUBLIC_EVENT_POLL_MS;
  delete process.env.SEOUL_OPEN_DATA_API_KEY;
  delete process.env.DATA_GO_KR_SERVICE_KEY;
  delete process.env.TOPIS_API_KEY;
  delete process.env.EXPRESSWAY_API_KEY;
  delete process.env.KMA_API_KEY;
  delete process.env.AIRKOREA_API_KEY;
  delete process.env.PUBLIC_SAFETY_API_KEY;
  delete process.env.NATIONAL_FIRE_API_KEY;
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
    expect(meta.features).toContain("korean-public-api-readiness");
    expect(meta.routes).toContain("/api/proof-route-map");
    expect(meta.routes).toContain("/api/health");
    expect(meta.routes).toContain("/api/meta");
    expect(meta.routes).toContain("/api/public-apis");
  });

  test("ignores whitespace-only env values", () => {
    process.env.NEXT_PUBLIC_EVENT_WS_URL = "   ";
    const meta = buildRuntimeMeta();
    expect(meta.live_sources.ws).toBe(false);
    expect(meta.diagnostics.ingest_mode).toBe("demo");
  });

  test("summarizes Korean public API readiness without exposing secret values", () => {
    process.env.SEOUL_OPEN_DATA_API_KEY = "seoul-secret";
    process.env.KMA_API_KEY = "kma-secret";

    const readiness = buildKoreanPublicApiReadiness();

    expect(readiness.schema).toBe("korean-public-api-readiness-v1");
    expect(readiness.source_catalog.url).toBe("https://github.com/yybmion/public-apis-4Kr");
    expect(readiness.total_group_count).toBe(4);
    expect(readiness.configured_source_count).toBe(2);
    expect(readiness.configured_group_count).toBe(2);
    expect(readiness.missing_secret_names).not.toContain("SEOUL_OPEN_DATA_API_KEY");
    expect(readiness.missing_secret_names).not.toContain("KMA_API_KEY");
    expect(JSON.stringify(readiness)).not.toContain("seoul-secret");
    expect(JSON.stringify(readiness)).not.toContain("kma-secret");
  });
});
