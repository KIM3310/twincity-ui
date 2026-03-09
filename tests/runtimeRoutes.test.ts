import { afterEach, describe, expect, test } from "vitest";

import { GET as getHealthRoute } from "@/app/api/health/route";
import { GET as getMetaRoute } from "@/app/api/meta/route";
import { GET as getReportSummaryRoute } from "@/app/api/reports/summary/route";
import { GET as getRuntimeBriefRoute } from "@/app/api/runtime-brief/route";
import { GET as getReportSchemaRoute } from "@/app/api/schema/report/route";

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
          status: "ok",
          live_sources: {
            ws: true,
            sse: false,
            http: true,
            poll_ms: 7000,
          },
          diagnostics: {
            ingest_mode: "ws",
            live_source_count: 2,
          },
          capabilities: [
            "service-metadata-surface",
            "runtime-brief-surface",
            "report-schema-surface",
            "report-summary-surface",
          ],
          service_grade: {
            readiness: "control-tower-readiness-v1",
            runtime_brief: "/api/runtime-brief",
            report_schema: "/api/schema/report",
            report_summary: "/api/reports/summary",
          },
          links: {
            meta: "/api/meta",
            runtime_brief: "/api/runtime-brief",
            report_schema: "/api/schema/report",
            report_summary: "/api/reports/summary",
            reports: "/reports",
          },
        });
        expect(body.ops_contract.schema).toBe("ops-envelope-v1");
        expect(body.diagnostics.next_action).toContain("/api/3d-test/status");
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
          status: "ok",
          readiness_contract: "control-tower-readiness-v1",
          live_sources: {
            ws: false,
            sse: true,
            http: false,
            poll_ms: 5000,
          },
          diagnostics: {
            ingest_mode: "sse",
            live_source_count: 1,
          },
        });
        expect(body.features).toContain("digital-twin-floor-map");
        expect(body.routes).toContain("/api/meta");
        expect(body.routes).toContain("/api/runtime-brief");
        expect(body.routes).toContain("/api/schema/report");
        expect(body.routes).toContain("/api/reports/summary");
        expect(body.ops_contract.schema).toBe("ops-envelope-v1");
        expect(body.diagnostics.next_action).toContain("/api/3d-test/status");
        expect(body.report_contract.schema).toBe("twincity-report-v1");
        expect(Array.isArray(body.trust_boundary)).toBe(true);
        expect(body.two_minute_review).toHaveLength(5);
        expect(body.proof_assets[0].href).toBe("/api/health");
        expect(body.links.runtime_brief).toBe("/api/runtime-brief");
        expect(body.links.report_summary).toBe("/api/reports/summary");
        expect(response.headers.get("x-request-id")).toBe(body.request_id);
      }
    );
  });

  test("runtime brief exposes review-first contract", async () => {
    const response = await getRuntimeBriefRoute(
      new Request("https://example.com/api/runtime-brief")
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      service: "twincity-ui",
      readiness_contract: "control-tower-runtime-brief-v1",
      report_contract: {
        schema: "twincity-report-v1",
      },
      links: {
        runtime_brief: "/api/runtime-brief",
        report_summary: "/api/reports/summary",
        reports: "/reports",
      },
    });
    expect(body.route_count).toBeGreaterThanOrEqual(7);
    expect(body.review_flow[0]).toContain("/api/health");
    expect(body.two_minute_review).toHaveLength(5);
    expect(body.proof_assets[0].href).toBe("/api/health");
    expect(response.headers.get("x-request-id")).toBe(body.request_id);
  });

  test("report summary route exposes deterministic SLA and spotlight contract", async () => {
    const response = await getReportSummaryRoute(
      new Request("https://example.com/api/reports/summary?range=60m&severity=3")
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      service: "twincity-ui",
      schema: "twincity-report-summary-v1",
      filters: {
        range: "60m",
        severity: "3",
        zone: "all",
      },
      summary: {
        total_incidents: 2,
        critical_incidents: 2,
      },
    });
    expect(body.top_types.some((item: { type: string }) => item.type === "fall")).toBe(
      true
    );
    expect(body.spotlight_incidents[0].severity).toBe(3);
    expect(Array.isArray(body.operator_notes)).toBe(true);
    expect(response.headers.get("x-request-id")).toBe(body.request_id);
  });

  test("report schema route exposes export contract", async () => {
    const response = await getReportSchemaRoute(new Request("https://example.com/api/schema/report"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      service: "twincity-ui",
      schema: "twincity-report-v1",
      version: 1,
    });
    expect(body.required_sections).toContain("summary");
    expect(body.export_formats).toContain("csv");
    expect(body.operator_rules).toContain(
      "Always separate ACK SLA from resolve SLA."
    );
    expect(response.headers.get("x-request-id")).toBe(body.request_id);
  });
});
