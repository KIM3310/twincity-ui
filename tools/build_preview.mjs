import { cp, mkdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { retainedPages } from "./static_pages.mjs";
const result = spawnSync("vite", ["build", "--config", "preview/vite.config.ts"], { stdio: "inherit" });
if (result.status !== 0) process.exit(result.status ?? 1);
await mkdir("dist", { recursive: true });
for (const name of ["3d", "floorplan_s001.png", "floorplan_wireframe_20241027_clean.png", "floorplan_wireframe_20241027.png", "favicon.ico"]) {
  await cp(`public/${name}`, `dist/${name}`, { recursive: true });
}
for (const { file } of retainedPages) {
  await mkdir(dirname(join("dist", file)), { recursive: true });
  await cp(join("pages-redirect", file), join("dist", file));
}
const verification = spawnSync(process.execPath, ["tools/verify_static_artifact.mjs"], { stdio: "inherit" });
if (verification.status !== 0) process.exit(verification.status ?? 1);
