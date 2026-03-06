type RuntimeMeta = {
  service: string;
  generated_at: string;
  live_sources: {
    ws: boolean;
    sse: boolean;
    http: boolean;
    poll_ms: number;
  };
  features: string[];
  routes: string[];
};

export function buildRuntimeMeta(now = new Date()): RuntimeMeta {
  const pollMsRaw = Number(process.env.NEXT_PUBLIC_EVENT_POLL_MS ?? "5000");
  const pollMs = Number.isFinite(pollMsRaw) ? pollMsRaw : 5000;

  return {
    service: "twincity-ui",
    generated_at: now.toISOString(),
    live_sources: {
      ws: Boolean(process.env.NEXT_PUBLIC_EVENT_WS_URL?.trim()),
      sse: Boolean(process.env.NEXT_PUBLIC_EVENT_STREAM_URL?.trim()),
      http: Boolean(process.env.NEXT_PUBLIC_EVENT_API_URL?.trim()),
      poll_ms: pollMs,
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
