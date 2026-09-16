import { describe, expect, test } from "vitest";
import { normalizeEventFeed } from "../src/lib/eventAdapter";

describe("persisted incident restoration", () => {
  test.each(["ack", "resolved"])("retains canonical fields for a saved %s event", (status) => {
    const saved = {
      id: "manual-map-saved",
      store_id: "s001",
      detected_at: 1771408800000,
      ingested_at: 1771408800000,
      latency_ms: 0,
      type: "unknown",
      severity: 2,
      confidence: 0.99,
      zone_id: "zone-s001-entrance",
      camera_id: "camera-edge-01",
      track_id: "manual-saved",
      object_label: "manual-target",
      raw_status: "manual_target",
      source: "camera",
      incident_status: status,
      x: 0.5833128787788886,
      y: 0.6021655732699464,
      world_x_m: 1.2,
      world_z_m: 1.5,
      note: "manual photo world (1.20, 1.50)",
    };
    const restored = normalizeEventFeed(JSON.parse(JSON.stringify([saved])), { maxEvents: 520 });
    expect(restored).toEqual([saved]);
    expect(normalizeEventFeed(JSON.parse(JSON.stringify(restored)), { maxEvents: 520 })).toEqual([saved]);
  });
});
