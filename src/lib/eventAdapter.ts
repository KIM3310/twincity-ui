import zoneMap from "@/data/zone_map_s001.json";
import cameraCalibration from "@/data/camera_calibration_s001.json";
import type {
  EventItem,
  EventSource,
  EventType,
  IncidentStatus,
  Point,
  ZoneMap,
} from "./types";
import {
  createMapWorldNormTransform,
  mapNormToWorldNorm,
  pointInPolygon,
  worldNormToMapNorm,
} from "./geo";
import { applyHomography, computeHomography } from "./homography";

const EVENT_TYPES = new Set<EventType>(["crowd", "fall", "fight", "loitering", "unknown"]);
const INCIDENT_STATUSES = new Set<IncidentStatus>(["new", "ack", "resolved"]);
const EVENT_SOURCES = new Set<EventSource>(["demo", "camera", "api", "unknown"]);

const zm = zoneMap as ZoneMap;
const WORLD_WIDTH_M = Number.isFinite(Number(zm.map.world?.width_m))
  ? Math.max(0.001, Number(zm.map.world?.width_m))
  : 9.0;
const WORLD_DEPTH_M = Number.isFinite(Number(zm.map.world?.depth_m))
  ? Math.max(0.001, Number(zm.map.world?.depth_m))
  : 4.8;
const WORLD_OFFSET_X_M = Number.isFinite(Number(zm.map.world?.offset_x_m))
  ? Number(zm.map.world?.offset_x_m)
  : 0;
const WORLD_OFFSET_Z_M = Number.isFinite(Number(zm.map.world?.offset_z_m))
  ? Number(zm.map.world?.offset_z_m)
  : 0;
const WORLD_NORM_TRANSFORM = createMapWorldNormTransform(
  zm.map.width,
  zm.map.height,
  WORLD_WIDTH_M,
  WORLD_DEPTH_M
);
const ZONE_CENTROIDS = new Map(
  zm.zones
    .filter((zone) => Array.isArray(zone.centroid) && zone.centroid.length >= 2)
    .map((zone) => {
      const cx = Number(zone.centroid[0]);
      const cy = Number(zone.centroid[1]);
      const normalizedX = Number.isFinite(cx) ? clampRange(cx / zm.map.width, 0, 1) : 0.5;
      const normalizedY = Number.isFinite(cy) ? clampRange(cy / zm.map.height, 0, 1) : 0.5;
      return [zone.zone_id, { x: normalizedX, y: normalizedY }] as const;
    })
);
const ZONE_IDS = new Set(zm.zones.map((zone) => zone.zone_id));
const GENERIC_ZONE_IDS = new Set(["store", "site", "shop", "global", "all"]);

type ZoneGeometry = {
  zoneId: string;
  outer: Point[];
  outerBounds: Bounds;
  holes: Point[][];
  holeBounds: Bounds[];
  centroid: { x: number; y: number };
};

type Bounds = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

const HOLE_PADDING_NORM = 0.024;
const ZONE_EDGE_PADDING_NORM = 0.012;

function polygonBounds(points: readonly Point[]): Bounds {
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  };
}

function pointInBounds(x: number, y: number, bounds: Bounds, padding = 0) {
  return (
    x >= bounds.minX - padding &&
    x <= bounds.maxX + padding &&
    y >= bounds.minY - padding &&
    y <= bounds.maxY + padding
  );
}

const ZONE_GEOMETRIES: ZoneGeometry[] = zm.zones.map((zone) => {
  const outer = (zone.polygon ?? [])
    .filter((pair): pair is number[] => Array.isArray(pair) && pair.length >= 2)
    .map(([xPx, yPx]) => [Number(xPx) / zm.map.width, Number(yPx) / zm.map.height] as const);
  const holes = (zone.holes ?? []).map((hole) =>
    (hole ?? [])
      .filter((pair): pair is number[] => Array.isArray(pair) && pair.length >= 2)
      .map(([xPx, yPx]) => [Number(xPx) / zm.map.width, Number(yPx) / zm.map.height] as const)
  );
  const holeBounds = holes.map((hole) => polygonBounds(hole));
  const outerBounds = polygonBounds(outer);

  const centroid = ZONE_CENTROIDS.get(zone.zone_id) ?? { x: 0.5, y: 0.5 };

  return {
    zoneId: zone.zone_id,
    outer,
    outerBounds,
    holes,
    holeBounds,
    centroid,
  };
});

const ZONE_GEOMETRY_BY_ID = new Map(ZONE_GEOMETRIES.map((zone) => [zone.zoneId, zone]));
const ALL_HOLES_NORM: Point[][] = ZONE_GEOMETRIES.flatMap((zone) => zone.holes);
const ALL_HOLE_BOUNDS: Bounds[] = ZONE_GEOMETRIES.flatMap((zone) => zone.holeBounds);

type RawRecord = Record<string, unknown>;

type NormalizeOptions = {
  maxEvents: number;
  fallbackStoreId?: string;
  defaultSource?: EventSource;
};

const MIN_VALID_EPOCH_MS = Date.UTC(2000, 0, 1, 0, 0, 0, 0);
const MAX_FUTURE_DRIFT_MS = 1000 * 60 * 60 * 24 * 365; // 365 days

function asRecord(value: unknown): RawRecord | null {
  if (!value || typeof value !== "object") return null;
  return value as RawRecord;
}

function readPath(record: RawRecord, path: string): unknown {
  const chunks = path.split(".");
  let cursor: unknown = record;
  for (const chunk of chunks) {
    if (!cursor || typeof cursor !== "object") return undefined;
    cursor = (cursor as RawRecord)[chunk];
  }
  return cursor;
}

function pickValue(record: RawRecord, paths: string[]): unknown {
  for (const path of paths) {
    const value = readPath(record, path);
    if (value !== undefined && value !== null) return value;
  }
  return undefined;
}

function parseId(value: unknown): string | null {
  if (typeof value === "string" && value.trim().length > 0) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(Math.round(value));
  return null;
}

function parseEpochMs(value: unknown): number | null {
  const normalizeEpoch = (epochMs: number): number | null => {
    if (!Number.isFinite(epochMs)) return null;
    const rounded = Math.round(epochMs);
    const now = Date.now();
    if (rounded < MIN_VALID_EPOCH_MS) return null;
    if (rounded > now + MAX_FUTURE_DRIFT_MS) return null;
    return rounded;
  };

  if (typeof value === "number" && Number.isFinite(value)) {
    if (value >= 1e12) return normalizeEpoch(value);
    if (value >= 1e9 && value <= 1e11) return normalizeEpoch(value * 1000);
    return normalizeEpoch(value);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;

    const asNum = Number(trimmed);
    if (Number.isFinite(asNum)) {
      if (asNum >= 1e12) return normalizeEpoch(asNum);
      if (asNum >= 1e9 && asNum <= 1e11) return normalizeEpoch(asNum * 1000);
      return normalizeEpoch(asNum);
    }

    const parsed = Date.parse(trimmed);
    if (!Number.isNaN(parsed)) return normalizeEpoch(parsed);
  }

  return null;
}

function parseNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const asNum = Number(value.trim());
    if (Number.isFinite(asNum)) return asNum;
  }
  return null;
}

function parseText(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

type CameraFrame = {
  width: number;
  height: number;
};

function normalizeCameraKey(cameraId: string) {
  return cameraId.trim().toLowerCase();
}

function toCalibrationPoint(value: unknown): readonly [number, number] | null {
  if (!Array.isArray(value) || value.length < 2) return null;
  const x = parseNumber(value[0]);
  const y = parseNumber(value[1]);
  if (x === null || y === null) return null;
  return [x, y];
}

function toCalibrationPoints(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((point) => toCalibrationPoint(point))
    .filter((point): point is readonly [number, number] => point !== null);
}

const CAMERA_HOMOGRAPHY = new Map<string, readonly number[]>();
const CAMERA_FRAME = new Map<string, CameraFrame>();

function registerCameraCalibrationRow(value: unknown) {
  const row = asRecord(value);
  if (!row) return;
  if (row.enabled === false) return;

  const cameraId = parseText(pickValue(row, ["camera_id", "cameraId"]));
  if (!cameraId) return;

  const srcPoints = toCalibrationPoints(pickValue(row, ["image_points", "imagePoints"]));
  const dstPoints = toCalibrationPoints(pickValue(row, ["map_norm_points", "mapNormPoints"]));
  if (srcPoints.length < 4 || dstPoints.length < 4) return;

  const matrix = computeHomography(srcPoints.slice(0, 4), dstPoints.slice(0, 4));
  if (!matrix) return;

  const key = normalizeCameraKey(cameraId);
  CAMERA_HOMOGRAPHY.set(key, matrix);

  const frameRecord = asRecord(row.frame);
  const frameWidth = frameRecord ? parseNumber(frameRecord.width) : null;
  const frameHeight = frameRecord ? parseNumber(frameRecord.height) : null;
  if (frameWidth !== null && frameHeight !== null && frameWidth > 0 && frameHeight > 0) {
    CAMERA_FRAME.set(key, { width: frameWidth, height: frameHeight });
  }
}

const calibrationPayload = cameraCalibration as { cameras?: unknown };
if (Array.isArray(calibrationPayload.cameras)) {
  calibrationPayload.cameras.forEach((row) => registerCameraCalibrationRow(row));
}

function clampRange(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function toWorldFromNorm(x: number, y: number) {
  const worldNorm = mapNormToWorldNorm(x, y, WORLD_NORM_TRANSFORM);
  return {
    worldX: WORLD_OFFSET_X_M + worldNorm.x * WORLD_WIDTH_M,
    worldZ: WORLD_OFFSET_Z_M + worldNorm.y * WORLD_DEPTH_M,
  };
}

function pointInZoneWalkable(x: number, y: number, zone: ZoneGeometry) {
  if (!pointInPolygon(x, y, zone.outer)) return false;
  if (ZONE_EDGE_PADDING_NORM > 0 && !pointInBounds(x, y, zone.outerBounds, -ZONE_EDGE_PADDING_NORM)) {
    return false;
  }
  const inPolygonHole = zone.holes.some((hole) => pointInPolygon(x, y, hole));
  if (inPolygonHole) return false;
  const inBufferedBounds = zone.holeBounds.some((bounds) => pointInBounds(x, y, bounds, HOLE_PADDING_NORM));
  return !inBufferedBounds;
}

function spiralSnap(
  x0: number,
  y0: number,
  isWalkable: (x: number, y: number) => boolean,
  step = 0.003,
  maxRings = 60
): { x: number; y: number } | null {
  for (let ring = 1; ring <= maxRings; ring++) {
    const ringStep = ring * step;
    let bestX = 0;
    let bestY = 0;
    let bestDist2 = Number.POSITIVE_INFINITY;
    let found = false;

    const test = (x: number, y: number) => {
      const cx = clampRange(x, 0, 1);
      const cy = clampRange(y, 0, 1);
      if (!isWalkable(cx, cy)) return;
      const dx = cx - x0;
      const dy = cy - y0;
      const dist2 = dx * dx + dy * dy;
      if (dist2 < bestDist2) {
        bestDist2 = dist2;
        bestX = cx;
        bestY = cy;
        found = true;
      }
    };

    for (let i = -ring; i <= ring; i++) {
      const x = x0 + i * step;
      test(x, y0 - ringStep);
      test(x, y0 + ringStep);
    }

    for (let j = -ring + 1; j <= ring - 1; j++) {
      const y = y0 + j * step;
      test(x0 - ringStep, y);
      test(x0 + ringStep, y);
    }

    if (found) return { x: bestX, y: bestY };
  }

  return null;
}

function snapCoordinatesToFloor(coordinates: NormalizedCoordinates, zoneId: string): NormalizedCoordinates {
  const x0 = clampRange(coordinates.x, 0, 1);
  const y0 = clampRange(coordinates.y, 0, 1);

  const zone = ZONE_GEOMETRY_BY_ID.get(zoneId);
  if (zone) {
    if (pointInZoneWalkable(x0, y0, zone)) return { ...coordinates, x: x0, y: y0 };

    // If it's outside the zone boundary, fall back to the zone centroid.
    if (!pointInPolygon(x0, y0, zone.outer)) {
      const world = toWorldFromNorm(zone.centroid.x, zone.centroid.y);
      return { x: zone.centroid.x, y: zone.centroid.y, worldX: world.worldX, worldZ: world.worldZ };
    }

    const snapped = spiralSnap(x0, y0, (x, y) => pointInZoneWalkable(x, y, zone));
    if (snapped) {
      const world = toWorldFromNorm(snapped.x, snapped.y);
      return { x: snapped.x, y: snapped.y, worldX: world.worldX, worldZ: world.worldZ };
    }

    const world = toWorldFromNorm(zone.centroid.x, zone.centroid.y);
    return { x: zone.centroid.x, y: zone.centroid.y, worldX: world.worldX, worldZ: world.worldZ };
  }

  // Unknown zone: at least keep it off known shelf/island footprints.
  const walkable = (x: number, y: number) => {
    const inPolygonHole = ALL_HOLES_NORM.some((hole) => pointInPolygon(x, y, hole));
    if (inPolygonHole) return false;
    return !ALL_HOLE_BOUNDS.some((bounds) => pointInBounds(x, y, bounds, HOLE_PADDING_NORM));
  };
  if (walkable(x0, y0)) return { ...coordinates, x: x0, y: y0 };

  const snapped = spiralSnap(x0, y0, walkable);
  if (!snapped) return { ...coordinates, x: x0, y: y0 };
  const world = toWorldFromNorm(snapped.x, snapped.y);
  return { x: snapped.x, y: snapped.y, worldX: world.worldX, worldZ: world.worldZ };
}

function normalizeType(value: unknown): EventType {
  if (typeof value !== "string") return "unknown";
  const normalized = value.trim().toLowerCase();

  if (EVENT_TYPES.has(normalized as EventType)) return normalized as EventType;
  if (["fall_down", "slip", "slipfall", "trip"].includes(normalized)) return "fall";
  if (["violence", "assault", "aggressive", "fight"].includes(normalized)) return "fight";
  if (["queue", "congestion", "crowding", "crowd"].includes(normalized)) return "crowd";
  if (["loiter", "idle", "linger", "loitering"].includes(normalized)) return "loitering";

  return "unknown";
}

function normalizeSeverity(value: unknown, type: EventType): 1 | 2 | 3 {
  if (value === 1 || value === 2 || value === 3) return value;

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["p1", "l3", "high", "critical", "severe", "urgent"].includes(normalized)) return 3;
    if (["p2", "l2", "medium", "med", "moderate"].includes(normalized)) return 2;
    if (["p3", "l1", "low", "minor"].includes(normalized)) return 1;

    const asNum = Number(normalized.replace(/[^0-9.]/g, ""));
    if (Number.isFinite(asNum) && asNum >= 1 && asNum <= 3) return Math.round(asNum) as 1 | 2 | 3;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    if (value >= 3) return 3;
    if (value >= 2) return 2;
    return 1;
  }

  if (type === "fall" || type === "fight") return 3;
  if (type === "crowd") return 2;
  return 1;
}

function normalizeIncidentStatus(value: unknown): IncidentStatus {
  if (typeof value !== "string") return "new";
  const normalized = value.trim().toLowerCase();

  if (INCIDENT_STATUSES.has(normalized as IncidentStatus)) return normalized as IncidentStatus;
  if (["open", "opened", "detected", "created", "new_alert"].includes(normalized)) return "new";
  if (["acknowledged", "acknowledge", "in_progress", "processing", "dispatched"].includes(normalized)) {
    return "ack";
  }
  if (["closed", "done", "resolved_done", "complete", "completed"].includes(normalized)) {
    return "resolved";
  }

  return "new";
}

function normalizeSource(value: unknown, fallback: EventSource): EventSource {
  if (typeof value !== "string") return fallback;
  const normalized = value.trim().toLowerCase();

  if (EVENT_SOURCES.has(normalized as EventSource)) return normalized as EventSource;
  if (normalized.includes("camera")) return "camera";
  if (normalized.includes("demo")) return "demo";
  if (normalized.length > 0) return "api";

  return fallback;
}

function normalizeCoordinate(value: unknown): number | null {
  const parsed = parseNumber(value);
  if (parsed === null) return null;

  if (parsed >= 0 && parsed <= 1) return parsed;
  if (parsed >= 0 && parsed <= 100) return clampRange(parsed / 100, 0, 1);

  return null;
}

type NormalizedCoordinates = {
  x: number;
  y: number;
  worldX?: number;
  worldZ?: number;
};

type NormalizedBBox = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

function normalizeCoordinateWithFrame(value: number, frameSize: number) {
  if (!Number.isFinite(value)) return null;
  if (value >= 0 && value <= 1) return value;
  if (value >= 0 && value <= 100) return clampRange(value / 100, 0, 1);
  if (frameSize > 0) return clampRange(value / frameSize, 0, 1);
  return null;
}

function parseBBox(value: unknown): NormalizedBBox | null {
  if (Array.isArray(value) && value.length >= 4) {
    const x1 = parseNumber(value[0]);
    const y1 = parseNumber(value[1]);
    const x2 = parseNumber(value[2]);
    const y2 = parseNumber(value[3]);
    if (x1 !== null && y1 !== null && x2 !== null && y2 !== null) {
      return {
        x1: Math.min(x1, x2),
        y1: Math.min(y1, y2),
        x2: Math.max(x1, x2),
        y2: Math.max(y1, y2),
      };
    }
    return null;
  }

  const record = asRecord(value);
  if (!record) return null;

  const x1 = parseNumber(pickValue(record, ["x1", "left", "xmin", "x_min"]));
  const y1 = parseNumber(pickValue(record, ["y1", "top", "ymin", "y_min"]));
  const x2 = parseNumber(pickValue(record, ["x2", "right", "xmax", "x_max"]));
  const y2 = parseNumber(pickValue(record, ["y2", "bottom", "ymax", "y_max"]));

  if (x1 !== null && y1 !== null && x2 !== null && y2 !== null) {
    return {
      x1: Math.min(x1, x2),
      y1: Math.min(y1, y2),
      x2: Math.max(x1, x2),
      y2: Math.max(y1, y2),
    };
  }

  const x = parseNumber(pickValue(record, ["x", "left"]));
  const y = parseNumber(pickValue(record, ["y", "top"]));
  const w = parseNumber(pickValue(record, ["w", "width"]));
  const h = parseNumber(pickValue(record, ["h", "height"]));
  if (x !== null && y !== null && w !== null && h !== null) {
    const x2FromWH = x + Math.max(0, w);
    const y2FromWH = y + Math.max(0, h);
    return {
      x1: Math.min(x, x2FromWH),
      y1: Math.min(y, y2FromWH),
      x2: Math.max(x, x2FromWH),
      y2: Math.max(y, y2FromWH),
    };
  }

  return null;
}

function mapBBoxWithCameraCalibration(
  cameraId: string | null | undefined,
  centerX: number,
  centerY: number,
  frameWidthRaw: number | null,
  frameHeightRaw: number | null
) {
  if (!cameraId) return null;
  const matrix = CAMERA_HOMOGRAPHY.get(normalizeCameraKey(cameraId));
  if (!matrix) return null;

  const cameraFrame = CAMERA_FRAME.get(normalizeCameraKey(cameraId));
  const hasInputFrame =
    frameWidthRaw !== null &&
    frameHeightRaw !== null &&
    frameWidthRaw > 0 &&
    frameHeightRaw > 0;
  const isNormalizedInput = centerX >= 0 && centerX <= 1 && centerY >= 0 && centerY <= 1;

  let x = centerX;
  let y = centerY;

  if (cameraFrame) {
    if (isNormalizedInput) {
      x = centerX * cameraFrame.width;
      y = centerY * cameraFrame.height;
    } else if (hasInputFrame) {
      x = (centerX / frameWidthRaw) * cameraFrame.width;
      y = (centerY / frameHeightRaw) * cameraFrame.height;
    }
  } else if (hasInputFrame && isNormalizedInput) {
    x = centerX * frameWidthRaw;
    y = centerY * frameHeightRaw;
  }

  const mapped = applyHomography(matrix, x, y);
  if (!mapped) return null;

  return {
    x: clampRange(mapped.x, 0, 1),
    y: clampRange(mapped.y, 0, 1),
  };
}

function extractBBoxCoordinates(
  record: RawRecord,
  cameraId?: string | null,
  allowFrameNormalization = true
): NormalizedCoordinates | null {
  const bbox = parseBBox(
    pickValue(record, [
      "location.bbox",
      "location.bounding_box",
      "location.box",
      "bbox",
      "bounding_box",
      "box",
      "position.bbox",
      "detection.bbox",
    ])
  );
  if (!bbox) return null;

  const frameWidthRaw = parseNumber(
    pickValue(record, [
      "frame.width",
      "frameWidth",
      "image.width",
      "imageWidth",
      "resolution.width",
      "data.frame.width",
      "payload.frame.width",
      "camera.frame_width",
      "location.frame.width",
      "location.frame_width",
      "meta.frame_width",
      "meta.width",
    ])
  );
  const frameHeightRaw = parseNumber(
    pickValue(record, [
      "frame.height",
      "frameHeight",
      "image.height",
      "imageHeight",
      "resolution.height",
      "data.frame.height",
      "payload.frame.height",
      "camera.frame_height",
      "location.frame.height",
      "location.frame_height",
      "meta.frame_height",
      "meta.height",
    ])
  );

  const frameWidth = frameWidthRaw !== null && frameWidthRaw > 0 ? frameWidthRaw : zm.map.width;
  const frameHeight = frameHeightRaw !== null && frameHeightRaw > 0 ? frameHeightRaw : zm.map.height;
  const centerX = (bbox.x1 + bbox.x2) / 2;
  // For ground-plane mapping, the bottom-center of the bbox is usually a better proxy
  // for the object's contact point (feet/wheels) than the geometric center.
  const centerY = bbox.y2;

  const calibrated = mapBBoxWithCameraCalibration(
    cameraId,
    centerX,
    centerY,
    frameWidthRaw,
    frameHeightRaw
  );
  if (calibrated) return calibrated;
  if (!allowFrameNormalization) return null;

  const x = normalizeCoordinateWithFrame(centerX, frameWidth);
  const y = normalizeCoordinateWithFrame(centerY, frameHeight);
  if (x === null || y === null) return null;

  return { x, y };
}

function extractWorldCoordinates(record: RawRecord): NormalizedCoordinates | null {
  const worldX = parseNumber(
    pickValue(record, [
      "world.x",
      "worldX",
      "world_x",
      "position.world.x",
      "position_world.x",
      "location.world.x",
      "location.world_x",
      "location.x_m",
      "x_m",
    ])
  );
  const worldZ = parseNumber(
    pickValue(record, [
      "world.z",
      "worldZ",
      "world_z",
      "position.world.z",
      "position_world.z",
      "location.world.z",
      "location.world_z",
      "location.z_m",
      "z_m",
    ])
  );

  if (worldX === null || worldZ === null) return null;

  // Some sources send "world" already normalized (0..1). Detect and treat that as normalized
  // coordinates while still exposing meters for downstream UI.
  const looksNormalizedWorld =
    worldX >= 0 &&
    worldX <= 1 &&
    worldZ >= 0 &&
    worldZ <= 1;

  if (looksNormalizedWorld) {
    const worldNormX = clampRange(worldX, 0, 1);
    const worldNormY = clampRange(worldZ, 0, 1);
    const mappedWorldX = WORLD_OFFSET_X_M + worldNormX * WORLD_WIDTH_M;
    const mappedWorldZ = WORLD_OFFSET_Z_M + worldNormY * WORLD_DEPTH_M;
    const mapped = worldNormToMapNorm(worldNormX, worldNormY, WORLD_NORM_TRANSFORM);
    return {
      x: mapped.x,
      y: mapped.y,
      worldX: mappedWorldX,
      worldZ: mappedWorldZ,
    };
  }

  const worldNormX = clampRange((worldX - WORLD_OFFSET_X_M) / WORLD_WIDTH_M, 0, 1);
  const worldNormY = clampRange((worldZ - WORLD_OFFSET_Z_M) / WORLD_DEPTH_M, 0, 1);
  const mapped = worldNormToMapNorm(worldNormX, worldNormY, WORLD_NORM_TRANSFORM);
  return {
    x: mapped.x,
    y: mapped.y,
    worldX,
    worldZ,
  };
}

function normalizeConfidence(value: unknown, severity: 1 | 2 | 3): number {
  const parsed = parseNumber(value);
  if (parsed !== null) {
    if (parsed > 1 && parsed <= 100) return clampRange(parsed / 100, 0, 1);
    return clampRange(parsed, 0, 1);
  }

  if (severity === 3) return 0.92;
  if (severity === 2) return 0.84;
  return 0.78;
}

function resolveEventType(record: RawRecord) {
  const primary = normalizeType(
    pickValue(record, ["type", "event_type", "eventType", "category", "event_name", "label"])
  );
  if (primary !== "unknown") return primary;

  return normalizeType(pickValue(record, ["status", "state", "event_status", "eventState"]));
}

function extractNote(record: RawRecord) {
  const direct = parseText(
    pickValue(record, ["note", "message", "description", "reason", "summary", "vlm_analysis.summary"])
  );

  const cause = parseText(pickValue(record, ["vlm_analysis.cause", "analysis.cause"]));
  const action = parseText(
    pickValue(record, ["vlm_analysis.action", "analysis.action", "action", "recommended_action"])
  );

  const detailChunks = [
    cause ? `cause:${cause}` : undefined,
    action ? `action:${action}` : undefined,
  ].filter((chunk): chunk is string => Boolean(chunk));

  if (direct && detailChunks.length === 0) return direct;
  if (direct) return [direct, ...detailChunks].join(" | ");
  if (detailChunks.length > 0) return detailChunks.join(" | ");
  return undefined;
}

function extractCoordinates(
  record: RawRecord,
  cameraId?: string | null
): NormalizedCoordinates | null {
  const x = normalizeCoordinate(
    pickValue(record, [
      "x",
      "x_norm",
      "xNorm",
      "position.x",
      "position.x_norm",
      "position.xNorm",
      "location.x",
      "location.x_norm",
      "location.xNorm",
      "coord.x",
      "coordinates.x",
      "point.x",
      "geo.x",
    ])
  );
  const y = normalizeCoordinate(
    pickValue(record, [
      "y",
      "y_norm",
      "yNorm",
      "position.y",
      "position.y_norm",
      "position.yNorm",
      "location.y",
      "location.y_norm",
      "location.yNorm",
      "coord.y",
      "coordinates.y",
      "point.y",
      "geo.y",
    ])
  );

  if (x !== null && y !== null) return { x, y };

  const worldCoordinates = extractWorldCoordinates(record);
  if (worldCoordinates) return worldCoordinates;

  const calibratedBBox = extractBBoxCoordinates(record, cameraId, false);
  if (calibratedBBox) return calibratedBBox;

  const frameNormalizedBBox = extractBBoxCoordinates(record, cameraId, true);
  if (frameNormalizedBBox) return frameNormalizedBBox;

  const pairCandidate = pickValue(record, ["position", "location", "coord", "coordinates", "point"]);
  if (Array.isArray(pairCandidate) && pairCandidate.length >= 2) {
    const px = normalizeCoordinate(pairCandidate[0]);
    const py = normalizeCoordinate(pairCandidate[1]);
    if (px !== null && py !== null) return { x: px, y: py };
  }

  const zoneId = parseId(
    pickValue(record, [
      "zone_id",
      "zoneId",
      "zone.id",
      "zone.zone_id",
      "location.zone_id",
      "location.zoneId",
      "area_id",
      "areaId",
    ])
  );
  if (zoneId) {
    const centroid = ZONE_CENTROIDS.get(zoneId);
    if (centroid) return centroid;
  }

  return null;
}

function resolveZoneId(record: RawRecord, coordinates: NormalizedCoordinates): string {
  const explicitZoneId = parseId(
    pickValue(record, [
      "zone_id",
      "zoneId",
      "zone.id",
      "zone.zone_id",
      "location.zone_id",
      "location.zoneId",
      "area_id",
      "areaId",
    ])
  );
  if (explicitZoneId) {
    if (ZONE_IDS.has(explicitZoneId)) return explicitZoneId;
    if (!GENERIC_ZONE_IDS.has(explicitZoneId.toLowerCase())) return explicitZoneId;
  }

  // Prefer the zone whose *outer* boundary contains the point, even if it lands in a hole.
  // This prevents shelf/island footprints (holes) from causing a wrong zone assignment.
  const hitOuter = ZONE_GEOMETRIES.find((zone) => pointInPolygon(coordinates.x, coordinates.y, zone.outer));
  if (hitOuter) return hitOuter.zoneId;

  let nearestZoneId = zm.zones[0]?.zone_id ?? "zone-s001-center";
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const [zoneId, centroid] of ZONE_CENTROIDS.entries()) {
    const dx = coordinates.x - centroid.x;
    const dy = coordinates.y - centroid.y;
    const distance = dx * dx + dy * dy;
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestZoneId = zoneId;
    }
  }

  return nearestZoneId;
}

export function adaptRawEvent(value: unknown, options: Omit<NormalizeOptions, "maxEvents"> = {}): EventItem | null {
  const record = asRecord(value);
  if (!record) return null;

  const cameraId = parseId(
    pickValue(record, ["camera_id", "cameraId", "camera.id", "device_id", "deviceId", "device.id"])
  );
  const trackId = parseId(
    pickValue(record, ["track_id", "trackId", "tracking_id", "trackingId", "object_id", "objectId"])
  );
  const explicitId = parseId(
    pickValue(record, ["id", "event_id", "eventId", "uuid", "alarm_id", "alarmId", "alert_id", "alertId"])
  );
  const id = explicitId ?? (trackId ? `${cameraId ?? "cam-unknown"}:track-${trackId}` : null);
  if (!id) return null;

  const detectedAt = parseEpochMs(
    pickValue(record, ["detected_at", "detectedAt", "ts", "timestamp", "created_at", "createdAt", "time"])
  );
  if (detectedAt === null) return null;

  const ingestedAtRaw = parseEpochMs(
    pickValue(record, ["ingested_at", "ingestedAt", "received_at", "receivedAt", "updated_at", "updatedAt"])
  );
  const ingestedAt = ingestedAtRaw ?? detectedAt;

  const latencyRaw = parseNumber(pickValue(record, ["latency_ms", "latencyMs", "latency", "delay_ms"]));
  const latencyMs =
    latencyRaw !== null ? Math.max(0, Math.round(latencyRaw)) : Math.max(0, Math.round(ingestedAt - detectedAt));

  const statusRaw = pickValue(record, ["status", "state", "event_status", "result.status", "payload.status"]);
  const objectLabelRaw = pickValue(record, [
    "label",
    "object.label",
    "class",
    "class_name",
    "object.class",
    "event_label",
  ]);
  const objectLabel = typeof objectLabelRaw === "string" ? objectLabelRaw : undefined;
  const rawStatus = typeof statusRaw === "string" ? statusRaw : undefined;
  const type = resolveEventType(record);

  const severity = normalizeSeverity(
    pickValue(record, ["severity", "priority", "level", "risk", "risk_level", "riskLevel", "status", "state"]),
    type
  );

  const confidence = normalizeConfidence(
    pickValue(record, ["confidence", "score", "probability", "confidence_score", "confidenceScore"]),
    severity
  );

  const coordinates = extractCoordinates(record, cameraId);
  if (!coordinates) return null;
  const zoneId = resolveZoneId(record, coordinates);
  const snapped = snapCoordinatesToFloor(coordinates, zoneId);

  const storeIdRaw = parseId(
    pickValue(record, ["store_id", "storeId", "store.id", "site_id", "siteId", "shop_id", "shopId"])
  );
  const storeId = storeIdRaw ?? options.fallbackStoreId ?? "s001";

  const source = normalizeSource(
    pickValue(record, ["source", "provider", "channel", "origin", "ingest_source"]),
    options.defaultSource ?? "unknown"
  );

  const incidentStatus = normalizeIncidentStatus(
    pickValue(record, ["incident_status", "incidentStatus", "status", "state", "resolution", "result.status"])
  );

  const modelVersion = parseId(pickValue(record, ["model_version", "modelVersion", "model.version"]));

  const note = extractNote(record);

  return {
    id,
    store_id: storeId,
    detected_at: detectedAt,
    ingested_at: ingestedAt,
    latency_ms: latencyMs,
    type,
    severity,
    confidence,
    zone_id: zoneId,
    camera_id: cameraId ?? undefined,
    track_id: trackId ?? undefined,
    object_label: objectLabel,
    raw_status: rawStatus,
    source,
    model_version: modelVersion ?? undefined,
    incident_status: incidentStatus,
    x: snapped.x,
    y: snapped.y,
    world_x_m: snapped.worldX,
    world_z_m: snapped.worldZ,
    note,
  };
}

export function normalizeEventFeed(raw: unknown, options: NormalizeOptions): EventItem[] {
  if (!Array.isArray(raw)) return [];
  const safeMaxEvents = Math.max(1, Math.min(1000, Number(options.maxEvents) || 1));

  const normalized = raw
    .map((item) => adaptRawEvent(item, options))
    .filter((item): item is EventItem => item !== null);

  const dedupedById = new Map<string, EventItem>();
  for (const event of normalized) {
    const existing = dedupedById.get(event.id);
    if (!existing) {
      dedupedById.set(event.id, event);
      continue;
    }
    if (event.detected_at > existing.detected_at) {
      dedupedById.set(event.id, event);
      continue;
    }
    if (event.detected_at === existing.detected_at && event.ingested_at > existing.ingested_at) {
      dedupedById.set(event.id, event);
    }
  }

  return Array.from(dedupedById.values())
    .sort((a, b) => {
      if (b.detected_at !== a.detected_at) {
        return b.detected_at - a.detected_at;
      }
      if (b.ingested_at !== a.ingested_at) {
        return b.ingested_at - a.ingested_at;
      }
      return a.id.localeCompare(b.id);
    })
    .slice(0, safeMaxEvents);
}
