import type { EventTypeFilter } from "@/lib/types";

export type TwincityFeedMode = "live" | "demo";
export type TwincityUserRole = "viewer" | "operator" | "admin";
export type TwincityRangeKey = "30m" | "60m" | "120m" | "24h" | "all";
export type TwincitySeverityFilter = "all" | "1" | "2" | "3";

export interface OpsUrlState {
  feedMode?: TwincityFeedMode;
  liveWindowMin?: number;
  minSeverity?: 1 | 2 | 3;
  openOnly?: boolean;
  role?: TwincityUserRole;
  selectedId?: string;
  typeFilter?: EventTypeFilter;
  zoneFilter?: string;
}

export interface ReportsUrlState {
  range?: TwincityRangeKey;
  severityFilter?: TwincitySeverityFilter;
  zoneFilter?: string;
}

const VALID_EVENT_TYPE_FILTERS = new Set<EventTypeFilter>([
  "all",
  "crowd",
  "fall",
  "fight",
  "loitering",
  "unknown",
]);
const VALID_FEED_MODES = new Set<TwincityFeedMode>(["live", "demo"]);
const VALID_ROLES = new Set<TwincityUserRole>(["viewer", "operator", "admin"]);
const VALID_RANGES = new Set<TwincityRangeKey>(["30m", "60m", "120m", "24h", "all"]);
const VALID_SEVERITY_FILTERS = new Set<TwincitySeverityFilter>(["all", "1", "2", "3"]);
const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);

function normalizeSearch(search: string) {
  return search.startsWith("?") ? search.slice(1) : search;
}

function sanitizeZoneFilter(value: string | null) {
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function parseBooleanFlag(value: string | null) {
  if (!value) return undefined;
  return TRUE_VALUES.has(value.trim().toLowerCase());
}

export function parseOpsUrlState(search: string): OpsUrlState {
  const params = new URLSearchParams(normalizeSearch(search));
  const next: OpsUrlState = {};
  const typeFilter = params.get("type");
  const zoneFilter = sanitizeZoneFilter(params.get("zone"));
  const feedMode = params.get("mode");
  const role = params.get("role");
  const selectedId = sanitizeZoneFilter(params.get("event"));
  const minSeverity = Number(params.get("sev"));
  const liveWindowRaw = params.get("window");
  const liveWindowMin =
    liveWindowRaw === null ? Number.NaN : Number(liveWindowRaw);
  const openOnly = parseBooleanFlag(params.get("open"));

  if (typeFilter && VALID_EVENT_TYPE_FILTERS.has(typeFilter as EventTypeFilter)) {
    next.typeFilter = typeFilter as EventTypeFilter;
  }
  if (zoneFilter) {
    next.zoneFilter = zoneFilter;
  }
  if (feedMode && VALID_FEED_MODES.has(feedMode as TwincityFeedMode)) {
    next.feedMode = feedMode as TwincityFeedMode;
  }
  if (role && VALID_ROLES.has(role as TwincityUserRole)) {
    next.role = role as TwincityUserRole;
  }
  if (selectedId) {
    next.selectedId = selectedId;
  }
  if (minSeverity === 1 || minSeverity === 2 || minSeverity === 3) {
    next.minSeverity = minSeverity;
  }
  if (Number.isFinite(liveWindowMin)) {
    next.liveWindowMin = liveWindowMin;
  }
  if (typeof openOnly === "boolean") {
    next.openOnly = openOnly;
  }

  return next;
}

export function buildOpsUrlSearch(
  state: Required<Omit<OpsUrlState, "selectedId">> & Pick<OpsUrlState, "selectedId">,
  options?: {
    defaultFeedMode?: TwincityFeedMode;
  }
) {
  const defaultFeedMode = options?.defaultFeedMode ?? "live";
  const params = new URLSearchParams();
  if (state.selectedId) params.set("event", state.selectedId);
  if (state.typeFilter !== "all") params.set("type", state.typeFilter);
  if (state.zoneFilter !== "all") params.set("zone", state.zoneFilter);
  if (state.minSeverity !== 1) params.set("sev", String(state.minSeverity));
  if (state.openOnly) params.set("open", "1");
  if (state.feedMode !== defaultFeedMode) params.set("mode", state.feedMode);
  if (state.role !== "operator") params.set("role", state.role);
  if (state.liveWindowMin !== 60) params.set("window", String(state.liveWindowMin));
  return params.toString();
}

export function parseReportsUrlState(search: string): ReportsUrlState {
  const params = new URLSearchParams(normalizeSearch(search));
  const next: ReportsUrlState = {};
  const range = params.get("range");
  const severityFilter = params.get("severity");
  const zoneFilter = sanitizeZoneFilter(params.get("zone"));

  if (range && VALID_RANGES.has(range as TwincityRangeKey)) {
    next.range = range as TwincityRangeKey;
  }
  if (severityFilter && VALID_SEVERITY_FILTERS.has(severityFilter as TwincitySeverityFilter)) {
    next.severityFilter = severityFilter as TwincitySeverityFilter;
  }
  if (zoneFilter) {
    next.zoneFilter = zoneFilter;
  }

  return next;
}

export function buildReportsUrlSearch(state: Required<ReportsUrlState>) {
  const params = new URLSearchParams();
  if (state.range !== "120m") params.set("range", state.range);
  if (state.severityFilter !== "all") params.set("severity", state.severityFilter);
  if (state.zoneFilter !== "all") params.set("zone", state.zoneFilter);
  return params.toString();
}

export function replaceUrlSearch(nextSearch: string) {
  if (typeof window === "undefined") return;
  const search = nextSearch ? `?${nextSearch}` : "";
  const nextUrl = `${window.location.pathname}${search}${window.location.hash}`;
  window.history.replaceState(window.history.state, "", nextUrl);
}

export function buildAbsoluteShareUrl(
  nextSearch: string,
  options?: {
    origin?: string;
    pathname?: string;
    hash?: string;
  }
) {
  const origin =
    options?.origin ??
    (typeof window !== "undefined" ? window.location.origin : "");
  const pathname =
    options?.pathname ??
    (typeof window !== "undefined" ? window.location.pathname : "/");
  const hash =
    options?.hash ??
    (typeof window !== "undefined" ? window.location.hash : "");

  const search = nextSearch ? `?${nextSearch}` : "";
  return `${origin}${pathname}${search}${hash}`;
}
