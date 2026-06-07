export type PublicApiSignalGroup =
  | "city-context"
  | "mobility"
  | "weather-environment"
  | "public-safety";

export type KoreanPublicApiSignal = {
  id: string;
  name: string;
  group: PublicApiSignalGroup;
  provider: string;
  reference_url: string;
  secret_names: string[];
  operational_signal: string;
  activation_path: string;
};

export type KoreanPublicApiReadiness = {
  schema: "korean-public-api-readiness-v1";
  source_catalog: {
    name: "yybmion/public-apis-4Kr";
    url: string;
  };
  configured_source_count: number;
  total_source_count: number;
  configured_group_count: number;
  total_group_count: number;
  missing_secret_names: string[];
  groups: {
    id: PublicApiSignalGroup;
    label: string;
    configured: boolean;
    configured_sources: number;
    total_sources: number;
    sources: {
      id: string;
      name: string;
      provider: string;
      configured: boolean;
      secret_names: string[];
      operational_signal: string;
      activation_path: string;
      reference_url: string;
    }[];
  }[];
  next_action: string;
};

const PUBLIC_API_CATALOG_URL = "https://github.com/yybmion/public-apis-4Kr";

const SIGNAL_GROUPS: { id: PublicApiSignalGroup; label: string }[] = [
  { id: "city-context", label: "City and facility context" },
  { id: "mobility", label: "Traffic and movement signal" },
  { id: "weather-environment", label: "Weather and environmental risk" },
  { id: "public-safety", label: "Public safety and incident context" },
];

const KOREAN_PUBLIC_API_SIGNALS: KoreanPublicApiSignal[] = [
  {
    id: "seoul-open-data",
    name: "Seoul Open Data Plaza",
    group: "city-context",
    provider: "Seoul Metropolitan Government",
    reference_url: "https://data.seoul.go.kr/",
    secret_names: ["SEOUL_OPEN_DATA_API_KEY"],
    operational_signal: "district, facility, population, and civic operation overlays",
    activation_path: "Use as the primary city-context adapter before enabling live map overlays.",
  },
  {
    id: "data-go-kr-local-open-data",
    name: "Data.go.kr Local Public Data",
    group: "city-context",
    provider: "Korea Public Data Portal",
    reference_url: "https://www.data.go.kr/",
    secret_names: ["DATA_GO_KR_SERVICE_KEY"],
    operational_signal: "regional datasets for non-Seoul deployments and fallback public records",
    activation_path: "Map dataset-specific endpoints into EventItem metadata after service-key validation.",
  },
  {
    id: "topis-traffic",
    name: "Seoul TOPIS",
    group: "mobility",
    provider: "Seoul TOPIS",
    reference_url: "https://topis.seoul.go.kr/",
    secret_names: ["TOPIS_API_KEY"],
    operational_signal: "road congestion and traffic control context around managed zones",
    activation_path: "Attach traffic context to incident reports before dispatch recommendations.",
  },
  {
    id: "expressway-traffic",
    name: "Korea Expressway Open API",
    group: "mobility",
    provider: "Korea Expressway Corporation",
    reference_url: "https://www.ex.co.kr/",
    secret_names: ["EXPRESSWAY_API_KEY"],
    operational_signal: "intercity route risk and logistics delay context",
    activation_path: "Use only for deployments where incident response depends on expressway travel time.",
  },
  {
    id: "kma-api-hub",
    name: "KMA API Hub",
    group: "weather-environment",
    provider: "Korea Meteorological Administration",
    reference_url: "https://apiportal.kma.go.kr/",
    secret_names: ["KMA_API_KEY"],
    operational_signal: "weather alerts, short-range forecast, and weather-driven incident risk",
    activation_path: "Join forecast windows with incident timestamps before highlighting weather risk.",
  },
  {
    id: "airkorea",
    name: "AirKorea",
    group: "weather-environment",
    provider: "Korea Environment Corporation",
    reference_url: "https://www.airkorea.or.kr/",
    secret_names: ["AIRKOREA_API_KEY"],
    operational_signal: "air-quality risk around outdoor queue, event, and facility operations",
    activation_path: "Surface PM and air-quality risk in reports only after station matching is confirmed.",
  },
  {
    id: "safemap",
    name: "생활안전정보 SafeMap",
    group: "public-safety",
    provider: "Ministry of the Interior and Safety",
    reference_url: "https://www.safemap.go.kr/",
    secret_names: ["PUBLIC_SAFETY_API_KEY"],
    operational_signal: "public-safety risk layers for incident-prone areas",
    activation_path: "Use as contextual risk evidence, not as a substitute for local incident verification.",
  },
  {
    id: "national-fire-agency",
    name: "National Fire Agency Public Data",
    group: "public-safety",
    provider: "National Fire Agency",
    reference_url: "https://www.nfa.go.kr/",
    secret_names: ["NATIONAL_FIRE_API_KEY"],
    operational_signal: "fire response, emergency facility, and disaster-response context",
    activation_path: "Add to the response playbook only after endpoint SLA and attribution rules are checked.",
  },
];

function hasConfiguredSecret(env: NodeJS.ProcessEnv, secretName: string): boolean {
  return Boolean(env[secretName]?.trim());
}

function isSourceConfigured(source: KoreanPublicApiSignal, env: NodeJS.ProcessEnv): boolean {
  return source.secret_names.every((secretName) => hasConfiguredSecret(env, secretName));
}

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

export function listKoreanPublicApiSignals(): KoreanPublicApiSignal[] {
  return KOREAN_PUBLIC_API_SIGNALS.map((source) => ({
    ...source,
    secret_names: [...source.secret_names],
  }));
}

export function buildKoreanPublicApiReadiness(
  env: NodeJS.ProcessEnv = process.env
): KoreanPublicApiReadiness {
  const groups = SIGNAL_GROUPS.map((group) => {
    const groupSources = KOREAN_PUBLIC_API_SIGNALS.filter((source) => source.group === group.id);
    const sources = groupSources.map((source) => ({
      id: source.id,
      name: source.name,
      provider: source.provider,
      configured: isSourceConfigured(source, env),
      secret_names: [...source.secret_names],
      operational_signal: source.operational_signal,
      activation_path: source.activation_path,
      reference_url: source.reference_url,
    }));
    const configuredSources = sources.filter((source) => source.configured).length;

    return {
      id: group.id,
      label: group.label,
      configured: configuredSources > 0,
      configured_sources: configuredSources,
      total_sources: sources.length,
      sources,
    };
  });
  const configuredSourceCount = groups.reduce(
    (count, group) => count + group.configured_sources,
    0
  );
  const missingSecretNames = uniqueSorted(
    KOREAN_PUBLIC_API_SIGNALS.flatMap((source) =>
      isSourceConfigured(source, env) ? [] : source.secret_names
    )
  );

  return {
    schema: "korean-public-api-readiness-v1",
    source_catalog: {
      name: "yybmion/public-apis-4Kr",
      url: PUBLIC_API_CATALOG_URL,
    },
    configured_source_count: configuredSourceCount,
    total_source_count: KOREAN_PUBLIC_API_SIGNALS.length,
    configured_group_count: groups.filter((group) => group.configured).length,
    total_group_count: groups.length,
    missing_secret_names: missingSecretNames,
    groups,
    next_action:
      configuredSourceCount > 0
        ? "Validate each configured provider endpoint with recorded fixtures before enabling live overlays."
        : "Configure the first provider secret for city context, mobility, weather, or public-safety enrichment.",
  };
}
