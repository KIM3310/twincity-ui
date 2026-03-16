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

export type DispatchBoardLane = "all" | "attention" | "dispatch" | "resolved";

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

export type ControlTowerDispatchBoard = {
  service: string;
  status: "ok";
  generated_at: string;
  schema: "twincity-dispatch-board-v1";
  filters: ReportFilters & { lane: DispatchBoardLane };
  summary: {
    visible_incidents: number;
    attention_count: number;
    dispatch_count: number;
    resolved_count: number;
    critical_visible_count: number;
  };
  spotlight: {
    id: string;
    lane: DispatchBoardLane;
    severity: number;
    zone_id: string;
    incident_status: string;
  } | null;
  items: Array<{
    id: string;
    lane: DispatchBoardLane;
    severity: number;
    type: string;
    zone_id: string;
    incident_status: string;
    latest_action: string;
    next_action: string;
    ack_at: string | null;
    resolved_at: string | null;
    ack_sla_state: "met" | "missed" | "pending";
    resolve_sla_state: "met" | "missed" | "pending";
    note: string | null;
  }>;
  review_actions: string[];
  route_bundle: {
    dispatch_board: string;
    report_summary: string;
    report_export: string;
    reports: string;
  };
};

export type ControlTowerHandoffBrief = {
  service: string;
  status: "ok";
  generated_at: string;
  schema: "twincity-handoff-brief-v1";
  filters: ReportFilters;
  summary: {
    visible_incidents: number;
    open_incidents: number;
    critical_incidents: number;
    attention_count: number;
    dispatch_count: number;
    resolved_count: number;
    ack_overdue_count: number;
    resolve_overdue_count: number;
  };
  handoff: {
    headline: string;
    focus_lane: "attention" | "dispatch" | "resolved" | "clear";
    suggested_owner: "dispatch-lead" | "floor-ops" | "review-only";
    top_zone: string | null;
    top_type: string | null;
  };
  priorities: Array<{
    id: string;
    lane: DispatchBoardLane;
    severity: number;
    type: string;
    zone_id: string;
    incident_status: string;
    latest_action: string;
    next_action: string;
    ack_sla_state: "met" | "missed" | "pending";
    resolve_sla_state: "met" | "missed" | "pending";
    minutes_open: number;
    note: string | null;
  }>;
  operator_notes: string[];
  route_bundle: {
    report_summary: string;
    dispatch_board: string;
    report_handoff: string;
    report_export: string;
    reports: string;
  };
};

export type ControlTowerAssignmentHistory = {
  service: string;
  status: "ok";
  generated_at: string;
  schema: "twincity-assignment-history-v1";
  filters: ReportFilters;
  summary: {
    visible_incidents: number;
    assigned_count: number;
    unassigned_count: number;
    resolved_assignments: number;
    total_handoffs: number;
  };
  items: Array<{
    id: string;
    severity: number;
    type: string;
    zone_id: string;
    incident_status: string;
    current_owner: string;
    handoff_count: number;
    latest_action: string;
    next_action: string;
    history: Array<{
      at: string;
      actor: string;
      action: string;
      to_owner: string;
      note: string | null;
    }>;
  }>;
  review_actions: string[];
  route_bundle: {
    assignment_history: string;
    dispatch_board: string;
    report_handoff: string;
    reports: string;
  };
};

type TimelineIndexes = {
  ackAtByEvent: Map<string, number>;
  resolvedAtByEvent: Map<string, number>;
  latestTimelineByEvent: Map<string, IncidentTimelineEntry>;
};

type DispatchBoardRow = ControlTowerDispatchBoard["items"][number] & {
  detected_at: number;
};

function buildTimelineIndexes(timeline: IncidentTimelineEntry[]): TimelineIndexes {
  const ackAtByEvent = new Map<string, number>();
  const resolvedAtByEvent = new Map<string, number>();
  const latestTimelineByEvent = new Map<string, IncidentTimelineEntry>();

  for (const entry of timeline) {
    const latest = latestTimelineByEvent.get(entry.event_id);
    if (!latest || entry.at > latest.at) {
      latestTimelineByEvent.set(entry.event_id, entry);
    }

    if (entry.to_status === "ack") {
      const prev = ackAtByEvent.get(entry.event_id) ?? 0;
      if (entry.at > prev) ackAtByEvent.set(entry.event_id, entry.at);
    }

    if (entry.to_status === "resolved") {
      const prev = resolvedAtByEvent.get(entry.event_id) ?? 0;
      if (entry.at > prev) resolvedAtByEvent.set(entry.event_id, entry.at);
    }
  }

  return {
    ackAtByEvent,
    resolvedAtByEvent,
    latestTimelineByEvent,
  };
}

function deriveCompletionSlaState(input: {
  startedAt?: number;
  completedAt?: number;
  now: number;
  thresholdMs: number;
}): "met" | "missed" | "pending" {
  if (input.startedAt === undefined) return "pending";
  if (input.completedAt !== undefined) {
    return input.completedAt - input.startedAt <= input.thresholdMs ? "met" : "missed";
  }
  return input.now - input.startedAt > input.thresholdMs ? "missed" : "pending";
}

function deriveAckSlaState(
  eventDetectedAt: number,
  ackAt: number | undefined,
  now: number
) {
  return deriveCompletionSlaState({
    startedAt: eventDetectedAt,
    completedAt: ackAt,
    now,
    thresholdMs: ACK_SLA_MS,
  });
}

function deriveResolveSlaState(
  ackAt: number | undefined,
  resolvedAt: number | undefined,
  now: number
) {
  return deriveCompletionSlaState({
    startedAt: ackAt,
    completedAt: resolvedAt,
    now,
    thresholdMs: RESOLVE_SLA_MS,
  });
}

export function deriveDispatchNextAction(input: {
  lane: DispatchBoardLane;
  severity: number;
  ackSlaState: "met" | "missed" | "pending";
  resolveSlaState: "met" | "missed" | "pending";
}): string {
  if (input.lane === "attention") {
    if (input.ackSlaState === "missed") {
      return "Acknowledge immediately and dispatch the closest operator before the queue drifts further.";
    }
    if (input.severity >= 3) {
      return "Acknowledge now and confirm a dispatch owner for the critical incident.";
    }
    return "Acknowledge and assign an operator before the ACK SLA expires.";
  }

  if (input.lane === "dispatch") {
    if (input.resolveSlaState === "missed") {
      return "Escalate the active dispatch, record the blocker, and recover the lane before export.";
    }
    return "Confirm operator ETA, record the blocker note, and resolve once the lane is stable.";
  }

  return "Capture the resolution note and keep the export snapshot aligned with the final timeline.";
}

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

function clampDispatchBoardLane(value: string | null): DispatchBoardLane {
  return value === "attention" || value === "dispatch" || value === "resolved"
    ? value
    : "all";
}

export function parseReportSummaryFilters(url: URL) {
  return {
    range: clampRangeFilter(url.searchParams.get("range")),
    severity: clampSeverityFilter(url.searchParams.get("severity")),
    incident_status: clampIncidentStatusFilter(url.searchParams.get("incident_status")),
    zone: url.searchParams.get("zone")?.trim() || "all",
  };
}

export function parseDispatchBoardFilters(url: URL) {
  return {
    ...parseReportSummaryFilters(url),
    lane: clampDispatchBoardLane(url.searchParams.get("lane")),
  };
}

function buildFilteredReportRows(filters: ReportFilters, now?: number) {
  const demo = buildDemoReportState();
  return buildFilteredReportRowsFromState({
    filters,
    now,
    events: demo.events,
    timeline: demo.timeline,
  });
}

function buildFilteredReportRowsFromState(input: {
  filters: ReportFilters;
  now?: number;
  events: EventItem[];
  timeline: IncidentTimelineEntry[];
}) {
  const { filters, events, timeline } = input;
  const referenceNow = input.now ?? buildDemoReportState().now;
  const since = Number.isFinite(rangeMs(filters.range))
    ? referenceNow - rangeMs(filters.range)
    : Number.NEGATIVE_INFINITY;
  const filteredEvents = events.filter((event) => {
    if (event.detected_at < since) return false;
    if (filters.severity !== "all" && String(event.severity) !== filters.severity) return false;
    if (filters.incident_status !== "all" && event.incident_status !== filters.incident_status) return false;
    if (filters.zone !== "all" && event.zone_id !== filters.zone) return false;
    return true;
  });
  const indexes = buildTimelineIndexes(timeline);
  return { filteredEvents, ...indexes, now: referenceNow };
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
  const { filteredEvents, ackAtByEvent, resolvedAtByEvent } =
    buildFilteredReportRowsFromState({
      filters: {
        range,
        severity,
        incident_status: incidentStatus,
        zone,
      },
      now,
      events,
      timeline,
    });

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
  const { filteredEvents, ackAtByEvent, resolvedAtByEvent } = buildFilteredReportRows(
    filters,
    input?.now
  );
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

function buildDispatchBoardRows(input: {
  filters: ReportFilters;
  lane: DispatchBoardLane;
  now: number;
  events: EventItem[];
  timeline: IncidentTimelineEntry[];
}): DispatchBoardRow[] {
  const { filteredEvents, ackAtByEvent, resolvedAtByEvent, latestTimelineByEvent } =
    buildFilteredReportRowsFromState({
      filters: input.filters,
      now: input.now,
      events: input.events,
      timeline: input.timeline,
    });

  return filteredEvents
    .map((event) => {
      const latestTimeline = latestTimelineByEvent.get(event.id);
      const ackAt = ackAtByEvent.get(event.id);
      const resolvedAt = resolvedAtByEvent.get(event.id);
      const derivedLane: DispatchBoardLane =
        event.incident_status === "resolved"
          ? "resolved"
          : event.incident_status === "ack"
            ? "dispatch"
            : "attention";
      const ackSlaState = deriveAckSlaState(event.detected_at, ackAt, input.now);
      const resolveSlaState = deriveResolveSlaState(ackAt, resolvedAt, input.now);
      return {
        id: event.id,
        lane: derivedLane,
        severity: event.severity,
        type: event.type,
        zone_id: event.zone_id,
        incident_status: event.incident_status,
        latest_action: latestTimeline?.action ?? "detected",
        next_action: deriveDispatchNextAction({
          lane: derivedLane,
          severity: event.severity,
          ackSlaState,
          resolveSlaState,
        }),
        ack_at: ackAt ? new Date(ackAt).toISOString() : null,
        resolved_at: resolvedAt ? new Date(resolvedAt).toISOString() : null,
        ack_sla_state: ackSlaState,
        resolve_sla_state: resolveSlaState,
        note: event.note ?? null,
        detected_at: event.detected_at,
      };
    })
    .filter((row) => input.lane === "all" || row.lane === input.lane)
    .sort((left, right) => {
      if (left.lane !== right.lane) {
        const rank: Record<DispatchBoardLane, number> = {
          all: 99,
          attention: 0,
          dispatch: 1,
          resolved: 2,
        };
        return rank[left.lane] - rank[right.lane];
      }
      if (right.severity !== left.severity) return right.severity - left.severity;
      return right.detected_at - left.detected_at;
    });
}

export function buildControlTowerDispatchBoard(input?: {
  filters?: Partial<ReportFilters> & { lane?: DispatchBoardLane };
  now?: number;
}): ControlTowerDispatchBoard {
  const filters: ReportFilters = {
    range: input?.filters?.range ?? "120m",
    severity: input?.filters?.severity ?? "all",
    incident_status: input?.filters?.incident_status ?? "all",
    zone: input?.filters?.zone ?? "all",
  };
  const lane = input?.filters?.lane ?? "all";
  const demo = buildDemoReportState();
  const now = input?.now ?? demo.now;
  const rows = buildDispatchBoardRows({
    filters,
    lane,
    now,
    events: demo.events,
    timeline: demo.timeline,
  });

  const items = rows.map(({ detected_at: _detectedAt, ...row }) => row);
  const spotlight = items[0]
    ? {
        id: items[0].id,
        lane: items[0].lane,
        severity: items[0].severity,
        zone_id: items[0].zone_id,
        incident_status: items[0].incident_status,
      }
    : null;

  return {
    service: "twincity-ui",
    status: "ok",
    generated_at: new Date(now).toISOString(),
    schema: "twincity-dispatch-board-v1",
    filters: {
      ...filters,
      lane,
    },
    summary: {
      visible_incidents: items.length,
      attention_count: items.filter((item) => item.lane === "attention").length,
      dispatch_count: items.filter((item) => item.lane === "dispatch").length,
      resolved_count: items.filter((item) => item.lane === "resolved").length,
      critical_visible_count: items.filter((item) => item.severity === 3).length,
    },
    spotlight,
    items,
    review_actions: [
      "Start with attention incidents before reviewing dispatched or resolved rows.",
      "Keep report summary and dispatch board filters aligned during reviewer walkthroughs.",
      "Validate export payloads only after the dispatch board matches the expected operator queue.",
    ],
    route_bundle: {
      dispatch_board: "/api/reports/dispatch-board",
      report_summary: "/api/reports/summary",
      report_export: "/api/reports/export",
      reports: "/reports",
    },
  };
}

export function buildControlTowerAssignmentHistory(input?: {
  events?: EventItem[];
  filters?: Partial<ReportFilters>;
  now?: number;
  timeline?: IncidentTimelineEntry[];
}): ControlTowerAssignmentHistory {
  const demo = buildDemoReportState();
  const now = input?.now ?? demo.now;
  const filters: ReportFilters = {
    range: input?.filters?.range ?? "120m",
    severity: input?.filters?.severity ?? "all",
    incident_status: input?.filters?.incident_status ?? "all",
    zone: input?.filters?.zone ?? "all",
  };
  const events = input?.events ?? demo.events;
  const timeline = input?.timeline ?? demo.timeline;
  const { filteredEvents, ackAtByEvent, resolvedAtByEvent, latestTimelineByEvent } =
    buildFilteredReportRowsFromState({
      filters,
      now,
      events,
      timeline,
    });

  const items = filteredEvents
    .map((event) => {
      const seedOwner = event.severity >= 3 ? "dispatch-lead" : "floor-ops";
      const eventTimeline = timeline
        .filter((entry) => entry.event_id === event.id)
        .sort((left, right) => left.at - right.at);
      const history = [
        {
          at: new Date(event.detected_at).toISOString(),
          actor: "dispatch-router",
          action: "queued",
          to_owner: seedOwner,
          note: `${event.zone_id} incident entered the ${seedOwner} queue.`,
        },
        ...eventTimeline.map((entry) => ({
          at: new Date(entry.at).toISOString(),
          actor: entry.actor,
          action: entry.action === "ack" ? "assigned" : entry.action,
          to_owner: entry.actor,
          note: entry.note ?? null,
        })),
      ];
      const latestTimeline = latestTimelineByEvent.get(event.id);
      const acked = ackAtByEvent.has(event.id);
      const resolved = resolvedAtByEvent.has(event.id);
      const handoffCount = Math.max(0, history.length - 1);
      const currentOwner =
        event.incident_status === "resolved"
          ? history[history.length - 1]?.to_owner ?? seedOwner
          : acked
            ? history[history.length - 1]?.to_owner ?? seedOwner
            : seedOwner;

      return {
        id: event.id,
        severity: event.severity,
        type: event.type,
        zone_id: event.zone_id,
        incident_status: event.incident_status,
        current_owner: currentOwner,
        handoff_count: handoffCount,
        latest_action: latestTimeline?.action ?? "queued",
        next_action:
          event.incident_status === "resolved"
            ? "Capture the final handoff note and keep the reviewer export aligned with the closed timeline."
            : acked
              ? "Keep the blocker and ETA updated so the next shift inherits a clean operator handoff."
              : "Assign the incident to an operator before the queue drifts beyond the ACK SLA.",
        history,
        sort_detected_at: event.detected_at,
        sort_ack_priority: acked ? 1 : 0,
        sort_resolved_priority: resolved ? 1 : 0,
      };
    })
    .sort((left, right) => {
      if (left.sort_ack_priority !== right.sort_ack_priority) {
        return left.sort_ack_priority - right.sort_ack_priority;
      }
      if (right.severity !== left.severity) return right.severity - left.severity;
      if (left.sort_resolved_priority !== right.sort_resolved_priority) {
        return left.sort_resolved_priority - right.sort_resolved_priority;
      }
      return right.sort_detected_at - left.sort_detected_at;
    })
    .map(
      ({
        sort_detected_at: _sortDetectedAt,
        sort_ack_priority: _sortAckPriority,
        sort_resolved_priority: _sortResolvedPriority,
        ...item
      }) => item
    );

  return {
    service: "twincity-ui",
    status: "ok",
    generated_at: new Date(now).toISOString(),
    schema: "twincity-assignment-history-v1",
    filters,
    summary: {
      visible_incidents: items.length,
      assigned_count: items.filter((item) => item.history.length > 1).length,
      unassigned_count: items.filter((item) => item.history.length === 1).length,
      resolved_assignments: items.filter((item) => item.incident_status === "resolved").length,
      total_handoffs: items.reduce((sum, item) => sum + item.handoff_count, 0),
    },
    items,
    review_actions: [
      "Start with incidents that still have only the queue owner before walking the active handoff chain.",
      "Keep assignment history aligned with dispatch board filters during operator walkthroughs.",
      "Review the handoff brief before exporting anything to the next shift.",
    ],
    route_bundle: {
      assignment_history: "/api/reports/assignment-history",
      dispatch_board: "/api/reports/dispatch-board",
      report_handoff: "/api/reports/handoff",
      reports: "/reports",
    },
  };
}

export function buildControlTowerHandoffBrief(input?: {
  events?: EventItem[];
  filters?: Partial<ReportFilters>;
  now?: number;
  timeline?: IncidentTimelineEntry[];
}): ControlTowerHandoffBrief {
  const demo = buildDemoReportState();
  const now = input?.now ?? demo.now;
  const filters: ReportFilters = {
    range: input?.filters?.range ?? "120m",
    severity: input?.filters?.severity ?? "all",
    incident_status: input?.filters?.incident_status ?? "all",
    zone: input?.filters?.zone ?? "all",
  };
  const events = input?.events ?? demo.events;
  const timeline = input?.timeline ?? demo.timeline;
  const rows = buildDispatchBoardRows({
    filters,
    lane: "all",
    now,
    events,
    timeline,
  });
  const priorities = rows.slice(0, 3).map((row) => ({
    id: row.id,
    lane: row.lane,
    severity: row.severity,
    type: row.type,
    zone_id: row.zone_id,
    incident_status: row.incident_status,
    latest_action: row.latest_action,
    next_action: row.next_action,
    ack_sla_state: row.ack_sla_state,
    resolve_sla_state: row.resolve_sla_state,
    minutes_open: Math.max(0, Math.round((now - row.detected_at) / 60_000)),
    note: row.note,
  }));

  const attentionCount = rows.filter((row) => row.lane === "attention").length;
  const dispatchCount = rows.filter((row) => row.lane === "dispatch").length;
  const resolvedCount = rows.filter((row) => row.lane === "resolved").length;
  const ackOverdueCount = rows.filter((row) => row.ack_sla_state === "missed").length;
  const resolveOverdueCount = rows.filter((row) => row.resolve_sla_state === "missed").length;
  const focusLane =
    attentionCount > 0
      ? "attention"
      : dispatchCount > 0
        ? "dispatch"
        : resolvedCount > 0
          ? "resolved"
          : "clear";

  return {
    service: "twincity-ui",
    status: "ok",
    generated_at: new Date(now).toISOString(),
    schema: "twincity-handoff-brief-v1",
    filters,
    summary: {
      visible_incidents: rows.length,
      open_incidents: rows.filter((row) => row.incident_status !== "resolved").length,
      critical_incidents: rows.filter((row) => row.severity === 3).length,
      attention_count: attentionCount,
      dispatch_count: dispatchCount,
      resolved_count: resolvedCount,
      ack_overdue_count: ackOverdueCount,
      resolve_overdue_count: resolveOverdueCount,
    },
    handoff: {
      headline:
        ackOverdueCount > 0
          ? `${ackOverdueCount} incident is past ACK SLA. Start the handoff with the attention lane.`
          : dispatchCount > 0
            ? `${dispatchCount} active dispatch incident needs a clean blocker/ETA handoff.`
            : rows.length > 0
              ? "Queue is stable enough for a reviewer-safe handoff summary."
              : "No visible incidents match the current handoff filter.",
      focus_lane: focusLane,
      suggested_owner:
        focusLane === "attention"
          ? "dispatch-lead"
          : focusLane === "dispatch"
            ? "floor-ops"
            : "review-only",
      top_zone: priorities[0]?.zone_id ?? null,
      top_type: priorities[0]?.type ?? null,
    },
    priorities,
    operator_notes: [
      "Pending ACKs that are already beyond the SLA are surfaced as missed to make shift risk explicit.",
      "Resolve SLA starts only after ACK so attention-lane incidents do not inflate resolve risk prematurely.",
      "Use the handoff brief before export so the next operator sees the same deterministic queue posture.",
    ],
    route_bundle: {
      report_summary: "/api/reports/summary",
      dispatch_board: "/api/reports/dispatch-board",
      report_handoff: "/api/reports/handoff",
      report_export: "/api/reports/export",
      reports: "/reports",
    },
  };
}
