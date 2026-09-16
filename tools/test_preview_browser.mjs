import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const [baseUrl, debugPort, outputDir] = process.argv.slice(2);
if (!baseUrl || !debugPort || !outputDir) {
  throw new Error("Usage: node tools/test_preview_browser.mjs LOOPBACK_URL CDP_PORT OUTPUT_DIR (Node 22+, isolated Chrome profile)");
}
if (!["127.0.0.1", "localhost"].includes(new URL(baseUrl).hostname)) {
  throw new Error("Browser regression only accepts a local synthetic preview");
}
await mkdir(outputDir, { recursive: true });
const debugBase = `http://127.0.0.1:${Number(debugPort)}`;
const target = await (await fetch(`${debugBase}/json/new?about:blank`, { method: "PUT" })).json();
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
let sequence = 0;
const pending = new Map();
const listeners = new Set();
const exceptions = [];
const externalRequests = [];
const evidence = {};
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++sequence;
  pending.set(id, { resolve, reject });
  ws.send(JSON.stringify({ id, method, params }));
});
ws.onmessage = ({ data }) => {
  const message = JSON.parse(data);
  if (message.id) {
    const response = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) response.reject(new Error(JSON.stringify(message.error)));
    else response.resolve(message.result);
    return;
  }
  if (message.method === "Runtime.exceptionThrown") exceptions.push(message.params);
  if (message.method === "Fetch.requestPaused") {
    const url = new URL(message.params.request.url);
    const local = ["127.0.0.1", "localhost"].includes(url.hostname) || ["data:", "blob:"].includes(url.protocol);
    if (!local) externalRequests.push(url.href);
    void send(local ? "Fetch.continueRequest" : "Fetch.failRequest", {
      requestId: message.params.requestId,
      ...(local ? {} : { errorReason: "BlockedByClient" }),
    });
  }
  for (const listener of listeners) listener(message);
};
const evaluate = async (expression) => {
  const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
  return result.result.value;
};
const frames = () => evaluate("new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))");
const load = async (method, params = {}) => {
  const loaded = new Promise((resolve, reject) => {
    const timer = setTimeout(() => { listeners.delete(listener); reject(new Error("Page load timeout")); }, 15000);
    const listener = (event) => {
      if (event.method !== "Page.loadEventFired") return;
      listeners.delete(listener);
      clearTimeout(timer);
      resolve();
    };
    listeners.add(listener);
  });
  await send(method, params);
  await loaded;
  await evaluate(`new Promise((resolve, reject) => {
    const check = () => {
      if (!document.querySelector('.opsShell') || !localStorage.getItem('twincity-ops-experience-v3')) return;
      observer.disconnect(); clearTimeout(timer); resolve();
    };
    const observer = new MutationObserver(check);
    const timer = setTimeout(() => { observer.disconnect(); reject(new Error('Hydration timeout')); }, 10000);
    observer.observe(document, { childList: true, subtree: true, attributes: true }); check();
  })`);
  await frames();
};
const snapshot = () => evaluate(`({
  storage: JSON.parse(localStorage.getItem('twincity-ops-experience-v3')),
  selected: new URLSearchParams(location.search).get('event'),
  status: document.querySelector('.detailBadges .statusBadge')?.className,
  detail: document.querySelector('.detailRoot')?.innerText,
  timelineActions: [...document.querySelectorAll('.timelineBadge')].map(node => node.innerText),
  title: document.title
})`);
const capture = async (name) => {
  evidence[name] = await snapshot();
  await evaluate("document.documentElement.style.scrollBehavior='auto'; document.querySelector('.detailRoot, .detailEmpty')?.scrollIntoView({block:'center',behavior:'instant'})");
  await frames();
  const screenshot = await send("Page.captureScreenshot", { format: "png" });
  await writeFile(join(outputDir, `${name}.png`), Buffer.from(screenshot.data, "base64"));
  return evidence[name];
};
const click = async (text) => {
  await evaluate(`(() => {
    const buttons = [...document.querySelectorAll('button')].filter(b => b.innerText.trim() === ${JSON.stringify(text)});
    if (buttons.length !== 1 || buttons[0].disabled) throw new Error('Unavailable button: ' + ${JSON.stringify(text)});
    buttons[0].click();
  })()`);
  await frames();
};
const eventById = (state, id) => state.storage.events.find(event => event.id === id);
try {
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Fetch.enable", { patterns: [{ urlPattern: "*" }] });
  await send("Emulation.setDeviceMetricsOverride", { width: 1365, height: 900, deviceScaleFactor: 1, mobile: false });
  await send("Page.addScriptToEvaluateOnNewDocument", { source: "document.addEventListener('DOMContentLoaded', () => { document.documentElement.style.scrollBehavior = 'auto'; });" });
  await load("Page.navigate", { url: baseUrl });
  await evaluate("localStorage.removeItem('twincity-ops-experience-v3'); history.replaceState(null,'',location.pathname)");
  await load("Page.reload", { ignoreCache: true });
  const initial = await capture("first-launch");
  assert.deepEqual(initial.storage.events.map(event => event.id).sort(), ["photo-log-0", "photo-log-1", "photo-log-2", "photo-log-3", "photo-log-5", "photo-log-6"]);
  assert.equal(eventById(initial, "photo-log-0").incident_status, "new");
  await click("확인했어요");
  const acknowledged = await capture("acknowledged");
  assert.equal(eventById(acknowledged, "photo-log-0").incident_status, "ack");
  await load("Page.reload", { ignoreCache: true });
  const ackReload = await capture("ack-reloaded");
  assert.equal(eventById(ackReload, "photo-log-0").incident_status, "ack", "acknowledged photo event survives reload");
  assert.equal(ackReload.status, "statusBadge ack");
  assert.deepEqual(ackReload.timelineActions, ["확인함", "처음 알림"]);
  assert.deepEqual(ackReload.storage.timeline, acknowledged.storage.timeline);
  assert.equal(eventById(ackReload, "photo-log-0").detected_at, eventById(initial, "photo-log-0").detected_at);
  await send("Input.dispatchKeyEvent", { type: "keyDown", key: "]", code: "BracketRight" });
  await send("Input.dispatchKeyEvent", { type: "keyUp", key: "]", code: "BracketRight" });
  await frames();
  const selected = await snapshot();
  assert.equal(selected.selected, "photo-log-1");
  await click("확인했어요");
  await click("처리 끝내기");
  const resolved = await capture("resolved");
  await load("Page.reload", { ignoreCache: true });
  const resolveReload = await capture("resolve-reloaded");
  assert.equal(resolveReload.selected, "photo-log-1", "non-default photo selection survives reload");
  assert.equal(eventById(resolveReload, "photo-log-1").incident_status, "resolved");
  assert.equal(resolveReload.status, "statusBadge resolved");
  assert.deepEqual(resolveReload.timelineActions, ["처리 완료", "확인함", "처음 알림"]);
  assert.deepEqual(resolveReload.storage.timeline, resolved.storage.timeline);
  assert.deepEqual(resolveReload.storage.timeline.filter(entry => entry.event_id === "photo-log-1").map(entry => [entry.from_status, entry.to_status]), [["ack", "resolved"], ["new", "ack"]]);
  for (const [label, value] of [["월드 X 좌표", "1.2"], ["월드 Z 좌표", "1.5"]]) {
    await evaluate(`document.querySelector('input[aria-label="${label}"]').focus()`);
    await send("Input.insertText", { text: value });
  }
  await click("좌표 추가");
  const manual = await capture("manual-added");
  const manualEvent = manual.storage.events.find(event => event.id.startsWith("manual-map"));
  assert.ok(manualEvent, "coordinate form creates a manual event");
  await load("Page.reload", { ignoreCache: true });
  const manualReload = await capture("manual-reloaded");
  assert.deepEqual(eventById(manualReload, manualEvent.id), manualEvent);
  assert.equal(manualReload.selected, manualEvent.id);
  assert.equal(eventById(manualReload, "photo-log-0").incident_status, "ack");
  assert.equal(eventById(manualReload, "photo-log-1").incident_status, "resolved");
  await click("관리");
  await click("전체 지우기");
  await load("Page.reload", { ignoreCache: true });
  const cleared = await capture("cleared-reloaded");
  assert.deepEqual(cleared.storage.events, []);
  assert.deepEqual(cleared.storage.timeline, []);
  assert.equal(cleared.selected, null);
  await evaluate("localStorage.setItem('twincity-ops-experience-v3', '{invalid'); history.replaceState(null,'','?event=photo-log-2')");
  await load("Page.reload", { ignoreCache: true });
  const recovered = await capture("corrupt-storage-recovered");
  assert.equal(recovered.selected, "photo-log-2");
  assert.equal(eventById(recovered, "photo-log-2").incident_status, "new");
  assert.deepEqual(exceptions, []);
  assert.deepEqual(externalRequests, []);
  console.log("PASS first-launch seeds, ACK/reload, resolve/reload, selection, timeline, timestamps, manual event/reload, cleared state, corrupt-storage fallback; no external requests or page exceptions");
} finally {
  await writeFile(join(outputDir, "browser-result.json"), JSON.stringify({ ...evidence, exceptions, externalRequests }, null, 2));
  ws.close();
  await fetch(`${debugBase}/json/close/${target.id}`);
}
