import { cp, rm } from "node:fs/promises";
import { spawn, spawnSync } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");

async function ensurePagesSurface() {
  const result = spawnSync("npm", ["run", "build:preview"], { cwd: root, stdio: "inherit" });
  if (result.status !== 0) throw new Error("Interactive Pages build failed");
  // The connected Pages project still publishes this directory. Both deployment
  // paths must serve the same interactive output; the old worker masked assets.
  await rm(join(root, "pages-redirect", "_worker.js"), { force: true });
  await cp(join(root, "dist"), join(root, "pages-redirect"), { recursive: true });
  process.stdout.write("Cloudflare Pages build target: interactive pages-redirect\n");
}

function runNextBuild() {
  const child = spawn("next", ["build"], {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  child.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exit(code ?? 1);
  });
}

if (process.env.CF_PAGES === "1") {
  await ensurePagesSurface();
} else {
  runNextBuild();
}
