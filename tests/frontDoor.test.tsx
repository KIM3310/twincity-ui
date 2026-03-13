import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";

import DashboardPage from "@/app/page";

describe("front door", () => {
  test("keeps the recommended first click and proof path visible in SSR markup", () => {
    const html = renderToStaticMarkup(<DashboardPage />);

    expect(html).toContain("Recommended first click");
    expect(html).toContain("01 · 상태 확인");
    expect(html).toContain("/api/health");
    expect(html).toContain("health → reports → events");
    expect(html).toContain("health가 정상이면 reports로");
  });
});
