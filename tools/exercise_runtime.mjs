const baseUrl = process.env.TWINCITY_BASE_URL || "http://127.0.0.1:3000";
const token = (process.env.TWINCITY_EXPORT_OPERATOR_TOKEN || "").trim();
const role = (process.env.TWINCITY_EXPORT_OPERATOR_ROLE || "").trim();

async function fetchJson(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, options);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`${path} failed: ${response.status} ${JSON.stringify(body)}`);
  }
  return body;
}

const authHeaders = token
  ? {
      "x-operator-token": token,
      ...(role ? { "x-operator-role": role } : {}),
    }
  : {};
const health = await fetchJson("/api/health");
const scorecard = await fetchJson("/api/runtime-scorecard");
const summary = await fetchJson("/api/reports/summary");
const exportPayload = await fetchJson("/api/reports/export?format=json", {
  headers: authHeaders,
});

process.stdout.write(
  JSON.stringify(
    {
      ok: true,
      service: health.service,
      ingest_mode: health.diagnostics?.ingest_mode ?? null,
      export_auth: scorecard.runtime?.operator_auth ?? null,
      total_incidents: summary.summary?.total_incidents ?? null,
      export_download_name: exportPayload.download_name ?? null,
    },
    null,
    2
  )
);
