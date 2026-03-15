import {
  buildControlTowerDispatchBoard,
  buildControlTowerReportExport,
  type DispatchBoardLane,
  type ReportFilters,
  type ReportIncidentStatusFilter,
  type ReportRangeKey,
  type ReportSeverityFilter,
} from "@/lib/reportSummary";
import { readOperatorAuthStatus, type OperatorAuthStatus } from "@/lib/operatorAccess";

export type ControlTowerReviewerBundle = {
  service: "twincity-ui";
  status: "ok";
  generated_at: string;
  schema: "twincity-reviewer-bundle-v1";
  filters: ReportFilters;
  operator_auth: OperatorAuthStatus;
  bundle: {
    report_export_schema: "twincity-report-export-v1";
    dispatch_board_schema: "twincity-dispatch-board-v1";
    summary: ReturnType<typeof buildControlTowerReportExport>["summary"];
    spotlight_incidents: ReturnType<typeof buildControlTowerReportExport>["spotlight_incidents"];
    operator_snapshot: ReturnType<typeof buildControlTowerReportExport>["operator_snapshot"];
    dispatch_snapshot: {
      summary: ReturnType<typeof buildControlTowerDispatchBoard>["summary"];
      spotlight: ReturnType<typeof buildControlTowerDispatchBoard>["spotlight"];
      queue_items: Array<{
        id: string;
        lane: DispatchBoardLane;
        severity: number;
        incident_status: string;
        zone_id: string;
        latest_action: string;
      }>;
    };
    review_routes: string[];
  };
  handoff: {
    headline: string;
    review_sequence: string[];
    export_routes: string[];
  };
  integrity: {
    algorithm: "SHA-256";
    digest: string;
    covered_sections: string[];
    verification_route: string;
  };
};

export type ControlTowerReviewerBundleVerification = {
  service: "twincity-ui";
  status: "ok";
  generated_at: string;
  schema: "twincity-reviewer-bundle-verify-v1";
  filters: ReportFilters;
  provided_digest: string | null;
  computed_digest: string;
  match: boolean;
  verification_route: string;
  covered_sections: string[];
};

type BundleFiltersInput = Partial<ReportFilters>;

function normalizeRange(value: string | undefined): ReportRangeKey {
  return value === "30m" || value === "60m" || value === "120m" || value === "24h" || value === "all"
    ? value
    : "120m";
}

function normalizeSeverity(value: string | undefined): ReportSeverityFilter {
  return value === "1" || value === "2" || value === "3" ? value : "all";
}

function normalizeIncidentStatus(value: string | undefined): ReportIncidentStatusFilter {
  return value === "new" || value === "ack" || value === "resolved" ? value : "all";
}

function normalizeFilters(input?: BundleFiltersInput): ReportFilters {
  return {
    range: normalizeRange(input?.range),
    severity: normalizeSeverity(input?.severity),
    incident_status: normalizeIncidentStatus(input?.incident_status),
    zone: input?.zone?.trim() || "all",
  };
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => canonicalize(item));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, canonicalize(nested)])
    );
  }
  return value;
}

async function sha256Hex(payload: unknown): Promise<string> {
  const canonical = JSON.stringify(canonicalize(payload));
  const encoded = new TextEncoder().encode(canonical);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(digest))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

function buildBundlePayload(filters: ReportFilters, now?: number) {
  const reportExport = buildControlTowerReportExport({ filters, now });
  const dispatchBoard = buildControlTowerDispatchBoard({
    filters: { ...filters, lane: "all" },
    now,
  });
  const operatorAuth = readOperatorAuthStatus();

  return {
    reportExport,
    dispatchBoard,
    operatorAuth,
    digestPayload: {
      filters: reportExport.filters,
      summary: reportExport.summary,
      spotlight_incidents: reportExport.spotlight_incidents,
      operator_snapshot: reportExport.operator_snapshot,
      dispatch_summary: dispatchBoard.summary,
      dispatch_spotlight: dispatchBoard.spotlight,
      dispatch_items: dispatchBoard.items.map((item) => ({
        id: item.id,
        lane: item.lane,
        severity: item.severity,
        incident_status: item.incident_status,
        zone_id: item.zone_id,
        latest_action: item.latest_action,
      })),
      operator_auth: operatorAuth,
    },
  };
}

export async function buildControlTowerReviewerBundle(input?: {
  filters?: BundleFiltersInput;
  now?: number;
}): Promise<ControlTowerReviewerBundle> {
  const filters = normalizeFilters(input?.filters);
  const { reportExport, dispatchBoard, operatorAuth, digestPayload } = buildBundlePayload(filters, input?.now);
  const digest = await sha256Hex(digestPayload);

  return {
    service: "twincity-ui",
    status: "ok",
    generated_at: reportExport.generated_at,
    schema: "twincity-reviewer-bundle-v1",
    filters,
    operator_auth: operatorAuth,
    bundle: {
      report_export_schema: reportExport.schema,
      dispatch_board_schema: dispatchBoard.schema,
      summary: reportExport.summary,
      spotlight_incidents: reportExport.spotlight_incidents,
      operator_snapshot: reportExport.operator_snapshot,
      dispatch_snapshot: {
        summary: dispatchBoard.summary,
        spotlight: dispatchBoard.spotlight,
        queue_items: dispatchBoard.items.map((item) => ({
          id: item.id,
          lane: item.lane,
          severity: item.severity,
          incident_status: item.incident_status,
          zone_id: item.zone_id,
          latest_action: item.latest_action,
        })),
      },
      review_routes: [
        "/api/health",
        "/api/meta",
        "/api/runtime-brief",
        "/api/runtime-scorecard",
        "/api/reports/summary",
        "/api/reports/dispatch-board",
        "/api/reports/export",
        "/api/reports/reviewer-bundle",
        "/api/reports/reviewer-bundle/verify",
        "/reports",
      ],
    },
    handoff: {
      headline: "Deterministic reviewer handoff bundle for queue posture, SLA state, and export governance.",
      review_sequence: [
        "Confirm /api/runtime-scorecard before sharing a reviewer bundle.",
        "Use the bundle digest to verify queue posture and SLA summary were not altered after export.",
        "Pair the reviewer bundle with /reports when a human needs the richer visual surface.",
      ],
      export_routes: [
        "/api/reports/export?format=json",
        "/api/reports/export?format=csv",
        "/api/reports/reviewer-bundle",
      ],
    },
    integrity: {
      algorithm: "SHA-256",
      digest,
      covered_sections: [
        "filters",
        "summary",
        "spotlight_incidents",
        "operator_snapshot",
        "dispatch_snapshot",
        "operator_auth",
      ],
      verification_route: "/api/reports/reviewer-bundle/verify",
    },
  };
}

export async function verifyControlTowerReviewerBundle(input: {
  digest?: string | null;
  filters?: BundleFiltersInput;
  now?: number;
}): Promise<ControlTowerReviewerBundleVerification> {
  const filters = normalizeFilters(input.filters);
  const { digestPayload } = buildBundlePayload(filters, input.now);
  const computedDigest = await sha256Hex(digestPayload);
  const providedDigest = input.digest?.trim() || null;

  return {
    service: "twincity-ui",
    status: "ok",
    generated_at: new Date(input.now ?? Date.now()).toISOString(),
    schema: "twincity-reviewer-bundle-verify-v1",
    filters,
    provided_digest: providedDigest,
    computed_digest: computedDigest,
    match: providedDigest === computedDigest,
    verification_route: "/api/reports/reviewer-bundle/verify",
    covered_sections: [
      "filters",
      "summary",
      "spotlight_incidents",
      "operator_snapshot",
      "dispatch_snapshot",
      "operator_auth",
    ],
  };
}
