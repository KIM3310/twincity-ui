import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { retainedPages } from "./static_pages.mjs";

const output = resolve(process.argv[2] ?? "dist");
const index = await readFile(resolve(output, "index.html"), "utf8");
assert.match(index, /<title>TwinCity · Interactive Operations Console<\/title>/);
assert.match(index, /type="module"[^>]+src="[^"]+\/assets\//);
assert.equal(existsSync(resolve(output, "_worker.js")), false, "legacy worker must not mask the interactive assets");
for (const { file } of retainedPages) {
  const expected = await readFile(new URL(`../pages-redirect/${file}`, import.meta.url));
  assert.deepEqual(await readFile(resolve(output, file)), expected, `${file} retains its source content`);
}
console.log(`Verified interactive ${output} and ${retainedPages.length} unchanged policy/discovery files`);
