import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";
const at = (path: string) => fileURLToPath(new URL(path, import.meta.url));
export default defineConfig({
  root: at("./"), base: "./", publicDir: at("../public"),
  resolve: { alias: { "@": at("../src"), "next/image": at("./image.tsx"), "next/link": at("./link.tsx") } },
  define: { "process.env": JSON.stringify({ NEXT_PUBLIC_STATIC_PREVIEW: "1" }) },
  build: { outDir: at("../dist"), emptyOutDir: true },
});
