
"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import zoneMap from "@/data/zone_map_s001.json";
import type { EventItem, ZoneMap } from "@/lib/types";
import {
  clamp01,
  centroidNorm,
  createMapWorldNormTransform,
  isLive,
  mapNormToWorldNorm,
  pointInPolygon,
  samplePointInZoneNorm,
  zoneHolesNorm,
  zonePolygonNorm,
} from "@/lib/geo";
import { DEFAULT_LIVE_WINDOW_MS } from "@/lib/dummy";
import { getEventTypeLabel, getStoreLabel, getTrackLabel, getZoneLabel } from "@/lib/labels";
import MapWorld3D from "@/components/MapWorld3D";

type Props = {
  events: EventItem[];
  selectedId?: string;
  onSelect: (id?: string) => void;
  liveWindowMs?: number;
  debugOverlay?: boolean;
};

const FALLBACK_FLOOR_IMAGE = "/floorplan_wireframe_20241027.png";
const EXTERNAL_FLOORPLAN_IMAGE = "/api/3d-test/floorplan";
const EXTERNAL_3D_TEST_MODEL = "/api/3d-test/model";
const EXTERNAL_3D_TEST_STATUS = "/api/3d-test/status";
const ROBOT_COUNT = 4;
const ROBOT_STUCK_TICKS = 18;
const VISIBLE_TRACK_ROWS = 30;
const EVENT_REACTION_DISTANCE_NORM = 0.22;
const RESPONSE_SPEED_MIN = 0.03;
const ROBOT_CLEARANCE = 0.007;
const ROBOT_HOLE_PADDING_NORM = 0.014;
const MARKER_HOLE_PADDING_NORM = 0.03;
const ROBOT_ZONE_EDGE_PADDING_NORM = 0.004;
const MARKER_ZONE_EDGE_PADDING_NORM = 0.016;
const ZONE_SAMPLE_STEPS = 24;
const STEER_ANGLES_RAD = [0, 0.32, -0.32, 0.64, -0.64, 0.96, -0.96, 1.26, -1.26] as const;
const CLEARANCE_PROBES = [
  [0, 0],
  [ROBOT_CLEARANCE, 0],
  [-ROBOT_CLEARANCE, 0],
  [0, ROBOT_CLEARANCE],
  [0, -ROBOT_CLEARANCE],
  [ROBOT_CLEARANCE * 0.72, ROBOT_CLEARANCE * 0.72],
  [ROBOT_CLEARANCE * 0.72, -ROBOT_CLEARANCE * 0.72],
  [-ROBOT_CLEARANCE * 0.72, ROBOT_CLEARANCE * 0.72],
  [-ROBOT_CLEARANCE * 0.72, -ROBOT_CLEARANCE * 0.72],
] as const;

type RobotState = {
  id: string;
  label: string;
  zoneId: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  headingRad: number;
  speed: number;
  baseSpeed: number;
  mode: "patrol" | "responding";
  assignedEventId?: string;
  stuckTicks: number;
};

type ThreeTestStatus = {
  dir: string;
  zone_map: {
    exists: boolean;
    world: {
      width_m: number | null;
      depth_m: number | null;
    };
  };
  floorplan: {
    source: "downloads" | "fallback";
    name: string;
    exists: boolean;
  };
  model: {
    source: "downloads" | "fallback" | "missing";
    name: string;
    exists: boolean;
  };
};

type Bounds = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

type ZoneSurface = {
  id: string;
  name: string;
  polygon: readonly (readonly [number, number])[];
  holes: readonly (readonly (readonly [number, number])[])[];
  centroid: { x: number; y: number };
  bounds: Bounds;
  holeBounds: Bounds[];
};

function polygonBounds(poly: readonly (readonly [number, number])[]): Bounds {
  const xs = poly.map(([x]) => x);
  const ys = poly.map(([, y]) => y);
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

function getObjectLabel(event: EventItem) {
  const objectLabelRaw = (event.object_label ?? "").toLowerCase();
  if (objectLabelRaw === "person") return "사람";
  if (objectLabelRaw === "vehicle") return "차량";
  return event.object_label ?? getEventTypeLabel(event.type);
}

function parseSituationNote(note?: string) {
  if (!note) return { summary: undefined, cause: undefined, action: undefined };
  const tokens = note
    .split("|")
    .map((token) => token.trim())
    .filter(Boolean);
  const summary = tokens.find(
    (token) => !token.toLowerCase().startsWith("cause:") && !token.toLowerCase().startsWith("action:")
  );
  const causeToken = tokens.find((token) => token.toLowerCase().startsWith("cause:"));
  const actionToken = tokens.find((token) => token.toLowerCase().startsWith("action:"));
  return {
    summary,
    cause: causeToken?.slice(6).trim(),
    action: actionToken?.slice(7).trim(),
  };
}

function formatMeters(value?: number) {
  return Number.isFinite(value) ? Number(value).toFixed(2) : "-";
}

function pickOne<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function findClosestReactiveEvent(
  robot: RobotState,
  events: readonly Pick<EventItem, "id" | "zone_id" | "severity" | "x" | "y">[]
) {
  let best: Pick<EventItem, "id" | "zone_id" | "severity" | "x" | "y"> | null = null;
  let bestScore = Number.POSITIVE_INFINITY;
  for (const event of events) {
    const dx = event.x - robot.x;
    const dy = event.y - robot.y;
    const distance = Math.hypot(dx, dy);
    if (distance > EVENT_REACTION_DISTANCE_NORM) continue;
    // prefer closer events, but slightly bias higher severity
    const score = distance - event.severity * 0.03;
    if (score < bestScore) {
      best = event;
      bestScore = score;
    }
  }
  return best;
}

function isBlockedPoint(
  x: number,
  y: number,
  holes: readonly (readonly (readonly [number, number])[])[],
  holeBounds: readonly Bounds[]
) {
  if (x < ROBOT_CLEARANCE || x > 1 - ROBOT_CLEARANCE || y < ROBOT_CLEARANCE || y > 1 - ROBOT_CLEARANCE) {
    return true;
  }
  return CLEARANCE_PROBES.some(([ox, oy]) => {
    const px = clamp01(x + ox);
    const py = clamp01(y + oy);
    const inExactHole = holes.some((hole) => pointInPolygon(px, py, hole));
    if (inExactHole) return true;
    return holeBounds.some((bounds) => pointInBounds(px, py, bounds, ROBOT_HOLE_PADDING_NORM));
  });
}

function resolveSteerStep(
  robot: RobotState,
  step: number,
  holes: readonly (readonly (readonly [number, number])[])[],
  holeBounds: readonly Bounds[]
) {
  const baseHeading = Math.atan2(robot.targetY - robot.y, robot.targetX - robot.x);
  for (const offset of STEER_ANGLES_RAD) {
    const heading = baseHeading + offset;
    const x = robot.x + Math.cos(heading) * step;
    const y = robot.y + Math.sin(heading) * step;
    if (!isBlockedPoint(x, y, holes, holeBounds)) {
      return { x, y, heading };
    }
  }
  return null;
}

function pointInHoleOrBufferedBounds(
  x: number,
  y: number,
  holes: readonly (readonly (readonly [number, number])[])[],
  holeBounds: readonly Bounds[],
  holePadding: number
) {
  if (holes.some((hole) => pointInPolygon(x, y, hole))) return true;
  return holeBounds.some((bounds) => pointInBounds(x, y, bounds, holePadding));
}

function projectPointToWalkable(
  x0: number,
  y0: number,
  zone: ZoneSurface,
  holePadding: number,
  zoneEdgePadding: number
) {
  const x = clamp01(x0);
  const y = clamp01(y0);

  const inZone = pointInPolygon(x, y, zone.polygon);
  const blocked = pointInHoleOrBufferedBounds(x, y, zone.holes, zone.holeBounds, holePadding);
  const hasEdgeMargin = zoneEdgePadding <= 0 || pointInBounds(x, y, zone.bounds, -zoneEdgePadding);
  if (inZone && !blocked && hasEdgeMargin) return { x, y };

  let bestX = zone.centroid.x;
  let bestY = zone.centroid.y;
  let bestDist2 = Number.POSITIVE_INFINITY;

  const tryCandidate = (candidateX: number, candidateY: number) => {
    const nx = clamp01(candidateX);
    const ny = clamp01(candidateY);
    if (!pointInPolygon(nx, ny, zone.polygon)) return;
    if (pointInHoleOrBufferedBounds(nx, ny, zone.holes, zone.holeBounds, holePadding)) return;
    if (zoneEdgePadding > 0 && !pointInBounds(nx, ny, zone.bounds, -zoneEdgePadding)) return;
    const dx = nx - x;
    const dy = ny - y;
    const dist2 = dx * dx + dy * dy;
    if (dist2 < bestDist2) {
      bestDist2 = dist2;
      bestX = nx;
      bestY = ny;
    }
  };

  tryCandidate(zone.centroid.x, zone.centroid.y);

  for (let yi = 0; yi < ZONE_SAMPLE_STEPS; yi++) {
    const py = zone.bounds.minY + ((yi + 0.5) / ZONE_SAMPLE_STEPS) * (zone.bounds.maxY - zone.bounds.minY);
    for (let xi = 0; xi < ZONE_SAMPLE_STEPS; xi++) {
      const px = zone.bounds.minX + ((xi + 0.5) / ZONE_SAMPLE_STEPS) * (zone.bounds.maxX - zone.bounds.minX);
      tryCandidate(px, py);
    }
  }

  if (!Number.isFinite(bestDist2) && zoneEdgePadding > 0) {
    return projectPointToWalkable(x, y, zone, holePadding, 0);
  }
  return { x: bestX, y: bestY };
}

export default function MapView({
  events,
  selectedId,
  onSelect,
  liveWindowMs = DEFAULT_LIVE_WINDOW_MS,
  debugOverlay = false,
}: Props) {
  const zm = zoneMap as ZoneMap;
  const mapImageSrc2d = useMemo(() => {
    const imageName = zm.map.image_name?.trim();
    if (!imageName) return FALLBACK_FLOOR_IMAGE;
    return imageName.startsWith("/") ? imageName : `/${imageName}`;
  }, [zm.map.image_name]);
  const defaultWorldWidthM = Number.isFinite(Number(zm.map.world?.width_m))
    ? Math.max(0.001, Number(zm.map.world?.width_m))
    : 9.0;
  const defaultWorldDepthM = Number.isFinite(Number(zm.map.world?.depth_m))
    ? Math.max(0.001, Number(zm.map.world?.depth_m))
    : 4.8;
  const [viewMode, setViewMode] = useState<"2d" | "3d">("2d");
  const [imageSrc2d, setImageSrc2d] = useState(mapImageSrc2d);
  const [threeFloorCb, setThreeFloorCb] = useState(0);
  const [threeWorld, setThreeWorld] = useState<{ widthM: number; depthM: number } | null>(null);
  const [threeStatus, setThreeStatus] = useState<ThreeTestStatus | null>(null);
  const [robots, setRobots] = useState<RobotState[]>([]);

  useEffect(() => {
    setImageSrc2d(mapImageSrc2d);
  }, [mapImageSrc2d]);

  useEffect(() => {
    if (viewMode !== "3d") return;
    let alive = true;
    (async () => {
      try {
        const res = await fetch(EXTERNAL_3D_TEST_STATUS, { cache: "no-store" });
        if (!res.ok) return;
        if (!alive) return;
        const json = (await res.json()) as ThreeTestStatus;
        setThreeStatus(json);

        const widthM = typeof json?.zone_map?.world?.width_m === "number" ? json.zone_map.world.width_m : NaN;
        const depthM = typeof json?.zone_map?.world?.depth_m === "number" ? json.zone_map.world.depth_m : NaN;
        if (!Number.isFinite(widthM) || widthM <= 0) return;
        if (!Number.isFinite(depthM) || depthM <= 0) return;
        setThreeWorld({ widthM, depthM });
      } catch {
        // ignore - fall back to bundled zone_map sizing
      }
    })();
    return () => {
      alive = false;
    };
  }, [viewMode, threeFloorCb]);

  const worldWidthM3d = threeWorld?.widthM ?? defaultWorldWidthM;
  const worldDepthM3d = threeWorld?.depthM ?? defaultWorldDepthM;
  const floorplan3dSrc = `${EXTERNAL_FLOORPLAN_IMAGE}?v=${threeFloorCb}`;
  const model3dSrc = `${EXTERNAL_3D_TEST_MODEL}?v=${threeFloorCb}`;
  const mapWorldTransform = useMemo(
    () =>
      createMapWorldNormTransform(
        zm.map.width,
        zm.map.height,
        worldWidthM3d,
        worldDepthM3d
      ),
    [worldDepthM3d, worldWidthM3d, zm.map.height, zm.map.width]
  );

  const colorFor = (key: string) => {
    // stable pseudo-color by zone_id (keeps UI from looking like a generic template)
    let h = 0;
    for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) % 360;
    return {
      fill: `hsla(${h}, 80%, 70%, 0.08)`,
      stroke: `hsla(${h}, 85%, 70%, 0.42)`
    };
  };

  const zones = useMemo<ZoneSurface[]>(
    () =>
      zm.zones.map((z) => {
        const polygon = zonePolygonNorm(z, zm);
        const holes = zoneHolesNorm(z, zm);
        return {
          id: z.zone_id,
          name: z.name,
          polygon,
          holes,
          centroid: centroidNorm(z, zm),
          bounds: polygonBounds(polygon),
          holeBounds: holes.map((hole) => polygonBounds(hole)),
        };
      }),
    [zm]
  );
  const zoneById = useMemo(() => new Map(zones.map((zone) => [zone.id, zone] as const)), [zones]);
  const holePolygons = useMemo(() => zones.flatMap((zone) => zone.holes), [zones]);
  const holeBounds = useMemo(() => zones.flatMap((zone) => zone.holeBounds), [zones]);
  const currentStoreId = events[0]?.store_id ?? zm.store_id;

  const eventsRef = useRef(events);
  const holePolygonsRef = useRef(holePolygons);
  const holeBoundsRef = useRef(holeBounds);
  const liveWindowMsRef = useRef(liveWindowMs);

  useEffect(() => {
    eventsRef.current = events;
  }, [events]);

  useEffect(() => {
    holePolygonsRef.current = holePolygons;
  }, [holePolygons]);

  useEffect(() => {
    holeBoundsRef.current = holeBounds;
  }, [holeBounds]);

  useEffect(() => {
    liveWindowMsRef.current = liveWindowMs;
  }, [liveWindowMs]);

  const projectToWalkableTarget = useCallback((x: number, y: number, zoneId: string) => {
    const zone = zoneById.get(zoneId);
    if (!zone) return { x: clamp01(x), y: clamp01(y) };
    return projectPointToWalkable(
      x,
      y,
      zone,
      ROBOT_HOLE_PADDING_NORM,
      ROBOT_ZONE_EDGE_PADDING_NORM
    );
  }, [zoneById]);

  const projectToMarkerTarget = useCallback((x: number, y: number, zoneId: string) => {
    const zone = zoneById.get(zoneId);
    if (!zone) return { x: clamp01(x), y: clamp01(y) };
    return projectPointToWalkable(
      x,
      y,
      zone,
      MARKER_HOLE_PADDING_NORM,
      MARKER_ZONE_EDGE_PADDING_NORM
    );
  }, [zoneById]);

  useEffect(() => {
    if (zm.zones.length === 0) return;
    const initialRobots: RobotState[] = Array.from({ length: ROBOT_COUNT }, (_, idx): RobotState => {
      const zone = pickOne(zm.zones);
      const originRaw = samplePointInZoneNorm(zone, zm);
      const targetRaw = samplePointInZoneNorm(zone, zm);
      const origin = projectToWalkableTarget(originRaw.x, originRaw.y, zone.zone_id);
      const target = projectToWalkableTarget(targetRaw.x, targetRaw.y, zone.zone_id);
      const baseSpeed = 0.026 + Math.random() * 0.012;
      return {
        id: `robot-${idx + 1}`,
        label: `R${idx + 1}`,
        zoneId: zone.zone_id,
        x: origin.x,
        y: origin.y,
        targetX: target.x,
        targetY: target.y,
        headingRad: Math.atan2(target.y - origin.y, target.x - origin.x),
        speed: baseSpeed,
        baseSpeed,
        mode: "patrol",
        stuckTicks: 0,
      };
    });
    setRobots(initialRobots);
  }, [projectToWalkableTarget, zm]);

  useEffect(() => {
    if (robots.length === 0) return;
    const stepMs = 80;
    const tick = window.setInterval(() => {
      const reactiveEvents = eventsRef.current
        .filter(
          (event) =>
            event.severity >= 2 && isLive(event.detected_at, liveWindowMsRef.current)
        )
        .map((event) => {
          const projected = projectToWalkableTarget(event.x, event.y, event.zone_id);
          return {
            id: event.id,
            zone_id: event.zone_id,
            severity: event.severity,
            x: projected.x,
            y: projected.y,
          };
        });
      const holes = holePolygonsRef.current;
      const expandedHoleBounds = holeBoundsRef.current;
      setRobots((prev) =>
        prev.map((robot) => {
          const currentZone = zm.zones.find((zone) => zone.zone_id === robot.zoneId) ?? pickOne(zm.zones);
          const trackedEvent =
            robot.assignedEventId ? reactiveEvents.find((event) => event.id === robot.assignedEventId) : undefined;
          const nearestEvent = findClosestReactiveEvent(robot, reactiveEvents);
          const responseEvent = trackedEvent ?? nearestEvent;

          let nextRobot: RobotState = robot;
          if (responseEvent) {
            const projectedTarget = projectToWalkableTarget(
              responseEvent.x,
              responseEvent.y,
              responseEvent.zone_id
            );
            nextRobot = {
              ...nextRobot,
              zoneId: responseEvent.zone_id,
              targetX: projectedTarget.x,
              targetY: projectedTarget.y,
              speed: Math.max(nextRobot.baseSpeed * 1.16, RESPONSE_SPEED_MIN),
              mode: "responding",
              assignedEventId: responseEvent.id,
            };
          } else if (nextRobot.mode === "responding") {
            const patrolZone = zm.zones.find((zone) => zone.zone_id === nextRobot.zoneId) ?? currentZone;
            const patrolRaw = samplePointInZoneNorm(patrolZone, zm);
            const patrolTarget = projectToWalkableTarget(patrolRaw.x, patrolRaw.y, patrolZone.zone_id);
            nextRobot = {
              ...nextRobot,
              targetX: patrolTarget.x,
              targetY: patrolTarget.y,
              speed: nextRobot.baseSpeed,
              mode: "patrol",
              assignedEventId: undefined,
              stuckTicks: 0,
            };
          }

          const dx = nextRobot.targetX - nextRobot.x;
          const dy = nextRobot.targetY - nextRobot.y;
          const distance = Math.hypot(dx, dy);
          const step = nextRobot.speed * (stepMs / 1000);

          if (distance <= Math.max(step, 0.003)) {
            if (nextRobot.mode === "responding") {
              const patrolZone = zm.zones.find((zone) => zone.zone_id === nextRobot.zoneId) ?? currentZone;
              const patrolRaw = samplePointInZoneNorm(patrolZone, zm);
              const patrolTarget = projectToWalkableTarget(patrolRaw.x, patrolRaw.y, patrolZone.zone_id);
              return {
                ...nextRobot,
                x: nextRobot.targetX,
                y: nextRobot.targetY,
                zoneId: patrolZone.zone_id,
                targetX: patrolTarget.x,
                targetY: patrolTarget.y,
                speed: nextRobot.baseSpeed,
                mode: "patrol",
                assignedEventId: undefined,
                headingRad: Math.atan2(
                  patrolTarget.y - nextRobot.targetY,
                  patrolTarget.x - nextRobot.targetX
                ),
                stuckTicks: 0,
              };
            }
            const nextZone = Math.random() < 0.3 ? pickOne(zm.zones) : currentZone;
            const nextTargetRaw = samplePointInZoneNorm(nextZone, zm);
            const nextTarget = projectToWalkableTarget(nextTargetRaw.x, nextTargetRaw.y, nextZone.zone_id);
            return {
              ...nextRobot,
              zoneId: nextZone.zone_id,
              targetX: nextTarget.x,
              targetY: nextTarget.y,
              headingRad: Math.atan2(nextTarget.y - nextRobot.y, nextTarget.x - nextRobot.x),
              stuckTicks: 0,
            };
          }

          const steered = resolveSteerStep(nextRobot, step, holes, expandedHoleBounds);
          if (!steered) {
            const detourHeading = nextRobot.headingRad + (Math.random() < 0.5 ? 0.92 : -0.92);
            const detourTargetX = clamp01(nextRobot.x + Math.cos(detourHeading) * 0.08);
            const detourTargetY = clamp01(nextRobot.y + Math.sin(detourHeading) * 0.08);
            const projectedDetour = projectToWalkableTarget(detourTargetX, detourTargetY, nextRobot.zoneId);
            if (!isBlockedPoint(projectedDetour.x, projectedDetour.y, holes, expandedHoleBounds)) {
              return {
                ...nextRobot,
                targetX: projectedDetour.x,
                targetY: projectedDetour.y,
                headingRad: detourHeading,
                stuckTicks: nextRobot.stuckTicks + 1,
              };
            }
            const fallbackZone = zm.zones.find((zone) => zone.zone_id === nextRobot.zoneId) ?? currentZone;
            const fallbackRaw = samplePointInZoneNorm(fallbackZone, zm);
            const fallbackPoint = projectToWalkableTarget(fallbackRaw.x, fallbackRaw.y, fallbackZone.zone_id);
            return {
              ...nextRobot,
              x: fallbackPoint.x,
              y: fallbackPoint.y,
              targetX: fallbackPoint.x,
              targetY: fallbackPoint.y,
              speed: nextRobot.baseSpeed,
              mode: "patrol",
              assignedEventId: undefined,
              headingRad: detourHeading,
              stuckTicks: 0,
            };
          }

          const movedDistance = Math.hypot(steered.x - robot.x, steered.y - robot.y);
          const stuckTicks = movedDistance < 0.0006 ? robot.stuckTicks + 1 : 0;
          if (stuckTicks >= ROBOT_STUCK_TICKS) {
            const rescueZone = zm.zones.find((zone) => zone.zone_id === nextRobot.zoneId) ?? currentZone;
            const rescueRaw = samplePointInZoneNorm(rescueZone, zm);
            const rescue = projectToWalkableTarget(rescueRaw.x, rescueRaw.y, rescueZone.zone_id);
            return {
              ...nextRobot,
              targetX: rescue.x,
              targetY: rescue.y,
              mode: "patrol",
              assignedEventId: undefined,
              stuckTicks: 0,
            };
          }

          return {
            ...nextRobot,
            x: steered.x,
            y: steered.y,
            headingRad: steered.heading,
            stuckTicks,
          };
        })
      );
    }, stepMs);
    return () => window.clearInterval(tick);
  }, [projectToWalkableTarget, robots.length, zm]);

  const respondingCount = robots.filter((robot) => robot.mode === "responding").length;
  const responseEventIds = new Set(
    robots
      .filter((robot) => robot.mode === "responding" && typeof robot.assignedEventId === "string")
      .map((robot) => robot.assignedEventId as string)
  );

  // Convert normalized -> viewBox coords (0..1000)
  const vbW = 1000;
  const vbH = Math.round(vbW * (zm.map.height / zm.map.width));
  const showZoneOverlay = debugOverlay;
  const selectedEvent = events.find((event) => event.id === selectedId);
  const selectedEventProjected = selectedEvent
    ? projectToMarkerTarget(selectedEvent.x, selectedEvent.y, selectedEvent.zone_id)
    : undefined;
  const selectedEventWorldNorm = selectedEvent
    ? mapNormToWorldNorm(
        selectedEventProjected?.x ?? selectedEvent.x,
        selectedEventProjected?.y ?? selectedEvent.y,
        mapWorldTransform
      )
    : undefined;
  const visibleTrackRows = events.slice(0, VISIBLE_TRACK_ROWS);
  const selectedWorldX = selectedEvent
    ? selectedEvent.world_x_m ??
      (selectedEventWorldNorm ? selectedEventWorldNorm.x * worldWidthM3d : undefined)
    : undefined;
  const selectedWorldZ = selectedEvent
    ? selectedEvent.world_z_m ??
      (selectedEventWorldNorm ? selectedEventWorldNorm.y * worldDepthM3d : undefined)
    : undefined;
  const selectedObjectLabel = selectedEvent ? getObjectLabel(selectedEvent) : undefined;
  const selectedTrackLabel = selectedEvent ? getTrackLabel(selectedEvent.track_id, selectedEvent.id) : undefined;
  const selectedSituation = parseSituationNote(selectedEvent?.note);
  const selectedAnchor = selectedEvent
    ? {
      leftPct: Math.min(92, Math.max(8, (selectedEventProjected?.x ?? selectedEvent.x) * 100)),
      topPct: Math.min(86, Math.max(14, (selectedEventProjected?.y ?? selectedEvent.y) * 100)),
    }
    : undefined;

  const pts = (poly: readonly (readonly [number, number])[]) =>
    poly.map(([x, y]) => `${x * vbW},${y * vbH}`).join(" ");

  return (
    <div style={{ display: "grid", gap: 0 }}>
      <div
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: `${zm.map.width}/${zm.map.height}`,
          borderRadius: "14px 14px 0 0",
          overflow: "hidden",
          border: "1px solid rgba(120,150,210,0.18)",
          background: "rgba(0,0,0,0.12)",
        }}
      >
        {viewMode === "2d" ? (
          <>
            <Image
              src={imageSrc2d}
              alt="floorplan"
              fill
              style={{ objectFit: "cover", opacity: 0.97 }}
              priority
              onError={() => {
                if (imageSrc2d !== FALLBACK_FLOOR_IMAGE) setImageSrc2d(FALLBACK_FLOOR_IMAGE);
              }}
            />

            <div
              style={{
                position: "absolute",
                inset: 0,
                pointerEvents: "none",
                background: "linear-gradient(180deg, rgba(0,0,0,0.08), rgba(0,0,0,0.2))",
              }}
            />

            <svg
              viewBox={`0 0 ${vbW} ${vbH}`}
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
              onClick={() => onSelect(undefined)}
              onKeyDown={(e) => {
                if (e.key === "Escape") onSelect(undefined);
              }}
            >
              {/* legacy zone overlay is left for debug alignment checks */}
              {showZoneOverlay &&
                zones.map((z) => (
                  <g key={z.id}>
                    <polygon
                      points={pts(z.polygon)}
                      fill={colorFor(z.id).fill}
                      stroke={colorFor(z.id).stroke}
                      strokeWidth={2}
                    />
                    {z.holes.map((hole, idx) => (
                      <polygon
                        key={`${z.id}-hole-${idx}`}
                        points={pts(hole)}
                        fill="rgba(3, 9, 22, 0.46)"
                        stroke="rgba(255, 158, 158, 0.7)"
                        strokeWidth={1.5}
                        strokeDasharray="5 4"
                      />
                    ))}
                    <text
                      x={z.centroid.x * vbW}
                      y={z.centroid.y * vbH}
                      fill="rgba(236,241,250,0.9)"
                      fontSize={14}
                      fontWeight={700}
                      textAnchor="middle"
                      style={{ pointerEvents: "none", userSelect: "none" }}
                    >
                      {getZoneLabel(z.id)}
                    </text>
                  </g>
                ))}

	              {events.map((ev) => {
	                const live = isLive(ev.detected_at, liveWindowMs);
	                const isFallDown = ev.raw_status?.toLowerCase() === "fall_down" || ev.type === "fall";
	                const r = isFallDown ? 11 : ev.severity === 2 ? 8 : 7;
                  const snapped = projectToMarkerTarget(ev.x, ev.y, ev.zone_id);
	                const cx = snapped.x * vbW;
	                const cy = snapped.y * vbH;
	                const selected = ev.id === selectedId;
	                const assigned = responseEventIds.has(ev.id);
	                const worldNorm = mapNormToWorldNorm(snapped.x, snapped.y, mapWorldTransform);
	                const worldX = ev.world_x_m ?? worldNorm.x * worldWidthM3d;
	                const worldZ = ev.world_z_m ?? worldNorm.y * worldDepthM3d;

	                return (
                  <g
                    key={ev.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect(ev.id);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        e.stopPropagation();
                        onSelect(ev.id);
                      }
                    }}
                    tabIndex={0}
                    role="button"
                    aria-label={`${getZoneLabel(ev.zone_id)} 객체 선택`}
                    style={{ cursor: "pointer" }}
                  >
                    <circle
                      cx={cx}
                      cy={cy}
                      r={Math.max(14, r + 6)}
                      fill="transparent"
                    />
                    <circle
                      cx={cx}
                      cy={cy}
                      r={selected ? r + 11 : assigned ? r + 10 : r + 7}
                      fill={
                        isFallDown
                          ? "rgba(255,74,93,0.24)"
                          : assigned
                            ? "rgba(255,205,95,0.26)"
                            : live
                              ? "rgba(89,176,255,0.18)"
                              : "rgba(109,130,160,0.18)"
                      }
                    />
                    <circle
                      cx={cx}
                      cy={cy}
                      r={r}
                      fill={
                        isFallDown
                          ? "rgba(255,74,93,0.96)"
                          : ev.severity === 2
                            ? "rgba(255,201,87,0.93)"
                            : live
                              ? "rgba(87,166,255,0.92)"
                              : "rgba(121,150,196,0.84)"
                      }
                      stroke={selected ? "white" : assigned ? "rgba(255,221,141,0.98)" : "rgba(0,0,0,0.26)"}
                      strokeWidth={selected ? 3 : assigned ? 2 : 1}
                    />
                    {debugOverlay && (
                      <text
                        x={cx + 11}
                        y={cy - 11}
                        fontSize={11}
                        fontWeight={700}
                        fill={isFallDown ? "rgba(255,219,223,0.98)" : "rgba(236, 244, 255, 0.95)"}
                      style={{ pointerEvents: "none", userSelect: "none" }}
                    >
                        {`${formatMeters(worldX)}m, ${formatMeters(worldZ)}m`}
                      </text>
                    )}
                  </g>
                );
              })}

              {robots.map((robot) => {
                const cx = robot.x * vbW;
                const cy = robot.y * vbH;
                const isResponding = robot.mode === "responding";
                const headingX = cx + Math.cos(robot.headingRad) * 14;
                const headingY = cy + Math.sin(robot.headingRad) * 14;
                return (
                  <g key={robot.id} style={{ pointerEvents: "none" }}>
                    <circle
                      cx={cx}
                      cy={cy}
                      r={12}
                      fill={isResponding ? "rgba(255, 196, 88, 0.26)" : "rgba(110, 206, 255, 0.22)"}
                      stroke={isResponding ? "rgba(255, 215, 129, 0.85)" : "rgba(184, 230, 255, 0.8)"}
                      strokeWidth={1.2}
                    />
                    <line
                      x1={cx}
                      y1={cy}
                      x2={headingX}
                      y2={headingY}
                      stroke={isResponding ? "rgba(255, 220, 142, 0.92)" : "rgba(191, 231, 252, 0.9)"}
                      strokeWidth={1.1}
                      strokeLinecap="round"
                    />
                    <text
                      x={cx}
                      y={cy + 0.5}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize={16}
                      style={{
                        filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.45))",
                        userSelect: "none",
                      }}
                    >
                      🤖
                    </text>
                  </g>
                );
              })}
            </svg>
          </>
	        ) : (
	          <MapWorld3D
              key={threeFloorCb}
	            events={events}
              robots={robots.map((robot) => ({
                id: robot.id,
                x: robot.x,
                y: robot.y,
                headingRad: robot.headingRad,
                mode: robot.mode,
              }))}
	            selectedId={selectedId}
	            onSelect={onSelect}
	            liveWindowMs={liveWindowMs}
	            mapImageSrc={floorplan3dSrc}
	            modelSrc={model3dSrc}
	            worldWidthM={worldWidthM3d}
	            worldDepthM={worldDepthM3d}
	            resourceSource={threeStatus?.floorplan.source}
	            modelSource={threeStatus?.model.source}
	          />
	        )}

	        <div style={{ position: "absolute", left: 10, top: 10, display: "flex", gap: 8, pointerEvents: "none", flexWrap: "wrap" }}>
	          <span className="chip">매장 <strong>{getStoreLabel(currentStoreId)}</strong></span>
	          <span className="chip">알림 <strong>{events.length}</strong></span>
	          <span className="chip">로봇 <strong>{robots.length}</strong></span>
		          <span className="chip">화면 <strong>{viewMode === "2d" ? "평면" : "입체"}</strong></span>
		          {viewMode === "3d" ? (
		            <span className="chip">3D 리소스 <strong className="mono">model-first</strong></span>
		          ) : null}
		          {viewMode === "3d" ? (
		            <span className="chip">
		              floorplan <strong className="mono">{threeStatus?.floorplan.source ?? "-"}</strong>
		            </span>
		          ) : null}
		          {viewMode === "3d" ? (
		            <span className="chip">
		              model <strong className="mono">{threeStatus?.model.source ?? "-"}</strong>
		            </span>
		          ) : null}
		          {viewMode === "3d" ? (
		            <span className="chip">
		              3D 월드{" "}
		              <strong className="mono">
		                {formatMeters(worldWidthM3d)}m × {formatMeters(worldDepthM3d)}m
	              </strong>
	            </span>
	          ) : null}
	          <span className="chip live">현장 출동 <strong>{respondingCount}</strong></span>
	        </div>

        {viewMode === "2d" && selectedEvent && selectedAnchor && (
          <div
            style={{
              position: "absolute",
              left: `${selectedAnchor.leftPct}%`,
              top: `${selectedAnchor.topPct}%`,
              transform: "translate(-6%, -112%)",
              minWidth: 188,
              maxWidth: 244,
              borderRadius: 8,
              border: "1px solid rgba(191, 220, 255, 0.44)",
              background: "rgba(4, 12, 26, 0.78)",
              color: "rgba(236, 244, 255, 0.97)",
              backdropFilter: "blur(3px)",
              boxShadow: "0 14px 28px rgba(4, 10, 20, 0.38)",
              padding: "0.3rem 0.4rem",
              pointerEvents: "none",
              zIndex: 5,
            }}
          >
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.03em", marginBottom: 2 }}>
              {selectedObjectLabel} · {selectedTrackLabel}
            </p>
            <p style={{ fontSize: 9, opacity: 0.9, marginBottom: 1 }}>
              {getZoneLabel(selectedEvent.zone_id)} · {(selectedEvent.raw_status ?? getEventTypeLabel(selectedEvent.type)).replace(/_/g, " ")}
            </p>
            {selectedSituation.summary && (
              <p style={{ fontSize: 9, lineHeight: 1.3, opacity: 0.94 }}>{selectedSituation.summary}</p>
            )}
          </div>
        )}

        <div style={{ position: "absolute", right: 10, top: 10, display: "flex", gap: 6 }}>
          <button
            type="button"
            className={"opsPill" + (viewMode === "2d" ? " active" : "")}
            onClick={() => {
              setViewMode("2d");
            }}
            aria-pressed={viewMode === "2d"}
          >
            평면
          </button>
          <button
            type="button"
            className={"opsPill" + (viewMode === "3d" ? " active" : "")}
            onClick={() => {
              // cache-bust so THREE reloads even if user overwrote the file on disk.
              setThreeFloorCb(Date.now());
              setViewMode("3d");
            }}
            aria-pressed={viewMode === "3d"}
          >
            입체
          </button>
        </div>
      </div>

      <div
        style={{
          width: "100%",
          borderRadius: "0 0 14px 14px",
          border: "1px solid rgba(198, 218, 255, 0.24)",
          borderTop: "none",
          background: "rgba(6, 13, 24, 0.42)",
          color: "rgba(227,238,255,0.96)",
          padding: "0.22rem 0.5rem 0.42rem",
          fontSize: 11,
        }}
      >
        {selectedEvent ? (
          <div
            style={{
              border: "1px solid rgba(166, 203, 255, 0.34)",
              borderRadius: 7,
              background: "rgba(12, 22, 40, 0.52)",
              padding: "0.24rem 0.36rem",
              marginBottom: 6,
              display: "grid",
              gap: 2,
            }}
          >
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 6, alignItems: "center" }}>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 600, fontSize: 10 }}>
                {selectedObjectLabel} · {selectedTrackLabel}
              </span>
            </div>
            <p style={{ opacity: 0.92, fontSize: 10, lineHeight: 1.24 }}>
              위치 {getZoneLabel(selectedEvent.zone_id)} · 상태 {(selectedEvent.raw_status ?? getEventTypeLabel(selectedEvent.type)).replace(/_/g, " ")}
            </p>
            <p style={{ opacity: 0.92, fontSize: 10, lineHeight: 1.24 }}>
              좌표{" "}
              <span className="mono">
                ({selectedEvent.x.toFixed(3)}, {selectedEvent.y.toFixed(3)})
              </span>{" "}
              · 월드{" "}
              <span className="mono">
                ({formatMeters(selectedWorldX)}m, {formatMeters(selectedWorldZ)}m)
              </span>
            </p>
            {selectedSituation.summary && <p style={{ opacity: 0.94, fontSize: 10, lineHeight: 1.24 }}>상황 {selectedSituation.summary}</p>}
            {selectedSituation.cause && <p style={{ opacity: 0.9, fontSize: 10, lineHeight: 1.24 }}>원인 {selectedSituation.cause}</p>}
            {selectedSituation.action && <p style={{ opacity: 0.9, fontSize: 10, lineHeight: 1.24 }}>권장 조치 {selectedSituation.action}</p>}
          </div>
        ) : (
          <p style={{ marginBottom: 6, opacity: 0.74, fontSize: 10 }}>지도의 마커를 누르면 해당 상황 안내가 여기에 표시됩니다.</p>
        )}

        <p style={{ marginBottom: 4, letterSpacing: "0.1em", textTransform: "uppercase", opacity: 0.88 }}>
          실시간 위치 목록
        </p>
        {visibleTrackRows.length === 0 ? (
          <p style={{ opacity: 0.74 }}>입력 대기 중</p>
        ) : (
          visibleTrackRows.map((event) => {
            const isAlert = event.raw_status?.toLowerCase() === "fall_down" || event.type === "fall";
            const trackName = getTrackLabel(event.track_id, event.id);
            const objectLabel = getObjectLabel(event);
            const selected = event.id === selectedId;
            return (
              <div
                key={event.id}
                onClick={() => onSelect(event.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(event.id);
                  }
                }}
                role="button"
                tabIndex={0}
                aria-label={`${objectLabel} ${trackName} 위치 선택`}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr",
                  gap: 8,
                  alignItems: "center",
                  padding: "0.24rem 0.2rem",
                  borderRadius: 7,
                  cursor: "pointer",
                  color: isAlert ? "rgba(255,205,210,0.98)" : "rgba(226,239,255,0.95)",
                  background: selected ? "rgba(129, 178, 255, 0.2)" : "transparent",
                  border: selected ? "1px solid rgba(168,208,255,0.55)" : "1px solid transparent",
                }}
              >
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {objectLabel} · {trackName}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
