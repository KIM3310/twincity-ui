import { apiJson, resolveRequestId } from "@/lib/apiResponse";
import { buildRuntimeMeta } from "@/lib/runtimeMeta";
import { buildControlTowerServiceMeta } from "@/lib/serviceMeta";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const requestId = resolveRequestId(request);
  const runtimeMeta = buildRuntimeMeta();
  const serviceMeta = buildControlTowerServiceMeta();

  return apiJson(
    {
      ok: true,
      request_id: requestId,
      service: runtimeMeta.service,
      status: runtimeMeta.status,
      now: runtimeMeta.generated_at,
      live_sources: runtimeMeta.live_sources,
      diagnostics: runtimeMeta.diagnostics,
      public_api_readiness: runtimeMeta.public_api_readiness,
      ops_contract: runtimeMeta.ops_contract,
      capabilities: [
        "service-metadata-surface",
        "runtime-brief-surface",
        "runtime-scorecard-surface",
        "korean-public-api-readiness",
        "report-schema-surface",
        "report-summary-surface",
        "dispatch-board-surface",
        "assignment-history-surface",
        "handoff-brief-surface",
        "response-playbook-surface",
        "architecture-bundle-surface",
        "proof-route-map-surface",
      ],
      service_grade: {
        readiness: serviceMeta.readiness_contract,
        runtime_brief: "/api/runtime-brief",
        runtime_scorecard: "/api/runtime-scorecard",
        public_apis: "/api/public-apis",
        report_schema: "/api/schema/report",
        report_summary: "/api/reports/summary",
        dispatch_board: "/api/reports/dispatch-board",
        assignment_history: "/api/reports/assignment-history",
        report_handoff: "/api/reports/handoff",
        response_playbook: "/api/reports/response-playbook",
        report_export: "/api/reports/export",
        architecture_bundle: "/api/reports/architecture-bundle",
        architecture_bundle_verify: "/api/reports/architecture-bundle/verify",
      },
      links: {
        proof_route_map: "/api/proof-route-map",
        meta: "/api/meta",
        runtime_brief: "/api/runtime-brief",
        runtime_scorecard: "/api/runtime-scorecard",
        public_apis: "/api/public-apis",
        report_schema: "/api/schema/report",
        report_summary: "/api/reports/summary",
        dispatch_board: "/api/reports/dispatch-board",
        assignment_history: "/api/reports/assignment-history",
        report_handoff: "/api/reports/handoff",
        response_playbook: "/api/reports/response-playbook",
        report_export: "/api/reports/export",
        architecture_bundle: "/api/reports/architecture-bundle",
        architecture_bundle_verify: "/api/reports/architecture-bundle/verify",
        reports: "/reports",
      },
    },
    { requestId }
  );
}
