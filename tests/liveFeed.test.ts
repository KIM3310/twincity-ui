import { afterEach, describe, expect, it, vi } from "vitest";
import { startLiveFeed, type FeedRuntime } from "../src/lib/liveFeed";

const channel = () => ({ onopen: null, onmessage: null, onerror: null, onclose: null, close: vi.fn() }) as unknown as ReturnType<FeedRuntime["socket"]>;
const streamChannel = () => channel() as unknown as ReturnType<FeedRuntime["stream"]>;
const stops: (() => void)[] = [];
afterEach(() => { stops.splice(0).forEach(stop => stop()); vi.useRealTimers(); });

describe("live feed transport ownership", () => {
  it("falls from WebSocket to SSE to HTTP and ignores the obsolete socket", async () => {
    const ws = channel(), sse = streamChannel();
    const onPayload = vi.fn();
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ event: "http-current" })));
    stops.push(startLiveFeed({ websocketUrl: "ws://fixture", sseUrl: "http://fixture/sse", pollUrl: "http://fixture/poll", onPayload, onState: vi.fn() }, { socket: () => ws, stream: () => sse, fetch: fetcher }));
    const lateMessage = ws.onmessage!;
    ws.onerror?.call(ws as WebSocket, new Event("error"));
    expect(ws.close).toHaveBeenCalledOnce();
    sse.onerror?.call(sse as EventSource, new Event("error"));
    lateMessage.call(ws as WebSocket, new MessageEvent("message", { data: "obsolete" }));
    await vi.waitFor(() => expect(onPayload).toHaveBeenCalledWith({ event: "http-current" }));
    expect(onPayload).toHaveBeenCalledTimes(1);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("falls through constructor failures and times out an unopened stream", async () => {
    vi.useFakeTimers();
    const sse = streamChannel(), fetcher = vi.fn().mockResolvedValue(new Response("{}"));
    stops.push(startLiveFeed({ websocketUrl: "bad:", sseUrl: "http://fixture/sse", pollUrl: "http://fixture/poll", timeoutMs: 100, onPayload: vi.fn(), onState: vi.fn() }, { socket: () => { throw Error("blocked"); }, stream: () => sse, fetch: fetcher }));
    await vi.advanceTimersByTimeAsync(100);
    expect(sse.close).toHaveBeenCalledOnce();
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it("does not overlap slow polls and rejects a response after stop", async () => {
    vi.useFakeTimers();
    let resolve!: (response: Response) => void;
    const fetcher = vi.fn().mockImplementation(() => new Promise<Response>(done => { resolve = done; }));
    const onPayload = vi.fn();
    const stop = startLiveFeed({ pollUrl: "http://fixture/poll", pollMs: 10, timeoutMs: 1000, onPayload, onState: vi.fn() }, { socket: () => channel(), stream: () => streamChannel(), fetch: fetcher });
    stops.push(stop);
    await vi.advanceTimersByTimeAsync(500);
    expect(fetcher).toHaveBeenCalledOnce();
    stop();
    expect(fetcher.mock.calls[0][1].signal.aborted).toBe(true);
    resolve(new Response('{"late":true}'));
    await vi.advanceTimersByTimeAsync(5000);
    expect(onPayload).not.toHaveBeenCalled();
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it("aborts a timed-out HTTP attempt and cancels its scheduled retry", async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn().mockImplementation(() => new Promise(() => {}));
    const stop = startLiveFeed({ pollUrl: "http://fixture/poll", timeoutMs: 30, onPayload: vi.fn(), onState: vi.fn() }, { socket: () => channel(), stream: () => streamChannel(), fetch: fetcher });
    stops.push(stop);
    await vi.advanceTimersByTimeAsync(30);
    expect(fetcher.mock.calls[0][1].signal.aborted).toBe(true);
    stop();
    await vi.advanceTimersByTimeAsync(20000);
    expect(fetcher).toHaveBeenCalledOnce();
  });
});
