"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import ControlTowerReadiness from "@/components/site/ControlTowerReadiness";
import { normalizeEventFeed } from "@/lib/eventAdapter";
import { getEventTypeLabel, getZoneLabel } from "@/lib/labels";
import { deriveDispatchNextAction } from "@/lib/reportSummary";
import {
  buildControlTowerReportSchema,
  buildControlTowerRuntimeBrief,
  buildControlTowerServiceMeta,
} from "@/lib/serviceMeta";
import {
  buildAbsoluteShareUrl,
  buildReportsUrlSearch,
  parseReportsUrlState,
  replaceUrlSearch,
  type TwincityRangeKey,
  type TwincitySeverityFilter,
} from "@/lib/urlState";
import type { EventItem, IncidentTimelineEntry } from "@/lib/types";

const STORAGE_KEY = "twincity-ops-experience-v2";
const ACK_SLA_MS = 2 * 60 * 1000;
const RESOLVE_SLA_MS = 10 * 60 * 1000;

type RangeKey = TwincityRangeKey;

function deriveDispatchLane(status: EventItem["incident_status"]) {
  if (status === "resolved") return "resolved";
  if (status === "ack") return "dispatch";
  return "attention";
}

function rangeLabel(range: RangeKey) {
  if (range === "30m") return "최근 30분";
  if (range === "60m") return "최근 60분";
  if (range === "120m") return "최근 120분";
  if (range === "24h") return "최근 24시간";
  return "전체";
}

function rangeMs(range: RangeKey) {
  if (range === "30m") return 30 * 60 * 1000;
  if (range === "60m") return 60 * 60 * 1000;
  if (range === "120m") return 120 * 60 * 1000;
  if (range === "24h") return 24 * 60 * 60 * 1000;
  return Number.POSITIVE_INFINITY;
}

function parseTimeline(raw: unknown): IncidentTimelineEntry[] {
  if (!Array.isArray(raw)) return [];
  const rows: IncidentTimelineEntry[] = [];

  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const row = entry as Record<string, unknown>;
    const action = row.action;
    if (action !== "detected" && action !== "ack" && action !== "dispatch" && action !== "resolved") continue;

    const id = typeof row.id === "string" ? row.id : null;
    const eventId = typeof row.event_id === "string" ? row.event_id : null;
    const zoneId = typeof row.zone_id === "string" ? row.zone_id : null;
    const actor = typeof row.actor === "string" ? row.actor : null;
    const at = typeof row.at === "number" && Number.isFinite(row.at) ? row.at : null;
    if (!id || !eventId || !zoneId || !actor || at === null) continue;

    const fromStatus = row.from_status;
    const toStatus = row.to_status;
    const safeFromStatus =
      fromStatus === "new" || fromStatus === "ack" || fromStatus === "resolved" ? fromStatus : undefined;
    const safeToStatus = toStatus === "new" || toStatus === "ack" || toStatus === "resolved" ? toStatus : undefined;

    rows.push({
      id,
      event_id: eventId,
      zone_id: zoneId,
      action,
      actor,
      at,
      from_status: safeFromStatus,
      to_status: safeToStatus,
      note: typeof row.note === "string" ? row.note : undefined,
    });
  }

  return rows.sort((a, b) => b.at - a.at);
}

function toCsvValue(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

async function copyTextValue(text: string) {
  if (typeof navigator === "undefined" || !text) return false;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fallback below.
  }

  try {
    const temp = document.createElement("textarea");
    temp.value = text;
    temp.style.position = "fixed";
    temp.style.opacity = "0";
    document.body.appendChild(temp);
    temp.focus();
    temp.select();
    const success = document.execCommand("copy");
    document.body.removeChild(temp);
    return Boolean(success);
  } catch {
    return false;
  }
}

export default function ReportsPage() {
  const initialUrlState =
    typeof window === "undefined"
      ? null
      : parseReportsUrlState(window.location.search);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [timeline, setTimeline] = useState<IncidentTimelineEntry[]>([]);
  const [range, setRange] = useState<RangeKey>(() => initialUrlState?.range ?? "120m");
  const [severityFilter, setSeverityFilter] = useState<TwincitySeverityFilter>(
    () => initialUrlState?.severityFilter ?? "all"
  );
  const [zoneFilter, setZoneFilter] = useState(() => initialUrlState?.zoneFilter ?? "all");
  const [queryHydrated] = useState(() => typeof window !== "undefined");
  const [notice, setNotice] = useState<string | null>(null);
  const [now, setNow] = useState<number>(() => Date.now());
  const runtimeBrief = useMemo(() => buildControlTowerRuntimeBrief(), []);
  const serviceMeta = useMemo(() => buildControlTowerServiceMeta(), []);
  const reportSchema = useMemo(() => buildControlTowerReportSchema(), []);

  const load = useCallback(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        setEvents([]);
        setTimeline([]);
        return;
      }

      const parsed = JSON.parse(raw) as { events?: unknown; timeline?: unknown; maxEvents?: number };
      const maxEvents = typeof parsed.maxEvents === "number" ? Math.max(80, Math.min(4000, parsed.maxEvents)) : 220;
      setEvents(
        normalizeEventFeed(parsed.events, {
          maxEvents,
          fallbackStoreId: "s001",
          defaultSource: "demo",
        })
      );
      setTimeline(parseTimeline(parsed.timeline));
    } catch {
      setEvents([]);
      setTimeline([]);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 5000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 2400);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (!queryHydrated) return;
    replaceUrlSearch(
      buildReportsUrlSearch({
        range,
        severityFilter,
        zoneFilter,
      })
    );
  }, [queryHydrated, range, severityFilter, zoneFilter]);

  const since = useMemo(() => {
    const ms = rangeMs(range);
    return Number.isFinite(ms) ? now - ms : Number.NEGATIVE_INFINITY;
  }, [now, range]);

  const inRangeEvents = useMemo(
    () => events.filter((event) => event.detected_at >= since),
    [events, since]
  );

  const availableZones = useMemo(
    () => Array.from(new Set(inRangeEvents.map((event) => event.zone_id))).sort(),
    [inRangeEvents]
  );

  const focusedEvents = useMemo(
    () =>
      inRangeEvents.filter((event) => {
        if (severityFilter !== "all" && String(event.severity) !== severityFilter) return false;
        if (zoneFilter !== "all" && event.zone_id !== zoneFilter) return false;
        return true;
      }),
    [inRangeEvents, severityFilter, zoneFilter]
  );

  const filterSummary = useMemo(() => {
    const parts = [
      rangeLabel(range),
      severityFilter === "all" ? "전체 severity" : `S${severityFilter}`,
      zoneFilter === "all" ? "전체 zone" : getZoneLabel(zoneFilter),
    ];
    return parts.join(" · ");
  }, [range, severityFilter, zoneFilter]);
  const activeFilterChips = [
    rangeLabel(range),
    severityFilter === "all" ? "전체 severity" : `S${severityFilter}`,
    zoneFilter === "all" ? "전체 zone" : getZoneLabel(zoneFilter),
  ];

  const ackAtByEvent = useMemo(() => {
    const index = new Map<string, number>();
    timeline.forEach((entry) => {
      if (entry.to_status !== "ack") return;
      const prev = index.get(entry.event_id) ?? 0;
      if (entry.at > prev) index.set(entry.event_id, entry.at);
    });
    return index;
  }, [timeline]);

  const resolvedAtByEvent = useMemo(() => {
    const index = new Map<string, number>();
    timeline.forEach((entry) => {
      if (entry.to_status !== "resolved") return;
      const prev = index.get(entry.event_id) ?? 0;
      if (entry.at > prev) index.set(entry.event_id, entry.at);
    });
    return index;
  }, [timeline]);

  const latestTimelineByEvent = useMemo(() => {
    const index = new Map<string, IncidentTimelineEntry>();
    timeline.forEach((entry) => {
      const prev = index.get(entry.event_id);
      if (!prev || entry.at > prev.at) index.set(entry.event_id, entry);
    });
    return index;
  }, [timeline]);

  const spotlightEvents = useMemo(
    () =>
      focusedEvents
        .slice()
        .sort((a, b) => {
          if (a.incident_status !== b.incident_status) {
            return a.incident_status === "resolved" ? 1 : -1;
          }
          if (b.severity !== a.severity) return b.severity - a.severity;
          const aTimelineAt = latestTimelineByEvent.get(a.id)?.at ?? a.detected_at;
          const bTimelineAt = latestTimelineByEvent.get(b.id)?.at ?? b.detected_at;
          return bTimelineAt - aTimelineAt;
        })
        .slice(0, 3),
    [focusedEvents, latestTimelineByEvent]
  );

  const dispatchBoardRows = useMemo(
    () =>
      focusedEvents
        .slice()
        .sort((a, b) => {
          const laneRank = {
            attention: 0,
            dispatch: 1,
            resolved: 2,
          };
          const aLane = deriveDispatchLane(a.incident_status);
          const bLane = deriveDispatchLane(b.incident_status);
          if (laneRank[aLane] !== laneRank[bLane]) {
            return laneRank[aLane] - laneRank[bLane];
          }
          if (b.severity !== a.severity) return b.severity - a.severity;
          const aTimelineAt = latestTimelineByEvent.get(a.id)?.at ?? a.detected_at;
          const bTimelineAt = latestTimelineByEvent.get(b.id)?.at ?? b.detected_at;
          return bTimelineAt - aTimelineAt;
        })
        .slice(0, 4)
        .map((event) => {
          const latestAction = latestTimelineByEvent.get(event.id);
          const ackAt = ackAtByEvent.get(event.id);
          const resolvedAt = resolvedAtByEvent.get(event.id);
          return {
            id: event.id,
            lane: deriveDispatchLane(event.incident_status),
            zoneLabel: getZoneLabel(event.zone_id),
            typeLabel: getEventTypeLabel(event.type),
            severity: event.severity,
            latestAction: latestAction
              ? `${latestAction.action.toUpperCase()} · ${latestAction.actor}`
              : "DETECTED",
            ackState: ackAt
              ? ackAt - event.detected_at <= ACK_SLA_MS
                ? "ACK met"
                : "ACK missed"
              : "ACK pending",
            resolveState: resolvedAt
              ? resolvedAt - (ackAt ?? event.detected_at) <= RESOLVE_SLA_MS
                ? "Resolve met"
                : "Resolve missed"
              : "Resolve pending",
            nextAction: deriveDispatchNextAction({
              lane: deriveDispatchLane(event.incident_status),
              severity: event.severity,
              ackSlaState: ackAt
                ? ackAt - event.detected_at <= ACK_SLA_MS
                  ? "met"
                  : "missed"
                : "pending",
              resolveSlaState: resolvedAt
                ? resolvedAt - (ackAt ?? event.detected_at) <= RESOLVE_SLA_MS
                  ? "met"
                  : "missed"
                : "pending",
            }),
          };
        }),
    [ackAtByEvent, focusedEvents, latestTimelineByEvent, resolvedAtByEvent]
  );

  const openCount = focusedEvents.filter((event) => event.incident_status !== "resolved").length;
  const criticalCount = focusedEvents.filter((event) => event.severity === 3).length;

  const ackDurations = useMemo(() => {
    const rows: number[] = [];
    focusedEvents.forEach((event) => {
      const ackAt = ackAtByEvent.get(event.id);
      if (!ackAt) return;
      rows.push(Math.max(0, ackAt - event.detected_at));
    });
    return rows;
  }, [ackAtByEvent, focusedEvents]);

  const resolveDurations = useMemo(() => {
    const rows: number[] = [];
    focusedEvents.forEach((event) => {
      const resolvedAt = resolvedAtByEvent.get(event.id);
      if (!resolvedAt) return;
      const ackAt = ackAtByEvent.get(event.id) ?? event.detected_at;
      rows.push(Math.max(0, resolvedAt - ackAt));
    });
    return rows;
  }, [ackAtByEvent, focusedEvents, resolvedAtByEvent]);

  const ackSlaMet = ackDurations.filter((ms) => ms <= ACK_SLA_MS).length;
  const resolveSlaMet = resolveDurations.filter((ms) => ms <= RESOLVE_SLA_MS).length;

  const avgAckMs = ackDurations.length > 0 ? Math.round(ackDurations.reduce((a, b) => a + b, 0) / ackDurations.length) : 0;
  const avgResolveMs = resolveDurations.length > 0 ? Math.round(resolveDurations.reduce((a, b) => a + b, 0) / resolveDurations.length) : 0;

  const byType = useMemo(() => {
    const map = new Map<string, number>();
    focusedEvents.forEach((event) => {
      map.set(event.type, (map.get(event.type) ?? 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [focusedEvents]);

  const byZone = useMemo(() => {
    const map = new Map<string, number>();
    focusedEvents.forEach((event) => {
      map.set(event.zone_id, (map.get(event.zone_id) ?? 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [focusedEvents]);

  const downloadCsv = () => {
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

    const rows = focusedEvents.map((event) => {
      const ackAt = ackAtByEvent.get(event.id);
      const resolvedAt = resolvedAtByEvent.get(event.id);
      return [
        event.id,
        new Date(event.detected_at).toISOString(),
        event.zone_id,
        event.type,
        event.severity,
        event.incident_status,
        event.camera_id ?? "",
        event.source,
        event.latency_ms,
        ackAt ? new Date(ackAt).toISOString() : "",
        resolvedAt ? new Date(resolvedAt).toISOString() : "",
        event.note ?? "",
      ];
    });

    const csv = [header, ...rows]
      .map((row) => row.map(toCsvValue).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `twincity-report-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    setNotice("CSV를 다운로드했습니다.");
  };

  const copySummary = useCallback(async () => {
    const text = [
      `TwinCity 운영 리포트 (${filterSummary})`,
      `총 알림: ${focusedEvents.length}`,
      `미해결: ${openCount}`,
      `긴급(S3): ${criticalCount}`,
      `ACK SLA(<=${Math.round(ACK_SLA_MS / 60_000)}m): ${ackDurations.length > 0 ? `${ackSlaMet}/${ackDurations.length}` : "-"}`,
      `RESOLVE SLA(<=${Math.round(RESOLVE_SLA_MS / 60_000)}m): ${resolveDurations.length > 0 ? `${resolveSlaMet}/${resolveDurations.length}` : "-"}`,
      `평균 ACK: ${ackDurations.length > 0 ? `${Math.round(avgAckMs / 1000)}s` : "-"}`,
      `평균 처리: ${resolveDurations.length > 0 ? `${Math.round(avgResolveMs / 1000)}s` : "-"}`,
      "",
      "Top Zones",
      ...byZone.map(([zoneId, count]) => `- ${getZoneLabel(zoneId)}: ${count}`),
    ].join("\n");

    try {
      await navigator.clipboard.writeText(text);
      setNotice("요약을 클립보드에 복사했습니다.");
    } catch {
      setNotice("복사 권한이 없어서 실패했습니다.");
    }
  }, [
    ackDurations,
    ackSlaMet,
    avgAckMs,
    avgResolveMs,
    byZone,
    criticalCount,
    filterSummary,
    focusedEvents.length,
    openCount,
    resolveDurations,
    resolveSlaMet,
  ]);

  const copyReviewRoutes = useCallback(async () => {
    const text = [
      `TwinCity review routes (${filterSummary})`,
      ...serviceMeta.review_flow.map((item) => `- ${item}`),
      "",
      "Routes",
      ...serviceMeta.routes.map((route) => `- ${route}`),
    ].join("\n");

    try {
      await navigator.clipboard.writeText(text);
      setNotice("리뷰 경로를 클립보드에 복사했습니다.");
    } catch {
      setNotice("복사 권한이 없어서 실패했습니다.");
    }
  }, [filterSummary, serviceMeta.review_flow, serviceMeta.routes]);

  const copyCurrentViewLink = useCallback(async () => {
    const shareUrl = buildAbsoluteShareUrl(
      buildReportsUrlSearch({
        range,
        severityFilter,
        zoneFilter,
      })
    );

    const copied = await copyTextValue(shareUrl);
    setNotice(copied ? "현재 리포트 링크를 복사했습니다." : "복사 권한이 없어서 실패했습니다.");
  }, [range, severityFilter, zoneFilter]);

  const resetFilters = () => {
    setRange("120m");
    setSeverityFilter("all");
    setZoneFilter("all");
    setNotice("리포트 필터를 기본값으로 되돌렸습니다.");
  };

  const copySpotlight = useCallback(async () => {
    const target = spotlightEvents[0];
    if (!target) {
      setNotice("복사할 spotlight incident가 없습니다.");
      return;
    }

    const latestAction = latestTimelineByEvent.get(target.id);
    const text = [
      "TwinCity spotlight incident",
      `Zone: ${getZoneLabel(target.zone_id)}`,
      `Type: ${getEventTypeLabel(target.type)}`,
      `Severity: S${target.severity}`,
      `Status: ${target.incident_status}`,
      `Event ID: ${target.id}`,
      `Detected: ${new Date(target.detected_at).toISOString()}`,
      latestAction
        ? `Latest action: ${latestAction.action.toUpperCase()} by ${latestAction.actor} @ ${new Date(latestAction.at).toISOString()}`
        : "Latest action: none",
      "",
      "Review flow",
      ...serviceMeta.review_flow.map((item) => `- ${item}`),
    ].join("\n");

    try {
      await navigator.clipboard.writeText(text);
      setNotice("spotlight incident를 클립보드에 복사했습니다.");
    } catch {
      setNotice("복사 권한이 없어서 실패했습니다.");
    }
  }, [latestTimelineByEvent, serviceMeta.review_flow, spotlightEvents]);

  const copySlaSnapshot = async () => {
    const target = spotlightEvents[0];
    const text = [
      `TwinCity SLA snapshot (${filterSummary})`,
      `Open incidents: ${openCount}`,
      `Critical incidents: ${criticalCount}`,
      `ACK SLA: ${ackDurations.length > 0 ? `${ackSlaMet}/${ackDurations.length}` : "-"}`,
      `Resolve SLA: ${resolveDurations.length > 0 ? `${resolveSlaMet}/${resolveDurations.length}` : "-"}`,
      `Average ACK: ${ackDurations.length > 0 ? `${Math.round(avgAckMs / 1000)}s` : "-"}`,
      `Average resolve: ${resolveDurations.length > 0 ? `${Math.round(avgResolveMs / 1000)}s` : "-"}`,
      `Top zone: ${byZone[0] ? `${getZoneLabel(byZone[0][0])} (${byZone[0][1]})` : "-"}`,
      `Spotlight: ${target ? `${target.id} / S${target.severity} / ${target.incident_status}` : "-"}`,
    ].join("\n");

    try {
      await navigator.clipboard.writeText(text);
      setNotice("SLA snapshot을 클립보드에 복사했습니다.");
    } catch {
      setNotice("복사 권한이 없어서 실패했습니다.");
    }
  };

  const copyControlTowerClaim = useCallback(async () => {
    const target = spotlightEvents[0];
    const text = [
      `TwinCity control tower claim (${filterSummary})`,
      `Headline: ${runtimeBrief.headline}`,
      `Review routes: ${runtimeBrief.route_count}`,
      `Open incidents: ${openCount}`,
      `Critical incidents: ${criticalCount}`,
      `ACK SLA: ${ackDurations.length > 0 ? `${ackSlaMet}/${ackDurations.length}` : "-"}`,
      `Resolve SLA: ${resolveDurations.length > 0 ? `${resolveSlaMet}/${resolveDurations.length}` : "-"}`,
      `Top zone: ${byZone[0] ? `${getZoneLabel(byZone[0][0])} (${byZone[0][1]})` : "-"}`,
      `Spotlight: ${target ? `${target.id} / ${getZoneLabel(target.zone_id)} / S${target.severity}` : "-"}`,
      "",
      "Fast routes",
      ...serviceMeta.routes.slice(0, 5).map((route) => `- ${route}`),
    ].join("\n");

    try {
      await navigator.clipboard.writeText(text);
      setNotice("control tower claim을 클립보드에 복사했습니다.");
    } catch {
      setNotice("복사 권한이 없어서 실패했습니다.");
    }
  }, [
    ackDurations.length,
    ackSlaMet,
    byZone,
    criticalCount,
    filterSummary,
    openCount,
    resolveDurations.length,
    resolveSlaMet,
    runtimeBrief.headline,
    runtimeBrief.route_count,
    serviceMeta.routes,
    spotlightEvents,
  ]);

  const copyDispatchSnapshot = useCallback(async () => {
    const target = dispatchBoardRows[0];
    const text = [
      `TwinCity dispatch board (${filterSummary})`,
      `Visible rows: ${dispatchBoardRows.length}`,
      `Attention: ${dispatchBoardRows.filter((row) => row.lane === "attention").length}`,
      `Dispatch: ${dispatchBoardRows.filter((row) => row.lane === "dispatch").length}`,
      `Resolved: ${dispatchBoardRows.filter((row) => row.lane === "resolved").length}`,
      `Top row: ${target ? `${target.id} / ${target.lane} / S${target.severity}` : "-"}`,
      "",
      "Fast routes",
      "- /api/reports/dispatch-board",
      "- /api/reports/summary",
      "- /api/reports/export",
    ].join("\n");

    try {
      await navigator.clipboard.writeText(text);
      setNotice("dispatch snapshot을 클립보드에 복사했습니다.");
    } catch {
      setNotice("복사 권한이 없어서 실패했습니다.");
    }
  }, [dispatchBoardRows, filterSummary]);

  const copyNextActions = useCallback(async () => {
    const targetRows = dispatchBoardRows.slice(0, 3);
    const text = [
      `TwinCity next operator actions (${filterSummary})`,
      `Visible rows: ${dispatchBoardRows.length}`,
      "",
      ...(
        targetRows.length > 0
          ? targetRows.map(
              (row, index) =>
                `${index + 1}. ${row.id} / ${row.zoneLabel} / ${row.lane.toUpperCase()} / S${row.severity} -> ${row.nextAction}`
            )
          : ["- No active dispatch rows in the current filter."]
      ),
      "",
      "Fast routes",
      "- /api/runtime-scorecard",
      "- /api/reports/dispatch-board",
      "- /api/reports/export",
    ].join("\n");

    try {
      await navigator.clipboard.writeText(text);
      setNotice("다음 조치 요약을 클립보드에 복사했습니다.");
    } catch {
      setNotice("복사 권한이 없어서 실패했습니다.");
    }
  }, [dispatchBoardRows, filterSummary]);

  const copyOpsBundle = useCallback(async () => {
    const target = spotlightEvents[0];
    const text = [
      `TwinCity ops bundle (${filterSummary})`,
      `Share link: ${buildAbsoluteShareUrl(
        buildReportsUrlSearch({
          range,
          severityFilter,
          zoneFilter,
        })
      )}`,
      `Open incidents: ${openCount}`,
      `Critical incidents: ${criticalCount}`,
      `Top zone: ${byZone[0] ? `${getZoneLabel(byZone[0][0])} (${byZone[0][1]})` : "-"}`,
      `Spotlight: ${target ? `${target.id} / ${getZoneLabel(target.zone_id)} / S${target.severity}` : "-"}`,
      "",
      "Review routes",
      ...serviceMeta.routes.slice(0, 5).map((route) => `- ${route}`),
      "",
      "Dispatch lanes",
      `- Attention: ${dispatchBoardRows.filter((row) => row.lane === "attention").length}`,
      `- Dispatch: ${dispatchBoardRows.filter((row) => row.lane === "dispatch").length}`,
      `- Resolved: ${dispatchBoardRows.filter((row) => row.lane === "resolved").length}`,
    ].join("\n");

    try {
      await navigator.clipboard.writeText(text);
      setNotice("ops bundle을 클립보드에 복사했습니다.");
    } catch {
      setNotice("복사 권한이 없어서 실패했습니다.");
    }
  }, [
    byZone,
    criticalCount,
    dispatchBoardRows,
    filterSummary,
    openCount,
    range,
    serviceMeta.routes,
    severityFilter,
    spotlightEvents,
    zoneFilter,
  ]);

  const focusHighestRisk = useCallback(() => {
    const target = inRangeEvents
      .slice()
      .sort((a, b) => {
        if (b.severity !== a.severity) return b.severity - a.severity;
        const aTimelineAt = latestTimelineByEvent.get(a.id)?.at ?? a.detected_at;
        const bTimelineAt = latestTimelineByEvent.get(b.id)?.at ?? b.detected_at;
        return bTimelineAt - aTimelineAt;
      })[0];

    if (!target) {
      setNotice("집중 검토할 incident가 없습니다.");
      return;
    }

    setSeverityFilter(String(target.severity) as TwincitySeverityFilter);
    setZoneFilter(target.zone_id);
    setNotice(`가장 위험한 incident 기준으로 필터를 맞췄습니다: ${getZoneLabel(target.zone_id)} · S${target.severity}`);
  }, [inRangeEvents, latestTimelineByEvent]);

  useEffect(() => {
    const handleKeyboardShortcuts = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tagName = String(target?.tagName || "").toLowerCase();
      const isTypingTarget =
        Boolean(target?.isContentEditable) ||
        tagName === "input" ||
        tagName === "textarea" ||
        tagName === "select";
      if (isTypingTarget || event.metaKey || event.ctrlKey || event.altKey || !event.shiftKey) {
        return;
      }

      const key = event.key.toLowerCase();
      if (key === "l") {
        event.preventDefault();
        void copyCurrentViewLink();
      } else if (key === "r") {
        event.preventDefault();
        void copyReviewRoutes();
      } else if (key === "s") {
        event.preventDefault();
        void copySummary();
      } else if (key === "f") {
        event.preventDefault();
        focusHighestRisk();
      } else if (key === "d") {
        event.preventDefault();
        void copyDispatchSnapshot();
      } else if (key === "n") {
        event.preventDefault();
        void copyNextActions();
      } else if (key === "b") {
        event.preventDefault();
        void copyOpsBundle();
      } else if (key === "c") {
        event.preventDefault();
        void copyControlTowerClaim();
      } else if (key === "k") {
        event.preventDefault();
        void copySpotlight();
      } else if (key === "?") {
        event.preventDefault();
        setNotice("Shortcuts: ⇧L link · ⇧R routes · ⇧S summary · ⇧F highest risk · ⇧D dispatch · ⇧N next actions · ⇧B ops bundle · ⇧C control tower claim · ⇧K spotlight");
      }
    };

    window.addEventListener("keydown", handleKeyboardShortcuts);
    return () => window.removeEventListener("keydown", handleKeyboardShortcuts);
  }, [
    byZone,
    copyCurrentViewLink,
    copyDispatchSnapshot,
    copyNextActions,
    copyOpsBundle,
    copyControlTowerClaim,
    copyReviewRoutes,
    copySpotlight,
    copySummary,
    criticalCount,
    dispatchBoardRows,
    filterSummary,
    focusHighestRisk,
    openCount,
    range,
    serviceMeta.routes,
    severityFilter,
    spotlightEvents,
    zoneFilter,
  ]);

  return (
    <div className="pageStack">
      <header className="pageHeading reveal">
        <p className="kicker">리포트</p>
        <h1 className="pageTitle">운영 통계와 SLA</h1>
        <p className="pageLead">
          로컬에 저장된 이벤트/처리 기록을 기준으로, 운영 품질을 빠르게 점검할 수 있게 정리했습니다.
        </p>
      </header>

      <div className="reveal delay-1">
        <ControlTowerReadiness variant="compact" />
      </div>

      <section className="splitBlock reveal delay-2">
        <article className="panel reportCard">
          <p className="kicker">Review Pack</p>
          <h2 className="panelTitle">리포트 계약과 운영 증거</h2>
          <p className="pageLead" style={{ maxWidth: "unset" }}>
            {runtimeBrief.headline}
          </p>
          <div className="readinessTagRow">
            <span className="chip" data-tone="calm">
              {runtimeBrief.readiness_contract}
            </span>
            <span className="chip" data-tone="watch">
              {runtimeBrief.diagnostics.ingest_mode}
            </span>
            <span className="chip" data-tone="critical">
              {runtimeBrief.report_contract.schema}
            </span>
          </div>
          <div className="reportTable">
            <div className="reportRow">
              <span>Ingest mode</span>
              <span className="mono">{runtimeBrief.diagnostics.ingest_mode}</span>
            </div>
            <div className="reportRow">
              <span>Live sources</span>
              <span className="mono">
                {[runtimeBrief.live_sources.ws, runtimeBrief.live_sources.sse, runtimeBrief.live_sources.http]
                  .filter(Boolean)
                  .length || 0}
                /3
              </span>
            </div>
            <div className="reportRow">
              <span>Evidence routes</span>
              <span className="mono">{runtimeBrief.evidence_counts.routes}</span>
            </div>
            <div className="reportRow">
              <span>Review route count</span>
              <span className="mono">{runtimeBrief.route_count}</span>
            </div>
          </div>
        </article>

        <article className="panel reportCard">
          <p className="kicker">Export Contract</p>
          <h2 className="panelTitle">CSV와 summary가 무엇을 보장하는지</h2>
          <div className="reportTable">
            <div className="reportRow">
              <span>Schema</span>
              <span className="mono">{reportSchema.schema}</span>
            </div>
            <div className="reportRow">
              <span>Required sections</span>
              <span className="mono">{reportSchema.required_sections.length}</span>
            </div>
            <div className="reportRow">
              <span>Export formats</span>
              <span className="mono">{reportSchema.export_formats.join(", ")}</span>
            </div>
            <div className="reportRow">
              <span>Current watchouts</span>
              <span className="mono">{serviceMeta.watchouts.length}</span>
            </div>
          </div>
          <div className="readinessList">
            {runtimeBrief.review_flow.slice(0, 3).map((item) => (
              <div key={item} className="readinessListItem">
                {item}
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="panel reveal delay-3" style={{ padding: "1rem" }}>
        <div className="reportControls">
          <div className="reportControl">
            <span className="reportLabel">기간</span>
            <select className="opsSelect" value={range} onChange={(e) => setRange(e.target.value as RangeKey)}>
              {(["30m", "60m", "120m", "24h", "all"] as const).map((key) => (
                <option key={key} value={key}>
                  {rangeLabel(key)}
                </option>
              ))}
            </select>
          </div>
          <div className="reportControl">
            <span className="reportLabel">Severity</span>
            <select
              className="opsSelect"
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value as TwincitySeverityFilter)}
            >
              <option value="all">전체</option>
              <option value="3">S3</option>
              <option value="2">S2</option>
              <option value="1">S1</option>
            </select>
          </div>
          <div className="reportControl">
            <span className="reportLabel">Zone</span>
            <select className="opsSelect" value={zoneFilter} onChange={(e) => setZoneFilter(e.target.value)}>
              <option value="all">전체</option>
              {availableZones.map((zoneId) => (
                <option key={zoneId} value={zoneId}>
                  {getZoneLabel(zoneId)}
                </option>
              ))}
            </select>
          </div>

          <div className="reportActions">
            <button type="button" className="button buttonGhost" onClick={load}>
              새로고침
            </button>
            <button type="button" className="button buttonGhost" onClick={copyCurrentViewLink}>
              현재 뷰 링크 복사
            </button>
            <button type="button" className="button buttonGhost" onClick={resetFilters}>
              필터 초기화
            </button>
            <button type="button" className="button buttonGhost" onClick={copyReviewRoutes}>
              리뷰 경로 복사
            </button>
            <button type="button" className="button buttonGhost" onClick={focusHighestRisk} disabled={inRangeEvents.length === 0}>
              최고 위험 집중
            </button>
            <button type="button" className="button buttonGhost" onClick={copySpotlight} disabled={spotlightEvents.length === 0}>
              스포트라이트 복사
            </button>
            <button type="button" className="button buttonGhost" onClick={copySlaSnapshot}>
              SLA 스냅샷 복사
            </button>
            <button type="button" className="button buttonGhost" onClick={copyDispatchSnapshot}>
              Dispatch 스냅샷 복사
            </button>
            <button type="button" className="button buttonGhost" onClick={copyNextActions}>
              다음 조치 복사
            </button>
            <button type="button" className="button buttonGhost" onClick={copyControlTowerClaim}>
              컨트롤타워 주장 복사
            </button>
            <button type="button" className="button buttonGhost" onClick={copySummary}>
              요약 복사
            </button>
            <button type="button" className="button buttonGhost" onClick={copyOpsBundle}>
              Ops 번들 복사
            </button>
            <button type="button" className="button" onClick={downloadCsv} disabled={focusedEvents.length === 0}>
              CSV 다운로드
            </button>
          </div>
        </div>

        <div className="reportChipRow" aria-label="현재 리포트 필터">
          {activeFilterChips.map((chip) => (
            <span key={chip} className="reportChip">
              {chip}
            </span>
          ))}
        </div>

        {notice && <div className="reportNotice mono">{notice}</div>}
        <div className="reportNotice mono">
          Shortcuts: ⇧L 링크 · ⇧R 리뷰 경로 · ⇧S 요약 · ⇧F 최고 위험 · ⇧D dispatch · ⇧N 다음 조치 · ⇧B ops bundle · ⇧C control tower claim · ⇧K spotlight
        </div>
      </section>

      <section className="reveal delay-4">
        <div className="opsMetricRow">
          <article className="opsMetricCard">
            <span>총 알림</span>
            <strong>{focusedEvents.length}</strong>
            <small>{filterSummary}</small>
          </article>
          <article className="opsMetricCard">
            <span>미해결</span>
            <strong>{openCount}</strong>
            <small>처리 필요</small>
          </article>
          <article className="opsMetricCard">
            <span>긴급(S3)</span>
            <strong>{criticalCount}</strong>
            <small>중요도 3</small>
          </article>
          <article className="opsMetricCard">
            <span>ACK SLA</span>
            <strong>{ackDurations.length > 0 ? `${ackSlaMet}/${ackDurations.length}` : "-"}</strong>
            <small>{Math.round(ACK_SLA_MS / 60_000)}분 내 확인</small>
          </article>
          <article className="opsMetricCard">
            <span>처리 SLA</span>
            <strong>{resolveDurations.length > 0 ? `${resolveSlaMet}/${resolveDurations.length}` : "-"}</strong>
            <small>{Math.round(RESOLVE_SLA_MS / 60_000)}분 내 종료</small>
          </article>
        </div>
      </section>

      <section className="splitBlock reveal delay-5">
        <article className="panel reportCard">
          <h2 className="panelTitle">Incident Spotlight</h2>
          {spotlightEvents.length === 0 ? (
            <p className="reportEmpty">현재 필터에서 집중 검토할 incident가 없습니다.</p>
          ) : (
            <div className="readinessList">
              {spotlightEvents.map((event) => {
                const latestAction = latestTimelineByEvent.get(event.id);
                return (
                  <div key={event.id} className="readinessListItem">
                    <strong>
                      {getZoneLabel(event.zone_id)} · {getEventTypeLabel(event.type)} · S{event.severity}
                    </strong>
                    <span className="mono" style={{ display: "block", marginTop: "0.35rem" }}>
                      {event.id} · {event.incident_status}
                    </span>
                    <span style={{ display: "block", marginTop: "0.35rem" }}>
                      {latestAction
                        ? `${latestAction.action.toUpperCase()} by ${latestAction.actor} @ ${new Date(latestAction.at).toISOString()}`
                        : `Detected @ ${new Date(event.detected_at).toISOString()}`}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </article>

        <article className="panel reportCard">
          <h2 className="panelTitle">Dispatch Board</h2>
          {dispatchBoardRows.length === 0 ? (
            <p className="reportEmpty">표시할 dispatch board row가 없습니다.</p>
          ) : (
            <div className="readinessList">
              {dispatchBoardRows.map((row) => (
                <div key={row.id} className="readinessListItem">
                  <strong>
                    {row.zoneLabel} · {row.typeLabel} · S{row.severity}
                  </strong>
                  <span className="mono" style={{ display: "block", marginTop: "0.35rem" }}>
                    {row.id} · {row.lane}
                  </span>
                  <span style={{ display: "block", marginTop: "0.35rem" }}>
                    {row.latestAction} · {row.ackState} · {row.resolveState}
                  </span>
                  <span style={{ display: "block", marginTop: "0.35rem" }}>
                    Next: {row.nextAction}
                  </span>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="panel reportCard">
          <h2 className="panelTitle">유형 분포</h2>
          {byType.length === 0 ? (
            <p className="reportEmpty">표시할 데이터가 없습니다.</p>
          ) : (
            <div className="reportTable">
              {byType.map(([type, count]) => (
                <div key={type} className="reportRow">
                  <span>{getEventTypeLabel(type as EventItem["type"])}</span>
                  <span className="mono">{count}</span>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="panel reportCard">
          <h2 className="panelTitle">Top Zones</h2>
          {byZone.length === 0 ? (
            <p className="reportEmpty">표시할 데이터가 없습니다.</p>
          ) : (
            <div className="reportTable">
              {byZone.map(([zoneId, count]) => (
                <div key={zoneId} className="reportRow">
                  <span>{getZoneLabel(zoneId)}</span>
                  <span className="mono">{count}</span>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>

      <section className="panel reveal delay-5 reportCard">
        <h2 className="panelTitle">SLA 평균</h2>
        <div className="reportTable">
          <div className="reportRow">
            <span>평균 ACK 시간</span>
            <span className="mono">{ackDurations.length > 0 ? `${Math.round(avgAckMs / 1000)}s` : "-"}</span>
          </div>
          <div className="reportRow">
            <span>평균 처리 시간</span>
            <span className="mono">{resolveDurations.length > 0 ? `${Math.round(avgResolveMs / 1000)}s` : "-"}</span>
          </div>
          <div className="reportRow">
            <span>기준 시작</span>
            <span className="mono">{Number.isFinite(since) ? new Date(since).toISOString() : "-"}</span>
          </div>
        </div>
      </section>
    </div>
  );
}
