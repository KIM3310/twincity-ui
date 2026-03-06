type RuntimeMeta = {
  service: string;
  generated_at: string;
  live_sources: {
    ws: boolean;
    sse: boolean;
    http: boolean;
    poll_ms: number;
  };
  diagnostics: {
    ingest_mode: "ws" | "sse" | "http" | "demo";
    live_source_count: number;
    next_action: string;
  };
  features: string[];
  routes: string[];
};

export function buildRuntimeMeta(now = new Date()): RuntimeMeta {
  const pollMsRaw = Number(process.env.NEXT_PUBLIC_EVENT_POLL_MS ?? "5000");
  const pollMs = Number.isFinite(pollMsRaw) ? pollMsRaw : 5000;
  const liveSources = {
    ws: Boolean(process.env.NEXT_PUBLIC_EVENT_WS_URL?.trim()),
    sse: Boolean(process.env.NEXT_PUBLIC_EVENT_STREAM_URL?.trim()),
    http: Boolean(process.env.NEXT_PUBLIC_EVENT_API_URL?.trim()),
    poll_ms: pollMs,
  };
  const liveSourceCount = [liveSources.ws, liveSources.sse, liveSources.http].filter(Boolean).length;
  const ingestMode = liveSources.ws ? "ws" : liveSources.sse ? "sse" : liveSources.http ? "http" : "demo";

  return {
    service: "twincity-ui",
    generated_at: now.toISOString(),
    live_sources: liveSources,
    diagnostics: {
      ingest_mode: ingestMode,
      live_source_count: liveSourceCount,
      next_action:
        liveSourceCount > 0
          ? "Drive the configured event transport and confirm /api/3d-test/status stays green."
          : "Configure NEXT_PUBLIC_EVENT_WS_URL, NEXT_PUBLIC_EVENT_STREAM_URL, or NEXT_PUBLIC_EVENT_API_URL.",
    },
    features: [
      "digital-twin-floor-map",
      "normalized-event-feed",
      "3d-asset-probe",
      "ops-engagement-hub",
    ],
    routes: ["/api/health", "/api/meta", "/api/3d-test/status", "/api/3d-test/model"],
  };
}
