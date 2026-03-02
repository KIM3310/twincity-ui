type AssetProbeResult = {
  exists: boolean;
  path: string;
};

type CacheEntry = {
  expiresAt: number;
  value: AssetProbeResult;
};

const DEFAULT_TTL_MS = 10_000;
const MAX_CACHE_ENTRIES = 64;
const probeCache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<AssetProbeResult>>();

function makeCacheKey(origin: string, candidates: readonly string[]) {
  return `${origin}|${candidates.join("|")}`;
}

async function probeCandidate(origin: string, candidate: string): Promise<boolean> {
  const url = new URL(candidate, origin).toString();

  try {
    const head = await fetch(url, { method: "HEAD", cache: "no-store" });
    if (head.ok) return true;
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

function pruneExpiredCache(now: number) {
  for (const [key, entry] of probeCache.entries()) {
    if (entry.expiresAt <= now) {
      probeCache.delete(key);
    }
  }
}

function trimCacheSize() {
  while (probeCache.size > MAX_CACHE_ENTRIES) {
    const firstKey = probeCache.keys().next().value;
    if (typeof firstKey !== "string") break;
    probeCache.delete(firstKey);
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
  pruneExpiredCache(now);
  const cached = probeCache.get(key);
  if (cached && cached.expiresAt > now) {
    // Keep most-recently-used ordering.
    probeCache.delete(key);
    probeCache.set(key, cached);
    return cached.value;
  }
  if (cached) probeCache.delete(key);

  const pending = inFlight.get(key);
  if (pending) return pending;

  const probePromise = (async () => {
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
    trimCacheSize();
    return resolved;
  })();

  inFlight.set(key, probePromise);
  try {
    return await probePromise;
  } finally {
    inFlight.delete(key);
  }
}

export function clearAssetProbeCache() {
  probeCache.clear();
  inFlight.clear();
}
