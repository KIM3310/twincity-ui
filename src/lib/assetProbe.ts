type AssetProbeResult = {
  exists: boolean;
  path: string;
};

type CacheEntry = {
  expiresAt: number;
  value: AssetProbeResult;
};

const DEFAULT_TTL_MS = 10_000;
const probeCache = new Map<string, CacheEntry>();

function makeCacheKey(origin: string, candidates: readonly string[]) {
  return `${origin}|${candidates.join("|")}`;
}

async function probeCandidate(origin: string, candidate: string): Promise<boolean> {
  const url = new URL(candidate, origin).toString();

  try {
    const head = await fetch(url, { method: "HEAD", cache: "no-store" });
    if (head.ok) return true;
    if (head.status !== 405 && head.status !== 501) return false;
  } catch {
    // Fall through and try GET once.
  }

  try {
    const get = await fetch(url, { cache: "no-store" });
    return get.ok;
  } catch {
    return false;
  }
}

export async function resolveFirstAvailableAsset(
  request: Request,
  candidates: readonly string[],
  ttlMs = DEFAULT_TTL_MS
): Promise<AssetProbeResult> {
  const origin = new URL(request.url).origin;
  const key = makeCacheKey(origin, candidates);
  const now = Date.now();
  const cached = probeCache.get(key);
  if (cached && cached.expiresAt > now) return cached.value;

  let resolved: AssetProbeResult = {
    exists: false,
    path: candidates[0] ?? "",
  };

  for (const candidate of candidates) {
    if (await probeCandidate(origin, candidate)) {
      resolved = { exists: true, path: candidate };
      break;
    }
  }

  probeCache.set(key, {
    expiresAt: now + Math.max(0, ttlMs),
    value: resolved,
  });

  return resolved;
}

export function clearAssetProbeCache() {
  probeCache.clear();
}
