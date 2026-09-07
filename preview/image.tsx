import type { CSSProperties } from "react";
import type { ImageProps } from "next/image";

export default function StaticImage({ src, alt, fill, priority: _priority, unoptimized: _unoptimized, style, ...props }: ImageProps) {
  const url = typeof src === "string" ? src : "src" in src ? src.src : src.default.src;
  const resolved = url.startsWith("/") ? `.${url}` : url;
  const placement: CSSProperties = fill ? { position: "absolute", inset: 0, height: "100%", width: "100%" } : {};
  // Static Vite preview has no Next image optimizer; use the same checked-in assets.
  // eslint-disable-next-line @next/next/no-img-element
  return <img {...props} src={resolved} alt={alt} style={{ ...placement, ...style }} />;
}
