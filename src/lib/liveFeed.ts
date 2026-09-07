export type FeedTransport = "ws" | "sse" | "poll";
export type FeedState = { transport: FeedTransport; connection: "connecting" | "live" | "error"; note: string };
type Socket = Pick<WebSocket, "onopen" | "onmessage" | "onerror" | "onclose" | "close">;
type Stream = Pick<EventSource, "onopen" | "onmessage" | "onerror" | "close">;
export type FeedRuntime = {
  socket: (url: string) => Socket;
  stream: (url: string) => Stream;
  fetch: typeof fetch;
};
export type FeedOptions = {
  websocketUrl?: string;
  sseUrl?: string;
  pollUrl?: string;
  pollMs?: number;
  timeoutMs?: number;
  onPayload: (payload: unknown) => void;
  onState: (state: FeedState) => void;
};

/** Own exactly one transport attempt; late callbacks never update a newer session. */
export function startLiveFeed(options: FeedOptions, runtime: FeedRuntime = {
  socket: url => new WebSocket(url),
  stream: url => new EventSource(url),
  fetch: (...args) => fetch(...args),
}): () => void {
  const routes = ([
    ["ws", options.websocketUrl], ["sse", options.sseUrl], ["poll", options.pollUrl],
  ] as const).filter((route): route is readonly [FeedTransport, string] => Boolean(route[1]));
  if (!routes.length) throw new Error("At least one live feed URL is required");
  const bounded = (value: number | undefined, fallback: number) => value !== undefined && Number.isFinite(value) ? Math.max(1, value) : fallback;
  const pollMs = bounded(options.pollMs, 5000);
  const timeoutMs = bounded(options.timeoutMs, 10000);
  let stopped = false;
  let generation = 0;
  let rounds = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let deadline: ReturnType<typeof setTimeout> | undefined;
  let socket: Socket | undefined;
  let stream: Stream | undefined;
  let controller: AbortController | undefined;

  const clearAttempt = () => {
    generation += 1;
    clearTimeout(timer);
    clearTimeout(deadline);
    controller?.abort();
    controller = undefined;
    if (socket) {
      socket.onopen = socket.onmessage = socket.onerror = socket.onclose = null;
      socket.close();
      socket = undefined;
    }
    if (stream) {
      stream.onopen = stream.onmessage = stream.onerror = null;
      stream.close();
      stream = undefined;
    }
  };

  const start = (index: number) => {
    if (stopped) return;
    clearAttempt();
    const ownGeneration = generation;
    const current = () => !stopped && generation === ownGeneration;
    const [transport, url] = routes[index];
    const state = (connection: FeedState["connection"], note: string) => {
      if (current()) options.onState({ transport, connection, note });
    };
    const live = () => {
      if (!current()) return;
      clearTimeout(deadline);
      rounds = 0;
      state("live", transport === "poll" ? `주기 조회 중 (${pollMs}ms)` : "실시간 연결됨");
    };
    const failed = () => {
      if (!current()) return;
      state("error", "연결에 실패해 다른 연결 경로를 시도합니다.");
      clearAttempt();
      if (index + 1 < routes.length) start(index + 1);
      else {
        const delay = Math.min(12000, 800 * 2 ** Math.min(++rounds, 4));
        timer = setTimeout(() => start(0), delay);
      }
    };
    const receive = (payload: unknown) => {
      if (current()) options.onPayload(payload);
    };
    state("connecting", "실시간 연결을 시도하고 있습니다...");
    deadline = setTimeout(failed, timeoutMs);
    try {
      if (transport === "ws") {
        socket = runtime.socket(url);
        socket.onopen = live;
        socket.onmessage = event => receive(event.data);
        socket.onerror = failed;
        socket.onclose = failed;
      } else if (transport === "sse") {
        stream = runtime.stream(url);
        stream.onopen = live;
        stream.onmessage = event => receive(event.data);
        stream.onerror = failed;
      } else {
        const poll = async () => {
          if (!current()) return;
          controller = new AbortController();
          clearTimeout(deadline);
          deadline = setTimeout(failed, timeoutMs);
          try {
            const response = await runtime.fetch(url, { cache: "no-store", signal: controller.signal });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const payload: unknown = await response.json();
            if (!current()) return;
            receive(payload);
            live();
            // Schedule only after completion: slow responses cannot overlap or arrive out of order.
            timer = setTimeout(() => { void poll(); }, pollMs);
          } catch {
            failed();
          }
        };
        void poll();
      }
    } catch {
      failed();
    }
  };
  start(0);
  return () => { stopped = true; clearAttempt(); };
}
