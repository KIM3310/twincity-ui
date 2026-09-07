import { cp, mkdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
const result = spawnSync("vite", ["build", "--config", "preview/vite.config.ts"], { stdio: "inherit" });
if (result.status !== 0) process.exit(result.status ?? 1);
await mkdir("dist", { recursive: true });
for (const name of ["3d", "floorplan_s001.png", "floorplan_wireframe_20241027_clean.png", "floorplan_wireframe_20241027.png", "favicon.ico"]) {
  await cp(`public/${name}`, `dist/${name}`, { recursive: true });
}
