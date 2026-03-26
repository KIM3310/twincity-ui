import { afterEach, describe, expect, test } from "vitest";

import {
  authorizeOperatorRequest,
  readOperatorAuthStatus,
  validateOperatorRequest,
} from "../src/lib/operatorAccess";

afterEach(() => {
  delete process.env.TWINCITY_EXPORT_OPERATOR_TOKEN;
  delete process.env.TWINCITY_EXPORT_OPERATOR_ALLOWED_ROLES;
});

describe("operatorAccess", () => {
  test("readOperatorAuthStatus reports disabled when no token configured", () => {
    const status = readOperatorAuthStatus();
    expect(status.enabled).toBe(false);
    expect(status.header).toBe("x-operator-token");
    expect(status.bearer_supported).toBe(true);
    expect(status.required_roles).toEqual([]);
  });

  test("readOperatorAuthStatus reports enabled with configured token and roles", () => {
    process.env.TWINCITY_EXPORT_OPERATOR_TOKEN = "secret-token";
    process.env.TWINCITY_EXPORT_OPERATOR_ALLOWED_ROLES = "dispatcher,supervisor";

    const status = readOperatorAuthStatus();
    expect(status.enabled).toBe(true);
    expect(status.required_roles).toEqual(["dispatcher", "supervisor"]);
  });

  test("validateOperatorRequest allows all requests when no token is configured", () => {
    const request = new Request("https://example.com");
    const result = validateOperatorRequest(request);
    expect(result.ok).toBe(true);
    expect(result.reason).toBeNull();
  });

  test("validateOperatorRequest rejects missing token", () => {
    process.env.TWINCITY_EXPORT_OPERATOR_TOKEN = "secret";

    const request = new Request("https://example.com");
    const result = validateOperatorRequest(request);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("missing-token");
  });

  test("validateOperatorRequest accepts correct token via header", () => {
    process.env.TWINCITY_EXPORT_OPERATOR_TOKEN = "secret";

    const request = new Request("https://example.com", {
      headers: { "x-operator-token": "secret" },
    });
    const result = validateOperatorRequest(request);
    expect(result.ok).toBe(true);
  });

  test("validateOperatorRequest accepts token via Bearer authorization", () => {
    process.env.TWINCITY_EXPORT_OPERATOR_TOKEN = "secret";

    const request = new Request("https://example.com", {
      headers: { Authorization: "Bearer secret" },
    });
    const result = validateOperatorRequest(request);
    expect(result.ok).toBe(true);
  });

  test("validateOperatorRequest rejects wrong role", () => {
    process.env.TWINCITY_EXPORT_OPERATOR_TOKEN = "secret";
    process.env.TWINCITY_EXPORT_OPERATOR_ALLOWED_ROLES = "dispatcher,supervisor";

    const request = new Request("https://example.com", {
      headers: {
        "x-operator-token": "secret",
        "x-operator-role": "viewer",
      },
    });
    const result = validateOperatorRequest(request);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("missing-role");
  });

  test("validateOperatorRequest accepts matching role", () => {
    process.env.TWINCITY_EXPORT_OPERATOR_TOKEN = "secret";
    process.env.TWINCITY_EXPORT_OPERATOR_ALLOWED_ROLES = "dispatcher,supervisor";

    const request = new Request("https://example.com", {
      headers: {
        "x-operator-token": "secret",
        "x-operator-role": "Dispatcher",
      },
    });
    const result = validateOperatorRequest(request);
    expect(result.ok).toBe(true);
  });

  test("authorizeOperatorRequest returns boolean shorthand", () => {
    process.env.TWINCITY_EXPORT_OPERATOR_TOKEN = "secret";

    const bad = new Request("https://example.com");
    expect(authorizeOperatorRequest(bad)).toBe(false);

    const good = new Request("https://example.com", {
      headers: { "x-operator-token": "secret" },
    });
    expect(authorizeOperatorRequest(good)).toBe(true);
  });
});
