import type { EventItem, IncidentTimelineEntry } from "@/lib/types";

const ACK_SLA_MS = 2 * 60 * 1000;
const RESOLVE_SLA_MS = 10 * 60 * 1000;

export type ReportRangeKey = "30m" | "60m" | "120m" | "24h" | "all";
export type ReportSeverityFilter = "all" | "1" | "2" | "3";
export type ReportIncidentStatusFilter = "all" | "new" | "ack" | "resolved";
export type ReportFilters = {
  range: ReportRangeKey;
  severity: ReportSeverityFilter;
  incident_status: ReportIncidentStatusFilter;
  zone: string;
};

export type ControlTowerReportSummary = {
  service: string;
  status: "ok";
  generated_at: string;
  schema: "twincity-report-summary-v1";
  filters: {
    range: ReportRangeKey;
    severity: "all" | "1" | "2" | "3";
    incident_status: "all" | "new" | "ack" | "resolved";
    zone: string;
  };
  summary: {
    total_incidents: number;
    open_incidents: number;
    critical_incidents: number;
    avg_ack_ms: number;
    avg_resolve_ms: number;
    ack_sla_met: number;
    ack_sla_total: number;
    resolve_sla_met: number;
    resolve_sla_total: number;
    status_breakdown: Record<string, number>;
  };
  top_types: Array<{ type: string; count: number }>;
  top_zones: Array<{ zone_id: string; count: number }>;
  spotlight_incidents: Array<{
    id: string;
    severity: number;
    status: string;
    type: string;
    zone_id: string;
  }>;
  operator_notes: string[];
};

export type ControlTowerReportExport = {
  service: string;
  status: "ok";
  generated_at: string;
  schema: "twincity-report-export-v1";
  format: "json";
  filters: ReportFilters;
  summary: ControlTowerReportSummary["summary"];
  spotlight_incidents: ControlTowerReportSummary["spotlight_incidents"];
  top_types: ControlTowerReportSummary["top_types"];
  top_zones: ControlTowerReportSummary["top_zones"];
  operator_snapshot: {
    headline: string;
    top_zone: string | null;
    top_type: string | null;
    spotlight_id: string | null;
  };
  review_routes: string[];
  download_name: string;
};

export function buildDemoReportState() {
  const base = Date.UTC(2026, 2, 8, 3, 0, 0);
  const events: EventItem[] = [
    {
      id: "evt-seoul-01",
      store_id: "s001",
      detected_at: base - 8 * 60_000,
      ingested_at: base - 8 * 60_000 + 900,
      latency_ms: 900,
      type: "fall",
      severity: 3,
      confidence: 0.96,
      zone_id: "entrance",
      camera_id: "cam-front-01",
      source: "demo",
      model_version: "demo-v0.3",
      incident_status: "ack",
      x: 0.42,
      y: 0.18,
      note: "출입구 앞 낙상 의심",
    },
    {
      id: "evt-seoul-02",
      store_id: "s001",
      detected_at: base - 15 * 60_000,
      ingested_at: base - 15 * 60_000 + 1200,
      latency_ms: 1200,
      type: "crowd",
      severity: 2,
      confidence: 0.88,
      zone_id: "checkout",
      camera_id: "cam-cash-03",
      source: "demo",
      model_version: "demo-v0.3",
      incident_status: "resolved",
      x: 0.68,
      y: 0.52,
      note: "결제대 혼잡",
    },
    {
      id: "evt-seoul-03",
      store_id: "s001",
      detected_at: base - 41 * 60_000,
      ingested_at: base - 41 * 60_000 + 700,
      latency_ms: 700,
      type: "fight",
      severity: 3,
      confidence: 0.91,
      zone_id: "aisle-b",
      camera_id: "cam-mid-02",
      source: "demo",
      model_version: "demo-v0.3",
      incident_status: "new",
      x: 0.34,
      y: 0.61,
      note: "푸드홀 다툼 의심",
    },
    {
      id: "evt-seoul-04",
      store_id: "s001",
      detected_at: base - 82 * 60_000,
      ingested_at: base - 82 * 60_000 + 650,
      latency_ms: 650,
      type: "loitering",
      severity: 1,
      confidence: 0.79,
      zone_id: "storage",
      camera_id: "cam-back-04",
      source: "demo",
      model_version: "demo-v0.3",
      incident_status: "resolved",
      x: 0.19,
      y: 0.77,
      note: "후면 체류",
    },
  ];

  const timeline: IncidentTimelineEntry[] = [
    {
      id: "tl-01",
      event_id: "evt-seoul-01",
      zone_id: "entrance",
      action: "ack",
      actor: "ops-01",
      at: base - 8 * 60_000 + 70_000,
      from_status: "new",
      to_status: "ack",
      note: "현장 확인 지시",
    },
    {
      id: "tl-02",
      event_id: "evt-seoul-02",
      zone_id: "checkout",
      action: "ack",
      actor: "ops-02",
      at: base - 15 * 60_000 + 45_000,
      from_status: "new",
      to_status: "ack",
      note: "혼잡 대응 시작",
    },
    {
      id: "tl-03",
      event_id: "evt-seoul-02",
      zone_id: "checkout",
      action: "resolved",
      actor: "ops-02",
      at: base - 15 * 60_000 + 7 * 60_000,
      from_status: "ack",
      to_status: "resolved",
      note: "보조 계산대 투입",
    },
    {
      id: "tl-04",
      event_id: "evt-seoul-04",
      zone_id: "storage",
      action: "ack",
      actor: "ops-03",
      at: base - 82 * 60_000 + 80_000,
      from_status: "new",
      to_status: "ack",
      note: "후면 동선 확인",
    },
    {
      id: "tl-05",
      event_id: "evt-seoul-04",
      zone_id: "storage",
      action: "resolved",
      actor: "ops-03",
      at: base - 82 * 60_000 + 11 * 60_000,
      from_status: "ack",
      to_status: "resolved",
      note: "보안 점검 완료",
    },
  ];

  return {
    now: base,
    events,
    timeline,
  };
}

function rangeMs(range: ReportRangeKey) {
  if (range === "30m") return 30 * 60 * 1000;
  if (range === "60m") return 60 * 60 * 1000;
  if (range === "120m") return 120 * 60 * 1000;
  if (range === "24h") return 24 * 60 * 60 * 1000;
  return Number.POSITIVE_INFINITY;
}

function clampSeverityFilter(value: string | null): ReportSeverityFilter {
  return value === "1" || value === "2" || value === "3" ? value : "all";
}

function clampIncidentStatusFilter(
  value: string | null
): ReportIncidentStatusFilter {
  return value === "new" || value === "ack" || value === "resolved"
    ? value
    : "all";
}

function clampRangeFilter(value: string | null): ReportRangeKey {
  return value === "30m" ||
    value === "60m" ||
    value === "120m" ||
    value === "24h" ||
    value === "all"
    ? value
    : "120m";
}

export function parseReportSummaryFilters(url: URL) {
  return {
    range: clampRangeFilter(url.searchParams.get("range")),
    severity: clampSeverityFilter(url.searchParams.get("severity")),
    incident_status: clampIncidentStatusFilter(url.searchParams.get("incident_status")),
    zone: url.searchParams.get("zone")?.trim() || "all",
  };
}

function buildFilteredReportRows(filters: ReportFilters, now?: number) {
  const demo = buildDemoReportState();
  const referenceNow = now ?? demo.now;
  const since = Number.isFinite(rangeMs(filters.range))
    ? referenceNow - rangeMs(filters.range)
    : Number.NEGATIVE_INFINITY;
  const filteredEvents = demo.events.filter((event) => {
    if (event.detected_at < since) return false;
    if (filters.severity !== "all" && String(event.severity) !== filters.severity) return false;
    if (filters.incident_status !== "all" && event.incident_status !== filters.incident_status) return false;
    if (filters.zone !== "all" && event.zone_id !== filters.zone) return false;
    return true;
  });
  const ackAtByEvent = new Map<string, number>();
  const resolvedAtByEvent = new Map<string, number>();
  for (const entry of demo.timeline) {
    if (entry.to_status === "ack") {
      const prev = ackAtByEvent.get(entry.event_id) ?? 0;
      if (entry.at > prev) ackAtByEvent.set(entry.event_id, entry.at);
    }
    if (entry.to_status === "resolved") {
      const prev = resolvedAtByEvent.get(entry.event_id) ?? 0;
      if (entry.at > prev) resolvedAtByEvent.set(entry.event_id, entry.at);
    }
  }
  return { filteredEvents, ackAtByEvent, resolvedAtByEvent };
}

export function buildControlTowerReportSummary(input?: {
  events?: EventItem[];
  filters?: {
    range?: ReportRangeKey;
    severity?: ReportSeverityFilter;
    incident_status?: ReportIncidentStatusFilter;
    zone?: string;
  };
  now?: number;
  timeline?: IncidentTimelineEntry[];
}): ControlTowerReportSummary {
  const demo = buildDemoReportState();
  const now = input?.now ?? demo.now;
  const range = input?.filters?.range ?? "120m";
  const severity = input?.filters?.severity ?? "all";
  const incidentStatus = input?.filters?.incident_status ?? "all";
  const zone = input?.filters?.zone ?? "all";
  const events = input?.events ?? demo.events;
  const timeline = input?.timeline ?? demo.timeline;
  const since = Number.isFinite(rangeMs(range))
    ? now - rangeMs(range)
    : Number.NEGATIVE_INFINITY;

  const filteredEvents = events.filter((event) => {
    if (event.detected_at < since) return false;
    if (severity !== "all" && String(event.severity) !== severity) return false;
    if (incidentStatus !== "all" && event.incident_status !== incidentStatus) return false;
    if (zone !== "all" && event.zone_id !== zone) return false;
    return true;
  });

  const ackAtByEvent = new Map<string, number>();
  const resolvedAtByEvent = new Map<string, number>();
  for (const entry of timeline) {
    if (entry.to_status === "ack") {
      const prev = ackAtByEvent.get(entry.event_id) ?? 0;
      if (entry.at > prev) ackAtByEvent.set(entry.event_id, entry.at);
    }
    if (entry.to_status === "resolved") {
      const prev = resolvedAtByEvent.get(entry.event_id) ?? 0;
      if (entry.at > prev) resolvedAtByEvent.set(entry.event_id, entry.at);
    }
  }

  const ackDurations: number[] = [];
  const resolveDurations: number[] = [];
  for (const event of filteredEvents) {
    const ackAt = ackAtByEvent.get(event.id);
    if (ackAt) {
      ackDurations.push(Math.max(0, ackAt - event.detected_at));
    }
    const resolvedAt = resolvedAtByEvent.get(event.id);
    if (resolvedAt) {
      const start = ackAt ?? event.detected_at;
      resolveDurations.push(Math.max(0, resolvedAt - start));
    }
  }

  const topTypes = new Map<string, number>();
  const topZones = new Map<string, number>();
  const statusBreakdown = new Map<string, number>();
  for (const event of filteredEvents) {
    topTypes.set(event.type, (topTypes.get(event.type) ?? 0) + 1);
    topZones.set(event.zone_id, (topZones.get(event.zone_id) ?? 0) + 1);
    statusBreakdown.set(
      event.incident_status,
      (statusBreakdown.get(event.incident_status) ?? 0) + 1
    );
  }

  const spotlight = filteredEvents
    .slice()
    .sort((left, right) => {
      if (left.incident_status !== right.incident_status) {
        return left.incident_status === "resolved" ? 1 : -1;
      }
      if (right.severity !== left.severity) return right.severity - left.severity;
      return right.detected_at - left.detected_at;
    })
    .slice(0, 3)
    .map((event) => ({
      id: event.id,
      severity: event.severity,
      status: event.incident_status,
      type: event.type,
      zone_id: event.zone_id,
    }));

  const avgAckMs = ackDurations.length
    ? Math.round(ackDurations.reduce((sum, value) => sum + value, 0) / ackDurations.length)
    : 0;
  const avgResolveMs = resolveDurations.length
    ? Math.round(resolveDurations.reduce((sum, value) => sum + value, 0) / resolveDurations.length)
    : 0;

  return {
    service: "twincity-ui",
    status: "ok",
    generated_at: new Date(now).toISOString(),
    schema: "twincity-report-summary-v1",
    filters: {
      range,
      severity,
      incident_status: incidentStatus,
      zone,
    },
    summary: {
      total_incidents: filteredEvents.length,
      open_incidents: filteredEvents.filter((event) => event.incident_status !== "resolved").length,
      critical_incidents: filteredEvents.filter((event) => event.severity === 3).length,
      avg_ack_ms: avgAckMs,
      avg_resolve_ms: avgResolveMs,
      ack_sla_met: ackDurations.filter((value) => value <= ACK_SLA_MS).length,
      ack_sla_total: ackDurations.length,
      resolve_sla_met: resolveDurations.filter((value) => value <= RESOLVE_SLA_MS).length,
      resolve_sla_total: resolveDurations.length,
      status_breakdown: Object.fromEntries(statusBreakdown.entries()),
    },
    top_types: Array.from(topTypes.entries())
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
      .slice(0, 5)
      .map(([type, count]) => ({ type, count })),
    top_zones: Array.from(topZones.entries())
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
      .slice(0, 5)
      .map(([zone_id, count]) => ({ zone_id, count })),
    spotlight_incidents: spotlight,
    operator_notes: [
      "ACK SLA and resolve SLA are calculated separately to keep dispatch latency visible.",
      "incident_status filtering lets reviewers isolate unresolved queue posture before opening the full reports surface.",
      "Summary reflects deterministic demo state so reviewers can compare route output without browser storage.",
      "Use /reports for richer interactive slicing after validating this contract.",
    ],
  };
}

function toCsvValue(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function buildControlTowerReportExport(input?: {
  filters?: Partial<ReportFilters>;
  now?: number;
}): ControlTowerReportExport {
  const filters: ReportFilters = {
    range: input?.filters?.range ?? "120m",
    severity: input?.filters?.severity ?? "all",
    incident_status: input?.filters?.incident_status ?? "all",
    zone: input?.filters?.zone ?? "all",
  };
  const summary = buildControlTowerReportSummary({ filters, now: input?.now });
  return {
    service: "twincity-ui",
    status: "ok",
    generated_at: summary.generated_at,
    schema: "twincity-report-export-v1",
    format: "json",
    filters: summary.filters,
    summary: summary.summary,
    spotlight_incidents: summary.spotlight_incidents,
    top_types: summary.top_types,
    top_zones: summary.top_zones,
    operator_snapshot: {
      headline: "Deterministic control tower snapshot for reviewer export and downstream handoff.",
      top_zone: summary.top_zones[0]?.zone_id ?? null,
      top_type: summary.top_types[0]?.type ?? null,
      spotlight_id: summary.spotlight_incidents[0]?.id ?? null,
    },
    review_routes: [
      "/api/health",
      "/api/meta",
      "/api/runtime-brief",
      "/api/schema/report",
      "/api/reports/summary",
      "/api/reports/export",
      "/reports",
    ],
    download_name: `twincity-report-snapshot-${summary.generated_at.slice(0, 10)}.json`,
  };
}

export function buildControlTowerReportCsv(input?: {
  filters?: Partial<ReportFilters>;
  now?: number;
}): string {
  const filters: ReportFilters = {
    range: input?.filters?.range ?? "120m",
    severity: input?.filters?.severity ?? "all",
    incident_status: input?.filters?.incident_status ?? "all",
    zone: input?.filters?.zone ?? "all",
  };
  const { filteredEvents, ackAtByEvent, resolvedAtByEvent } = buildFilteredReportRows(filters, input?.now);
  const header = [
    "id",
    "detected_at",
    "zone_id",
    "type",
    "severity",
    "incident_status",
    "camera_id",
    "source",
    "latency_ms",
    "ack_at",
    "resolved_at",
    "note",
  ];
  const rows = filteredEvents.map((event) => [
    event.id,
    new Date(event.detected_at).toISOString(),
    event.zone_id,
    event.type,
    event.severity,
    event.incident_status,
    event.camera_id ?? "",
    event.source,
    event.latency_ms,
    ackAtByEvent.get(event.id) ? new Date(ackAtByEvent.get(event.id)!).toISOString() : "",
    resolvedAtByEvent.get(event.id) ? new Date(resolvedAtByEvent.get(event.id)!).toISOString() : "",
    event.note ?? "",
  ]);
  return [header, ...rows]
    .map((row) => row.map(toCsvValue).join(","))
    .join("\n");
}
