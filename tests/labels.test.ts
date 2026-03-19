import { describe, expect, test } from "vitest";

import {
  getActorLabel,
  getCameraLabel,
  getEventIdLabel,
  getEventTypeLabel,
  getIncidentStatusLabel,
  getLiveStateLabel,
  getSourceLabel,
  getStoreLabel,
  getTrackLabel,
  getZoneLabel,
} from "../src/lib/labels";

describe("labels", () => {
  test("getEventTypeLabel returns Korean labels for all event types", () => {
    expect(getEventTypeLabel("crowd")).toBe("사람 몰림");
    expect(getEventTypeLabel("fall")).toBe("넘어짐");
    expect(getEventTypeLabel("fight")).toBe("다툼");
    expect(getEventTypeLabel("loitering")).toBe("오래 머묾");
    expect(getEventTypeLabel("unknown")).toBe("알 수 없음");
    expect(getEventTypeLabel("all")).toBe("전체");
  });

  test("getIncidentStatusLabel returns labels for all statuses", () => {
    expect(getIncidentStatusLabel("new")).toBe("새 알림");
    expect(getIncidentStatusLabel("ack")).toBe("확인함");
    expect(getIncidentStatusLabel("resolved")).toBe("처리 완료");
  });

  test("getLiveStateLabel distinguishes live and historical", () => {
    expect(getLiveStateLabel(true)).toBe("지금");
    expect(getLiveStateLabel(false)).toBe("지난 기록");
  });

  test("getZoneLabel handles known zones, zone- prefix, and fallbacks", () => {
    expect(getZoneLabel("zone-s001-cashier")).toBe("계산대 앞");
    expect(getZoneLabel("zone-s001-entrance")).toBe("입구");
    expect(getZoneLabel("zone-custom")).toBe("매장 구역");
    expect(getZoneLabel("random-zone")).toBe("random-zone");
    expect(getZoneLabel(null)).toBe("-");
    expect(getZoneLabel(undefined)).toBe("-");
  });

  test("getStoreLabel handles known stores and fallbacks", () => {
    expect(getStoreLabel("s001")).toBe("본 매장");
    expect(getStoreLabel("s999")).toBe("매장");
    expect(getStoreLabel(null)).toBe("-");
  });

  test("getCameraLabel handles known cameras and fallbacks", () => {
    expect(getCameraLabel("cam-front-01")).toBe("입구 카메라");
    expect(getCameraLabel("cam-unknown")).toBe("카메라");
    expect(getCameraLabel("sensor-01")).toBe("sensor-01");
    expect(getCameraLabel(null)).toBe("-");
  });

  test("getActorLabel handles ops- prefix and demo actors", () => {
    expect(getActorLabel("ops-team-lead")).toBe("현장 담당자");
    expect(getActorLabel("demo")).toBe("시스템");
    expect(getActorLabel("admin")).toBe("admin");
    expect(getActorLabel(null)).toBe("-");
  });

  test("getSourceLabel returns correct labels", () => {
    expect(getSourceLabel("camera")).toBe("카메라");
    expect(getSourceLabel("api")).toBe("외부 연동");
    expect(getSourceLabel("demo")).toBe("연습 데이터");
    expect(getSourceLabel("unknown")).toBe("기타");
    expect(getSourceLabel(null)).toBe("기타");
  });

  test("getEventIdLabel extracts tail hash from event ids", () => {
    expect(getEventIdLabel("evt-abc123xyz")).toBe("#123XYZ");
    expect(getEventIdLabel(null)).toBe("-");
    expect(getEventIdLabel("")).toBe("-");
  });

  test("getTrackLabel returns track or event-based fallback", () => {
    expect(getTrackLabel("42")).toContain("대상");
    expect(getTrackLabel("42")).toContain("42");
    expect(getTrackLabel(null, "evt-abc123")).toContain("대상");
    expect(getTrackLabel(null, "evt-abc123")).toContain("#");
  });
});
