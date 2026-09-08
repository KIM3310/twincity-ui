import { pathToFileURL } from 'node:url';

function attributes(tag) {
  return Object.fromEntries([...tag.matchAll(/([\w-]+)=["']([^"']*)["']/g)].map((m) => [m[1].toLowerCase(), m[2]]));
}

// HTTP 200 alone also accepts a host's SPA fallback for a missing JS/CSS file.
export async function smokeStatic(baseUrl, expectedTitle, fetcher = fetch) {
  const base = new URL(baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`);
  const page = await fetcher(base.href, { redirect: 'error', signal: AbortSignal.timeout(25000) });
  if (!page.ok || !page.headers.get('content-type')?.startsWith('text/html')) {
    throw new Error(`Invalid HTML response at ${base.href}: ${page.status}`);
  }
  const html = await page.text();
  if (!html.includes(`<title>${expectedTitle}</title>`) || !html.includes('id="root"')) {
    throw new Error(`Unexpected application identity at ${base.href}`);
  }
  const scripts = [...html.matchAll(/<script\b[^>]*>/gi)].map((m) => attributes(m[0]));
  const links = [...html.matchAll(/<link\b[^>]*>/gi)].map((m) => attributes(m[0]));
  const modules = scripts.filter((a) => a.type === 'module' && a.src);
  const styles = links.filter((a) => a.rel === 'stylesheet' && a.href);
  if (!modules.length || !styles.length) throw new Error('Built module or stylesheet is missing');
  const assets = [
    ...modules.map((a) => [a.src, 'javascript']),
    ...styles.map((a) => [a.href, 'css']),
    ...links.filter((a) => a.rel === 'modulepreload' && a.href).map((a) => [a.href, 'javascript']),
  ];
  for (const [reference, kind] of assets) {
    const url = new URL(reference, base);
    if (url.origin !== base.origin || !url.pathname.startsWith(base.pathname)) {
      throw new Error(`Built asset leaves deployment base: ${url.href}`);
    }
    const result = await fetcher(url.href, { redirect: 'error', signal: AbortSignal.timeout(25000) });
    const type = result.headers.get('content-type')?.split(';')[0];
    const validType = kind === 'css' ? type === 'text/css' : ['text/javascript', 'application/javascript'].includes(type);
    const body = await result.text();
    if (!result.ok || !validType || !body.trim() || /^\s*(?:<!doctype html|<html)/i.test(body)) {
      throw new Error(`Invalid ${kind} asset at ${url.href}: ${result.status} ${type}`);
    }
  }
  return { base: base.href, assets: assets.length };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [base, title] = process.argv.slice(2);
  if (!base || !title) throw new Error('Usage: node smoke_static.mjs BASE_URL EXPECTED_TITLE');
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const result = await smokeStatic(base, title);
      console.log(`Static application verified: ${result.base} (${result.assets} JS/CSS assets)`);
      break;
    } catch (error) {
      if (attempt === 3) throw error;
      console.error(`Smoke attempt ${attempt}/3 failed: ${error.message}`);
      await new Promise((resolve) => setTimeout(resolve, attempt * 5000));
    }
  }
}
