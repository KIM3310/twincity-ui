"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import zoneMap from "@/data/zone_map_s001.json";
import MapWorld3D from "@/components/MapWorld3D";
import { clamp01, isLive } from "@/lib/geo";
import { getEventTypeLabel, getTrackLabel, getZoneLabel } from "@/lib/labels";
import type { EventItem, ZoneMap } from "@/lib/types";

type Props = {
  events: EventItem[];
  selectedId?: string;
  onSelect: (id?: string) => void;
  liveWindowMs?: number;
  debugOverlay?: boolean;
};

const FALLBACK_FLOOR_IMAGE = "/floorplan_wireframe_20241027_clean.png";
const EXTERNAL_FLOORPLAN_IMAGE = "/api/3d-test/floorplan";
const EXTERNAL_3D_TEST_MODEL = "/api/3d-test/model";

function formatMeters(value?: number) {
  return Number.isFinite(value) ? Number(value).toFixed(2) : "-";
}

export default function MapView({
  events,
  selectedId,
  onSelect,
  liveWindowMs = 60 * 60 * 1000,
  debugOverlay = false,
}: Props) {
  const zm = zoneMap as ZoneMap;

  const worldWidthM = Number.isFinite(Number(zm.map.world?.width_m))
    ? Math.max(0.001, Number(zm.map.world?.width_m))
    : 9.0;
  const worldDepthM = Number.isFinite(Number(zm.map.world?.depth_m))
    ? Math.max(0.001, Number(zm.map.world?.depth_m))
    : 4.8;

  const mapImageSrc2d = useMemo(() => {
    const imageName = zm.map.image_name?.trim();
    if (!imageName) return FALLBACK_FLOOR_IMAGE;
    return imageName.startsWith("/") ? imageName : `/${imageName}`;
  }, [zm.map.image_name]);

  const [viewMode, setViewMode] = useState<"2d" | "3d">("2d");
  const [threeCacheBust, setThreeCacheBust] = useState(0);

  const floorplan3dSrc = `${EXTERNAL_FLOORPLAN_IMAGE}?v=${threeCacheBust}`;
  const model3dSrc = `${EXTERNAL_3D_TEST_MODEL}?v=${threeCacheBust}`;

  const vbW = 1000;
  const vbH = Math.round(vbW * (zm.map.height / zm.map.width));

  const selectedEvent = events.find((event) => event.id === selectedId);

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
              src={mapImageSrc2d}
              alt="floorplan"
              fill
              style={{ objectFit: "cover", opacity: 0.97 }}
              priority
            />

            <svg
              viewBox={`0 0 ${vbW} ${vbH}`}
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
              onClick={() => onSelect(undefined)}
            >
              {debugOverlay &&
                zm.zones.map((zone) => {
                  const points = (zone.polygon ?? [])
                    .filter((pair): pair is number[] => Array.isArray(pair) && pair.length >= 2)
                    .map(([x, y]) => `${(x / zm.map.width) * vbW},${(y / zm.map.height) * vbH}`)
                    .join(" ");
                  return (
                    <g key={zone.zone_id}>
                      <polygon
                        points={points}
                        fill="rgba(87, 166, 255, 0.12)"
                        stroke="rgba(160, 209, 255, 0.6)"
                        strokeWidth={2}
                      />
                      <text
                        x={(Number(zone.centroid?.[0] ?? 0) / zm.map.width) * vbW}
                        y={(Number(zone.centroid?.[1] ?? 0) / zm.map.height) * vbH}
                        fill="rgba(236,241,250,0.9)"
                        fontSize={14}
                        fontWeight={700}
                        textAnchor="middle"
                        style={{ pointerEvents: "none", userSelect: "none" }}
                      >
                        {getZoneLabel(zone.zone_id)}
                      </text>
                    </g>
                  );
                })}

              {events.map((event) => {
                const live = isLive(event.detected_at, liveWindowMs);
                const isAlert = event.raw_status?.toLowerCase() === "fall_down" || event.type === "fall";
                const radius = isAlert ? 11 : event.severity === 2 ? 8 : 7;
                const x = clamp01(event.x);
                const y = clamp01(event.y);
                const cx = x * vbW;
                const cy = y * vbH;
                const selected = event.id === selectedId;

                return (
                  <g
                    key={event.id}
                    onClick={(evt) => {
                      evt.stopPropagation();
                      onSelect(event.id);
                    }}
                    style={{ cursor: "pointer" }}
                  >
                    <circle cx={cx} cy={cy} r={Math.max(14, radius + 6)} fill="transparent" />
                    <circle
                      cx={cx}
                      cy={cy}
                      r={selected ? radius + 11 : radius + 7}
                      fill={
                        isAlert
                          ? "rgba(255,74,93,0.24)"
                          : live
                            ? "rgba(89,176,255,0.18)"
                            : "rgba(109,130,160,0.18)"
                      }
                    />
                    <circle
                      cx={cx}
                      cy={cy}
                      r={radius}
                      fill={
                        isAlert
                          ? "rgba(255,74,93,0.96)"
                          : event.severity === 2
                            ? "rgba(255,201,87,0.93)"
                            : live
                              ? "rgba(87,166,255,0.92)"
                              : "rgba(121,150,196,0.84)"
                      }
                      stroke={selected ? "white" : "rgba(0,0,0,0.26)"}
                      strokeWidth={selected ? 3 : 1}
                    />
                  </g>
                );
              })}
            </svg>
          </>
        ) : (
          <MapWorld3D
            events={events}
            selectedId={selectedId}
            onSelect={onSelect}
            liveWindowMs={liveWindowMs}
            mapImageSrc={floorplan3dSrc}
            modelSrc={model3dSrc}
            worldWidthM={worldWidthM}
            worldDepthM={worldDepthM}
            resourceSource="downloads"
            modelSource="downloads"
          />
        )}

        <div style={{ position: "absolute", right: 10, top: 10, display: "flex", gap: 6 }}>
          <button
            type="button"
            className={"opsPill" + (viewMode === "2d" ? " active" : "")}
            onClick={() => setViewMode("2d")}
            aria-pressed={viewMode === "2d"}
          >
            평면
          </button>
          <button
            type="button"
            className={"opsPill" + (viewMode === "3d" ? " active" : "")}
            onClick={() => {
              setThreeCacheBust(Date.now());
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
          padding: "0.34rem 0.5rem 0.5rem",
          fontSize: 11,
          display: "grid",
          gap: 6,
        }}
      >
        {selectedEvent ? (
          <>
            <p>
              <strong>{getEventTypeLabel(selectedEvent.type)}</strong> · {getTrackLabel(selectedEvent.track_id, selectedEvent.id)}
            </p>
            <p>
              구역 {getZoneLabel(selectedEvent.zone_id)} · norm ({selectedEvent.x.toFixed(3)}, {selectedEvent.y.toFixed(3)})
            </p>
            <p>
              world ({formatMeters(selectedEvent.world_x_m)}m, {formatMeters(selectedEvent.world_z_m)}m)
            </p>
          </>
        ) : (
          <p style={{ opacity: 0.74 }}>지도의 마커를 누르면 선택 정보가 표시됩니다.</p>
        )}
      </div>
    </div>
  );
}
