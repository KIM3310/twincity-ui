"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import zoneMap from "@/data/zone_map_s001.json";
import {
  clamp01,
  createMapWorldNormTransform,
  centroidNorm,
  isLive,
  mapNormToWorldNorm,
  pointInPolygon,
  zoneHolesNorm,
  zonePolygonNorm,
} from "@/lib/geo";
import type { EventItem, Zone, ZoneMap } from "@/lib/types";

type Props = {
  events: EventItem[];
  robots?: RobotPose[];
  selectedId?: string;
  onSelect: (id?: string) => void;
  liveWindowMs: number;
  mapImageSrc: string;
  modelSrc?: string;
  worldWidthM: number;
  worldDepthM: number;
  resourceSource?: "downloads" | "fallback";
  modelSource?: "downloads" | "fallback" | "missing";
};

type RobotPose = {
  id: string;
  x: number;
  y: number;
  headingRad: number;
  mode: "patrol" | "responding";
};

type MarkerMeta = {
  id: string;
  pulseSeed: number;
  alert: boolean;
};
type RobotMeta = {
  id: string;
  pulseSeed: number;
  mode: "patrol" | "responding";
};

type ModelLoadState = "idle" | "loading" | "loaded" | "error";
type NormPoint = readonly [number, number];
type NormPolygon = readonly NormPoint[];
type ZonePlacement = {
  id: string;
  polygon: NormPolygon;
  holes: NormPolygon[];
  holeBounds: Bounds[];
  centroid: { x: number; y: number };
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};
type Bounds = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

const MARKER_RADIUS_M = 0.12;
const MARKER_MAX_SCALE = 1.36; // selected marker scale (also covers alert pulse)
const ROBOT_HOLE_PADDING_NORM = 0.014;
const MARKER_HOLE_PADDING_NORM = 0.03;
const ROBOT_ZONE_EDGE_PADDING_NORM = 0.004;
const MARKER_ZONE_EDGE_PADDING_NORM = 0.016;
const ROBOT_BODY_RADIUS_M = 0.11;
const ROBOT_BODY_HEIGHT_M = 0.14;
const ZONE_SAMPLE_STEPS = 24;
const STORE_WALL_HEIGHT_M = 0.82;
const STORE_WALL_THICKNESS_M = 0.08;
const FIXTURE_BASE_HEIGHT_M = 0.52;
const FIXTURE_HEIGHT_VARIATION_M = 0.22;
const FIXTURE_TOP_STRIP_HEIGHT_M = 0.04;
const FIXTURE_MIN_WIDTH_M = 0.18;
const FIXTURE_MIN_DEPTH_M = 0.18;

const STORE_MAP = zoneMap as ZoneMap;

function polygonBounds(polygon: NormPolygon) {
  const xs = polygon.map(([x]) => x);
  const ys = polygon.map(([, y]) => y);
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

function buildZonePlacement(zone: Zone): ZonePlacement {
  const polygon = zonePolygonNorm(zone, STORE_MAP) as NormPolygon;
  const holes = zoneHolesNorm(zone, STORE_MAP) as NormPolygon[];
  const centroid = centroidNorm(zone, STORE_MAP);
  const bounds = polygonBounds(polygon);
  const holeBounds = holes.map((hole) => polygonBounds(hole));
  return {
    id: zone.zone_id,
    polygon,
    holes,
    holeBounds,
    centroid,
    ...bounds,
  };
}

const ZONE_PLACEMENTS = STORE_MAP.zones.map((zone) => buildZonePlacement(zone));
const ZONE_PLACEMENT_BY_ID = new Map(ZONE_PLACEMENTS.map((zone) => [zone.id, zone] as const));

function inHole(x: number, y: number, zone: ZonePlacement, holePadding: number) {
  const inPolygonHole = zone.holes.some((hole) => pointInPolygon(x, y, hole));
  if (inPolygonHole) return true;
  return zone.holeBounds.some((bounds) => pointInBounds(x, y, bounds, holePadding));
}

function inWalkableZone(
  x: number,
  y: number,
  zone: ZonePlacement,
  holePadding: number,
  zoneEdgePadding: number
) {
  if (!pointInPolygon(x, y, zone.polygon)) return false;
  if (zoneEdgePadding > 0) {
    const boundsClear = pointInBounds(
      x,
      y,
      { minX: zone.minX, maxX: zone.maxX, minY: zone.minY, maxY: zone.maxY },
      -zoneEdgePadding
    );
    if (!boundsClear) return false;
  }
  return !inHole(x, y, zone, holePadding);
}

function projectIntoWalkableZone(
  x: number,
  y: number,
  zone: ZonePlacement,
  holePadding: number,
  zoneEdgePadding: number
) {
  if (inWalkableZone(x, y, zone, holePadding, zoneEdgePadding)) return { x, y };

  let bestX = zone.centroid.x;
  let bestY = zone.centroid.y;
  let bestScore = Number.POSITIVE_INFINITY;

  const tryPick = (px: number, py: number) => {
    if (!inWalkableZone(px, py, zone, holePadding, zoneEdgePadding)) return;
    const dx = px - x;
    const dy = py - y;
    const score = dx * dx + dy * dy;
    if (score < bestScore) {
      bestScore = score;
      bestX = px;
      bestY = py;
    }
  };

  tryPick(zone.centroid.x, zone.centroid.y);

  for (let yi = 0; yi < ZONE_SAMPLE_STEPS; yi++) {
    const ny =
      zone.minY +
      ((yi + 0.5) / ZONE_SAMPLE_STEPS) * Math.max(0, zone.maxY - zone.minY);
    for (let xi = 0; xi < ZONE_SAMPLE_STEPS; xi++) {
      const nx =
        zone.minX +
        ((xi + 0.5) / ZONE_SAMPLE_STEPS) * Math.max(0, zone.maxX - zone.minX);
      tryPick(nx, ny);
    }
  }

  if (!Number.isFinite(bestScore) && zoneEdgePadding > 0) {
    return projectIntoWalkableZone(x, y, zone, holePadding, 0);
  }

  return {
    x: clamp01(bestX),
    y: clamp01(bestY),
  };
}

function resolveMarkerFloorPoint(event: EventItem) {
  const x = clamp01(event.x);
  const y = clamp01(event.y);
  const eventZone = ZONE_PLACEMENT_BY_ID.get(event.zone_id);
  if (eventZone) {
    return projectIntoWalkableZone(
      x,
      y,
      eventZone,
      MARKER_HOLE_PADDING_NORM,
      MARKER_ZONE_EDGE_PADDING_NORM
    );
  }

  let best = { x, y };
  let bestScore = Number.POSITIVE_INFINITY;
  for (const zone of ZONE_PLACEMENTS) {
    const candidate = projectIntoWalkableZone(
      x,
      y,
      zone,
      MARKER_HOLE_PADDING_NORM,
      MARKER_ZONE_EDGE_PADDING_NORM
    );
    const dx = candidate.x - x;
    const dy = candidate.y - y;
    const score = dx * dx + dy * dy;
    if (score < bestScore) {
      best = candidate;
      bestScore = score;
    }
  }
  return best;
}

function resolveFloorPoint(x0: number, y0: number) {
  const x = clamp01(x0);
  const y = clamp01(y0);
  for (const zone of ZONE_PLACEMENTS) {
    if (!pointInPolygon(x, y, zone.polygon)) continue;
    return projectIntoWalkableZone(
      x,
      y,
      zone,
      ROBOT_HOLE_PADDING_NORM,
      ROBOT_ZONE_EDGE_PADDING_NORM
    );
  }
  return { x, y };
}

function toWorldX(
  normX: number,
  worldWidthM: number,
  mapWorldTransform: ReturnType<typeof createMapWorldNormTransform>
) {
  const worldNorm = mapNormToWorldNorm(normX, 0.5, mapWorldTransform);
  return (worldNorm.x - 0.5) * worldWidthM;
}

function toWorldZ(
  normY: number,
  worldDepthM: number,
  mapWorldTransform: ReturnType<typeof createMapWorldNormTransform>
) {
  const worldNorm = mapNormToWorldNorm(0.5, normY, mapWorldTransform);
  return (worldNorm.y - 0.5) * worldDepthM;
}

function toStatusColor(event: EventItem, live: boolean) {
  const raw = event.raw_status?.toLowerCase();
  if (raw === "fall_down" || event.type === "fall" || event.severity === 3) return 0xff4d4f;
  if (!live) return 0x6d82a0;
  if (event.severity === 2) return 0xffc857;
  return 0x59b0ff;
}

export default function MapWorld3D({
  events,
  robots = [],
  selectedId,
  onSelect,
  liveWindowMs,
  mapImageSrc,
  modelSrc,
  worldWidthM,
  worldDepthM,
  resourceSource,
  modelSource,
}: Props) {
  const mapWorldTransform = useMemo(
    () =>
      createMapWorldNormTransform(
        STORE_MAP.map.width,
        STORE_MAP.map.height,
        worldWidthM,
        worldDepthM
      ),
    [worldDepthM, worldWidthM]
  );
  const mountRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const markerGroupRef = useRef<THREE.Group | null>(null);
  const markersRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const robotGroupRef = useRef<THREE.Group | null>(null);
  const robotMeshesRef = useRef<Map<string, THREE.Group>>(new Map());
  const focusedSelectionRef = useRef<string | null>(null);
  const [modelState, setModelState] = useState<ModelLoadState>(() => (modelSrc ? "loading" : "idle"));
  const [modelError, setModelError] = useState<string | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0e141d);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 120);
    const maxSpan = Math.max(worldWidthM, worldDepthM);
    camera.position.set(0, maxSpan * 1.3, worldDepthM * 0.86);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.03;
    rendererRef.current = renderer;
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.enablePan = true;
    controls.target.set(0, 0, 0);
    controls.minDistance = Math.max(1.8, maxSpan * 0.35);
    controls.maxDistance = Math.max(7.5, maxSpan * 3.2);
    controls.minPolarAngle = Math.PI / 7;
    controls.maxPolarAngle = Math.PI / 2.05;
    controls.update();
    controlsRef.current = controls;

    const ambient = new THREE.AmbientLight(0xffffff, 0.68);
    const key = new THREE.DirectionalLight(0xfff2d6, 0.78);
    key.position.set(worldWidthM * 0.16, worldDepthM * 1.4, worldDepthM * 0.28);
    const fill = new THREE.DirectionalLight(0x7ea6ff, 0.34);
    fill.position.set(-worldWidthM * 0.2, worldDepthM * 0.9, -worldDepthM * 0.14);
    scene.add(ambient, key, fill);

    // Floorplan texture is a fallback when 3D model isn't available.
    const texture = new THREE.TextureLoader().load(mapImageSrc);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    texture.repeat.set(mapWorldTransform.scaleX, mapWorldTransform.scaleY);
    texture.offset.set(mapWorldTransform.offsetX, mapWorldTransform.offsetY);

    const floorGeometry = new THREE.PlaneGeometry(worldWidthM, worldDepthM, 1, 1);
    const floorMaterial = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.9,
      metalness: 0.04,
      transparent: true,
      opacity: 1,
    });
    const floor = new THREE.Mesh(
      floorGeometry,
      floorMaterial
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.002;
    scene.add(floor);

    const grid = new THREE.GridHelper(
      maxSpan,
      Math.max(8, Math.round(maxSpan * 2)),
      0x7f93b0,
      0x3f526d
    );
    // GridHelper is square; scale it to match the rectangular world plane.
    grid.scale.set(worldWidthM / maxSpan, 1, worldDepthM / maxSpan);
    grid.position.y = 0.001;
    grid.material.opacity = 0.42;
    grid.material.transparent = true;
    scene.add(grid);
    grid.visible = false;

    const proceduralGroup = new THREE.Group();
    proceduralGroup.name = "procedural-store";
    scene.add(proceduralGroup);

    // Build a deterministic 3D store shell from zone-map holes so 3D mode remains immersive
    // even when no external GLB is provided.
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: 0x223249,
      roughness: 0.82,
      metalness: 0.08,
    });
    const wallGlowMaterial = new THREE.MeshStandardMaterial({
      color: 0x37557a,
      roughness: 0.58,
      metalness: 0.18,
      emissive: 0x0f1b2d,
      emissiveIntensity: 0.1,
    });
    const fixtureMaterial = new THREE.MeshStandardMaterial({
      color: 0x4c607b,
      roughness: 0.64,
      metalness: 0.12,
      emissive: 0x101a2a,
      emissiveIntensity: 0.08,
    });
    const fixtureTopMaterial = new THREE.MeshStandardMaterial({
      color: 0x7c9cc0,
      roughness: 0.54,
      metalness: 0.24,
      emissive: 0x1f324b,
      emissiveIntensity: 0.16,
    });

    const halfWidth = worldWidthM / 2;
    const halfDepth = worldDepthM / 2;
    const perimeterWalls = [
      {
        width: worldWidthM + STORE_WALL_THICKNESS_M * 2,
        depth: STORE_WALL_THICKNESS_M,
        x: 0,
        z: -halfDepth - STORE_WALL_THICKNESS_M / 2,
      },
      {
        width: worldWidthM + STORE_WALL_THICKNESS_M * 2,
        depth: STORE_WALL_THICKNESS_M,
        x: 0,
        z: halfDepth + STORE_WALL_THICKNESS_M / 2,
      },
      {
        width: STORE_WALL_THICKNESS_M,
        depth: worldDepthM + STORE_WALL_THICKNESS_M * 2,
        x: -halfWidth - STORE_WALL_THICKNESS_M / 2,
        z: 0,
      },
      {
        width: STORE_WALL_THICKNESS_M,
        depth: worldDepthM + STORE_WALL_THICKNESS_M * 2,
        x: halfWidth + STORE_WALL_THICKNESS_M / 2,
        z: 0,
      },
    ];

    perimeterWalls.forEach((wall, index) => {
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(wall.width, STORE_WALL_HEIGHT_M, wall.depth),
        wallMaterial
      );
      body.position.set(wall.x, STORE_WALL_HEIGHT_M / 2, wall.z);
      body.userData = { kind: "wall", index };
      proceduralGroup.add(body);

      const topRim = new THREE.Mesh(
        new THREE.BoxGeometry(wall.width, 0.04, wall.depth),
        wallGlowMaterial
      );
      topRim.position.set(wall.x, STORE_WALL_HEIGHT_M + 0.02, wall.z);
      topRim.userData = { kind: "wall-rim", index };
      proceduralGroup.add(topRim);
    });

    ZONE_PLACEMENTS.forEach((zone, zoneIndex) => {
      zone.holes.forEach((hole, holeIndex) => {
        const { minX, maxX, minY, maxY } = polygonBounds(hole);
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        const worldMin = mapNormToWorldNorm(minX, minY, mapWorldTransform);
        const worldMax = mapNormToWorldNorm(maxX, maxY, mapWorldTransform);
        const width = Math.max(
          FIXTURE_MIN_WIDTH_M,
          Math.abs(worldMax.x - worldMin.x) * worldWidthM
        );
        const depth = Math.max(
          FIXTURE_MIN_DEPTH_M,
          Math.abs(worldMax.y - worldMin.y) * worldDepthM
        );
        const height =
          FIXTURE_BASE_HEIGHT_M +
          (((zoneIndex + holeIndex) % 4) / 3) * FIXTURE_HEIGHT_VARIATION_M;

        const body = new THREE.Mesh(
          new THREE.BoxGeometry(width, height, depth),
          fixtureMaterial
        );
        body.position.set(
          toWorldX(centerX, worldWidthM, mapWorldTransform),
          height / 2,
          toWorldZ(centerY, worldDepthM, mapWorldTransform)
        );
        body.userData = { kind: "fixture", zoneId: zone.id, holeIndex };
        proceduralGroup.add(body);

        const topStrip = new THREE.Mesh(
          new THREE.BoxGeometry(width, FIXTURE_TOP_STRIP_HEIGHT_M, depth),
          fixtureTopMaterial
        );
        topStrip.position.set(
          toWorldX(centerX, worldWidthM, mapWorldTransform),
          height + FIXTURE_TOP_STRIP_HEIGHT_M / 2,
          toWorldZ(centerY, worldDepthM, mapWorldTransform)
        );
        topStrip.userData = { kind: "fixture-top", zoneId: zone.id, holeIndex };
        proceduralGroup.add(topStrip);
      });
    });

    const disposeMaterial = (material: THREE.Material) => {
      const m = material as unknown as Record<string, unknown>;
      const maybeTextures = [
        "map",
        "emissiveMap",
        "metalnessMap",
        "roughnessMap",
        "normalMap",
        "aoMap",
        "alphaMap",
        "envMap",
        "lightMap",
        "bumpMap",
      ];
      for (const key of maybeTextures) {
        const tex = m[key] as { dispose?: () => void } | undefined;
        if (tex?.dispose) tex.dispose();
      }
      material.dispose();
    };

    const disposeObject3D = (root: THREE.Object3D) => {
      const disposed = new Set<THREE.Material>();
      root.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return;
        child.geometry?.dispose();
        const mat = child.material;
        if (Array.isArray(mat)) {
          mat.forEach((m) => {
            if (disposed.has(m)) return;
            disposed.add(m);
            disposeMaterial(m);
          });
        } else if (mat) {
          if (disposed.has(mat)) return;
          disposed.add(mat);
          disposeMaterial(mat);
        }
      });
    };

    let modelRoot: THREE.Object3D | null = null;
    let modelCancelled = false;
    if (modelSrc) {
      const loader = new GLTFLoader();
      loader.load(
        modelSrc,
        (gltf) => {
          if (modelCancelled) {
            disposeObject3D(gltf.scene);
            return;
          }

          try {
            modelRoot = gltf.scene;
            modelRoot.traverse((child) => {
              if (!(child instanceof THREE.Mesh)) return;
              child.receiveShadow = true;
            });

            const findFootprintObject = (root: THREE.Object3D) => {
              let best: THREE.Mesh | null = null;
              let bestScore = -Infinity;

              const box = new THREE.Box3();
              const size = new THREE.Vector3();

              root.traverse((child) => {
                if (!(child instanceof THREE.Mesh)) return;
                const name = (child.name ?? "").toLowerCase();
                const prefersFloor =
                  name.includes("floor") || name.includes("ground") || name.includes("plane") || name.includes("평면");

                box.setFromObject(child);
                box.getSize(size);
                const area = Math.max(0, size.x) * Math.max(0, size.z);
                if (!Number.isFinite(area) || area <= 0) return;

                // Prefer wide/flat meshes close to y=0 (typical "floor" plane).
                const tallPenalty = size.y > Math.max(size.x, size.z) * 0.18 ? 0.12 : 1;
                const groundBonus = Math.abs(box.min.y) < 0.03 ? 1.1 : 1;
                let score = area * tallPenalty * groundBonus;
                if (prefersFloor) score *= 1000;

                if (score > bestScore) {
                  bestScore = score;
                  best = child;
                }
              });

              return best ?? root;
            };

            const footprintObject = findFootprintObject(modelRoot);

            // Normalize: fit model footprint into the world plane and center it.
            // We intentionally allow non-uniform scaling in X/Z so the 3D footprint matches
            // the 2D floorplan aspect ratio (events are placed in normalized 0..1 space).
            const footprintBox = new THREE.Box3().setFromObject(footprintObject);
            const footprintSize = new THREE.Vector3();
            footprintBox.getSize(footprintSize);
            const footprintX = Math.max(footprintSize.x, 0.001);
            const footprintZ = Math.max(footprintSize.z, 0.001);

            const scaleX = worldWidthM / footprintX;
            const scaleZ = worldDepthM / footprintZ;
            const scaleY = Math.min(scaleX, scaleZ);
            modelRoot.scale.set(scaleX, scaleY, scaleZ);

            // Center using the footprint object, not the entire model bounds (which can
            // include small outlier meshes and shrink the floor unexpectedly).
            const scaledFootprintBox = new THREE.Box3().setFromObject(footprintObject);
            const scaledFootprintCenter = new THREE.Vector3();
            scaledFootprintBox.getCenter(scaledFootprintCenter);

            const scaledGlobalBox = new THREE.Box3().setFromObject(modelRoot);

            modelRoot.position.x -= scaledFootprintCenter.x;
            modelRoot.position.z -= scaledFootprintCenter.z;
            modelRoot.position.y -= scaledGlobalBox.min.y;

            scene.add(modelRoot);
            proceduralGroup.visible = false;

            // Model-first: once GLB is loaded, hide 2D floor fallback to avoid mixed half-flat view.
            floor.visible = false;
            floorMaterial.opacity = 0;
            // Remove helper grid once the 3D scene is ready.
            grid.visible = false;
            setModelState("loaded");
          } catch (err) {
            setModelState("error");
            setModelError(err instanceof Error ? err.message : String(err));
          }
        },
        undefined,
        (err) => {
          if (modelCancelled) return;
          setModelState("error");
          setModelError(err instanceof Error ? err.message : String(err));
          // Keep floorplan fallback visible when model fails.
          floor.visible = true;
          floorMaterial.opacity = 1;
        }
      );
    }

    const markerGroup = new THREE.Group();
    markerGroupRef.current = markerGroup;
    scene.add(markerGroup);
    const markerMap = markersRef.current;

    const robotGroup = new THREE.Group();
    robotGroup.name = "robots";
    robotGroupRef.current = robotGroup;
    scene.add(robotGroup);
    const robotMap = robotMeshesRef.current;

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    let downAt: { x: number; y: number } | null = null;
    let moved = false;
    const onPointerDown = (evt: PointerEvent) => {
      if (evt.button !== 0) return;
      downAt = { x: evt.clientX, y: evt.clientY };
      moved = false;
    };

    const onPointerMove = (evt: PointerEvent) => {
      if (!downAt) return;
      if (moved) return;
      const dx = evt.clientX - downAt.x;
      const dy = evt.clientY - downAt.y;
      if (dx * dx + dy * dy > 36) moved = true;
    };

    const onPointerUp = (evt: PointerEvent) => {
      if (evt.button !== 0) return;
      if (!downAt || moved) {
        downAt = null;
        return;
      }
      downAt = null;
      const target = renderer.domElement;
      const rect = target.getBoundingClientRect();
      pointer.x = ((evt.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((evt.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);

      const meshes = Array.from(markersRef.current.values());
      const hits = raycaster.intersectObjects(meshes, false);
      if (hits.length === 0) {
        onSelect(undefined);
        return;
      }
      const id = hits[0].object.userData?.id;
      if (typeof id === "string") {
        onSelect(id);
      } else {
        onSelect(undefined);
      }
    };

    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("pointerup", onPointerUp);

    let frameId = 0;
    const animate = (t: number) => {
      frameId = window.requestAnimationFrame(animate);

      controls.update();

      markerMap.forEach((mesh) => {
        const meta = mesh.userData as MarkerMeta;
        const pulse = Math.sin(t * 0.0038 + meta.pulseSeed);
        mesh.position.y = 0.14 + pulse * 0.01;
        if (meta.alert) {
          const scale = 1 + Math.max(0, pulse) * 0.14;
          if (mesh.scale.x < 1.3) mesh.scale.setScalar(scale);
        }
      });

      robotMap.forEach((group) => {
        const meta = group.userData as RobotMeta;
        const body = group.children[0] as THREE.Mesh | undefined;
        const light = group.children[2] as THREE.Mesh | undefined;
        const pulse = Math.sin(t * 0.0041 + meta.pulseSeed);
        group.position.y = 0.12 + pulse * 0.008;
        if (body && body.material instanceof THREE.MeshStandardMaterial) {
          body.material.emissiveIntensity = meta.mode === "responding" ? 0.28 : 0.12;
        }
        if (light && light.material instanceof THREE.MeshStandardMaterial) {
          light.material.emissiveIntensity = meta.mode === "responding" ? 0.35 : 0.18;
        }
      });

      renderer.render(scene, camera);
    };
    frameId = window.requestAnimationFrame(animate);

    const resize = () => {
      const width = mount.clientWidth;
      const height = mount.clientHeight;
      if (width === 0 || height === 0) return;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    resize();
    window.addEventListener("resize", resize);

    return () => {
      window.removeEventListener("resize", resize);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      window.cancelAnimationFrame(frameId);

      modelCancelled = true;
      if (modelRoot) {
        scene.remove(modelRoot);
        disposeObject3D(modelRoot);
      }
      scene.remove(proceduralGroup);
      disposeObject3D(proceduralGroup);

      controls.dispose();

      markerMap.forEach((mesh) => {
        mesh.geometry.dispose();
        (mesh.material as THREE.MeshStandardMaterial).dispose();
      });
      markerMap.clear();
      markerGroup.clear();

      robotMap.forEach((group) => {
        group.traverse((child) => {
          if (!(child instanceof THREE.Mesh)) return;
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach((material) => material.dispose());
          } else {
            child.material.dispose();
          }
        });
      });
      robotMap.clear();
      robotGroup.clear();

      floorGeometry.dispose();
      floorMaterial.dispose();
      texture.dispose();
      grid.geometry.dispose();
      if (Array.isArray(grid.material)) {
        grid.material.forEach((material) => material.dispose());
      } else {
        grid.material.dispose();
      }

      scene.clear();
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
      controlsRef.current = null;
      focusedSelectionRef.current = null;
    };
  }, [mapImageSrc, mapWorldTransform, modelSrc, onSelect, worldDepthM, worldWidthM]);

  useEffect(() => {
    const markerGroup = markerGroupRef.current;
    if (!markerGroup) return;

    const activeIds = new Set(events.map((event) => event.id));
    const markerMap = markersRef.current;

    events.forEach((event) => {
      const live = isLive(event.detected_at, liveWindowMs);
      const colorHex = toStatusColor(event, live);
      const isAlert = event.raw_status?.toLowerCase() === "fall_down" || event.type === "fall";

      let mesh = markerMap.get(event.id);
      if (!mesh) {
        mesh = new THREE.Mesh(
          new THREE.SphereGeometry(MARKER_RADIUS_M, 24, 18),
          new THREE.MeshStandardMaterial({
            color: colorHex,
            roughness: 0.24,
            metalness: 0.14,
            emissive: 0x0,
          })
        );
        mesh.userData = {
          id: event.id,
          pulseSeed: Math.random() * Math.PI * 2,
          alert: isAlert,
        } satisfies MarkerMeta;
        markerGroup.add(mesh);
        markerMap.set(event.id, mesh);
      }

      const markerMaterial = mesh.material as THREE.MeshStandardMaterial;
      markerMaterial.color.setHex(colorHex);
      markerMaterial.emissive.setHex(isAlert ? 0x620000 : 0x0f2038);
      markerMaterial.emissiveIntensity = event.id === selectedId ? 0.45 : isAlert ? 0.33 : 0.14;

      // Keep the whole (possibly scaled) sphere on the floor plane, even when the event is near the edges.
      const radiusNormX =
        ((MARKER_RADIUS_M * MARKER_MAX_SCALE) / Math.max(0.001, worldWidthM)) *
        mapWorldTransform.scaleX;
      const radiusNormY =
        ((MARKER_RADIUS_M * MARKER_MAX_SCALE) / Math.max(0.001, worldDepthM)) *
        mapWorldTransform.scaleY;
      const marginX = Math.min(0.49, radiusNormX);
      const marginY = Math.min(0.49, radiusNormY);
      const projected = resolveMarkerFloorPoint(event);
      const nx = Math.min(1 - marginX, Math.max(marginX, projected.x));
      const ny = Math.min(1 - marginY, Math.max(marginY, projected.y));

      mesh.position.x = toWorldX(nx, worldWidthM, mapWorldTransform);
      mesh.position.z = toWorldZ(ny, worldDepthM, mapWorldTransform);
      mesh.scale.setScalar(event.id === selectedId ? 1.36 : 1);
      (mesh.userData as MarkerMeta).alert = isAlert;
    });

    markerMap.forEach((mesh, id) => {
      if (activeIds.has(id)) return;
      markerGroup.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.MeshStandardMaterial).dispose();
      markerMap.delete(id);
    });
  }, [events, liveWindowMs, mapWorldTransform, selectedId, worldDepthM, worldWidthM]);

  useEffect(() => {
    if (!selectedId) {
      focusedSelectionRef.current = null;
      return;
    }
    if (focusedSelectionRef.current === selectedId) return;

    const selectedEvent = events.find((event) => event.id === selectedId);
    if (!selectedEvent) return;

    const controls = controlsRef.current;
    const camera = cameraRef.current;
    if (!controls || !camera) return;

    const projected = resolveMarkerFloorPoint(selectedEvent);
    const target = new THREE.Vector3(
      toWorldX(projected.x, worldWidthM, mapWorldTransform),
      0,
      toWorldZ(projected.y, worldDepthM, mapWorldTransform)
    );
    const offset = camera.position.clone().sub(controls.target);
    if (offset.lengthSq() < 1e-6) {
      const maxSpan = Math.max(worldWidthM, worldDepthM);
      offset.set(0, maxSpan * 0.95, maxSpan * 0.66);
    }
    const nextPosition = target.clone().add(offset);
    const minCameraY = Math.max(1.1, Math.max(worldWidthM, worldDepthM) * 0.22);
    nextPosition.y = Math.max(nextPosition.y, minCameraY);

    controls.target.copy(target);
    camera.position.copy(nextPosition);
    controls.update();
    focusedSelectionRef.current = selectedId;
  }, [events, mapWorldTransform, selectedId, worldDepthM, worldWidthM]);

  useEffect(() => {
    const robotGroup = robotGroupRef.current;
    if (!robotGroup) return;

    const robotMap = robotMeshesRef.current;
    const activeIds = new Set(robots.map((robot) => robot.id));

    robots.forEach((robot) => {
      let group = robotMap.get(robot.id);
      if (!group) {
        group = new THREE.Group();
        const body = new THREE.Mesh(
          new THREE.CylinderGeometry(ROBOT_BODY_RADIUS_M, ROBOT_BODY_RADIUS_M, ROBOT_BODY_HEIGHT_M, 18),
          new THREE.MeshStandardMaterial({
            color: 0x99bbdd,
            roughness: 0.38,
            metalness: 0.42,
            emissive: 0x213244,
            emissiveIntensity: 0.12,
          })
        );
        body.position.y = ROBOT_BODY_HEIGHT_M / 2;

        const head = new THREE.Mesh(
          new THREE.SphereGeometry(ROBOT_BODY_RADIUS_M * 0.52, 16, 12),
          new THREE.MeshStandardMaterial({
            color: 0xcde6ff,
            roughness: 0.28,
            metalness: 0.38,
            emissive: 0x2d4360,
            emissiveIntensity: 0.16,
          })
        );
        head.position.y = ROBOT_BODY_HEIGHT_M + ROBOT_BODY_RADIUS_M * 0.35;

        const indicator = new THREE.Mesh(
          new THREE.ConeGeometry(ROBOT_BODY_RADIUS_M * 0.45, ROBOT_BODY_HEIGHT_M * 0.8, 10),
          new THREE.MeshStandardMaterial({
            color: 0x6fd0ff,
            roughness: 0.22,
            metalness: 0.32,
            emissive: 0x1f4f6d,
            emissiveIntensity: 0.18,
          })
        );
        indicator.position.set(0, ROBOT_BODY_HEIGHT_M * 0.6, ROBOT_BODY_RADIUS_M * 0.85);
        indicator.rotation.x = Math.PI / 2;

        group.add(body, head, indicator);
        group.userData = {
          id: robot.id,
          pulseSeed: Math.random() * Math.PI * 2,
          mode: robot.mode,
        } satisfies RobotMeta;

        robotGroup.add(group);
        robotMap.set(robot.id, group);
      }

      const projected = resolveFloorPoint(robot.x, robot.y);
      group.position.x = toWorldX(projected.x, worldWidthM, mapWorldTransform);
      group.position.z = toWorldZ(projected.y, worldDepthM, mapWorldTransform);
      group.rotation.y = -robot.headingRad + Math.PI / 2;

      const meta = group.userData as RobotMeta;
      meta.mode = robot.mode;
    });

    robotMap.forEach((group, id) => {
      if (activeIds.has(id)) return;
      robotGroup.remove(group);
      group.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return;
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((material) => material.dispose());
        } else {
          child.material.dispose();
        }
      });
      robotMap.delete(id);
    });
  }, [mapWorldTransform, robots, worldDepthM, worldWidthM]);

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <div ref={mountRef} style={{ width: "100%", height: "100%" }} />
      <div
        style={{
          position: "absolute",
          right: 12,
          bottom: 10,
          pointerEvents: "none",
          border: "1px solid rgba(255,255,255,0.22)",
          borderRadius: 999,
          padding: "0.2rem 0.52rem",
          fontSize: 11,
          letterSpacing: "0.08em",
          color: "rgba(232,240,255,0.92)",
          background: "rgba(8, 14, 26, 0.56)",
          textTransform: "uppercase",
          display: "grid",
          gap: 2,
        }}
      >
        입체 지도 보기
        {mapImageSrc.startsWith("/api/3d-test/") ? (
          <>
            <span style={{ opacity: 0.8, textTransform: "none" }}>
              리소스: {modelState === "loaded" ? "3D model-first" : "embedded floor + procedural 3D"}
            </span>
            <span className="mono" style={{ opacity: 0.76, fontSize: 10, textTransform: "none", letterSpacing: 0 }}>
              floorplan: {resourceSource ?? "?"} · model: {modelSource ?? "?"}
            </span>
            <span className="mono" style={{ opacity: 0.74, fontSize: 10, textTransform: "none", letterSpacing: 0 }}>
              model load: {modelState}
              {modelState === "error" && modelError ? ` (${modelError})` : ""}
            </span>
            <span className="mono" style={{ opacity: 0.75, fontSize: 10, textTransform: "none", letterSpacing: 0 }}>
              {mapImageSrc.split("?")[0]}
            </span>
            {modelSrc ? (
              <span className="mono" style={{ opacity: 0.72, fontSize: 10, textTransform: "none", letterSpacing: 0 }}>
                {modelSrc.split("?")[0]}
              </span>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}
