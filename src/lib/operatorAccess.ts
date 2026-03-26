export type OperatorAuthStatus = {
  enabled: boolean;
  header: "x-operator-token";
  bearer_supported: true;
  role_headers: ["x-operator-role", "x-operator-roles"];
  required_roles: string[];
};

export type OperatorAuthorizationResult = {
  ok: boolean;
  reason: "missing-token" | "missing-role" | null;
};

const OPERATOR_TOKEN_HEADER = "x-operator-token" as const;
const OPERATOR_ROLE_HEADERS = ["x-operator-role", "x-operator-roles"] as const;

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

function readRequiredRoles(): string[] {
  return String(process.env.TWINCITY_EXPORT_OPERATOR_ALLOWED_ROLES || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

function readPresentedRoles(request: Request): string[] {
  return OPERATOR_ROLE_HEADERS.flatMap((header) => {
    const raw = request.headers.get(header)?.trim() || "";
    return raw ? raw.split(",") : [];
  })
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

export function readOperatorAuthStatus(): OperatorAuthStatus {
  return {
    enabled: readExpectedToken().length > 0,
    header: OPERATOR_TOKEN_HEADER,
    bearer_supported: true,
    role_headers: [...OPERATOR_ROLE_HEADERS],
    required_roles: readRequiredRoles(),
  };
}

export function authorizeOperatorRequest(request: Request): boolean {
  return validateOperatorRequest(request).ok;
}

export function validateOperatorRequest(
  request: Request
): OperatorAuthorizationResult {
  const expected = readExpectedToken();
  if (!expected) {
    return { ok: true, reason: null };
  }
  if (readPresentedToken(request) !== expected) {
    return { ok: false, reason: "missing-token" };
  }
  const requiredRoles = readRequiredRoles();
  if (requiredRoles.length === 0) {
    return { ok: true, reason: null };
  }
  const presentedRoles = readPresentedRoles(request);
  if (presentedRoles.some((role) => requiredRoles.includes(role))) {
    return { ok: true, reason: null };
  }
  return { ok: false, reason: "missing-role" };
}
