export type OperatorAuthStatus = {
  enabled: boolean;
  header: "x-operator-token";
  bearer_supported: true;
};

const OPERATOR_TOKEN_HEADER = "x-operator-token" as const;

function readExpectedToken(): string {
  return String(process.env.TWINCITY_EXPORT_OPERATOR_TOKEN || "").trim();
}

function readPresentedToken(request: Request): string {
  const headerToken = request.headers.get(OPERATOR_TOKEN_HEADER)?.trim();
  if (headerToken) {
    return headerToken;
  }

  const authHeader = request.headers.get("authorization")?.trim() || "";
  if (authHeader.toLowerCase().startsWith("bearer ")) {
    return authHeader.slice("bearer ".length).trim();
  }

  return "";
}

export function readOperatorAuthStatus(): OperatorAuthStatus {
  return {
    enabled: readExpectedToken().length > 0,
    header: OPERATOR_TOKEN_HEADER,
    bearer_supported: true,
  };
}

export function authorizeOperatorRequest(request: Request): boolean {
  const expected = readExpectedToken();
  if (!expected) {
    return true;
  }
  return readPresentedToken(request) === expected;
}
