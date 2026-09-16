import { spawn, spawnSync } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");

function buildPagesPreview() {
  const result = spawnSync("npm", ["run", "build:preview"], { cwd: root, stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status ?? 1);
  process.stdout.write("Cloudflare Pages build target: dist\n");
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
  buildPagesPreview();
} else {
  runNextBuild();
}
