# Search Growth Implementation - TwinCity UI

This repository now exposes a search-readable service surface in addition to the system architecture. The implementation is designed to support organic discovery, AI answer surfaces, and a free-to-paid service path without committing to paid infrastructure first.

## Implemented Surface

| Surface | Path |
| --- | --- |
| Machine-readable offer | [docs/service-offer.json](./service-offer.json) |
| Revenue architecture | [docs/revenue-architecture.md](./revenue-architecture.md) |
| System architecture | [docs/system-architecture.md](./system-architecture.md) |
| Public canonical URL | https://twincity-ui.pages.dev/ |
| Lead capture URL | https://github.com/KIM3310/twincity-ui/issues/new?template=service-inquiry.yml&title=Private+workspace+inquiry%3A+TwinCity+UI |

## Search Positioning

- Primary query: TwinCity UI digital twin operations
- Secondary queries: TwinCity UI demo; TwinCity UI system architecture; TwinCity UI business tool; digital twin operations console with replay, dispatch, readiness, and report surfaces service
- Public entry point: public demo with synthetic city/facility events
- Paid boundary: paid workspace for private maps, event ingestion, and monthly readiness reports

## Conversion Boundary

The public surface stays crawlable and free. Paid value starts when a visitor wants private data, saved history, branded export packs, customer-specific connectors, recurring reports, or implementation support.

## Deployment Notes

- Keep the sitemap and robots file aligned with the final production domain.
- Submit the canonical URL and sitemap in Google Search Console after the domain is connected.
- The lead-capture path is a GitHub Issue Form so private workspace and paid-package requests create a trackable queue before payment infrastructure is added.
- Keep exact free-tier quotas out of public promises because provider limits change.
