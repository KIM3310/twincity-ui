# Cloudflare Pages Deploy

- Deploy directory: `pages-redirect/`
- Purpose: redirect reviewer traffic to the live Cloud Run runtime
- Redirect target: `https://twincity-ui-app-811356341663.asia-northeast3.run.app`

AdSense/Review automation:
- `tools/release_ops.sh cloudflare`
- `tools/release_ops.sh apply-adsense <ca-pub-xxxxxxxxxxxxxxxx> <slot-id>`
- `tools/release_ops.sh check`
