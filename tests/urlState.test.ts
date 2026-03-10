import { describe, expect, test } from "vitest";

import {
  buildOpsUrlSearch,
  buildReportsUrlSearch,
  parseOpsUrlState,
  parseReportsUrlState,
} from "@/lib/urlState";

describe("urlState", () => {
  test("parses operator query state", () => {
    const state = parseOpsUrlState(
      "?event=evt-77&type=fall&zone=zone-a&sev=3&open=1&mode=demo&role=admin&window=90"
    );

    expect(state).toEqual({
      selectedId: "evt-77",
      typeFilter: "fall",
      zoneFilter: "zone-a",
      minSeverity: 3,
      openOnly: true,
      feedMode: "demo",
      role: "admin",
      liveWindowMin: 90,
    });
  });

  test("serializes operator query state without default noise", () => {
    expect(
      buildOpsUrlSearch(
        {
          selectedId: undefined,
          typeFilter: "all",
          zoneFilter: "all",
          minSeverity: 1,
          openOnly: false,
          feedMode: "live",
          role: "operator",
          liveWindowMin: 60,
        },
        {
          defaultFeedMode: "live",
        }
      )
    ).toBe("");

    expect(
      buildOpsUrlSearch(
        {
          selectedId: "evt-9",
          typeFilter: "fall",
          zoneFilter: "zone-b",
          minSeverity: 2,
          openOnly: true,
          feedMode: "demo",
          role: "viewer",
          liveWindowMin: 120,
        },
        {
          defaultFeedMode: "live",
        }
      )
    ).toBe(
      "event=evt-9&type=fall&zone=zone-b&sev=2&open=1&mode=demo&role=viewer&window=120"
    );
  });

  test("parses and serializes reports query state", () => {
    const parsed = parseReportsUrlState("?range=60m&severity=3&zone=zone-c");
    expect(parsed).toEqual({
      range: "60m",
      severityFilter: "3",
      zoneFilter: "zone-c",
    });

    expect(
      buildReportsUrlSearch({
        range: "60m",
        severityFilter: "3",
        zoneFilter: "zone-c",
      })
    ).toBe("range=60m&severity=3&zone=zone-c");
  });

  test("ignores unsupported query values", () => {
    expect(parseOpsUrlState("?type=trash&sev=9&mode=ghost&role=owner")).toEqual({});
    expect(parseReportsUrlState("?range=7d&severity=9")).toEqual({});
  });
});
