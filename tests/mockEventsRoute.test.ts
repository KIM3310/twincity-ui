import { describe, expect, test } from "vitest";

import { GET } from "@/app/api/mock/events/route";

describe("mock events API route", () => {
  test("returns shape A by default with valid event records", async () => {
    const response = await GET(new Request("https://example.com/api/mock/events"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.meta).toBeDefined();
    expect(body.meta.shape).toBe("a");
    expect(Array.isArray(body.records)).toBe(true);
    expect(body.records.length).toBeGreaterThan(0);
    expect(body.records[0]).toHaveProperty("eventId");
    expect(body.records[0]).toHaveProperty("detectedAt");
    expect(body.records[0]).toHaveProperty("eventType");
  });

  test("returns shape B envelope when requested", async () => {
    const response = await GET(new Request("https://example.com/api/mock/events?shape=b"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.type).toBe("alert.batch");
    expect(Array.isArray(body.payload.items)).toBe(true);
    expect(body.payload.items[0]).toHaveProperty("alarm_id");
    expect(body.payload.items[0]).toHaveProperty("category");
    expect(body.payload.items[0].position.unit).toBe("percent");
  });

  test("returns single event envelope when requested", async () => {
    const response = await GET(
      new Request("https://example.com/api/mock/events?shape=single")
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.type).toBe("alert.created");
    expect(body.payload.event).toBeDefined();
    expect(body.payload.event).toHaveProperty("alarm_id");
  });

  test("returns edge device envelope when requested", async () => {
    const response = await GET(
      new Request("https://example.com/api/mock/events?shape=edge&count=2")
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.deviceId).toBe("camera-edge-01");
    expect(body.eventType).toBe("SAFETY");
    expect(Array.isArray(body.data.objects)).toBe(true);
    expect(body.data.objects.length).toBe(2);
    expect(body.data.objects[0]).toHaveProperty("track_id");
    expect(body.data.objects[0]).toHaveProperty("location");
    expect(body.data.objects[0].location).toHaveProperty("world");
  });

  test("rejects invalid shape parameter with 400", async () => {
    const response = await GET(
      new Request("https://example.com/api/mock/events?shape=invalid")
    );
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.message).toContain("Invalid shape");
  });

  test("respects count parameter", async () => {
    const response = await GET(
      new Request("https://example.com/api/mock/events?shape=a&count=7")
    );
    const body = await response.json();
    expect(body.records).toHaveLength(7);
  });

  test("sets x-request-id header", async () => {
    const response = await GET(
      new Request("https://example.com/api/mock/events", {
        headers: { "x-request-id": "test-req-123" },
      })
    );
    expect(response.headers.get("x-request-id")).toBe("test-req-123");
  });
});
