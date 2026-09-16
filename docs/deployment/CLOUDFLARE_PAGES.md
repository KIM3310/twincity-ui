# Deploy the static preview to Cloudflare Pages

The Pages project is `twincity-ui`. Its production branch is `main`. Both build paths produce the generated `dist/` directory.

## Build and verify

```sh
npm ci
npm audit --audit-level=high
npm run verify
node --test tools/smoke_static.test.mjs
node tools/verify_static_artifact.mjs
```

`npm run build:preview` builds the synthetic console and copies the retained files listed in `tools/static_pages.mjs`. These include the existing robots, sitemap, policy, editorial, and discovery content. The build verifies byte identity against `pages-redirect/`. It does not copy the old root page or `_worker.js`, and it does not write to tracked source files.

`CF_PAGES=1 npm run build` produces the same `dist/` artifact. Without `CF_PAGES=1`, `npm run build` builds the separate Next.js runtime. Run `npm run dev` for its local API routes. Pages does not host those routes or a live event source.

To inspect the built artifact locally, run `npx vite preview --config preview/vite.config.ts --host 127.0.0.1 --port 4173`. In another terminal, run:

```sh
node tools/smoke_static.mjs http://127.0.0.1:4173/ "TwinCity · Interactive Operations Console"
```

The smoke check rejects HTML fallbacks for missing JS, CSS, robots, sitemap, or policy content. It checks the retained files' content types and bytes, not only HTTP status.

## Configure the connected build

Use these Pages settings:

- Build command `npm run build`.
- Build output directory `dist`.
- Root directory `.`.

The observed connected project used `pages-redirect` as its output directory on 2026-09-16. `wrangler.toml` now names `./dist`. Before the first production release of this change, the deployment owner must verify a Cloudflare preview uses `dist` or update the connected output setting to `dist`. A local build does not prove that Cloudflare applied the new output setting.

The GitHub deployment workflow already builds and directly uploads `dist`. Keep the connected build and direct upload on the same artifact. Do not restore the old build step that deletes the tracked worker and copies output over `pages-redirect/`.

The build does not inject scripts or add backend bindings. It retains the existing AdSense loaders in `guide.html`, `architecture.html`, and `verification.html` unchanged. The interactive console and policy pages do not include those loaders. Browser checks that report no external requests apply to the console, not the retained editorial pages.

## Check browser incident persistence

Use Node 22 or newer and a separate headless Chrome process with a temporary profile and a loopback remote-debugging port. Do not connect this test to a personal browser profile. The test clears only the local preview's incident storage in its new tab.

```sh
node tools/test_preview_browser.mjs http://127.0.0.1:4173/ CDP_PORT OUTPUT_DIR
```

The test saves screenshots and JSON evidence. It checks first-launch seeds, acknowledgement and resolution after reload, selection, timeline, manual coordinates, an empty saved list, and corrupt-storage recovery.
