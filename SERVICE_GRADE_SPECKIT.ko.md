# twincity-ui Service-Grade SPECKIT

Last updated: 2026-03-08

## S - Scope
- 대상: digital twin ops console
- baseline 목표: event normalization, replay UX, control tower 시각 언어를 서비스 수준으로 정리

## P - Product Thesis
- twincity-ui는 단순 시각화가 아니라 `ops decision console`이어야 한다.
- 리뷰어는 payload -> normalization -> control decision 흐름을 UI에서 바로 읽을 수 있어야 한다.

## E - Execution
- live/replay 데이터 경계와 sample payload를 명확히 유지
- operator workflow, report export, runtime signals를 전면에 노출
- CI와 preview build가 계속 green 하도록 유지

## C - Criteria
- build/test green
- demo 스크린과 README로 제품 목적이 명확함
- event contract와 replay surface가 깨지지 않음

## K - Keep
- intentional UI language
- ops console 중심 정보 구조

## I - Improve
- scenario gallery와 playback controls 강화
- contract docs와 screenshot pack 추가

## T - Trace
- `README.md`
- `src/`
- `docs/`
- `.github/workflows/`

