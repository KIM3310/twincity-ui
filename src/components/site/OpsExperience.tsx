"use client";

import { useMemo, useState } from "react";
import MapView from "@/components/MapView";
import zoneMap from "@/data/zone_map_s001.json";
import { adaptRawEvent, normalizeEventFeed } from "@/lib/eventAdapter";
import { getEventTypeLabel, getZoneLabel } from "@/lib/labels";
import type { EventItem, ZoneMap } from "@/lib/types";

const MAX_EVENTS = 600;
const MANUAL_TAG_PREFIX = "manual-tag";

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

type IncomingSyncMode = "merge" | "replace";

type IncomingSyncBatch = {
  mode: IncomingSyncMode;
  upsert: EventItem[];
  removeIds: string[];
};

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  return value as Record<string, unknown>;
}

function readPath(record: Record<string, unknown>, path: string): unknown {
  const chunks = path.split(".");
  let cursor: unknown = record;
  for (const chunk of chunks) {
    if (!cursor || typeof cursor !== "object") return undefined;
    cursor = (cursor as Record<string, unknown>)[chunk];
  }
  return cursor;
}

function pickValue(record: Record<string, unknown>, paths: string[]): unknown {
  for (const path of paths) {
    const value = readPath(record, path);
    if (value !== undefined && value !== null) return value;
  }
  return undefined;
}

function parseMaybeJson(payload: unknown) {
  if (typeof payload !== "string") return payload;
  const trimmed = payload.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    return payload;
  }
}

function parseInputNumber(value: string) {
  const normalized = value.trim().replace(",", ".");
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function toIdString(value: unknown) {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function dedupeIds(ids: string[]) {
  return Array.from(new Set(ids));
}

function parseEventIdFromRecord(record: Record<string, unknown>) {
  return toIdString(
    pickValue(record, [
      "id",
      "event_id",
      "eventId",
      "uuid",
      "alarm_id",
      "alarmId",
      "alert_id",
      "alertId",
      "payload.id",
      "payload.event_id",
      "payload.eventId",
    ])
  );
}

function parseSyncModeValue(value: unknown): IncomingSyncMode | null {
  if (typeof value === "boolean") return value ? "replace" : "merge";
  if (typeof value !== "string") return null;
  const text = value.trim().toLowerCase();
  if (!text) return null;
  if (text.includes("replace") || text.includes("snapshot") || text.includes("full")) return "replace";
  if (text.includes("merge") || text.includes("upsert") || text.includes("delta")) return "merge";
  return null;
}

function parseSyncMode(record: Record<string, unknown>): IncomingSyncMode | null {
  return parseSyncModeValue(
    pickValue(record, [
      "sync_mode",
      "syncMode",
      "sync.mode",
      "sync.strategy",
      "payload.sync_mode",
      "payload.sync.mode",
      "meta.sync_mode",
      "meta.sync.mode",
      "payload.mode",
      "mode",
      "snapshot",
      "full_sync",
      "fullSync",
    ])
  );
}

function parseRecordOperation(record: Record<string, unknown>): "upsert" | "remove" | null {
  const opRaw = pickValue(record, [
    "op",
    "operation",
    "event_op",
    "event_operation",
    "sync.op",
    "sync.operation",
  ]);
  if (typeof opRaw !== "string") return null;
  const op = opRaw.trim().toLowerCase();
  if (["delete", "deleted", "remove", "removed", "clear", "cleared"].includes(op)) return "remove";
  if (["upsert", "create", "created", "insert", "update", "updated", "patch", "add"].includes(op)) {
    return "upsert";
  }
  return null;
}

function parseIdList(value: unknown) {
  if (!Array.isArray(value)) return [] as string[];
  const ids: string[] = [];
  for (const item of value) {
    if (typeof item === "string" || typeof item === "number") {
      const id = toIdString(item);
      if (id) ids.push(id);
      continue;
    }
    const record = asRecord(item);
    if (!record) continue;
    const id = parseEventIdFromRecord(record);
    if (id) ids.push(id);
  }
  return ids;
}

function collectRemoveIds(record: Record<string, unknown>) {
  const ids: string[] = [];

  for (const path of [
    "deleted_ids",
    "removed_ids",
    "delete_ids",
    "remove_ids",
    "payload.deleted_ids",
    "payload.removed_ids",
    "payload.delete_ids",
    "payload.remove_ids",
    "sync.deleted_ids",
    "sync.removed_ids",
    "payload.sync.deleted_ids",
    "payload.sync.removed_ids",
  ]) {
    ids.push(...parseIdList(pickValue(record, [path])));
  }

  for (const path of [
    "deleted",
    "removed",
    "payload.deleted",
    "payload.removed",
    "sync.deleted",
    "sync.removed",
    "payload.sync.deleted",
    "payload.sync.removed",
  ]) {
    ids.push(...parseIdList(pickValue(record, [path])));
  }

  if (parseRecordOperation(record) === "remove") {
    const id = parseEventIdFromRecord(record);
    if (id) ids.push(id);
  }

  return dedupeIds(ids);
}

function normalizeRecordsForSync(rows: unknown[]) {
  const upsertCandidates: unknown[] = [];
  const removeIds: string[] = [];

  for (const row of rows) {
    const record = asRecord(row);
    if (record && parseRecordOperation(record) === "remove") {
      const removeId = parseEventIdFromRecord(record);
      if (removeId) removeIds.push(removeId);
      continue;
    }
    upsertCandidates.push(row);
  }

  const upsert =
    upsertCandidates.length === 0
      ? ([] as EventItem[])
      : normalizeEventFeed(upsertCandidates, {
          maxEvents: MAX_EVENTS,
          fallbackStoreId: "s001",
          defaultSource: "api",
        });

  return {
    upsert,
    removeIds: dedupeIds(removeIds),
  };
}

function emptySyncBatch(mode: IncomingSyncMode = "merge"): IncomingSyncBatch {
  return { mode, upsert: [], removeIds: [] };
}

function normalizeIncomingPayload(payload: unknown): IncomingSyncBatch {
  const parsed = parseMaybeJson(payload);
  if (typeof parsed === "string") return emptySyncBatch();
  if (parsed === null || parsed === undefined) return emptySyncBatch();

  if (Array.isArray(parsed)) {
    const rows = normalizeRecordsForSync(parsed);
    return { mode: "merge", upsert: rows.upsert, removeIds: rows.removeIds };
  }

  const row = asRecord(parsed);
  if (!row) return emptySyncBatch();

  const mode = parseSyncMode(row) ?? "merge";
  const rootRemoveIds = collectRemoveIds(row);

  const arrayCandidate = pickValue(row, [
    "events",
    "data",
    "records",
    "results",
    "items",
    "alerts",
    "payload.events",
    "payload.records",
    "payload.items",
    "payload.alerts",
    "message.events",
    "message.items",
    "sync.events",
    "payload.sync.events",
  ]);

  if (Array.isArray(arrayCandidate)) {
    const rows = normalizeRecordsForSync(arrayCandidate);
    return {
      mode,
      upsert: rows.upsert,
      removeIds: dedupeIds([...rootRemoveIds, ...rows.removeIds]),
    };
  }

  const singleCandidate =
    pickValue(row, ["event", "alert", "payload.event", "payload.alert", "payload.data", "message.event"]) ?? row;

  const singleRecord = asRecord(singleCandidate);
  if (singleRecord && parseRecordOperation(singleRecord) === "remove") {
    const removeId = parseEventIdFromRecord(singleRecord);
    return {
      mode,
      upsert: [],
      removeIds: dedupeIds(removeId ? [...rootRemoveIds, removeId] : rootRemoveIds),
    };
  }

  const single = adaptRawEvent(singleCandidate, {
    fallbackStoreId: "s001",
    defaultSource: "api",
  });

  return {
    mode,
    upsert: single ? [single] : [],
    removeIds: rootRemoveIds,
  };
}

function mergeEvents(existing: EventItem[], incoming: EventItem[]) {
  const map = new Map<string, EventItem>(existing.map((event) => [event.id, event]));
  for (const event of incoming) {
    const prev = map.get(event.id);
    map.set(event.id, prev ? { ...prev, ...event } : event);
  }
  return Array.from(map.values())
    .sort((a, b) => {
      if (b.detected_at !== a.detected_at) return b.detected_at - a.detected_at;
      if (b.ingested_at !== a.ingested_at) return b.ingested_at - a.ingested_at;
      return a.id.localeCompare(b.id);
    })
    .slice(0, MAX_EVENTS);
}

function applyIncomingSyncBatch(existing: EventItem[], incoming: IncomingSyncBatch) {
  let next = incoming.mode === "replace" ? [...incoming.upsert] : mergeEvents(existing, incoming.upsert);
  if (incoming.removeIds.length > 0) {
    const removeSet = new Set(incoming.removeIds);
    next = next.filter((event) => !removeSet.has(event.id));
  }
  return next
    .sort((a, b) => {
      if (b.detected_at !== a.detected_at) return b.detected_at - a.detected_at;
      if (b.ingested_at !== a.ingested_at) return b.ingested_at - a.ingested_at;
      return a.id.localeCompare(b.id);
    })
    .slice(0, MAX_EVENTS);
}

function formatMeters(value?: number) {
  return Number.isFinite(value) ? Number(value).toFixed(2) : "-";
}

export default function OpsExperience() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const [jsonInput, setJsonInput] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [manualMode, setManualMode] = useState<"world" | "norm">("world");
  const [manualX, setManualX] = useState("");
  const [manualY, setManualY] = useState("");
  const [manualZoneId, setManualZoneId] = useState(zm.zones[0]?.zone_id ?? "zone-s001-center");

  const selectedEvent = useMemo(
    () => events.find((event) => event.id === selectedId),
    [events, selectedId]
  );

  const applySync = (payload: unknown, source: "file" | "text") => {
    const incoming = normalizeIncomingPayload(payload);
    const hasMutation = incoming.mode === "replace" || incoming.upsert.length > 0 || incoming.removeIds.length > 0;
    if (!hasMutation) {
      setToast(`${source === "file" ? "파일" : "텍스트"}에서 반영할 이벤트가 없습니다.`);
      return;
    }

    setEvents((prev) => {
      const next = applyIncomingSyncBatch(prev, incoming);
      if (!selectedId && next.length > 0) setSelectedId(next[0].id);
      return next;
    });

    setToast(
      `동기화 완료 · mode=${incoming.mode} · upsert=${incoming.upsert.length} · remove=${incoming.removeIds.length}`
    );
  };

  const onUploadFile = async (file: File | null) => {
    if (!file) return;
    try {
      const text = await file.text();
      applySync(text, "file");
    } catch {
      setToast("파일을 읽지 못했습니다.");
    }
  };

  const onSyncText = () => {
    if (!jsonInput.trim()) {
      setToast("동기화할 JSON 텍스트를 입력해 주세요.");
      return;
    }
    applySync(jsonInput, "text");
  };

  const onAddManualTag = () => {
    const xRaw = parseInputNumber(manualX);
    const yRaw = parseInputNumber(manualY);
    if (xRaw === null || yRaw === null) {
      setToast("태그 좌표 X/Y를 숫자로 입력해 주세요.");
      return;
    }

    const now = Date.now();
    const tagId = `${MANUAL_TAG_PREFIX}-${now.toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

    let normX: number;
    let normY: number;
    let worldX: number;
    let worldZ: number;

    if (manualMode === "world") {
      worldX = xRaw;
      worldZ = yRaw;
      normX = clamp01((worldX - WORLD_OFFSET_X_M) / WORLD_WIDTH_M);
      normY = clamp01((worldZ - WORLD_OFFSET_Z_M) / WORLD_DEPTH_M);
    } else {
      normX = xRaw >= 0 && xRaw <= 1 ? xRaw : xRaw >= 0 && xRaw <= 100 ? xRaw / 100 : NaN;
      normY = yRaw >= 0 && yRaw <= 1 ? yRaw : yRaw >= 0 && yRaw <= 100 ? yRaw / 100 : NaN;
      if (!Number.isFinite(normX) || !Number.isFinite(normY)) {
        setToast("정규화 좌표는 0..1 또는 0..100 범위로 입력해 주세요.");
        return;
      }
      normX = clamp01(normX);
      normY = clamp01(normY);
      worldX = WORLD_OFFSET_X_M + normX * WORLD_WIDTH_M;
      worldZ = WORLD_OFFSET_Z_M + normY * WORLD_DEPTH_M;
    }

    const payload = {
      eventId: tagId,
      timestamp: now,
      eventType: "unknown",
      severity: 2,
      confidence: 0.99,
      zone_id: manualZoneId,
      source: "camera",
      label: "manual-tag",
      status: "manual_tag",
      x_norm: normX,
      y_norm: normY,
      world: { x: worldX, z: worldZ },
      note:
        manualMode === "world"
          ? `manual world (${worldX.toFixed(2)}, ${worldZ.toFixed(2)})`
          : `manual norm (${normX.toFixed(3)}, ${normY.toFixed(3)})`,
    };

    const normalized = adaptRawEvent(payload, {
      fallbackStoreId: "s001",
      defaultSource: "camera",
    });

    if (!normalized) {
      setToast("태그 좌표를 이벤트로 변환하지 못했습니다.");
      return;
    }

    const manualEvent: EventItem = {
      ...normalized,
      id: tagId,
      zone_id: manualZoneId,
      object_label: "tag",
      raw_status: "manual_tag",
      world_x_m: worldX,
      world_z_m: worldZ,
    };

    setEvents((prev) => mergeEvents(prev, [manualEvent]));
    setSelectedId(tagId);
    setToast(
      `태그 추가 완료 · norm(${manualEvent.x.toFixed(3)}, ${manualEvent.y.toFixed(3)}) · world(${worldX.toFixed(2)}, ${worldZ.toFixed(2)})`
    );
  };

  const onClearManualTags = () => {
    setEvents((prev) => prev.filter((event) => !event.id.startsWith(MANUAL_TAG_PREFIX)));
    if (selectedId?.startsWith(MANUAL_TAG_PREFIX)) setSelectedId(undefined);
    setToast("수동 태그를 삭제했습니다.");
  };

  return (
    <section style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "grid", gap: 8 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700 }}>JSON 동기화 + 수동 태그</h2>
        <p style={{ opacity: 0.82 }}>
          요청 반영: JSON 매핑 동기화와 프론트 태그 추가 로직만 유지했습니다.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gap: 10,
          border: "1px solid rgba(170, 199, 247, 0.32)",
          borderRadius: 12,
          padding: 12,
          background: "rgba(8, 16, 29, 0.52)",
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          <input
            type="file"
            accept="application/json,.json"
            onChange={(event) => void onUploadFile(event.target.files?.[0] ?? null)}
          />
          <button type="button" className="opsPill" onClick={onSyncText}>
            텍스트 JSON 동기화
          </button>
          <button
            type="button"
            className="opsPill"
            onClick={() => {
              setEvents([]);
              setSelectedId(undefined);
              setToast("이벤트를 모두 비웠습니다.");
            }}
          >
            전체 비우기
          </button>
        </div>

        <textarea
          value={jsonInput}
          onChange={(event) => setJsonInput(event.target.value)}
          placeholder='여기에 JSON payload를 붙여넣고 "텍스트 JSON 동기화"를 누르세요.'
          style={{
            minHeight: 140,
            width: "100%",
            borderRadius: 10,
            border: "1px solid rgba(173, 202, 255, 0.34)",
            background: "rgba(4, 10, 20, 0.68)",
            color: "rgba(236,243,255,0.95)",
            padding: "0.6rem",
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
            fontSize: 12,
          }}
        />
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          onAddManualTag();
        }}
        style={{
          display: "grid",
          gap: 10,
          border: "1px solid rgba(170, 199, 247, 0.32)",
          borderRadius: 12,
          padding: 12,
          background: "rgba(8, 16, 29, 0.52)",
        }}
      >
        <strong>수동 태그 추가</strong>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <select value={manualMode} onChange={(event) => setManualMode(event.target.value as "world" | "norm")}> 
            <option value="world">world(x,z)</option>
            <option value="norm">norm(x,y)</option>
          </select>
          <input
            value={manualX}
            onChange={(event) => setManualX(event.target.value)}
            placeholder={manualMode === "world" ? "x (m)" : "x (0..1 or 0..100)"}
            inputMode="decimal"
          />
          <input
            value={manualY}
            onChange={(event) => setManualY(event.target.value)}
            placeholder={manualMode === "world" ? "z (m)" : "y (0..1 or 0..100)"}
            inputMode="decimal"
          />
          <select value={manualZoneId} onChange={(event) => setManualZoneId(event.target.value)}>
            {zm.zones.map((zone) => (
              <option key={zone.zone_id} value={zone.zone_id}>
                {getZoneLabel(zone.zone_id)}
              </option>
            ))}
          </select>
          <button type="submit" className="opsPill">
            태그 추가
          </button>
          <button type="button" className="opsPill" onClick={onClearManualTags}>
            수동 태그 삭제
          </button>
        </div>
      </form>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
        <article style={{ minWidth: 0 }}>
          <MapView events={events} selectedId={selectedId} onSelect={setSelectedId} />
        </article>

        <aside
          style={{
            border: "1px solid rgba(170, 199, 247, 0.32)",
            borderRadius: 12,
            padding: 12,
            background: "rgba(8, 16, 29, 0.52)",
            display: "grid",
            gap: 10,
            alignContent: "start",
          }}
        >
          <strong>선택 정보</strong>
          {selectedEvent ? (
            <>
              <p>ID: <span className="mono">{selectedEvent.id}</span></p>
              <p>타입: {getEventTypeLabel(selectedEvent.type)}</p>
              <p>구역: {getZoneLabel(selectedEvent.zone_id)}</p>
              <p>norm: <span className="mono">({selectedEvent.x.toFixed(3)}, {selectedEvent.y.toFixed(3)})</span></p>
              <p>world: <span className="mono">({formatMeters(selectedEvent.world_x_m)}, {formatMeters(selectedEvent.world_z_m)})</span></p>
            </>
          ) : (
            <p style={{ opacity: 0.76 }}>지도의 마커를 선택해 주세요.</p>
          )}

          <hr style={{ borderColor: "rgba(170, 199, 247, 0.2)" }} />

          <strong>이벤트 목록 ({events.length})</strong>
          <div style={{ display: "grid", gap: 6, maxHeight: 360, overflow: "auto" }}>
            {events.length === 0 ? (
              <p style={{ opacity: 0.76 }}>입력된 이벤트가 없습니다.</p>
            ) : (
              events.map((event) => (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => setSelectedId(event.id)}
                  style={{
                    textAlign: "left",
                    borderRadius: 8,
                    border: event.id === selectedId ? "1px solid rgba(168,208,255,0.55)" : "1px solid rgba(168,208,255,0.22)",
                    padding: "0.38rem 0.46rem",
                    background: event.id === selectedId ? "rgba(129, 178, 255, 0.2)" : "rgba(12, 18, 32, 0.52)",
                    color: "rgba(228, 240, 255, 0.95)",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 700 }}>{getEventTypeLabel(event.type)}</div>
                  <div className="mono" style={{ fontSize: 11, opacity: 0.82 }}>
                    {event.id}
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>
      </div>

      {toast ? (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: "fixed",
            right: 20,
            bottom: 20,
            borderRadius: 10,
            border: "1px solid rgba(158, 204, 255, 0.44)",
            background: "rgba(6, 15, 30, 0.82)",
            color: "rgba(235, 243, 255, 0.97)",
            padding: "0.5rem 0.7rem",
            boxShadow: "0 12px 24px rgba(0,0,0,0.32)",
          }}
        >
          {toast}
        </div>
      ) : null}
    </section>
  );
}
