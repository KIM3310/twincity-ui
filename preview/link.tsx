import type { AnchorHTMLAttributes } from "react";
export default function StaticLink({ href = "", ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) {
  const resolved = href === "/events" ? "./" : href.startsWith("/")
    ? `https://github.com/KIM3310/twincity-ui/blob/main/${href.startsWith("/api/") ? "src/app" + href + "/route.ts" : "src/app" + href + "/page.tsx"}` : href;
  return <a {...props} href={resolved} />;
}
