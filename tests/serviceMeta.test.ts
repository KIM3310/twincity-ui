import { describe, expect, test } from "vitest";

import {
  buildControlTowerServiceMeta,
  countServiceArtifactsByKind,
  listControlTowerEvidenceArtifacts,
} from "@/lib/serviceMeta";

describe("service meta evidence surface", () => {
  test("derives evidence counts from the shared evidence registry", () => {
    const meta = buildControlTowerServiceMeta();

    expect(meta.evidence_counts).toEqual(
      countServiceArtifactsByKind(listControlTowerEvidenceArtifacts())
    );
  });

  test("includes the portfolio review guide in reviewer-facing artifacts", () => {
    const meta = buildControlTowerServiceMeta();

    expect(meta.artifacts.map((item) => item.href)).toContain("docs/PORTFOLIO_REVIEW_GUIDE.md");
    expect(meta.proof_assets.map((item) => item.href)).toContain("tests/runtimeRoutes.test.ts");
  });
});
