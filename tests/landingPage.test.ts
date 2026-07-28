import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

describe("landing page front door", () => {
  const source = readFileSync(resolve(process.cwd(), "src/app/page.tsx"), "utf8");
  const readme = readFileSync(resolve(process.cwd(), "README.md"), "utf8");
  const searchGrowth = readFileSync(
    resolve(process.cwd(), "docs/search-growth-implementation.md"),
    "utf8"
  );
  const revenue = readFileSync(resolve(process.cwd(), "docs/revenue-architecture.md"), "utf8");
  const servicesPage = readFileSync(resolve(process.cwd(), "src/app/services/page.tsx"), "utf8");
  const staleWorkspaceSku = "paid workspace for private maps, event ingestion, and monthly readiness reports";

  test("adds decision support for the first proof route", () => {
    expect(source).toContain("Decision support");
    expect(source).toContain("/api/proof-route-map");
    expect(source).toContain("무엇을 확인해야 하는지에 따라 첫 route를 바로 고를 수 있게 했습니다");
    expect(source).toContain("연결 신호를 먼저 확인해야 할 때");
    expect(source).toContain("handoff proof가 먼저 필요할 때");
    expect(source).toContain("실제 운영 큐를 바로 보여줘야 할 때");
  });

  test("surfaces surface-fit signals and operator-ready kit copy", () => {
    expect(source).toContain("Surface-fit signals");
    expect(source).toContain("운영 관점별로 어떤 근거를 먼저 읽어야 하는지 바로 보이게 정리했습니다");
    expect(source).toContain("AI pipeline signal");
    expect(source).toContain("Systems reliability signal");
    expect(source).toContain("Review rollout signal");
    expect(source).toContain("Operator-ready kit");
  });

  test("keeps public positioning product-led and private-inquiry based", () => {
    expect(readme).toContain("Product proof surface");
    expect(readme).toContain("Commercial exploration is limited to the private inquiry lane");
    expect(readme).not.toContain("Archived / Supporting repo");
    expect(readme).not.toContain("historical proof");
    expect(searchGrowth).toContain("architecture-scope-sprint");
    expect(searchGrowth).toContain("central private inquiry form");
    expect(searchGrowth).not.toContain("GitHub Issue Form");
    expect(searchGrowth).not.toContain("issues/new");
  });

  test("keeps paid SKU aligned to Architecture Scope Sprint", () => {
    const publicSurface = [readme, searchGrowth, revenue, servicesPage].join("\n");

    expect(publicSurface).toContain("Architecture Scope Sprint");
    expect(publicSurface).toContain("post-scope expansion");
    expect(publicSurface).not.toContain(staleWorkspaceSku);
  });
});
