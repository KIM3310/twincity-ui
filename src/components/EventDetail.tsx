"use client";

import type { EventItem } from "@/lib/types";
import { isLive } from "@/lib/geo";
import { DEFAULT_LIVE_WINDOW_MS } from "@/lib/dummy";
import {
  getCameraLabel,
  getEventTypeLabel,
  getIncidentStatusLabel,
  getLiveStateLabel,
  getSourceLabel,
  getZoneLabel,
} from "@/lib/labels";

function recommendedAction(event: EventItem) {
  if (event.severity === 3) return "지금 바로 직원 호출과 현장 확인이 필요해요.";
  if (event.severity === 2) return "빠르게 확인하고 잠시 더 지켜보면 좋아요.";
  return "기록해두고 상황이 변하는지 확인해 주세요.";
}

function getNextStepSummary(event: EventItem, readOnly: boolean) {
  if (readOnly) {
    return {
      title: "다음 권장 단계",
      body: "이 화면은 reviewer 보기 모드라서 상태 변경 대신 현재 판단 근거와 다음 담당자만 확인할 수 있어요.",
      guard: "보기 권한에서는 상태 변경 버튼이 비활성화됩니다.",
    };
  }

  if (event.incident_status === "resolved") {
    return {
      title: "다음 권장 단계",
      body: "이미 처리 완료된 건이라면 메모와 timeline만 확인하고, 재발 우려가 있으면 새 이벤트로 다시 열어 주세요.",
      guard: "상태 변경은 확인 → 직원 호출 → 처리 종료 순서로 맞추면 운영 설명이 깔끔해집니다.",
    };
  }

  if (event.incident_status === "ack") {
    return {
      title: "다음 권장 단계",
      body: "이미 담당자가 잡은 건이니 직원 호출과 현장 메모를 이어서 reviewer에게 handoff할 준비를 해 주세요.",
      guard: "상태 변경은 확인 → 직원 호출 → 처리 종료 순서로 맞추면 운영 설명이 깔끔해집니다.",
    };
  }

  return {
    title: "다음 권장 단계",
    body: "먼저 확인 처리로 담당자가 이 건을 잡았다는 신호를 남기고, 그다음 직원 호출 여부를 결정해 주세요.",
    guard: "상태 변경은 확인 → 직원 호출 → 처리 종료 순서로 맞추면 운영 설명이 깔끔해집니다.",
  };
}

export default function EventDetail({
  event,
  suggestedEvent,
  liveWindowMs = DEFAULT_LIVE_WINDOW_MS,
  readOnly = false,
  onAcknowledge,
  onDispatch,
  onResolve,
  onJumpToSuggested,
}: {
  event?: EventItem;
  suggestedEvent?: EventItem;
  liveWindowMs?: number;
  readOnly?: boolean;
  onAcknowledge?: (event: EventItem) => void;
  onDispatch?: (event: EventItem) => void;
  onResolve?: (event: EventItem) => void;
  onJumpToSuggested?: (eventId: string) => void;
}) {
  if (!event) {
    if (!suggestedEvent) {
      return (
        <div className="detailEmpty">
          필터에 맞는 알림이 아직 없어요. 지도에서 새 알림을 만들거나 필터를 넓혀 보세요.
        </div>
      );
    }

    return (
      <div className="detailEmpty">
        <strong>첫 확인 후보가 준비되어 있어요.</strong>
        <span>
          {getZoneLabel(suggestedEvent.zone_id)} · {getEventTypeLabel(suggestedEvent.type)} · S{suggestedEvent.severity}
        </span>
        <span>
          {suggestedEvent.incident_status === "resolved"
            ? "이미 종료된 건이지만 최근 처리 흐름을 보기 좋아요."
            : "아직 미해결이라 첫 클릭으로 운영 흐름을 설명하기 좋아요."}
        </span>
        <button
          type="button"
          className="opsBtn primary"
          onClick={() => onJumpToSuggested?.(suggestedEvent.id)}
        >
          추천 알림 열기
        </button>
      </div>
    );
  }

  const live = isLive(event.detected_at, liveWindowMs);
  const detected = new Date(event.detected_at).toLocaleString();
  const ingested = new Date(event.ingested_at).toLocaleString();
  const confidencePct = Math.round(event.confidence * 100);
  const statusLabel = getIncidentStatusLabel(event.incident_status);
  const liveStateLabel = getLiveStateLabel(live);
  const typeLabel = getEventTypeLabel(event.type);
  const canAck = !readOnly && event.incident_status === "new";
  const canResolve = !readOnly && event.incident_status !== "resolved";
  const canDispatch = !readOnly && event.incident_status !== "resolved";
  const nextStep = getNextStepSummary(event, readOnly);

  return (
    <div className="detailRoot">
      <div className="detailHeader">
        <div>
          <div className="detailTitle">{typeLabel} 사건</div>
          <div className="detailSubtitle">{recommendedAction(event)}</div>
        </div>
        <div className="detailBadges">
          <span className={`severityBadge sev-${event.severity}`}>S{event.severity}</span>
          <span className={`statusBadge ${event.incident_status}`}>{statusLabel}</span>
          <span className={`statusBadge ${live ? "new" : "resolved"}`}>{liveStateLabel}</span>
        </div>
      </div>

      <div className="detailGrid">
        <div className="detailField"><span className="detailLabel">발생 위치</span><span className="detailValue">{getZoneLabel(event.zone_id)}</span></div>
        <div className="detailField"><span className="detailLabel">카메라</span><span className="detailValue">{getCameraLabel(event.camera_id)}</span></div>
        <div className="detailField"><span className="detailLabel">알림 경로</span><span className="detailValue">{getSourceLabel(event.source)}</span></div>
        <div className="detailField"><span className="detailLabel">분석 버전</span><span className="detailValue">{event.model_version ?? "-"}</span></div>
        <div className="detailField"><span className="detailLabel">발생 시각</span><span className="detailValue mono">{detected}</span></div>
        <div className="detailField"><span className="detailLabel">화면 도착 시각</span><span className="detailValue mono">{ingested}</span></div>
        <div className="detailField"><span className="detailLabel">화면 반영 시간</span><span className="detailValue mono">{event.latency_ms}ms</span></div>
        <div className="detailField"><span className="detailLabel">신뢰도</span><span className="detailValue">{confidencePct}%</span></div>
        <div className="detailField"><span className="detailLabel">화면 위치</span><span className="detailValue">({event.x.toFixed(3)}, {event.y.toFixed(3)})</span></div>
        <div className="detailField"><span className="detailLabel">메모</span><span className="detailValue">{event.note ?? "-"}</span></div>
      </div>

      <div className="landingHonestyCard">
        <p className="kicker">{nextStep.title}</p>
        <strong>{nextStep.body}</strong>
        <p className="landingFirstClickNote">{nextStep.guard}</p>
      </div>

      <div className="actionStrip">
        <button
          type="button"
          className="opsBtn primary"
          onClick={() => onAcknowledge?.(event)}
          disabled={!canAck}
        >
          {canAck ? "확인했어요" : "확인 완료"}
        </button>
        <button
          type="button"
          className="opsBtn"
          onClick={() => onDispatch?.(event)}
          disabled={!canDispatch}
        >
          직원 호출
        </button>
        <button
          type="button"
          className="opsBtn ghost"
          onClick={() => onResolve?.(event)}
          disabled={!canResolve}
        >
          {canResolve ? "처리 끝내기" : "처리 완료"}
        </button>
      </div>

      <p className="detailHint">
        {readOnly
          ? "보기 권한에서는 상태 변경 버튼이 비활성화됩니다."
          : "아래 요약에서는 어떤 일인지, 누가 처리했는지 한눈에 볼 수 있어요."}
      </p>
    </div>
  );
}
