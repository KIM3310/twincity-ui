# twincity-ui Service-Grade SPECKIT

Last updated: 2026-03-08

## S - Scope
- 대상: digital twin ops console
- 이번 iteration 목표: `payload -> operator loop -> report contract`를 첫 화면에서 읽히게 만들기

## P - Product Thesis
- twincity-ui는 예쁜 맵 데모가 아니라 `control tower`여야 한다.
- 리뷰어는 백엔드가 없어도 `/api/health`, `/api/meta`, `/api/schema/report`, `/reports`만으로 운영 posture를 이해할 수 있어야 한다.

## E - Execution
- `control-tower-readiness-v1` surface 추가
- `control-tower-runtime-brief-v1` route 추가
- report export를 `twincity-report-v1` schema로 명시
- `/`, `/brand`, `/reports`에 readiness board를 연결
- `/reports` 상단에 review pack과 export contract 패널 추가
- health/meta route에 review 링크와 service-grade contract를 포함

## C - Criteria
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`
- route contract와 UI copy가 같은 readiness 언어를 사용

## K - Keep
- 현재의 intentional visual language
- demo-first reviewability
- spatial mapping과 event normalization 중심 구조

## I - Improve
- scenario replay presets
- authenticated operator handoff
- centralized incident history store

## T - Trace
- `src/lib/serviceMeta.ts`
- `src/components/site/ControlTowerReadiness.tsx`
- `src/app/api/health/route.ts`
- `src/app/api/runtime-brief/route.ts`
- `src/app/api/meta/route.ts`
- `src/app/api/schema/report/route.ts`
- `src/app/brand/page.tsx`
- `src/app/reports/page.tsx`
- `tests/runtimeRoutes.test.ts`
