import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const iterations = Number.parseInt(process.env.TWINCITY_LOAD_ITERATIONS || "8", 10);
const port = Number.parseInt(process.env.TWINCITY_LOAD_PORT || "3100", 10);
const startServer = (process.env.TWINCITY_START_SERVER || "1") !== "0";
const baseUrl = process.env.TWINCITY_BASE_URL || `http://127.0.0.1:${port}`;
const token = (process.env.TWINCITY_EXPORT_OPERATOR_TOKEN || "").trim();
const role = (process.env.TWINCITY_EXPORT_OPERATOR_ROLE || "").trim();

function authHeaders() {
  if (!token) {
    return {};
  }
  return {
    "x-operator-token": token,
    ...(role ? { "x-operator-role": role } : {}),
  };
}

async function fetchJson(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, options);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`${path} failed: ${response.status} ${JSON.stringify(body)}`);
  }
  return body;
}

async function waitForHealth() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) {
        return;
      }
    } catch {
      // Ignore until the server is ready.
    }
    await delay(1000);
  }
  throw new Error("twincity-ui server did not become ready");
}

async function runLoad() {
  for (let index = 0; index < Math.max(1, iterations); index += 1) {
    await fetchJson("/api/reports/summary?range=24h");
    await fetchJson("/api/reports/dispatch-board?range=24h");
  }

  const scorecard = await fetchJson("/api/runtime-scorecard");
  const summary = await fetchJson("/api/reports/summary?range=24h");
  const dispatch = await fetchJson("/api/reports/dispatch-board?range=24h");
  const exportPayload = await fetchJson("/api/reports/export?format=json", {
    headers: authHeaders(),
  });

  process.stdout.write(
    JSON.stringify(
      {
        ok: true,
        service: scorecard.service,
        runtime: scorecard.runtime,
        total_incidents: summary.summary?.total_incidents ?? null,
        dispatch_attention: dispatch.summary?.attention_lane ?? null,
        export_download_name: exportPayload.download_name ?? null,
      },
      null,
      2
    )
  );
}

let child = null;

try {
  if (startServer) {
    child = spawn(
      "npm",
      ["run", "start", "--", "--hostname", "127.0.0.1", "--port", String(port)],
      {
        cwd: new URL("..", import.meta.url),
        stdio: "inherit",
        env: { ...process.env, PORT: String(port) },
      }
    );
    await waitForHealth();
  }

  await runLoad();
} finally {
  if (child) {
    child.kill("SIGTERM");
    await delay(1000);
  }
}
