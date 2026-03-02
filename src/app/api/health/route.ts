import { apiJson, resolveRequestId } from "@/lib/apiResponse";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const MIN_POLL_MS = 1200;
const MAX_POLL_MS = 30000;
const DEFAULT_POLL_MS = 5000;

export function GET(request: Request) {
  const requestId = resolveRequestId(request);
  const ws = Boolean(process.env.NEXT_PUBLIC_EVENT_WS_URL?.trim());
  const sse = Boolean(process.env.NEXT_PUBLIC_EVENT_STREAM_URL?.trim());
  const http = Boolean(process.env.NEXT_PUBLIC_EVENT_API_URL?.trim());
  const configuredCount = Number(ws) + Number(sse) + Number(http);
  const hasLiveSource = configuredCount > 0;

  const rawPollText = process.env.NEXT_PUBLIC_EVENT_POLL_MS ?? String(DEFAULT_POLL_MS);
  const pollMsRaw = Number(rawPollText);
  const parsedPollMs = Number.isFinite(pollMsRaw) ? Math.round(pollMsRaw) : DEFAULT_POLL_MS;
  const pollMsEffective = Math.max(MIN_POLL_MS, Math.min(MAX_POLL_MS, parsedPollMs));

  const warnings: string[] = [];
  if (!Number.isFinite(pollMsRaw)) {
    warnings.push("NEXT_PUBLIC_EVENT_POLL_MS is invalid. Using default 5000ms.");
  } else if (parsedPollMs !== pollMsEffective) {
    warnings.push(
      `NEXT_PUBLIC_EVENT_POLL_MS is out of range. Clamped to ${pollMsEffective}ms (${MIN_POLL_MS}-${MAX_POLL_MS}ms).`
    );
  }
  if (!hasLiveSource) {
    warnings.push("No live event source is configured. Demo mode only.");
  }

  return apiJson(
    {
      ok: true,
      request_id: requestId,
      service: "twincity-ui",
      now: new Date().toISOString(),
      mode: hasLiveSource ? "live-ready" : "demo-only",
      warnings,
      live_sources: {
        ws,
        sse,
        http,
        configured_count: configuredCount,
        poll_ms: parsedPollMs,
        poll_ms_effective: pollMsEffective,
      },
    },
    { requestId }
  );
}
