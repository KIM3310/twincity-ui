import { describe, expect, test } from "vitest";

import { adaptRawEvent, normalizeEventFeed } from "../src/lib/eventAdapter";
import type { EventItem } from "../src/lib/types";

describe("eventAdapter edge cases", () => {
  test("adaptRawEvent returns null for non-object values", () => {
    expect(adaptRawEvent("string")).toBeNull();
    expect(adaptRawEvent(42)).toBeNull();
    expect(adaptRawEvent(true)).toBeNull();
    expect(adaptRawEvent([])).toBeNull();
  });

  test("adaptRawEvent returns null when no id can be extracted", () => {
    const result = adaptRawEvent({
      timestamp: "2026-02-10T12:00:00Z",
      eventType: "crowd",
      position: { x: 0.5, y: 0.5 },
    });
    expect(result).toBeNull();
  });

  test("adaptRawEvent returns null when no coordinates can be extracted", () => {
    const result = adaptRawEvent({
      eventId: "evt-no-coords",
      timestamp: "2026-02-10T12:00:00Z",
      eventType: "crowd",
    });
    expect(result).toBeNull();
  });

  test("adaptRawEvent returns null when timestamp is missing", () => {
    const result = adaptRawEvent({
      eventId: "evt-no-time",
      eventType: "crowd",
      position: { x: 0.5, y: 0.5 },
    });
    expect(result).toBeNull();
  });

  test("adaptRawEvent normalizes percent-based coordinates to 0..1", () => {
    const result = adaptRawEvent({
      eventId: "evt-percent",
      timestamp: "2026-02-10T12:00:00Z",
      eventType: "crowd",
      position: { x: 50, y: 75 },
    });
    expect(result).not.toBeNull();
    expect(result!.x).toBeCloseTo(0.5, 2);
    expect(result!.y).toBeCloseTo(0.75, 2);
  });

  test("adaptRawEvent normalizes event type aliases", () => {
    const fallAliases = ["fall_down", "slip", "trip"];
    for (const alias of fallAliases) {
      const result = adaptRawEvent({
        eventId: `evt-${alias}`,
        timestamp: "2026-02-10T12:00:00Z",
        eventType: alias,
        position: { x: 0.5, y: 0.5 },
      });
      expect(result).not.toBeNull();
      expect(result!.type).toBe("fall");
    }
  });

  test("adaptRawEvent normalizes fight aliases", () => {
    const result = adaptRawEvent({
      eventId: "evt-violence",
      timestamp: "2026-02-10T12:00:00Z",
      eventType: "violence",
      position: { x: 0.5, y: 0.5 },
    });
    expect(result!.type).toBe("fight");
  });

  test("adaptRawEvent normalizes incident status aliases", () => {
    const ackAliases = ["acknowledged", "in_progress", "dispatched"];
    for (const alias of ackAliases) {
      const result = adaptRawEvent({
        eventId: `evt-${alias}`,
        timestamp: "2026-02-10T12:00:00Z",
        eventType: "crowd",
        position: { x: 0.5, y: 0.5 },
        status: alias,
      });
      expect(result).not.toBeNull();
      expect(result!.incident_status).toBe("ack");
    }
  });

  test("adaptRawEvent normalizes resolved status aliases", () => {
    const result = adaptRawEvent({
      eventId: "evt-done",
      timestamp: "2026-02-10T12:00:00Z",
      eventType: "crowd",
      position: { x: 0.5, y: 0.5 },
      status: "completed",
    });
    expect(result!.incident_status).toBe("resolved");
  });

  test("adaptRawEvent normalizes severity from string labels", () => {
    const critical = adaptRawEvent({
      eventId: "evt-crit",
      timestamp: "2026-02-10T12:00:00Z",
      eventType: "crowd",
      severity: "Critical",
      position: { x: 0.5, y: 0.5 },
    });
    expect(critical!.severity).toBe(3);

    const low = adaptRawEvent({
      eventId: "evt-low",
      timestamp: "2026-02-10T12:00:00Z",
      eventType: "crowd",
      severity: "low",
      position: { x: 0.5, y: 0.5 },
    });
    expect(low!.severity).toBe(1);
  });

  test("adaptRawEvent defaults severity based on event type when not provided", () => {
    const fall = adaptRawEvent({
      eventId: "evt-fall-default",
      timestamp: "2026-02-10T12:00:00Z",
      eventType: "fall",
      position: { x: 0.5, y: 0.5 },
    });
    expect(fall!.severity).toBe(3);

    const loiter = adaptRawEvent({
      eventId: "evt-loiter-default",
      timestamp: "2026-02-10T12:00:00Z",
      eventType: "loitering",
      position: { x: 0.5, y: 0.5 },
    });
    expect(loiter!.severity).toBe(1);
  });

  test("adaptRawEvent normalizes confidence from 0-100 scale", () => {
    const result = adaptRawEvent({
      eventId: "evt-conf-100",
      timestamp: "2026-02-10T12:00:00Z",
      eventType: "crowd",
      confidence: 85,
      position: { x: 0.5, y: 0.5 },
    });
    expect(result!.confidence).toBeCloseTo(0.85, 2);
  });

  test("adaptRawEvent extracts note from vlm_analysis.summary", () => {
    const result = adaptRawEvent({
      eventId: "evt-note",
      timestamp: "2026-02-10T12:00:00Z",
      eventType: "fall",
      position: { x: 0.5, y: 0.5 },
      vlm_analysis: {
        summary: "Person fell in aisle",
        cause: "Wet floor",
        action: "Call_119",
      },
    });
    expect(result!.note).toContain("Person fell in aisle");
    expect(result!.note).toContain("cause:Wet floor");
    expect(result!.note).toContain("action:Call_119");
  });

  test("adaptRawEvent generates id from track_id and camera when no explicit id", () => {
    const result = adaptRawEvent({
      track_id: 42,
      cameraId: "cam-01",
      timestamp: "2026-02-10T12:00:00Z",
      eventType: "fall",
      position: { x: 0.5, y: 0.5 },
    });
    expect(result).not.toBeNull();
    expect(result!.id).toBe("cam-01:track-42");
  });

  test("adaptRawEvent reads position from array-format coordinates", () => {
    const result = adaptRawEvent({
      eventId: "evt-array-pos",
      timestamp: "2026-02-10T12:00:00Z",
      eventType: "crowd",
      position: [0.3, 0.7],
    });
    expect(result).not.toBeNull();
    expect(result!.x).toBeCloseTo(0.3, 2);
    expect(result!.y).toBeCloseTo(0.7, 2);
  });

  test("normalizeEventFeed returns empty array for non-array input", () => {
    expect(normalizeEventFeed(null, { maxEvents: 10 })).toEqual([]);
    expect(normalizeEventFeed("string", { maxEvents: 10 })).toEqual([]);
    expect(normalizeEventFeed({}, { maxEvents: 10 })).toEqual([]);
    expect(normalizeEventFeed(undefined, { maxEvents: 10 })).toEqual([]);
  });

  test("normalizeEventFeed respects maxEvents limit", () => {
    const records = Array.from({ length: 20 }, (_, i) => ({
      eventId: `evt-limit-${i}`,
      timestamp: 1739168718 + i,
      eventType: "crowd",
      position: { x: 0.5, y: 0.5 },
    }));
    const result = normalizeEventFeed(records, { maxEvents: 5 });
    expect(result).toHaveLength(5);
  });

  test("normalizeEventFeed filters out completely invalid records", () => {
    const records = [
      {
        eventId: "valid",
        timestamp: "2026-02-10T12:00:00Z",
        eventType: "crowd",
        position: { x: 0.5, y: 0.5 },
      },
      null,
      undefined,
      42,
      "garbage",
      {},
      { eventId: "no-coords", timestamp: "2026-02-10T12:00:00Z" },
    ];
    const result = normalizeEventFeed(records, { maxEvents: 50 });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("valid");
  });

  test("normalizeEventFeed uses fallbackStoreId and defaultSource", () => {
    const records = [
      {
        eventId: "evt-opts",
        timestamp: "2026-02-10T12:00:00Z",
        eventType: "crowd",
        position: { x: 0.5, y: 0.5 },
      },
    ];
    const result = normalizeEventFeed(records, {
      maxEvents: 10,
      fallbackStoreId: "store-custom",
      defaultSource: "api",
    });
    expect(result[0].store_id).toBe("store-custom");
    expect(result[0].source).toBe("api");
  });
});
