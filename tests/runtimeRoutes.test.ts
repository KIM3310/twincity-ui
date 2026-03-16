import { afterEach, describe, expect, test } from "vitest";

import { GET as getHealthRoute } from "@/app/api/health/route";
import { GET as getMetaRoute } from "@/app/api/meta/route";
import { GET as getAssignmentHistoryRoute } from "@/app/api/reports/assignment-history/route";
import { GET as getDispatchBoardRoute } from "@/app/api/reports/dispatch-board/route";
import { GET as getReportExportRoute } from "@/app/api/reports/export/route";
import { GET as getReportHandoffRoute } from "@/app/api/reports/handoff/route";
import { GET as getResponsePlaybookRoute } from "@/app/api/reports/response-playbook/route";
import { GET as getReviewerBundleRoute } from "@/app/api/reports/reviewer-bundle/route";
import { GET as getReviewerBundleVerifyRoute } from "@/app/api/reports/reviewer-bundle/verify/route";
import { GET as getReportSummaryRoute } from "@/app/api/reports/summary/route";
import { GET as getRuntimeBriefRoute } from "@/app/api/runtime-brief/route";
import { GET as getRuntimeScorecardRoute } from "@/app/api/runtime-scorecard/route";
import { GET as getReportSchemaRoute } from "@/app/api/schema/report/route";

const ENV_KEYS = [
  "NEXT_PUBLIC_EVENT_WS_URL",
  "NEXT_PUBLIC_EVENT_STREAM_URL",
  "NEXT_PUBLIC_EVENT_API_URL",
  "NEXT_PUBLIC_EVENT_POLL_MS",
  "TWINCITY_EXPORT_OPERATOR_TOKEN",
  "TWINCITY_EXPORT_OPERATOR_ALLOWED_ROLES",
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
            "runtime-scorecard-surface",
            "report-schema-surface",
            "report-summary-surface",
            "dispatch-board-surface",
            "assignment-history-surface",
            "handoff-brief-surface",
            "response-playbook-surface",
            "reviewer-bundle-surface",
          ],
          service_grade: {
            readiness: "control-tower-readiness-v1",
            runtime_brief: "/api/runtime-brief",
            runtime_scorecard: "/api/runtime-scorecard",
            report_schema: "/api/schema/report",
            report_summary: "/api/reports/summary",
            dispatch_board: "/api/reports/dispatch-board",
            assignment_history: "/api/reports/assignment-history",
            report_handoff: "/api/reports/handoff",
            response_playbook: "/api/reports/response-playbook",
            report_export: "/api/reports/export",
            reviewer_bundle: "/api/reports/reviewer-bundle",
            reviewer_bundle_verify: "/api/reports/reviewer-bundle/verify",
          },
          links: {
            meta: "/api/meta",
            runtime_brief: "/api/runtime-brief",
            runtime_scorecard: "/api/runtime-scorecard",
            report_schema: "/api/schema/report",
            report_summary: "/api/reports/summary",
            dispatch_board: "/api/reports/dispatch-board",
            assignment_history: "/api/reports/assignment-history",
            report_handoff: "/api/reports/handoff",
            response_playbook: "/api/reports/response-playbook",
            report_export: "/api/reports/export",
            reviewer_bundle: "/api/reports/reviewer-bundle",
            reviewer_bundle_verify: "/api/reports/reviewer-bundle/verify",
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
        expect(body.routes).toContain("/api/reports/dispatch-board");
        expect(body.routes).toContain("/api/reports/assignment-history");
        expect(body.routes).toContain("/api/reports/handoff");
        expect(body.routes).toContain("/api/reports/response-playbook");
        expect(body.routes).toContain("/api/reports/export");
        expect(body.routes).toContain("/api/reports/reviewer-bundle");
        expect(body.routes).toContain("/api/reports/reviewer-bundle/verify");
        expect(body.ops_contract.schema).toBe("ops-envelope-v1");
        expect(body.diagnostics.next_action).toContain("/api/3d-test/status");
        expect(body.report_contract.schema).toBe("twincity-report-v1");
        expect(Array.isArray(body.trust_boundary)).toBe(true);
        expect(body.two_minute_review).toHaveLength(11);
        expect(body.proof_assets[0].href).toBe("/api/health");
        expect(body.links.runtime_brief).toBe("/api/runtime-brief");
        expect(body.links.runtime_scorecard).toBe("/api/runtime-scorecard");
        expect(body.links.report_summary).toBe("/api/reports/summary");
        expect(body.links.dispatch_board).toBe("/api/reports/dispatch-board");
        expect(body.links.assignment_history).toBe("/api/reports/assignment-history");
        expect(body.links.report_handoff).toBe("/api/reports/handoff");
        expect(body.links.response_playbook).toBe("/api/reports/response-playbook");
        expect(body.links.report_export).toBe("/api/reports/export");
        expect(body.links.reviewer_bundle).toBe("/api/reports/reviewer-bundle");
        expect(body.links.reviewer_bundle_verify).toBe("/api/reports/reviewer-bundle/verify");
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
        runtime_scorecard: "/api/runtime-scorecard",
        report_summary: "/api/reports/summary",
        dispatch_board: "/api/reports/dispatch-board",
        assignment_history: "/api/reports/assignment-history",
        report_handoff: "/api/reports/handoff",
        response_playbook: "/api/reports/response-playbook",
        report_export: "/api/reports/export",
        reviewer_bundle: "/api/reports/reviewer-bundle",
        reviewer_bundle_verify: "/api/reports/reviewer-bundle/verify",
        reports: "/reports",
      },
    });
    expect(body.route_count).toBeGreaterThanOrEqual(10);
    expect(body.review_flow[0]).toContain("/api/health");
    expect(body.two_minute_review).toHaveLength(11);
    expect(body.proof_assets[0].href).toBe("/api/health");
    expect(response.headers.get("x-request-id")).toBe(body.request_id);
  });

  test("runtime scorecard exposes export auth and deterministic SLA snapshot", async () => {
    const response = await getRuntimeScorecardRoute(
      new Request("https://example.com/api/runtime-scorecard")
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.readiness_contract).toBe("twincity-runtime-scorecard-v1");
    expect(body.summary.total_incidents).toBeGreaterThanOrEqual(1);
    expect(body.summary.attention_incidents).toBeGreaterThanOrEqual(1);
    expect(body.runtime.operator_auth.enabled).toBe(false);
    expect(body.links.runtime_scorecard).toBe("/api/runtime-scorecard");
    expect(body.links.dispatch_board).toBe("/api/reports/dispatch-board");
    expect(body.links.assignment_history).toBe("/api/reports/assignment-history");
    expect(body.links.response_playbook).toBe("/api/reports/response-playbook");
    expect(body.links.reviewer_bundle).toBe("/api/reports/reviewer-bundle");
    expect(response.headers.get("x-request-id")).toBe(body.request_id);
  });

  test("report summary route exposes deterministic SLA and spotlight contract", async () => {
    const response = await getReportSummaryRoute(
      new Request(
        "https://example.com/api/reports/summary?range=60m&severity=3&incident_status=ack"
      )
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
        incident_status: "ack",
        zone: "all",
      },
      summary: {
        total_incidents: 1,
        critical_incidents: 1,
      },
    });
    expect(body.summary.status_breakdown.ack).toBe(1);
    expect(body.top_types.some((item: { type: string }) => item.type === "fall")).toBe(
      true
    );
    expect(body.spotlight_incidents[0].severity).toBe(3);
    expect(Array.isArray(body.operator_notes)).toBe(true);
    expect(response.headers.get("x-request-id")).toBe(body.request_id);
  });

  test("dispatch board route exposes attention lanes and review bundle", async () => {
    const response = await getDispatchBoardRoute(
      new Request(
        "https://example.com/api/reports/dispatch-board?range=60m&severity=3&lane=attention"
      )
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      service: "twincity-ui",
      schema: "twincity-dispatch-board-v1",
      filters: {
        range: "60m",
        severity: "3",
        lane: "attention",
      },
      summary: {
        visible_incidents: 1,
        attention_count: 1,
      },
    });
    expect(body.items[0].lane).toBe("attention");
    expect(body.items[0].next_action).toContain("Acknowledge");
    expect(body.route_bundle.dispatch_board).toBe("/api/reports/dispatch-board");
    expect(response.headers.get("x-request-id")).toBe(body.request_id);
  });

  test("assignment history route exposes operator ownership and handoff chain", async () => {
    const response = await getAssignmentHistoryRoute(
      new Request("https://example.com/api/reports/assignment-history?range=120m&severity=all")
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      service: "twincity-ui",
      schema: "twincity-assignment-history-v1",
      filters: {
        range: "120m",
        severity: "all",
        incident_status: "all",
        zone: "all",
      },
      summary: {
        visible_incidents: 4,
        assigned_count: 3,
        unassigned_count: 1,
      },
    });
    expect(body.items[0].id).toBe("evt-seoul-03");
    expect(body.items[0].current_owner).toBe("dispatch-lead");
    expect(body.items[0].history[0].actor).toBe("dispatch-router");
    expect(body.route_bundle.assignment_history).toBe("/api/reports/assignment-history");
    expect(response.headers.get("x-request-id")).toBe(body.request_id);
  });

  test("handoff route exposes deterministic shift handoff priorities", async () => {
    const response = await getReportHandoffRoute(
      new Request("https://example.com/api/reports/handoff?range=120m&severity=all")
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      service: "twincity-ui",
      schema: "twincity-handoff-brief-v1",
      filters: {
        range: "120m",
        severity: "all",
        incident_status: "all",
        zone: "all",
      },
      summary: {
        visible_incidents: 4,
        open_incidents: 2,
        critical_incidents: 2,
        attention_count: 1,
        dispatch_count: 1,
        ack_overdue_count: 1,
        resolve_overdue_count: 0,
      },
    });
    expect(body.priorities[0].id).toBe("evt-seoul-03");
    expect(body.priorities[0].lane).toBe("attention");
    expect(body.priorities[0].next_action).toContain("Acknowledge immediately");
    expect(body.route_bundle.report_handoff).toBe("/api/reports/handoff");
    expect(Array.isArray(body.operator_notes)).toBe(true);
    expect(response.headers.get("x-request-id")).toBe(body.request_id);
  });

  test("response playbook route exposes escalation drills and next checkpoints", async () => {
    const response = await getResponsePlaybookRoute(
      new Request("https://example.com/api/reports/response-playbook?range=120m&severity=all")
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      service: "twincity-ui",
      schema: "twincity-response-playbook-v1",
      filters: {
        range: "120m",
        severity: "all",
        incident_status: "all",
        zone: "all",
      },
      route_bundle: {
        response_playbook: "/api/reports/response-playbook",
        dispatch_board: "/api/reports/dispatch-board",
        assignment_history: "/api/reports/assignment-history",
        report_handoff: "/api/reports/handoff",
        reviewer_bundle: "/api/reports/reviewer-bundle",
        reports: "/reports",
      },
    });
    expect(body.summary.drills_required).toBeGreaterThanOrEqual(1);
    expect(body.items[0].response_drill).toMatch(
      /ack-and-escalate|blocker-sync-and-reroute|closure-export-check/
    );
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
    expect(body.export_formats).toContain("json");
    expect(body.export_formats).toContain("csv");
    expect(body.export_formats).toContain("reviewer-bundle");
    expect(body.operator_rules).toContain(
      "Always separate ACK SLA from resolve SLA."
    );
    expect(response.headers.get("x-request-id")).toBe(body.request_id);
  });

  test("report export route exposes JSON and CSV snapshot contracts", async () => {
    const jsonResponse = await getReportExportRoute(
      new Request("https://example.com/api/reports/export?range=60m&severity=3&format=json")
    );
    const jsonBody = await jsonResponse.json();

    expect(jsonResponse.status).toBe(200);
    expect(jsonBody).toMatchObject({
      ok: true,
      service: "twincity-ui",
      schema: "twincity-report-export-v1",
      format: "json",
      filters: {
        range: "60m",
        severity: "3",
      },
    });
    expect(jsonBody.review_routes).toContain("/api/reports/export");
    expect(jsonBody.download_name.endsWith(".json")).toBe(true);

    const csvResponse = await getReportExportRoute(
      new Request("https://example.com/api/reports/export?range=60m&severity=3&format=csv")
    );
    const csvBody = await csvResponse.text();

    expect(csvResponse.status).toBe(200);
    expect(csvResponse.headers.get("content-type")).toContain("text/csv");
    expect(csvBody.split("\n")[0]).toContain("id,detected_at,zone_id,type,severity");
  });

  test("reviewer bundle route exposes digest-backed handoff contract", async () => {
    const bundleResponse = await getReviewerBundleRoute(
      new Request("https://example.com/api/reports/reviewer-bundle?range=60m&severity=3")
    );
    const bundleBody = await bundleResponse.json();

    expect(bundleResponse.status).toBe(200);
    expect(bundleBody).toMatchObject({
      ok: true,
      service: "twincity-ui",
      schema: "twincity-reviewer-bundle-v1",
      filters: {
        range: "60m",
        severity: "3",
      },
      integrity: {
        algorithm: "SHA-256",
        verification_route: "/api/reports/reviewer-bundle/verify",
      },
    });
    expect(bundleBody.integrity.digest).toHaveLength(64);
    expect(bundleBody.bundle.review_routes).toContain("/api/reports/reviewer-bundle");

    const verifyResponse = await getReviewerBundleVerifyRoute(
      new Request(
        `https://example.com/api/reports/reviewer-bundle/verify?range=60m&severity=3&digest=${bundleBody.integrity.digest}`
      )
    );
    const verifyBody = await verifyResponse.json();

    expect(verifyResponse.status).toBe(200);
    expect(verifyBody.schema).toBe("twincity-reviewer-bundle-verify-v1");
    expect(verifyBody.match).toBe(true);
    expect(verifyBody.computed_digest).toBe(bundleBody.integrity.digest);
  });

  test("report export route requires operator token when enabled", async () => {
    await withEnv(
      {
        TWINCITY_EXPORT_OPERATOR_TOKEN: "twincity-secret",
        TWINCITY_EXPORT_OPERATOR_ALLOWED_ROLES: "dispatcher,supervisor",
      },
      async () => {
        const unauthorized = await getReportExportRoute(
          new Request("https://example.com/api/reports/export?format=json")
        );
        const unauthorizedBody = await unauthorized.json();

        expect(unauthorized.status).toBe(401);
        expect(unauthorizedBody.error.message).toContain("operator token required");
        expect(unauthorized.headers.get("x-required-operator-header")).toBe("x-operator-token");

        const wrongRole = await getReportExportRoute(
          new Request("https://example.com/api/reports/export?format=json", {
            headers: {
              "x-operator-token": "twincity-secret",
              "x-operator-role": "observer",
            },
          })
        );
        const wrongRoleBody = await wrongRole.json();

        expect(wrongRole.status).toBe(403);
        expect(wrongRoleBody.error.message).toContain("required operator role missing");
        expect(wrongRole.headers.get("x-required-operator-role-header")).toContain(
          "x-operator-role"
        );

        const authorized = await getReportExportRoute(
          new Request("https://example.com/api/reports/export?format=json", {
            headers: {
              "x-operator-token": "twincity-secret",
              "x-operator-role": "dispatcher",
            },
          })
        );
        const authorizedBody = await authorized.json();

        expect(authorized.status).toBe(200);
        expect(authorizedBody.operator_auth.enabled).toBe(true);
      }
    );
  });

  test("runtime scorecard exposes required export roles when configured", async () => {
    await withEnv(
      {
        TWINCITY_EXPORT_OPERATOR_TOKEN: "twincity-secret",
        TWINCITY_EXPORT_OPERATOR_ALLOWED_ROLES: "dispatcher,supervisor",
      },
      async () => {
        const response = await getRuntimeScorecardRoute(
          new Request("https://example.com/api/runtime-scorecard")
        );
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.runtime.operator_auth.required_roles).toEqual([
          "dispatcher",
          "supervisor",
        ]);
        expect(body.runtime.operator_auth.role_headers).toContain("x-operator-role");
      }
    );
  });
});
