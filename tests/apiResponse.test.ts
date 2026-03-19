import { describe, expect, test } from "vitest";

import {
  apiError,
  apiJson,
  noStoreHeaders,
  readBoundedIntParam,
  resolveRequestId,
} from "../src/lib/apiResponse";

describe("apiResponse", () => {
  test("apiJson sets x-request-id and cache-control headers", async () => {
    const response = apiJson({ hello: "world" }, { requestId: "req-123" });
    expect(response.status).toBe(200);
    expect(response.headers.get("x-request-id")).toBe("req-123");
    expect(response.headers.get("cache-control")).toBe("no-store");

    const body = await response.json();
    expect(body.hello).toBe("world");
  });

  test("apiJson uses custom status and cache-control", async () => {
    const response = apiJson(
      { data: true },
      { status: 201, cacheControl: "max-age=60", requestId: "req-custom" }
    );
    expect(response.status).toBe(201);
    expect(response.headers.get("cache-control")).toBe("max-age=60");
  });

  test("apiJson generates a request id when none is provided", async () => {
    const response = apiJson({ ok: true });
    expect(response.headers.get("x-request-id")).toBeTruthy();
    expect(response.headers.get("x-request-id")!.length).toBeGreaterThan(0);
  });

  test("apiError returns structured error with correct status", async () => {
    const response = apiError("not found", { status: 404, requestId: "req-err" });
    expect(response.status).toBe(404);

    const body = await response.json();
    expect(body.error.message).toBe("not found");
    expect(body.error.request_id).toBe("req-err");
  });

  test("apiError defaults to 500 and sanitizes empty message", async () => {
    const response = apiError("  ");
    expect(response.status).toBe(500);

    const body = await response.json();
    expect(body.error.message).toBe("internal server error");
  });

  test("resolveRequestId reads from incoming header", () => {
    const request = new Request("https://example.com", {
      headers: { "x-request-id": "incoming-123" },
    });
    expect(resolveRequestId(request)).toBe("incoming-123");
  });

  test("resolveRequestId generates UUID when header is missing", () => {
    const request = new Request("https://example.com");
    const id = resolveRequestId(request);
    expect(id.length).toBeGreaterThan(0);
    // UUID format check (basic)
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
  });

  test("noStoreHeaders produces headers with x-request-id and cache-control", () => {
    const headers = noStoreHeaders("req-hdr");
    expect(headers.get("x-request-id")).toBe("req-hdr");
    expect(headers.get("cache-control")).toBe("no-store");
  });

  test("readBoundedIntParam parses within bounds", () => {
    const url = new URL("https://example.com?count=7");
    expect(readBoundedIntParam(url, "count", 5, 1, 10)).toBe(7);
  });

  test("readBoundedIntParam returns fallback for missing param", () => {
    const url = new URL("https://example.com");
    expect(readBoundedIntParam(url, "count", 5, 1, 10)).toBe(5);
  });

  test("readBoundedIntParam clamps to min/max", () => {
    const urlLow = new URL("https://example.com?count=-5");
    expect(readBoundedIntParam(urlLow, "count", 5, 1, 10)).toBe(1);

    const urlHigh = new URL("https://example.com?count=999");
    expect(readBoundedIntParam(urlHigh, "count", 5, 1, 10)).toBe(10);
  });

  test("readBoundedIntParam returns fallback for non-numeric value", () => {
    const url = new URL("https://example.com?count=abc");
    expect(readBoundedIntParam(url, "count", 5, 1, 10)).toBe(5);
  });
});
