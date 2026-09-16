import assert from 'node:assert/strict';
import test from 'node:test';
import { smokeStatic, smokeRetainedPages } from './smoke_static.mjs';
import { readFile } from 'node:fs/promises';
import { retainedPages } from './static_pages.mjs';

const base = 'https://example.test/project/';
const html = '<title>Preview</title><div id="root"></div><script type="module" src="./assets/app.js"></script><link rel="stylesheet" href="./assets/app.css">';
function fixture(overrides = {}) {
  const responses = {
    [base]: [html, 'text/html'],
    [`${base}assets/app.js`]: ['console.log("ready")', 'text/javascript'],
    [`${base}assets/app.css`]: ['body { color: black }', 'text/css'],
    ...overrides,
  };
  return async (url) => {
    const [body, type, status = 200] = responses[url] ?? ['missing', 'text/plain', 404];
    return new Response(body, { status, headers: { 'content-type': type } });
  };
}

test('resolves and verifies assets under a project subdirectory', async () => {
  assert.deepEqual(await smokeStatic(base, 'Preview', fixture()), { base, assets: 2 });
});
test('rejects a different application even when its root returns 200', async () => {
  await assert.rejects(smokeStatic(base, 'Different', fixture()), /application identity/);
});
test('rejects an HTML fallback returned with status 200 for missing JavaScript', async () => {
  await assert.rejects(smokeStatic(base, 'Preview', fixture({ [`${base}assets/app.js`]: [html, 'text/html'] })), /Invalid javascript asset/);
});
test('rejects missing CSS and empty JavaScript responses', async () => {
  await assert.rejects(smokeStatic(base, 'Preview', fixture({ [`${base}assets/app.css`]: ['missing', 'text/plain', 404] })), /Invalid css asset/);
  await assert.rejects(smokeStatic(base, 'Preview', fixture({ [`${base}assets/app.js`]: ['', 'text/javascript'] })), /Invalid javascript asset/);
});
test('rejects an unbuilt HTML shell and assets outside the deployment base', async () => {
  await assert.rejects(smokeStatic(base, 'Preview', fixture({ [base]: ['<title>Preview</title><div id="root"></div>', 'text/html'] })), /module or stylesheet/);
  await assert.rejects(smokeStatic(base, 'Preview', fixture({ [base]: [html.replace('./assets/app.js', '/assets/app.js'), 'text/html'] })), /leaves deployment base/);
});

test('recognizes uppercase script and stylesheet tags and attribute names', async () => {
  const mixed = html.replace('<script type="module" src=', '<SCRIPT TYPE="module" SRC=').replace('</script>', '</SCRIPT>').replace('<link rel=', '<LINK REL=').replace(' href=', ' HREF=');
  assert.equal((await smokeStatic(base, 'Preview', fixture({ [base]: [mixed, 'text/html'] }))).assets, 2);
});

async function retainedFixture(overrides = {}) {
  const responses = Object.fromEntries(await Promise.all(retainedPages.map(async ({ file, route, types }) => [
    new URL(route, base).href,
    [await readFile(new URL(`../pages-redirect/${file}`, import.meta.url)), types[0]],
  ])));
  return fixture({ ...responses, ...overrides });
}

test('verifies the identity and content type of retained policy and discovery files', async () => {
  assert.deepEqual(await smokeRetainedPages(base, await retainedFixture()), { pages: 12 });
});
test('rejects SPA fallbacks for robots, sitemap, and policy routes', async () => {
  for (const route of ['robots.txt', 'sitemap.xml', 'privacy/', 'terms/']) {
    await assert.rejects(smokeRetainedPages(base, await retainedFixture({
      [new URL(route, base).href]: [html, 'text/html'],
    })), /Invalid retained page|Retained content mismatch/);
  }
});
test('rejects wrong policy content even when the HTTP type is correct', async () => {
  await assert.rejects(smokeRetainedPages(base, await retainedFixture({
    [new URL('privacy/', base).href]: ['<html>A different policy</html>', 'text/html'],
  })), /Retained content mismatch/);
});
