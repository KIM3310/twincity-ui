import { describe, expect, test } from "vitest";
import docsOffer from "../docs/service-offer.json" with { type: "json" };
import proxyOffer from "../pages-proxy/service-offer.json" with { type: "json" };
import redirectOffer from "../pages-redirect/service-offer.json" with { type: "json" };
import publicOffer from "../public/service-offer.json" with { type: "json" };

import {
  buildControlTowerServiceMeta,
  countServiceArtifactsByKind,
  listControlTowerEvidenceArtifacts,
} from "@/lib/serviceMeta";

describe("service meta evidence surface", () => {
  const privateInquiryUrl =
    "https://kim3310-doeon-kim-portfolio.pages.dev/?offer=twincity-ui&inquiry=architecture-scope-sprint#private-inquiry";
  const staleWorkspaceSku = "paid workspace for private maps, event ingestion, and monthly readiness reports";

  test("derives evidence counts from the shared evidence registry", () => {
    const meta = buildControlTowerServiceMeta();

    expect(meta.evidence_counts).toEqual(
      countServiceArtifactsByKind(listControlTowerEvidenceArtifacts())
    );
  });

  test("includes the technical review pack in public artifacts", () => {
    const meta = buildControlTowerServiceMeta();

    expect(meta.artifacts.map((item) => item.href)).toContain("docs/architecture-pack.md");
    expect(meta.artifacts.map((item) => item.href)).toContain("/api/proof-route-map");
    expect(meta.artifacts.map((item) => item.href)).toContain("/api/public-apis");
    expect(meta.proof_assets.map((item) => item.href)).toContain("tests/runtimeRoutes.test.ts");
  });

  test("keeps service offer manifests on the central private inquiry lane", () => {
    for (const offer of [docsOffer, publicOffer, proxyOffer, redirectOffer]) {
      expect(offer.lead_capture_url).toBe(privateInquiryUrl);
      expect(offer.commerce.lane_id).toBe("architecture-scope-sprint");
      expect(offer.commerce.checkout.status).toBe("not-configured");
      expect(offer.commerce.checkout.fallback_url).toBe(privateInquiryUrl);
      expect(offer.structured_data.offers[1].url).toBe(privateInquiryUrl);
      expect(offer.first_paid_sku).toBe("Architecture Scope Sprint");
      expect(offer.monetization_boundary.paid).toBe("Architecture Scope Sprint");
      expect(offer.structured_data.offers[1].name).toBe("Architecture Scope Sprint");
      expect(JSON.stringify(offer)).not.toContain(staleWorkspaceSku);
    }
  });
});
