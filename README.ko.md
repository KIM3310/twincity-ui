# TwinCity UI — 한국어 리뷰 입구

가장 빠른 리뷰 순서는 아래 두 파일입니다.
- `README.md`
- `docs/PORTFOLIO_REVIEW_GUIDE.md`

TwinCity UI는 **디지털 트윈 관제 / 운영 control tower** 성격의 Next.js(React/TypeScript) 프로젝트입니다.
핵심은 지도 자체보다도 아래 흐름을 **검토 가능한 운영 시스템**으로 보여주는 데 있습니다.

`ingest posture -> payload normalization -> triage -> dispatch -> SLA/report -> shift handoff`

## 2분 리뷰 경로
1. `/api/health`
2. `/api/meta`
3. `/api/runtime-scorecard`
4. `/api/reports/handoff`
5. `/reports`
6. `/events`

## 이 레포가 포트폴리오에서 강한 이유
- **AI / 시스템 엔지니어 관점:** 제각각인 provider payload를 하나의 운영 계약으로 정규화합니다.
- **제품 / 플랫폼 엔지니어 관점:** UI 전에 runtime posture를 먼저 검토할 수 있습니다.
- **솔루션 아키텍트 관점:** dispatch, handoff, export, 문서가 한 운영 이야기로 이어집니다.
- **신뢰성 관점:** demo 모드를 숨기지 않고 그대로 드러냅니다.

## 먼저 보면 좋은 파일
- `src/lib/eventAdapter.ts`
- `tests/eventAdapter.test.ts`
- `tests/runtimeRoutes.test.ts`
- `docs/PORTFOLIO_REVIEW_GUIDE.md`
- `docs/LIVE_INTEGRATION.md`
- `docs/ops/RUNBOOK.md`
- `public/screenshots/ops_console.png`

## 실행 / 검증
```bash
npm ci
npm run dev
npm run test:proof
npm run verify
```

## Live source 연결 (선택)
```bash
NEXT_PUBLIC_EVENT_WS_URL=wss://example.com/events
NEXT_PUBLIC_EVENT_STREAM_URL=https://example.com/events/stream
NEXT_PUBLIC_EVENT_API_URL=https://example.com/events
NEXT_PUBLIC_EVENT_POLL_MS=5000
```

아무 설정이 없으면 앱은 demo-first 상태로 동작하며, 그 상태에서도 리뷰 가능한 surface를 유지합니다.

## 미리 말해둘 한계
- demo 모드는 auth, noisy traffic, 중앙 저장소까지 증명하지는 않습니다.
- report는 중앙 incident store가 아니라 브라우저 로컬 상태를 요약합니다.
- 3D route는 production 렌더링 claim이 아니라 probe/review surface입니다.
