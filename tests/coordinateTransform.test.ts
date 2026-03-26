import { describe, expect, test } from "vitest";

import {
  MODEL_REF_DEPTH_M,
  MODEL_REF_WIDTH_M,
  mapNormToScene,
  worldToMapNorm,
} from "../src/lib/coordinateTransform";

describe("coordinateTransform", () => {
  test("worldToMapNorm maps origin (0,0) near center of normalized space", () => {
    const result = worldToMapNorm(0, 0);
    expect(result.x).toBeGreaterThanOrEqual(0);
    expect(result.x).toBeLessThanOrEqual(1);
    expect(result.y).toBeGreaterThanOrEqual(0);
    expect(result.y).toBeLessThanOrEqual(1);
  });

  test("worldToMapNorm clamps extreme world coordinates to 0..1", () => {
    const farOut = worldToMapNorm(999, 999);
    expect(farOut.x).toBeGreaterThanOrEqual(0);
    expect(farOut.x).toBeLessThanOrEqual(1);
    expect(farOut.y).toBeGreaterThanOrEqual(0);
    expect(farOut.y).toBeLessThanOrEqual(1);

    const farNeg = worldToMapNorm(-999, -999);
    expect(farNeg.x).toBeGreaterThanOrEqual(0);
    expect(farNeg.x).toBeLessThanOrEqual(1);
    expect(farNeg.y).toBeGreaterThanOrEqual(0);
    expect(farNeg.y).toBeLessThanOrEqual(1);
  });

  test("mapNormToScene converts center to origin", () => {
    const scene = mapNormToScene(0.5, 0.5, MODEL_REF_WIDTH_M, MODEL_REF_DEPTH_M);
    expect(scene.x).toBeCloseTo(0, 5);
    expect(scene.z).toBeCloseTo(0, 5);
  });

  test("mapNormToScene converts corners correctly", () => {
    const topLeft = mapNormToScene(0, 0, MODEL_REF_WIDTH_M, MODEL_REF_DEPTH_M);
    expect(topLeft.x).toBeCloseTo(-MODEL_REF_WIDTH_M / 2, 5);
    expect(topLeft.z).toBeCloseTo(-MODEL_REF_DEPTH_M / 2, 5);

    const bottomRight = mapNormToScene(1, 1, MODEL_REF_WIDTH_M, MODEL_REF_DEPTH_M);
    expect(bottomRight.x).toBeCloseTo(MODEL_REF_WIDTH_M / 2, 5);
    expect(bottomRight.z).toBeCloseTo(MODEL_REF_DEPTH_M / 2, 5);
  });

  test("mapNormToScene uses default dimensions when given invalid inputs", () => {
    const scene = mapNormToScene(0.5, 0.5, -1, 0);
    expect(scene.x).toBeCloseTo(0, 5);
    expect(scene.z).toBeCloseTo(0, 5);
  });

  test("mapNormToScene clamps input coordinates to 0..1", () => {
    const clamped = mapNormToScene(2, -1, 10, 10);
    // normX=1 -> (1-0.5)*10 = 5, normY=0 -> (0-0.5)*10 = -5
    expect(clamped.x).toBeCloseTo(5, 5);
    expect(clamped.z).toBeCloseTo(-5, 5);
  });

  test("MODEL_REF constants are positive finite numbers", () => {
    expect(MODEL_REF_WIDTH_M).toBeGreaterThan(0);
    expect(MODEL_REF_DEPTH_M).toBeGreaterThan(0);
    expect(Number.isFinite(MODEL_REF_WIDTH_M)).toBe(true);
    expect(Number.isFinite(MODEL_REF_DEPTH_M)).toBe(true);
  });
});
