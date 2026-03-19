import { describe, expect, test } from "vitest";

import { applyHomography, computeHomography } from "../src/lib/homography";

describe("homography", () => {
  test("computes identity-like homography for coincident src/dst", () => {
    const points: [number, number][] = [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
    ];
    const h = computeHomography(points, points);
    expect(h).not.toBeNull();

    // Mapping any source point should return approximately the same point
    const mapped = applyHomography(h!, 0.5, 0.5);
    expect(mapped).not.toBeNull();
    expect(mapped!.x).toBeCloseTo(0.5, 5);
    expect(mapped!.y).toBeCloseTo(0.5, 5);
  });

  test("returns null for fewer than 4 points", () => {
    const src: [number, number][] = [
      [0, 0],
      [1, 0],
      [1, 1],
    ];
    const dst: [number, number][] = [
      [0, 0],
      [2, 0],
      [2, 2],
    ];
    expect(computeHomography(src, dst)).toBeNull();
  });

  test("returns null when points contain non-finite values", () => {
    const src: [number, number][] = [
      [NaN, 0],
      [1, 0],
      [1, 1],
      [0, 1],
    ];
    const dst: [number, number][] = [
      [0, 0],
      [2, 0],
      [2, 2],
      [0, 2],
    ];
    expect(computeHomography(src, dst)).toBeNull();
  });

  test("applyHomography returns null for wrong-length matrix", () => {
    expect(applyHomography([1, 0, 0, 0, 1, 0], 0.5, 0.5)).toBeNull();
    expect(applyHomography([], 0.5, 0.5)).toBeNull();
  });

  test("computes a scale-2x homography correctly", () => {
    const src: [number, number][] = [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
    ];
    const dst: [number, number][] = [
      [0, 0],
      [2, 0],
      [2, 2],
      [0, 2],
    ];
    const h = computeHomography(src, dst);
    expect(h).not.toBeNull();

    const mapped = applyHomography(h!, 0.5, 0.5);
    expect(mapped).not.toBeNull();
    expect(mapped!.x).toBeCloseTo(1.0, 5);
    expect(mapped!.y).toBeCloseTo(1.0, 5);
  });

  test("maps corner points of a known quadrilateral", () => {
    const src: [number, number][] = [
      [0, 0],
      [100, 0],
      [100, 100],
      [0, 100],
    ];
    const dst: [number, number][] = [
      [10, 10],
      [90, 10],
      [90, 90],
      [10, 90],
    ];
    const h = computeHomography(src, dst);
    expect(h).not.toBeNull();

    const topLeft = applyHomography(h!, 0, 0);
    expect(topLeft!.x).toBeCloseTo(10, 3);
    expect(topLeft!.y).toBeCloseTo(10, 3);

    const bottomRight = applyHomography(h!, 100, 100);
    expect(bottomRight!.x).toBeCloseTo(90, 3);
    expect(bottomRight!.y).toBeCloseTo(90, 3);
  });

  test("applyHomography returns null when w is near zero (degenerate)", () => {
    // Construct a matrix where h[6]*x + h[7]*y + 1 ≈ 0
    const matrix = [1, 0, 0, 0, 1, 0, 1, 0, 1] as const;
    // At x=-1, y=0: w = 1*(-1) + 0*0 + 1 = 0
    const result = applyHomography(matrix, -1, 0);
    expect(result).toBeNull();
  });
});
