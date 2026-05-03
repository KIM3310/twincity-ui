import { access } from "node:fs/promises";
import { spawn } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");

async function ensurePagesRedirect() {
  await access(join(root, "pages-redirect", "index.html"));
  await access(join(root, "pages-redirect", "_redirects"));
  process.stdout.write("Cloudflare Pages build target: pages-redirect\n");
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
  await ensurePagesRedirect();
} else {
  runNextBuild();
}
