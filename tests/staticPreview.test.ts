import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test, vi } from "vitest";
import ControlTowerReadiness from "../src/components/site/ControlTowerReadiness";
import StaticLink from "../preview/link";

vi.mock("next/link", () => import("../preview/link"));

describe("static preview onboarding", () => {
  test("starts at the incident console and labels server links as GitHub source", () => {
    const html = renderToStaticMarkup(createElement(ControlTowerReadiness, { variant: "static" }));
    expect(html).toContain('href="#incident-console"');
    expect(html).toContain("지도에서 체험 시작");
    expect(html).toContain('href="https://github.com/KIM3310/twincity-ui/blob/main/src/app/reports/page.tsx"');
    expect(html).toContain("리포트 소스 · GitHub");
    expect(html).toContain('href="https://github.com/KIM3310/twincity-ui/blob/main/src/app/api/runtime-brief/route.ts"');
    expect(html).toContain("런타임 API 소스 · GitHub");
    expect(html).toContain("서버 리포트 API는 이 체험에서 제공하지 않습니다");
    expect(html).not.toContain("운영 계약과 리포트 근거를 1분 안에 확인합니다");
  });

  test("keeps detailed guidance for the Next runtime", () => {
    const html = renderToStaticMarkup(createElement(ControlTowerReadiness, { variant: "compact" }));
    expect(html).toContain("운영 계약과 리포트 근거를 1분 안에 확인합니다");
    expect(html).toContain("처음 확인할 순서");
    expect(html).toContain("2분 빠른 검토");
    expect(html).not.toContain("지도에서 체험 시작");
  });

  test("keeps anchor and external destinations intact", () => {
    const anchor = renderToStaticMarkup(createElement(StaticLink, { href: "#incident-console" }, "Console"));
    const external = renderToStaticMarkup(createElement(StaticLink, { href: "https://example.test/guide" }, "Guide"));
    expect(anchor).toBe('<a href="#incident-console">Console</a>');
    expect(external).toBe('<a href="https://example.test/guide">Guide</a>');
  });
});
