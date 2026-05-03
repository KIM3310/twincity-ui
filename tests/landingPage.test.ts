import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

describe("landing page front door", () => {
  const source = readFileSync(resolve(process.cwd(), "src/app/page.tsx"), "utf8");

  test("adds decision support for the first proof route", () => {
    expect(source).toContain("Decision support");
    expect(source).toContain("/api/proof-route-map");
    expect(source).toContain("무엇을 확인해야 하는지에 따라 첫 route를 바로 고를 수 있게 했습니다");
    expect(source).toContain("연결 신호를 먼저 확인해야 할 때");
    expect(source).toContain("handoff proof가 먼저 필요할 때");
    expect(source).toContain("실제 운영 큐를 바로 보여줘야 할 때");
  });

  test("surfaces role-fit signals and operator-ready kit copy", () => {
    expect(source).toContain("Role-fit signals");
    expect(source).toContain("AI engineer signal");
    expect(source).toContain("Systems engineer signal");
    expect(source).toContain("Solution architect signal");
    expect(source).toContain("Operator-ready kit");
  });
});
