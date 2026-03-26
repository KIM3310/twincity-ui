import { describe, expect, test } from "vitest";

import {
  clamp01,
  createMapWorldNormTransform,
  isLive,
  mapNormToWorldNorm,
  pointInPolygon,
  worldNormToMapNorm,
} from "../src/lib/geo";

describe("geo utilities", () => {
  test("clamp01 clamps values to 0..1", () => {
    expect(clamp01(-0.5)).toBe(0);
    expect(clamp01(0)).toBe(0);
    expect(clamp01(0.5)).toBe(0.5);
    expect(clamp01(1)).toBe(1);
    expect(clamp01(1.5)).toBe(1);
  });

  test("isLive returns true for recent timestamps", () => {
    const now = Date.now();
    expect(isLive(now - 1000, 5000)).toBe(true);
    expect(isLive(now - 10000, 5000)).toBe(false);
    expect(isLive(now, 0)).toBe(true);
  });

  test("pointInPolygon detects point inside a square", () => {
    const square: [number, number][] = [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
    ];
    expect(pointInPolygon(0.5, 0.5, square)).toBe(true);
    expect(pointInPolygon(2, 2, square)).toBe(false);
    expect(pointInPolygon(-1, -1, square)).toBe(false);
  });

  test("pointInPolygon detects point inside a triangle", () => {
    const triangle: [number, number][] = [
      [0, 0],
      [1, 0],
      [0.5, 1],
    ];
    expect(pointInPolygon(0.5, 0.3, triangle)).toBe(true);
    expect(pointInPolygon(0.9, 0.9, triangle)).toBe(false);
  });

  test("pointInPolygon returns false for empty polygon", () => {
    expect(pointInPolygon(0.5, 0.5, [])).toBe(false);
  });

  test("pointInPolygon handles concave L-shape correctly", () => {
    // L-shaped polygon
    const lShape: [number, number][] = [
      [0, 0],
      [0.5, 0],
      [0.5, 0.5],
      [1, 0.5],
      [1, 1],
      [0, 1],
    ];
    // Inside the L
    expect(pointInPolygon(0.25, 0.75, lShape)).toBe(true);
    // Inside upper-right part of L
    expect(pointInPolygon(0.75, 0.75, lShape)).toBe(true);
    // Outside the L (upper-right notch)
    expect(pointInPolygon(0.75, 0.25, lShape)).toBe(false);
  });
});

describe("mapWorldNormTransform", () => {
  test("creates identity transform for matching aspect ratios", () => {
    const t = createMapWorldNormTransform(800, 400, 20, 10);
    expect(t.scaleX).toBeCloseTo(1, 2);
    expect(t.scaleY).toBeCloseTo(1, 2);
    expect(t.offsetX).toBeCloseTo(0, 2);
    expect(t.offsetY).toBeCloseTo(0, 2);
  });

  test("center-crops X when map is wider than world", () => {
    const t = createMapWorldNormTransform(1000, 500, 10, 10);
    // map aspect = 2, world aspect = 1, map is wider
    expect(t.scaleX).toBeLessThan(1);
    expect(t.scaleY).toBeCloseTo(1, 2);
    expect(t.offsetX).toBeGreaterThan(0);
    expect(t.offsetY).toBeCloseTo(0, 2);
  });

  test("center-crops Y when map is taller than world", () => {
    const t = createMapWorldNormTransform(500, 1000, 10, 10);
    // map aspect = 0.5, world aspect = 1, map is taller
    expect(t.scaleX).toBeCloseTo(1, 2);
    expect(t.scaleY).toBeLessThan(1);
    expect(t.offsetX).toBeCloseTo(0, 2);
    expect(t.offsetY).toBeGreaterThan(0);
  });

  test("round-trips mapNorm -> worldNorm -> mapNorm for identity transform", () => {
    const t = createMapWorldNormTransform(800, 400, 20, 10);
    const world = mapNormToWorldNorm(0.3, 0.7, t);
    const back = worldNormToMapNorm(world.x, world.y, t);
    expect(back.x).toBeCloseTo(0.3, 4);
    expect(back.y).toBeCloseTo(0.7, 4);
  });

  test("handles degenerate zero dimensions with safe fallbacks", () => {
    const t = createMapWorldNormTransform(0, 0, 0, 0);
    expect(Number.isFinite(t.scaleX)).toBe(true);
    expect(Number.isFinite(t.scaleY)).toBe(true);
  });
});
